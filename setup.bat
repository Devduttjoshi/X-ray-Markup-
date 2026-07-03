@echo off
:: Setup script for Lower Limb Mechanical Alignment Analyzer on Windows
:: This script configures a Python virtual environment, installs dependencies,
:: and sets up execution for the native offline desktop GUI application.

:: Force the working directory to be the directory of this script to avoid path issues
cd /d "%~dp0"

echo =======================================================================
echo 🏥 LOWER LIMB MECHANICAL ALIGNMENT ANALYZER - WINDOWS SETUP SCRIPT
echo =======================================================================
echo.

:: Step 1: Check Python installation
echo [1/3] Checking Python installation...
set "PYTHON_CMD="

:: Try the Python Launcher 'py' first as it is standard and most reliable on Windows
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py"
) else (
    :: Try 'python' and ensure it actually executes (doesn't just trigger the MS Store app placeholder)
    python --version >nul 2>&1
    if %errorlevel% equ 0 (
        set "PYTHON_CMD=python"
    ) else (
        :: Try 'python3' as fallback
        python3 --version >nul 2>&1
        if %errorlevel% equ 0 (
            set "PYTHON_CMD=python3"
        )
    )
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python was not found on your system.
    echo Please download and install Python 3.10+ from https://www.python.org/
    echo Make sure to check the box "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo [SUCCESS] Python command detected: %PYTHON_CMD%
%PYTHON_CMD% --version
echo.

:: Step 2: Set up Python Virtual Environment (venv)
echo [2/3] Creating Python Virtual Environment (venv) in local folder...
if not exist "venv" (
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo [WARNING] Primary venv creation with %PYTHON_CMD% failed. Trying fallback...
        
        :: Attempt fallbacks in case of specific environment path mismatch
        if "%PYTHON_CMD%" neq "python" (
            python -m venv venv >nul 2>&1
        )
        if %errorlevel% neq 0 if "%PYTHON_CMD%" neq "py" (
            py -m venv venv >nul 2>&1
        )
        
        if not exist "venv" (
            echo [ERROR] Failed to create virtual environment.
            echo Please check if the 'venv' or 'virtualenv' module is installed for Python.
            pause
            exit /b 1
        )
    )
    echo [SUCCESS] Virtual environment 'venv' created.
) else (
    echo [INFO] Virtual environment 'venv' already exists.
)

echo Activating Python virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)
echo.

:: Step 3: Install Python packages
echo [3/3] Installing Python dependencies from requirements.txt...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)
echo [SUCCESS] Python dependencies installed successfully.
echo.

echo =======================================================================
echo 🎉 SETUP COMPLETED SUCCESSFULLY!
echo =======================================================================
echo.
echo You can run the application locally using these dedicated launcher scripts:
echo.
echo OPTION A: Run the Desktop GUI Workstation (Tkinter App)
echo -----------------------------------------------------------------------
echo Double-click:  run_desktop_app.bat
echo.
echo OPTION B: Run the Web Diagnostic Workstation (Flask + React Web App)
echo -----------------------------------------------------------------------
echo Double-click:  run_web_app.bat
echo.
echo OPTION C: Compile into a single standalone Windows .exe file
echo -----------------------------------------------------------------------
echo 1. Compile the app using PyInstaller:
echo    pyinstaller --onefile --noconsole --name="Lower_Limb_Analyzer" lower_limb_analyzer.py
echo 2. Find your single-file executable in the 'dist' subfolder as:
echo    dist\Lower_Limb_Analyzer.exe
echo.
echo Press any key to run the application now (or Close this window)...
pause

:: Ask if they want to run the app right away
set /p RUN_NOW="Do you want to run the Desktop application now? (y/n): "
if /i "%RUN_NOW%" equ "y" (
    echo.
    echo Starting Lower Limb Mechanical Alignment Analyzer...
    call run_desktop_app.bat
)

exit /b 0
