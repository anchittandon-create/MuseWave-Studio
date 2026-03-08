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

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();

app.use(cors());

app.use(express.json({ limit: "50mb" }) as any)
app.use(express.urlencoded({ extended: true, limit: "50mb" }) as any)

const storageDir = path.join(process.cwd(), "storage");
const audioDir = path.join(storageDir, "audio");
const tempDir = path.join(storageDir, "tempSegments");

[storageDir, audioDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/* ----------------------- AUDIO STREAM WITH RANGE SUPPORT ----------------------- */

app.get("/audio/:file", (req, res) => {
  const file = req.params.file;
  const filePath = path.join(audioDir, file);

  if (!fs.existsSync(filePath)) {
    res.status(404).end();
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": file.endsWith(".mp3") ? "audio/mpeg" : "audio/wav",
      "Cache-Control": "no-cache",
    });

    stream.pipe(res);
  } else {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": file.endsWith(".mp3") ? "audio/mpeg" : "audio/wav",
      "Cache-Control": "no-cache",
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

/* -------------------------------- CREATE TRACK -------------------------------- */

app.post("/api/tracks", (req, res) => {
  const { trackName, prompt, genres, durationRequested } = req.body;

  const id = uuidv4();

  db.prepare(`
    INSERT INTO tracks 
    (id, trackName, prompt, genres, durationRequested, durationGenerated, segmentsGenerated, status, progressPercentage)
    VALUES (?, ?, ?, ?, ?, 0, 0, 'generating', 0)
  `).run(id, trackName, prompt, JSON.stringify(genres), durationRequested);

  const masterPath = path.join(audioDir, `${id}_master.wav`);
  fs.writeFileSync(masterPath, Buffer.alloc(0));

  res.json({ id });
});

/* -------------------------------- GET TRACKS -------------------------------- */

app.get("/api/tracks", (req, res) => {
  const tracks = db.prepare("SELECT * FROM tracks ORDER BY createdAt DESC").all();

  res.json(
    tracks.map((t: any) => ({
      ...t,
      genres: JSON.parse(t.genres),
    }))
  );
});

/* -------------------------------- GET TRACK -------------------------------- */

app.get("/api/tracks/:id", (req, res) => {
  const track = db.prepare("SELECT * FROM tracks WHERE id = ?").get(req.params.id) as any;

  if (!track) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    ...track,
    genres: JSON.parse(track.genres),
  });
});

/* -------------------------------- PROCESS SEGMENT -------------------------------- */

app.post("/api/tracks/:id/segment", async (req, res) => {
  const { id } = req.params;
  const { base64Audio, currentSegment, durationGenerated, progressPercentage } = req.body;

  const track = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id) as any;
  if (!track) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const trackTempDir = path.join(tempDir, id);
  if (!fs.existsSync(trackTempDir)) {
    fs.mkdirSync(trackTempDir, { recursive: true });
  }

  const masterWavPath = path.join(audioDir, `${id}_master.wav`);

  try {
    const segmentBuffer = Buffer.from(base64Audio, "base64");
    const segmentPath = path.join(trackTempDir, `segment_${currentSegment}.wav`);
    fs.writeFileSync(segmentPath, segmentBuffer);

    if (currentSegment === 0) {
      fs.copyFileSync(segmentPath, masterWavPath);
    } else {
      const tempMaster = path.join(trackTempDir, `temp_master_${currentSegment}.wav`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(masterWavPath)
          .input(segmentPath)
          .complexFilter(["[0:a][1:a]acrossfade=d=0.1:c1=tri:c2=tri[a]"])
          .map("[a]")
          .save(tempMaster)
          .on("end", () => resolve())
          .on("error", reject);
      });

      fs.copyFileSync(tempMaster, masterWavPath);
    }

    db.prepare(`
      UPDATE tracks 
      SET durationGenerated = ?, segmentsGenerated = ?, progressPercentage = ?, audioMasterUrl = ?
      WHERE id = ?
    `).run(durationGenerated, currentSegment + 1, progressPercentage, `/audio/${id}_master.wav`, id);

    res.json({ success: true });
  } catch (error) {
    console.error("Segment processing error:", error);

    db.prepare(`UPDATE tracks SET status = 'error' WHERE id = ?`).run(id);

    res.status(500).json({ error: "Processing failed" });
  }
});

/* -------------------------------- FINALIZE TRACK -------------------------------- */

app.post("/api/tracks/:id/finalize", async (req, res) => {
  const { id } = req.params;

  const track = db.prepare("SELECT * FROM tracks WHERE id = ?").get(id) as any;

  if (!track) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const trackTempDir = path.join(tempDir, id);
  const masterWavPath = path.join(audioDir, `${id}_master.wav`);
  const masterMp3Path = path.join(audioDir, `${id}_master.mp3`);

  const durationRequested = track.durationRequested;

  try {
    const finalMasterWav = path.join(trackTempDir, "final_master.wav");

    await new Promise<void>((resolve, reject) => {
      ffmpeg(masterWavPath)
        .setDuration(durationRequested)
        .audioFilters([
          "loudnorm",
          "alimiter=limit=-1dB",
          "afade=t=in:ss=0:d=1",
          `afade=t=out:st=${durationRequested - 2}:d=2`,
        ])
        .save(finalMasterWav)
        .on("end", () => resolve())
        .on("error", reject);
    });

    fs.copyFileSync(finalMasterWav, masterWavPath);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(masterWavPath)
        .toFormat("mp3")
        .save(masterMp3Path)
        .on("end", () => resolve())
        .on("error", reject);
    });

    db.prepare(`
      UPDATE tracks 
      SET status = 'completed', progressPercentage = 100, audioMasterUrl = ?, videoUrl = ?
      WHERE id = ?
    `).run(`/audio/${id}_master.mp3`, track.videoUrl || null, id);

    res.json({ success: true });
  } catch (error) {
    console.error("Finalization error:", error);

    db.prepare(`UPDATE tracks SET status = 'error' WHERE id = ?`).run(id);

    res.status(500).json({ error: "Finalization failed" });
  }
});

/* -------------------------------- SERVER START -------------------------------- */

import type { IncomingMessage, ServerResponse } from "http";

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();