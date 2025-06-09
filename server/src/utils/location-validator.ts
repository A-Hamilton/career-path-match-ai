// Location validation utility
// This helps validate and normalize location data

/**
 * Known location inconsistencies that need correction
 */
export const knownIncorrectLocations: Record<string, string> = {
  'Belfast, Mpumalanga': 'Belfast, Northern Ireland',
  'Belfast, Syria': 'Belfast, Northern Ireland',
  'Belfast, Nigeria': 'Belfast, Northern Ireland',
  'Belfast, South Africa': 'Belfast, Northern Ireland',
  // Add more as they are discovered
};

/**
 * Validate and correct known location issues
 * @param location The location string to validate
 * @returns The corrected location string
 */
export function validateLocation(location: string): string {
  if (!location) return location;
  
  // Check for exact known incorrect locations
  if (knownIncorrectLocations[location]) {
    return knownIncorrectLocations[location];
  }
  
  // Check for common errors with Belfast specifically (the primary issue mentioned)
  if (location.toLowerCase().includes('belfast') && 
      (location.toLowerCase().includes('mpumalanga') || 
       location.toLowerCase().includes('nigeria') ||
       location.toLowerCase().includes('syria') ||
       location.toLowerCase().includes('south africa'))) {
    return 'Belfast, Northern Ireland';
  }
  
  return location;
}

/**
 * Validate and ensure consistent location information across job records
 * @param job The job record to validate
 * @returns The job with validated location info
 */
export function validateJobLocation(job: any): any {
  if (!job) return job;
  
  // Create a copy to avoid mutation
  const updatedJob = { ...job };
  
  // Validate and correct location fields
  if (updatedJob.location) {
    updatedJob.location = validateLocation(updatedJob.location);
  }
  
  if (updatedJob.long_location) {
    updatedJob.long_location = validateLocation(updatedJob.long_location);
  }
  
  return updatedJob;
}
