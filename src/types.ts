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

