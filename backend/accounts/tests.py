"""Run with:  python manage.py test accounts

These tests walk through the sign-up flow the same way a user would:
register -> receive OTP email -> enter OTP -> sign in.
"""
import re
from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.core import mail
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import EmailOTP, Profile
from .otp import MAX_ATTEMPTS

SMTP_FREE = override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")

NEW_USER = {
    "username": "leo",
    "email": "Leo@Example.com",
    "password": "secret12",
    "first_name": "Leo",
    "last_name": "Messi",
    "role": "attendee",
}


def last_code():
    """Read the 6-digit code from the most recently sent email."""
    return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)


@SMTP_FREE
class OtpSignupTests(APITestCase):
    def register(self, **extra):
        return self.client.post("/api/auth/register/", {**NEW_USER, **extra}, format="json")

    def test_register_sends_otp_and_does_not_log_in(self):
        response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["otp_required"])
        self.assertNotIn("token", response.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["leo@example.com"])
        user = User.objects.get(username="leo")
        self.assertFalse(user.is_active)
        self.assertFalse(user.profile.email_verified)

    def test_login_blocked_until_email_verified(self):
        self.register()
        response = self.client.post("/api/auth/login/", {"username": "leo", "password": "secret12"}, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertTrue(response.data["email_not_verified"])

    def test_wrong_otp_then_correct_otp_then_login(self):
        self.register()
        code = last_code()
        wrong = "000000" if code != "000000" else "111111"

        bad = self.client.post("/api/auth/verify-otp/", {"email": "leo@example.com", "otp": wrong}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertIn("Incorrect code", bad.data["detail"])

        good = self.client.post("/api/auth/verify-otp/", {"email": "leo@example.com", "otp": code}, format="json")
        self.assertEqual(good.status_code, 200)
        self.assertTrue(good.data["verified"])
        self.assertNotIn("token", good.data)

        login = self.client.post("/api/auth/login/", {"username": "leo", "password": "secret12"}, format="json")
        self.assertEqual(login.status_code, 200)
        self.assertIn("token", login.data)

    def test_resend_has_cooldown_then_issues_new_code(self):
        self.register()
        too_soon = self.client.post("/api/auth/resend-otp/", {"email": "leo@example.com"}, format="json")
        self.assertEqual(too_soon.status_code, 429)
        self.assertGreater(too_soon.data["retry_after"], 0)

        EmailOTP.objects.update(sent_at=timezone.now() - timedelta(seconds=60))
        again = self.client.post("/api/auth/resend-otp/", {"email": "leo@example.com"}, format="json")
        self.assertEqual(again.status_code, 200)
        self.assertEqual(len(mail.outbox), 2)


        ok = self.client.post("/api/auth/verify-otp/", {"email": "leo@example.com", "otp": last_code()}, format="json")
        self.assertEqual(ok.status_code, 200)

    def test_code_locks_after_too_many_wrong_attempts(self):
        self.register()
        code = last_code()
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(MAX_ATTEMPTS):
            self.client.post("/api/auth/verify-otp/", {"email": "leo@example.com", "otp": wrong}, format="json")
        locked = self.client.post("/api/auth/verify-otp/", {"email": "leo@example.com", "otp": code}, format="json")
        self.assertEqual(locked.status_code, 400)
        self.assertIn("Too many", locked.data["detail"])

    def test_expired_code_is_rejected(self):
        self.register()
        EmailOTP.objects.update(sent_at=timezone.now() - timedelta(minutes=11))
        response = self.client.post("/api/auth/verify-otp/", {"email": "leo@example.com", "otp": last_code()}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", response.data["detail"])

    def test_unverified_registration_can_be_redone(self):
        self.register()
        again = self.register(password="another1")
        self.assertEqual(again.status_code, 201)
        self.assertEqual(User.objects.filter(username="leo").count(), 1)

    def test_verified_username_or_email_cannot_be_reused(self):
        self.register()
        self.client.post("/api/auth/verify-otp/", {"email": "leo@example.com", "otp": last_code()}, format="json")
        again = self.register()
        self.assertEqual(again.status_code, 400)

    def test_organizer_needs_admin_approval_after_verification(self):
        self.register(role="organizer")
        done = self.client.post("/api/auth/verify-otp/", {"email": "leo@example.com", "otp": last_code()}, format="json")
        self.assertEqual(done.status_code, 200)
        self.assertIn("admin", done.data["message"])
        login = self.client.post("/api/auth/login/", {"username": "leo", "password": "secret12"}, format="json")
        self.assertEqual(login.status_code, 400)
        self.assertIn("waiting for admin approval", str(login.data))

    def test_old_users_are_unaffected(self):
        User.objects.create_user("old", "old@example.com", "oldpass1")
        response = self.client.post("/api/auth/login/", {"username": "old", "password": "oldpass1"}, format="json")
        self.assertEqual(response.status_code, 200)


@SMTP_FREE
@override_settings(GOOGLE_CLIENT_ID="my-client-id")
class GoogleLoginTests(APITestCase):
    def google(self, email="sam@gmail.com", aud="my-client-id", verified="true"):
        def fake_get_json(url, headers=None):
            if "tokeninfo" in url:
                return {"aud": aud, "email": email, "email_verified": verified}
            return {"given_name": "Sam", "family_name": "Lee"}

        return mock.patch("accounts.google_auth._get_json", side_effect=fake_get_json)

    def test_new_google_user_is_created_and_logged_in(self):
        with self.google():
            response = self.client.post("/api/auth/google/", {"access_token": "abc"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.data)
        user = User.objects.get(email="sam@gmail.com")
        self.assertEqual(user.first_name, "Sam")
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.profile.role, "attendee")

    def test_google_signs_into_existing_account_with_same_email(self):
        existing = User.objects.create_user("sam", "sam@gmail.com", "pass1234")
        Profile.objects.create(user=existing)
        with self.google():
            response = self.client.post("/api/auth/google/", {"access_token": "abc"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.filter(email="sam@gmail.com").count(), 1)

    def test_token_for_another_app_is_rejected(self):
        with self.google(aud="someone-elses-id"):
            response = self.client.post("/api/auth/google/", {"access_token": "abc"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_unverified_google_email_is_rejected(self):
        with self.google(verified="false"):
            response = self.client.post("/api/auth/google/", {"access_token": "abc"}, format="json")
        self.assertEqual(response.status_code, 400)

    @override_settings(GOOGLE_CLIENT_ID="")
    def test_not_configured_gives_clear_message(self):
        response = self.client.post("/api/auth/google/", {"access_token": "abc"}, format="json")
        self.assertEqual(response.status_code, 503)
