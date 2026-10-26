# Event Management System

This project has a React frontend and Django REST Framework backend.

## Main features

- Organizer event creation and editing
- Admin approval before public listing
- Upcoming events for attendees
- Automatic expiration of past events without deleting their records
- Organizer previous-event history
- Custom theater-style seat planning
- Attendee seat selection
- Bookings and payments
- Attendance marking and reviews
- Event gallery photos
- Organizer planning workspace

## Sign up with email OTP and Google

New accounts must confirm their email with a 6-digit code before they can sign in, and the Sign in page has a
"Continue with Google" button. See `SETUP_OTP_GOOGLE.md` for how to send real emails and add a Google Client ID.
Without any setup, the OTP is printed in the backend terminal.

## Seating setup

The organizer can enter:

- Number of seats needed
- Number of rows
- Seats or columns per row

The organizer can then click seats in the preview to create a custom layout. This supports normal rectangular layouts as well as layouts with gaps and unusual shapes.

The saved layout is used by the attendee Choose your seats section.

## Run the project on Windows

1. Install Python 3 and Node.js (which includes npm).
2. Double-click `START_PROJECT.cmd`. On the first run, it installs the required packages and prepares the database. Keep an internet connection available for installation.
3. Open `http://127.0.0.1:5173/` in your browser. Keep both terminal windows open while using the application.

If the startup script displays an error, read the message in that terminal before trying again. Do not delete `backend/db.sqlite3` if you want to keep the supplied sample data.

## Run manually

Backend:

```text
cd backend
python manage.py migrate
python manage.py runserver
```

Frontend:

```text
cd frontend
npm install
npm run dev
```

The included database keeps the existing sample events and their booking records.

## Email OTP and Google sign-in configuration

Copy `backend/.env.example` to `backend/.env` and fill in the settings you need. Copy `frontend/.env.example` to `frontend/.env` for the Google client ID and API URL. Real email delivery requires valid SMTP credentials; without them, the development OTP is printed in the backend terminal. Never publish real passwords or secret keys.
