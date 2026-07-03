import { PostOpPatient, PostOpScan } from "../types";

// Generates a beautiful, high-contrast clinical SVG illustration representing post-operative orthopedic x-rays
// depicting bones, joint implants, cement mantles, fracture lines, callus bridging, and osteolytic bone resorption zones.
export function generatePostOpSVG(params: {
  procedure: string;
  stageLabel: string;
  unionPercent: number; // 0 - 100
  osteolysis: "None" | "Mild" | "Severe";
  loosening: "Stable" | "Incipient" | "High Risk";
  cementation: "Adequate" | "Deficient" | "N/A";
  patientName: string;
  patientId: string;
  dateStr: string;
}): string {
  const {
    procedure,
    stageLabel,
    unionPercent,
    osteolysis,
    loosening,
    cementation,
    patientName,
    patientId,
    dateStr,
  } = params;

  // Render variables
  const isKnee = procedure.toLowerCase().includes("knee") || procedure.toLowerCase().includes("tka");
  const hasFracture = procedure.toLowerCase().includes("fracture") || procedure.toLowerCase().includes("orif") || procedure.toLowerCase().includes("osteotomy");

  // SVG dimensions
  const width = 800;
  const height = 1200;

  // Let's create an elegant clinical dark visual
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:#05070a; font-family: monospace;">
      <defs>
        <!-- Background grid pattern -->
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#121824" stroke-width="1.2" />
        </pattern>
        <!-- Soft radiological x-ray glow -->
        <radialGradient id="xray-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0891b2" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#05070a" stop-opacity="0" />
        </radialGradient>
        <!-- Bone gradient -->
        <linearGradient id="bone-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="15%" stop-color="#334155" />
          <stop offset="50%" stop-color="#475569" />
          <stop offset="85%" stop-color="#334155" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
        <!-- Cement gradient -->
        <linearGradient id="cement-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#64748b" stop-opacity="0.5" />
          <stop offset="50%" stop-color="#cbd5e1" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#64748b" stop-opacity="0.5" />
        </linearGradient>
        <!-- Metal Implant gradient (Titanium/Cobalt-Chrome) -->
        <linearGradient id="implant-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="25%" stop-color="#f1f5f9" />
          <stop offset="45%" stop-color="#e2e8f0" />
          <stop offset="70%" stop-color="#cbd5e1" />
          <stop offset="100%" stop-color="#475569" />
        </linearGradient>
        <!-- Blur filter for bone callus and osteolysis halos -->
        <filter id="soft-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="heavy-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <!-- Base Canvas Background -->
      <rect width="${width}" height="${height}" fill="#05070a" />
      <rect width="${width}" height="${height}" fill="url(#grid)" />
      <circle cx="${width / 2}" cy="${height / 2}" r="450" fill="url(#xray-glow)" />

      <!-- Radiology Scale / Reference Grids -->
      <g stroke="#1e293b" stroke-width="1.5">
        <line x1="100" y1="50" x2="700" y2="50" stroke-dasharray="5,5" />
        <line x1="100" y1="1150" x2="700" y2="1150" stroke-dasharray="5,5" />
        <line x1="100" y1="50" x2="100" y2="1150" stroke-dasharray="5,5" />
        <line x1="700" y1="50" x2="700" y2="1150" stroke-dasharray="5,5" />
      </g>

      <!-- Patient Header Info Overlay (Burned into the image DICOM-style) -->
      <g fill="#475569" font-size="11" transform="translate(60, 85)">
        <text x="0" y="0" font-weight="bold" fill="#06b6d4" font-size="12">DICOM WORKSTATION METADATA RECORD</text>
        <text x="0" y="20">PATIENT: <tspan fill="#e2e8f0" font-weight="bold">${patientName.toUpperCase()}</tspan></text>
        <text x="0" y="35">ID NO:   <tspan fill="#e2e8f0" font-weight="bold">${patientId.toUpperCase()}</tspan></text>
        <text x="0" y="50">DATE:    <tspan fill="#e2e8f0">${dateStr}</tspan></text>
        <text x="0" y="65">STAGE:   <tspan fill="#38bdf8" font-weight="bold">${stageLabel.toUpperCase()}</tspan></text>
        <text x="0" y="80">PROCED:  <tspan fill="#94a3b8">${procedure.toUpperCase()}</tspan></text>
      </g>

      <!-- Side Marker Overlay -->
      <g fill="#1e293b" font-weight="900" font-size="36" transform="translate(620, 100)">
        <rect width="50" height="50" fill="#0f172a" rx="4" stroke="#334155" stroke-width="1.5" />
        <text x="25" y="38" text-anchor="middle" fill="#0891b2">R</text>
      </g>

      <!-- ==================== BONE ANATOMY DRAWINGS ==================== -->

      ${isKnee ? `
        <!-- === TOTAL KNEE ARTHROPLASTY (TKA) BONE SYSTEM === -->
        
        <!-- Distal Femur (Thigh Bone) -->
        <path d="M 320 50 L 320 400 Q 320 520, 260 520 C 220 520, 240 560, 280 560 C 340 560, 360 560, 400 560 C 440 560, 460 520, 540 520 Q 480 520, 480 400 L 480 50 Z" 
              fill="url(#bone-grad)" stroke="#1e293b" stroke-width="2" />
        <!-- Intramedullary femoral canal -->
        <rect x="375" y="50" width="50" height="420" fill="#05070a" opacity="0.4" rx="4" />

        <!-- Proximal Tibia (Shin Bone) -->
        <path d="M 270 650 Q 320 650, 340 680 L 350 1150 L 450 1150 L 460 680 Q 480 650, 530 650 C 560 650, 550 610, 490 610 L 310 610 C 250 610, 240 650, 270 650 Z" 
              fill="url(#bone-grad)" stroke="#1e293b" stroke-width="2" />
        <!-- Intramedullary tibial canal -->
        <rect x="378" y="660" width="44" height="490" fill="#05070a" opacity="0.4" rx="4" />

        <!-- Fibula (Outer thin bone) -->
        <path d="M 545 690 L 535 700 Q 520 720, 520 750 L 520 1120 Q 520 1145, 545 1145 L 555 1145 Q 570 1145, 570 1120 L 570 750 Q 570 720, 555 700 Z" 
              fill="url(#bone-grad)" stroke="#1e293b" stroke-width="1.5" opacity="0.8" />
              
        <!-- ==================== CEMENT & IMPLANT LAYER (KNEE) ==================== -->
        
        <!-- Cement Under Tibial Plate (if cementation is used) -->
        ${cementation !== "N/A" ? `
          <!-- Tibial Cement Layer -->
          <rect x="300" y="608" width="200" height="15" fill="url(#cement-grad)" rx="2" />
          <!-- Bone Cement interface markers -->
          <line x1="300" y1="623" x2="500" y2="623" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.6" />
        ` : ""}

        <!-- Osteolysis Resorption Zones (Behind Cement/Tray) -->
        ${osteolysis !== "None" ? `
          <!-- Left Osteolysis zone -->
          <ellipse cx="320" cy="625" rx="${osteolysis === "Severe" ? 30 : 18}" ry="12" fill="#05070a" filter="url(#soft-blur)" />
          <path d="M 300 622 C 310 635, 330 635, 340 622" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="2,2" filter="url(#soft-blur)" />
          <!-- Right Osteolysis zone -->
          <ellipse cx="480" cy="625" rx="${osteolysis === "Severe" ? 32 : 20}" ry="14" fill="#05070a" filter="url(#soft-blur)" />
          <path d="M 460 622 C 470 637, 490 637, 500 622" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="2,2" filter="url(#soft-blur)" />
          
          <!-- Red highlighter indicator overlays -->
          <text x="260" y="635" fill="#ef4444" font-size="10" font-weight="bold" opacity="0.85">OSTEOLYSIS LYS-1</text>
          <text x="490" y="635" fill="#ef4444" font-size="10" font-weight="bold" opacity="0.85">OSTEOLYSIS LYS-2</text>
        ` : ""}

        <!-- Progressive Lucency Lines for Loosening -->
        ${loosening !== "Stable" ? `
          <!-- Medial/Lateral Progressive Lucent Lines -->
          <path d="M 290 605 L 310 618" stroke="#ef4444" stroke-width="${loosening === "High Risk" ? 3 : 1.5}" fill="none" />
          <path d="M 490 618 L 510 605" stroke="#ef4444" stroke-width="${loosening === "High Risk" ? 3 : 1.5}" fill="none" />
          <text x="${width / 2}" y="650" fill="#f59e0b" font-size="11" font-weight="bold" text-anchor="middle" letter-spacing="1">
            ${loosening === "High Risk" ? "⚠️ CLINICAL LOOSENING DETECTED" : "⚠️ INCIPIENT IMPLANT RESORPTION"}
          </text>
        ` : ""}

        <!-- TKA Metallic Femoral Shield Component -->
        <g transform="translate(0, ${loosening === "High Risk" ? -8 : 0})">
          <!-- Femoral shield curve contour -->
          <path d="M 270 510 Q 270 565, 320 565 L 480 565 Q 530 565, 530 510 Q 530 480, 500 480 L 300 480 Q 270 480, 270 510 Z" 
                fill="url(#implant-grad)" stroke="#475569" stroke-width="1.5" />
          <!-- Femoral stem peg medial -->
          <rect x="335" y="445" width="16" height="40" fill="url(#implant-grad)" rx="2" />
          <!-- Femoral stem peg lateral -->
          <rect x="445" y="445" width="16" height="40" fill="url(#implant-grad)" rx="2" />
        </g>

        <!-- TKA Metallic Tibial Tray and Stem -->
        <g transform="translate(0, ${loosening === "High Risk" ? 6 : 0}) rotate(${loosening === "High Risk" ? -2.5 : 0}, 400, 600)">
          <!-- Tibial Tray plate -->
          <path d="M 290 595 L 510 595 C 515 595, 515 608, 510 608 L 290 608 C 285 608, 285 595, 290 595 Z" 
                fill="url(#implant-grad)" stroke="#475569" stroke-width="1.5" />
          <!-- Tibial anchor stem deep peg -->
          <path d="M 388 608 L 388 710 Q 388 720, 400 720 Q 412 720, 412 710 L 412 608 Z" 
                fill="url(#implant-grad)" stroke="#475569" stroke-width="1.5" />
          <!-- Ultra-high-molecular-weight polyethylene (UHMWPE) insert -->
          <rect x="305" y="582" width="190" height="13" fill="#cbd5e1" stroke="#94a3b8" rx="1.5" opacity="0.9" />
        </g>

      ` : `
        <!-- === TOTAL HIP ARTHROPLASTY (THA) BONE & IMPLANT SYSTEM === -->
        
        <!-- Pelvis Outline -->
        <path d="M 180 120 C 250 80, 550 80, 620 120 C 660 160, 630 260, 580 280 C 510 265, 290 265, 220 280 C 170 260, 140 160, 180 120 Z" 
              fill="url(#bone-grad)" stroke="#1e293b" stroke-width="2" />
        <circle cx="300" cy="220" r="35" fill="#05070a" opacity="0.5" stroke="#334155" stroke-width="1.5" />
        <circle cx="500" cy="220" r="35" fill="#05070a" opacity="0.5" stroke="#334155" stroke-width="1.5" />

        <!-- Acetabular Implant Cup (Lined into Pelvis right acetabulum) -->
        <path d="M 465 220 C 465 180, 535 180, 535 220 Z" fill="url(#implant-grad)" stroke="#475569" stroke-width="1.5" />
        <!-- Polyethylene liner -->
        <path d="M 473 220 C 473 190, 527 190, 527 220 Z" fill="#e2e8f0" stroke="#94a3b8" />

        <!-- Proximal Femur (THA Side) -->
        <path d="M 525 240 Q 560 260, 580 320 L 590 350 L 500 450 L 500 1150 L 400 1150 L 400 450 Q 400 350, 420 320 Q 430 280, 480 270 Z" 
              fill="url(#bone-grad)" stroke="#1e293b" stroke-width="2" />
        <!-- Femoral canal core -->
        <path d="M 470 330 Q 460 380, 460 480 L 460 1100 L 440 1100 L 440 480 Q 440 380, 430 330 Z" fill="#05070a" opacity="0.5" />

        <!-- THA Femoral Metallic Stem -->
        <g transform="translate(0, ${loosening === "High Risk" ? 12 : loosening === "Incipient" ? 4 : 0}) rotate(${loosening === "High Risk" ? 2.5 : 0}, 450, 380)">
          <!-- Stem insert -->
          <path d="M 488 282 Q 470 300, 465 340 L 442 560 Q 440 575, 448 575 Q 456 575, 458 560 L 485 360 Q 495 330, 502 315 Z" 
                fill="url(#implant-grad)" stroke="#475569" stroke-width="1.5" />
          <!-- Neck -->
          <path d="M 495 300 L 515 255 L 525 260 L 502 312 Z" fill="url(#implant-grad)" stroke="#475569" stroke-width="1" />
          <!-- Prosthetic Spherical Head -->
          <circle cx="522" cy="245" r="16" fill="url(#implant-grad)" stroke="#cbd5e1" stroke-width="1" />
        </g>

        <!-- Osteolysis Resorption Zone (THA Acetabulum / Femoral stem interface) -->
        ${osteolysis !== "None" ? `
          <ellipse cx="440" cy="380" rx="14" ry="${osteolysis === "Severe" ? 50 : 25}" fill="#05070a" filter="url(#soft-blur)" />
          <path d="M 432 340 Q 425 400, 432 450" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="2,2" filter="url(#soft-blur)" />
          <text x="340" y="400" fill="#ef4444" font-size="10" font-weight="bold">LUCENCY PERI-IMPLANT</text>
        ` : ""}

        <!-- Loosening lines -->
        ${loosening !== "Stable" ? `
          <path d="M 505 210 Q 515 190, 535 210" fill="none" stroke="#ef4444" stroke-width="2.5" />
          <text x="560" y="190" fill="#ef4444" font-size="10" font-weight="bold">CUP MIGRATION</text>
          <text x="340" y="420" fill="#f59e0b" font-size="11" font-weight="bold">⚠️ PATHOLOGICAL IMPLANT SUBSIDENCE</text>
        ` : ""}
      `}

      <!-- ==================== BONE UNION / FRACTURE LINE LAYER ==================== -->
      ${hasFracture ? `
        <!-- Fracture Line Overlay in Femoral Shaft -->
        <g transform="translate(0, 0)">
          <!-- Fracture jagged pathway -->
          ${unionPercent < 100 ? `
            <path d="M 320 280 L 370 295 L 350 310 L 410 325 L 450 315 L 480 340" 
                  fill="none" stroke="#05070a" stroke-width="4" opacity="${(100 - unionPercent) / 100}" />
            <path d="M 320 280 L 370 295 L 350 310 L 410 325 L 450 315 L 480 340" 
                  fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2,3" opacity="${(100 - unionPercent) / 100}" />
          ` : ""}

          <!-- Bone Callus Cloud (Fading with maturity) -->
          ${unionPercent > 0 ? `
            <!-- Callus collar -->
            <ellipse cx="400" cy="310" rx="100" ry="45" fill="#f1f5f9" fill-opacity="${0.08 + (unionPercent / 600)}" filter="url(#heavy-blur)" />
            <path d="M 300 310 Q 400 340, 500 310 Q 400 280, 300 310" fill="#e2e8f0" fill-opacity="${0.12 + (unionPercent / 500)}" opacity="0.3" filter="url(#soft-blur)" />
          ` : ""}

          <!-- Union Stage Text -->
          <text x="${width / 2}" y="250" fill="#22d3ee" font-size="11" font-weight="bold" text-anchor="middle" opacity="0.8">
            CALLED BRIDGING HEALING: ${unionPercent}%
          </text>
        </g>
      ` : ""}

      <!-- Status Watermarks & Overlay Indicators -->
      <g transform="translate(60, 1080)" fill="#475569" font-size="10">
        <text x="0" y="0">ALGORITHM CORE VER: COM-ML-v1.4.2</text>
        <text x="0" y="15">MODE: <tspan fill="#06b6d4" font-weight="bold">${loosening !== "Stable" || osteolysis !== "None" ? "CRITICAL ALERT COM-FLAGGED" : "HEALING NOMINAL"}</tspan></text>
        <text x="0" y="30">LEARNED_METRIC: BONE_RECONSTRUCT_ALIGN</text>
      </g>

      <g transform="translate(420, 1080)" fill="#475569" font-size="10">
        <text x="0" y="0">BONE UNION PROGRESSION:  [${"█".repeat(Math.ceil(unionPercent / 10))}${"░".repeat(10 - Math.ceil(unionPercent / 10))}]</text>
        <text x="0" y="15">OSTEOLYSIS THRESHOLD:   ${osteolysis === "Severe" ? "⚠️ SEVERE (>2.5mm)" : osteolysis === "Mild" ? "⚠️ BORDERLINE" : "NORMAL"}</text>
        <text x="0" y="30">STABILITY CLASSIFIER:   ${loosening.toUpperCase()}</text>
      </g>

      <!-- Soft visual frame border -->
      <rect x="15" y="15" width="${width - 30}" height="${height - 30}" rx="12" fill="none" stroke="#1e293b" stroke-width="2" opacity="0.8" />
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Initial post-operative patients database
export const initialPostOpPatients: PostOpPatient[] = [
  {
    id: "PT-88291",
    name: "John Doe",
    age: 62,
    gender: "Male",
    procedure: "Total Knee Arthroplasty (TKA)",
    scans: [
      {
        id: "doe-scan-1",
        date: "2025-01-15",
        label: "Immediate Post-Op (Day 1)",
        stage: 1,
        boneUnion: 0,
        osteolysis: "None",
        cementation: "Adequate",
        loosening: "Stable",
        complications: ["None"],
        findings: {
          name: "John Doe",
          idNumber: "PT-88291",
          scanDate: "2025-01-15",
          procedure: "Total Knee Arthroplasty (TKA)"
        },
        imageUrl: "", // Generated dynamically in code
        report: "DICOM SCAN REPORT:\n\nImmediate postoperative bilateral digital scanogram demonstrates excellent component positioning following right total knee arthroplasty (TKA). The femoral shield and tibial tray are well-aligned. The cement mantle is uniform, homogeneous, and fully intact, providing excellent immediate cortical mechanical support. There are no signs of periprosthetic radiolucency. Alignment is restored to anatomical neutral (HKA angle is 180.2°). No immediate post-operative complications are detected."
      },
      {
        id: "doe-scan-2",
        date: "2025-03-01",
        label: "6-Week Followup",
        stage: 2,
        boneUnion: 25,
        osteolysis: "None",
        cementation: "Adequate",
        loosening: "Stable",
        complications: ["None"],
        findings: {
          name: "John Doe",
          idNumber: "PT-88291",
          scanDate: "2025-03-01",
          procedure: "Total Knee Arthroplasty (TKA)"
        },
        imageUrl: "",
        report: "DICOM SCAN REPORT:\n\nSix-week post-operative clinical review. Patient is bearing weight fully without pain. Radiographs show completely stable implant configurations with no evidence of translation, subsidence, or rotation. Bone density surrounding the tibial stem and anchoring pegs is completely preserved. Minimal periprosthetic reactive zone is visible, which is within normal clinical limits. Progressive bone consolidation around osteotomy margins is estimated at 25% union. No active complications."
      },
      {
        id: "doe-scan-3",
        date: "2025-07-15",
        label: "6-Month Followup",
        stage: 3,
        boneUnion: 75,
        osteolysis: "None",
        cementation: "Adequate",
        loosening: "Stable",
        complications: ["None"],
        findings: {
          name: "John Doe",
          idNumber: "PT-88291",
          scanDate: "2025-07-15",
          procedure: "Total Knee Arthroplasty (TKA)"
        },
        imageUrl: "",
        report: "DICOM SCAN REPORT:\n\nSix-month clinical followup. Patient exhibits full flexion of 120° with zero discomfort. Scanogram demonstrates high-density cortical bone remodeling. Callus bridging is solid and complete, with advanced structural union measured at approximately 75%. Cement-bone interface is pristinely preserved. No periimplant lucency, osteolysis, or joint space collapse is identified. Implant components are fully integrated and mechanically stable."
      },
      {
        id: "doe-scan-4",
        date: "2026-01-15",
        label: "1-Year Followup",
        stage: 4,
        boneUnion: 100,
        osteolysis: "None",
        cementation: "Adequate",
        loosening: "Stable",
        complications: ["None"],
        findings: {
          name: "John Doe",
          idNumber: "PT-88291",
          scanDate: "2026-01-15",
          procedure: "Total Knee Arthroplasty (TKA)"
        },
        imageUrl: "",
        report: "DICOM SCAN REPORT:\n\nTwelve-month definitive clinical followup. Excellent range of motion with full functional stability. Radiographs show full trabecular bridging across bone interfaces, representing 100% complete bone union and successful knee arthroplasty integration. No lucent lines of any thickness are seen. Excellent bone density is maintained beneath the tibial tray. No periimplant osteolysis or aseptic loosening is detected. This represents a perfect, uncomplicated, mature arthroplasty follow-up."
      }
    ]
  },
  {
    id: "PT-77382",
    name: "Jane Smith",
    age: 71,
    gender: "Female",
    procedure: "Total Hip Arthroplasty (THA)",
    scans: [
      {
        id: "smith-scan-1",
        date: "2024-05-10",
        label: "Immediate Post-Op (Day 1)",
        stage: 1,
        boneUnion: 0,
        osteolysis: "None",
        cementation: "Deficient",
        loosening: "Stable",
        complications: ["None"],
        findings: {
          name: "Jane Smith",
          idNumber: "PT-77382",
          scanDate: "2024-05-10",
          procedure: "Total Hip Arthroplasty (THA)"
        },
        imageUrl: "",
        report: "DICOM SCAN REPORT:\n\nImmediate postoperative digital x-ray of the right hip shows total hip arthroplasty (THA). The femoral stem is seated. Acetabular cup is placed at 42° abduction angle. However, examination of the proximal cement mantle reveals a narrow, deficient distribution zone near Gruen Zone 1 and Zone 7. Although immediate component mechanical position is stable, cementation deficiency represents a structural risk factor for future aseptic loosening. Close radiographical monitoring is advised."
      },
      {
        id: "smith-scan-2",
        date: "2024-11-15",
        label: "6-Month Followup",
        stage: 2,
        boneUnion: 15,
        osteolysis: "Mild",
        cementation: "Deficient",
        loosening: "Incipient",
        complications: ["Periimplant Osteolysis"],
        findings: {
          name: "Jane Smith",
          idNumber: "PT-77382",
          scanDate: "2024-11-15",
          procedure: "Total Hip Arthroplasty (THA)"
        },
        imageUrl: "",
        report: "DICOM SCAN REPORT:\n\nSix-month postoperative clinical review. Patient presents with mild, progressive groin and thigh pain on bearing weight. Orthopaedic scanogram reveals early periprosthetic radiolucency. A progressive lucent band measuring 1.2mm is emerging at the femoral cement-bone interface, corresponding to periimplant osteolysis. Mild osteolytic resorption is developing. Minor micro-subsidence of the femoral stem is suspected (Incipient loosening). Bone union is delayed, measured at only 15% bridging. Complication flagged: Periimplant Osteolysis."
      },
      {
        id: "smith-scan-3",
        date: "2025-05-10",
        label: "1-Year Followup",
        stage: 3,
        boneUnion: 20,
        osteolysis: "Severe",
        cementation: "Deficient",
        loosening: "High Risk",
        complications: ["Aseptic Loosening", "Periimplant Osteolysis"],
        findings: {
          name: "Jane Smith",
          idNumber: "PT-77382",
          scanDate: "2025-05-10",
          procedure: "Total Hip Arthroplasty (THA)"
        },
        imageUrl: "",
        report: "DICOM SCAN REPORT:\n\nTwelve-month postoperative clinical review. Patient reports severe mechanical groin pain during ambulation. Scanogram demonstrates extensive periprosthetic bone loss. A progressive lucent band exceeding 3mm is now visible at the bone-cement interface across multiple Gruen zones, confirming Severe Periimplant Osteolysis. Significant prosthesis migration is apparent, with 4.5mm subsidence of the femoral stem and tilted acetabular cup, confirming Aseptic Loosening (High Risk). Joint space stability is compromised. Surgical revision arthroplasty is highly recommended."
      }
    ]
  }
];

// Generates base64 data URIs for all static scan records in initial patient lists
export function hydratePatientImages(patients: PostOpPatient[]): PostOpPatient[] {
  return patients.map(p => ({
    ...p,
    scans: p.scans.map(s => ({
      ...s,
      imageUrl: generatePostOpSVG({
        procedure: p.procedure,
        stageLabel: s.label,
        unionPercent: s.boneUnion,
        osteolysis: s.osteolysis,
        loosening: s.loosening,
        cementation: s.cementation,
        patientName: p.name,
        patientId: p.id,
        dateStr: s.date
      })
    }))
  }));
}
