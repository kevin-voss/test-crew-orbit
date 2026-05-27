import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatRouter } from "./routes/chat.js";

/**
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", chatRouter);
  return app;
}

const port = Number(process.env.PORT) || 3001;

if (process.argv[1]?.endsWith("server.js")) {
  createApp().listen(port, () => {
    console.log(`Chatbot API listening on http://localhost:${port}`);
  });
}
