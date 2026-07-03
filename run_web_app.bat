@echo off
:: Launcher for the Lower Limb Mechanical Alignment Web Workstation (Flask + React)
:: This script safely locks the directory path, activates the local Python virtual environment,
:: and boots up the local Flask web workstation without any Windows path/aliasing conflicts.

:: Force the working directory to be the directory of this script
cd /d "%~dp0"

echo =======================================================================
echo 🏥 LOWER LIMB MECHANICAL ALIGNMENT ANALYZER - WEB WORKSTATION
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

:: Warn if dist directory containing compiled static files is missing
if not exist "dist" (
    echo [WARNING] "dist" folder containing the compiled React frontend was not found!
    echo Flask will not be able to serve the user interface until static files are compiled.
    echo.
)

:: Run the Flask application
echo [INFO] Launching local Web server...
python app.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] The server exited with code %errorlevel%.
    pause
    exit /b %errorlevel%
)

echo.
echo [SUCCESS] Web server closed normally.
exit /b 0
