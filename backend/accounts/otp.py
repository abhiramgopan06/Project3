"""Helpers for creating, emailing and checking one-time passwords (OTP).

Everything about the OTP rules lives here so the views stay short:
  - the code has 6 digits
  - it expires after 10 minutes
  - a new code can be requested only every 30 seconds
  - after 5 wrong tries the code is locked and a new one must be requested
"""
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

from .models import EmailOTP

OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 10
RESEND_COOLDOWN_SECONDS = 30
MAX_ATTEMPTS = 5


class OTPError(Exception):
    """Raised for any OTP problem. `message` is safe to show to the user."""

    def __init__(self, message, retry_after=None):
        super().__init__(message)
        self.message = message
        self.retry_after = retry_after


def _seconds_until_resend(otp):
    next_allowed = otp.sent_at + timedelta(seconds=RESEND_COOLDOWN_SECONDS)
    remaining = (next_allowed - timezone.now()).total_seconds()
    return max(0, int(remaining + 0.999))


def _build_email(user, code):
    name = user.first_name or user.username
    subject = f"{code} is your Evently verification code"
    text = (
        f"Hi {name},\n\n"
        f"Your Evently verification code is: {code}\n\n"
        f"It expires in {OTP_EXPIRY_MINUTES} minutes. "
        "If you did not create an account, you can ignore this email.\n\n"
        "- The Evently team"
    )
    html = f"""
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;padding:32px 16px;">
  <div style="max-width:460px;margin:0 auto;background:#ffffff;border-radius:14px;padding:32px;border:1px solid #e6e9f0;">
    <div style="font-size:22px;font-weight:700;color:#1e6fe0;">&#10022; Evently</div>
    <h2 style="color:#17202a;margin:24px 0 8px;">Verify your email</h2>
    <p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">
      Hi {name}, use the code below to finish creating your account.
    </p>
    <div style="font-size:34px;letter-spacing:10px;font-weight:700;text-align:center;
                background:#f1f5ff;color:#17202a;border-radius:10px;padding:18px 0;">{code}</div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:20px 0 0;">
      This code expires in {OTP_EXPIRY_MINUTES} minutes. If you did not request it, you can safely ignore this email.
    </p>
  </div>
</div>
"""
    message = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [user.email])
    message.attach_alternative(html, "text/html")
    return message


def create_and_send_otp(user):
    """Create a fresh OTP for `user` and email it.

    Raises OTPError if the user asked too soon or if the email could not be sent.
    Returns the number of seconds the user must wait before asking again.
    """
    existing = EmailOTP.objects.filter(user=user).first()
    if existing:
        wait = _seconds_until_resend(existing)
        if wait > 0:
            raise OTPError(f"Please wait {wait} seconds before requesting a new code.", retry_after=wait)

    code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"
    EmailOTP.objects.update_or_create(
        user=user,
        defaults={"code_hash": make_password(code), "sent_at": timezone.now(), "attempts": 0},
    )

    if settings.EMAIL_BACKEND.endswith("console.EmailBackend"):

        print(f"\n[DEV] Email is not configured. OTP for {user.email}: {code}\n")

    try:
        _build_email(user, code).send(fail_silently=False)
    except Exception as exc:
        print(f"[EMAIL ERROR] Could not send OTP email to {user.email}: {exc}")

        EmailOTP.objects.filter(user=user).delete()
        raise OTPError(
            "We could not send the verification email. Please try 'Resend OTP' in a moment."
        )
    return RESEND_COOLDOWN_SECONDS


def check_otp(user, code):
    """Return normally if `code` is correct, otherwise raise OTPError."""
    otp = EmailOTP.objects.filter(user=user).first()
    if not otp:
        raise OTPError("No active code found. Please request a new OTP.")

    if timezone.now() > otp.sent_at + timedelta(minutes=OTP_EXPIRY_MINUTES):
        raise OTPError("This code has expired. Please request a new OTP.")

    if otp.attempts >= MAX_ATTEMPTS:
        raise OTPError("Too many incorrect attempts. Please request a new OTP.")

    if not check_password(code, otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        left = MAX_ATTEMPTS - otp.attempts
        if left <= 0:
            raise OTPError("Too many incorrect attempts. Please request a new OTP.")
        raise OTPError(f"Incorrect code. You have {left} attempt{'s' if left != 1 else ''} left.")

    otp.delete()
