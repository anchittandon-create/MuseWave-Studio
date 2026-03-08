import express from 'express';
import cors from 'cors';
import db from './server/db.js';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';
const storageDir = path.join(process.cwd(), 'storage');

// Helper to get user storage paths
const getUserStoragePaths = (userId: string, trackId: string) => {
  const userDir = path.join(storageDir, 'users', userId);
  const trackDir = path.join(userDir, 'tracks', trackId);
  const segmentsDir = path.join(trackDir, 'segments');
  const finalDir = path.join(trackDir, 'final');
  
  [userDir, trackDir, segmentsDir, finalDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  
  return { segmentsDir, finalDir };
};

// Auth Middleware
const requireAuth = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  const { name, mobileNumber } = req.body;
  if (!name || !mobileNumber) return res.status(400).json({ error: 'Name and mobile number required' });
  
  // In a real app, send OTP here. For now, we simulate OTP sent.
  res.json({ success: true, message: 'OTP sent (use 123456 to verify)' });
});

app.post('/api/auth/verify', (req, res) => {
  const { name, mobileNumber, otp } = req.body;
  
  if (otp !== '123456') return res.status(400).json({ error: 'Invalid OTP' });
  
  let user = db.prepare('SELECT * FROM users WHERE mobileNumber = ?').get(mobileNumber) as any;
  
  if (!user) {
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, name, mobileNumber) VALUES (?, ?, ?)').run(id, name, mobileNumber);
    user = { id, name, mobileNumber };
  }
  
  const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  res.json({ success: true, user });
});

app.get('/api/auth/me', requireAuth, (req: any, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Serve audio files with Range support
app.get('/audio/:userId/:trackId/:file', (req, res) => {
  const { userId, trackId, file } = req.params;
  const { finalDir } = getUserStoragePaths(userId, trackId);
  const filePath = path.join(finalDir, file);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).end();
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': file.endsWith('.mp3') ? 'audio/mpeg' : file.endsWith('.mp4') ? 'video/mp4' : 'audio/wav',
      'Cache-Control': 'no-cache'
    };
    res.writeHead(206, head);
    fileStream.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': file.endsWith('.mp3') ? 'audio/mpeg' : file.endsWith('.mp4') ? 'video/mp4' : 'audio/wav',
      'Cache-Control': 'no-cache'
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Create Track
app.post('/api/tracks', requireAuth, (req: any, res) => {
  const { trackName, prompt, genres, durationRequested } = req.body;
  const id = uuidv4();
  const userId = req.user.id;
  
  const stmt = db.prepare(`
    INSERT INTO tracks (id, userId, trackName, prompt, genres, durationRequested, durationGenerated, segmentsGenerated, status, progressPercentage)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'generating', 0)
  `);
  
  stmt.run(id, userId, trackName, prompt, JSON.stringify(genres), durationRequested);
  
  // Create empty master file
  const { finalDir } = getUserStoragePaths(userId, id);
  const masterPath = path.join(finalDir, `audio.wav`);
  fs.writeFileSync(masterPath, Buffer.alloc(0));
  
  res.json({ id });
});

// Get Tracks
app.get('/api/tracks', requireAuth, (req: any, res) => {
  const tracks = db.prepare('SELECT * FROM tracks WHERE userId = ? ORDER BY createdAt DESC').all(req.user.id);
  res.json(tracks.map((t: any) => ({ ...t, genres: JSON.parse(t.genres || '[]') })));
});

// Get Track
app.get('/api/tracks/:id', requireAuth, (req: any, res) => {
  const track = db.prepare('SELECT * FROM tracks WHERE id = ? AND userId = ?').get(req.params.id, req.user.id) as any;
  if (track) {
    res.json({ ...track, genres: JSON.parse(track.genres || '[]') });
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Process Segment
app.post('/api/tracks/:id/segment', requireAuth, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { base64Audio, currentSegment, durationGenerated, progressPercentage } = req.body;
  
  const track = db.prepare('SELECT * FROM tracks WHERE id = ? AND userId = ?').get(id, userId) as any;
  if (!track) return res.status(404).json({ error: 'Not found' });
  
  const { segmentsDir, finalDir } = getUserStoragePaths(userId, id);
  const masterWavPath = path.join(finalDir, `audio.wav`);
  
  try {
    const segmentBuffer = Buffer.from(base64Audio, 'base64');
    const segmentPath = path.join(segmentsDir, `${currentSegment}.wav`);
    fs.writeFileSync(segmentPath, segmentBuffer);
    
    // Progressive Master File Stitching
    if (currentSegment === 0) {
      fs.copyFileSync(segmentPath, masterWavPath);
    } else {
      // Append with crossfade using ffmpeg
      const tempMaster = path.join(segmentsDir, `temp_master_${currentSegment}.wav`);
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(masterWavPath)
          .input(segmentPath)
          .complexFilter([
            '[0:a][1:a]acrossfade=d=0.1:c1=tri:c2=tri[a]'
          ])
          .map('[a]')
          .save(tempMaster)
          .on('end', resolve)
          .on('error', reject);
      });
      fs.copyFileSync(tempMaster, masterWavPath);
    }
    
    // Update Progress
    db.prepare(`
      UPDATE tracks 
      SET durationGenerated = ?, segmentsGenerated = ?, progressPercentage = ?, audioMasterUrl = ?
      WHERE id = ?
    `).run(durationGenerated, currentSegment + 1, progressPercentage, `/audio/${userId}/${id}/audio.wav`, id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Segment processing error:', error);
    db.prepare(`UPDATE tracks SET status = 'error' WHERE id = ?`).run(id);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// Finalize Track
app.post('/api/tracks/:id/finalize', requireAuth, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const track = db.prepare('SELECT * FROM tracks WHERE id = ? AND userId = ?').get(id, userId) as any;
  if (!track) return res.status(404).json({ error: 'Not found' });
  
  const { segmentsDir, finalDir } = getUserStoragePaths(userId, id);
  const masterWavPath = path.join(finalDir, `audio.wav`);
  const masterMp3Path = path.join(finalDir, `audio.mp3`);
  const durationRequested = track.durationRequested;
  
  try {
    // Final Trim & Post Processing
    const finalMasterWav = path.join(segmentsDir, 'final_master.wav');
    await new Promise((resolve, reject) => {
      ffmpeg(masterWavPath)
        .setDuration(durationRequested)
        .audioFilters([
          'loudnorm', // normalize loudness
          'alimiter=limit=-1dB', // apply limiter
          'afade=t=in:ss=0:d=1', // fade in
          `afade=t=out:st=${durationRequested - 2}:d=2` // fade out
        ])
        .save(finalMasterWav)
        .on('end', resolve)
        .on('error', reject);
    });
    
    fs.copyFileSync(finalMasterWav, masterWavPath);
    
    // Convert to MP3
    await new Promise((resolve, reject) => {
      ffmpeg(masterWavPath)
        .toFormat('mp3')
        .save(masterMp3Path)
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Final Firestore Update
    db.prepare(`
      UPDATE tracks 
      SET status = 'completed', progressPercentage = 100, audioMasterUrl = ?, videoUrl = ?
      WHERE id = ?
    `).run(`/audio/${userId}/${id}/audio.mp3`, track.videoUrl || null, id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Finalization error:', error);
    db.prepare(`UPDATE tracks SET status = 'error' WHERE id = ?`).run(id);
    res.status(500).json({ error: 'Finalization failed' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
