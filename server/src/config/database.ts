// Database configuration and initialization
import * as admin from 'firebase-admin';

export class DatabaseConfig {
  private static instance: DatabaseConfig;
  
  private constructor() {
    this.initializeFirebase();
  }
  
  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }
  
  private initializeFirebase(): void {
    if (!admin.apps.length) {
      admin.initializeApp({ 
        credential: admin.credential.applicationDefault() 
      });
    }
  }
  
  public getFirestore() {
    return admin.firestore();
  }
  
  public getFieldValue() {
    return admin.firestore.FieldValue;
  }
  
  public getAuth() {
    return admin.auth();
  }
}

export const db = DatabaseConfig.getInstance();
