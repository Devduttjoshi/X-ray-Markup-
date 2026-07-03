@echo off
:: Uninstall and Cleanup script for Lower Limb Mechanical Alignment Analyzer on Windows
:: This script safely removes local virtual environment packages, compiled build artifacts,
:: and temporary caches without affecting Windows system directories, core Python installations,
:: or global system performance.

:: Force the working directory to be the directory of this script to avoid path issues
cd /d "%~dp0"

echo =======================================================================
echo 🏥 LOWER LIMB MECHANICAL ALIGNMENT ANALYZER - UNINSTALLER / CLEANUP
echo =======================================================================
echo.
echo This utility will safely remove application-specific files and packages:
echo  [1] Local Python Virtual Environment (venv/ folder and all local packages)
echo  [2] PyInstaller Build Directories (build/ and dist/ folders)
echo  [3] Executable Build Spec Files (*.spec)
echo  [4] Python Compiled Cache Files (__pycache__/ folders)
echo.
echo * SAFETY GUARANTEE *: This script operates strictly inside the application's
echo root folder. It will NOT touch your global Python installation, system PATH,
echo Windows Registry, or any critical Windows system files.
echo.

:: Prompt for confirmation before deleting
set /p CONFIRM="Are you sure you want to proceed with uninstallation and cleanup? (y/n): "
if /i "%CONFIRM%" neq "y" (
    echo.
    echo Uninstallation aborted by user. No files were removed.
    pause
    exit /b 0
)

echo.
echo -----------------------------------------------------------------------
echo 🚀 STARTING CLEANUP PROCESS...
echo -----------------------------------------------------------------------
echo.

:: Step 1: Deactivate active virtual environment if running in this session
if defined VIRTUAL_ENV (
    echo [1/5] Deactivating current virtual environment session...
    call venv\Scripts\deactivate.bat >nul 2>&1
    echo [SUCCESS] Virtual environment deactivated.
) else (
    echo [1/5] No active virtual environment session detected in this command window.
)
echo.

:: Step 2: Remove the virtual environment directory
echo [2/5] Cleaning local Python virtual environment...
if exist "venv" (
    echo Removing 'venv' folder (this may take a few seconds as it contains pip and local packages)...
    rmdir /s /q "venv"
    if exist "venv" (
        echo [WARNING] Could not fully remove 'venv' directory. It might be locked by another process.
    ) else (
        echo [SUCCESS] Local virtual environment folder successfully deleted.
    )
) else (
    echo [INFO] No 'venv' folder detected. Already clean!
)
echo.

:: Step 3: Remove compiled executable artifacts
echo [3/5] Cleaning PyInstaller compile directories...
set "CLEANED_ARTIFACTS=0"

if exist "build" (
    echo Removing PyInstaller 'build' directory...
    rmdir /s /q "build"
    set "CLEANED_ARTIFACTS=1"
)
if exist "dist" (
    echo Removing compiled 'dist' directory...
    rmdir /s /q "dist"
    set "CLEANED_ARTIFACTS=1"
)

if "%CLEANED_ARTIFACTS%"=="1" (
    echo [SUCCESS] Compiler build and distribution directories removed.
) else (
    echo [INFO] No 'build' or 'dist' directories found.
)
echo.

:: Step 4: Remove Spec files
echo [4/5] Cleaning PyInstaller specification files...
set "SPEC_FOUND=0"
if exist "*.spec" (
    for %%f in (*.spec) do (
        echo Deleting spec file: %%f
        del /f /q "%%f"
        set "SPEC_FOUND=1"
    )
)
if "%SPEC_FOUND%"=="1" (
    echo [SUCCESS] Executable configuration files deleted.
) else (
    echo [INFO] No *.spec configuration files found.
)
echo.

:: Step 5: Clean up __pycache__ folders recursively
echo [5/5] Searching for and deleting compiled Python cache (__pycache__)...
set "CACHE_FOUND=0"
for /r %%d in (__pycache__) do (
    if exist "%%d" (
        echo Deleting cache: %%d
        rmdir /s /q "%%d" >nul 2>&1
        set "CACHE_FOUND=1"
    )
)
if "%CACHE_FOUND%"=="1" (
    echo [SUCCESS] Compiled python cache clean completed.
) else (
    echo [INFO] No compiled python caches found.
)
echo.

echo =======================================================================
echo 🎉 UNINSTALLATION AND CLEANUP COMPLETED SUCCESSFULLY!
echo =======================================================================
echo.
echo All locally installed Python packages, virtual environment binaries,
echo and PyInstaller build directories have been safely deleted.
echo.
echo This cleanup did not affect Windows system performance or global configurations.
echo.
pause
exit /b 0
