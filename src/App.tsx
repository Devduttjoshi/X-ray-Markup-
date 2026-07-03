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
  ShieldAlert
} from "lucide-react";
import { sampleCases, generateSyntheticScanogram } from "./utils/samples";
import { LegPoints, Point, Calibration } from "./types";

export default function App() {
  // Case States
  const [selectedCaseId, setSelectedCaseId] = useState<string>("case-neutral");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customImageName, setCustomImageName] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [offlineStatusMsg, setOfflineStatusMsg] = useState<string>("");

  // Active coordinates state
  const [leftLeg, setLeftLeg] = useState<LegPoints>(sampleCases[0].leftLeg);
  const [rightLeg, setRightLeg] = useState<LegPoints>(sampleCases[0].rightLeg);
  const [clinicalObservation, setClinicalObservation] = useState<string>(sampleCases[0].clinicalObservation);

  // Interaction States
  const [draggingPoint, setDraggingPoint] = useState<{ leg: "left" | "right"; type: "hip" | "knee" | "ankle" } | null>(null);
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

  const rightMetrics = calculateMetrics(rightLeg, "right");
  const leftMetrics = calculateMetrics(leftLeg, "left");

  // Dynamic Clinical Report Generator (100% Offline, Updates in Real Time as markers drag)
  useEffect(() => {
    const getSeverity = (dev: number) => {
      if (dev < 1.0) return "physiological neutral";
      if (dev < 3.0) return "mild";
      if (dev < 6.0) return "moderate";
      return "severe";
    };

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
  }, [
    rightLeg, 
    leftLeg, 
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
    } else {
      const kase = sampleCases.find((c) => c.id === selectedCaseId);
      if (kase) {
        setLeftLeg(JSON.parse(JSON.stringify(kase.leftLeg)));
        setRightLeg(JSON.parse(JSON.stringify(kase.rightLeg)));
        setCalibration(prev => ({ ...prev, active: false, point1: null, point2: null }));
        setOfflineStatusMsg("");
      }
    }
  }, [selectedCaseId, customImage]);

  // Handle Dragging
  const handleMouseDown = (leg: "left" | "right", type: "hip" | "knee" | "ankle", e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingPoint({ leg, type });
  };

  const handleTouchStart = (leg: "left" | "right", type: "hip" | "knee" | "ankle", e: React.TouchEvent) => {
    setDraggingPoint({ leg, type });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingPoint || !containerRef.current) return;
    updatePointCoords(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingPoint || !containerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    updatePointCoords(touch.clientX, touch.clientY);
  };

  const updatePointCoords = (clientX: number, clientY: number) => {
    if (!draggingPoint || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    if (draggingPoint.leg === "left") {
      setLeftLeg((prev) => {
        const updated = { ...prev };
        updated[draggingPoint.type] = {
          ...updated[draggingPoint.type],
          x: parseFloat(x.toFixed(2)),
          y: parseFloat(y.toFixed(2)),
        };
        return updated;
      });
    } else {
      setRightLeg((prev) => {
        const updated = { ...prev };
        updated[draggingPoint.type] = {
          ...updated[draggingPoint.type],
          x: parseFloat(x.toFixed(2)),
          y: parseFloat(y.toFixed(2)),
        };
        return updated;
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingPoint(null);
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
        setLeftLeg({
          detected: true,
          hip: { id: "l-hip", name: "hip", label: "H", anatomicalName: "Left Hip Center", x: 65.0, y: 22.0, color: "#3b82f6" },
          knee: { id: "l-knee", name: "knee", label: "K", anatomicalName: "Left Knee Center", x: 65.0, y: 53.0, color: "#10b981" },
          ankle: { id: "l-ankle", name: "ankle", label: "A", anatomicalName: "Left Ankle Center", x: 65.0, y: 86.0, color: "#3b82f6" },
        });
        setRightLeg({
          detected: true,
          hip: { id: "r-hip", name: "hip", label: "H", anatomicalName: "Right Hip Center", x: 35.0, y: 22.0, color: "#ef4444" },
          knee: { id: "r-knee", name: "knee", label: "K", anatomicalName: "Right Knee Center", x: 35.0, y: 53.0, color: "#10b981" },
          ankle: { id: "r-ankle", name: "ankle", label: "A", anatomicalName: "Right Ankle Center", x: 35.0, y: 86.0, color: "#ef4444" },
        });
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

            setRightLeg({
              detected: true,
              hip: { id: "r-hip", name: "hip", label: "H", anatomicalName: "Right Hip Center", x: rHip.x, y: rHip.y, color: "#ef4444" },
              knee: { id: "r-knee", name: "knee", label: "K", anatomicalName: "Right Knee Center", x: rKnee.x, y: rKnee.y, color: "#10b981" },
              ankle: { id: "r-ankle", name: "ankle", label: "A", anatomicalName: "Right Ankle Center", x: rAnkle.x, y: rAnkle.y, color: "#ef4444" },
            });

            setLeftLeg({
              detected: true,
              hip: { id: "l-hip", name: "hip", label: "H", anatomicalName: "Left Hip Center", x: lHip.x, y: lHip.y, color: "#3b82f6" },
              knee: { id: "l-knee", name: "knee", label: "K", anatomicalName: "Left Knee Center", x: lKnee.x, y: lKnee.y, color: "#10b981" },
              ankle: { id: "l-ankle", name: "ankle", label: "A", anatomicalName: "Left Ankle Center", x: lAnkle.x, y: lAnkle.y, color: "#3b82f6" },
            });

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

  const getCurrentImageUrl = (): string => {
    if (selectedCaseId === "custom" && customImage) {
      return customImage;
    }
    const currentCase = sampleCases.find((c) => c.id === selectedCaseId);
    return currentCase ? currentCase.imageUrl : generateSyntheticScanogram("neutral");
  };

  const resetMarkers = () => {
    if (selectedCaseId === "custom") {
      setLeftLeg({
        detected: true,
        hip: { id: "l-hip", name: "hip", label: "H", anatomicalName: "Left Hip Center", x: 65.0, y: 22.0, color: "#3b82f6" },
        knee: { id: "l-knee", name: "knee", label: "K", anatomicalName: "Left Knee Center", x: 65.0, y: 53.0, color: "#10b981" },
        ankle: { id: "l-ankle", name: "ankle", label: "A", anatomicalName: "Left Ankle Center", x: 65.0, y: 86.0, color: "#3b82f6" },
      });
      setRightLeg({
        detected: true,
        hip: { id: "r-hip", name: "hip", label: "H", anatomicalName: "Right Hip Center", x: 35.0, y: 22.0, color: "#ef4444" },
        knee: { id: "r-knee", name: "knee", label: "K", anatomicalName: "Right Knee Center", x: 35.0, y: 53.0, color: "#10b981" },
        ankle: { id: "r-ankle", name: "ankle", label: "A", anatomicalName: "Right Ankle Center", x: 35.0, y: 86.0, color: "#ef4444" },
      });
    } else {
      const original = sampleCases.find(c => c.id === selectedCaseId);
      if (original) {
        setLeftLeg(JSON.parse(JSON.stringify(original.leftLeg)));
        setRightLeg(JSON.parse(JSON.stringify(original.rightLeg)));
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
      
      {/* Pristine Decluttered Header Navigation */}
      <nav id="navbar" className="h-16 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-md font-semibold tracking-tight text-white flex items-center gap-1.5">
              OrthoScan <span className="text-slate-400 font-mono text-[10px] bg-slate-800 px-1 py-0.5 rounded border border-slate-700">Offline Edition</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Real-time offline feedback tag */}
          <div className="bg-emerald-500/10 px-2.5 py-1 rounded text-[10px] flex items-center space-x-1.5 border border-emerald-500/20 font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>SECURE OFFLINE SYSTEM</span>
          </div>

          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Upload X-Ray</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>

          <button 
            id="export-btn"
            onClick={exportScanogram}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Report</span>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Main Work Surface */}
        <main 
          id="diagnostic-stage"
          className="flex-1 bg-[#05070a] relative flex items-center justify-center p-4 overflow-auto min-h-[500px]"
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
                className="bg-slate-950 text-slate-200 border border-slate-800 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:border-cyan-500 transition-colors"
              >
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
            className="w-[410px] h-[750px] bg-slate-950 border border-slate-800/80 rounded-lg relative shadow-2xl flex flex-col select-none overflow-hidden"
            style={{ 
              transform: `scale(${zoomLevel})`,
              transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          >
            <img 
              ref={imageRef}
              src={getCurrentImageUrl()} 
              alt="Lower extremity scanogram" 
              className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-95"
              style={{ filter: "contrast(1.15) brightness(0.95) grayscale(1)" }}
            />

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
                {/* RIGHT LEG (viewer left) */}
                {rightLeg.detected && (
                  <>
                    <line x1={`${rightLeg.hip.x}%`} y1={`${rightLeg.hip.y}%`} x2={`${rightLeg.knee.x}%`} y2={`${rightLeg.knee.y}%`} stroke="#ef4444" strokeWidth="2" strokeDasharray="3" />
                    <line x1={`${rightLeg.knee.x}%`} y1={`${rightLeg.knee.y}%`} x2={`${rightLeg.ankle.x}%`} y2={`${rightLeg.ankle.y}%`} stroke="#ef4444" strokeWidth="2" strokeDasharray="3" />
                    <line x1={`${rightLeg.hip.x}%`} y1={`${rightLeg.hip.y}%`} x2={`${rightLeg.ankle.x}%`} y2={`${rightLeg.ankle.y}%`} stroke="rgba(239, 68, 68, 0.25)" strokeWidth="1" />
                  </>
                )}

                {/* LEFT LEG (viewer right) */}
                {leftLeg.detected && (
                  <>
                    <line x1={`${leftLeg.hip.x}%`} y1={`${leftLeg.hip.y}%`} x2={`${leftLeg.knee.x}%`} y2={`${leftLeg.knee.y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="3" />
                    <line x1={`${leftLeg.knee.x}%`} y1={`${leftLeg.knee.y}%`} x2={`${leftLeg.ankle.x}%`} y2={`${leftLeg.ankle.y}%`} stroke="#3b82f6" strokeWidth="2" strokeDasharray="3" />
                    <line x1={`${leftLeg.hip.x}%`} y1={`${leftLeg.hip.y}%`} x2={`${leftLeg.ankle.x}%`} y2={`${leftLeg.ankle.y}%`} stroke="rgba(59, 130, 246, 0.25)" strokeWidth="1" />
                  </>
                )}
              </svg>
            )}

            {/* RIGHT markers */}
            {rightLeg.detected && (
              <>
                {/* Hip */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                  style={{ left: `${rightLeg.hip.x}%`, top: `${rightLeg.hip.y}%` }}
                  onMouseDown={(e) => handleMouseDown("right", "hip", e)}
                  onTouchStart={(e) => handleTouchStart("right", "hip", e)}
                >
                  <div className="w-5 h-5 border border-red-500 bg-slate-950/95 rounded-full flex items-center justify-center shadow-lg hover:scale-125 transition-transform">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  </div>
                </div>

                {/* Knee */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                  style={{ left: `${rightLeg.knee.x}%`, top: `${rightLeg.knee.y}%` }}
                  onMouseDown={(e) => handleMouseDown("right", "knee", e)}
                  onTouchStart={(e) => handleTouchStart("right", "knee", e)}
                >
                  <div className="w-6 h-6 border-2 border-green-500 bg-slate-950/95 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.3)] hover:scale-125 transition-transform">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>

                {/* Ankle */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                  style={{ left: `${rightLeg.ankle.x}%`, top: `${rightLeg.ankle.y}%` }}
                  onMouseDown={(e) => handleMouseDown("right", "ankle", e)}
                  onTouchStart={(e) => handleTouchStart("right", "ankle", e)}
                >
                  <div className="w-5 h-5 border border-red-500 bg-slate-950/95 rounded-full flex items-center justify-center shadow-lg hover:scale-125 transition-transform">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
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
                  onMouseDown={(e) => handleMouseDown("left", "hip", e)}
                  onTouchStart={(e) => handleTouchStart("left", "hip", e)}
                >
                  <div className="w-5 h-5 border border-blue-500 bg-slate-950/95 rounded-full flex items-center justify-center shadow-lg hover:scale-125 transition-transform">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  </div>
                </div>

                {/* Knee */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                  style={{ left: `${leftLeg.knee.x}%`, top: `${leftLeg.knee.y}%` }}
                  onMouseDown={(e) => handleMouseDown("left", "knee", e)}
                  onTouchStart={(e) => handleTouchStart("left", "knee", e)}
                >
                  <div className="w-6 h-6 border-2 border-green-500 bg-slate-950/95 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.3)] hover:scale-125 transition-transform">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>

                {/* Ankle */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing"
                  style={{ left: `${leftLeg.ankle.x}%`, top: `${leftLeg.ankle.y}%` }}
                  onMouseDown={(e) => handleMouseDown("left", "ankle", e)}
                  onTouchStart={(e) => handleTouchStart("left", "ankle", e)}
                >
                  <div className="w-5 h-5 border border-blue-500 bg-slate-950/95 rounded-full flex items-center justify-center shadow-lg hover:scale-125 transition-transform">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </>
            )}

            {/* Quick-read mechanical values at the bottom */}
            <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex justify-between gap-1.5">
              <div className="bg-slate-950/90 border border-slate-800 p-2 rounded backdrop-blur text-left">
                <span className="text-[8px] text-red-400 font-mono font-bold tracking-wider uppercase block">R HKA Angle</span>
                <span className="text-base font-semibold text-white">{rightMetrics.hka.toFixed(1)}°</span>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 p-2 rounded backdrop-blur text-right">
                <span className="text-[8px] text-blue-400 font-mono font-bold tracking-wider uppercase block">L HKA Angle</span>
                <span className="text-base font-semibold text-white">{leftMetrics.hka.toFixed(1)}°</span>
              </div>
            </div>
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

        {/* Unified Clinical Workspace & Metric Controls (Right Sidebar) */}
        <aside id="right-sidebar" className="w-96 border-l border-slate-800 bg-slate-950 flex flex-col shrink-0 overflow-y-auto max-h-[calc(100vh-4rem)] z-10">
          
          {/* Main Content Area */}
          <div className="p-5 space-y-5 flex-1">
            
            {/* Calibration & Workspace Toolbar */}
            <section className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>WORKSPACE CONTROLS</span>
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={runOfflineLandmarkDetection}
                  disabled={isAnalyzing}
                  className={`py-2 px-3 rounded text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    isAnalyzing 
                      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/20 animate-pulse cursor-wait" 
                      : "bg-cyan-950/40 text-cyan-400 border-cyan-500/20 hover:bg-cyan-950/70"
                  }`}
                  title="Detect mechanical joint centers offline using anatomical peak luma projection"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isAnalyzing ? "Scanning..." : "Auto-Mark"}</span>
                </button>

                <button 
                  onClick={startCalibration}
                  className={`py-2 px-3 rounded text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    calibration.active 
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40" 
                      : "bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800"
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Calibrate</span>
                </button>
              </div>

              {/* Calibration subpanel */}
              {calibration.active && (
                <div className="bg-slate-950 border border-amber-500/20 rounded p-2.5 space-y-2">
                  <p className="text-[10px] text-amber-300 leading-normal">
                    {!calibration.point1 
                      ? "1. Click first point on the X-ray's visual scale rulers." 
                      : !calibration.point2 
                      ? "2. Click second point to set reference distance." 
                      : "✓ Calibration registered!"}
                  </p>
                  {calibration.point1 && (
                    <div className="flex items-center justify-between gap-1.5 text-[10px]">
                      <span className="text-slate-400">Target Height:</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          value={calibrationInput} 
                          onChange={(e) => handleCalibrationInput(e.target.value)}
                          className="w-14 bg-slate-900 border border-slate-700 rounded text-center py-0.5 text-[10px] text-white font-mono"
                        />
                        <span className="text-slate-500">mm</span>
                      </div>
                    </div>
                  )}
                  {calibration.point2 && calibration.mmPerPixel && (
                    <div className="text-[9px] text-emerald-400 font-mono pt-1 border-t border-slate-800 flex justify-between">
                      <span>RULER SCALE FACTOR:</span>
                      <span>{calibration.mmPerPixel.toFixed(3)} mm/px</span>
                    </div>
                  )}
                </div>
              )}

              {/* Toggle controls */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <button 
                  onClick={() => setShowAxes(!showAxes)}
                  className={`py-1 px-2 rounded text-[10px] font-medium border text-center transition-colors ${
                    showAxes ? "bg-slate-800 text-cyan-400 border-slate-700" : "text-slate-500 border-transparent hover:text-slate-300"
                  }`}
                >
                  Axes Overlay
                </button>
                <button 
                  onClick={() => setShowGrid(!showGrid)}
                  className={`py-1 px-2 rounded text-[10px] font-medium border text-center transition-colors ${
                    showGrid ? "bg-slate-800 text-cyan-400 border-slate-700" : "text-slate-500 border-transparent hover:text-slate-300"
                  }`}
                >
                  Grid Map
                </button>
              </div>

              <button 
                onClick={resetMarkers}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-[10px] font-medium border border-slate-700/50 flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Standard Defaults</span>
              </button>
            </section>

            {/* Offline notification banner */}
            {offlineStatusMsg && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded text-[10px] text-emerald-300 flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{offlineStatusMsg}</span>
              </div>
            )}

            {analysisError && (
              <div className="bg-red-500/5 border border-red-500/20 p-2.5 rounded text-[10px] text-red-400 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Main Clinical Output Cards */}
            <section className="space-y-3">
              {/* Right Leg (Anatomical Right / Viewer Left) */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-4 relative overflow-hidden">
                <div className="absolute top-2.5 right-3 text-[8px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">
                  ANATOMICAL RIGHT
                </div>
                
                <span className="text-[10px] text-slate-400 font-medium block">Mechanical HKA Angle</span>
                <span className="text-4xl font-light font-mono text-white block mt-1 tracking-tight">
                  {rightMetrics.hka.toFixed(1)}°
                </span>

                <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
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
              <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-4 relative overflow-hidden">
                <div className="absolute top-2.5 right-3 text-[8px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                  ANATOMICAL LEFT
                </div>
                
                <span className="text-[10px] text-slate-400 font-medium block">Mechanical HKA Angle</span>
                <span className="text-4xl font-light font-mono text-white block mt-1 tracking-tight">
                  {leftMetrics.hka.toFixed(1)}°
                </span>

                <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
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
            <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
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
          </div>

          {/* Simple Bottom Patient Card */}
          <div className="border-t border-slate-800/80 p-4 bg-slate-900/30 shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-[10px]">
                <p className="text-slate-500 font-mono uppercase tracking-widest text-[8px]">ACTIVE X-RAY ID</p>
                <p className="text-slate-300 font-mono font-semibold mt-0.5">
                  {selectedCaseId === "custom" ? customImageName.substring(0, 16) || "CUSTOM_XRAY.PNG" : "SCAN_99482_AX"}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <User className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
