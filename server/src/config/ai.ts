// AI service configuration and client management
import { GoogleGenerativeAI } from '@google/generative-ai';
import { appConfig } from './app';

export class AIServiceConfig {
  private static instance: AIServiceConfig;
  private genAIClient: GoogleGenerativeAI;
  
  private constructor() {
    this.genAIClient = new GoogleGenerativeAI(appConfig.geminiApiKey);
  }
  
  public static getInstance(): AIServiceConfig {
    if (!AIServiceConfig.instance) {
      AIServiceConfig.instance = new AIServiceConfig();
    }
    return AIServiceConfig.instance;
  }
  
  public getGenAIClient(): GoogleGenerativeAI {
    return this.genAIClient;
  }
  
  public get client(): GoogleGenerativeAI {
    return this.genAIClient;
  }
}

export const aiService = AIServiceConfig.getInstance();
export const aiConfig = {
  client: aiService.getGenAIClient()
};
