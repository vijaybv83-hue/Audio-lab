import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/lyrics/online", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing. Please configure it in AI Studio Settings." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a helpful assistant that supplies song lyrics. 
        Please provide ONLY the lyrics for the song requested by the user, nothing else. If you don't know it, reply with exactly 'Lyrics not found'. 
        
        Song query: ${query}`
      });
      
      res.json({ lyrics: response.text });
    } catch (e: any) {
      console.error(e);
      let errorMessage = e.message || "Failed to fetch lyrics";
      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        errorMessage = "Invalid Gemini API Key. Please make sure your GEMINI_API_KEY is configured correctly in the AI Studio Settings.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/lyrics/audio", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Audio file is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is missing. Please configure it in AI Studio Settings." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const mimeType = req.file.mimetype || 'audio/mp3';
      const base64Data = req.file.buffer.toString("base64");

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            text: "Listen to this audio, automatically detect the primary language of the vocals, and extract/transcribe the song lyrics in that original language to ensure maximum accuracy. Only respond with the transribed lyrics text, no other conversational filler."
          },
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          }
        ]
      });

      res.json({ lyrics: response.text });
    } catch (e: any) {
      console.error(e);
      let errorMessage = e.message || "Failed to generate lyrics from audio";
      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
        errorMessage = "Invalid Gemini API Key. Please make sure your GEMINI_API_KEY is configured correctly in the AI Studio Settings.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = process.cwd() + '/dist';
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(distPath + '/index.html');
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
