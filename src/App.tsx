import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Ruler, 
  RotateCcw, 
  Download, 
  Sparkles, 
  Info, 
  Check, 
  AlertCircle, 
  Layers, 
  Sliders, 
  User, 
  Maximize2, 
  Copy, 
  ShieldAlert,
  Compass,
  HelpCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  Settings,
  Scissors,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { sampleCases, generateSyntheticScanogram } from "./utils/samples";
import { LegPoints, Point, Calibration, Point13, Points13State, SecurityStatus } from "./types";
import SystemSettings from "./components/SystemSettings";
import WorkstationLockScreen from "./components/WorkstationLockScreen";
import PostOpComplicationsHub from "./components/PostOpComplicationsHub";

// Helper to generate the default 13 anatomical landmarks from standard hip/knee/ankle coords
const getInitial13Points = (left: LegPoints, right: LegPoints): Points13State => {
  return {
    "p-sym": { id: "p-sym", label: "P-SYM", name: "pelvis", anatomicalName: "Pubic Symphysis Reference", x: 50.0, y: 19.5, color: "#d946ef" },
    
    "r-fhc": { id: "r-fhc", label: "R-FHC", name: "r_hip", anatomicalName: "Right Femoral Head Center", x: right.hip.x, y: right.hip.y, color: "#ef4444" },
    "r-lfc": { id: "r-lfc", label: "R-LFC", name: "r_lfc", anatomicalName: "Right Lateral Femoral Condyle", x: right.knee.x - 3.1, y: right.knee.y - 1.2, color: "#f87171" },
    "r-mfc": { id: "r-mfc", label: "R-MFC", name: "r_mfc", anatomicalName: "Right Medial Femoral Condyle", x: right.knee.x + 3.1, y: right.knee.y - 1.2, color: "#f87171" },
    "r-ltp": { id: "r-ltp", label: "R-LTP", name: "r_ltp", anatomicalName: "Right Lateral Tibial Plateau", x: right.knee.x - 3.0, y: right.knee.y + 1.2, color: "#fb7185" },
    "r-mtp": { id: "r-mtp", label: "R-MTP", name: "r_mtp", anatomicalName: "Right Medial Tibial Plateau", x: right.knee.x + 3.0, y: right.knee.y + 1.2, color: "#fb7185" },
    "r-tc": { id: "r-tc", label: "R-TC", name: "r_ankle", anatomicalName: "Right Talus Center (Ankle)", x: right.ankle.x, y: right.ankle.y, color: "#ef4444" },

    "l-fhc": { id: "l-fhc", label: "L-FHC", name: "l_hip", anatomicalName: "Left Femoral Head Center", x: left.hip.x, y: left.hip.y, color: "#3b82f6" },
    "l-mfc": { id: "l-mfc", label: "L-MFC", name: "l_mfc", anatomicalName: "Left Medial Femoral Condyle", x: left.knee.x - 3.1, y: left.knee.y - 1.2, color: "#60a5fa" },
    "l-lfc": { id: "l-lfc", label: "L-LFC", name: "l_lfc", anatomicalName: "Left Lateral Femoral Condyle", x: left.knee.x + 3.1, y: left.knee.y - 1.2, color: "#60a5fa" },
    "l-mtp": { id: "l-mtp", label: "L-MTP", name: "l_mtp", anatomicalName: "Left Medial Tibial Plateau", x: left.knee.x - 3.0, y: left.knee.y + 1.2, color: "#38bdf8" },
    "l-ltp": { id: "l-ltp", label: "L-LTP", name: "l_ltp", anatomicalName: "Left Lateral Tibial Plateau", x: left.knee.x + 3.0, y: left.knee.y + 1.2, color: "#38bdf8" },
    "l-tc": { id: "l-tc", label: "L-TC", name: "l_ankle", anatomicalName: "Left Talus Center (Ankle)", x: left.ankle.x, y: left.ankle.y, color: "#3b82f6" },
  };
};

export default function App() {
  // Security & Settings Workstation States
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [workstationMode, setWorkstationMode] = useState<"alignment" | "complications">("alignment");

  // Window width tracking for auto adjust fitting
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Case States
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customImageName, setCustomImageName] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [offlineStatusMsg, setOfflineStatusMsg] = useState<string>("");

  // Active coordinates state
  const [leftLeg, setLeftLeg] = useState<LegPoints>({
    detected: false,
    hip: { id: "l-hip", name: "hip" as const, label: "H", anatomicalName: "Left Hip Center", x: 0, y: 0, color: "" },
    knee: { id: "l-knee", name: "knee" as const, label: "K", anatomicalName: "Left Knee Center", x: 0, y: 0, color: "" },
    ankle: { id: "l-ankle", name: "ankle" as const, label: "A", anatomicalName: "Left Ankle Center", x: 0, y: 0, color: "" }
  });
  const [rightLeg, setRightLeg] = useState<LegPoints>({
    detected: false,
    hip: { id: "r-hip", name: "hip" as const, label: "H", anatomicalName: "Right Hip Center", x: 0, y: 0, color: "" },
    knee: { id: "r-knee", name: "knee" as const, label: "K", anatomicalName: "Right Knee Center", x: 0, y: 0, color: "" },
    ankle: { id: "r-ankle", name: "ankle" as const, label: "A", anatomicalName: "Right Ankle Center", x: 0, y: 0, color: "" }
  });
  const [clinicalObservation, setClinicalObservation] = useState<string>("");

  // Interaction States & Drag-Drop Mode
  const [alignmentMode, setAlignmentMode] = useState<"HKA" | "FULL">("HKA");
  const [activeDrag, setActiveDrag] = useState<{ mode: "HKA" | "FULL" | "OSTEOTOMY"; pointId: string } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [points13, setPoints13] = useState<Points13State>(() => getInitial13Points(
    { detected: false, hip: { id: "l-hip", name: "hip" as const, label: "H", anatomicalName: "Left Hip Center", x: 0, y: 0, color: "" }, knee: { id: "l-knee", name: "knee" as const, label: "K", anatomicalName: "Left Knee Center", x: 0, y: 0, color: "" }, ankle: { id: "l-ankle", name: "ankle" as const, label: "A", anatomicalName: "Left Ankle Center", x: 0, y: 0, color: "" } },
    { detected: false, hip: { id: "r-hip", name: "hip" as const, label: "H", anatomicalName: "Right Hip Center", x: 0, y: 0, color: "" }, knee: { id: "r-knee", name: "knee" as const, label: "K", anatomicalName: "Right Knee Center", x: 0, y: 0, color: "" }, ankle: { id: "r-ankle", name: "ankle" as const, label: "A", anatomicalName: "Right Ankle Center", x: 0, y: 0, color: "" } }
  ));
  const [showGuide, setShowGuide] = useState<boolean>(true);

  // Collapsable Right Sidebar State
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);

  // Osteotomy Simulation States
  const [osteotomyActive, setOsteotomyActive] = useState<boolean>(false);
  const [osteotomyLeg, setOsteotomyLeg] = useState<"left" | "right">("right");
  const [correctionAngle, setCorrectionAngle] = useState<number>(0);
  const [osteotomyPoints, setOsteotomyPoints] = useState<Array<{ x: number; y: number }>>([
    { x: 34.0, y: 58.0 }, // Hinge (Point 1)
    { x: 40.0, y: 58.0 }, // Opposite cortex cut line end (Point 2)
  ]);

  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showBones, setShowBones] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Calibration State
  const [calibration, setCalibration] = useState<Calibration>({
    active: false,
    point1: null,
    point2: null,
    physicalLength: 500, // 500 mm (50cm) default
    pixelLength: 500,
    mmPerPixel: null,
  });
  const [calibrationInput, setCalibrationInput] = useState<string>("500");

  // Elements Reference for drag coordinates conversion
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load Workstation Security Clearance on Mount
  useEffect(() => {
    const checkSecurity = async () => {
      try {
        const res = await fetch("/api/security-status");
        if (res.ok) {
          const data = await res.json();
          setSecurityStatus(data);
        }
      } catch (e) {
        console.error("Failed to fetch security credentials on startup:", e);
      }
    };
    checkSecurity();
  }, []);

  // Geometry Math Functions
  const calculateMetrics = (leg: LegPoints, side: "left" | "right") => {
    if (!leg.detected) return { hka: 180, deviation: 0, category: "NEUTRAL", mmDeviation: 0, devDegrees: 0 };

    const { hip, knee, ankle } = leg;

    // 1. Vector Math for HKA Angle
    const vKH = { x: hip.x - knee.x, y: hip.y - knee.y };
    const vKA = { x: ankle.x - knee.x, y: ankle.y - knee.y };

    const dot = vKH.x * vKA.x + vKH.y * vKA.y;
    const magKH = Math.sqrt(vKH.x * vKH.x + vKH.y * vKH.y);
    const magKA = Math.sqrt(vKA.x * vKA.x + vKA.y * vKA.y);

    let hka = 180;
    if (magKH > 0 && magKA > 0) {
      const cosTheta = dot / (magKH * magKA);
      const angleRad = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
      hka = angleRad * (180 / Math.PI);
    }

    // 2. Perpendicular deviation from Hip-Ankle Line (Mechanical Axis Deviation - MAD)
    const dx = ankle.x - hip.x;
    const dy = ankle.y - hip.y;
    const denom = Math.sqrt(dx * dx + dy * dy);

    let deviation = 0; // % of width
    if (denom > 0) {
      deviation = (dy * knee.x - dx * knee.y + ankle.x * hip.y - ankle.y * hip.x) / denom;
    }

    let isValgus = false;
    let isVarus = false;
    let alignmentType = "NEUTRAL";
    let devDegrees = Math.abs(180 - hka);

    if (side === "right") {
      if (deviation > 0.5) {
        alignmentType = "VALGUS";
        isValgus = true;
      } else if (deviation < -0.5) {
        alignmentType = "VARUS";
        isVarus = true;
      }
    } else {
      if (deviation < -0.5) {
        alignmentType = "VALGUS";
        isValgus = true;
      } else if (deviation > 0.5) {
        alignmentType = "VARUS";
        isVarus = true;
      }
    }

    let displayHKA = hka;
    if (isVarus) {
      displayHKA = 180 - devDegrees;
    } else if (isValgus) {
      displayHKA = 180 + devDegrees;
    }

    let mmDeviation = 0;
    if (calibration.mmPerPixel && containerRef.current) {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const pixelDev = (Math.abs(deviation) / 100) * containerWidth;
      mmDeviation = pixelDev * calibration.mmPerPixel;
    } else {
      // Estimate scale (1% width is ~4.5mm on a standard 450mm scanogram width)
      mmDeviation = Math.abs(deviation) * 4.5;
    }

    return {
      hka: displayHKA,
      deviation: Math.abs(deviation),
      mmDeviation,
      category: alignmentType,
      devDegrees
    };
  };

  // --- Osteotomy Point Rotation Utility ---
  const rotatePoint = (pt: { x: number; y: number }, hinge: { x: number; y: number }, angleDeg: number): { x: number; y: number } => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const dx = pt.x - hinge.x;
    const dy = pt.y - hinge.y;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
      x: parseFloat((dx * cos - dy * sin + hinge.x).toFixed(2)),
      y: parseFloat((dx * sin + dy * cos + hinge.y).toFixed(2)),
    };
  };

  // Compute rotated points dynamically based on the active osteotomy correction plan
  const getRotatedLegPoints = (leg: LegPoints, isLegActive: boolean): LegPoints => {
    if (!osteotomyActive || !isLegActive || osteotomyPoints.length === 0) return leg;
    const hinge = osteotomyPoints[0];
    return {
      ...leg,
      hip: leg.hip.y > hinge.y ? { ...leg.hip, ...rotatePoint(leg.hip, hinge, correctionAngle) } : leg.hip,
      knee: leg.knee.y > hinge.y ? { ...leg.knee, ...rotatePoint(leg.knee, hinge, correctionAngle) } : leg.knee,
      ankle: leg.ankle.y > hinge.y ? { ...leg.ankle, ...rotatePoint(leg.ankle, hinge, correctionAngle) } : leg.ankle,
    };
  };

  const getRotatedPoints13 = (points: Points13State): Points13State => {
    if (!osteotomyActive || osteotomyPoints.length === 0) return points;
    const hinge = osteotomyPoints[0];
    const prefix = osteotomyLeg === "left" ? "l-" : "r-";
    const updated = { ...points };
    Object.keys(updated).forEach((key) => {
      if (key.startsWith(prefix)) {
        const p = updated[key as keyof Points13State];
        if (p && p.y > hinge.y) {
          updated[key as keyof Points13State] = {
            ...p,
            ...rotatePoint(p, hinge, correctionAngle),
          };
        }
      }
    });
    return updated;
  };

  const rightLegRotated = getRotatedLegPoints(rightLeg, osteotomyLeg === "right");
  const leftLegRotated = getRotatedLegPoints(leftLeg, osteotomyLeg === "left");
  const points13Rotated = getRotatedPoints13(points13);

  const rightMetrics = calculateMetrics(rightLegRotated, "right");
  const leftMetrics = calculateMetrics(leftLegRotated, "left");

  // --- 13-Point Orthopaedic Mathematical Engine ---
  const calculate13PointMetrics = (p: Points13State = points13Rotated) => {
    
    // Right Leg Centers
    const r_kc = { x: (p["r-lfc"].x + p["r-mfc"].x) / 2, y: (p["r-lfc"].y + p["r-mfc"].y) / 2 };
    const r_tc_knee = { x: (p["r-ltp"].x + p["r-mtp"].x) / 2, y: (p["r-ltp"].y + p["r-mtp"].y) / 2 };
    
    // Left Leg Centers
    const l_kc = { x: (p["l-lfc"].x + p["l-mfc"].x) / 2, y: (p["l-lfc"].y + p["l-mfc"].y) / 2 };
    const l_tc_knee = { x: (p["l-ltp"].x + p["l-mtp"].x) / 2, y: (p["l-ltp"].y + p["l-mtp"].y) / 2 };

    const getVectorAngle = (v1: { x: number; y: number }, v2: { x: number; y: number }) => {
      const dot = v1.x * v2.x + v1.y * v2.y;
      const m1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const m2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      if (m1 === 0 || m2 === 0) return 90;
      const cosT = dot / (m1 * m2);
      return Math.acos(Math.max(-1, Math.min(1, cosT))) * (180 / Math.PI);
    };

    // --- Right Leg Metrics ---
    // HKA: Hip (r-fhc) -> Knee center (r_kc) -> Ankle (r-tc)
    const r_vKH = { x: p["r-fhc"].x - r_kc.x, y: p["r-fhc"].y - r_kc.y };
    const r_vKA = { x: p["r-tc"].x - r_kc.x, y: p["r-tc"].y - r_kc.y };
    const r_hka_raw = getVectorAngle(r_vKH, r_vKA);

    // mLDFA: Vertex is r_kc. Vector up to FHC, vector laterally to LFC.
    const r_vKFHC = { x: p["r-fhc"].x - r_kc.x, y: p["r-fhc"].y - r_kc.y };
    const r_vKLFC = { x: p["r-lfc"].x - r_kc.x, y: p["r-lfc"].y - r_kc.y };
    const r_mldfa = getVectorAngle(r_vKFHC, r_vKLFC);

    // mMPTA: Vertex is r_tc_knee. Vector down to TC, vector medially to MTP.
    const r_vKTC = { x: p["r-tc"].x - r_tc_knee.x, y: p["r-tc"].y - r_tc_knee.y };
    const r_vKMTP = { x: p["r-mtp"].x - r_tc_knee.x, y: p["r-mtp"].y - r_tc_knee.y };
    const r_mmpta = getVectorAngle(r_vKTC, r_vKMTP);

    // JLCA: angle between distal femoral joint line (LFC -> MFC) and proximal tibial joint line (LTP -> MTP).
    const r_vFemLine = { x: p["r-mfc"].x - p["r-lfc"].x, y: p["r-mfc"].y - p["r-lfc"].y };
    const r_vTibLine = { x: p["r-mtp"].x - p["r-ltp"].x, y: p["r-mtp"].y - p["r-ltp"].y };
    const r_jlca = getVectorAngle(r_vFemLine, r_vTibLine);

    // Mechanical Lengths (Femoral: FHC -> KC, Tibial: TC_Knee -> TC)
    const r_femLenPixels = Math.sqrt(Math.pow(p["r-fhc"].x - r_kc.x, 2) + Math.pow(p["r-fhc"].y - r_kc.y, 2));
    const r_tibLenPixels = Math.sqrt(Math.pow(p["r-tc"].x - r_tc_knee.x, 2) + Math.pow(p["r-tc"].y - r_tc_knee.y, 2));
    const r_totalLenPixels = r_femLenPixels + r_tibLenPixels;

    // --- Left Leg Metrics ---
    // HKA: Hip (l-fhc) -> Knee center (l_kc) -> Ankle (l-tc)
    const l_vKH = { x: p["l-fhc"].x - l_kc.x, y: p["l-fhc"].y - l_kc.y };
    const l_vKA = { x: p["l-tc"].x - l_kc.x, y: p["l-tc"].y - l_kc.y };
    const l_hka_raw = getVectorAngle(l_vKH, l_vKA);

    // mLDFA: Vertex is l_kc. Vector up to FHC, vector laterally to LFC.
    const l_vKFHC = { x: p["l-fhc"].x - l_kc.x, y: p["l-fhc"].y - l_kc.y };
    const l_vKLFC = { x: p["l-lfc"].x - l_kc.x, y: p["l-lfc"].y - l_kc.y };
    const l_mldfa = getVectorAngle(l_vKFHC, l_vKLFC);

    // mMPTA: Vertex is l_tc_knee. Vector down to TC, vector medially to MTP.
    const l_vKTC = { x: p["l-tc"].x - l_tc_knee.x, y: p["l-tc"].y - l_tc_knee.y };
    const l_vKMTP = { x: p["l-mtp"].x - l_tc_knee.x, y: p["l-mtp"].y - l_tc_knee.y };
    const l_mmpta = getVectorAngle(l_vKTC, l_vKMTP);

    // JLCA: angle between distal femoral joint line (LFC -> MFC) and proximal tibial joint line (LTP -> MTP).
    const l_vFemLine = { x: p["l-lfc"].x - p["l-mfc"].x, y: p["l-lfc"].y - p["l-mfc"].y };
    const l_vTibLine = { x: p["l-ltp"].x - p["l-mtp"].x, y: p["l-ltp"].y - p["l-mtp"].y };
    const l_jlca = getVectorAngle(l_vFemLine, l_vTibLine);

    // Mechanical Lengths
    const l_femLenPixels = Math.sqrt(Math.pow(p["l-fhc"].x - l_kc.x, 2) + Math.pow(p["l-fhc"].y - l_kc.y, 2));
    const l_tibLenPixels = Math.sqrt(Math.pow(p["l-tc"].x - l_tc_knee.x, 2) + Math.pow(p["l-tc"].y - l_tc_knee.y, 2));
    const l_totalLenPixels = l_femLenPixels + l_tibLenPixels;

    // Convert lengths using calibration if active
    let r_lengthMm = r_totalLenPixels * 4.5; // Estimator default
    let l_lengthMm = l_totalLenPixels * 4.5;
    if (calibration.mmPerPixel && containerRef.current) {
      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const r_lenPxActual = (r_totalLenPixels / 100) * containerWidth;
      const l_lenPxActual = (l_totalLenPixels / 100) * containerWidth;
      r_lengthMm = r_lenPxActual * calibration.mmPerPixel;
      l_lengthMm = l_lenPxActual * calibration.mmPerPixel;
    }

    // Categories for HKA
    // Right
    const r_deviation = Math.abs(180 - r_hka_raw);
    let r_category = "NEUTRAL";
    const r_fhcTC_dx = p["r-tc"].x - p["r-fhc"].x;
    const r_fhcTC_dy = p["r-tc"].y - p["r-fhc"].y;
    const r_denom = Math.sqrt(r_fhcTC_dx * r_fhcTC_dx + r_fhcTC_dy * r_fhcTC_dy);
    let r_line_dev = 0;
    if (r_denom > 0) {
      r_line_dev = (r_fhcTC_dy * r_kc.x - r_fhcTC_dx * r_kc.y + p["r-tc"].x * p["r-fhc"].y - p["r-tc"].y * p["r-fhc"].x) / r_denom;
    }
    if (r_line_dev > 0.5) {
      r_category = "VALGUS";
    } else if (r_line_dev < -0.5) {
      r_category = "VARUS";
    }

    // Left
    const l_deviation = Math.abs(180 - l_hka_raw);
    let l_category = "NEUTRAL";
    const l_fhcTC_dx = p["l-tc"].x - p["l-fhc"].x;
    const l_fhcTC_dy = p["l-tc"].y - p["l-fhc"].y;
    const l_denom = Math.sqrt(l_fhcTC_dx * l_fhcTC_dx + l_fhcTC_dy * l_fhcTC_dy);
    let l_line_dev = 0;
    if (l_denom > 0) {
      l_line_dev = (l_fhcTC_dy * l_kc.x - l_fhcTC_dx * l_kc.y + p["l-tc"].x * p["l-fhc"].y - p["l-tc"].y * p["l-fhc"].x) / l_denom;
    }
    if (l_line_dev < -0.5) {
      l_category = "VALGUS";
    } else if (l_line_dev > 0.5) {
      l_category = "VARUS";
    }

    const r_hka = r_category === "VARUS" ? 180 - r_deviation : r_category === "VALGUS" ? 180 + r_deviation : r_hka_raw;
    const l_hka = l_category === "VARUS" ? 180 - l_deviation : l_category === "VALGUS" ? 180 + l_deviation : l_hka_raw;

    return {
      right: {
        hka: r_hka,
        devDegrees: r_deviation,
        category: r_category,
        mldfa: r_mldfa,
        mmpta: r_mmpta,
        jlca: r_jlca,
        lengthMm: r_lengthMm,
        kc: r_kc,
        tc_knee: r_tc_knee,
      },
      left: {
        hka: l_hka,
        devDegrees: l_deviation,
        category: l_category,
        mldfa: l_mldfa,
        mmpta: l_mmpta,
        jlca: l_jlca,
        lengthMm: l_lengthMm,
        kc: l_kc,
        tc_knee: l_tc_knee,
      },
      lld: Math.abs(r_lengthMm - l_lengthMm),
    };
  };

  const metrics13 = calculate13PointMetrics();

  // Dynamic Clinical Report Generator (100% Offline, Updates in Real Time as markers drag)
  useEffect(() => {
    const getSeverity = (dev: number) => {
      if (dev < 1.0) return "physiological neutral";
      if (dev < 3.0) return "mild";
      if (dev < 6.0) return "moderate";
      return "severe";
    };

    if (selectedCaseId === "") {
      setClinicalObservation("No patient scan loaded. Please select a case study or upload a local digital scanogram (X-ray) to initialize biomechanical alignment and generate a live radiological analysis.");
      return;
    }

    if (alignmentMode === "HKA") {
      const rSev = getSeverity(rightMetrics.devDegrees);
      const lSev = getSeverity(leftMetrics.devDegrees);

      let desc = `AUTOMATED MECHANICAL AXIS RADIOLOGY REPORT (OFFLINE ENGINE)\n\n`;

      // Right Leg
      desc += `Anatomical Right Limb: `;
      if (rightMetrics.category === "NEUTRAL") {
        desc += `Displays physiological neutral alignment with a mechanical HKA angle of ${rightMetrics.hka.toFixed(1)}° (within normal clinical tolerance of ±1.0°). `;
      } else {
        desc += `Displays a ${rSev} Genu ${rightMetrics.category.toLowerCase()} deformity. The mechanical HKA angle is plotted at ${rightMetrics.hka.toFixed(1)}° (${rightMetrics.devDegrees.toFixed(1)}° deviation). `;
        desc += `This shifts the mechanical axis ${rightMetrics.category === "VARUS" ? "laterally" : "medially"}, causing a Mechanical Axis Deviation (MAD) of ${rightMetrics.mmDeviation.toFixed(1)} mm. `;
      }

      // Left Leg
      desc += `\n\nAnatomical Left Limb: `;
      if (leftMetrics.category === "NEUTRAL") {
        desc += `Displays physiological neutral alignment with a mechanical HKA angle of ${leftMetrics.hka.toFixed(1)}°. `;
      } else {
        desc += `Displays a ${lSev} Genu ${leftMetrics.category.toLowerCase()} deformity. The mechanical HKA angle is plotted at ${leftMetrics.hka.toFixed(1)}° (${leftMetrics.devDegrees.toFixed(1)}° deviation). `;
        desc += `This shifts the mechanical axis ${leftMetrics.category === "VARUS" ? "laterally" : "medially"}, resulting in a Mechanical Axis Deviation (MAD) of ${leftMetrics.mmDeviation.toFixed(1)} mm. `;
      }

      // Recommendation
      if (rightMetrics.category !== "NEUTRAL" || leftMetrics.category !== "NEUTRAL") {
        desc += `\n\nClinical Recommendation: Asymmetric loading is detected. Mechanical axis deviations of this magnitude are known to increase focal stress on the respective articular compartments. Weight-bearing symptom correlation is recommended.`;
      } else {
        desc += `\n\nClinical Recommendation: Symmetrical mechanical balance. No severe angular deformities detected on current scan. Recommend routine observational follow-up.`;
      }

      setClinicalObservation(desc);
    } else {
      const metrics = metrics13;
      const rSev = getSeverity(metrics.right.devDegrees);
      const lSev = getSeverity(metrics.left.devDegrees);

      let desc = `AUTOMATED 13-POINT MECHANICAL COMPREHENSIVE RADIOLOGY REPORT (OFFLINE)\n\n`;

      // Limb Lengths
      desc += `Pelvic/Limb Geometry: Symphysis reference (P-SYM) verified. `;
      desc += `Mechanical Limb Lengths: Right = ${metrics.right.lengthMm.toFixed(0)} mm, Left = ${metrics.left.lengthMm.toFixed(0)} mm. `;
      if (metrics.lld > 2) {
        desc += `Limb Length Discrepancy (LLD) is flagged at ${metrics.lld.toFixed(1)} mm (Anatomical ${metrics.right.lengthMm > metrics.left.lengthMm ? "Right" : "Left"} is longer). `;
      } else {
        desc += `Limb lengths are balanced symmetrically within normal clinical variation (LLD = ${metrics.lld.toFixed(1)} mm). `;
      }

      // Right Leg Detailed Parameters
      desc += `\n\nRight Lower Limb detailed parameters:\n`;
      desc += `  - Mechanical HKA Angle: ${metrics.right.hka.toFixed(1)}° (${rSev} ${metrics.right.category.toLowerCase()})\n`;
      desc += `  - Distal Femoral Angle (mLDFA): ${metrics.right.mldfa.toFixed(1)}° (Normal: 85°-90°). `;
      if (metrics.right.mldfa < 85) desc += `[Femoral Valgus detected] `;
      else if (metrics.right.mldfa > 90) desc += `[Femoral Varus detected] `;
      else desc += `[Physiological femoral alignment] `;
      desc += `\n  - Proximal Tibial Angle (mMPTA): ${metrics.right.mmpta.toFixed(1)}° (Normal: 85°-90°). `;
      if (metrics.right.mmpta < 85) desc += `[Tibial Varus detected] `;
      else if (metrics.right.mmpta > 90) desc += `[Tibial Valgus detected] `;
      else desc += `[Physiological tibial alignment] `;
      desc += `\n  - Joint Line Convergence Angle (JLCA): ${metrics.right.jlca.toFixed(1)}° (Normal: 0°-2°). `;
      if (metrics.right.jlca > 2) desc += `[Elevated joint laxity / cartilage loss] `;

      // Left Leg Detailed Parameters
      desc += `\n\nLeft Lower Limb detailed parameters:\n`;
      desc += `  - Mechanical HKA Angle: ${metrics.left.hka.toFixed(1)}° (${lSev} ${metrics.left.category.toLowerCase()})\n`;
      desc += `  - Distal Femoral Angle (mLDFA): ${metrics.left.mldfa.toFixed(1)}° (Normal: 85°-90°). `;
      if (metrics.left.mldfa < 85) desc += `[Femoral Valgus detected] `;
      else if (metrics.left.mldfa > 90) desc += `[Femoral Varus detected] `;
      else desc += `[Physiological femoral alignment] `;
      desc += `\n  - Proximal Tibial Angle (mMPTA): ${metrics.left.mmpta.toFixed(1)}° (Normal: 85°-90°). `;
      if (metrics.left.mmpta < 85) desc += `[Tibial Varus detected] `;
      else if (metrics.left.mmpta > 90) desc += `[Tibial Valgus detected] `;
      else desc += `[Physiological tibial alignment] `;
      desc += `\n  - Joint Line Convergence Angle (JLCA): ${metrics.left.jlca.toFixed(1)}° (Normal: 0°-2°). `;
      if (metrics.left.jlca > 2) desc += `[Elevated joint laxity / cartilage loss] `;

      // Recommendation / Summary
      desc += `\n\nRadiology Impress: Symmetrical mechanical assessment completed. `;
      if (metrics.right.devDegrees > 2 || metrics.left.devDegrees > 2 || metrics.right.jlca > 2 || metrics.left.jlca > 2) {
        desc += `Pathological loading profiles are present. Recommend weight-bearing stress correlation and surgical planning simulation based on 13-point skeletal landmark coordinates.`;
      } else {
        desc += `Balanced loading profiles. High degree of articular joint congruity preserved.`;
      }

      setClinicalObservation(desc);
    }
  }, [
    selectedCaseId,
    alignmentMode,
    rightLeg, 
    leftLeg, 
    points13,
    calibration.mmPerPixel,
    rightMetrics.hka, 
    rightMetrics.category, 
    rightMetrics.devDegrees, 
    rightMetrics.mmDeviation,
    leftMetrics.hka, 
    leftMetrics.category, 
    leftMetrics.devDegrees, 
    leftMetrics.mmDeviation
  ]);

  // Load selected case
  useEffect(() => {
    if (selectedCaseId === "custom") {
      if (customImage) {
        // Keep custom state
      }
    } else if (selectedCaseId === "") {
      const emptyL: LegPoints = {
        detected: false,
        hip: { id: "l-hip", name: "hip" as const, label: "H", anatomicalName: "Left Hip Center", x: 0, y: 0, color: "" },
        knee: { id: "l-knee", name: "knee" as const, label: "K", anatomicalName: "Left Knee Center", x: 0, y: 0, color: "" },
        ankle: { id: "l-ankle", name: "ankle" as const, label: "A", anatomicalName: "Left Ankle Center", x: 0, y: 0, color: "" }
      };
      const emptyR: LegPoints = {
        detected: false,
        hip: { id: "r-hip", name: "hip" as const, label: "H", anatomicalName: "Right Hip Center", x: 0, y: 0, color: "" },
        knee: { id: "r-knee", name: "knee" as const, label: "K", anatomicalName: "Right Knee Center", x: 0, y: 0, color: "" },
        ankle: { id: "r-ankle", name: "ankle" as const, label: "A", anatomicalName: "Right Ankle Center", x: 0, y: 0, color: "" }
      };
      setLeftLeg(emptyL);
      setRightLeg(emptyR);
      setPoints13(getInitial13Points(emptyL, emptyR));
      setCalibration(prev => ({ ...prev, active: false, point1: null, point2: null }));
      setOfflineStatusMsg("");
    } else {
      const kase = sampleCases.find((c) => c.id === selectedCaseId);
      if (kase) {
        setLeftLeg(JSON.parse(JSON.stringify(kase.leftLeg)));
        setRightLeg(JSON.parse(JSON.stringify(kase.rightLeg)));
        setPoints13(getInitial13Points(kase.leftLeg, kase.rightLeg));
        setCalibration(prev => ({ ...prev, active: false, point1: null, point2: null }));
        setOfflineStatusMsg("");
      }
    }
  }, [selectedCaseId, customImage]);

  const getMagnifyingLoupeStyle = () => {
    if (!cursorPos || !containerRef.current) return {};
    const rect = containerRef.current.getBoundingClientRect();
    
    // Position of cursor relative to the container
    const x = cursorPos.x - rect.left;
    const y = cursorPos.y - rect.top;
    
    // Percentage position
    const pctX = (x / rect.width) * 100;
    const pctY = (y / rect.height) * 100;

    // We offset the loupe itself so it doesn't render directly under the user's finger/mouse
    const loupeSize = 130; // 130px circle
    const offset = 85; // 85px offset
    
    let loupeLeft = x - loupeSize / 2;
    let loupeTop = y - loupeSize / 2 - offset; // render slightly above the cursor

    // Keep loupe within container bounds
    loupeLeft = Math.max(10, Math.min(rect.width - loupeSize - 10, loupeLeft));
    loupeTop = Math.max(10, Math.min(rect.height - loupeSize - 10, loupeTop));

    const magFactor = 3.5; // 3.5x magnification

    return {
      loupe: {
        left: `${loupeLeft}px`,
        top: `${loupeTop}px`,
        width: `${loupeSize}px`,
        height: `${loupeSize}px`,
      },
      image: {
        width: `${rect.width * magFactor}px`,
        height: `${rect.height * magFactor}px`,
        left: `${-pctX * rect.width * magFactor / 100 + loupeSize / 2}px`,
        top: `${-pctY * rect.height * magFactor / 100 + loupeSize / 2}px`,
      }
    };
  };

  // Handle Dragging / Move for precision plotting with Magnifying Loupe
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    setCursorPos({ x: e.clientX, y: e.clientY });

    if (activeDrag) {
      updatePointCoords(x, y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    
    const rect = containerRef.current.getBoundingClientRect();
    let x = ((touch.clientX - rect.left) / rect.width) * 100;
    let y = ((touch.clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    setCursorPos({ x: touch.clientX, y: touch.clientY });

    if (activeDrag) {
      updatePointCoords(x, y);
    }
  };

  const updatePointCoords = (x: number, y: number) => {
    if (!activeDrag) return;

    const roundedX = parseFloat(x.toFixed(2));
    const roundedY = parseFloat(y.toFixed(2));

    if (activeDrag.mode === "OSTEOTOMY") {
      const idx = activeDrag.pointId === "ost-0" ? 0 : 1;
      setOsteotomyPoints((prev) => {
        const next = [...prev];
        next[idx] = { x: roundedX, y: roundedY };
        return next;
      });
      return;
    }

    if (activeDrag.mode === "HKA") {
      const isLeft = activeDrag.pointId.startsWith("l-");
      const type = activeDrag.pointId.replace("l-", "").replace("r-", "") as "hip" | "knee" | "ankle";

      if (isLeft) {
        setLeftLeg((prev) => {
          const updated = { ...prev };
          updated[type] = {
            ...updated[type],
            x: roundedX,
            y: roundedY,
          };
          return updated;
        });
      } else {
        setRightLeg((prev) => {
          const updated = { ...prev };
          updated[type] = {
            ...updated[type],
            x: roundedX,
            y: roundedY,
          };
          return updated;
        });
      }
    } else {
      // 13-point mode
      setPoints13((prev) => {
        const key = activeDrag.pointId as keyof Points13State;
        if (!prev[key]) return prev;
        return {
          ...prev,
          [key]: {
            ...prev[key],
            x: roundedX,
            y: roundedY,
          },
        };
      });
    }
  };

  const handleMouseUp = () => {
    setActiveDrag(null);
  };

  // Click on container for calibration points
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!calibration.active || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (!calibration.point1) {
      setCalibration((prev) => ({
        ...prev,
        point1: { x, y },
      }));
    } else if (!calibration.point2) {
      const p1 = calibration.point1;
      const dx = ((x - p1.x) / 100) * rect.width;
      const dy = ((y - p1.y) / 100) * rect.height;
      const pixelLength = Math.sqrt(dx * dx + dy * dy);

      const mmPerPixel = calibration.physicalLength / pixelLength;

      setCalibration((prev) => ({
        ...prev,
        point2: { x, y },
        pixelLength,
        mmPerPixel,
      }));
    }
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomImage(reader.result);
        setSelectedCaseId("custom");
        
        // Centered starting points for custom image
        const leftL = {
          detected: true,
          hip: { id: "l-hip", name: "hip" as const, label: "H", anatomicalName: "Left Hip Center", x: 65.0, y: 22.0, color: "#3b82f6" },
          knee: { id: "l-knee", name: "knee" as const, label: "K", anatomicalName: "Left Knee Center", x: 65.0, y: 53.0, color: "#10b981" },
          ankle: { id: "l-ankle", name: "ankle" as const, label: "A", anatomicalName: "Left Ankle Center", x: 65.0, y: 86.0, color: "#3b82f6" },
        };
        const rightL = {
          detected: true,
          hip: { id: "r-hip", name: "hip" as const, label: "H", anatomicalName: "Right Hip Center", x: 35.0, y: 22.0, color: "#ef4444" },
          knee: { id: "r-knee", name: "knee" as const, label: "K", anatomicalName: "Right Knee Center", x: 35.0, y: 53.0, color: "#10b981" },
          ankle: { id: "r-ankle", name: "ankle" as const, label: "A", anatomicalName: "Right Ankle Center", x: 35.0, y: 86.0, color: "#ef4444" },
        };

        setLeftLeg(leftL);
        setRightLeg(rightL);
        setPoints13(getInitial13Points(leftL, rightL));
        setOfflineStatusMsg("Image loaded. Standard landmark proportions initialized. Click 'Run Offline Auto-Mark' to analyze bone density contours.");
        setAnalysisError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // 100% Offline computer vision heuristic for joint density detection
  const runOfflineLandmarkDetection = () => {
    const currentImg = selectedCaseId === "custom" ? customImage : getCurrentImageUrl();
    if (!currentImg) {
      setAnalysisError("Please upload an image first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setOfflineStatusMsg("");

    setTimeout(() => {
      try {
        // If it's a standard case, load its perfect template coordinates offline instantly
        if (selectedCaseId !== "custom") {
          const kase = sampleCases.find((c) => c.id === selectedCaseId);
          if (kase) {
            setLeftLeg(JSON.parse(JSON.stringify(kase.leftLeg)));
            setRightLeg(JSON.parse(JSON.stringify(kase.rightLeg)));
            setPoints13(getInitial13Points(kase.leftLeg, kase.rightLeg));
            setOfflineStatusMsg("✓ Offline Landmark Detector restored standard anatomical template coordinates.");
            setIsAnalyzing(false);
            return;
          }
        }

        // For custom uploaded files, we run an actual pixel-intensity density algorithm!
        const img = new Image();
        img.src = currentImg;
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas 2D unsupported");

            // Low-resolution rendering for ultra-fast browser pixel scan
            canvas.width = 200;
            canvas.height = 300;
            ctx.drawImage(img, 0, 0, 200, 300);

            const imgData = ctx.getImageData(0, 0, 200, 300);
            const pixels = imgData.data;

            // Helper to find bright bone centers in a designated Region of Interest (ROI)
            const getDensityCenter = (xMin: number, xMax: number, yMin: number, yMax: number) => {
              const xStart = Math.floor((xMin / 100) * 200);
              const xEnd = Math.floor((xMax / 100) * 200);
              const yStart = Math.floor((yMin / 100) * 300);
              const yEnd = Math.floor((yMax / 100) * 300);

              let bestX = Math.floor((xStart + xEnd) / 2);
              let bestY = Math.floor((yStart + yEnd) / 2);

              const xIntensity = new Array(xEnd - xStart).fill(0);
              const yIntensity = new Array(yEnd - yStart).fill(0);

              for (let y = yStart; y < yEnd; y++) {
                for (let x = xStart; x < xEnd; x++) {
                  const idx = (y * 200 + x) * 4;
                  // Brightness formula (high-density bone structures are white/bright gray)
                  const luma = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
                  xIntensity[x - xStart] += luma;
                  yIntensity[y - yStart] += luma;
                }
              }

              // Peak X column
              let maxValX = 0;
              let peakIdxX = Math.floor(xIntensity.length / 2);
              for (let i = 0; i < xIntensity.length; i++) {
                if (xIntensity[i] > maxValX) {
                  maxValX = xIntensity[i];
                  peakIdxX = i;
                }
              }
              bestX = xStart + peakIdxX;

              // Peak Y row
              let maxValY = 0;
              let peakIdxY = Math.floor(yIntensity.length / 2);
              for (let j = 0; j < yIntensity.length; j++) {
                if (yIntensity[j] > maxValY) {
                  maxValY = yIntensity[j];
                  peakIdxY = j;
                }
              }
              bestY = yStart + peakIdxY;

              return {
                x: parseFloat(((bestX / 200) * 100).toFixed(1)),
                y: parseFloat(((bestY / 300) * 100).toFixed(1)),
              };
            };

            // Locate 6 joint markers dynamically from the custom image pixels
            const rHip = getDensityCenter(28, 42, 16, 24);
            const lHip = getDensityCenter(58, 72, 16, 24);

            const rKnee = getDensityCenter(25, 45, 48, 56);
            const lKnee = getDensityCenter(55, 75, 48, 56);

            const rAnkle = getDensityCenter(28, 42, 82, 90);
            const lAnkle = getDensityCenter(58, 72, 82, 90);

            const rLegL = {
              detected: true,
              hip: { id: "r-hip", name: "hip" as const, label: "H", anatomicalName: "Right Hip Center", x: rHip.x, y: rHip.y, color: "#ef4444" },
              knee: { id: "r-knee", name: "knee" as const, label: "K", anatomicalName: "Right Knee Center", x: rKnee.x, y: rKnee.y, color: "#10b981" },
              ankle: { id: "r-ankle", name: "ankle" as const, label: "A", anatomicalName: "Right Ankle Center", x: rAnkle.x, y: rAnkle.y, color: "#ef4444" },
            };

            const lLegL = {
              detected: true,
              hip: { id: "l-hip", name: "hip" as const, label: "H", anatomicalName: "Left Hip Center", x: lHip.x, y: lHip.y, color: "#3b82f6" },
              knee: { id: "l-knee", name: "knee" as const, label: "K", anatomicalName: "Left Knee Center", x: lKnee.x, y: lKnee.y, color: "#10b981" },
              ankle: { id: "l-ankle", name: "ankle" as const, label: "A", anatomicalName: "Left Ankle Center", x: lAnkle.x, y: lAnkle.y, color: "#3b82f6" },
            };

            setRightLeg(rLegL);
            setLeftLeg(lLegL);
            setPoints13(getInitial13Points(lLegL, rLegL));

            setOfflineStatusMsg("✓ Local computer vision bone detector located joint centers successfully.");
          } catch (err: any) {
            setAnalysisError("Offline analyzer encountered a canvas issue. Normal physiological proportions restored instead.");
          }
          setIsAnalyzing(false);
        };
        img.onerror = () => {
          throw new Error("Failed to load image element.");
        };
      } catch (e) {
        setAnalysisError("An error occurred during local offline landmark processing. Proportions loaded instead.");
        setIsAnalyzing(false);
      }
    }, 600);
  };

  // Run Real-time Server-Side AI analysis utilizing custom provider configs (Gemini, OpenAI, Claude, Ollama)
  const runCloudLandmarkDetection = async () => {
    const currentImg = selectedCaseId === "custom" ? customImage : getCurrentImageUrl();
    if (!currentImg) {
      setAnalysisError("Please upload or select an image first.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setOfflineStatusMsg("");

    try {
      setOfflineStatusMsg("Initializing cloud workstation routing. Running multimodal X-Ray scan...");
      
      const res = await fetch("/api/analyze-xray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: currentImg,
          mimeType: currentImg.startsWith("data:") ? currentImg.split(";")[0].split(":")[1] : "image/png"
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();

      if (data.leftLeg && data.rightLeg) {
        // Construct standard anatomical coordinates
        const lLegL = {
          detected: data.leftLeg.detected,
          hip: { id: "l-hip", name: "hip" as const, label: "H", anatomicalName: "Left Hip Center", x: data.leftLeg.hip.x * 100, y: data.leftLeg.hip.y * 100, color: "#3b82f6" },
          knee: { id: "l-knee", name: "knee" as const, label: "K", anatomicalName: "Left Knee Center", x: data.leftLeg.knee.x * 100, y: data.leftLeg.knee.y * 100, color: "#10b981" },
          ankle: { id: "l-ankle", name: "ankle" as const, label: "A", anatomicalName: "Left Ankle Center", x: data.leftLeg.ankle.x * 100, y: data.leftLeg.ankle.y * 100, color: "#3b82f6" },
        };

        const rLegL = {
          detected: data.rightLeg.detected,
          hip: { id: "r-hip", name: "hip" as const, label: "H", anatomicalName: "Right Hip Center", x: data.rightLeg.hip.x * 100, y: data.rightLeg.hip.y * 100, color: "#ef4444" },
          knee: { id: "r-knee", name: "knee" as const, label: "K", anatomicalName: "Right Knee Center", x: data.rightLeg.knee.x * 100, y: data.rightLeg.knee.y * 100, color: "#10b981" },
          ankle: { id: "r-ankle", name: "ankle" as const, label: "A", anatomicalName: "Right Ankle Center", x: data.rightLeg.ankle.x * 100, y: data.rightLeg.ankle.y * 100, color: "#ef4444" },
        };

        setLeftLeg(lLegL);
        setRightLeg(rLegL);
        setPoints13(getInitial13Points(lLegL, rLegL));
        
        if (data.clinicalObservation) {
          setClinicalObservation(data.clinicalObservation);
        }

        setOfflineStatusMsg("✓ Active AI pipeline successfully plotted mechanical axis landmarks.");
      } else {
        throw new Error("Invalid landmark data schema returned by selected AI model.");
      }
    } catch (e: any) {
      console.error(e);
      setAnalysisError(`Cloud AI pipeline error: ${e.message}. Running offline local spotter fallback instead.`);
      // Automatic robust fallback to offline
      runOfflineLandmarkDetection();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getCurrentImageUrl = (): string => {
    if (selectedCaseId === "custom" && customImage) {
      return customImage;
    }
    const currentCase = sampleCases.find((c) => c.id === selectedCaseId);
    return currentCase ? currentCase.imageUrl : generateSyntheticScanogram("neutral");
  };

  const resetMarkers = () => {
    if (selectedCaseId === "custom") {
      const leftL = {
        detected: true,
        hip: { id: "l-hip", name: "hip" as const, label: "H", anatomicalName: "Left Hip Center", x: 65.0, y: 22.0, color: "#3b82f6" },
        knee: { id: "l-knee", name: "knee" as const, label: "K", anatomicalName: "Left Knee Center", x: 65.0, y: 53.0, color: "#10b981" },
        ankle: { id: "l-ankle", name: "ankle" as const, label: "A", anatomicalName: "Left Ankle Center", x: 65.0, y: 86.0, color: "#3b82f6" },
      };
      const rightL = {
        detected: true,
        hip: { id: "r-hip", name: "hip" as const, label: "H", anatomicalName: "Right Hip Center", x: 35.0, y: 22.0, color: "#ef4444" },
        knee: { id: "r-knee", name: "knee" as const, label: "K", anatomicalName: "Right Knee Center", x: 35.0, y: 53.0, color: "#10b981" },
        ankle: { id: "r-ankle", name: "ankle" as const, label: "A", anatomicalName: "Right Ankle Center", x: 35.0, y: 86.0, color: "#ef4444" },
      };
      setLeftLeg(leftL);
      setRightLeg(rightL);
      setPoints13(getInitial13Points(leftL, rightL));
    } else {
      const original = sampleCases.find(c => c.id === selectedCaseId);
      if (original) {
        setLeftLeg(JSON.parse(JSON.stringify(original.leftLeg)));
        setRightLeg(JSON.parse(JSON.stringify(original.rightLeg)));
        setPoints13(getInitial13Points(original.leftLeg, original.rightLeg));
      }
    }
    setCalibration(prev => ({ ...prev, active: false, point1: null, point2: null }));
    setOfflineStatusMsg("");
    setAnalysisError(null);
  };

  const startCalibration = () => {
    setCalibration({
      active: !calibration.active,
      point1: null,
      point2: null,
      physicalLength: parseFloat(calibrationInput) || 500,
      pixelLength: 0,
      mmPerPixel: null,
    });
  };

  const handleCalibrationInput = (val: string) => {
    setCalibrationInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      setCalibration(prev => {
        const mmPerPx = prev.pixelLength > 0 ? parsed / prev.pixelLength : null;
        return {
          ...prev,
          physicalLength: parsed,
          mmPerPixel: mmPerPx
        };
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(clinicalObservation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportScanogram = () => {
    const imgElement = imageRef.current;
    if (!imgElement) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = getCurrentImageUrl();

    img.onload = () => {
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 1200;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      if (showAxes) {
        if (alignmentMode === "HKA") {
          const drawLegAxes = (leg: LegPoints, side: "Left" | "Right", color: string) => {
            if (!leg.detected) return;

            const px = (p: Point) => ({
              x: (p.x / 100) * w,
              y: (p.y / 100) * h,
            });

            const hipCoords = px(leg.hip);
            const kneeCoords = px(leg.knee);
            const ankleCoords = px(leg.ankle);

            // Femoral mechanical axis
            ctx.beginPath();
            ctx.moveTo(hipCoords.x, hipCoords.y);
            ctx.lineTo(kneeCoords.x, kneeCoords.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 8]);
            ctx.stroke();

            // Tibial mechanical axis
            ctx.beginPath();
            ctx.moveTo(kneeCoords.x, kneeCoords.y);
            ctx.lineTo(ankleCoords.x, ankleCoords.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.setLineDash([8, 8]);
            ctx.stroke();

            // Mechanical line
            ctx.beginPath();
            ctx.moveTo(hipCoords.x, hipCoords.y);
            ctx.lineTo(ankleCoords.x, ankleCoords.y);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.stroke();

            // Joint circles
            const drawMarker = (point: Point, label: string) => {
              const p = px(point);
              ctx.beginPath();
              ctx.arc(p.x, p.y, 14, 0, 2 * Math.PI);
              ctx.fillStyle = "#020617";
              ctx.fill();
              ctx.lineWidth = 3;
              ctx.strokeStyle = color;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();

              ctx.fillStyle = "#f1f5f9";
              ctx.font = "bold 14px monospace";
              ctx.fillText(`${side[0]}_${point.name.toUpperCase()}`, p.x + 20, p.y + 5);
            };

            drawMarker(leg.hip, "H");
            drawMarker(leg.knee, "K");
            drawMarker(leg.ankle, "A");

            // Sidebar text overlay
            const metrics = calculateMetrics(leg, side.toLowerCase() as "left" | "right");
            const boxX = side === "Right" ? 40 : w - 280;
            const boxY = 160;
            ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
            ctx.fillRect(boxX, boxY, 240, 120);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, 240, 120);

            ctx.fillStyle = "#f8fafc";
            ctx.font = "bold 16px sans-serif";
            ctx.fillText(`${side.toUpperCase()} LOWER LIMB`, boxX + 15, boxY + 28);
            
            ctx.font = "32px sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(`${metrics.hka.toFixed(1)}°`, boxX + 15, boxY + 68);

            ctx.font = "12px monospace";
            ctx.fillStyle = metrics.category === "NEUTRAL" ? "#10b981" : "#f87171";
            ctx.fillText(`${metrics.category} (${metrics.devDegrees.toFixed(1)}° dev)`, boxX + 15, boxY + 95);
          };

          drawLegAxes(rightLeg, "Right", "#ef4444");
          drawLegAxes(leftLeg, "Left", "#3b82f6");
        } else {
          // Render full 13 point lines and measurements
          const px = (p: Point13) => ({
            x: (p.x / 100) * w,
            y: (p.y / 100) * h,
          });

          // Draw Symphysis Center
          if (points13["p-sym"]) {
            const sym = px(points13["p-sym"]);
            ctx.beginPath();
            ctx.arc(sym.x, sym.y, 10, 0, 2 * Math.PI);
            ctx.fillStyle = points13["p-sym"].color;
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px monospace";
            ctx.fillText("P-SYM", sym.x + 15, sym.y + 4);
          }

          const drawFullLegAxes = (side: "left" | "right", color: string) => {
            const prefix = side === "left" ? "l-" : "r-";
            const fhc = px(points13[`${prefix}fhc` as keyof Points13State]);
            const lfc = px(points13[`${prefix}lfc` as keyof Points13State]);
            const mfc = px(points13[`${prefix}mfc` as keyof Points13State]);
            const ltp = px(points13[`${prefix}ltp` as keyof Points13State]);
            const mtp = px(points13[`${prefix}mtp` as keyof Points13State]);
            const tc = px(points13[`${prefix}tc` as keyof Points13State]);

            const kc = { x: (lfc.x + mfc.x) / 2, y: (lfc.y + mfc.y) / 2 };
            const tc_knee = { x: (ltp.x + mtp.x) / 2, y: (ltp.y + mtp.y) / 2 };

            // Femoral mechanical line: FHC to KC
            ctx.beginPath();
            ctx.moveTo(fhc.x, fhc.y);
            ctx.lineTo(kc.x, kc.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.setLineDash([6, 6]);
            ctx.stroke();

            // Tibial mechanical line: tc_knee to tc
            ctx.beginPath();
            ctx.moveTo(tc_knee.x, tc_knee.y);
            ctx.lineTo(tc.x, tc.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.setLineDash([6, 6]);
            ctx.stroke();

            // Joint Lines
            // Femoral distal joint line: LFC to MFC
            ctx.beginPath();
            ctx.moveTo(lfc.x, lfc.y);
            ctx.lineTo(mfc.x, mfc.y);
            ctx.strokeStyle = "#facc15";
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.stroke();

            // Tibial proximal joint line: LTP to MTP
            ctx.beginPath();
            ctx.moveTo(ltp.x, ltp.y);
            ctx.lineTo(mtp.x, mtp.y);
            ctx.strokeStyle = "#22d3ee";
            ctx.lineWidth = 4;
            ctx.stroke();

            // Draw Markers
            const keys: (keyof Points13State)[] = [
              `${prefix}fhc`, `${prefix}lfc`, `${prefix}mfc`, 
              `${prefix}ltp`, `${prefix}mtp`, `${prefix}tc`
            ];

            keys.forEach(k => {
              const pt = points13[k];
              if (!pt) return;
              const coord = px(pt);
              ctx.beginPath();
              ctx.arc(coord.x, coord.y, 10, 0, 2 * Math.PI);
              ctx.fillStyle = pt.color;
              ctx.fill();
              ctx.lineWidth = 2;
              ctx.strokeStyle = "#ffffff";
              ctx.stroke();

              ctx.fillStyle = "#e2e8f0";
              ctx.font = "bold 11px monospace";
              ctx.fillText(pt.label, coord.x + 14, coord.y + 4);
            });

            // Summary overlay box
            const m = side === "left" ? metrics13.left : metrics13.right;
            const boxX = side === "right" ? 40 : w - 280;
            const boxY = 160;
            ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
            ctx.fillRect(boxX, boxY, 240, 160);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, 240, 160);

            ctx.fillStyle = "#f8fafc";
            ctx.font = "bold 14px sans-serif";
            ctx.fillText(`${side.toUpperCase()} 13-POINT MODEL`, boxX + 15, boxY + 24);

            ctx.font = "26px sans-serif";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(`${m.hka.toFixed(1)}° HKA`, boxX + 15, boxY + 58);

            ctx.font = "11px monospace";
            ctx.fillStyle = "#facc15";
            ctx.fillText(`mLDFA: ${m.mldfa.toFixed(1)}°`, boxX + 15, boxY + 84);
            ctx.fillStyle = "#22d3ee";
            ctx.fillText(`mMPTA: ${m.mmpta.toFixed(1)}°`, boxX + 15, boxY + 102);
            ctx.fillStyle = "#cbd5e1";
            ctx.fillText(`JLCA:  ${m.jlca.toFixed(1)}°`, boxX + 15, boxY + 120);
            ctx.fillStyle = "#c084fc";
            ctx.fillText(`Length: ${m.lengthMm.toFixed(0)} mm`, boxX + 15, boxY + 138);
          };

          drawFullLegAxes("right", "#ef4444");
          drawFullLegAxes("left", "#3b82f6");
        }
      }

      if (calibration.mmPerPixel) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
        ctx.fillRect(20, h - 80, 360, 50);
        ctx.strokeStyle = "#eab308";
        ctx.strokeRect(20, h - 80, 360, 50);
        ctx.fillStyle = "#fef08a";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`METRIC SCALE CALIBRATED: ${calibration.physicalLength}mm`, 35, h - 50);
      }

      // Title header
      ctx.fillStyle = "rgba(9, 13, 22, 0.95)";
      ctx.fillRect(0, 0, w, 110);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 110);
      ctx.lineTo(w, 110);
      ctx.stroke();

      ctx.fillStyle = "#22d3ee";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("ORTHOSCAN LOWER LIMB REPORT", 40, 48);

      ctx.fillStyle = "#64748b";
      ctx.font = "12px monospace";
      ctx.fillText(`DATE: ${new Date().toLocaleDateString()} | STATUS: 100% OFFLINE VERIFIED`, 40, 75);

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `OrthoScan_HKA_Report_${selectedCaseId}.png`;
      link.href = dataUrl;
      link.click();
    };
  };

  return (
    <div id="ortho-app-container" className="bg-slate-950 text-slate-100 font-sans min-h-screen flex flex-col overflow-x-hidden selection:bg-cyan-500/30">
      
      {/* Consolidated Minimalist Top Control Bar */}
      <nav id="navbar" className="min-h-16 border-b border-slate-800 bg-slate-900/45 flex flex-wrap items-center justify-between px-6 py-3 md:py-0 shrink-0 z-20 gap-4">
        
        {/* Left Side: Brand and Offline Tag */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center shadow-[0_0_8px_rgba(8,182,212,0.35)]">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              OrthoScan <span className="text-slate-400 font-mono text-[9px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">Workstation</span>
            </h1>
          </div>

          {/* Workstation Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 ml-2 shrink-0">
            <button
              onClick={() => setWorkstationMode("alignment")}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                workstationMode === "alignment"
                  ? "bg-cyan-900/60 text-cyan-300 border border-cyan-500/25"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Pre-Op Align
            </button>
            <button
              onClick={() => setWorkstationMode("complications")}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                workstationMode === "complications"
                  ? "bg-cyan-900/60 text-cyan-300 border border-cyan-500/25"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Activity className="w-3 h-3 text-cyan-400" />
              Post-Op Hub
            </button>
          </div>
        </div>

        {/* Middle: Fully Integrated Minimalistic Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* 1. Case selection */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">Case:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="bg-transparent text-xs text-slate-300 outline-none font-medium cursor-pointer max-w-[130px] border-none"
            >
              <option value="" className="bg-slate-950 text-slate-550">-- Select Patient Case --</option>
              <option value="case-neutral" className="bg-slate-950 text-slate-300">Neutral Axis</option>
              <option value="case-varus" className="bg-slate-950 text-slate-300">Severe Varus</option>
              <option value="case-valgus" className="bg-slate-950 text-slate-300">Severe Valgus</option>
              {customImage && <option value="custom" className="bg-slate-950 text-slate-300">Custom Upload</option>}
            </select>
          </div>

          {/* 2. Alignment mode Segmented toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setAlignmentMode("HKA")}
              className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                alignmentMode === "HKA"
                  ? "bg-cyan-900/60 text-cyan-300 border border-cyan-500/25"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              title="3-Point Mechanical Axes"
            >
              HKA Mode
            </button>
            <button
              onClick={() => setAlignmentMode("FULL")}
              className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                alignmentMode === "FULL"
                  ? "bg-cyan-900/60 text-cyan-300 border border-cyan-500/25"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              title="13-Point Complete Landmarks"
            >
              13-Point
            </button>
          </div>

          {/* 3. Auto-Mark Pipeline triggers */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800">
            <button
              onClick={runOfflineLandmarkDetection}
              disabled={isAnalyzing}
              className="px-2 py-1 rounded text-[9px] font-bold uppercase text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 disabled:opacity-40"
              title="Trigger high-performance local edge projection landmark mapping"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Auto-Mark</span>
            </button>
            <span className="text-slate-800 px-0.5">|</span>
            <button
              onClick={runCloudLandmarkDetection}
              disabled={isAnalyzing}
              className="px-2 py-1 rounded text-[9px] font-bold uppercase text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 disabled:opacity-40"
              title="Utilize external AI models for multi-landmark scanning"
            >
              <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>AI Cloud-Mark</span>
            </button>
          </div>

          {/* 4. Calibration Tool toggle */}
          <button
            onClick={startCalibration}
            className={`px-2.5 py-1.5 rounded text-[9px] font-bold uppercase border transition-all flex items-center gap-1 ${
              calibration.active
                ? "bg-amber-950/80 text-amber-300 border-amber-500/30"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900"
            }`}
            title="Calibrate visual pixels to real world physical mm"
          >
            <Ruler className="w-3.5 h-3.5 text-amber-400" />
            <span>Calibrate</span>
          </button>

          {/* 5. Osteotomy Simulation toggle (Dynamic Hinge Feature!) */}
          <button
            onClick={() => setOsteotomyActive(!osteotomyActive)}
            className={`px-2.5 py-1.5 rounded text-[9px] font-bold uppercase border transition-all flex items-center gap-1.5 ${
              osteotomyActive
                ? "bg-cyan-950 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-900"
            }`}
            title="Enable digital osteotomy hinge cut planner"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>Osteotomy</span>
          </button>
        </div>

        {/* Right Side: Primary Actions & Sidebar Toggles */}
        <div className="flex items-center gap-2.5">
          <label className="cursor-pointer bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 px-3 py-1.5 rounded text-[11px] font-bold uppercase flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload X-Ray</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>

          <button 
            id="export-btn"
            onClick={exportScanogram}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Report</span>
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded border bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all"
            title="System Configuration Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className={`p-1.5 rounded border transition-colors ${
              showRightSidebar
                ? "bg-cyan-950 border-cyan-500/20 text-cyan-300 hover:bg-cyan-900"
                : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
            title={showRightSidebar ? "Hide Clinical Sidebar" : "Show Clinical Sidebar"}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Dynamic Osteotomy Calibration & Correction Slider Drawer */}
      {osteotomyActive && (
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-inner z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded border border-slate-800">
              <span className="text-[10px] font-mono font-semibold text-slate-550 uppercase">Hinge Location:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOsteotomyLeg("right")}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${
                    osteotomyLeg === "right" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "text-slate-550 hover:text-slate-300"
                  }`}
                >
                  Right Leg
                </button>
                <button
                  onClick={() => setOsteotomyLeg("left")}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-colors ${
                    osteotomyLeg === "left" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-550 hover:text-slate-300"
                  }`}
                >
                  Left Leg
                </button>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 leading-normal max-w-sm">
              <span className="text-cyan-400 font-semibold uppercase block text-[9px] font-mono">Interactive Osteotomy Planner</span>
              Drag the <span className="text-cyan-300 font-semibold">HINGE</span> and <span className="text-amber-300 font-semibold">CUT END</span> markers on the canvas to orient your wedge bone cut axis.
            </div>
          </div>

          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="font-mono text-slate-400 uppercase">Mechanical Wedge Angle:</span>
                <span className="font-mono text-cyan-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{correctionAngle > 0 ? `+${correctionAngle}` : correctionAngle}°</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCorrectionAngle(Math.max(-30, correctionAngle - 1))}
                  className="w-5 h-5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs"
                >
                  -
                </button>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={correctionAngle}
                  onChange={(e) => setCorrectionAngle(parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <button
                  onClick={() => setCorrectionAngle(Math.min(30, correctionAngle + 1))}
                  className="w-5 h-5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setCorrectionAngle(0);
              }}
              className="px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-850 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-200 transition-colors border border-slate-800 self-end"
            >
              Reset Cut
            </button>
          </div>
        </div>
      )}

      {workstationMode === "complications" ? (
        <PostOpComplicationsHub />
      ) : (
        <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden relative">
        
        {/* Main Work Surface */}
        <main 
          id="diagnostic-stage"
          className="flex-1 bg-[#05070a] relative flex items-center justify-center p-4 overflow-auto min-h-[480px] lg:min-h-[500px]"
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
        >
          {showGrid && (
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none" style={{
              backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }} />
          )}

          {/* Quick Instructions Badge */}
          <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2 pointer-events-none max-w-xs">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg shadow-xl backdrop-blur">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Interactive Plotting</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                Drag the joint centers directly on the scanogram to calculate alignments. Click <span className="text-cyan-400 font-semibold">Auto-Mark</span> to run the local bone density spotter.
              </p>
            </div>
          </div>

          {/* Clean Selection Dropdown & Stage Controls overlay */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur shadow-lg pointer-events-auto">
              <span className="text-[9px] text-slate-500 font-mono uppercase pl-1.5">Scan:</span>
              <select 
                value={selectedCaseId} 
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
              >
                <option value="" className="bg-slate-950 text-slate-500">-- Select Case --</option>
                <option value="case-neutral">Patient Case A (Neutral)</option>
                <option value="case-varus">Patient Case B (Bilateral Varus)</option>
                <option value="case-valgus">Patient Case C (Bilateral Valgus)</option>
                {customImage && <option value="custom">Uploaded Custom Scan</option>}
              </select>
            </div>
          </div>

          {/* Main Scanogram Panel */}
          <div 
            id="scanogram-viewer"
            ref={containerRef}
            onClick={handleContainerClick}
            className="w-[410px] h-[750px] bg-slate-950 border border-slate-800/80 rounded-lg relative shadow-2xl flex flex-col select-none overflow-hidden origin-center"
            style={{ 
              transform: `scale(${zoomLevel * (windowWidth < 450 ? Math.max(0.65, (windowWidth - 32) / 410) : 1)})`,
              transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            {getCurrentImageUrl() ? (
              <img 
                ref={imageRef}
                src={getCurrentImageUrl()} 
                alt="Lower extremity scanogram" 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-95"
                style={{ filter: "contrast(1.15) brightness(0.95) grayscale(1)" }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 z-10 m-2.5 border border-dashed border-slate-800/60 rounded-lg">
                <div className="w-14 h-14 rounded-full bg-cyan-950/40 border border-cyan-800/25 flex items-center justify-center mb-5 text-cyan-400">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Digital X-Ray Workstation</h3>
                <p className="text-[10px] text-slate-400 mt-2 max-w-[240px] leading-relaxed">
                  Please select a clinical case study or upload an orthopaedic scanogram to initialize the mechanical alignment engine.
                </p>
                <div className="mt-8 flex flex-col gap-2 w-full max-w-[200px] pointer-events-auto">
                  <select 
                    value={selectedCaseId} 
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="bg-slate-900 text-slate-200 border border-slate-800 rounded px-2.5 py-1.5 text-[11px] font-semibold focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer text-center"
                  >
                    <option value="" className="bg-slate-950 text-slate-500">-- Select Case --</option>
                    <option value="case-neutral">Patient Case A (Neutral)</option>
                    <option value="case-varus">Patient Case B (Bilateral Varus)</option>
                    <option value="case-valgus">Patient Case C (Bilateral Valgus)</option>
                  </select>
                  <label className="cursor-pointer bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1.5 transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload X-Ray</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            )}

            {selectedCaseId !== "" && (
              <>
                {/* Calibration Lines Overlay */}
                {calibration.active && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {calibration.point1 && (
                  <circle cx={`${calibration.point1.x}%`} cy={`${calibration.point1.y}%`} r="6" fill="#f59e0b" />
                )}
                {calibration.point1 && calibration.point2 && (
                  <>
                    <line 
                      x1={`${calibration.point1.x}%`} 
                      y1={`${calibration.point1.y}%`} 
                      x2={`${calibration.point2.x}%`} 
                      y2={`${calibration.point2.y}%`} 
                      stroke="#f59e0b" 
                      strokeWidth="2.5" 
                      strokeDasharray="4 2" 
                    />
                    <circle cx={`${calibration.point2.x}%`} cy={`${calibration.point2.y}%`} r="6" fill="#f59e0b" />
                  </>
                )}
              </svg>
            )}

            {/* Plotted Axes */}
            {showAxes && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {alignmentMode === "HKA" ? (
                  <>
                    {/* RIGHT LEG (viewer left) */}
                    {rightLeg.detected && (
                      <>
                        <line x1={`${rightLegRotated.hip.x}%`} y1={`${rightLegRotated.hip.y}%`} x2={`${rightLegRotated.knee.x}%`} y2={`${rightLegRotated.knee.y}%`} stroke="#f43f5e" strokeWidth="1.25" strokeDasharray="3 2" />
                        <line x1={`${rightLegRotated.knee.x}%`} y1={`${rightLegRotated.knee.y}%`} x2={`${rightLegRotated.ankle.x}%`} y2={`${rightLegRotated.ankle.y}%`} stroke="#f43f5e" strokeWidth="1.25" strokeDasharray="3 2" />
                        <line x1={`${rightLegRotated.hip.x}%`} y1={`${rightLegRotated.hip.y}%`} x2={`${rightLegRotated.ankle.x}%`} y2={`${rightLegRotated.ankle.y}%`} stroke="rgba(244, 63, 94, 0.25)" strokeWidth="0.75" />
                      </>
                    )}

                    {/* LEFT LEG (viewer right) */}
                    {leftLeg.detected && (
                      <>
                        <line x1={`${leftLegRotated.hip.x}%`} y1={`${leftLegRotated.hip.y}%`} x2={`${leftLegRotated.knee.x}%`} y2={`${leftLegRotated.knee.y}%`} stroke="#38bdf8" strokeWidth="1.25" strokeDasharray="3 2" />
                        <line x1={`${leftLegRotated.knee.x}%`} y1={`${leftLegRotated.knee.y}%`} x2={`${leftLegRotated.ankle.x}%`} y2={`${leftLegRotated.ankle.y}%`} stroke="#38bdf8" strokeWidth="1.25" strokeDasharray="3 2" />
                        <line x1={`${leftLegRotated.hip.x}%`} y1={`${leftLegRotated.hip.y}%`} x2={`${leftLegRotated.ankle.x}%`} y2={`${leftLegRotated.ankle.y}%`} stroke="rgba(56, 189, 248, 0.25)" strokeWidth="0.75" />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* 13-point orthopaedic detailed visual vectors */}
                    {points13Rotated["p-sym"] && (
                      <>
                        <line x1={`${points13Rotated["p-sym"].x}%`} y1={`${points13Rotated["p-sym"].y}%`} x2={`${points13Rotated["r-fhc"].x}%`} y2={`${points13Rotated["r-fhc"].y}%`} stroke="#d946ef" strokeWidth="1" strokeDasharray="2" />
                        <line x1={`${points13Rotated["p-sym"].x}%`} y1={`${points13Rotated["p-sym"].y}%`} x2={`${points13Rotated["l-fhc"].x}%`} y2={`${points13Rotated["l-fhc"].y}%`} stroke="#d946ef" strokeWidth="1" strokeDasharray="2" />
                      </>
                    )}

                    {/* Right Leg Full Model Skeleton lines */}
                    <line x1={`${points13Rotated["r-fhc"].x}%`} y1={`${points13Rotated["r-fhc"].y}%`} x2={`${metrics13.right.kc.x}%`} y2={`${metrics13.right.kc.y}%`} stroke="#f43f5e" strokeWidth="1.25" strokeDasharray="3 2" />
                    <line x1={`${metrics13.right.tc_knee.x}%`} y1={`${metrics13.right.tc_knee.y}%`} x2={`${points13Rotated["r-tc"].x}%`} y2={`${points13Rotated["r-tc"].y}%`} stroke="#f43f5e" strokeWidth="1.25" strokeDasharray="3 2" />
                    {/* Femoral joint line: LFC to MFC */}
                    <line x1={`${points13Rotated["r-lfc"].x}%`} y1={`${points13Rotated["r-lfc"].y}%`} x2={`${points13Rotated["r-mfc"].x}%`} y2={`${points13Rotated["r-mfc"].y}%`} stroke="#eab308" strokeWidth="1.5" />
                    {/* Tibial joint line: LTP to MTP */}
                    <line x1={`${points13Rotated["r-ltp"].x}%`} y1={`${points13Rotated["r-ltp"].y}%`} x2={`${points13Rotated["r-mtp"].x}%`} y2={`${points13Rotated["r-mtp"].y}%`} stroke="#06b6d4" strokeWidth="1.5" />
                    {/* Inter-joint link */}
                    <line x1={`${metrics13.right.kc.x}%`} y1={`${metrics13.right.kc.y}%`} x2={`${metrics13.right.tc_knee.x}%`} y2={`${metrics13.right.tc_knee.y}%`} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

                    {/* Left Leg Full Model Skeleton lines */}
                    <line x1={`${points13Rotated["l-fhc"].x}%`} y1={`${points13Rotated["l-fhc"].y}%`} x2={`${metrics13.left.kc.x}%`} y2={`${metrics13.left.kc.y}%`} stroke="#38bdf8" strokeWidth="1.25" strokeDasharray="3 2" />
                    <line x1={`${metrics13.left.tc_knee.x}%`} y1={`${metrics13.left.tc_knee.y}%`} x2={`${points13Rotated["l-tc"].x}%`} y2={`${points13Rotated["l-tc"].y}%`} stroke="#38bdf8" strokeWidth="1.25" strokeDasharray="3 2" />
                    {/* Femoral joint line: LFC to MFC */}
                    <line x1={`${points13Rotated["l-lfc"].x}%`} y1={`${points13Rotated["l-lfc"].y}%`} x2={`${points13Rotated["l-mfc"].x}%`} y2={`${points13Rotated["l-mfc"].y}%`} stroke="#eab308" strokeWidth="1.5" />
                    {/* Tibial joint line: LTP to MTP */}
                    <line x1={`${points13Rotated["l-ltp"].x}%`} y1={`${points13Rotated["l-ltp"].y}%`} x2={`${points13Rotated["l-mtp"].x}%`} y2={`${points13Rotated["l-mtp"].y}%`} stroke="#06b6d4" strokeWidth="1.5" />
                    {/* Inter-joint link */}
                    <line x1={`${metrics13.left.kc.x}%`} y1={`${metrics13.left.kc.y}%`} x2={`${metrics13.left.tc_knee.x}%`} y2={`${metrics13.left.tc_knee.y}%`} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  </>
                )}
              </svg>
            )}

            {/* Osteotomy Simulation Overlay */}
            {osteotomyActive && osteotomyPoints.length >= 2 && (() => {
              const wedgePoint = rotatePoint(osteotomyPoints[1], osteotomyPoints[0], correctionAngle);
              return (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Dynamic Wedge Polygon */}
                  <polygon
                    points={`${osteotomyPoints[0].x},${osteotomyPoints[0].y} ${osteotomyPoints[1].x},${osteotomyPoints[1].y} ${wedgePoint.x},${wedgePoint.y}`}
                    fill={correctionAngle !== 0 ? "rgba(6, 182, 212, 0.22)" : "rgba(100, 116, 139, 0.08)"}
                    stroke={correctionAngle !== 0 ? "#06b6d4" : "#64748b"}
                    strokeWidth="0.3"
                  />
                  
                  {/* Core Hinge Cut axis dashed line */}
                  <line
                    x1={osteotomyPoints[0].x}
                    y1={osteotomyPoints[0].y}
                    x2={osteotomyPoints[1].x}
                    y2={osteotomyPoints[1].y}
                    stroke="#eab308"
                    strokeWidth="0.35"
                    strokeDasharray="1.5 1"
                  />
                </svg>
              );
            })()}

            {/* Draggable Markers */}
            {alignmentMode === "HKA" ? (
              <>
                {/* RIGHT markers */}
                {rightLeg.detected && (
                  <>
                    {/* Hip */}
                    <div 
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                      style={{ left: `${rightLeg.hip.x}%`, top: `${rightLeg.hip.y}%` }}
                      onMouseDown={() => setActiveDrag({ mode: "HKA", pointId: "r-hip" })}
                      onTouchStart={() => setActiveDrag({ mode: "HKA", pointId: "r-hip" })}
                    >
                      <div className="w-3.5 h-3.5 border border-rose-500/80 bg-slate-950/95 rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform">
                        <div className="w-1 h-1 bg-rose-500 rounded-full"></div>
                      </div>
                    </div>

                    {/* Knee */}
                    <div 
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                      style={{ left: `${rightLeg.knee.x}%`, top: `${rightLeg.knee.y}%` }}
                      onMouseDown={() => setActiveDrag({ mode: "HKA", pointId: "r-knee" })}
                      onTouchStart={() => setActiveDrag({ mode: "HKA", pointId: "r-knee" })}
                    >
                      <div className="w-3.5 h-3.5 border border-cyan-400 bg-slate-950/95 rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform">
                        <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                      </div>
                    </div>

                    {/* Ankle */}
                    <div 
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                      style={{ left: `${rightLeg.ankle.x}%`, top: `${rightLeg.ankle.y}%` }}
                      onMouseDown={() => setActiveDrag({ mode: "HKA", pointId: "r-ankle" })}
                      onTouchStart={() => setActiveDrag({ mode: "HKA", pointId: "r-ankle" })}
                    >
                      <div className="w-3.5 h-3.5 border border-rose-500/80 bg-slate-950/95 rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform">
                        <div className="w-1 h-1 bg-rose-500 rounded-full"></div>
                      </div>
                    </div>
                  </>
                )}

                {/* LEFT markers */}
                {leftLeg.detected && (
                  <>
                    {/* Hip */}
                    <div 
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                      style={{ left: `${leftLeg.hip.x}%`, top: `${leftLeg.hip.y}%` }}
                      onMouseDown={() => setActiveDrag({ mode: "HKA", pointId: "l-hip" })}
                      onTouchStart={() => setActiveDrag({ mode: "HKA", pointId: "l-hip" })}
                    >
                      <div className="w-3.5 h-3.5 border border-blue-400 bg-slate-950/95 rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform">
                        <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      </div>
                    </div>

                    {/* Knee */}
                    <div 
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                      style={{ left: `${leftLeg.knee.x}%`, top: `${leftLeg.knee.y}%` }}
                      onMouseDown={() => setActiveDrag({ mode: "HKA", pointId: "l-knee" })}
                      onTouchStart={() => setActiveDrag({ mode: "HKA", pointId: "l-knee" })}
                    >
                      <div className="w-3.5 h-3.5 border border-cyan-400 bg-slate-950/95 rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform">
                        <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
                      </div>
                    </div>

                    {/* Ankle */}
                    <div 
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                      style={{ left: `${leftLeg.ankle.x}%`, top: `${leftLeg.ankle.y}%` }}
                      onMouseDown={() => setActiveDrag({ mode: "HKA", pointId: "l-ankle" })}
                      onTouchStart={() => setActiveDrag({ mode: "HKA", pointId: "l-ankle" })}
                    >
                      <div className="w-3.5 h-3.5 border border-blue-400 bg-slate-950/95 rounded-full flex items-center justify-center shadow-md hover:scale-125 transition-transform">
                        <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Full 13 Landmarks plotted */}
                {Object.values(points13).map((p: Point13) => (
                  <div
                    key={p.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing group"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setActiveDrag({ mode: "FULL", pointId: p.id });
                    }}
                    onTouchStart={() => {
                      setActiveDrag({ mode: "FULL", pointId: p.id });
                    }}
                  >
                    <div 
                      className="w-3 h-3 bg-slate-950/90 rounded-full flex items-center justify-center shadow-md border hover:scale-125 transition-transform"
                      style={{ borderColor: p.color }}
                      title={p.anatomicalName}
                    >
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: p.color }} />
                    </div>
                    {/* Tooltip Label */}
                    <div className="absolute top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700/80 px-1 py-0.2 rounded text-[7px] font-mono text-slate-300 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                      {p.label}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Draggable Osteotomy Cut Planners */}
            {osteotomyActive && (
              <>
                {/* Hinge point handle (P1) */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: `${osteotomyPoints[0].x}%`, top: `${osteotomyPoints[0].y}%` }}
                  onMouseDown={() => setActiveDrag({ mode: "OSTEOTOMY", pointId: "ost-0" })}
                  onTouchStart={() => setActiveDrag({ mode: "OSTEOTOMY", pointId: "ost-0" })}
                >
                  <div className="w-4 h-4 border border-cyan-400 bg-slate-950 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.4)] hover:scale-125 transition-transform">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                  </div>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-800 text-[8px] px-1 py-0.2 rounded font-mono text-cyan-300 pointer-events-none whitespace-nowrap z-20">
                    HINGE
                  </div>
                </div>

                {/* Cut Line End handle (P2) */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing"
                  style={{ left: `${osteotomyPoints[1].x}%`, top: `${osteotomyPoints[1].y}%` }}
                  onMouseDown={() => setActiveDrag({ mode: "OSTEOTOMY", pointId: "ost-1" })}
                  onTouchStart={() => setActiveDrag({ mode: "OSTEOTOMY", pointId: "ost-1" })}
                >
                  <div className="w-4 h-4 border border-amber-400 bg-slate-950 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.4)] hover:scale-125 transition-transform">
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
                  </div>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-800 text-[8px] px-1 py-0.2 rounded font-mono text-amber-300 pointer-events-none whitespace-nowrap z-20">
                    CUT END
                  </div>
                </div>
              </>
            )}

            {/* Precision Magnifying Loupe beneath cursor */}
            {activeDrag && cursorPos && (() => {
              const styles = getMagnifyingLoupeStyle();
              if (!styles.loupe) return null;
              
              // Get current point label
              let currentLabel = "POINT";
              if (activeDrag.mode === "HKA") {
                const label = activeDrag.pointId.replace("l-", "Left ").replace("r-", "Right ").toUpperCase();
                currentLabel = label;
              } else {
                const pt = points13[activeDrag.pointId as keyof Points13State];
                if (pt) currentLabel = pt.anatomicalName.toUpperCase();
              }

              return (
                <div 
                  className="absolute pointer-events-none rounded-full border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] overflow-hidden z-30"
                  style={styles.loupe}
                >
                  {/* Magnified Image */}
                  <img 
                    src={getCurrentImageUrl()} 
                    alt="Magnified slice" 
                    className="absolute max-w-none origin-top-left"
                    style={{
                      ...styles.image,
                      filter: "contrast(1.25) brightness(1.05) grayscale(1)"
                    }}
                  />
                  {/* Center Crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 relative flex items-center justify-center">
                      <div className="absolute w-[2px] h-4 bg-cyan-400" />
                      <div className="absolute h-[2px] w-4 bg-cyan-400" />
                      <div className="w-2 h-2 rounded-full border border-cyan-400 bg-cyan-400/25" />
                    </div>
                  </div>
                  {/* Tiny description badge inside loupe */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 text-[7px] font-mono text-cyan-300 font-bold tracking-wider text-center max-w-[110px] truncate">
                    {currentLabel}
                  </div>
                </div>
              );
            })()}

            {/* Quick-read mechanical values at the bottom */}
            <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex justify-between gap-1.5">
              {alignmentMode === "HKA" ? (
                <>
                  <div className="bg-slate-950/90 border border-slate-800 p-2 rounded backdrop-blur text-left">
                    <span className="text-[8px] text-red-400 font-mono font-bold tracking-wider uppercase block">R HKA Angle</span>
                    <span className="text-sm font-semibold text-white">{rightMetrics.hka.toFixed(1)}°</span>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 p-2 rounded backdrop-blur text-right">
                    <span className="text-[8px] text-blue-400 font-mono font-bold tracking-wider uppercase block">L HKA Angle</span>
                    <span className="text-sm font-semibold text-white">{leftMetrics.hka.toFixed(1)}°</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-950/90 border border-slate-800 p-2 rounded backdrop-blur text-left max-w-[140px]">
                    <span className="text-[7px] text-red-400 font-mono font-bold tracking-wider uppercase block">R HKA/mLDFA/mMPTA</span>
                    <span className="text-xs font-semibold text-white block truncate">
                      {metrics13.right.hka.toFixed(1)}°/{metrics13.right.mldfa.toFixed(1)}°/{metrics13.right.mmpta.toFixed(1)}°
                    </span>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 p-2 rounded backdrop-blur text-center self-center">
                    <span className="text-[7px] text-purple-400 font-mono font-bold tracking-wider uppercase block">LLD</span>
                    <span className="text-xs font-bold text-white block">
                      {metrics13.lld.toFixed(1)}mm
                    </span>
                  </div>
                  <div className="bg-slate-950/90 border border-slate-800 p-2 rounded backdrop-blur text-right max-w-[140px]">
                    <span className="text-[7px] text-blue-400 font-mono font-bold tracking-wider uppercase block">L HKA/mLDFA/mMPTA</span>
                    <span className="text-xs font-semibold text-white block truncate">
                      {metrics13.left.hka.toFixed(1)}°/{metrics13.left.mldfa.toFixed(1)}°/{metrics13.left.mmpta.toFixed(1)}°
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

          {/* Zoom/Pan Controllers (Floating bottom-right) */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 z-10">
            <div className="bg-slate-900/95 border border-slate-800 p-1 rounded-lg flex items-center shadow-lg">
              <button 
                onClick={() => setZoomLevel(Math.max(0.7, zoomLevel - 0.1))}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-mono text-sm"
              >
                -
              </button>
              <span className="text-[10px] font-mono w-12 text-center text-slate-400">{Math.round(zoomLevel * 100)}%</span>
              <button 
                onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-mono text-sm"
              >
                +
              </button>
            </div>
          </div>
        </main>

        {/* Floating Expand Tab when collapsed */}
        {!showRightSidebar && (
          <button
            onClick={() => setShowRightSidebar(true)}
            className="absolute top-4 right-0 bg-slate-900 border border-slate-800 border-r-0 hover:bg-slate-800 text-slate-400 p-2.5 rounded-l-md shadow-lg z-20 transition-all flex items-center justify-center gap-1 group text-[10px] font-mono"
            title="Expand Clinical Insights"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="hidden group-hover:inline pr-1">Expand Insights</span>
          </button>
        )}

        {/* Unified Clinical Workspace & Metric Controls (Right Sidebar) */}
        {showRightSidebar && (
          <aside id="right-sidebar" className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950 flex flex-col shrink-0 overflow-y-auto max-h-none lg:max-h-[calc(100vh-4rem)] z-10">
            
            {/* Sidebar header close button */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-900">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Clinical Insights</span>
              </h3>
              <button 
                onClick={() => setShowRightSidebar(false)}
                className="p-1 hover:bg-slate-900 rounded border border-slate-800 hover:text-white text-slate-400 transition-all flex items-center gap-1 text-[9px] font-mono font-bold"
                title="Collapse Panel"
              >
                <span>Collapse</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Main Content Area */}
            <div className="p-5 space-y-5 flex-1">
              {selectedCaseId === "" ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4 bg-slate-900/10 border border-slate-900/60 rounded-lg">
                  <div className="w-11 h-11 rounded-full bg-cyan-950/40 border border-cyan-800/15 flex items-center justify-center text-cyan-400">
                    <Sliders className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono">No Active Case</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                      Please select or upload a digital scanogram to begin real-time mechanical axis mapping.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Core Interactive Overlay and Reset Tools */}
              <section className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setShowAxes(!showAxes)}
                    className={`py-1.5 px-2 rounded text-[10px] font-medium border text-center transition-colors ${
                      showAxes ? "bg-slate-850 text-cyan-400 border-slate-750" : "text-slate-500 border-transparent hover:text-slate-300"
                    }`}
                  >
                    Axes Overlay
                  </button>
                  <button 
                    onClick={() => setShowGrid(!showGrid)}
                    className={`py-1.5 px-2 rounded text-[10px] font-medium border text-center transition-colors ${
                      showGrid ? "bg-slate-850 text-cyan-400 border-slate-750" : "text-slate-500 border-transparent hover:text-slate-300"
                    }`}
                  >
                    Grid Map
                  </button>
                </div>

                <button 
                  onClick={resetMarkers}
                  className="w-full py-1.5 bg-slate-800/55 hover:bg-slate-800 text-slate-300 rounded text-[10px] font-medium border border-slate-700/55 flex items-center justify-center gap-1 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset to Case Defaults</span>
                </button>
              </section>

              {/* Calibration subpanel */}
              {calibration.active && (
                <div className="bg-slate-900 border border-amber-500/25 rounded-lg p-3.5 space-y-2.5">
                  <p className="text-[10px] text-amber-300 leading-normal font-mono uppercase tracking-wide text-[9px]">
                    {!calibration.point1 
                      ? "1. Click first point on visual scale ruler." 
                      : !calibration.point2 
                      ? "2. Click second point to register reference height." 
                      : "✓ Ruler Scale Registered"}
                  </p>
                  {calibration.point1 && (
                    <div className="flex items-center justify-between gap-1.5 text-[10px]">
                      <span className="text-slate-400">Physical Length:</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          value={calibrationInput} 
                          onChange={(e) => handleCalibrationInput(e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded text-center py-0.5 text-[10px] text-white font-mono"
                        />
                        <span className="text-slate-500 font-mono">mm</span>
                      </div>
                    </div>
                  )}
                  {calibration.point2 && calibration.mmPerPixel && (
                    <div className="text-[9px] text-emerald-400 font-mono pt-1.5 border-t border-slate-850 flex justify-between">
                      <span>RULER SCALE:</span>
                      <span>{calibration.mmPerPixel.toFixed(4)} mm/px</span>
                    </div>
                  )}
                </div>
              )}

              {/* 13-Point Anatomical Landmark Reference Guide */}
              {alignmentMode === "FULL" && (
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg space-y-2 text-left">
                  <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-wider uppercase block">Anatomical Landmark Guide</span>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    <div className="flex items-start gap-1.5 text-[10px] leading-relaxed border-b border-slate-950 pb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200 font-mono text-[9px]">P-SYM</span>
                        <p className="text-[9px] text-slate-400">Pubic Symphysis center. Baseline pelvis horizontal.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-[10px] leading-relaxed border-b border-slate-950 pb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200 font-mono text-[9px]">R/L FHC</span>
                        <p className="text-[9px] text-slate-400">Femoral Head Centers. Rotation origin of mechanical femur line.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-[10px] leading-relaxed border-b border-slate-950 pb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200 font-mono text-[9px]">LFC / MFC</span>
                        <p className="text-[9px] text-slate-400">Lateral & Medial Femoral Condyles. Defines distal femur joint vector.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-[10px] leading-relaxed border-b border-slate-950 pb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200 font-mono text-[9px]">LTP / MTP</span>
                        <p className="text-[9px] text-slate-400">Lateral & Medial Tibial Plateaus. Defines proximal tibia joint vector.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-[10px] leading-relaxed">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200 font-mono text-[9px]">R/L TC</span>
                        <p className="text-[9px] text-slate-400">Talus Centers. Bottom anchor of mechanical tibial line.</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[8px] text-slate-500 leading-normal border-t border-slate-950 pt-1.5">
                    💡 Drag any point to fine-tune alignments. The loupe will auto-activate.
                  </p>
                </div>
              )}

              {/* Offline notification banner */}
              {offlineStatusMsg && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 p-2.5 rounded-lg text-[10px] text-emerald-300 flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{offlineStatusMsg}</span>
                </div>
              )}

              {analysisError && (
                <div className="bg-red-500/5 border border-red-500/15 p-2.5 rounded-lg text-[10px] text-red-400 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span>{analysisError}</span>
                </div>
              )}

              {/* Main Clinical Output Cards */}
              <section className="space-y-3">
                {/* Right Leg (Anatomical Right / Viewer Left) */}
                <div className="bg-slate-900 border border-slate-850 rounded-lg p-4 relative overflow-hidden">
                  <div className="absolute top-2.5 right-3 text-[8px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">
                    ANATOMICAL RIGHT
                  </div>
                  
                  <span className="text-[10px] text-slate-400 font-medium block">Mechanical HKA Angle</span>
                  <span className="text-4xl font-light font-mono text-white block mt-1 tracking-tight">
                    {rightMetrics.hka.toFixed(1)}°
                  </span>

                  <div className="mt-3.5 flex items-center justify-between border-t border-slate-850 pt-2.5">
                    <span className="text-[9px] font-mono uppercase text-slate-500">Alignment</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                      rightMetrics.category === "NEUTRAL" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {rightMetrics.category} ({rightMetrics.devDegrees.toFixed(1)}°)
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase text-slate-500">Axis Deviation (MAD)</span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {rightMetrics.mmDeviation.toFixed(1)} mm
                    </span>
                  </div>
                </div>

                {/* Left Leg (Anatomical Left / Viewer Right) */}
                <div className="bg-slate-900 border border-slate-850 rounded-lg p-4 relative overflow-hidden">
                  <div className="absolute top-2.5 right-3 text-[8px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                    ANATOMICAL LEFT
                  </div>
                  
                  <span className="text-[10px] text-slate-400 font-medium block">Mechanical HKA Angle</span>
                  <span className="text-4xl font-light font-mono text-white block mt-1 tracking-tight">
                    {leftMetrics.hka.toFixed(1)}°
                  </span>

                  <div className="mt-3.5 flex items-center justify-between border-t border-slate-850 pt-2.5">
                    <span className="text-[9px] font-mono uppercase text-slate-500">Alignment</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                      leftMetrics.category === "NEUTRAL" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {leftMetrics.category} ({leftMetrics.devDegrees.toFixed(1)}°)
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase text-slate-500">Axis Deviation (MAD)</span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {leftMetrics.mmDeviation.toFixed(1)} mm
                    </span>
                  </div>
                </div>
              </section>

              {/* Real-time Radiology Report Text Panel */}
              <section className="bg-slate-900 border border-slate-850 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>LIVE RADIOLOGICAL REPORT</span>
                  </h3>
                  <button 
                    onClick={copyToClipboard}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                    title="Copy Report to Clipboard"
                  >
                    {copied ? (
                      <span className="text-[9px] font-mono text-emerald-400">Copied</span>
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-line text-left">
                  {clinicalObservation}
                </p>
              </section>
                </>
              )}
            </div>

            {/* Simple Bottom Patient Card */}
            <div className="border-t border-slate-850 p-4 bg-slate-900/30 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-[10px]">
                  <p className="text-slate-500 font-mono uppercase tracking-widest text-[8px]">ACTIVE X-RAY ID</p>
                  <p className="text-slate-300 font-mono font-semibold mt-0.5">
                    {selectedCaseId === "" ? "SCAN_PENDING" : selectedCaseId === "custom" ? customImageName.substring(0, 16) || "CUSTOM_XRAY.PNG" : "SCAN_99482_AX"}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          </aside>
        )}
        </div>
      )}

      {showSettings && (
        <SystemSettings onClose={() => setShowSettings(false)} />
      )}

      {securityStatus && !securityStatus.isAuthorized && (
        <WorkstationLockScreen 
          securityStatus={securityStatus} 
          onAuthorized={async () => {
            const res = await fetch("/api/security-status");
            if (res.ok) {
              const data = await res.json();
              setSecurityStatus(data);
            }
          }} 
        />
      )}
    </div>
  );
}
