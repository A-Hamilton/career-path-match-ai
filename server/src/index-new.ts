// filepath: c:\Users\50055686\Pictures\apps\career-path-match-ai\server\src\index.ts
import express from 'express';
import cors from 'cors';
import { appConfig, validateConfig } from './config/app';
import { cleanupService } from './services/cleanup';
import routes from './routes';
import { logger } from './utils/logger';

// Validate configuration
validateConfig();

// Initialize services
cleanupService.startScheduledCleanup();

// Create Express app
export const app = express();

// Middleware
app.use(cors({
  origin: appConfig.corsOrigin,
  credentials: true
}));
app.use(express.json());

// Mount routes
app.use('/', routes);

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', { error: error.message, stack: error.stack, url: req.url });
  res.status(500).json({ 
    error: 'Internal server error', 
    message: appConfig.nodeEnv === 'development' ? error.message : 'Something went wrong' 
  });
});

// Start server
if (require.main === module) {
  app.listen(appConfig.port, () => {
    logger.info(`Server running on port ${appConfig.port} in ${appConfig.nodeEnv} mode`);
  });
}
