"""Verify a Google sign-in token on the server.

The browser shows Google's own account chooser and gives us an *access token*.
We never trust it blindly: we ask Google whether it is valid, that it was issued
for OUR app (client id) and that the email address is verified.
"""
import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings


class GoogleAuthError(Exception):
    pass


def _get_json(url, headers=None):
    request = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError:
        raise GoogleAuthError("Google rejected the sign-in. Please try again.")
    except Exception:
        raise GoogleAuthError("Could not reach Google. Check your internet connection.")


def get_google_profile(access_token):
    """Return {"email", "first_name", "last_name"} for a valid Google token."""
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise GoogleAuthError("Google sign-in is not configured on the server yet.")

    query = urllib.parse.urlencode({"access_token": access_token})
    info = _get_json(f"https://oauth2.googleapis.com/tokeninfo?{query}")

    if info.get("aud") != client_id and info.get("azp") != client_id:
        raise GoogleAuthError("This Google token was not issued for this application.")

    email = (info.get("email") or "").lower()
    if not email or str(info.get("email_verified")).lower() != "true":
        raise GoogleAuthError("Your Google email address is not verified.")

    profile = _get_json(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    return {
        "email": email,
        "first_name": (profile.get("given_name") or "")[:150],
        "last_name": (profile.get("family_name") or "")[:150],
    }
