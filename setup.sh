#!/bin/bash
# Setup script for Lower Limb Mechanical Alignment Analyzer on UNIX/macOS/Linux/Git Bash
# This script configures a Python virtual environment, installs dependencies,
# and sets up execution for the native offline desktop GUI application.

echo "======================================================================="
echo "🏥 LOWER LIMB MECHANICAL ALIGNMENT ANALYZER - SETUP SCRIPT"
echo "======================================================================="
echo ""

# Step 1: Check Python installation
echo "[1/3] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 was not found on your system."
    echo "Please download and install Python 3.10+ from https://www.python.org/ or your system package manager."
    exit 1
fi
python3 --version
echo "[SUCCESS] Python is installed."
echo ""

# Step 2: Set up Python Virtual Environment (venv)
echo "[2/3] Creating Python Virtual Environment (venv) in local folder..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment."
        exit 1
    fi
    echo "[SUCCESS] Virtual environment 'venv' created."
else
    echo "[INFO] Virtual environment 'venv' already exists."
fi

echo "Activating Python virtual environment..."
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to activate virtual environment."
    exit 1
fi
echo ""

# Step 3: Install Python packages
echo "[3/3] Installing Python dependencies from requirements.txt..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install Python dependencies."
    exit 1
fi
echo "[SUCCESS] Python dependencies installed successfully."
echo ""

echo "======================================================================="
echo "🎉 SETUP COMPLETED SUCCESSFULLY!"
echo "======================================================================="
echo ""
echo "You can run the application locally in two ways:"
echo ""
echo "OPTION A: Run via Python Script (Immediate launch)"
echo "-----------------------------------------------------------------------"
echo "1. Run the application:"
echo "   python3 lower_limb_analyzer.py"
echo ""
echo "OPTION B: Compile into a single standalone executable using PyInstaller"
echo "-----------------------------------------------------------------------"
echo "1. Compile the app using PyInstaller (creates a double-clickable bundle):"
echo "   pyinstaller --onefile --noconsole --name=\"Lower_Limb_Analyzer\" lower_limb_analyzer.py"
echo "2. Find your single-file executable in the 'dist' subfolder as:"
echo "   dist/Lower_Limb_Analyzer"
echo ""
read -p "Do you want to run the application now? (y/n): " run_now
if [ "$run_now" = "y" ] || [ "$run_now" = "Y" ]; then
    echo ""
    echo "Starting Lower Limb Mechanical Alignment Analyzer..."
    python3 lower_limb_analyzer.py
fi

exit 0
