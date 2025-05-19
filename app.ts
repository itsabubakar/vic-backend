import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import axios from "axios";
import session from "express-session";
import * as dotenv from "dotenv";
import { marked } from "marked";
import cors from "cors";

// 1. First, create a custom type for async handlers
type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

// 2. Create a wrapper function to handle async errors
const asyncHandler =
  (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Environment setup
dotenv.config();

// Session type extension
declare module "express-session" {
  interface SessionData {
    notes: { title: string; body: string }[];
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const languageUrl = "https://api.languagetoolplus.com/v2/check";

// Middleware
app.use(morgan("dev"));
app.use(
  cors({
    origin: ["https://markdownfrontend.netlify.app"],
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
// Update your CORS configuration
app.use(
  cors({
    origin: [
      "https://markdownfrontend.netlify.app",
      "http://localhost:3000", // For local testing
    ],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Update session configuration
app.use(
  session({
    secret: process.env.SESSIONSECRET!,
    resave: false,
    saveUninitialized: false, // Changed for GDPR compliance
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      domain:
        process.env.NODE_ENV === "production"
          ? ".onrender.com" // Your Render domain
          : undefined, // Localhost doesn't need domain
    },
  })
);

// Add OPTIONS handler for preflight requests
app.options("*", cors());

// Server startup
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Error checking endpoint
app.post(
  "/errorCheck",
  asyncHandler(async (req: Request, res: Response) => {
    if (typeof req.body?.text !== "string") {
      return res
        .status(400)
        .send("text field is required and must be a string");
    }

    const response = await axios.post(
      languageUrl,
      new URLSearchParams({ text: req.body.text, language: "en-US" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    res.json({ errors: response.data.matches, text: req.body.text });
  })
);

// Save text endpoint
app.post(
  "/text",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.body || typeof req.body.text !== "string") {
      return res
        .status(400)
        .json({ error: "text field is required and must be a string" });
    }

    if (!req.session.notes) {
      req.session.notes = [];
    }

    req.session.notes.push({
      title: `Note ${req.session.notes.length + 1}`,
      body: req.body.text, // Fixed: Store text directly instead of entire body
    });

    res.status(201).json({ message: "Text saved", data: req.body.text });
  })
);

// Get text endpoint
app.get("/text", (req: Request, res: Response) => {
  res.status(200).json({ notes: req.session.notes || [] });
});

// Markdown rendering endpoint
app.post(
  "/rendered",
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.body || typeof req.body.text !== "string") {
      return res
        .status(400)
        .json({ error: "text field is required and must be a string" });
    }

    try {
      const markedData = marked.parse(req.body.text);
      res.status(200).send(markedData);
    } catch (error: unknown) {
      console.error("Markdown parsing error:", error);
      res.status(500).json({ error: "Failed to parse markdown" });
    }
  })
);

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ status: "Server is healthy" });
});
