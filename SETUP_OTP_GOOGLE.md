# Email OTP + "Continue with Google" – setup guide

Everything works out of the box for testing. To go "real" you need two small things:
an email account that sends the OTP, and (optionally) a Google Client ID.

## How sign-up works now

1. **Register** – the user fills in name, email, username and password.
2. The backend saves the account as *not verified* and emails a **6-digit OTP**.
3. The user lands on the **Verify email** page and types the code.
4. Correct code → "Email verified" → **Sign in page**. The user then signs in with the details they registered.
5. Wrong code → a message tells them how many tries are left. A small **Resend OTP** button sends a new code (once every 30 seconds).

Rules (all in `backend/accounts/otp.py`, easy to change):

| Rule | Value |
|------|-------|
| Code length | 6 digits |
| Code expires after | 10 minutes |
| Resend allowed every | 30 seconds |
| Wrong tries before the code is locked | 5 |

If someone registers but never enters the code, they cannot sign in. When they try, they are taken
to the Verify page and a new code is sent. Registering again with the same username/email also works.
Organizers still need admin approval after verifying their email.

## Part 1 – Testing without any setup

Do nothing. The OTP email is **printed in the black Django (backend) window**.
Look for a line like `[DEV] Email is not configured. OTP for you@example.com: 482913`.
The Verify page also shows a blue note telling you this.

## Part 2 – Send real emails (Gmail example)

1. Open your Google account → **Security** and turn on **2-Step Verification**.
2. Search for **App passwords** in the Google account page, create one (name it "Evently") and copy the
   16-letter password.
3. In the `backend` folder, copy `.env.example` to a new file named `.env` and fill in:

   ```
   EMAIL_HOST_USER=yourname@gmail.com
   EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop
   ```

   (Spaces in the app password are fine.)
4. Restart the backend (close the black window and run `START_PROJECT.cmd` again).
5. Register with any email address – the code now arrives in that inbox (check Spam the first time).

Using another provider? Also set `EMAIL_HOST` and `EMAIL_PORT` in `.env`.

## Part 3 – "Continue with Google"

The button is already on the Sign in page. It opens Google's own "Choose an account" window.
It needs a free **Client ID** from Google:

1. Go to <https://console.cloud.google.com/> and create a project (any name).
2. **APIs & Services → OAuth consent screen**: choose *External*, fill the app name and your email, save.
   While testing, add your own Gmail address under **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorised JavaScript origins** – add both:
     - `http://127.0.0.1:5173`
     - `http://localhost:5173`
   - (No redirect URI is needed.)
4. Copy the **Client ID** (looks like `123456-abc.apps.googleusercontent.com`).
5. Paste it in two places:
   - `backend/.env` → `GOOGLE_CLIENT_ID=your-client-id`
   - `frontend/.env` (copy `frontend/.env.example` first) → `VITE_GOOGLE_CLIENT_ID=your-client-id`
6. Restart both the backend and the frontend.

What happens after choosing an account:

- New email → an **attendee** account is created automatically and the user is signed in.
- Email already registered → the user is signed in to that existing account.
- Organizer accounts must still register with the normal form (they need admin approval).
- Google accounts have no password, so they always sign in with the Google button.

Until the Client ID is added, clicking the button shows a friendly "not set up yet" message.

## Running the tests

```
cd backend
python manage.py test accounts
```

They cover: register → OTP → login, wrong code, resend cooldown, expired code, too many tries,
organizer approval, and Google sign-in.

## Files that changed

Backend (`backend/accounts/`): `models.py`, `otp.py` (new), `google_auth.py` (new), `serializers.py`,
`views.py`, `urls.py`, `tests.py`, migration `0003`, plus `config/settings.py` and `.env.example`.

Frontend (`frontend/src/`): `pages/LoginPage.jsx`, `pages/RegisterPage.jsx`, `pages/VerifyOtpPage.jsx` (new),
`components/AuthLayout.jsx` (new), `components/GoogleButton.jsx` (new), `verification.js` (new),
`App.jsx`, `styles.css`.
