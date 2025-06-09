// Location normalization and geocoding utilities
import { logger } from './logger';

export interface LocationInfo {
  city?: string;
  state?: string;
  country?: string;
  formatted: string;
  isRemote?: boolean;
}

/**
 * Normalize location strings for consistent searching
 * Handles various location formats and converts them to standardized form
 */
export function normalizeLocation(location: string): LocationInfo {
  if (!location || typeof location !== 'string') {
    return { formatted: '' };
  }

  const cleanLocation = location.trim().toLowerCase();
  
  // Check for remote work indicators
  const remoteKeywords = ['remote', 'anywhere', 'work from home', 'wfh', 'distributed', 'virtual'];
  const isRemote = remoteKeywords.some(keyword => cleanLocation.includes(keyword));
  
  if (isRemote) {
    return {
      formatted: 'Remote',
      isRemote: true
    };
  }

  // Parse common location formats
  let city: string | undefined;
  let state: string | undefined;
  let country: string | undefined;

  // Handle "City, State" or "City, Country" format
  const parts = cleanLocation.split(',').map(part => part.trim());
  
  if (parts.length >= 2) {
    city = toTitleCase(parts[0]);
    
    // Check if second part is a US state (2-letter code or full name)
    const secondPart = parts[1];
    if (isUSState(secondPart)) {
      state = normalizeUSState(secondPart);
      country = 'United States';
    } else {
      // Assume it's a country
      country = toTitleCase(secondPart);
    }
  } else {
    // Single location - could be city, state, or country
    const singleLocation = parts[0];
    
    if (isUSState(singleLocation)) {
      state = normalizeUSState(singleLocation);
      country = 'United States';
    } else {
      // Assume it's a city for now
      city = toTitleCase(singleLocation);
    }
  }

  // Build formatted string
  let formatted = '';
  if (city) formatted += city;
  if (state) {
    formatted += formatted ? `, ${state}` : state;
  }
  if (country && country !== 'United States') {
    formatted += formatted ? `, ${country}` : country;
  }

  return {
    city,
    state,
    country,
    formatted: formatted || toTitleCase(location),
    isRemote: false
  };
}

/**
 * Check if a string represents a US state
 */
function isUSState(location: string): boolean {
  const normalizedLocation = location.toLowerCase();
  
  // 2-letter state codes
  const stateCodes = [
    'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga',
    'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md',
    'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj',
    'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc',
    'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy',
    'dc' // District of Columbia
  ];
  
  // Full state names (abbreviated list of common ones)
  const stateNames = [
    'california', 'texas', 'florida', 'new york', 'pennsylvania',
    'illinois', 'ohio', 'georgia', 'north carolina', 'michigan',
    'new jersey', 'virginia', 'washington', 'arizona', 'massachusetts',
    'tennessee', 'indiana', 'missouri', 'maryland', 'wisconsin',
    'colorado', 'minnesota', 'south carolina', 'alabama', 'louisiana',
    'kentucky', 'oregon', 'oklahoma', 'connecticut', 'utah',
    'arkansas', 'nevada', 'mississippi', 'kansas', 'new mexico',
    'nebraska', 'west virginia', 'idaho', 'hawaii', 'new hampshire',
    'maine', 'montana', 'rhode island', 'delaware', 'south dakota',
    'north dakota', 'alaska', 'district of columbia', 'vermont', 'wyoming'
  ];
  
  return stateCodes.includes(normalizedLocation) || 
         stateNames.includes(normalizedLocation);
}

/**
 * Normalize US state to full name
 */
function normalizeUSState(state: string): string {
  const stateMap: { [key: string]: string } = {
    'al': 'Alabama', 'alabama': 'Alabama',
    'ak': 'Alaska', 'alaska': 'Alaska',
    'az': 'Arizona', 'arizona': 'Arizona',
    'ar': 'Arkansas', 'arkansas': 'Arkansas',
    'ca': 'California', 'california': 'California',
    'co': 'Colorado', 'colorado': 'Colorado',
    'ct': 'Connecticut', 'connecticut': 'Connecticut',
    'de': 'Delaware', 'delaware': 'Delaware',
    'fl': 'Florida', 'florida': 'Florida',
    'ga': 'Georgia', 'georgia': 'Georgia',
    'hi': 'Hawaii', 'hawaii': 'Hawaii',
    'id': 'Idaho', 'idaho': 'Idaho',
    'il': 'Illinois', 'illinois': 'Illinois',
    'in': 'Indiana', 'indiana': 'Indiana',
    'ia': 'Iowa', 'iowa': 'Iowa',
    'ks': 'Kansas', 'kansas': 'Kansas',
    'ky': 'Kentucky', 'kentucky': 'Kentucky',
    'la': 'Louisiana', 'louisiana': 'Louisiana',
    'me': 'Maine', 'maine': 'Maine',
    'md': 'Maryland', 'maryland': 'Maryland',
    'ma': 'Massachusetts', 'massachusetts': 'Massachusetts',
    'mi': 'Michigan', 'michigan': 'Michigan',
    'mn': 'Minnesota', 'minnesota': 'Minnesota',
    'ms': 'Mississippi', 'mississippi': 'Mississippi',
    'mo': 'Missouri', 'missouri': 'Missouri',
    'mt': 'Montana', 'montana': 'Montana',
    'ne': 'Nebraska', 'nebraska': 'Nebraska',
    'nv': 'Nevada', 'nevada': 'Nevada',
    'nh': 'New Hampshire', 'new hampshire': 'New Hampshire',
    'nj': 'New Jersey', 'new jersey': 'New Jersey',
    'nm': 'New Mexico', 'new mexico': 'New Mexico',
    'ny': 'New York', 'new york': 'New York',
    'nc': 'North Carolina', 'north carolina': 'North Carolina',
    'nd': 'North Dakota', 'north dakota': 'North Dakota',
    'oh': 'Ohio', 'ohio': 'Ohio',
    'ok': 'Oklahoma', 'oklahoma': 'Oklahoma',
    'or': 'Oregon', 'oregon': 'Oregon',
    'pa': 'Pennsylvania', 'pennsylvania': 'Pennsylvania',
    'ri': 'Rhode Island', 'rhode island': 'Rhode Island',
    'sc': 'South Carolina', 'south carolina': 'South Carolina',
    'sd': 'South Dakota', 'south dakota': 'South Dakota',
    'tn': 'Tennessee', 'tennessee': 'Tennessee',
    'tx': 'Texas', 'texas': 'Texas',
    'ut': 'Utah', 'utah': 'Utah',
    'vt': 'Vermont', 'vermont': 'Vermont',
    'va': 'Virginia', 'virginia': 'Virginia',
    'wa': 'Washington', 'washington': 'Washington',
    'wv': 'West Virginia', 'west virginia': 'West Virginia',
    'wi': 'Wisconsin', 'wisconsin': 'Wisconsin',
    'wy': 'Wyoming', 'wyoming': 'Wyoming',
    'dc': 'District of Columbia', 'district of columbia': 'District of Columbia'
  };
  
  const normalized = state.toLowerCase();
  return stateMap[normalized] || toTitleCase(state);
}

/**
 * Convert string to title case
 */
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Extract location components for search queries
 * Used to build location-based search filters
 */
export function extractLocationComponents(location: string): {
  searchTerms: string[];
  filters: { [key: string]: string };
} {
  const locationInfo = normalizeLocation(location);
  const searchTerms: string[] = [];
  const filters: { [key: string]: string } = {};
  
  if (locationInfo.isRemote) {
    filters.remote = 'true';
    searchTerms.push('remote');
  } else {
    if (locationInfo.city) {
      searchTerms.push(locationInfo.city);
      filters.city = locationInfo.city;
    }
    
    if (locationInfo.state) {
      searchTerms.push(locationInfo.state);
      filters.state = locationInfo.state;
    }
    
    if (locationInfo.country) {
      searchTerms.push(locationInfo.country);
      filters.country = locationInfo.country;
    }
  }
  
  return { searchTerms, filters };
}

/**
 * Calculate distance between two locations (placeholder implementation)
 * In a production app, you might integrate with a geocoding API like Google Maps
 */
export function calculateDistance(
  location1: LocationInfo,
  location2: LocationInfo
): number | null {
  // This is a simplified implementation
  // In production, you would use actual coordinates and distance calculation
  
  if (location1.isRemote || location2.isRemote) {
    return 0; // Remote work = no distance constraint
  }
  
  if (location1.city === location2.city && location1.state === location2.state) {
    return 0; // Same city
  }
  
  if (location1.state === location2.state) {
    return 50; // Same state, assume 50 miles average
  }
  
  if (location1.country === location2.country) {
    return 200; // Same country, assume 200 miles average
  }
  
  return null; // Cannot calculate distance for different countries
}

/**
 * Check if a job location matches search criteria
 */
export function matchesLocationCriteria(
  jobLocation: string,
  searchLocation: string,
  maxDistance?: number
): boolean {
  try {
    const jobInfo = normalizeLocation(jobLocation);
    const searchInfo = normalizeLocation(searchLocation);
    
    // If either is remote, it's a match for remote searches
    if (jobInfo.isRemote || searchInfo.isRemote) {
      return true;
    }
    
    // Exact matches
    if (jobInfo.city === searchInfo.city && jobInfo.state === searchInfo.state) {
      return true;
    }
    
    // State-level matches
    if (jobInfo.state === searchInfo.state && !searchInfo.city) {
      return true;
    }
    
    // If distance calculation is available and within range
    if (maxDistance) {
      const distance = calculateDistance(jobInfo, searchInfo);
      if (distance !== null && distance <= maxDistance) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    logger.error('Error matching location criteria:', error);
    return false;
  }
}
