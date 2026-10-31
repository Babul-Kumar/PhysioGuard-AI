@echo off
title PhysioGuard Launcher
color 0B
echo ===============================================================================
echo     PHYSIOGUARD - Contactless Cardiovascular Telemetry ^& Forensics
echo     Multi-Region 3D Spatio-Temporal rPPG (ONNX Direct Acceleration)
echo ===============================================================================
echo.

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in .venv!
    echo Please make sure .venv is created.
    pause
    exit /b 1
)

echo [1/3] Launching PhysioGuard FastAPI Backend on port 8000...
start "PhysioGuard Backend (FastAPI :8000)" cmd /k ".\.venv\Scripts\python.exe -m uvicorn PhysioGuard.backend.main:app --host 0.0.0.0 --port 8000"

echo [2/3] Waiting for Backend to initialize...
timeout /t 3 /nobreak >nul

echo [3/3] Launching PhysioGuard Vite Frontend on port 5173...
start "PhysioGuard Frontend (Vite :5173)" cmd /k "cd PhysioGuard\frontend && npm run dev"

echo.
echo ===============================================================================
echo     SUCCESS: Both servers are running!
echo     - Frontend Cockpit:  http://localhost:5173
echo     - Backend API Docs:  http://localhost:8000/docs
echo     - API Health Check:  http://localhost:8000/api/health
echo ===============================================================================
echo Opening browser to http://localhost:5173...
start http://localhost:5173
echo.
echo Press any key to exit this launcher window (servers will remain active).
pause >nul

