import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase limit for high-res base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API route to analyze X-ray
app.post("/api/analyze-xray", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
      You are an expert orthopaedic radiologist and automated landmark detector.
      Analyze this scanogram (full-leg X-ray showing the pelvis, femur, tibia, and ankle) to detect landmarks for Hip-Knee-Ankle (HKA) mechanical axis plotting.
      
      Locate the following key anatomical points on both the Left leg and the Right leg (from the patient's anatomical perspective, i.e., anatomical left is usually on the right side of the image, but analyze carefully based on any L/R marker or typical orientation):
      
      1. Hip Center (femoral head center)
      2. Knee Center (intercondylar notch of the femur / center of tibial eminence)
      3. Ankle Center (center of the talar dome / midpoint of the tibial plafond)
      
      All coordinates MUST be returned as normalized percentages from 0.0 to 1.0 relative to the image:
      - x: 0.0 is the far left edge of the image, 1.0 is the far right edge of the image.
      - y: 0.0 is the very top edge, 1.0 is the very bottom edge.
      
      If only one leg is visible, set detected: false for the other leg.
      Provide a highly precise clinical observation of the alignment, mentioning whether there is Varus (bow-legged, HKA < 180) or Valgus (knock-kneed, HKA > 180) alignment or if it is Neutral.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "image/png",
            data: cleanBase64,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leftLeg: {
              type: Type.OBJECT,
              properties: {
                detected: { type: Type.BOOLEAN },
                hip: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER, description: "Normalized x-coordinate (0.0 - 1.0) of hip center" },
                    y: { type: Type.NUMBER, description: "Normalized y-coordinate (0.0 - 1.0) of hip center" },
                  },
                  required: ["x", "y"],
                },
                knee: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER, description: "Normalized x-coordinate (0.0 - 1.0) of knee center" },
                    y: { type: Type.NUMBER, description: "Normalized y-coordinate (0.0 - 1.0) of knee center" },
                  },
                  required: ["x", "y"],
                },
                ankle: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER, description: "Normalized x-coordinate (0.0 - 1.0) of ankle center" },
                    y: { type: Type.NUMBER, description: "Normalized y-coordinate (0.0 - 1.0) of ankle center" },
                  },
                  required: ["x", "y"],
                },
              },
              required: ["detected", "hip", "knee", "ankle"],
            },
            rightLeg: {
              type: Type.OBJECT,
              properties: {
                detected: { type: Type.BOOLEAN },
                hip: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER, description: "Normalized x-coordinate (0.0 - 1.0) of hip center" },
                    y: { type: Type.NUMBER, description: "Normalized y-coordinate (0.0 - 1.0) of hip center" },
                  },
                  required: ["x", "y"],
                },
                knee: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER, description: "Normalized x-coordinate (0.0 - 1.0) of knee center" },
                    y: { type: Type.NUMBER, description: "Normalized y-coordinate (0.0 - 1.0) of knee center" },
                  },
                  required: ["x", "y"],
                },
                ankle: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER, description: "Normalized x-coordinate (0.0 - 1.0) of ankle center" },
                    y: { type: Type.NUMBER, description: "Normalized y-coordinate (0.0 - 1.0) of ankle center" },
                  },
                  required: ["x", "y"],
                },
              },
              required: ["detected", "hip", "knee", "ankle"],
            },
            clinicalObservation: {
              type: Type.STRING,
              description: "Brief radiological analysis describing knee alignment (Varus/Valgus/Neutral) for the detected legs.",
            },
          },
          required: ["leftLeg", "rightLeg", "clinicalObservation"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini API");
    }

    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Error analyzing X-ray:", error);
    res.status(500).json({ error: error.message || "Failed to analyze X-ray image" });
  }
});

// Configure Vite or serve static files
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start server:", err);
});
