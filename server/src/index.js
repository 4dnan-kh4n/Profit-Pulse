import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigError, loadConfig } from './config.js';
import { createApp } from './app.js';

let config;
try {
  config = loadConfig();
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  console.error('Profit Pulse API cannot start. Fix these settings in server/.env:');
  for (const problem of error.problems) console.error(`  - ${problem}`);
  console.error('Copy server/.env.example to server/.env if you have not already.');
  process.exit(1);
}

try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
} catch {
  console.error('Could not connect to MongoDB. Check that MONGODB_URI is correct and that the database is running or reachable.');
  process.exit(1);
}

const app = createApp(config);
if (config.isProduction) {
  const websiteDirectory = fileURLToPath(new URL('../../dist/', import.meta.url));
  app.use(express.static(websiteDirectory, { index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(websiteDirectory, 'index.html')));
}

const server = app.listen(config.port, '0.0.0.0', () => console.log(`Profit Pulse API running on port ${config.port}`));
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${config.port} is already in use. Stop the other program or change PORT in server/.env.` : `The server could not start (${error.code || error.name}).`);
  process.exit(1);
});
