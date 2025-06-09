// server/src/utils/init-algolia-index.ts
import { algoliaJobs } from '../config/algolia';

async function initializeAlgoliaIndex() {
  try {
    console.log('Initializing Algolia index...');
    
    // Create a sample job to initialize the index
    const sampleJob = {
      objectID: 'sample_job_init',
      id: 'sample_job_init',
      job_title: 'Software Developer',
      company: 'Tech Company',
      location: 'Remote',
      description: 'Sample job for index initialization',
      date_posted: new Date().toISOString(),
      min_annual_salary_usd: 50000,
      max_annual_salary_usd: 80000,
      remote: true,
      createdAt: Date.now()
    };

    // Save the sample job to create the index
    await algoliaJobs.saveObjects([sampleJob]);
    console.log('Algolia index created successfully!');
    
    // Optionally, delete the sample job after index creation
    await algoliaJobs.deleteObjects(['sample_job_init']);
    console.log('Sample job removed. Index is ready for use.');
    
  } catch (error) {
    console.error('Error initializing Algolia index:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeAlgoliaIndex()
    .then(() => {
      console.log('Index initialization complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Index initialization failed:', error);
      process.exit(1);
    });
}

export { initializeAlgoliaIndex };
