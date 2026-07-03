import os
import sys
import math
import json
import base64
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageDraw, ImageTk, ImageFilter, ImageOps

# Define clinical colors
DARK_BG = "#090d16"
CARD_BG = "#131b2e"
BORDER_COLOR = "#223154"
TEXT_WHITE = "#f8fafc"
TEXT_MUTED = "#94a3b8"
ACCENT_BLUE = "#3b82f6"
ACCENT_CYAN = "#06b6d4"
ACCENT_RED = "#ef4444"
ACCENT_GREEN = "#10b981"
ACCENT_MAGENTA = "#d946ef"

# Default case landmarks (in percent of width/height: 0-100)
DEFAULT_LANDMARKS_3PT = {
    "left": {
        "hip": {"x": 65.0, "y": 18.3, "label": "L-H", "color": ACCENT_BLUE},
        "knee": {"x": 65.0, "y": 51.2, "label": "L-K", "color": ACCENT_GREEN},
        "ankle": {"x": 65.0, "y": 87.5, "label": "L-A", "color": ACCENT_BLUE},
    },
    "right": {
        "hip": {"x": 35.0, "y": 18.3, "label": "R-H", "color": ACCENT_RED},
        "knee": {"x": 35.0, "y": 51.2, "label": "R-K", "color": ACCENT_GREEN},
        "ankle": {"x": 35.0, "y": 87.5, "label": "R-A", "color": ACCENT_RED},
    }
}

DEFAULT_LANDMARKS_13PT = {
    "p-sym": {"x": 50.0, "y": 19.5, "label": "P-SYM", "color": ACCENT_MAGENTA},
    "r-fhc": {"x": 35.0, "y": 18.3, "label": "R-FHC", "color": ACCENT_RED},
    "r-lfc": {"x": 31.9, "y": 50.0, "label": "R-LFC", "color": "#f87171"},
    "r-mfc": {"x": 38.1, "y": 50.0, "label": "R-MFC", "color": "#f87171"},
    "r-ltp": {"x": 32.0, "y": 52.4, "label": "R-LTP", "color": "#fb7185"},
    "r-mtp": {"x": 38.0, "y": 52.4, "label": "R-MTP", "color": "#fb7185"},
    "r-tc":  {"x": 35.0, "y": 87.5, "label": "R-TC", "color": ACCENT_RED},
    "l-fhc": {"x": 65.0, "y": 18.3, "label": "L-FHC", "color": ACCENT_BLUE},
    "l-mfc": {"x": 61.9, "y": 50.0, "label": "L-MFC", "color": "#60a5fa"},
    "l-lfc": {"x": 68.1, "y": 50.0, "label": "L-LFC", "color": "#60a5fa"},
    "l-mtp": {"x": 62.0, "y": 52.4, "label": "L-MTP", "color": ACCENT_CYAN},
    "l-ltp": {"x": 68.0, "y": 52.4, "label": "L-LTP", "color": ACCENT_CYAN},
    "l-tc":  {"x": 65.0, "y": 87.5, "label": "L-TC", "color": ACCENT_BLUE},
}

# ----------------------------------------------------------------------
# PIL Skeletal Generator (Generates beautifully rendered medical scanograms)
# ----------------------------------------------------------------------
def draw_skeleton(draw, w, h, alignment="neutral"):
    # Clear Background
    draw.rectangle([0, 0, w, h], fill="#090d16")
    
    # Draw Gridlines
    for x in range(0, w, 40):
        draw.line([x, 0, x, h], fill="#111827", width=1)
    for y in range(0, h, 40):
        draw.line([0, y, w, y], fill="#111827", width=1)
        
    # Draw Ruler on right edge
    draw.line([w - 40, 50, w - 40, h - 50], fill="#4b5563", width=2)
    for i in range(21):
        y_pos = 50 + i * (h - 100) / 20
        draw.line([w - 55 if i % 2 == 0 else w - 48, y_pos, w - 40, y_pos], fill="#4b5563", width=2 if i % 2 == 0 else 1)
        if i % 2 == 0:
            draw.text((w - 85, y_pos - 6), f"{i * 5}cm", fill="#6b7280", font=None)

    # Lateral Shifts for Alignment Deformity
    l_knee_x = w * 0.65
    r_knee_x = w * 0.35
    label = "NEUTRAL CLINICAL TEMPLATE"
    
    if alignment == "varus":
        l_knee_x = w * 0.74
        r_knee_x = w * 0.26
        label = "GENU VARUM (BOW-LEGGED DEFORMITY)"
    elif alignment == "valgus":
        l_knee_x = w * 0.59
        r_knee_x = w * 0.41
        label = "GENU VALGUM (KNOCK-KNEED DEFORMITY)"

    # Draw Text Labels
    draw.text((w // 2 - 100, 20), "SCANOGRAM MECHANICAL SCAN", fill="#4b5563")
    draw.text((w // 2 - 120, 40), label, fill=ACCENT_CYAN)
    draw.text((40, 40), "R", fill=ACCENT_RED)
    draw.text((w - 60, 40), "L", fill=ACCENT_BLUE)

    # Pelvis outline
    draw.chord([w * 0.25, 120, w * 0.75, 240], 180, 360, outline="#334155", width=4)
    draw.ellipse([w * 0.38, 170, w * 0.44, 210], outline="#334155", width=2)
    draw.ellipse([w * 0.56, 170, w * 0.62, 210], outline="#334155", width=2)

    # Right Leg (Viewer's left)
    draw.ellipse([w * 0.32, 170, w * 0.38, 210], outline="#e2e8f0", width=3)  # Hip Head
    draw.line([w * 0.35, 190, w * 0.31, 230], fill="#e2e8f0", width=14)       # Hip Neck
    draw.line([w * 0.31, 230, r_knee_x, h * 0.50], fill="#e2e8f0", width=20)  # Femur
    draw.ellipse([r_knee_x - 25, h * 0.50 - 10, r_knee_x + 25, h * 0.50 + 20], fill="#090d16", outline="#e2e8f0", width=4) # Femoral Condyles
    
    # Right Tibia & Fibula
    draw.line([r_knee_x - 20, h * 0.52, r_knee_x + 20, h * 0.52], fill="#cbd5e1", width=10) # Tibial Plateau
    draw.line([r_knee_x, h * 0.52, w * 0.35, h * 0.88], fill="#cbd5e1", width=14)          # Tibia Shaft
    draw.line([r_knee_x - 16, h * 0.53, w * 0.33, h * 0.87], fill="#64748b", width=4)      # Fibula
    draw.line([w * 0.33, h * 0.88, w * 0.37, h * 0.88], fill="#cbd5e1", width=12)          # Ankle Joint

    # Left Leg (Viewer's right)
    draw.ellipse([w * 0.62, 170, w * 0.68, 210], outline="#e2e8f0", width=3)  # Hip Head
    draw.line([w * 0.65, 190, w * 0.69, 230], fill="#e2e8f0", width=14)       # Hip Neck
    draw.line([w * 0.69, 230, l_knee_x, h * 0.50], fill="#e2e8f0", width=20)  # Femur
    draw.ellipse([l_knee_x - 25, h * 0.50 - 10, l_knee_x + 25, h * 0.50 + 20], fill="#090d16", outline="#e2e8f0", width=4) # Femoral Condyles

    # Left Tibia & Fibula
    draw.line([l_knee_x - 20, h * 0.52, l_knee_x + 20, h * 0.52], fill="#cbd5e1", width=10) # Tibial Plateau
    draw.line([l_knee_x, h * 0.52, w * 0.65, h * 0.88], fill="#cbd5e1", width=14)          # Tibia Shaft
    draw.line([l_knee_x + 16, h * 0.53, w * 0.67, h * 0.87], fill="#64748b", width=4)      # Fibula
    draw.line([w * 0.63, h * 0.88, w * 0.67, h * 0.88], fill="#cbd5e1", width=12)          # Ankle Joint

def make_synthetic_scanogram_img(w=600, h=900, alignment="neutral"):
    img = Image.new("RGB", (w, h), color="#090d16")
    draw = ImageDraw.Draw(img)
    draw_skeleton(draw, w, h, alignment)
    # Apply soft Gaussian blur to emulate X-ray visual density
    img = img.filter(ImageFilter.GaussianBlur(1.2))
    return img

# ----------------------------------------------------------------------
# Geometry Math Helpers
# ----------------------------------------------------------------------
def get_vector_angle(v1, v2):
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    m1 = math.sqrt(v1[0]**2 + v1[1]**2)
    m2 = math.sqrt(v2[0]**2 + v2[1]**2)
    if m1 == 0 or m2 == 0:
        return 180.0
    cos_t = dot / (m1 * m2)
    angle_rad = math.acos(max(-1.0, min(1.0, cos_t)))
    return angle_rad * (180.0 / math.pi)

# ----------------------------------------------------------------------
# Desktop App Main Class
# ----------------------------------------------------------------------
class LowerLimbAnalyzerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Lower Limb Mechanical Alignment Analyzer")
        self.root.geometry("1280x880")
        self.root.configure(bg=DARK_BG)
        
        # Configure overall ttk styling
        self.setup_styles()
        
        # Application States
        self.alignment_mode = "HKA"  # "HKA" or "FULL"
        self.active_case = "case-neutral"
        self.show_bones = True
        self.show_axes = True
        self.show_grid = True
        self.dragged_point_id = None
        
        # Original Image vs Loaded Image references
        self.original_pil_image = None
        self.current_pil_image = None
        self.display_tk_image = None
        self.canvas_scale_x = 1.0
        self.canvas_scale_y = 1.0
        
        # Active Landmarks Coordinates
        self.landmarks_3pt = json.loads(json.dumps(DEFAULT_LANDMARKS_3PT))
        self.landmarks_13pt = json.loads(json.dumps(DEFAULT_LANDMARKS_13PT))
        
        # Calibration state
        self.calibration_active = False
        self.calibration_pts = []
        self.mm_per_pixel = None
        self.calibration_length_mm = 500.0  # Default scale ruler

        # Mouse Tracking for loupe & coordinates
        self.mouse_x = 0
        self.mouse_y = 0
        self.is_dragging = False

        # Build UI layout
        self.create_layout()
        
        # Load Initial Synthetic Case A (Neutral)
        self.load_preset_case("case-neutral")

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure(".", background=DARK_BG, foreground=TEXT_WHITE, fieldbackground=DARK_BG)
        style.configure("TFrame", background=DARK_BG)
        style.configure("Card.TFrame", background=CARD_BG, borderwidth=1, relief="solid")
        style.configure("TLabel", background=DARK_BG, foreground=TEXT_WHITE, font=("Helvetica", 10))
        style.configure("Title.TLabel", background=DARK_BG, foreground=ACCENT_CYAN, font=("Helvetica", 12, "bold"))
        style.configure("Header.TLabel", background=CARD_BG, foreground=ACCENT_CYAN, font=("Helvetica", 11, "bold"))
        style.configure("Data.TLabel", background=CARD_BG, foreground=TEXT_WHITE, font=("Consolas", 10))
        style.configure("Status.TLabel", background=DARK_BG, foreground=TEXT_MUTED, font=("Consolas", 9))
        
        # Custom button styles
        style.configure("TButton", font=("Helvetica", 9, "bold"), background="#1e293b", foreground=TEXT_WHITE, borderwidth=0)
        style.map("TButton", background=[("active", "#334155")])
        style.configure("Accent.TButton", background=ACCENT_BLUE, foreground=TEXT_WHITE)
        style.map("Accent.TButton", background=[("active", "#2563eb")])

    def create_layout(self):
        # 1. Main Container
        self.main_pane = tk.Frame(self.root, bg=DARK_BG)
        self.main_pane.pack(fill="both", expand=True, padx=10, pady=10)
        
        # 2. Left Sidebar (Workspace & Calibration Options)
        self.left_sidebar = tk.Frame(self.main_pane, bg=DARK_BG, width=280)
        self.left_sidebar.pack(side="left", fill="y", padx=(0, 10))
        self.left_sidebar.pack_propagate(False)
        self.build_left_sidebar()
        
        # 3. Center Interactive Canvas Section
        self.center_pane = tk.Frame(self.main_pane, bg=DARK_BG)
        self.center_pane.pack(side="left", fill="both", expand=True)
        self.build_canvas_area()
        
        # 4. Right Sidebar (Clinical Metrics Dashboard)
        self.right_sidebar = tk.Frame(self.main_pane, bg=DARK_BG, width=320)
        self.right_sidebar.pack(side="right", fill="y", padx=(10, 0))
        self.right_sidebar.pack_propagate(False)
        self.build_right_sidebar()

    # ----------------------------------------------------------------------
    # Building Left Sidebar Components
    # ----------------------------------------------------------------------
    def build_left_sidebar(self):
        # Logo Card
        logo_frame = ttk.Frame(self.left_sidebar, style="Card.TFrame")
        logo_frame.pack(fill="x", pady=(0, 10), ipady=5)
        
        logo_lbl = ttk.Label(logo_frame, text="🏥 LIMB ALIGNMENT v2.5", font=("Helvetica", 11, "bold"), foreground=ACCENT_CYAN, background=CARD_BG)
        logo_lbl.pack(anchor="w", padx=10, pady=(10, 2))
        sub_lbl = ttk.Label(logo_frame, text="Offline Desktop Precision Tool", font=("Helvetica", 8), foreground=TEXT_MUTED, background=CARD_BG)
        sub_lbl.pack(anchor="w", padx=10)

        # Cases Selector Card
        cases_frame = ttk.Frame(self.left_sidebar, style="Card.TFrame")
        cases_frame.pack(fill="x", pady=5, ipady=5)
        
        ttk.Label(cases_frame, text="PATIENT SCANOGRAM CASE", style="Header.TLabel", background=CARD_BG).pack(anchor="w", padx=10, pady=(10, 5))
        
        btn_neutral = ttk.Button(cases_frame, text="Case A: physiological Neutral", command=lambda: self.load_preset_case("case-neutral"))
        btn_neutral.pack(fill="x", padx=10, pady=3)
        
        btn_varus = ttk.Button(cases_frame, text="Case B: Bilateral Varus", command=lambda: self.load_preset_case("case-varus"))
        btn_varus.pack(fill="x", padx=10, pady=3)
        
        btn_valgus = ttk.Button(cases_frame, text="Case C: Bilateral Valgus", command=lambda: self.load_preset_case("case-valgus"))
        btn_valgus.pack(fill="x", padx=10, pady=3)

        # File Import & Config Card
        import_frame = ttk.Frame(self.left_sidebar, style="Card.TFrame")
        import_frame.pack(fill="x", pady=5, ipady=8)
        
        ttk.Label(import_frame, text="CUSTOM PATIENT IMPORT", style="Header.TLabel", background=CARD_BG).pack(anchor="w", padx=10, pady=(10, 5))
        btn_upload = ttk.Button(import_frame, text="📂 Load Scanogram X-Ray", style="Accent.TButton", command=self.upload_custom_image)
        btn_upload.pack(fill="x", padx=10, pady=4)
        
        self.file_status_lbl = ttk.Label(import_frame, text="Using: Neutral Skeletal Preset", font=("Consolas", 8), foreground=ACCENT_GREEN, background=CARD_BG)
        self.file_status_lbl.pack(anchor="w", padx=10, pady=(2, 0))

        # Core Alignment Mode Selector
        mode_frame = ttk.Frame(self.left_sidebar, style="Card.TFrame")
        mode_frame.pack(fill="x", pady=5, ipady=8)
        
        ttk.Label(mode_frame, text="ALIGNMENT MODE", style="Header.TLabel", background=CARD_BG).pack(anchor="w", padx=10, pady=(10, 5))
        self.mode_var = tk.StringVar(value="HKA")
        
        hka_radio = tk.Radiobutton(mode_frame, text="3-Pt Mechanical Axis (HKA)", variable=self.mode_var, value="HKA", 
                                   command=self.toggle_alignment_mode, bg=CARD_BG, fg=TEXT_WHITE, selectcolor=DARK_BG, activebackground=CARD_BG, activeforeground=TEXT_WHITE, font=("Helvetica", 9))
        hka_radio.pack(anchor="w", padx=15, pady=2)
        
        full_radio = tk.Radiobutton(mode_frame, text="13-Pt Detailed Joint Line", variable=self.mode_var, value="FULL", 
                                    command=self.toggle_alignment_mode, bg=CARD_BG, fg=TEXT_WHITE, selectcolor=DARK_BG, activebackground=CARD_BG, activeforeground=TEXT_WHITE, font=("Helvetica", 9))
        full_radio.pack(anchor="w", padx=15, pady=2)

        # Scaling/Calibration Ruler
        calib_frame = ttk.Frame(self.left_sidebar, style="Card.TFrame")
        calib_frame.pack(fill="x", pady=5, ipady=8)
        
        ttk.Label(calib_frame, text="PHYSICAL RULER CALIBRATION", style="Header.TLabel", background=CARD_BG).pack(anchor="w", padx=10, pady=(10, 5))
        
        input_sub = tk.Frame(calib_frame, bg=CARD_BG)
        input_sub.pack(fill="x", padx=10, pady=2)
        ttk.Label(input_sub, text="Length (mm):", background=CARD_BG, font=("Helvetica", 8)).pack(side="left")
        self.calib_input_entry = tk.Entry(input_sub, width=10, bg=DARK_BG, fg=TEXT_WHITE, insertbackground=TEXT_WHITE, borderwidth=1, relief="solid")
        self.calib_input_entry.insert(0, "500")
        self.calib_input_entry.pack(side="right", padx=(5, 0))
        
        self.btn_calib = ttk.Button(calib_frame, text="📏 Start Calibration", command=self.toggle_calibration_mode)
        self.btn_calib.pack(fill="x", padx=10, pady=4)
        
        self.calib_status_lbl = ttk.Label(calib_frame, text="Calibration: Inactive", font=("Consolas", 8), foreground=TEXT_MUTED, background=CARD_BG)
        self.calib_status_lbl.pack(anchor="w", padx=10)

        # Offline Status log
        self.status_log = ttk.Label(self.left_sidebar, text="SYSTEM STATUS: OFFLINE DIRECT", style="Status.TLabel")
        self.status_log.pack(side="bottom", anchor="w", pady=10)

    # ----------------------------------------------------------------------
    # Building Center Interactive Canvas Area
    # ----------------------------------------------------------------------
    def build_canvas_area(self):
        # Top toolbar
        toolbar = tk.Frame(self.center_pane, bg=DARK_BG)
        toolbar.pack(fill="x", pady=(0, 5))
        
        # Display toggle buttons
        self.bones_toggle_var = tk.BooleanVar(value=True)
        cb_bones = tk.Checkbutton(toolbar, text="Skeletal Outline", variable=self.bones_toggle_var, command=self.update_canvas_display, 
                                   bg=DARK_BG, fg=TEXT_WHITE, selectcolor=DARK_BG, activebackground=DARK_BG, activeforeground=TEXT_WHITE)
        cb_bones.pack(side="left", padx=5)

        self.axes_toggle_var = tk.BooleanVar(value=True)
        cb_axes = tk.Checkbutton(toolbar, text="Mechanical Axes", variable=self.axes_toggle_var, command=self.update_canvas_display,
                                  bg=DARK_BG, fg=TEXT_WHITE, selectcolor=DARK_BG, activebackground=DARK_BG, activeforeground=TEXT_WHITE)
        cb_axes.pack(side="left", padx=5)

        self.grid_toggle_var = tk.BooleanVar(value=True)
        cb_grid = tk.Checkbutton(toolbar, text="Clinical Scale Ruler", variable=self.grid_toggle_var, command=self.update_canvas_display,
                                  bg=DARK_BG, fg=TEXT_WHITE, selectcolor=DARK_BG, activebackground=DARK_BG, activeforeground=TEXT_WHITE)
        cb_grid.pack(side="left", padx=5)

        btn_reset = ttk.Button(toolbar, text="🔄 Reset Points", command=self.reset_current_points)
        btn_reset.pack(side="right", padx=5)

        # Plotting interactive canvas container
        self.canvas_container = tk.Frame(self.center_pane, bg=DARK_BG, borderwidth=1, relief="solid", highlightbackground=BORDER_COLOR, highlightthickness=1)
        self.canvas_container.pack(fill="both", expand=True)
        
        self.canvas = tk.Canvas(self.canvas_container, bg=DARK_BG, borderwidth=0, highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)
        
        # Event bindings for drag operations
        self.canvas.bind("<ButtonPress-1>", self.on_canvas_click)
        self.canvas.bind("<B1-Motion>", self.on_canvas_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_canvas_release)
        self.canvas.bind("<Motion>", self.on_canvas_hover)

    # ----------------------------------------------------------------------
    # Building Right Sidebar Components (Clinical Dashboard)
    # ----------------------------------------------------------------------
    def build_right_sidebar(self):
        # Diagnostic Dial Box (Drawn visually on Canvas)
        dial_card = ttk.Frame(self.right_sidebar, style="Card.TFrame")
        dial_card.pack(fill="x", pady=(0, 10), ipady=5)
        ttk.Label(dial_card, text="ALIGNMENT ANGLE GAUGES", style="Header.TLabel", background=CARD_BG).pack(anchor="w", padx=10, pady=(10, 2))
        
        self.gauge_canvas = tk.Canvas(dial_card, bg=CARD_BG, height=130, width=300, borderwidth=0, highlightthickness=0)
        self.gauge_canvas.pack(fill="x", padx=10)

        # Measurements Table Frame
        metrics_card = ttk.Frame(self.right_sidebar, style="Card.TFrame")
        metrics_card.pack(fill="x", pady=5, ipady=8)
        
        ttk.Label(metrics_card, text="RADIOLOGICAL PARAMETERS", style="Header.TLabel", background=CARD_BG).pack(anchor="w", padx=10, pady=(10, 5))
        
        # Grid table for parameters
        self.table_frame = tk.Frame(metrics_card, bg=CARD_BG)
        self.table_frame.pack(fill="x", padx=10, pady=5)
        self.build_metrics_table()

        # AI & API Key Integration Card
        ai_card = ttk.Frame(self.right_sidebar, style="Card.TFrame")
        ai_card.pack(fill="x", pady=5, ipady=8)
        
        ttk.Label(ai_card, text="🤖 GEMINI AUTOMATED DETECTION", style="Header.TLabel", background=CARD_BG).pack(anchor="w", padx=10, pady=(10, 5))
        
        key_sub = tk.Frame(ai_card, bg=CARD_BG)
        key_sub.pack(fill="x", padx=10, pady=2)
        ttk.Label(key_sub, text="Gemini Key:", background=CARD_BG, font=("Helvetica", 8)).pack(side="left")
        self.api_key_entry = tk.Entry(key_sub, show="*", bg=DARK_BG, fg=TEXT_WHITE, insertbackground=TEXT_WHITE, borderwidth=1, relief="solid")
        # Try loading API key from env variable
        env_key = os.environ.get("GEMINI_API_KEY", "")
        if env_key:
            self.api_key_entry.insert(0, env_key)
        self.api_key_entry.pack(side="right", fill="x", expand=True, padx=(5, 0))

        self.btn_ai_detect = ttk.Button(ai_card, text="✨ Run AI Scanogram Plotter", style="Accent.TButton", command=self.run_online_ai_detection)
        self.btn_ai_detect.pack(fill="x", padx=10, pady=5)

        # Export Clinical Report card
        report_card = ttk.Frame(self.right_sidebar, style="Card.TFrame")
        report_card.pack(fill="both", expand=True, pady=(5, 0), ipady=5)
        
        ttk.Label(report_card, text="CLINICAL DIAGNOSTIC REPORT", style="Header.TLabel", background=CARD_BG).pack(anchor="w", padx=10, pady=(10, 3))
        
        self.report_text = tk.Text(report_card, bg=DARK_BG, fg=TEXT_WHITE, wrap="word", font=("Consolas", 9), borderwidth=1, relief="solid")
        self.report_text.pack(fill="both", expand=True, padx=10, pady=5)
        
        export_btn_sub = tk.Frame(report_card, bg=CARD_BG)
        export_btn_sub.pack(fill="x", padx=10, pady=(2, 5))
        
        btn_save_img = ttk.Button(export_btn_sub, text="💾 Save Image", command=self.save_annotated_image)
        btn_save_img.pack(side="left", fill="x", expand=True, padx=(0, 2))
        
        btn_save_rep = ttk.Button(export_btn_sub, text="📝 Save Report", command=self.save_report_text)
        btn_save_rep.pack(side="right", fill="x", expand=True, padx=(2, 0))

    def build_metrics_table(self):
        # Clear frame first
        for child in self.table_frame.winfo_children():
            child.destroy()
            
        headers = ["Clinical Metric", "Right Leg", "Left Leg"]
        for col_idx, header in enumerate(headers):
            lbl = ttk.Label(self.table_frame, text=header, font=("Helvetica", 8, "bold"), foreground=ACCENT_CYAN, background=CARD_BG)
            lbl.grid(row=0, column=col_idx, sticky="w", padx=5, pady=4)
            
        self.metric_rows = {}
        metrics_list = [
            ("HKA Angle", "180.0°", "180.0°", "hka"),
            ("Alignment", "Neutral", "Neutral", "category"),
            ("mLDFA", "N/A", "N/A", "mldfa"),
            ("mMPTA", "N/A", "N/A", "mmpta"),
            ("JLCA", "N/A", "N/A", "jlca"),
            ("Limb Length", "N/A", "N/A", "length"),
            ("LL Discrepancy", "N/A", "N/A", "lld")
        ]
        
        for row_idx, (name, r_val, l_val, key) in enumerate(metrics_list, start=1):
            lbl_name = ttk.Label(self.table_frame, text=name, font=("Helvetica", 9), foreground=TEXT_WHITE, background=CARD_BG)
            lbl_name.grid(row=row_idx, column=0, sticky="w", padx=5, pady=3)
            
            lbl_right = ttk.Label(self.table_frame, text=r_val, style="Data.TLabel")
            lbl_right.grid(row=row_idx, column=1, sticky="w", padx=5, pady=3)
            
            lbl_left = ttk.Label(self.table_frame, text=l_val, style="Data.TLabel")
            lbl_left.grid(row=row_idx, column=2, sticky="w", padx=5, pady=3)
            
            self.metric_rows[key] = (lbl_right, lbl_left)

    # ----------------------------------------------------------------------
    # Live Visual Gauges Rendering (HKA angle dial indicator)
    # ----------------------------------------------------------------------
    def draw_dial_charts(self, r_hka, l_hka):
        self.gauge_canvas.delete("all")
        w_gc = 280
        h_gc = 120
        
        # Center points for two mini dials
        r_cx, r_cy = w_gc * 0.25, h_gc * 0.55
        l_cx, l_cy = w_gc * 0.75, h_gc * 0.55
        r_val = 50
        
        def draw_single_dial(cx, cy, hka, title, accent_color):
            r = 38
            # Draw color arc (Varus Red to Neutral Green to Valgus Blue)
            # Arc from 180 (left) to 0 (right) in degrees
            self.gauge_canvas.create_arc(cx-r, cy-r, cx+r, cy+r, start=0, extent=180, outline="#1e293b", style="arc", width=6)
            self.gauge_canvas.create_arc(cx-r, cy-r, cx+r, cy+r, start=135, extent=45, outline=ACCENT_RED, style="arc", width=6)
            self.gauge_canvas.create_arc(cx-r, cy-r, cx+r, cy+r, start=45, extent=90, outline=ACCENT_GREEN, style="arc", width=6)
            self.gauge_canvas.create_arc(cx-r, cy-r, cx+r, cy+r, start=0, extent=45, outline=ACCENT_BLUE, style="arc", width=6)
            
            # Map HKA angle (ideal 180 is center at 90 deg)
            # Scale range 165° (Varus) to 195° (Valgus)
            deviation = hka - 180.0
            needle_deg = 90.0 - (deviation * 4.0) # Scale angle sensitivity
            needle_deg = max(10, min(170, needle_deg))
            
            rad = math.radians(needle_deg)
            nx = cx + r * math.cos(rad)
            ny = cy - r * math.sin(rad)
            
            # Draw needle pointer
            self.gauge_canvas.create_line(cx, cy, nx, ny, fill=TEXT_WHITE, width=3, arrow="last")
            self.gauge_canvas.create_circle_base = self.gauge_canvas.create_oval(cx-5, cy-5, cx+5, cy+5, fill=accent_color, outline=CARD_BG)
            
            # Draw labels
            self.gauge_canvas.create_text(cx, cy - 50, text=title, fill=TEXT_MUTED, font=("Helvetica", 8, "bold"))
            self.gauge_canvas.create_text(cx, cy + 18, text=f"{hka:.1f}°", fill=TEXT_WHITE, font=("Consolas", 10, "bold"))
            
            # Draw minor label
            diag = "Neutral"
            if hka < 178.5: diag = "Varus"
            elif hka > 181.5: diag = "Valgus"
            self.gauge_canvas.create_text(cx, cy + 32, text=diag, fill=accent_color, font=("Helvetica", 7, "bold"))

        draw_single_dial(r_cx, r_cy, r_hka, "RIGHT LEG", ACCENT_RED)
        draw_single_dial(l_cx, l_cy, l_hka, "LEFT LEG", ACCENT_BLUE)

    # ----------------------------------------------------------------------
    # Core Operations: Drag & Plotting Handlers
    # ----------------------------------------------------------------------
    def get_current_landmarks_dict(self):
        if self.alignment_mode == "HKA":
            return self.landmarks_3pt
        else:
            return self.landmarks_13pt

    def on_canvas_click(self, event):
        self.mouse_x = event.x
        self.mouse_y = event.y
        
        # Check Calibration Mode first
        if self.calibration_active:
            # Map click coordinates to normalized percent
            px_x = (event.x / self.canvas.winfo_width()) * 100.0
            px_y = (event.y / self.canvas.winfo_height()) * 100.0
            self.calibration_pts.append((px_x, px_y))
            
            if len(self.calibration_pts) == 1:
                self.calib_status_lbl.configure(text="Click Point 2 to align ruler...", foreground=ACCENT_CYAN)
                self.update_canvas_display()
            elif len(self.calibration_pts) == 2:
                self.perform_calibration()
            return
            
        # Standard Landmark drag check
        # Search for closest point within a 15-pixel radius
        self.dragged_point_id = None
        closest_dist = 99999.0
        
        w_cv = self.canvas.winfo_width()
        h_cv = self.canvas.winfo_height()
        
        if self.alignment_mode == "HKA":
            for leg in ["left", "right"]:
                for p_id, p_info in self.landmarks_3pt[leg].items():
                    px_x = (p_info["x"] / 100.0) * w_cv
                    px_y = (p_info["y"] / 100.0) * h_cv
                    dist = math.sqrt((event.x - px_x)**2 + (event.y - px_y)**2)
                    if dist < 15 and dist < closest_dist:
                        closest_dist = dist
                        self.dragged_point_id = (leg, p_id)
        else:
            for p_id, p_info in self.landmarks_13pt.items():
                px_x = (p_info["x"] / 100.0) * w_cv
                px_y = (p_info["y"] / 100.0) * h_cv
                dist = math.sqrt((event.x - px_x)**2 + (event.y - px_y)**2)
                if dist < 15 and dist < closest_dist:
                    closest_dist = dist
                    self.dragged_point_id = p_id

        if self.dragged_point_id:
            self.is_dragging = True
            self.update_canvas_display()

    def on_canvas_drag(self, event):
        self.mouse_x = event.x
        self.mouse_y = event.y
        
        if not self.is_dragging or not self.dragged_point_id:
            return
            
        w_cv = self.canvas.winfo_width()
        h_cv = self.canvas.winfo_height()
        
        # Guard boundaries
        pct_x = max(0.0, min(100.0, (event.x / w_cv) * 100.0))
        pct_y = max(0.0, min(100.0, (event.y / h_cv) * 100.0))
        
        if self.alignment_mode == "HKA":
            leg, p_id = self.dragged_point_id
            self.landmarks_3pt[leg][p_id]["x"] = pct_x
            self.landmarks_3pt[leg][p_id]["y"] = pct_y
        else:
            p_id = self.dragged_point_id
            self.landmarks_13pt[p_id]["x"] = pct_x
            self.landmarks_13pt[p_id]["y"] = pct_y
            
        self.update_canvas_display()
        self.recalculate_clinical_alignment()

    def on_canvas_release(self, event):
        self.is_dragging = False
        self.dragged_point_id = None
        self.update_canvas_display()

    def on_canvas_hover(self, event):
        self.mouse_x = event.x
        self.mouse_y = event.y
        if self.is_dragging:
            self.on_canvas_drag(event)

    # ----------------------------------------------------------------------
    # Real-time High-Resolution Loupe Overlay (Magnifier)
    # ----------------------------------------------------------------------
    def draw_precision_loupe(self):
        if not self.is_dragging or not self.current_pil_image:
            return
            
        w_cv = self.canvas.winfo_width()
        h_cv = self.canvas.winfo_height()
        
        # Center crop on mouse pos relative to image pixels
        img_w, img_h = self.current_pil_image.size
        px_x = int((self.mouse_x / w_cv) * img_w)
        px_y = int((self.mouse_y / h_cv) * img_h)
        
        # Define crop size of 32x32 pixels
        crop_size = 32
        left = max(0, px_x - crop_size // 2)
        top = max(0, px_y - crop_size // 2)
        right = min(img_w, left + crop_size)
        bottom = min(img_h, top + crop_size)
        
        cropped = self.current_pil_image.crop((left, top, right, bottom))
        # Zoom up by 5x (160x160 canvas frame)
        loupe_w, loupe_h = 160, 160
        zoomed = cropped.resize((loupe_w, loupe_h), Image.Resampling.NEAREST)
        
        # Mask into circular loupe
        mask = Image.new("L", (loupe_w, loupe_h), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([5, 5, loupe_w-5, loupe_h-5], fill=255)
        
        # Prepare zoomed image with circular crop and solid border
        circular_loupe = Image.new("RGBA", (loupe_w, loupe_h), (0, 0, 0, 0))
        circular_loupe.paste(zoomed, (0, 0), mask=mask)
        
        # Draw red crosshair in center
        loupe_draw = ImageDraw.Draw(circular_loupe)
        loupe_draw.ellipse([5, 5, loupe_w-5, loupe_h-5], outline=ACCENT_CYAN, width=3)
        loupe_draw.line([loupe_w//2, 10, loupe_w//2, loupe_h-10], fill=ACCENT_RED, width=1)
        loupe_draw.line([10, loupe_h//2, loupe_w-10, loupe_h//2], fill=ACCENT_RED, width=1)
        
        # Keep photo reference
        self.loupe_tk = ImageTk.PhotoImage(circular_loupe)
        
        # Draw on Canvas (Positioned top-right or top-left offset to not hide finger)
        pos_x = 20 if self.mouse_x > w_cv - 200 else w_cv - 180
        pos_y = 20
        self.canvas.create_image(pos_x, pos_y, image=self.loupe_tk, anchor="nw")
        self.canvas.create_rectangle(pos_x - 1, pos_y - 1, pos_x + loupe_w + 1, pos_y + loupe_h + 1, outline=BORDER_COLOR, width=1)

    # ----------------------------------------------------------------------
    # Core Layout Updates & Plotted Lines Rendering
    # ----------------------------------------------------------------------
    def update_canvas_display(self):
        if not self.canvas.winfo_width() or not self.current_pil_image:
            self.root.after(100, self.update_canvas_display)
            return
            
        w_cv = self.canvas.winfo_width()
        h_cv = self.canvas.winfo_height()
        
        # Resize background scanogram to match current container window
        resized = self.current_pil_image.resize((w_cv, h_cv), Image.Resampling.LANCZOS)
        self.display_tk_image = ImageTk.PhotoImage(resized)
        
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, image=self.display_tk_image, anchor="nw")
        
        # 1. Render Calibration lines if active
        if self.calibration_active:
            for pt in self.calibration_pts:
                px = (pt[0] / 100.0) * w_cv
                py = (pt[1] / 100.0) * h_cv
                self.canvas.create_oval(px-5, py-5, px+5, py+5, fill=ACCENT_MAGENTA, outline=TEXT_WHITE)
            if len(self.calibration_pts) == 2:
                p1_x = (self.calibration_pts[0][0] / 100.0) * w_cv
                p1_y = (self.calibration_pts[0][1] / 100.0) * h_cv
                p2_x = (self.calibration_pts[1][0] / 100.0) * w_cv
                p2_y = (self.calibration_pts[1][1] / 100.0) * h_cv
                self.canvas.create_line(p1_x, p1_y, p2_x, p2_y, fill=ACCENT_MAGENTA, width=2, dash=(5, 3))
                
        # 2. Render Clinical Graphics
        self.draw_clinical_graphics(w_cv, h_cv)
        
        # 3. Overlay interactive points
        self.draw_landmark_handles(w_cv, h_cv)
        
        # 4. Render loupe magnification
        self.draw_precision_loupe()

    def draw_clinical_graphics(self, w, h):
        # Bone/Skeletal drawing if desired is handled natively inside the PIL image generation.
        # Here we overlay custom clinical alignments and mechanical lines on canvas
        if not self.axes_toggle_var.get():
            return
            
        if self.alignment_mode == "HKA":
            for leg in ["left", "right"]:
                leg_pts = self.landmarks_3pt[leg]
                hip_px = (leg_pts["hip"]["x"] / 100.0) * w
                hip_py = (leg_pts["hip"]["y"] / 100.0) * h
                knee_px = (leg_pts["knee"]["x"] / 100.0) * w
                knee_py = (leg_pts["knee"]["y"] / 100.0) * h
                ankle_px = (leg_pts["ankle"]["x"] / 100.0) * w
                ankle_py = (leg_pts["ankle"]["y"] / 100.0) * h
                
                color = ACCENT_RED if leg == "right" else ACCENT_BLUE
                # Femoral line
                self.canvas.create_line(hip_px, hip_py, knee_px, knee_py, fill=color, width=2, dash=(4, 4))
                # Tibial line
                self.canvas.create_line(knee_px, knee_py, ankle_px, ankle_py, fill=color, width=2, dash=(4, 4))
                # Direct Hip-Ankle Axis Line (Mechanical axis load path)
                self.canvas.create_line(hip_px, hip_py, ankle_px, ankle_py, fill="#64748b", width=1, dash=(2, 2))
        else:
            p = self.landmarks_13pt
            # Calculations for joint centers
            r_kc_x = ((p["r-lfc"]["x"] + p["r-mfc"]["x"]) / 2.0 / 100.0) * w
            r_kc_y = ((p["r-lfc"]["y"] + p["r-mfc"]["y"]) / 2.0 / 100.0) * h
            r_tc_knee_x = ((p["r-ltp"]["x"] + p["r-mtp"]["x"]) / 2.0 / 100.0) * w
            r_tc_knee_y = ((p["r-ltp"]["y"] + p["r-mtp"]["y"]) / 2.0 / 100.0) * h
            
            l_kc_x = ((p["l-lfc"]["x"] + p["l-mfc"]["x"]) / 2.0 / 100.0) * w
            l_kc_y = ((p["l-lfc"]["y"] + p["l-mfc"]["y"]) / 2.0 / 100.0) * h
            l_tc_knee_x = ((p["l-ltp"]["x"] + p["l-mtp"]["x"]) / 2.0 / 100.0) * w
            l_tc_knee_y = ((p["l-ltp"]["y"] + p["l-mtp"]["y"]) / 2.0 / 100.0) * h

            # Right leg axes
            self.canvas.create_line((p["r-fhc"]["x"]/100)*w, (p["r-fhc"]["y"]/100)*h, r_kc_x, r_kc_y, fill=ACCENT_RED, width=2, dash=(3, 3))
            self.canvas.create_line(r_tc_knee_x, r_tc_knee_y, (p["r-tc"]["x"]/100)*w, (p["r-tc"]["y"]/100)*h, fill=ACCENT_RED, width=2, dash=(3, 3))
            # Right Femoral distal line (LFC to MFC)
            self.canvas.create_line((p["r-lfc"]["x"]/100)*w, (p["r-lfc"]["y"]/100)*h, (p["r-mfc"]["x"]/100)*w, (p["r-mfc"]["y"]/100)*h, fill="yellow", width=2)
            # Right Tibial proximal line (LTP to MTP)
            self.canvas.create_line((p["r-ltp"]["x"]/100)*w, (p["r-ltp"]["y"]/100)*h, (p["r-mtp"]["x"]/100)*w, (p["r-mtp"]["y"]/100)*h, fill=ACCENT_CYAN, width=2)

            # Left leg axes
            self.canvas.create_line((p["l-fhc"]["x"]/100)*w, (p["l-fhc"]["y"]/100)*h, l_kc_x, l_kc_y, fill=ACCENT_BLUE, width=2, dash=(3, 3))
            self.canvas.create_line(l_tc_knee_x, l_tc_knee_y, (p["l-tc"]["x"]/100)*w, (p["l-tc"]["y"]/100)*h, fill=ACCENT_BLUE, width=2, dash=(3, 3))
            # Left Femoral distal joint line
            self.canvas.create_line((p["l-lfc"]["x"]/100)*w, (p["l-lfc"]["y"]/100)*h, (p["l-mfc"]["x"]/100)*w, (p["l-mfc"]["y"]/100)*h, fill="yellow", width=2)
            # Left Tibial proximal joint line
            self.canvas.create_line((p["l-ltp"]["x"]/100)*w, (p["l-ltp"]["y"]/100)*h, (p["l-mtp"]["x"]/100)*w, (p["l-mtp"]["y"]/100)*h, fill=ACCENT_CYAN, width=2)

            # Pelvic symphysis center marker dot
            p_sym_x = (p["p-sym"]["x"] / 100.0) * w
            p_sym_y = (p["p-sym"]["y"] / 100.0) * h
            self.canvas.create_oval(p_sym_x-6, p_sym_y-6, p_sym_x+6, p_sym_y+6, fill=ACCENT_MAGENTA, outline=TEXT_WHITE, width=2)

    def draw_landmark_handles(self, w, h):
        if self.alignment_mode == "HKA":
            for leg in ["left", "right"]:
                for p_id, p_info in self.landmarks_3pt[leg].items():
                    px = (p_info["x"] / 100.0) * w
                    py = (p_info["y"] / 100.0) * h
                    # Check selection status
                    outline_c = TEXT_WHITE
                    thickness = 1
                    if self.dragged_point_id == (leg, p_id):
                        outline_c = ACCENT_CYAN
                        thickness = 2
                        
                    self.canvas.create_oval(px-7, py-7, px+7, py+7, fill=p_info["color"], outline=outline_c, width=thickness)
                    self.canvas.create_text(px, py-16, text=p_info["label"], fill=TEXT_WHITE, font=("Helvetica", 8, "bold"))
        else:
            for p_id, p_info in self.landmarks_13pt.items():
                if p_id == "p-sym": continue # Handled inside clinical graphics
                px = (p_info["x"] / 100.0) * w
                py = (p_info["y"] / 100.0) * h
                
                outline_c = TEXT_WHITE
                thickness = 1
                if self.dragged_point_id == p_id:
                    outline_c = ACCENT_CYAN
                    thickness = 2
                    
                self.canvas.create_oval(px-5, py-5, px+5, py+5, fill=p_info["color"], outline=outline_c, width=thickness)
                self.canvas.create_text(px, py-14, text=p_info["label"], fill=TEXT_WHITE, font=("Helvetica", 7, "bold"))

    # ----------------------------------------------------------------------
    # Live Geometry Recalculation Core Engine
    # ----------------------------------------------------------------------
    def recalculate_clinical_alignment(self):
        w_cv = self.canvas.winfo_width() or 600
        
        # 1. Scaling configuration (pixels to mm)
        scale_est = self.mm_per_pixel if self.mm_per_pixel else (450.0 / w_cv) # Estimate default ~450mm total width
        
        if self.alignment_mode == "HKA":
            self.build_metrics_table() # Ensure 3-Pt headers are updated
            
            # Recalculate Right and Left leg parameters
            def calc_side_metrics(side):
                leg = self.landmarks_3pt[side]
                hip = (leg["hip"]["x"], leg["hip"]["y"])
                knee = (leg["knee"]["x"], leg["knee"]["y"])
                ankle = (leg["ankle"]["x"], leg["ankle"]["y"])
                
                vKH = (hip[0] - knee[0], hip[1] - knee[1])
                vKA = (ankle[0] - knee[0], ankle[1] - knee[1])
                hka_raw = get_vector_angle(vKH, vKA)
                
                # Determine Varus vs Valgus using Mechanical Axis Deviation from Hip-Ankle baseline
                dx = ankle[0] - hip[0]
                dy = ankle[1] - hip[1]
                denom = math.sqrt(dx**2 + dy**2)
                
                deviation = 0.0
                if denom > 0:
                    deviation = (dy * knee[0] - dx * knee[1] + ankle[0] * hip[1] - ankle[1] * hip[0]) / denom
                    
                is_valgus = False
                is_varus = False
                category = "NEUTRAL"
                
                if side == "right":
                    if deviation > 0.5:
                        category = "VALGUS"
                        is_valgus = True
                    elif deviation < -0.5:
                        category = "VARUS"
                        is_varus = True
                else:
                    if deviation < -0.5:
                        category = "VALGUS"
                        is_valgus = True
                    elif deviation > 0.5:
                        category = "VARUS"
                        is_varus = True
                        
                dev_degrees = abs(180.0 - hka_raw)
                display_hka = hka_raw
                if is_varus:
                    display_hka = 180.0 - dev_degrees
                elif is_valgus:
                    display_hka = 180.0 + dev_degrees
                    
                # Calculate Lengths
                fem_len = math.sqrt((hip[0] - knee[0])**2 + (hip[1] - knee[1])**2)
                tib_len = math.sqrt((knee[0] - ankle[0])**2 + (knee[1] - ankle[1])**2)
                tot_pixels = (fem_len + tib_len) / 100.0 * w_cv
                tot_mm = tot_pixels * scale_est
                
                return display_hka, category, tot_mm, dev_degrees

            r_hka, r_cat, r_len, r_dev = calc_side_metrics("right")
            l_hka, l_cat, l_len, l_dev = calc_side_metrics("left")
            
            # Update GUI table
            self.metric_rows["hka"][0].configure(text=f"{r_hka:.1f}°")
            self.metric_rows["hka"][1].configure(text=f"{l_hka:.1f}°")
            self.metric_rows["category"][0].configure(text=r_cat, foreground=ACCENT_RED if r_cat=="VARUS" else ACCENT_CYAN if r_cat=="VALGUS" else ACCENT_GREEN)
            self.metric_rows["category"][1].configure(text=l_cat, foreground=ACCENT_BLUE if l_cat=="VARUS" else ACCENT_CYAN if l_cat=="VALGUS" else ACCENT_GREEN)
            self.metric_rows["length"][0].configure(text=f"{r_len:.1f} mm")
            self.metric_rows["length"][1].configure(text=f"{l_len:.1f} mm")
            
            # Discrepancy
            lld = abs(r_len - l_len)
            self.metric_rows["lld"][0].configure(text=f"{lld:.1f} mm")
            self.metric_rows["lld"][1].configure(text="")
            
            # Live Clinical Observation Text
            obs = f"[CLINICAL DIAGNOSIS - HKA MODE]\n"
            obs += f"Right Leg Angle: {r_hka:.1f}° ({r_cat})\n"
            obs += f"Left Leg Angle: {l_hka:.1f}° ({l_cat})\n"
            obs += f"Limb Length Discrepancy: {lld:.1f} mm\n\n"
            obs += "Observation: "
            if r_cat == "NEUTRAL" and l_cat == "NEUTRAL":
                obs += "Limb biomechanics are physiological. Hip, knee, and ankle mechanical axes pass through the center joint spaces. Loading forces are normally distributed."
            else:
                obs += f"Abnormal loading detected. Recommended surgical simulation or physical therapy for bilateral alignment corrections."
                
            self.report_text.delete("1.0", "end")
            self.report_text.insert("1.0", obs)
            
            self.draw_dial_charts(r_hka, l_hka)
            
        else:
            # Detailed 13-Point Mode calculations
            p = self.landmarks_13pt
            r_kc_x = (p["r-lfc"]["x"] + p["r-mfc"]["x"]) / 2.0
            r_kc_y = (p["r-lfc"]["y"] + p["r-mfc"]["y"]) / 2.0
            r_tc_knee_x = (p["r-ltp"]["x"] + p["r-mtp"]["x"]) / 2.0
            r_tc_knee_y = (p["r-ltp"]["y"] + p["r-mtp"]["y"]) / 2.0
            
            l_kc_x = (p["l-lfc"]["x"] + p["l-mfc"]["x"]) / 2.0
            l_kc_y = (p["l-lfc"]["y"] + p["l-mfc"]["y"]) / 2.0
            l_tc_knee_x = (p["l-ltp"]["x"] + p["l-mtp"]["x"]) / 2.0
            l_tc_knee_y = (p["l-ltp"]["y"] + p["l-mtp"]["y"]) / 2.0

            # Vectors HKA
            r_vKH = (p["r-fhc"]["x"] - r_kc_x, p["r-fhc"]["y"] - r_kc_y)
            r_vKA = (p["r-tc"]["x"] - r_kc_x, p["r-tc"]["y"] - r_kc_y)
            r_hka_raw = get_vector_angle(r_vKH, r_vKA)

            l_vKH = (p["l-fhc"]["x"] - l_kc_x, p["l-fhc"]["y"] - l_kc_y)
            l_vKA = (p["l-tc"]["x"] - l_kc_x, p["l-tc"]["y"] - l_kc_y)
            l_hka_raw = get_vector_angle(l_vKH, l_vKA)

            # mLDFA (Anatomical lateral distal femur angle)
            r_vKFHC = (p["r-fhc"]["x"] - r_kc_x, p["r-fhc"]["y"] - r_kc_y)
            r_vKLFC = (p["r-lfc"]["x"] - r_kc_x, p["r-lfc"]["y"] - r_kc_y)
            r_mldfa = get_vector_angle(r_vKFHC, r_vKLFC)

            l_vKFHC = (p["l-fhc"]["x"] - l_kc_x, p["l-fhc"]["y"] - l_kc_y)
            l_vKLFC = (p["l-lfc"]["x"] - l_kc_x, p["l-lfc"]["y"] - l_kc_y)
            l_mldfa = get_vector_angle(l_vKFHC, l_vKLFC)

            # mMPTA (Mechanical medial proximal tibial angle)
            r_vKTC = (p["r-tc"]["x"] - r_tc_knee_x, p["r-tc"]["y"] - r_tc_knee_y)
            r_vKMTP = (p["r-mtp"]["x"] - r_tc_knee_x, p["r-mtp"]["y"] - r_tc_knee_y)
            r_mmpta = get_vector_angle(r_vKTC, r_vKMTP)

            l_vKTC = (p["l-tc"]["x"] - l_tc_knee_x, p["l-tc"]["y"] - l_tc_knee_y)
            l_vKMTP = (p["l-mtp"]["x"] - l_tc_knee_x, p["l-mtp"]["y"] - l_tc_knee_y)
            l_mmpta = get_vector_angle(l_vKTC, l_vKMTP)

            # JLCA (Joint Line Congruence Angle)
            r_vFem = (p["r-mfc"]["x"] - p["r-lfc"]["x"], p["r-mfc"]["y"] - p["r-lfc"]["y"])
            r_vTib = (p["r-mtp"]["x"] - p["r-ltp"]["x"], p["r-mtp"]["y"] - p["r-ltp"]["y"])
            r_jlca = get_vector_angle(r_vFem, r_vTib)

            l_vFem = (p["l-lfc"]["x"] - p["l-mfc"]["x"], p["l-lfc"]["y"] - p["l-mfc"]["y"])
            l_vTib = (p["l-ltp"]["x"] - p["l-mtp"]["x"], p["l-ltp"]["y"] - p["l-mtp"]["y"])
            l_jlca = get_vector_angle(l_vFem, l_vTib)

            # Femoral & Tibial Lengths in mm
            r_fem_px = math.sqrt((p["r-fhc"]["x"] - r_kc_x)**2 + (p["r-fhc"]["y"] - r_kc_y)**2) / 100.0 * w_cv
            r_tib_px = math.sqrt((p["r-tc"]["x"] - r_tc_knee_x)**2 + (p["r-tc"]["y"] - r_tc_knee_y)**2) / 100.0 * w_cv
            r_len_mm = (r_fem_px + r_tib_px) * scale_est

            l_fem_px = math.sqrt((p["l-fhc"]["x"] - l_kc_x)**2 + (p["l-fhc"]["y"] - l_kc_y)**2) / 100.0 * w_cv
            l_tib_px = math.sqrt((p["l-tc"]["x"] - l_tc_knee_x)**2 + (p["l-tc"]["y"] - l_tc_knee_y)**2) / 100.0 * w_cv
            l_len_mm = (l_fem_px + l_tib_px) * scale_est
            lld = abs(r_len_mm - l_len_mm)

            # Assign categories
            r_cat = "VARUS" if r_hka_raw < 179.0 else "VALGUS" if r_hka_raw > 181.0 else "NEUTRAL"
            l_cat = "VARUS" if l_hka_raw < 179.0 else "VALGUS" if l_hka_raw > 181.0 else "NEUTRAL"

            # Update GUI table
            self.metric_rows["hka"][0].configure(text=f"{r_hka_raw:.1f}°")
            self.metric_rows["hka"][1].configure(text=f"{l_hka_raw:.1f}°")
            self.metric_rows["category"][0].configure(text=r_cat, foreground=ACCENT_RED if r_cat=="VARUS" else ACCENT_CYAN if r_cat=="VALGUS" else ACCENT_GREEN)
            self.metric_rows["category"][1].configure(text=l_cat, foreground=ACCENT_BLUE if l_cat=="VARUS" else ACCENT_CYAN if l_cat=="VALGUS" else ACCENT_GREEN)
            self.metric_rows["mldfa"][0].configure(text=f"{r_mldfa:.1f}°")
            self.metric_rows["mldfa"][1].configure(text=f"{l_mldfa:.1f}°")
            self.metric_rows["mmpta"][0].configure(text=f"{r_mmpta:.1f}°")
            self.metric_rows["mmpta"][1].configure(text=f"{l_mmpta:.1f}°")
            self.metric_rows["jlca"][0].configure(text=f"{r_jlca:.1f}°")
            self.metric_rows["jlca"][1].configure(text=f"{l_jlca:.1f}°")
            self.metric_rows["length"][0].configure(text=f"{r_len_mm:.1f} mm")
            self.metric_rows["length"][1].configure(text=f"{l_len_mm:.1f} mm")
            self.metric_rows["lld"][0].configure(text=f"{lld:.1f} mm")
            self.metric_rows["lld"][1].configure(text="")

            # Clinical Observation
            obs = f"[CLINICAL DIAGNOSIS - DETAILED 13-POINT]\n"
            obs += f"Right mLDFA: {r_mldfa:.1f}° (Normal 88°)\n"
            obs += f"Left mLDFA: {l_mldfa:.1f}°\n"
            obs += f"Right mMPTA: {r_mmpta:.1f}° (Normal 87°)\n"
            obs += f"Left mMPTA: {l_mmpta:.1f}°\n"
            obs += f"JLCA Alignment: R={r_jlca:.1f}°, L={l_jlca:.1f}°\n"
            obs += f"Limb Length Discrepancy: {lld:.1f} mm\n\n"
            obs += f"Radiology Assessment: "
            if abs(r_mldfa - 88.0) > 3.0 or abs(l_mldfa - 88.0) > 3.0:
                obs += "Distal femur joint line tilt detected. Recommended total knee replacement modeling."
            else:
                obs += "Joint lines are in acceptable clinical ranges."
                
            self.report_text.delete("1.0", "end")
            self.report_text.insert("1.0", obs)

            self.draw_dial_charts(r_hka_raw, l_hka_raw)

    # ----------------------------------------------------------------------
    # Event Handlers: Presets Loading, Uploads, Calibration
    # ----------------------------------------------------------------------
    def load_preset_case(self, case_id):
        self.active_case = case_id
        alignment = "neutral"
        if case_id == "case-varus": alignment = "varus"
        elif case_id == "case-valgus": alignment = "valgus"
        
        # Draw new synthetic template scanogram
        self.original_pil_image = make_synthetic_scanogram_img(600, 900, alignment)
        self.current_pil_image = self.original_pil_image.copy()
        
        # Reset defaults matching the preset
        self.landmarks_3pt = json.loads(json.dumps(DEFAULT_LANDMARKS_3PT))
        self.landmarks_13pt = json.loads(json.dumps(DEFAULT_LANDMARKS_13PT))
        
        # Symmetrize shifts to match the visual skeletal template
        if case_id == "case-varus":
            self.landmarks_3pt["left"]["knee"]["x"] = 74.0
            self.landmarks_3pt["right"]["knee"]["x"] = 26.0
            self.landmarks_13pt["l-lfc"]["x"] = 77.1
            self.landmarks_13pt["l-mfc"]["x"] = 70.9
            self.landmarks_13pt["l-ltp"]["x"] = 77.0
            self.landmarks_13pt["l-mtp"]["x"] = 71.0
            self.landmarks_13pt["r-lfc"]["x"] = 22.9
            self.landmarks_13pt["r-mfc"]["x"] = 29.1
            self.landmarks_13pt["r-ltp"]["x"] = 23.0
            self.landmarks_13pt["r-mtp"]["x"] = 29.0
        elif case_id == "case-valgus":
            self.landmarks_3pt["left"]["knee"]["x"] = 59.0
            self.landmarks_3pt["right"]["knee"]["x"] = 41.0
            self.landmarks_13pt["l-lfc"]["x"] = 62.1
            self.landmarks_13pt["l-mfc"]["x"] = 55.9
            self.landmarks_13pt["l-ltp"]["x"] = 62.0
            self.landmarks_13pt["l-mtp"]["x"] = 56.0
            self.landmarks_13pt["r-lfc"]["x"] = 37.9
            self.landmarks_13pt["r-mfc"]["x"] = 44.1
            self.landmarks_13pt["r-ltp"]["x"] = 38.0
            self.landmarks_13pt["r-mtp"]["x"] = 44.0

        self.file_status_lbl.configure(text=f"Using: {case_id.replace('case-', '').title()} Preset", foreground=ACCENT_GREEN)
        self.update_canvas_display()
        self.recalculate_clinical_alignment()

    def upload_custom_image(self):
        file_path = filedialog.askopenfilename(filetypes=[("Image Files", "*.png;*.jpg;*.jpeg;*.webp")])
        if not file_path:
            return
            
        try:
            loaded_img = Image.open(file_path)
            self.original_pil_image = loaded_img.convert("RGB")
            self.current_pil_image = self.original_pil_image.copy()
            self.active_case = "custom"
            
            # Reset landmarks to standard centers
            self.landmarks_3pt = json.loads(json.dumps(DEFAULT_LANDMARKS_3PT))
            self.landmarks_13pt = json.loads(json.dumps(DEFAULT_LANDMARKS_13PT))
            
            file_name = os.path.basename(file_path)
            self.file_status_lbl.configure(text=f"Loaded: {file_name[:22]}...", foreground=ACCENT_CYAN)
            self.update_canvas_display()
            self.recalculate_clinical_alignment()
        except Exception as e:
            messagebox.showerror("Image Load Error", f"Failed to load image file:\n{str(e)}")

    def toggle_alignment_mode(self):
        self.alignment_mode = self.mode_var.get()
        self.update_canvas_display()
        self.recalculate_clinical_alignment()

    def update_canvas_display_toggle(self):
        # We can redraw the underlying synthetic bones if preset is active
        if self.active_case != "custom" and self.original_pil_image:
            alignment = "neutral"
            if self.active_case == "case-varus": alignment = "varus"
            elif self.active_case == "case-valgus": alignment = "valgus"
            
            # Create a fresh copy
            img = Image.new("RGB", (600, 900), color="#090d16")
            draw = ImageDraw.Draw(img)
            
            # Conditional draw
            if self.bones_toggle_var.get():
                draw_skeleton(draw, 600, 900, alignment)
            else:
                # Blank dark room with grid
                draw.rectangle([0, 0, 600, 900], fill="#090d16")
                if self.grid_toggle_var.get():
                    for x in range(0, 600, 40):
                        draw.line([x, 0, x, 900], fill="#111827", width=1)
                    for y in range(0, 900, 40):
                        draw.line([0, y, 600, y], fill="#111827", width=1)
                        
            self.current_pil_image = img.filter(ImageFilter.GaussianBlur(1.2))
        self.update_canvas_display()

    def update_canvas_display(self, *args):
        self.update_canvas_display_toggle()

    def reset_current_points(self):
        self.landmarks_3pt = json.loads(json.dumps(DEFAULT_LANDMARKS_3PT))
        self.landmarks_13pt = json.loads(json.dumps(DEFAULT_LANDMARKS_13PT))
        self.calibration_pts = []
        self.mm_per_pixel = None
        self.calib_status_lbl.configure(text="Calibration: Inactive", foreground=TEXT_MUTED)
        self.update_canvas_display()
        self.recalculate_clinical_alignment()

    # ----------------------------------------------------------------------
    # Calibration Handler
    # ----------------------------------------------------------------------
    def toggle_calibration_mode(self):
        if self.calibration_active:
            self.calibration_active = False
            self.btn_calib.configure(text="📏 Start Calibration")
            self.calib_status_lbl.configure(text="Calibration cancelled.", foreground=TEXT_MUTED)
            self.calibration_pts = []
        else:
            try:
                length = float(self.calib_input_entry.get())
                if length <= 0: raise ValueError
                self.calibration_length_mm = length
            except ValueError:
                messagebox.showerror("Input Error", "Please enter a valid physical length in mm.")
                return
                
            self.calibration_active = True
            self.calibration_pts = []
            self.btn_calib.configure(text="❌ Cancel Calibration")
            self.calib_status_lbl.configure(text="Click Point 1 on ruler scale...", foreground=ACCENT_MAGENTA)
        self.update_canvas_display()

    def perform_calibration(self):
        self.calibration_active = False
        self.btn_calib.configure(text="📏 Start Calibration")
        
        # Calculate pixel distance
        w_cv = self.canvas.winfo_width()
        h_cv = self.canvas.winfo_height()
        
        p1_x = (self.calibration_pts[0][0] / 100.0) * w_cv
        p1_y = (self.calibration_pts[0][1] / 100.0) * h_cv
        p2_x = (self.calibration_pts[1][0] / 100.0) * w_cv
        p2_y = (self.calibration_pts[1][1] / 100.0) * h_cv
        
        pix_dist = math.sqrt((p2_x - p1_x)**2 + (p2_y - p1_y)**2)
        if pix_dist > 0:
            self.mm_per_pixel = self.calibration_length_mm / pix_dist
            self.calib_status_lbl.configure(text=f"Scale: {self.mm_per_pixel:.3f} mm/px", foreground=ACCENT_GREEN)
        else:
            self.mm_per_pixel = None
            self.calib_status_lbl.configure(text="Calibration Failed.", foreground=ACCENT_RED)
            
        self.calibration_pts = []
        self.update_canvas_display()
        self.recalculate_clinical_alignment()

    # ----------------------------------------------------------------------
    # Exports: Saving Images & Radiological Reports
    # ----------------------------------------------------------------------
    def save_annotated_image(self):
        file_path = filedialog.asksaveasfilename(defaultextension=".png", filetypes=[("PNG Image", "*.png"), ("JPEG Image", "*.jpg")])
        if not file_path:
            return
            
        try:
            # We recreate the drawn canvas at original size to preserve high fidelity
            img = self.current_pil_image.copy()
            draw = ImageDraw.Draw(img)
            img_w, img_h = img.size
            
            # Overlay axes
            if self.axes_toggle_var.get():
                if self.alignment_mode == "HKA":
                    for leg in ["left", "right"]:
                        leg_pts = self.landmarks_3pt[leg]
                        h_x, h_y = (leg_pts["hip"]["x"]/100.0)*img_w, (leg_pts["hip"]["y"]/100.0)*img_h
                        k_x, k_y = (leg_pts["knee"]["x"]/100.0)*img_w, (leg_pts["knee"]["y"]/100.0)*img_h
                        a_x, a_y = (leg_pts["ankle"]["x"]/100.0)*img_w, (leg_pts["ankle"]["y"]/100.0)*img_h
                        color = ACCENT_RED if leg == "right" else ACCENT_BLUE
                        draw.line([h_x, h_y, k_x, k_y], fill=color, width=3)
                        draw.line([k_x, k_y, a_x, a_y], fill=color, width=3)
                else:
                    p = self.landmarks_13pt
                    r_kc_x = ((p["r-lfc"]["x"] + p["r-mfc"]["x"]) / 2.0 / 100.0) * img_w
                    r_kc_y = ((p["r-lfc"]["y"] + p["r-mfc"]["y"]) / 2.0 / 100.0) * img_h
                    r_tc_knee_x = ((p["r-ltp"]["x"] + p["r-mtp"]["x"]) / 2.0 / 100.0) * img_w
                    r_tc_knee_y = ((p["r-ltp"]["y"] + p["r-mtp"]["y"]) / 2.0 / 100.0) * img_h
                    
                    l_kc_x = ((p["l-lfc"]["x"] + p["l-mfc"]["x"]) / 2.0 / 100.0) * img_w
                    l_kc_y = ((p["l-lfc"]["y"] + p["l-mfc"]["y"]) / 2.0 / 100.0) * img_h
                    l_tc_knee_x = ((p["l-ltp"]["x"] + p["l-mtp"]["x"]) / 2.0 / 100.0) * img_w
                    l_tc_knee_y = ((p["l-ltp"]["y"] + p["l-mtp"]["y"]) / 2.0 / 100.0) * img_h

                    draw.line([(p["r-fhc"]["x"]/100.0)*img_w, (p["r-fhc"]["y"]/100.0)*img_h, r_kc_x, r_kc_y], fill=ACCENT_RED, width=3)
                    draw.line([r_tc_knee_x, r_tc_knee_y, (p["r-tc"]["x"]/100.0)*img_w, (p["r-tc"]["y"]/100.0)*img_h], fill=ACCENT_RED, width=3)
                    
                    draw.line([(p["l-fhc"]["x"]/100.0)*img_w, (p["l-fhc"]["y"]/100.0)*img_h, l_kc_x, l_kc_y], fill=ACCENT_BLUE, width=3)
                    draw.line([l_tc_knee_x, l_tc_knee_y, (p["l-tc"]["x"]/100.0)*img_w, (p["l-tc"]["y"]/100.0)*img_h], fill=ACCENT_BLUE, width=3)

            # Draw Handles
            if self.alignment_mode == "HKA":
                for leg in ["left", "right"]:
                    for p_id, p_info in self.landmarks_3pt[leg].items():
                        px, py = (p_info["x"]/100.0)*img_w, (p_info["y"]/100.0)*img_h
                        draw.ellipse([px-10, py-10, px+10, py+10], fill=p_info["color"], outline=TEXT_WHITE, width=2)
                        draw.text((px-15, py-25), p_info["label"], fill=TEXT_WHITE)
            else:
                for p_id, p_info in self.landmarks_13pt.items():
                    px, py = (p_info["x"]/100.0)*img_w, (p_info["y"]/100.0)*img_h
                    draw.ellipse([px-8, py-8, px+8, py+8], fill=p_info["color"], outline=TEXT_WHITE, width=2)
                    draw.text((px-15, py-22), p_info["label"], fill=TEXT_WHITE)

            img.save(file_path)
            messagebox.showinfo("Export Successful", "Annotated scanogram image saved successfully!")
        except Exception as e:
            messagebox.showerror("Save Error", f"Failed to save image:\n{str(e)}")

    def save_report_text(self):
        file_path = filedialog.asksaveasfilename(defaultextension=".txt", filetypes=[("Text Report", "*.txt")])
        if not file_path:
            return
        try:
            report_content = self.report_text.get("1.0", "end")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(report_content)
            messagebox.showinfo("Export Successful", "Clinical radiological report saved successfully!")
        except Exception as e:
            messagebox.showerror("Save Error", f"Failed to save report:\n{str(e)}")

    # ----------------------------------------------------------------------
    # ONLINE GEMINI AI LANDMARK DETECTION MODULE
    # ----------------------------------------------------------------------
    def run_online_ai_detection(self):
        api_key = self.api_key_entry.get().strip()
        if not api_key:
            messagebox.showerror("Key Missing", "A Google Gemini API key is required for automated AI Landmark Detection.\nTo configure, paste your key in the 'Gemini Key' entry box.")
            return

        # Prepare base64 image data to transfer
        self.status_log.configure(text="AI WORKSPACE: EXPORTING IMAGE BUFFER...", foreground=ACCENT_CYAN)
        self.btn_ai_detect.configure(state="disabled", text="⚡ Processing AI Plot...")
        self.root.update_idletasks()

        # Run in a safe try block to prevent main thread GUI freeze
        try:
            # Compress / convert the active image into JPG format
            buf = io.BytesIO() if 'io' in sys.modules else None
            if not buf:
                import io
                buf = io.BytesIO()
                
            self.current_pil_image.save(buf, format="JPEG", quality=85)
            img_bytes = buf.getvalue()
            
            # Use Google GenAI SDK
            try:
                from google import genai
                from google.genai import types
            except ImportError:
                messagebox.showerror("Package Missing", "The 'google-genai' package is not installed.\nPlease run setup.bat again or install manually:\npip install google-genai")
                self.btn_ai_detect.configure(state="normal", text="✨ Run AI Scanogram Plotter")
                self.status_log.configure(text="AI ERROR: PACKAGE MISSING", foreground=ACCENT_RED)
                return

            self.status_log.configure(text="AI WORKSPACE: SENDING REQUEST TO GEMINI...", foreground=ACCENT_CYAN)
            self.root.update_idletasks()

            client = genai.Client(api_key=api_key)
            prompt = (
                "Locate mechanical axis landmark coordinates for Lower Limb alignment (HKA plot).\n"
                "Return the exact Hip Center, Knee Center, and Ankle Center coordinates on both legs as percentages (0.0 to 1.0).\n"
                "Formulate your response strictly in JSON matching the specified schema."
            )

            # API Call
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=[
                    types.Part.from_bytes(
                        data=img_bytes,
                        mime_type="image/jpeg",
                    ),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "leftLeg": types.Schema(
                                type=types.Type.OBJECT,
                                properties={
                                    "detected": types.Schema(type=types.Type.BOOLEAN),
                                    "hip": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    ),
                                    "knee": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    ),
                                    "ankle": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    )
                                },
                                required=["detected", "hip", "knee", "ankle"]
                            ),
                            "rightLeg": types.Schema(
                                type=types.Type.OBJECT,
                                properties={
                                    "detected": types.Schema(type=types.Type.BOOLEAN),
                                    "hip": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    ),
                                    "knee": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    ),
                                    "ankle": types.Schema(
                                        type=types.Type.OBJECT,
                                        properties={
                                            "x": types.Schema(type=types.Type.NUMBER),
                                            "y": types.Schema(type=types.Type.NUMBER),
                                        },
                                        required=["x", "y"]
                                    )
                                },
                                required=["detected", "hip", "knee", "ankle"]
                            ),
                        },
                        required=["leftLeg", "rightLeg"]
                    )
                )
            )

            if not response.text:
                raise ValueError("Empty response received from API.")
                
            res_data = json.loads(response.text)
            
            # Map back to 3-point landmarks
            if res_data.get("leftLeg", {}).get("detected", False):
                ll = res_data["leftLeg"]
                self.landmarks_3pt["left"]["hip"]["x"] = ll["hip"]["x"] * 100.0
                self.landmarks_3pt["left"]["hip"]["y"] = ll["hip"]["y"] * 100.0
                self.landmarks_3pt["left"]["knee"]["x"] = ll["knee"]["x"] * 100.0
                self.landmarks_3pt["left"]["knee"]["y"] = ll["knee"]["y"] * 100.0
                self.landmarks_3pt["left"]["ankle"]["x"] = ll["ankle"]["x"] * 100.0
                self.landmarks_3pt["left"]["ankle"]["y"] = ll["ankle"]["y"] * 100.0

            if res_data.get("rightLeg", {}).get("detected", False):
                rl = res_data["rightLeg"]
                self.landmarks_3pt["right"]["hip"]["x"] = rl["hip"]["x"] * 100.0
                self.landmarks_3pt["right"]["hip"]["y"] = rl["hip"]["y"] * 100.0
                self.landmarks_3pt["right"]["knee"]["x"] = rl["knee"]["x"] * 100.0
                self.landmarks_3pt["right"]["knee"]["y"] = rl["knee"]["y"] * 100.0
                self.landmarks_3pt["right"]["ankle"]["x"] = rl["ankle"]["x"] * 100.0
                self.landmarks_3pt["right"]["ankle"]["y"] = rl["ankle"]["y"] * 100.0
                
            # If 13-point detailed mode is active, propagate centers to 13-point landmark positions as well
            if self.alignment_mode == "FULL":
                # Symmetrize detailed condyles based on FHC and TC
                r_hip = self.landmarks_3pt["right"]["hip"]
                r_knee = self.landmarks_3pt["right"]["knee"]
                r_ankle = self.landmarks_3pt["right"]["ankle"]
                l_hip = self.landmarks_3pt["left"]["hip"]
                l_knee = self.landmarks_3pt["left"]["knee"]
                l_ankle = self.landmarks_3pt["left"]["ankle"]
                
                self.landmarks_13pt["r-fhc"]["x"], self.landmarks_13pt["r-fhc"]["y"] = r_hip["x"], r_hip["y"]
                self.landmarks_13pt["r-tc"]["x"], self.landmarks_13pt["r-tc"]["y"] = r_ankle["x"], r_ankle["y"]
                self.landmarks_13pt["r-lfc"]["x"], self.landmarks_13pt["r-lfc"]["y"] = r_knee["x"] - 3.1, r_knee["y"] - 1.2
                self.landmarks_13pt["r-mfc"]["x"], self.landmarks_13pt["r-mfc"]["y"] = r_knee["x"] + 3.1, r_knee["y"] - 1.2
                self.landmarks_13pt["r-ltp"]["x"], self.landmarks_13pt["r-ltp"]["y"] = r_knee["x"] - 3.0, r_knee["y"] + 1.2
                self.landmarks_13pt["r-mtp"]["x"], self.landmarks_13pt["r-mtp"]["y"] = r_knee["x"] + 3.0, r_knee["y"] + 1.2
                
                self.landmarks_13pt["l-fhc"]["x"], self.landmarks_13pt["l-fhc"]["y"] = l_hip["x"], l_hip["y"]
                self.landmarks_13pt["l-tc"]["x"], self.landmarks_13pt["l-tc"]["y"] = l_ankle["x"], l_ankle["y"]
                self.landmarks_13pt["l-mfc"]["x"], self.landmarks_13pt["l-mfc"]["y"] = l_knee["x"] - 3.1, l_knee["y"] - 1.2
                self.landmarks_13pt["l-lfc"]["x"], self.landmarks_13pt["l-lfc"]["y"] = l_knee["x"] + 3.1, l_knee["y"] - 1.2
                self.landmarks_13pt["l-mtp"]["x"], self.landmarks_13pt["l-mtp"]["y"] = l_knee["x"] - 3.0, l_knee["y"] + 1.2
                self.landmarks_13pt["l-ltp"]["x"], self.landmarks_13pt["l-ltp"]["y"] = l_knee["x"] + 3.0, l_knee["y"] + 1.2

            self.status_log.configure(text="AI WORKSPACE: ALIGNMENT UPDATED SUCCESSFULLY", foreground=ACCENT_GREEN)
            self.update_canvas_display()
            self.recalculate_clinical_alignment()
            messagebox.showinfo("AI Detection Complete", "Gemini automated clinical landmark plotting finished successfully!")

        except Exception as e:
            self.status_log.configure(text="AI ERROR: PROCESSING FAILED", foreground=ACCENT_RED)
            messagebox.showerror("AI Plotter Error", f"An error occurred during AI analysis:\n{str(e)}")
            
        self.btn_ai_detect.configure(state="normal", text="✨ Run AI Scanogram Plotter")

# Main Execution Trigger
if __name__ == "__main__":
    import io
    root = tk.Tk()
    app = LowerLimbAnalyzerApp(root)
    root.mainloop()
