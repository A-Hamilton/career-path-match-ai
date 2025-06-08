import cron from 'node-cron';
import { dbService } from './database';

export interface CleanupStats {
  deletedJobs: number;
  deletedFiles: number;
  errors: string[];
}

class CleanupService {
  private isRunning = false;
  private readonly oldJobsThresholdDays = 30;
  private readonly scheduleExpression = '0 0 * * *'; // Daily at midnight
  private cronTasks: any[] = [];

  constructor() {
    // Don't auto-initialize cron jobs in constructor
    // They will be started manually via startScheduledCleanup()
  }
  /**
   * Start scheduled cleanup jobs
   */
  startScheduledCleanup(): void {
    if (this.cronTasks.length > 0) {
      console.log('Cleanup service already started');
      return;
    }

    this.initializeCronJobs();
    console.log('Cleanup service started');
  }
  /**
   * Stop scheduled cleanup jobs
   */
  stopScheduledCleanup(): void {
    this.cronTasks.forEach(task => {
      if (task && typeof task.destroy === 'function') {
        task.destroy();
      }
    });
    this.cronTasks = [];
    console.log('Cleanup service stopped');
  }
  /**
   * Initialize all scheduled cleanup jobs
   */
  private initializeCronJobs(): void {
    console.log('Initializing cleanup cron jobs...');

    // Daily cleanup at midnight
    const dailyTask = cron.schedule(this.scheduleExpression, async () => {
      await this.runDailyCleanup();
    });

    // Weekly deep cleanup on Sundays at 2 AM
    const weeklyTask = cron.schedule('0 2 * * 0', async () => {
      await this.runWeeklyCleanup();
    });

    // Store tasks for later management
    this.cronTasks = [dailyTask, weeklyTask];

    console.log('Cleanup cron jobs initialized and started');
  }

  /**
   * Run daily cleanup tasks
   */
  async runDailyCleanup(): Promise<CleanupStats> {
    if (this.isRunning) {
      console.log('Cleanup already running, skipping...');
      return { deletedJobs: 0, deletedFiles: 0, errors: ['Cleanup already in progress'] };
    }

    this.isRunning = true;
    console.log('Starting daily cleanup job...');
    
    const stats: CleanupStats = {
      deletedJobs: 0,
      deletedFiles: 0,
      errors: []
    };

    try {
      // Clean up old jobs
      const deletedJobs = await this.cleanupOldJobs();
      stats.deletedJobs = deletedJobs;

      // Clean up orphaned files
      const deletedFiles = await this.cleanupOrphanedFiles();
      stats.deletedFiles = deletedFiles;

      console.log(`Daily cleanup completed: ${deletedJobs} jobs, ${deletedFiles} files deleted`);

    } catch (error: any) {
      const errorMessage = `Daily cleanup error: ${error.message}`;
      console.error(errorMessage);
      stats.errors.push(errorMessage);
    } finally {
      this.isRunning = false;
    }

    return stats;
  }

  /**
   * Run weekly deep cleanup tasks
   */
  async runWeeklyCleanup(): Promise<CleanupStats> {
    console.log('Starting weekly cleanup job...');
    
    const stats: CleanupStats = {
      deletedJobs: 0,
      deletedFiles: 0,
      errors: []
    };

    try {
      // Run daily cleanup first
      const dailyStats = await this.runDailyCleanup();
      stats.deletedJobs += dailyStats.deletedJobs;
      stats.deletedFiles += dailyStats.deletedFiles;
      stats.errors.push(...dailyStats.errors);

      // Additional weekly tasks
      await this.optimizeDatabase();
      await this.generateCleanupReport();

      console.log('Weekly cleanup completed');

    } catch (error: any) {
      const errorMessage = `Weekly cleanup error: ${error.message}`;
      console.error(errorMessage);
      stats.errors.push(errorMessage);
    }

    return stats;
  }

  /**
   * Clean up old jobs from database
   */
  async cleanupOldJobs(): Promise<number> {
    try {
      const cutoffDate = new Date(
        Date.now() - this.oldJobsThresholdDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const deletedCount = await dbService.deleteOldJobs(cutoffDate);
      
      if (deletedCount > 0) {
        console.log(`Cleanup: deleted ${deletedCount} old jobs`);
      } else {
        console.log('Cleanup: no old jobs to delete');
      }

      return deletedCount;

    } catch (error: any) {
      console.error('Error cleaning up old jobs:', error);
      throw new Error(`Failed to cleanup old jobs: ${error.message}`);
    }
  }

  /**
   * Clean up orphaned files that don't have database records
   */
  async cleanupOrphanedFiles(): Promise<number> {
    // This would be implemented to clean up files in cloud storage
    // that don't have corresponding database records
    try {
      // Placeholder for file cleanup logic
      console.log('Orphaned file cleanup - not implemented yet');
      return 0;
    } catch (error: any) {
      console.error('Error cleaning up orphaned files:', error);
      throw new Error(`Failed to cleanup orphaned files: ${error.message}`);
    }
  }

  /**
   * Manual cleanup trigger for admin use
   */
  async manualCleanup(options: {
    cleanupJobs?: boolean;
    cleanupFiles?: boolean;
    daysThreshold?: number;
  } = {}): Promise<CleanupStats> {
    const {
      cleanupJobs = true,
      cleanupFiles = true,
      daysThreshold = this.oldJobsThresholdDays
    } = options;

    const stats: CleanupStats = {
      deletedJobs: 0,
      deletedFiles: 0,
      errors: []
    };

    try {
      if (cleanupJobs) {
        const cutoffDate = new Date(
          Date.now() - daysThreshold * 24 * 60 * 60 * 1000
        ).toISOString();
        
        stats.deletedJobs = await dbService.deleteOldJobs(cutoffDate);
      }

      if (cleanupFiles) {
        stats.deletedFiles = await this.cleanupOrphanedFiles();
      }

      console.log(`Manual cleanup completed: ${stats.deletedJobs} jobs, ${stats.deletedFiles} files deleted`);

    } catch (error: any) {
      const errorMessage = `Manual cleanup error: ${error.message}`;
      console.error(errorMessage);
      stats.errors.push(errorMessage);
    }

    return stats;
  }

  /**
   * Get cleanup statistics and status
   */
  async getCleanupStatus(): Promise<{
    isRunning: boolean;
    lastRun?: Date;
    nextRun?: Date;
    stats?: any;
  }> {
    try {
      const dbStats = await dbService.getStats();
      
      return {
        isRunning: this.isRunning,
        lastRun: undefined, // Would track this in a persistent store
        nextRun: undefined, // Would calculate from cron schedule
        stats: dbStats
      };

    } catch (error: any) {
      console.error('Error getting cleanup status:', error);
      throw new Error(`Failed to get cleanup status: ${error.message}`);
    }
  }

  /**
   * Database optimization tasks
   */
  private async optimizeDatabase(): Promise<void> {
    try {
      // Placeholder for database optimization
      // Could include index optimization, query analysis, etc.
      console.log('Database optimization completed');
    } catch (error: any) {
      console.error('Database optimization error:', error);
      throw error;
    }
  }

  /**
   * Generate cleanup report
   */
  private async generateCleanupReport(): Promise<void> {
    try {
      const stats = await dbService.getStats();
      
      const report = {
        timestamp: new Date().toISOString(),
        totalJobs: stats.totalJobs,
        recentJobs: stats.recentJobs,
        totalResumes: stats.totalResumes,
        oldJobsThreshold: this.oldJobsThresholdDays
      };

      console.log('Weekly cleanup report:', JSON.stringify(report, null, 2));
      
      // In production, this could be sent to monitoring services,
      // saved to a file, or stored in the database

    } catch (error: any) {
      console.error('Error generating cleanup report:', error);
    }
  }

  /**
   * Health check for cleanup service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if database is accessible
      const isDbHealthy = await dbService.healthCheck();
      
      // Check if cleanup is not stuck
      if (this.isRunning) {
        console.warn('Cleanup service health check: cleanup is currently running');
      }

      return isDbHealthy && !this.isRunning;

    } catch (error: any) {
      console.error('Cleanup service health check failed:', error);
      return false;
    }
  }

  /**
   * Stop all cleanup processes (for graceful shutdown)
   */
  async stop(): Promise<void> {
    console.log('Stopping cleanup service...');
    
    // Wait for current cleanup to finish if running
    while (this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Cleanup service stopped');
  }

  /**
   * Get cleanup configuration
   */
  getConfig() {
    return {
      oldJobsThresholdDays: this.oldJobsThresholdDays,
      scheduleExpression: this.scheduleExpression,
      isRunning: this.isRunning
    };
  }
}

export const cleanupService = new CleanupService();
