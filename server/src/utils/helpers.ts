// Helper utilities
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export function sanitizeString(str: string): string {
  return str.replace(/[^\w\s-]/g, '').trim();
}

export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}

export function calculateScore(data: any): number {
  let score = 0;
  const maxScore = 100;
  
  // Basic scoring logic - can be enhanced
  if (data.workExperience?.length > 0) score += 20;
  if (data.skills?.length > 0) score += 15;
  if (data.education?.length > 0) score += 15;
  if (data.projects?.length > 0) score += 10;
  if (data.certifications?.length > 0) score += 10;
  if (data.summary) score += 15;
  if (data.strengths?.length > 0) score += 10;
  if (data.keywords?.found?.length > 0) score += 5;
  
  return Math.min(score, maxScore);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseJsonSafely(jsonString: string): any | null {
  try {
    // Remove markdown code fences if present
    const cleaned = jsonString.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return null;
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let lastCall = 0;
  
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    
    if (timeSinceLastCall < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - timeSinceLastCall));
    }
    
    lastCall = Date.now();
    return func(...args);
  };
}
