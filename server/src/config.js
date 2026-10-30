import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Always read server/.env, no matter which folder the server is started from.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const EXAMPLE_SECRET = 'replace-this-with-a-long-random-secret';

export class ConfigError extends Error {
  constructor(problems) {
    super('Invalid server configuration.');
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

function parseOrigins(value, problems) {
  const origins = [];
  for (const item of value.split(',').map(part => part.trim()).filter(Boolean)) {
    try {
      const url = new URL(item);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
      origins.push(url.origin);
    } catch {
      problems.push(`CLIENT_URL contains "${item}", which is not a valid web address such as http://localhost:5173.`);
    }
  }
  return [...new Set(origins)];
}

// Reads and checks the environment. Never includes secret values in its messages.
export function loadConfig(env = process.env) {
  const problems = [];
  const nodeEnv = env.NODE_ENV || 'development';

  let port = 5000;
  if (env.PORT !== undefined && env.PORT !== '') {
    const value = Number(env.PORT);
    if (Number.isInteger(value) && value >= 1 && value <= 65535) port = value;
    else problems.push('PORT must be a whole number between 1 and 65535.');
  }

  const mongoUri = (env.MONGODB_URI || '').trim();
  if (!mongoUri) problems.push('MONGODB_URI is required. Use your local MongoDB or MongoDB Atlas connection string.');
  else if (!/^mongodb(\+srv)?:\/\//.test(mongoUri)) problems.push('MONGODB_URI must start with mongodb:// or mongodb+srv://.');

  const jwtSecret = env.JWT_SECRET || '';
  if (!jwtSecret) problems.push('JWT_SECRET is required. Use a long random value.');
  else if (jwtSecret === EXAMPLE_SECRET) problems.push('JWT_SECRET is still the example value. Replace it with your own long random value.');
  else if (jwtSecret.length < 32) problems.push('JWT_SECRET must be at least 32 characters long.');

  const clientUrl = (env.CLIENT_URL || '').trim();
  let clientOrigins = [];
  if (!clientUrl && nodeEnv !== 'production') problems.push('CLIENT_URL is required. For local work use http://localhost:5173.');
  else {
    if (clientUrl) {
      clientOrigins = parseOrigins(clientUrl, problems);
      if (!clientOrigins.length && !problems.some(item => item.startsWith('CLIENT_URL'))) problems.push('CLIENT_URL must contain at least one web address.');
    }
  }

  const geminiApiKey = (env.GEMINI_API_KEY || '').trim();
  // GEMMA_MODEL is supported so existing local settings continue to work.
  const geminiModel = (env.GEMINI_MODEL || env.GEMMA_MODEL || '').trim();

  if (problems.length) throw new ConfigError(problems);
  return { nodeEnv, isProduction: nodeEnv === 'production', port, mongoUri, jwtSecret, clientOrigins, geminiApiKey, geminiModel };
}
