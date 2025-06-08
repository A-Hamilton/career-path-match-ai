import request from 'supertest';
import admin from 'firebase-admin';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { app } from './index';

jest.mock('axios');
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn().mockResolvedValue({ text: '50000-70000' })
    }
  }))
}));

// Mock Firestore
const mockCollection = {
  where: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({ docs: [], size: 0 }),
  doc: jest.fn().mockReturnThis(),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined)
};
const mockFirestore = {
  collection: jest.fn().mockReturnValue(mockCollection),
  batch: jest.fn().mockReturnValue({ set: jest.fn(), delete: jest.fn(), commit: jest.fn() })
};

// Override admin.firestore()
beforeAll(() => {
  jest.spyOn(admin, 'firestore').mockReturnValue(mockFirestore as any);
});

describe('Health endpoint', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Salary estimate endpoint', () => {
  it('should return salary range and persist to Firestore', async () => {
    const res = await request(app)
      .get('/api/salary-estimate?title=Developer&id=123')
      .expect(200);
    expect(res.body.range).toBe('50000-70000');
    // Firestore set should be called
    expect(mockCollection.doc).toHaveBeenCalledWith('123');
  });
});

describe('GET /api/jobs rate limit', () => {
  it('should return 429 when TheirStack rate limit hit', async () => {
    // Mock axios.post to return 402
    (axios.post as jest.Mock).mockResolvedValue({ status: 402, data: {} });
    const res = await request(app)
      .get('/api/jobs?page=0')
      .expect(429);
    expect(res.body.error).toMatch(/Rate limit reached/);
  });
});
