import React, { useEffect, useState } from "react";
import { ShieldAlert, Smartphone, Wifi, RefreshCw } from "lucide-react";
import { SecurityStatus } from "../types";

interface WorkstationLockScreenProps {
  securityStatus: SecurityStatus;
  onAuthorized: () => void;
}

export default function WorkstationLockScreen({ securityStatus, onAuthorized }: WorkstationLockScreenProps) {
  const [checking, setChecking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<SecurityStatus>(securityStatus);

  useEffect(() => {
    const interval = setInterval(async () => {
      setChecking(true);
      try {
        const res = await fetch("/api/security-status");
        const data = await res.json();
        setCurrentStatus(data);
        if (data.isAuthorized) {
          clearInterval(interval);
          onAuthorized();
        }
      } catch (e) {
        console.error("Failed to check security status", e);
      } finally {
        setTimeout(() => setChecking(false), 500);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [onAuthorized]);

  return (
    <div className="fixed inset-0 bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6 z-50 selection:bg-red-500/30">
      {/* Visual background grid */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none select-none" style={{
        backgroundImage: "radial-gradient(#ef4444 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }} />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-red-500/10 blur-2xl pointer-events-none" />

        {/* Pulsing Lock Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center shadow-lg animate-pulse">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
        </div>

        {/* Lock Headings */}
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-white uppercase tracking-tight">Workstation Access Locked</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            This device is not authorized to interact with the Lower Limb Mechanical Alignment workstation on this network segment.
          </p>
        </div>

        {/* Identified Client Metadata Container */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-4 space-y-3 text-left font-mono">
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest block border-b border-slate-900 pb-1.5">
            YOUR HARDWARE IDENTIFIERS
          </span>
          
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Client IP Address:</span>
            <span className="text-slate-300 font-bold">{currentStatus.clientIp}</span>
          </div>

          <div className="flex justify-between items-center text-xs border-t border-slate-900/60 pt-2">
            <span className="text-slate-500">Physical MAC ID:</span>
            <span className="text-amber-400 font-bold tracking-wider">{currentStatus.clientMac}</span>
          </div>
        </div>

        {/* Administrator Approval Steps Instructions */}
        <div className="space-y-3 text-xs leading-relaxed text-slate-400 max-w-xs mx-auto text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
            <Wifi className="w-3.5 h-3.5" />
            <span>Administrator Approval Required</span>
          </div>
          <p className="text-[11px]">
            Please present this screen or the <strong>MAC Address ID</strong> above to the operator at the main workstation PC to authorize your device.
          </p>
        </div>

        {/* Pulsing Poll Loader status */}
        <div className="flex items-center justify-center gap-2 pt-2 text-[10px] font-mono text-slate-500">
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin text-cyan-400" : ""}`} />
          <span>Polling workstation authorization status...</span>
        </div>
      </div>

      <div className="mt-8 text-slate-600 font-mono text-[9px] uppercase tracking-wider">
        Orthoscan Mechanical Alignment Medical Workstation v2.5.0
      </div>
    </div>
  );
}
