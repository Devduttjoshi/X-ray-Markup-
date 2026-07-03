@echo off
:: Launcher for the Lower Limb Mechanical Alignment Desktop GUI Workstation (Tkinter)
:: This script safely locks the directory path, activates the local Python virtual environment,
:: and boots up the desktop application without any Windows path/aliasing conflicts.

:: Force the working directory to be the directory of this script
cd /d "%~dp0"

echo =======================================================================
echo 🏥 LOWER LIMB MECHANICAL ALIGNMENT ANALYZER - DESKTOP GUI
echo =======================================================================
echo.

:: Check if virtual environment activation script exists
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment was not found.
    echo Please run "setup.bat" first to initialize the environment and install dependencies.
    echo.
    pause
    exit /b 1
)

:: Activate the local virtual environment
echo [INFO] Activating Python virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)

:: Run the Tkinter GUI Application
echo [INFO] Launching Desktop Mechanical Alignment Workstation...
python lower_limb_analyzer.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The application exited with code %errorlevel%.
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] Application closed normally.
exit /b 0
