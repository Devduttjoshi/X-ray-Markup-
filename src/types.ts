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
