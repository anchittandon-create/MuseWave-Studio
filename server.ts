import express from "express";
import cors from "cors";
import db from "./server/db";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { v4 as uuidv4 } from "uuid";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "http";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }) as any);
app.use(express.urlencoded({ extended: true, limit: "50mb" }) as any);

const storageDir = path.join(process.cwd(), "storage");
const audioDir = path.join(storageDir, "audio");
const tempDir = path.join(storageDir, "tempSegments");

[storageDir, audioDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});



/* ---------------- AUDIO STREAM ---------------- */

app.get("/audio/:file", (req, res) => {
  const filePath = path.join(audioDir, req.params.file);

  if (!fs.existsSync(filePath)) {
    res.status(404).end();
    return;
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Type": req.params.file.endsWith(".mp3")
        ? "audio/mpeg"
        : "audio/wav",
    });

    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0]);
  const end = parts[1] ? parseInt(parts[1]) : stat.size - 1;

  const stream = fs.createReadStream(filePath, { start, end });

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Type": req.params.file.endsWith(".mp3")
      ? "audio/mpeg"
      : "audio/wav",
  });

  stream.pipe(res);
});



/* ---------------- CREATE TRACK ---------------- */

app.post("/api/tracks", (req, res) => {
  const { trackName, prompt, genres, durationRequested } = req.body;

  const id = uuidv4();

  db.prepare(`
    INSERT INTO tracks 
    (id, trackName, prompt, genres, durationRequested, durationGenerated, segmentsGenerated, status, progressPercentage)
    VALUES (?, ?, ?, ?, ?, 0, 0, 'generating', 0)
  `).run(id, trackName, prompt, JSON.stringify(genres), durationRequested);

  res.json({ id });
});



/* ---------------- GET TRACKS ---------------- */

app.get("/api/tracks", (req, res) => {
  const tracks = db.prepare("SELECT * FROM tracks ORDER BY createdAt DESC").all();

  res.json(
    tracks.map((t: any) => ({
      ...t,
      genres: JSON.parse(t.genres),
    }))
  );
});



/* ---------------- PROCESS SEGMENT ---------------- */

app.post("/api/tracks/:id/segment", async (req, res) => {
  const { id } = req.params;
  const { base64Audio, currentSegment, durationGenerated, progressPercentage } = req.body;

  const track = db.prepare("SELECT * FROM tracks WHERE id=?").get(id) as any;
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  const trackTempDir = path.join(tempDir, id);
  if (!fs.existsSync(trackTempDir)) fs.mkdirSync(trackTempDir, { recursive: true });

  const segmentPath = path.join(trackTempDir, `segment_${currentSegment}.wav`);
  const masterPath = path.join(audioDir, `${id}_master.wav`);

  try {
    const buffer = Buffer.from(base64Audio, "base64");
    fs.writeFileSync(segmentPath, buffer);

    if (currentSegment === 0) {
      fs.copyFileSync(segmentPath, masterPath);
    } else {
      const tempMaster = path.join(trackTempDir, `temp_master.wav`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(masterPath)
          .input(segmentPath)
          .complexFilter(["[0:a][1:a]acrossfade=d=0.1:c1=tri:c2=tri[a]"])
          .map("[a]")
          .save(tempMaster)
          .on("end", () => resolve())
          .on("error", reject);
      });

      fs.copyFileSync(tempMaster, masterPath);
    }

    db.prepare(`
      UPDATE tracks 
      SET durationGenerated=?, segmentsGenerated=?, progressPercentage=?, audioMasterUrl=?
      WHERE id=?
    `).run(
      durationGenerated,
      currentSegment + 1,
      progressPercentage,
      `/audio/${id}_master.wav`,
      id
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    db.prepare(`UPDATE tracks SET status='error' WHERE id=?`).run(id);
    res.status(500).json({ error: "segment processing failed" });
  }
});



/* ---------------- FINALIZE TRACK ---------------- */

app.post("/api/tracks/:id/finalize", async (req, res) => {
  const { id } = req.params;

  const track = db.prepare("SELECT * FROM tracks WHERE id=?").get(id) as any;
  if (!track) {
    res.status(404).json({ error: "Track not found" });
    return;
  }

  const masterWav = path.join(audioDir, `${id}_master.wav`);
  const masterMp3 = path.join(audioDir, `${id}_master.mp3`);

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(masterWav)
        .audioFilters(["loudnorm"])
        .toFormat("mp3")
        .save(masterMp3)
        .on("end", () => resolve())
        .on("error", reject);
    });

    db.prepare(`
      UPDATE tracks
      SET status='completed', progressPercentage=100, audioMasterUrl=?
      WHERE id=?
    `).run(`/audio/${id}_master.mp3`, id);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "finalize failed" });
  }
});



/* ---------------- SERVER START ---------------- */

async function startServer() {

  if (process.env.NODE_ENV !== "production") {

    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });

    app.use((req, res, next) => {
      vite.middlewares(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse,
        next
      );
    });

  }

  const PORT = 3000;

  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
  });
}

startServer();