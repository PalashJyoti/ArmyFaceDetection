@echo off
setlocal

REM Set virtual environment directory name
set VENV_DIR=venv

echo Checking for Python...
where python >nul 2>nul
if errorlevel 1 (
    echo Python not found in PATH. Please install Python and try again.
    pause
    exit /b
)

REM Create virtual environment if it doesn't exist
if not exist "%VENV_DIR%\Scripts\python.exe" (
    echo Creating virtual environment in "%VENV_DIR%"...
    python -m venv %VENV_DIR%
)

REM Activate the virtual environment
echo Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install from requirements.txt
if exist requirements.txt (
    echo Installing packages from requirements.txt...
    pip install -r requirements.txt
) else (
    echo requirements.txt not found!
)

echo.
echo ✅ Setup complete.
pause