import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Calendar, 
  User, 
  Layers, 
  Plus, 
  Check, 
  AlertTriangle, 
  Brain, 
  MessageSquare, 
  ShieldAlert, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Maximize2, 
  FileText, 
  CheckCircle, 
  Heart,
  Undo
} from "lucide-react";
import { PostOpPatient, PostOpScan, ComplicationRule, LearningLog } from "../types";

export default function PostOpComplicationsHub() {
  // Database States
  const [patients, setPatients] = useState<PostOpPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  const [taughtRules, setTaughtRules] = useState<ComplicationRule[]>([]);
  const [learningLogs, setLearningLogs] = useState<LearningLog[]>([]);

  // UI Interactive States
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showRuleForm, setShowRuleForm] = useState<boolean>(false);
  const [showCorrectionForm, setShowCorrectionForm] = useState<boolean>(false);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  // New Rule Form States
  const [ruleCategory, setRuleCategory] = useState<ComplicationRule["category"]>("Osteolysis");
  const [ruleTrigger, setRuleTrigger] = useState<string>("");
  const [ruleValue, setRuleValue] = useState<string>("");
  const [ruleDescription, setRuleDescription] = useState<string>("");

  // Correction Form States
  const [correctionText, setCorrectionText] = useState<string>("");

  // Create Patient Form States
  const [showPatientForm, setShowPatientForm] = useState<boolean>(false);
  const [newPatientName, setNewPatientName] = useState<string>("");
  const [newPatientId, setNewPatientId] = useState<string>("");
  const [newPatientAge, setNewPatientAge] = useState<string>("");
  const [newPatientGender, setNewPatientGender] = useState<string>("Male");
  const [newPatientProcedure, setNewPatientProcedure] = useState<string>("Total Knee Arthroplasty (TKA)");

  // New Followup Scan Form States
  const [showScanForm, setShowScanForm] = useState<boolean>(false);
  const [newScanLabel, setNewScanLabel] = useState<string>("");
  const [newScanDate, setNewScanDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [newScanUnion, setNewScanUnion] = useState<number>(50);
  const [newScanOsteolysis, setNewScanOsteolysis] = useState<"None" | "Mild" | "Severe">("None");
  const [newScanCement, setNewScanCement] = useState<"Adequate" | "Deficient" | "N/A">("Adequate");
  const [newScanLoosening, setNewScanLoosening] = useState<"Stable" | "Incipient" | "High Risk">("Stable");

  // Load Initial Data
  const loadData = async () => {
    try {
      const patientsRes = await fetch("/api/complications/patients");
      const patientsData = await patientsRes.json();
      setPatients(patientsData);

      if (patientsData.length > 0) {
        setSelectedPatientId(patientsData[0].id);
        if (patientsData[0].scans.length > 0) {
          setSelectedScanId(patientsData[0].scans[0].id);
        }
      }

      const rulesRes = await fetch("/api/complications/rules");
      const rulesData = await rulesRes.json();
      setTaughtRules(rulesData);

      const logsRes = await fetch("/api/complications/logs");
      const logsData = await logsRes.json();
      setLearningLogs(logsData);
    } catch (err) {
      console.error("Failed to load complications hub data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync selected scan when active patient changes
  useEffect(() => {
    const activePatient = patients.find(p => p.id === selectedPatientId);
    if (activePatient && activePatient.scans.length > 0) {
      // Keep selected scan or fallback to first one
      const exists = activePatient.scans.some(s => s.id === selectedScanId);
      if (!exists) {
        setSelectedScanId(activePatient.scans[0].id);
      }
    }
  }, [selectedPatientId, patients]);

  const activePatient = patients.find(p => p.id === selectedPatientId);
  const activeScan = activePatient?.scans.find(s => s.id === selectedScanId);

  // Trigger Online or Offline Diagnostic Core Run
  const handleAnalyzeScan = async () => {
    if (!activePatient || !activeScan) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/complications/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: activePatient.id,
          scanId: activeScan.id,
          mode: isOfflineMode ? "offline" : "online",
          imageBase64: activeScan.imageUrl // Sends image for computer vision
        })
      });

      const data = await res.json();
      if (data.success) {
        // Reload patient database to get updated reports & SVGs
        const patientsRes = await fetch("/api/complications/patients");
        const patientsData = await patientsRes.json();
        setPatients(patientsData);
        alert(`Analysis Completed Successfully!\nSource: ${data.aiSource}`);
      }
    } catch (err) {
      console.error("Analysis trigger failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit custom clinician rule to teach the model
  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTrigger || !ruleValue) return;

    try {
      const res = await fetch("/api/complications/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: ruleCategory,
          triggerCondition: ruleTrigger,
          classificationValue: ruleValue,
          description: ruleDescription || `When matching [${ruleTrigger}], classify with ${ruleValue}`
        })
      });

      const data = await res.json();
      if (data.success) {
        setTaughtRules(data.rules);
        setRuleTrigger("");
        setRuleValue("");
        setRuleDescription("");
        setShowRuleForm(false);
      }
    } catch (err) {
      console.error("Rule submission failed:", err);
    }
  };

  // Submit clinical correction to log learning
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !activeScan || !correctionText) return;

    try {
      const res = await fetch("/api/complications/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: activePatient.id,
          patientName: activePatient.name,
          scanId: activeScan.id,
          scanLabel: activeScan.label,
          originalReport: activeScan.report,
          userCorrection: correctionText
        })
      });

      const data = await res.json();
      if (data.success) {
        setLearningLogs(data.logs);
        setCorrectionText("");
        setShowCorrectionForm(false);
        
        // Reload patients because database was modified and image updated
        const patientsRes = await fetch("/api/complications/patients");
        const patientsData = await patientsRes.json();
        setPatients(patientsData);
        
        alert("Model Correction Taught Successfully!\nThe system has saved this clinical case into its local training weight memory.");
      }
    } catch (err) {
      console.error("Correction log failed:", err);
    }
  };

  // Add new patient record
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName) return;

    try {
      const res = await fetch("/api/complications/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: newPatientId || undefined,
          patientName: newPatientName,
          age: newPatientAge,
          gender: newPatientGender,
          procedure: newPatientProcedure
        })
      });

      const data = await res.json();
      if (data.success) {
        setPatients(data.patients);
        setSelectedPatientId(data.patient.id);
        setShowPatientForm(false);
        setNewPatientName("");
        setNewPatientId("");
        setNewPatientAge("");
      }
    } catch (err) {
      console.error("Patient creation failed:", err);
    }
  };

  // Add new followup scan timeline node
  const handleCreateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !newScanLabel) return;

    try {
      const res = await fetch("/api/complications/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: activePatient.id,
          scan: {
            label: newScanLabel,
            date: newScanDate,
            boneUnion: Number(newScanUnion),
            osteolysis: newScanOsteolysis,
            cementation: newScanCement,
            loosening: newScanLoosening,
            complications: [
              newScanOsteolysis !== "None" ? "Periimplant Osteolysis" : "None",
              newScanLoosening !== "Stable" ? "Aseptic Loosening" : "None"
            ].filter(c => c !== "None")
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setPatients(data.patients);
        setShowScanForm(false);
        setNewScanLabel("");
      }
    } catch (err) {
      console.error("Scan creation failed:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#05070a] text-slate-100 p-6 space-y-6">
      
      {/* Upper Status & Mode Toggle Grid */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span>Post-Operative Complications & AI Learning Hub</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Model: <tspan fill="#22d3ee">Orthopaedic ResNet-v1.4</tspan> | Adaptive Reinforcement Learning Active
          </p>
        </div>

        {/* Network State Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => setIsOfflineMode(true)}
              className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                isOfflineMode
                  ? "bg-cyan-900/60 text-cyan-300 border border-cyan-500/25"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Offline Local Engine
            </button>
            <button
              onClick={() => setIsOfflineMode(false)}
              className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase transition-all flex items-center gap-1 ${
                !isOfflineMode
                  ? "bg-amber-950/80 text-amber-300 border border-amber-500/25"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Online AI Model
            </button>
          </div>

          <button
            onClick={() => setShowPatientForm(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Patient Record</span>
          </button>
        </div>
      </div>

      {/* Main Dynamic Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Case Selector & Followup Timeline Node Grid (3 Cols) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Patient Registry Card */}
          <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 space-y-3.5 shadow-md">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>ACTIVE CLINICAL CASES</span>
            </h3>
            
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {patients.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`w-full text-left px-3.5 py-3 rounded border transition-all flex flex-col ${
                    selectedPatientId === p.id
                      ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-300"
                      : "bg-[#090d15] border-slate-900 hover:bg-slate-900 text-slate-400"
                  }`}
                >
                  <span className="text-xs font-bold font-sans text-slate-100">{p.name}</span>
                  <span className="text-[10px] font-mono mt-0.5">{p.id} • {p.age}y/o • {p.gender}</span>
                  <span className="text-[10px] text-slate-500 mt-1 uppercase font-mono tracking-tight truncate w-full">{p.procedure}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Longitudinal Follow-up Timeline */}
          {activePatient && (
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Timeline Series</span>
                </h3>
                
                <button
                  onClick={() => setShowScanForm(true)}
                  className="text-[9px] font-mono font-bold uppercase text-cyan-400 hover:text-cyan-300 border border-cyan-800/30 px-1.5 py-0.5 rounded bg-cyan-950/20"
                >
                  + Add Stage
                </button>
              </div>

              {/* Timeline nodes vertical sequence */}
              <div className="relative pl-4 border-l border-slate-800 space-y-5 py-1">
                {activePatient.scans.map((scan, idx) => {
                  const isSelected = selectedScanId === scan.id;
                  const isFirst = idx === 0;
                  const isLast = idx === activePatient.scans.length - 1;
                  return (
                    <div key={scan.id} className="relative group">
                      {/* Interactive dot */}
                      <span className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border transition-all ${
                        isSelected 
                          ? "bg-cyan-400 border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" 
                          : "bg-slate-950 border-slate-700 group-hover:border-slate-500"
                      }`} />

                      <button
                        onClick={() => setSelectedScanId(scan.id)}
                        className={`w-full text-left p-2 rounded transition-all ${
                          isSelected 
                            ? "bg-cyan-950/20 text-cyan-300 font-bold" 
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="text-xs font-sans font-semibold flex items-center justify-between">
                          <span>{scan.label}</span>
                          <span className="text-[10px] font-mono text-slate-500">{scan.date}</span>
                        </div>
                        {/* Highlights complications */}
                        {scan.complications && scan.complications[0] !== "None" && (
                          <div className="flex gap-1 mt-1">
                            {scan.complications.map((c, ci) => (
                              <span key={ci} className="text-[8px] bg-red-950/40 text-red-400 border border-red-900/30 px-1 rounded uppercase font-mono">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Center Column: Digital Radiograph SVG X-Ray Viewer (5 Cols) */}
        <div className="xl:col-span-5 space-y-4 bg-slate-950 border border-slate-900 rounded-lg p-5 shadow-md flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-slate-900 pb-3 mb-2">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>DIGITAL RADIOGRAPH VIEWPORT</span>
            </h3>

            {/* Run Diagnostics Trigger */}
            <button
              onClick={handleAnalyzeScan}
              disabled={isAnalyzing || !activeScan}
              className="bg-cyan-900/40 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/25 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? "Analyzing..." : "Re-Run Model"}</span>
            </button>
          </div>

          {/* Active Image container */}
          {activeScan ? (
            <div className="relative w-full aspect-[2/3] max-w-[420px] bg-[#05070a] border border-slate-900 rounded overflow-hidden flex items-center justify-center group shadow-inner">
              <img
                src={activeScan.imageUrl}
                alt={activeScan.label}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
              {/* Dynamic Radiological Hover Overlay Tooltips */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {/* Joint hotspot overlay */}
                <div className="absolute top-[48%] left-[30%] w-[40%] h-[15%] border border-cyan-400/20 bg-cyan-950/5 rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-mono text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">PROSTHETIC INTERFACE ZONE</span>
                </div>
                {/* Metaphysics line */}
                <div className="absolute top-[20%] left-[25%] w-[50%] h-[5%] border border-amber-500/25 bg-amber-950/5 rounded flex items-center justify-center">
                  <span className="text-[9px] font-mono text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">MID-SHAFT INTERFACE</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full aspect-[2/3] max-w-[420px] border border-dashed border-slate-800 rounded flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
              NO SCAN AVAILABLE
            </div>
          )}

          <div className="w-full flex items-center gap-2 bg-[#090d15] p-3 rounded border border-slate-900 mt-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div className="text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase">Workstation Mode:</span> <tspan fill="#38bdf8">{isOfflineMode ? "Local Heuristics (100% Secure/Offline)" : "Cloud Gemini Vision Integration"}</tspan>
            </div>
          </div>
        </div>

        {/* Right Column: AI Diagnostics, Custom Rule Teaching, Corrections & Learning Logs (4 Cols) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* AI Metrics Bento-Grid Panel */}
          {activeScan && (
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-5 space-y-4 shadow-md">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>MODEL METRICS REGISTER</span>
              </h3>

              <div className="grid grid-cols-2 gap-3.5">
                {/* Metric 1: Bone Union */}
                <div 
                  className="bg-[#090d15] border border-slate-900 p-3 rounded flex flex-col justify-between h-24"
                  onMouseEnter={() => setHoveredMetric("union")}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Bone Union</span>
                  <div className="text-xl font-bold font-mono text-cyan-300">{activeScan.boneUnion}%</div>
                  {/* Miniature linear gauge */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-cyan-400 h-full transition-all duration-500" style={{ width: `${activeScan.boneUnion}%` }} />
                  </div>
                </div>

                {/* Metric 2: Osteolysis */}
                <div 
                  className="bg-[#090d15] border border-slate-900 p-3 rounded flex flex-col justify-between h-24"
                  onMouseEnter={() => setHoveredMetric("osteolysis")}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Osteolysis</span>
                  <div className={`text-base font-bold font-mono flex items-center gap-1 ${
                    activeScan.osteolysis === "Severe" ? "text-red-400" : activeScan.osteolysis === "Mild" ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {activeScan.osteolysis === "Severe" && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                    <span>{activeScan.osteolysis}</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600">Periprosthetic lysis</span>
                </div>

                {/* Metric 3: Cementation */}
                <div 
                  className="bg-[#090d15] border border-slate-900 p-3 rounded flex flex-col justify-between h-24"
                  onMouseEnter={() => setHoveredMetric("cementation")}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Cementation</span>
                  <div className={`text-base font-bold font-mono ${
                    activeScan.cementation === "Deficient" ? "text-red-400" : "text-emerald-400"
                  }`}>{activeScan.cementation}</div>
                  <span className="text-[9px] font-mono text-slate-600">Mantle distribution</span>
                </div>

                {/* Metric 4: Aseptic Loosening */}
                <div 
                  className="bg-[#090d15] border border-slate-900 p-3 rounded flex flex-col justify-between h-24"
                  onMouseEnter={() => setHoveredMetric("loosening")}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Loosening Risk</span>
                  <div className={`text-base font-bold font-mono flex items-center gap-1 ${
                    activeScan.loosening === "High Risk" ? "text-red-400 animate-pulse" : activeScan.loosening === "Incipient" ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {activeScan.loosening === "High Risk" && <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
                    <span>{activeScan.loosening}</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-600">Implant migration</span>
                </div>
              </div>

              {/* Explanatory context tooltip box based on hover */}
              <div className="bg-[#070b12] border border-slate-900 p-2.5 rounded text-[10px] font-mono text-slate-400 leading-relaxed min-h-[50px]">
                {hoveredMetric === "union" && "Model looks for trabecular bone bridging, secondary hard callus shadow lines, and fracture line blurring across cortical margins."}
                {hoveredMetric === "osteolysis" && "Identifies radiolucent shadow zones >2mm surrounding the joint implants or structural bone anchors."}
                {hoveredMetric === "cementation" && "Evaluates cement mantle consistency and thickness around prosthetic anchoring peg margins."}
                {hoveredMetric === "loosening" && "Identifies progressive prosthesis subsidence, pivot rotation, or cement-bone micro-slippage relative to baseline scans."}
                {!hoveredMetric && "Hover over any metric card above to view technical radiological diagnostic criteria."}
              </div>

              {/* Report Narrative Box */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Radiology Scan Report</span>
                  </span>
                  
                  {/* Correction Form trigger */}
                  <button
                    onClick={() => setShowCorrectionForm(!showCorrectionForm)}
                    className="text-[9px] font-mono font-bold uppercase text-amber-400 hover:text-amber-300"
                  >
                    ✏️ Correct Assessment
                  </button>
                </div>

                {showCorrectionForm ? (
                  <form onSubmit={handleSubmitCorrection} className="bg-[#090d15] border border-amber-900/30 p-3 rounded-lg space-y-3">
                    <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5" />
                      <span>TEACH THE MODEL NEW EVIDENCE</span>
                    </span>
                    <textarea
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      placeholder="e.g. Set Bone Union to 45% because 3 cortices have complete callus density, override osteolysis to Mild."
                      className="w-full h-24 bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
                      required
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowCorrectionForm(false)}
                        className="text-[10px] font-mono px-2 py-1 rounded text-slate-500 hover:text-slate-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-amber-600 hover:bg-amber-500 text-white font-mono text-[10px] px-3 py-1 rounded transition-colors font-bold uppercase"
                      >
                        Correct & Train
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-[#090d15] border border-slate-900 rounded p-3 text-xs font-mono text-slate-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-all selection:bg-cyan-500/30 border-l-2 border-l-cyan-600 shadow-inner">
                    {activeScan.report}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Model Custom Rule Teaching Panel */}
          <div className="bg-slate-950 border border-slate-900 rounded-lg p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-cyan-400" />
                <span>TEACH MODEL CUSTOM RULES</span>
              </h3>
              
              <button
                onClick={() => setShowRuleForm(!showRuleForm)}
                className="text-[9px] font-mono font-bold uppercase text-cyan-400 hover:text-cyan-300"
              >
                {showRuleForm ? "Hide" : "+ Create Rule"}
              </button>
            </div>

            {showRuleForm ? (
              <form onSubmit={handleSubmitRule} className="bg-[#090d15] border border-slate-900 p-3 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-mono text-slate-500 font-bold uppercase">Category</label>
                    <select
                      value={ruleCategory}
                      onChange={(e) => setRuleCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs outline-none text-slate-300 mt-1"
                    >
                      <option value="Bone Union">Bone Union</option>
                      <option value="Osteolysis">Osteolysis</option>
                      <option value="Cementation">Cementation</option>
                      <option value="Loosening">Loosening</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-slate-500 font-bold uppercase">Classification Output</label>
                    <input
                      type="text"
                      value={ruleValue}
                      onChange={(e) => setRuleValue(e.target.value)}
                      placeholder="e.g. Mild"
                      className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs outline-none text-slate-300 mt-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-mono text-slate-500 font-bold uppercase">Trigger Condition (Text Keyphrase)</label>
                  <input
                    type="text"
                    value={ruleTrigger}
                    onChange={(e) => setRuleTrigger(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs outline-none text-slate-300 mt-1"
                    required
                  />
                  <span className="text-[8px] font-mono text-slate-600 mt-0.5 block">Trigger occurs when keyphrase matches patient name, ID, or procedure.</span>
                </div>

                <div>
                  <label className="text-[9px] font-mono text-slate-500 font-bold uppercase">Rule Description</label>
                  <textarea
                    value={ruleDescription}
                    onChange={(e) => setRuleDescription(e.target.value)}
                    placeholder="Briefly state clinical rationale..."
                    className="w-full h-12 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs outline-none text-slate-300 mt-1"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRuleForm(false)}
                    className="text-[10px] font-mono px-2 py-1 rounded text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-[10px] px-3 py-1 rounded transition-colors font-bold uppercase"
                  >
                    Save & Teach Rule
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {taughtRules.map(r => (
                  <div key={r.id} className="bg-[#090d15] border border-slate-900 p-2.5 rounded text-[10px] font-mono text-slate-400 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold">[{r.category}] Rule</span>
                      <span className="text-[8px] text-slate-600">{r.createdAt}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Trigger:</span> <span className="text-slate-200">"{r.triggerCondition}"</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Action:</span> <span className="text-amber-400 font-bold">{r.classificationValue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinician Feedback Learning Log Registry */}
          <div className="bg-slate-950 border border-slate-900 rounded-lg p-5 space-y-4 shadow-md">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>LOG LEARNING REGISTRY</span>
            </h3>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {learningLogs.map(l => (
                <div key={l.id} className="bg-[#090d15] border border-slate-900 p-2.5 rounded text-[10px] font-mono text-slate-400 space-y-1">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1">
                    <span className="text-slate-200 font-bold truncate max-w-[120px]">{l.patientName}</span>
                    <span className="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-1 rounded uppercase font-bold">
                      {l.status}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[9px] flex justify-between">
                    <span>Scan: {l.scanLabel}</span>
                    <span>{l.timestamp}</span>
                  </div>
                  <div className="text-slate-300 italic">
                    "{l.userCorrection}"
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* MODAL POPUPS FOR NEW PATIENT / NEW SCAN FORM ENTRY */}
      {showPatientForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreatePatient} className="bg-slate-950 border border-slate-800 p-6 rounded-lg max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
              <User className="w-4 h-4 animate-pulse" />
              <span>REGISTER NEW PATIENT COM-RECORD</span>
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Patient Name</label>
                <input
                  type="text"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="e.g. Harold Finch"
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 outline-none mt-1 focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Patient ID</label>
                  <input
                    type="text"
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    placeholder="e.g. PT-33928"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 outline-none mt-1 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Age</label>
                  <input
                    type="number"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(e.target.value)}
                    placeholder="e.g. 58"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 outline-none mt-1 focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 outline-none mt-1"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Primary Joint Procedure</label>
                  <select
                    value={newPatientProcedure}
                    onChange={(e) => setNewPatientProcedure(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 outline-none mt-1"
                  >
                    <option value="Total Knee Arthroplasty (TKA)">Total Knee (TKA)</option>
                    <option value="Total Hip Arthroplasty (THA)">Total Hip (THA)</option>
                    <option value="Distal Femur Osteotomy (DFO)">Femur Osteotomy (DFO)</option>
                    <option value="Femur Fracture ORIF Repair">Femur Fracture ORIF</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-900">
              <button
                type="button"
                onClick={() => setShowPatientForm(false)}
                className="text-xs font-mono px-3 py-2 rounded text-slate-500 hover:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs px-4 py-2 rounded font-bold uppercase shadow-lg shadow-cyan-900/20"
              >
                Register Record
              </button>
            </div>
          </form>
        </div>
      )}

      {showScanForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateScan} className="bg-slate-950 border border-slate-800 p-6 rounded-lg max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
              <Calendar className="w-4 h-4" />
              <span>ADD TIMELINE FOLLOWUP STAGE</span>
            </h3>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Stage Label</label>
                  <input
                    type="text"
                    value={newScanLabel}
                    onChange={(e) => setNewScanLabel(e.target.value)}
                    placeholder="e.g. 12-Week Review"
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 outline-none mt-1 focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Date</label>
                  <input
                    type="date"
                    value={newScanDate}
                    onChange={(e) => setNewScanDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 outline-none mt-1 focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Bone Union ({newScanUnion}%)</label>
                  <span className="text-[10px] font-mono text-cyan-400">{newScanUnion === 100 ? "Bridged Complete" : "Partial consolidation"}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newScanUnion}
                  onChange={(e) => setNewScanUnion(Number(e.target.value))}
                  className="w-full mt-2 accent-cyan-500 bg-slate-900 h-1 rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Osteolysis</label>
                  <select
                    value={newScanOsteolysis}
                    onChange={(e) => setNewScanOsteolysis(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 mt-1"
                  >
                    <option value="None">None</option>
                    <option value="Mild">Mild</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Cementation</label>
                  <select
                    value={newScanCement}
                    onChange={(e) => setNewScanCement(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 mt-1"
                  >
                    <option value="Adequate">Adequate</option>
                    <option value="Deficient">Deficient</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-500 font-bold uppercase">Loosening</label>
                  <select
                    value={newScanLoosening}
                    onChange={(e) => setNewScanLoosening(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-200 mt-1"
                  >
                    <option value="Stable">Stable</option>
                    <option value="Incipient">Incipient</option>
                    <option value="High Risk">High Risk</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-900">
              <button
                type="button"
                onClick={() => setShowScanForm(false)}
                className="text-xs font-mono px-3 py-2 rounded text-slate-500 hover:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs px-4 py-2 rounded font-bold uppercase shadow-lg shadow-cyan-900/20"
              >
                Commit Stage
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
