export interface Point {
  id: string;
  name: "hip" | "knee" | "ankle";
  label: string;
  anatomicalName: string;
  x: number; // percentage of image width (0 - 100)
  y: number; // percentage of image height (0 - 100)
  color: string;
}

export interface LegPoints {
  hip: Point;
  knee: Point;
  ankle: Point;
  detected: boolean;
}

export interface Point13 {
  id: string;
  label: string;
  name: string;
  anatomicalName: string;
  x: number;
  y: number;
  color: string;
}

export interface Points13State {
  "p-sym": Point13;
  "r-fhc": Point13;
  "r-lfc": Point13;
  "r-mfc": Point13;
  "r-ltp": Point13;
  "r-mtp": Point13;
  "r-tc": Point13;
  "l-fhc": Point13;
  "l-mfc": Point13;
  "l-lfc": Point13;
  "l-mtp": Point13;
  "l-ltp": Point13;
  "l-tc": Point13;
}

export interface Calibration {
  active: boolean;
  point1: { x: number; y: number } | null;
  point2: { x: number; y: number } | null;
  physicalLength: number; // in mm
  pixelLength: number; // in pixels
  mmPerPixel: number | null;
}

export interface GeminiAnalysisResponse {
  leftLeg: {
    detected: boolean;
    hip: { x: number; y: number };
    knee: { x: number; y: number };
    ankle: { x: number; y: number };
  };
  rightLeg: {
    detected: boolean;
    hip: { x: number; y: number };
    knee: { x: number; y: number };
    ankle: { x: number; y: number };
  };
  clinicalObservation: string;
}

export interface SampleCase {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  leftLeg: LegPoints;
  rightLeg: LegPoints;
  clinicalObservation: string;
}

export type AIProvider = "gemini" | "openai" | "anthropic" | "custom";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

export interface UpdateStatus {
  currentVersion: string;
  latestVersion: string;
  repo: string;
  hasUpdate: boolean;
  releaseNotes: string;
}

export interface PendingRequest {
  ip: string;
  mac: string;
  timestamp: string;
}

export interface SecurityStatus {
  clientIp: string;
  clientMac: string;
  isAuthorized: boolean;
  securityLevel: "permissive" | "strict";
  whitelist: string[];
  pendingRequests: PendingRequest[];
}

export interface PostOpScan {
  id: string;
  date: string;
  label: string;
  stage: number;
  imageUrl: string;
  boneUnion: number; // 0 - 100
  osteolysis: "None" | "Mild" | "Severe";
  cementation: "Adequate" | "Deficient" | "N/A";
  loosening: "Stable" | "Incipient" | "High Risk";
  complications: string[];
  report: string;
  findings?: {
    name: string;
    idNumber: string;
    scanDate: string;
    procedure: string;
  };
}

export interface PostOpPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  procedure: string;
  scans: PostOpScan[];
}

export interface ComplicationRule {
  id: string;
  category: "Bone Union" | "Osteolysis" | "Cementation" | "Loosening" | "General";
  triggerCondition: string; // "If cortical bridging is incomplete at 6 months"
  classificationValue: string; // "Classify Bone Union as Delayed (15%)"
  description: string;
  createdAt: string;
}

export interface LearningLog {
  id: string;
  timestamp: string;
  patientId: string;
  patientName: string;
  scanId: string;
  scanLabel: string;
  originalReport: string;
  userCorrection: string;
  status: "Active" | "Taught" | "Optimized";
}


