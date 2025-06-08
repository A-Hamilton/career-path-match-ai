// App configuration and constants
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from the server directory
const envPath = path.join(__dirname, '..', '..', '.env');
config({ path: envPath });

export const APP_CONFIG = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_TIMEOUT: 10000,
  
  // Rate limiting
  AI_CALL_DELAY_MS: 4500, // 4.5 seconds between calls (13 calls/minute max)
  MAX_AI_ENRICHMENTS_PER_REQUEST: 3,
  FIRESTORE_READ_THROTTLE_MS: 1000, // 1 second between reads
  
  // Cache TTL settings
  CACHE_TTL_MS: 60 * 60 * 1000, // 1 hour
  ENRICHMENT_CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
  QUERY_CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes
  
  // Pagination
  DEFAULT_PAGE_SIZE: 3,
  MAX_PAGE_SIZE: 10,
  
  // Firestore
  MAX_BATCH_SIZE: 500, // Firestore batch limit
  JOB_RETENTION_DAYS: 30,
} as const;

export const API_ENDPOINTS = {
  THEIRSTACK_SEARCH: 'https://api.theirstack.com/v1/jobs/search',
} as const;

export const REQUIRED_ENV_VARS = [
  'THEIRSTACK_API_KEY',
  'GEMINI_API_KEY',
] as const;

// Validate environment variables
export function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  theirStackApiKey: string;
  geminiApiKey: string;
  corsOrigin: string;
}

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  theirStackApiKey: process.env.THEIRSTACK_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',
};

// Validate required environment variables
export function validateConfig(): void {
  const requiredVars = ['THEIRSTACK_API_KEY', 'GEMINI_API_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}
