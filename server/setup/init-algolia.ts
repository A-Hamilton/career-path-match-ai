// server/src/utils/init-algolia.ts
// Utility to initialize Algolia index with proper settings and sample data
import { algoliaJobs } from '../config/algolia';

export async function initializeAlgoliaIndex() {
  try {
    console.log('Initializing Algolia index...');
    
    // Create sample jobs to initialize the index
    const sampleJobs = [
      {
        objectID: 'sample_job_1',
        id: 'sample_job_1',
        job_title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        long_location: 'San Francisco, California, United States',
        description: 'Join our team as a Senior Software Engineer working on cutting-edge technology.',
        date_posted: new Date().toISOString(),
        min_annual_salary_usd: 120000,
        max_annual_salary_usd: 180000,
        remote: false,
        country: 'United States',
        employment_statuses: ['full-time'],
        tags: ['javascript', 'react', 'node.js'],
        createdAt: Date.now()
      },
      {
        objectID: 'sample_job_2',
        id: 'sample_job_2',
        job_title: 'Frontend Developer',
        company: 'Startup Inc',
        location: 'Remote',
        long_location: 'Remote, Global',
        description: 'Build amazing user interfaces for our growing platform.',
        date_posted: new Date().toISOString(),
        min_annual_salary_usd: 80000,
        max_annual_salary_usd: 120000,
        remote: true,
        country: 'Global',
        employment_statuses: ['full-time'],
        tags: ['react', 'typescript', 'css'],
        createdAt: Date.now()
      },
      {
        objectID: 'sample_job_3',
        id: 'sample_job_3',
        job_title: 'Backend Engineer',
        company: 'Data Solutions',
        location: 'New York, NY',
        long_location: 'New York, New York, United States',
        description: 'Design and build scalable backend systems.',
        date_posted: new Date().toISOString(),
        min_annual_salary_usd: 100000,
        max_annual_salary_usd: 150000,
        remote: false,
        country: 'United States',
        employment_statuses: ['full-time'],
        tags: ['python', 'django', 'postgresql'],
        createdAt: Date.now()
      }
    ];

    // Save sample jobs to create the index
    await algoliaJobs.saveObjects(sampleJobs);
    console.log(`Successfully initialized Algolia index with ${sampleJobs.length} sample jobs`);
    
    // Configure index settings for better search
    // Note: In Algolia v5, index settings are configured via the dashboard or API
    console.log('Algolia index initialized successfully!');
    return true;
    
  } catch (error) {
    console.error('Failed to initialize Algolia index:', error);
    return false;
  }
}

// Function to check if index exists and has data
export async function checkAlgoliaIndex() {
  try {
    const result = await algoliaJobs.search('', { hitsPerPage: 1 });
    console.log(`Algolia index exists with ${result.nbHits || 0} jobs`);
    return (result.nbHits || 0) > 0;
  } catch (error: any) {
    if (error.status === 404) {
      console.log('Algolia index does not exist yet');
      return false;
    }
    throw error;
  }
}
