import express, { Request, Response } from "express";
import morgan from "morgan";
import axios from "axios";
import session from "express-session";
import * as dotenv from "dotenv";
import marked from "marked";
dotenv.config();

declare module "express-session" {
  interface SessionData {
    notes: { title: string; body: string }[];
  }
}

const app = express();
//middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSIONSECRET!,
    resave: false,
    saveUninitialized: true,
  })
);

const languageUrl = "https://api.languagetoolplus.com/v2/check";

app.listen(3000, () => {
  console.log("running on port...");
});

app.post("/errorCheck", async (req: Request, res: Response) => {
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
    console.log("response: ", response.data);
    res.send(response.data.matches);
  } catch (error: any) {
    console.log("Something Went Wrong...\n", error);
    res.status(500).json(error.message);
  }
});

app.post("/text", (req: Request, res: Response) => {
  if (!req.session.notes) {
    req.session.notes = [];
  }
  req.session.notes.push({
    title: `note ${req.session.notes.length + 1}`,
    body: req.body,
  });
  res.status(201).json({ message: "text saved", data: req.body });
});

app.get("/text", (req: Request, res: Response) => {
  res.status(200).json({ notes: req.session.notes });
});

app.post("/rendered", async (req: Request, res: Response) => {
  const data = req.body;
  const markedData = marked.parse(data.text);
  res.status(200).send(markedData);
});
