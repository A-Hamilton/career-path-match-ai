import { jobsIndex } from '../config/algolia';
import { logger } from './logger';

const sampleJobs = [
  {
    objectID: 'job_sample_1',
    id: 'job_sample_1',
    job_title: 'Senior Software Engineer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    long_location: 'San Francisco, California, United States',
    description: 'We are looking for a senior software engineer to join our team and work on cutting-edge projects.',
    short_description: 'Senior software engineer position at TechCorp',
    date_posted: new Date().toISOString(),
    min_annual_salary_usd: 120000,
    max_annual_salary_usd: 180000,
    country: 'United States',
    industry: 'Technology',
    tags: ['software', 'engineering', 'javascript', 'react', 'node.js'],
    employment_statuses: ['full-time'],
    url: 'https://example.com/job1',
    final_url: 'https://example.com/job1',
    remote: false,
    hybrid: true,
    job_type: 'hybrid',
    createdAt: Date.now()
  },
  {
    objectID: 'job_sample_2',
    id: 'job_sample_2',
    job_title: 'Frontend Developer',
    company: 'StartupXYZ',
    location: 'Remote',
    long_location: 'Remote, United States',
    description: 'Join our remote team as a frontend developer working with React and TypeScript.',
    short_description: 'Remote frontend developer position',
    date_posted: new Date().toISOString(),
    min_annual_salary_usd: 80000,
    max_annual_salary_usd: 120000,
    country: 'United States',
    industry: 'Technology',
    tags: ['frontend', 'react', 'typescript', 'javascript', 'css'],
    employment_statuses: ['full-time'],
    url: 'https://example.com/job2',
    final_url: 'https://example.com/job2',
    remote: true,
    hybrid: false,
    job_type: 'remote',
    createdAt: Date.now()
  },
  {
    objectID: 'job_sample_3',
    id: 'job_sample_3',
    job_title: 'Data Scientist',
    company: 'DataCorp',
    location: 'New York, NY',
    long_location: 'New York, New York, United States',
    description: 'Looking for a data scientist to analyze complex datasets and build ML models.',
    short_description: 'Data scientist position in NYC',
    date_posted: new Date().toISOString(),
    min_annual_salary_usd: 100000,
    max_annual_salary_usd: 150000,
    country: 'United States',
    industry: 'Technology',
    tags: ['data-science', 'machine-learning', 'python', 'sql', 'statistics'],
    employment_statuses: ['full-time'],
    url: 'https://example.com/job3',
    final_url: 'https://example.com/job3',
    remote: false,
    hybrid: false,
    job_type: 'on-site',
    createdAt: Date.now()
  }
];

async function seedAlgolia() {  try {
    logger.info('Seeding Algolia with sample jobs...');
    await jobsIndex.saveObjects(sampleJobs);
    logger.info(`Successfully added ${sampleJobs.length} sample jobs to Algolia!`);
  } catch (error) {
    logger.error('Error seeding Algolia:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedAlgolia();
}

export { seedAlgolia };
