import { LegPoints, SampleCase } from "../types";

// Generates an interactive SVG representing a scanogram with varying mechanical alignment
export function generateSyntheticScanogram(alignment: "neutral" | "varus" | "valgus"): string {
  let leftKneeX = 35;
  let rightKneeX = 65;
  let labelText = "NEUTRAL ALIGNMENT (HKA ~ 180°)";

  if (alignment === "varus") {
    leftKneeX = 26;  // Shifted lateral
    rightKneeX = 74; // Shifted lateral
    labelText = "GENU VARUM (BOW-LEGGED DEFORMITY)";
  } else if (alignment === "valgus") {
    leftKneeX = 41;  // Shifted medial
    rightKneeX = 59; // Shifted medial
    labelText = "GENU VALGUM (KNOCK-KNEED DEFORMITY)";
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200" style="background:#090d16;">
      <!-- Grid Gridlines for clinical scale -->
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="1" />
        </pattern>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
        </radialGradient>
      </defs>
      
      <rect width="800" height="1200" fill="#090d16" />
      <rect width="800" height="1200" fill="url(#grid)" />
      
      <!-- Calibration Scale / Clinical Ruler at the right edge -->
      <g stroke="#475569" stroke-width="1.5" opacity="0.6">
        <line x1="760" y1="100" x2="760" y2="1100" />
        ${Array.from({ length: 21 }, (_, i) => {
          const y = 100 + i * 50;
          const isMajor = i % 2 === 0;
          return `<line x1="${isMajor ? 745 : 752}" y1="${y}" x2="760" y2="${y}" stroke-width="${isMajor ? 2 : 1}" />
                  ${isMajor ? `<text x="725" y="${y + 4}" fill="#64748b" font-family="monospace" font-size="10" text-anchor="middle">${i * 5}cm</text>` : ""}`;
        }).join("")}
      </g>

      <!-- Side Markers -->
      <text x="80" y="120" fill="#ef4444" font-family="sans-serif" font-weight="900" font-size="28" opacity="0.8">R</text>
      <text x="720" y="120" fill="#3b82f6" font-family="sans-serif" font-weight="900" font-size="28" opacity="0.8">L</text>
      <text x="400" y="50" fill="#475569" font-family="monospace" font-size="12" text-anchor="middle">ORTHOPAEDIC SCANOGRAM METRIC TEMPLATE</text>
      <text x="400" y="75" fill="#38bdf8" font-family="sans-serif" font-weight="bold" font-size="16" text-anchor="middle" opacity="0.9">${labelText}</text>

      <!-- Ambient glow around knees -->
      <circle cx="${leftKneeX * 8}" cy="620" r="120" fill="url(#glow)" />
      <circle cx="${rightKneeX * 8}" cy="620" r="120" fill="url(#glow)" />

      <!-- Pelvis Drawing (Skeletal Outline) -->
      <path d="M 220 180 C 250 140, 550 140, 580 180 C 600 200, 580 260, 550 250 C 500 240, 300 240, 250 250 C 220 260, 200 200, 220 180 Z" fill="none" stroke="#475569" stroke-width="4" stroke-linecap="round" opacity="0.5"/>
      <path d="M 260 210 C 290 240, 510 240, 540 210 C 510 280, 290 280, 260 210 Z" fill="none" stroke="#475569" stroke-width="3" opacity="0.4"/>
      <!-- Pelvis Center Obturators -->
      <circle cx="330" cy="225" r="22" fill="none" stroke="#475569" stroke-width="2" opacity="0.3" />
      <circle cx="470" cy="225" r="22" fill="none" stroke="#475569" stroke-width="2" opacity="0.3" />

      <!-- RIGHT LEG (Anatomical Right is viewer's left) -->
      <!-- Femur (Thigh bone) -->
      <g opacity="0.85">
        <!-- Femoral Head -->
        <circle cx="280" cy="220" r="18" fill="none" stroke="#e2e8f0" stroke-width="2.5" />
        <!-- Femoral Neck -->
        <path d="M 280 220 L 260 235 L 245 270" fill="none" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round"/>
        <!-- Femoral Shaft -->
        <path d="M 245 270 L ${rightKneeX * 8} 600" fill="none" stroke="#e2e8f0" stroke-width="16" stroke-linecap="round"/>
        <!-- Femoral Condyles (Knee Joint Top) -->
        <path d="M ${rightKneeX * 8 - 25} 600 Q ${rightKneeX * 8} 620, ${rightKneeX * 8 + 25} 600" fill="none" stroke="#e2e8f0" stroke-width="24" stroke-linecap="round"/>
      </g>
      
      <!-- Tibia and Fibula (Lower leg) -->
      <g opacity="0.85">
        <!-- Tibial Plateau (Knee Joint Bottom) -->
        <path d="M ${rightKneeX * 8 - 24} 630 L ${rightKneeX * 8 + 24} 630" fill="none" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round"/>
        <!-- Tibial Shaft -->
        <path d="M ${rightKneeX * 8} 630 L 280 1050" fill="none" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round"/>
        <!-- Fibula (thin outer bone) -->
        <path d="M ${rightKneeX * 8 - 18} 645 L 262 1045" fill="none" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
        <!-- Medial/Lateral Malleolus (Ankle) -->
        <path d="M 268 1050 L 292 1050" fill="none" stroke="#cbd5e1" stroke-width="14" stroke-linecap="round"/>
        <!-- Foot outline -->
        <path d="M 280 1055 C 280 1080, 240 1085, 230 1095" fill="none" stroke="#475569" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      </g>

      <!-- LEFT LEG (Anatomical Left is viewer's right) -->
      <!-- Femur (Thigh bone) -->
      <g opacity="0.85">
        <!-- Femoral Head -->
        <circle cx="520" cy="220" r="18" fill="none" stroke="#e2e8f0" stroke-width="2.5" />
        <!-- Femoral Neck -->
        <path d="M 520 220 L 540 235 L 555 270" fill="none" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round"/>
        <!-- Femoral Shaft -->
        <path d="M 555 270 L ${leftKneeX * 8} 600" fill="none" stroke="#e2e8f0" stroke-width="16" stroke-linecap="round"/>
        <!-- Femoral Condyles -->
        <path d="M ${leftKneeX * 8 - 25} 600 Q ${leftKneeX * 8} 620, ${leftKneeX * 8 + 25} 600" fill="none" stroke="#e2e8f0" stroke-width="24" stroke-linecap="round"/>
      </g>
      
      <!-- Tibia and Fibula (Lower leg) -->
      <g opacity="0.85">
        <!-- Tibial Plateau -->
        <path d="M ${leftKneeX * 8 - 24} 630 L ${leftKneeX * 8 + 24} 630" fill="none" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round"/>
        <!-- Tibial Shaft -->
        <path d="M ${leftKneeX * 8} 630 L 520 1050" fill="none" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round"/>
        <!-- Fibula -->
        <path d="M ${leftKneeX * 8 + 18} 645 L 538 1045" fill="none" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
        <!-- Ankle -->
        <path d="M 508 1050 L 532 1050" fill="none" stroke="#cbd5e1" stroke-width="14" stroke-linecap="round"/>
        <!-- Foot outline -->
        <path d="M 520 1055 C 520 1080, 560 1085, 570 1095" fill="none" stroke="#475569" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      </g>

      <!-- Soft visual border -->
      <rect x="5" y="5" width="790" height="1190" rx="10" fill="none" stroke="#334155" stroke-width="3" opacity="0.6"/>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const sampleCases: SampleCase[] = [
  {
    id: "case-neutral",
    name: "Patient Case A (Neutral)",
    description: "Standard lower limb alignment showing physiological mechanical loading passing through the centers of hip, knee, and ankle joints.",
    imageUrl: generateSyntheticScanogram("neutral"),
    clinicalObservation: "Limb length analysis shows fully symmetrical lower extremities. The mechanical axes pass within 2mm of the center of both the left and right knee joints. HKA angles on both sides are in physiological ranges (180.0° ± 1°), indicating normal neutral mechanical alignment.",
    leftLeg: {
      detected: true,
      hip: { id: "l-hip", name: "hip", label: "H", anatomicalName: "Left Hip Center", x: 65.0, y: 18.3, color: "#3b82f6" },
      knee: { id: "l-knee", name: "knee", label: "K", anatomicalName: "Left Knee Center", x: 65.0, y: 51.2, color: "#10b981" },
      ankle: { id: "l-ankle", name: "ankle", label: "A", anatomicalName: "Left Ankle Center", x: 65.0, y: 87.5, color: "#3b82f6" },
    },
    rightLeg: {
      detected: true,
      hip: { id: "r-hip", name: "hip", label: "H", anatomicalName: "Right Hip Center", x: 35.0, y: 18.3, color: "#ef4444" },
      knee: { id: "r-knee", name: "knee", label: "K", anatomicalName: "Right Knee Center", x: 35.0, y: 51.2, color: "#10b981" },
      ankle: { id: "r-ankle", name: "ankle", label: "A", anatomicalName: "Right Ankle Center", x: 35.0, y: 87.5, color: "#ef4444" },
    },
  },
  {
    id: "case-varus",
    name: "Patient Case B (Bilateral Varus)",
    description: "Classic bow-legged alignment deformity. The mechanical axis shifts medially, predisposing the medial joint compartment to osteoarthritis.",
    imageUrl: generateSyntheticScanogram("varus"),
    clinicalObservation: "Significant genu varum bilateral deformity observed. Right knee mechanical axis is shifted laterally, producing an HKA angle of 172.0° (8.0° Varus deviation). Left knee HKA is 171.0° (9.0° Varus deviation). Recommended for high tibial osteotomy (HTO) simulation.",
    leftLeg: {
      detected: true,
      hip: { id: "l-hip", name: "hip", label: "H", anatomicalName: "Left Hip Center", x: 65.0, y: 18.3, color: "#3b82f6" },
      knee: { id: "l-knee", name: "knee", label: "K", anatomicalName: "Left Knee Center", x: 74.0, y: 51.2, color: "#10b981" },
      ankle: { id: "l-ankle", name: "ankle", label: "A", anatomicalName: "Left Ankle Center", x: 65.0, y: 87.5, color: "#3b82f6" },
    },
    rightLeg: {
      detected: true,
      hip: { id: "r-hip", name: "hip", label: "H", anatomicalName: "Right Hip Center", x: 35.0, y: 18.3, color: "#ef4444" },
      knee: { id: "r-knee", name: "knee", label: "K", anatomicalName: "Right Knee Center", x: 26.0, y: 51.2, color: "#10b981" },
      ankle: { id: "r-ankle", name: "ankle", label: "A", anatomicalName: "Right Ankle Center", x: 35.0, y: 87.5, color: "#ef4444" },
    },
  },
  {
    id: "case-valgus",
    name: "Patient Case C (Bilateral Valgus)",
    description: "Classic knock-kneed alignment deformity. The mechanical load line shifts laterally, increasing stress on the lateral joint compartment.",
    imageUrl: generateSyntheticScanogram("valgus"),
    clinicalObservation: "Severe genu valgum bilateral deformity. Right anatomical knee center is displaced medially, showing an HKA angle of 185.6° (5.6° Valgus). Left anatomical knee center shows an HKA angle of 186.2° (6.2° Valgus). Patient reports focal lateral joint compartment pain.",
    leftLeg: {
      detected: true,
      hip: { id: "l-hip", name: "hip", label: "H", anatomicalName: "Left Hip Center", x: 65.0, y: 18.3, color: "#3b82f6" },
      knee: { id: "l-knee", name: "knee", label: "K", anatomicalName: "Left Knee Center", x: 59.0, y: 51.2, color: "#10b981" }, // Medial shift (moves closer to center line, i.e., smaller X)
      ankle: { id: "l-ankle", name: "ankle", label: "A", anatomicalName: "Left Ankle Center", x: 65.0, y: 87.5, color: "#3b82f6" },
    },
    rightLeg: {
      detected: true,
      hip: { id: "r-hip", name: "hip", label: "H", anatomicalName: "Right Hip Center", x: 35.0, y: 18.3, color: "#ef4444" },
      knee: { id: "r-knee", name: "knee", label: "K", anatomicalName: "Right Knee Center", x: 41.0, y: 51.2, color: "#10b981" }, // Medial shift (moves closer to center line, i.e., larger X)
      ankle: { id: "r-ankle", name: "ankle", label: "A", anatomicalName: "Right Ankle Center", x: 35.0, y: 87.5, color: "#ef4444" },
    },
  },
];
