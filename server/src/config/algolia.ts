// server/src/config/algolia.ts
// Algolia v5 API syntax for Node.js/TypeScript
import { algoliasearch } from 'algoliasearch';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(__dirname, '..', '..', '.env');
config({ path: envPath });

const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || 'jobs_index';

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  throw new Error('Algolia credentials are not configured. Please set ALGOLIA_APP_ID and ALGOLIA_ADMIN_KEY environment variables.');
}

// Initialize Algolia client with v5 syntax
const algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

// Algolia v5 helper functions for job operations
export const algoliaJobs = {
  // Search for jobs
  async search(query: string, options: any = {}) {
    return await algoliaClient.searchSingleIndex({
      indexName: INDEX_NAME,
      searchParams: {
        query,
        ...options
      }
    });
  },

  // Save/update jobs
  async saveObjects(objects: any[]) {
    return await algoliaClient.saveObjects({
      indexName: INDEX_NAME,
      objects
    });
  },

  // Delete jobs by objectIDs
  async deleteObjects(objectIDs: string[]) {
    return await algoliaClient.deleteObjects({
      indexName: INDEX_NAME,
      objectIDs
    });
  },
  // Wait for a task to complete
  async waitTask(taskID: number) {
    return await algoliaClient.waitForTask({
      indexName: INDEX_NAME,
      taskID
    });
  },

  // Configure index settings for better location matching
  async configureIndex() {
    return await algoliaClient.setSettings({
      indexName: INDEX_NAME,
      indexSettings: {
        searchableAttributes: [
          'job_title',
          'company',
          'location',
          'long_location',
          'description',
          'short_description',
          'country',
          'industry',
          'tags'
        ],
        attributesForFaceting: [
          'remote',
          'country',
          'industry',
          'employment_statuses'
        ],
        ranking: [
          'typo',
          'geo',
          'words',
          'filters',
          'proximity',
          'attribute',
          'exact',
          'custom'
        ]
      }
    });
  }
};

// Export for backwards compatibility
export const jobsIndex = algoliaJobs;
