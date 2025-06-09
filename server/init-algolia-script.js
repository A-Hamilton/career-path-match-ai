// Temporary script to initialize Algolia index
const { algoliasearch } = require('algoliasearch');

async function initAlgolia() {
  try {
    // Initialize Algolia client
    const client = algoliasearch(
      process.env.ALGOLIA_APP_ID || 'your_app_id',
      process.env.ALGOLIA_ADMIN_API_KEY || 'your_admin_key'
    );

    // Create sample jobs
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
    ];    // Save objects to create the index
    const result = await client.saveObjects({
      indexName: 'jobs_index',
      objects: sampleJobs
    });
    console.log('✅ Algolia index created successfully with sample data!');
    console.log('Objects created:', result.objectIDs);
    
    // Test search
    const searchResult = await client.searchSingleIndex({
      indexName: 'jobs_index',
      searchParams: {
        query: '',
        hitsPerPage: 10
      }
    });
    console.log(`✅ Index now contains ${searchResult.nbHits} jobs`);
    
  } catch (error) {
    console.error('❌ Failed to initialize Algolia:', error);
  }
}

initAlgolia();
