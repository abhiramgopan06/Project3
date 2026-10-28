# Evently repair notes

## What was fixed

- Public visitors can now open approved event details without triggering a database query with an anonymous user.
- Event booking still requires login. The event details page shows a clear **Log in to book seats** action for visitors.
- The frontend no longer prints raw Django HTML/debug pages as an event error message.
- Removed standalone code comments from the application source files.
- Removed the accidental unrelated `HOC-redux` Vite app and stale compiled frontend output from this package.
- Removed the local backend `.env` file so credentials and secrets are not distributed in the ZIP. Create your own `.env` from `.env.example` if needed.

## Start the backend

Open a terminal in `backend` and run:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal, then activate the environment again.

## Start the frontend

Open another terminal in `frontend` and run:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.

## Important checks

- Make sure there are approved events with dates today or in the future; expired events are intentionally hidden from the upcoming-events list.
- If the event list is empty, check the backend terminal for errors and confirm that the database contains approved upcoming events.
- The application was source-reviewed and patched in this environment, but a full Django check and Vite production build could not be completed here because Django and the frontend build dependencies were not available to install within the execution time limit. Run the commands above on your computer and report any remaining traceback for further repair.
