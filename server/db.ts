import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'database.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    trackName TEXT,
    prompt TEXT,
    genres TEXT,
    durationRequested INTEGER,
    durationGenerated INTEGER,
    segmentsGenerated INTEGER,
    audioMasterUrl TEXT,
    videoUrl TEXT,
    status TEXT,
    progressPercentage REAL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
