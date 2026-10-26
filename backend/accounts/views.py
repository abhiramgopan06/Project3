import re

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, OrganizerRequestSerializer
from .models import EmailOTP, Profile
from .otp import (
    OTP_LENGTH,
    RESEND_COOLDOWN_SECONDS,
    OTPError,
    check_otp,
    create_and_send_otp,
)
from .google_auth import GoogleAuthError, get_google_profile

def find_unverified_user(email):
    """The registered-but-not-yet-verified user for this email, if any."""
    return (
        User.objects.filter(email__iexact=email.strip(), profile__email_verified=False)
        .order_by("-id")
        .first()
    )


def using_console_email():
    return settings.EMAIL_BACKEND.endswith("console.EmailBackend")


def login_blocked_message(profile):
    """Organizers must be approved by an admin before they can log in."""
    if profile.role == "organizer" and profile.status == "pending":
        return (
            "Your organizer registration is still waiting for admin approval. "
            "Please check back later."
        )
    if profile.role == "organizer" and profile.status == "rejected":
        return "The admin has rejected your organizer registration request."
    return None


class RegisterView(generics.CreateAPIView):
    """Step 1 of sign up: save the details and email an OTP. No login yet."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            user = serializer.save()

        data = {
            "otp_required": True,
            "email": user.email,
            "email_sent": True,
            "resend_in": RESEND_COOLDOWN_SECONDS,
            "dev_mode": using_console_email(),
            "message": f"We sent a {OTP_LENGTH}-digit code to {user.email}.",
        }
        try:
            create_and_send_otp(user)
        except OTPError as err:

            data["email_sent"] = False
            data["resend_in"] = 0
            data["message"] = err.message
        return Response(data, status=status.HTTP_201_CREATED)


class VerifyOtpView(APIView):
    """Step 2 of sign up: check the OTP and activate the account."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        code = str(request.data.get("otp", "")).strip()

        if not code.isdigit() or len(code) != OTP_LENGTH:
            return Response(
                {"detail": f"Enter the {OTP_LENGTH}-digit code from your email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = find_unverified_user(email)
        if not user:
            return Response(
                {"detail": "No pending verification for this email. Please register again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            check_otp(user, code)
        except OTPError as err:
            return Response({"detail": err.message}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save(update_fields=["is_active"])
        user.profile.email_verified = True
        user.profile.save(update_fields=["email_verified"])

        message = "Your email is verified. You can now sign in."
        if user.profile.role == "organizer":
            message = (
                "Your email is verified. Your organizer request has been sent to the admin - "
                "you can sign in once it is approved."
            )
        return Response({"verified": True, "role": user.profile.role, "message": message})


class ResendOtpView(APIView):
    """Send a new OTP (allowed once every 30 seconds)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = find_unverified_user(str(request.data.get("email", "")))
        if not user:
            return Response(
                {"detail": "No pending verification for this email. Please register again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            create_and_send_otp(user)
        except OTPError as err:
            code = status.HTTP_429_TOO_MANY_REQUESTS if err.retry_after else status.HTTP_503_SERVICE_UNAVAILABLE
            return Response({"detail": err.message, "retry_after": err.retry_after or 0}, status=code)
        return Response(
            {
                "detail": f"A new code was sent to {user.email}.",
                "resend_in": RESEND_COOLDOWN_SECONDS,
                "dev_mode": using_console_email(),
            }
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", ""))


        pending = User.objects.filter(username=username, profile__email_verified=False).first()
        if pending and pending.check_password(password):
            return Response(
                {
                    "detail": "Please verify your email address before signing in.",
                    "email_not_verified": True,
                    "email": pending.email,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


def unique_username_from_email(email):
    base = re.sub(r"[^\w.@+-]", "", email.split("@")[0])[:30] or "user"
    username, number = base, 1
    while User.objects.filter(username=username).exists():
        number += 1
        username = f"{base}{number}"
    return username


class GoogleLoginView(APIView):
    """Sign in (or sign up) with a Google account. Google already verified the email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        access_token = str(request.data.get("access_token", ""))
        if not access_token:
            return Response({"detail": "Missing Google token."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            google = get_google_profile(access_token)
        except GoogleAuthError as err:
            code = status.HTTP_503_SERVICE_UNAVAILABLE if "not configured" in str(err) else status.HTTP_400_BAD_REQUEST
            return Response({"detail": str(err)}, status=code)

        user = User.objects.filter(email__iexact=google["email"]).order_by("-is_active", "id").first()
        if user is None:
            user = User.objects.create(
                username=unique_username_from_email(google["email"]),
                email=google["email"],
                first_name=google["first_name"],
                last_name=google["last_name"],
            )
            user.set_unusable_password()
            user.save()
            Profile.objects.create(user=user, role="attendee", status="approved", email_verified=True)
        else:
            profile, _ = Profile.objects.get_or_create(user=user)
            if not user.is_active or not profile.email_verified:

                user.is_active = True
                user.save(update_fields=["is_active"])
                profile.email_verified = True
                profile.save(update_fields=["email_verified"])
                EmailOTP.objects.filter(user=user).delete()
            blocked = login_blocked_message(profile)
            if blocked:
                return Response({"detail": blocked}, status=status.HTTP_400_BAD_REQUEST)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, "profile"):
            Profile.objects.create(user=request.user)
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        for field in ["first_name", "last_name", "email"]:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        profile, _ = Profile.objects.get_or_create(user=user)
        if "phone" in request.data:
            profile.phone = request.data["phone"]
        if "bio" in request.data:
            profile.bio = request.data["bio"]
        profile.save()
        return Response(UserSerializer(user).data)


class PendingOrganizersView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        pending_users = User.objects.filter(
            profile__role="organizer", profile__status="pending"
        ).order_by("-date_joined")
        return Response(OrganizerRequestSerializer(pending_users, many=True).data)

class ApproveOrganizerView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        profile = get_object_or_404(Profile, user_id=user_id, role="organizer")
        profile.status = "approved"
        profile.save()
        return Response({"detail": "Organizer approved. They can now log in."})

class RejectOrganizerView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        profile = get_object_or_404(Profile, user_id=user_id, role="organizer")
        profile.status = "rejected"
        profile.save()
        return Response({"detail": "Organizer request rejected."})
