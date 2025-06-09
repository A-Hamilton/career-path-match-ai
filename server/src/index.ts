// Modular Express server for Career Path Match AI
import express from 'express';
import cors from 'cors';
import { appConfig, validateConfig } from './config/app';
import { logger } from './utils/logger';
import { cleanupService } from './services/cleanup';
import { MaintenanceService } from './services/maintenance';
import routes from './routes';
import cron from 'node-cron';

// Validate configuration
validateConfig();

// Initialize Express app
export const app = express();

// Middleware
app.use(cors({
  origin: appConfig.corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { query: req.query });
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/', routes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: appConfig.nodeEnv === 'development' ? err.message : 'Something went wrong' 
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Start server only when running directly (not during tests)
if (require.main === module) {  // Initialize cleanup service
  cleanupService.startScheduledCleanup();

  app.listen(appConfig.port, () => {
    logger.info(`Server running on port ${appConfig.port} in ${appConfig.nodeEnv} mode`);
  });

  // Schedule daily maintenance at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      await MaintenanceService.removeStaleJobs();
    } catch (e) {
      logger.error('Maintenance job failed:', e);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    cleanupService.stopScheduledCleanup();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    cleanupService.stopScheduledCleanup();
    process.exit(0);
  });
}

export default app;