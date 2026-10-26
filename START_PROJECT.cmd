@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   EVENT MANAGEMENT SYSTEM
echo ==========================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python was not found. Install Python 3 and enable "Add Python to PATH".
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found. Install Node.js LTS, which includes npm, and try again.
    pause
    exit /b 1
)

if not exist "backend\venv\Scripts\python.exe" (
    echo [1/4] Creating Python environment...
    python -m venv backend\venv
    if errorlevel 1 (
        echo ERROR: Could not create the Python environment. Install Python 3 and try again.
        pause
        exit /b 1
    )
    echo [2/4] Installing backend packages...
    backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
    if errorlevel 1 (
        echo ERROR: Python package installation failed. Check your internet connection and backend\requirements.txt.
        pause
        exit /b 1
    )
)

echo [3/4] Checking database migrations...
backend\venv\Scripts\python.exe backend\manage.py migrate --noinput
if errorlevel 1 (
    echo ERROR: Database migration failed. Read the error above before continuing.
    pause
    exit /b 1
)

echo Checking frontend packages...
if not exist "frontend\node_modules\vite\bin\vite.js" (
    cd frontend
    call npm install
    if errorlevel 1 (
        echo ERROR: Frontend package installation failed. Check Node.js, npm and your internet connection.
        pause
        exit /b 1
    )
    cd ..
)

echo Starting Django backend...
start "Event Management System - Backend" /D "%~dp0backend" cmd /k "venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000"

timeout /t 2 /nobreak >nul
echo Starting React frontend...
start "Event Management System - Frontend" /D "%~dp0frontend" cmd /k "npm run dev -- --host 127.0.0.1"

timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173/"

echo.
echo ==========================================
echo Frontend: http://127.0.0.1:5173/
echo Backend : http://127.0.0.1:8000/
echo Admin   : http://127.0.0.1:8000/admin/
echo.
echo Keep both command windows open while using the app.
echo Close them to stop the application.
echo ==========================================
endlocal
