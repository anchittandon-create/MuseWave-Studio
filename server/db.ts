import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'database.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    mobileNumber TEXT UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    userId TEXT,
    trackName TEXT,
    prompt TEXT,
    genres TEXT,
    moods TEXT,
    tempoRange TEXT,
    durationRequested INTEGER,
    durationGenerated INTEGER,
    segmentsGenerated INTEGER,
    lyrics TEXT,
    artistInspiration TEXT,
    vocalLanguage TEXT,
    vocalStyle TEXT,
    structurePreference TEXT,
    energyLevel TEXT,
    creativityLevel TEXT,
    instrumentationFocus TEXT,
    productionStyle TEXT,
    eraInfluence TEXT,
    recordingStyle TEXT,
    mixingStyle TEXT,
    masteringStyle TEXT,
    generateVideo BOOLEAN,
    videoStyle TEXT,
    videoPrompt TEXT,
    audioMasterUrl TEXT,
    videoUrl TEXT,
    status TEXT,
    progressPercentage REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    userId TEXT,
    albumName TEXT,
    albumVibePrompt TEXT,
    trackIds TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    trackId TEXT,
    userId TEXT,
    segmentIndex INTEGER,
    storagePath TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(trackId) REFERENCES tracks(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

export default db;
