// Logging utility
export class Logger {
  private static instance: Logger;
  
  private constructor() {}
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  private log(level: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
  
  public info(message: string, data?: any): void {
    this.log('info', message, data);
  }
  
  public warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }
  
  public error(message: string, data?: any): void {
    this.log('error', message, data);
  }
  
  public debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data);
    }
  }
}

export const logger = Logger.getInstance();
