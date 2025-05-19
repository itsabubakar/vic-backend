import express, { Request, Response } from "express";
import morgan from "morgan";
import axios from "axios";
import session from "express-session";
import * as dotenv from "dotenv";
import marked from "marked";
import cors from "cors";
//note
dotenv.config();

declare module "express-session" {
  interface SessionData {
    notes: { title: string; body: string }[];
  }
}

const app = express();
//middleware
app.use(morgan("dev"));
app.use(cors({ origin: ["http://localhost:8081"], credentials: true }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSIONSECRET!,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      // maxAge, etc, as needed
    },
  })
);
const PORT = process.env.PORT || 3000;

const languageUrl = "https://api.languagetoolplus.com/v2/check";

app.listen(PORT, () => {
  console.log("running on port...");
});

app.post("/errorCheck", async (req: Request, res: Response) => {
  if (typeof req.body !== "object" || typeof req.body.text !== "string") {
    res.status(400).send("text field is required and must be a string");
    return;
  }
  const text = req.body;
  try {
    const response = await axios.post(
      languageUrl,
      {
        text: text.text,
        language: "en-US",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    res.json({ errors: response.data.matches, text: text.text });
  } catch (error: any) {
    console.log("Something Went Wrong...\n", error);
    res.status(500).json(error.message);
  }
});

app.post("/text", (req: Request, res: Response) => {
  if (typeof req.body !== "object" || typeof req.body.text !== "string") {
    res.status(400).send("text field is required and must be a string");
    return;
  }
  console.log("Session ID:", req.session.id);
  console.log("Before:", req.session.notes);

  if (!req.session.notes) {
    req.session.notes = [];
  }
  req.session.notes.push({
    title: `note ${req.session.notes.length + 1}`,
    body: req.body,
  });
  console.log("After:", req.session.notes);
  res.status(201).json({ message: "text saved", data: req.body });
});

app.get("/text", (req: Request, res: Response) => {
  console.log("GET Session ID:", req.session.id);
  console.log("GET Notes:", req.session.notes);
  if (!req.session.notes) req.session.notes = [];
  res.status(200).json({ notes: req.session.notes });
});

app.post("/rendered", async (req: Request, res: Response) => {
  if (typeof req.body !== "object" || typeof req.body.text !== "string") {
    res.status(400).send("text field is required and must be a string");
    return;
  }
  const data = req.body;
  const markedData = marked.parse(data.text);
  res.status(200).send(markedData);
});
