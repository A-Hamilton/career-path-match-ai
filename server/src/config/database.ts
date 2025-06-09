// Database configuration and initialization
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

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
      // Use the path from the environment variable, or fallback to a default
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.join(__dirname, 'serviceAccountKey.json');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
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
