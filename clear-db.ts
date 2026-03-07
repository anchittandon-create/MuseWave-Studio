import db from './server/db.js';
db.prepare('DELETE FROM tracks').run();
console.log('Database cleared');
