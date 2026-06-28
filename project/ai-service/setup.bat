@echo off
REM Setup script for AI Service on Windows

echo Setting up ScamGuard AI Service...

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Install dev dependencies
echo Installing dev dependencies...
pip install -r requirements-dev.txt

REM Copy environment file
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
)

echo.
echo Setup complete!
echo.
echo To activate the virtual environment, run:
echo   venv\Scripts\activate.bat
echo.
echo To start the service, run:
echo   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo To run tests, run:
echo   pytest
