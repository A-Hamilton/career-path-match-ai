// server/src/services/maintenance.ts
import { jobsIndex } from '../config/algolia';
import { dbService } from './database';

export class MaintenanceService {
  /**
   * Remove jobs older than 30 days from Algolia and Firestore
   */
  static async removeStaleJobs() {
    const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;
    // 1. Query Algolia for jobs older than 30 days
    const { hits } = await jobsIndex.search('', {
      filters: `createdAt < ${THIRTY_DAYS_AGO}`,
      attributesToRetrieve: ['objectID', 'id', 'date_posted', 'createdAt'],
      hitsPerPage: 1000
    });
    if (!hits.length) return;
    const objectIDs = hits.map((hit: any) => hit.objectID);
    const firestoreIDs = hits.map((hit: any) => hit.id);
    // 2. Delete from Algolia
    await jobsIndex.deleteObjects(objectIDs);
    // 3. Delete from Firestore
    for (const id of firestoreIDs) {
      try {
        // Delete by job ID (not by date) for precision
        await dbService.deleteOldJobs(id);
      } catch (e) {
        console.warn('Failed to delete job from Firestore:', id, e);
      }
    }    console.log(`Removed ${objectIDs.length} stale jobs from Algolia and Firestore.`);
  }
  /**
   * Clear all existing mock/duplicate jobs from Algolia
   * Useful during development to reset job data
   */
  static async clearMockJobs() {
    try {
      console.log('Clearing existing mock jobs from Algolia...');
      
      // Search for all jobs with TechCorp company (our old mock data)
      const { hits: techCorpJobs } = await jobsIndex.search('', {
        filters: 'company:TechCorp',
        attributesToRetrieve: ['objectID', 'id'],
        hitsPerPage: 1000
      });
      
      // Search for jobs with example.com URLs (mock data indicator)  
      const { hits: mockUrlJobs } = await jobsIndex.search('', {
        filters: 'url:example.com',
        attributesToRetrieve: ['objectID', 'id'],
        hitsPerPage: 1000
      });

      // Search for other mock companies from templates
      const mockCompanies = ['TechFlow Inc', 'DevCorp Solutions', 'UI Masters', 'DataSys Ltd', 
                           'Enterprise Tech', 'Analytics Pro', 'BigData Corp', 'AI Innovations', 
                           'Insights Inc', 'Growth Agency', 'Content Plus', 'Brand Masters', 
                           'SearchBoost', 'ProductCo', 'Innovation Labs', 'Design Studios', 
                           'Agile Corp', 'SalesForce Pro', 'Revenue Inc', 'Growth Partners', 
                           'BizDev Solutions', 'StartupXYZ', 'Data Solutions'];
      
      let companyJobs: any[] = [];
      for (const company of mockCompanies) {
        try {
          const { hits } = await jobsIndex.search('', {
            filters: `company:"${company}"`,
            attributesToRetrieve: ['objectID', 'id'],
            hitsPerPage: 1000
          });
          companyJobs.push(...hits);
        } catch (e) {
          console.warn(`Failed to search for company ${company}:`, e);
        }
      }

      // Search for sample job IDs
      const { hits: sampleJobs } = await jobsIndex.search('', {
        filters: 'id:sample_job* OR id:job_sample*',
        attributesToRetrieve: ['objectID', 'id'],
        hitsPerPage: 1000
      });
      
      // Combine and deduplicate
      const allMockJobs = [...techCorpJobs, ...mockUrlJobs, ...companyJobs, ...sampleJobs];
      const uniqueObjectIDs = [...new Set(allMockJobs.map((hit: any) => hit.objectID))];
      const uniqueFirestoreIDs = [...new Set(allMockJobs.map((hit: any) => hit.id))];
      
      if (uniqueObjectIDs.length === 0) {
        console.log('No mock jobs found to clear.');
        return;
      }
      
      console.log(`Found ${uniqueObjectIDs.length} mock jobs to clear...`);
      
      // Delete from Algolia in batches
      const batchSize = 100;
      for (let i = 0; i < uniqueObjectIDs.length; i += batchSize) {
        const batch = uniqueObjectIDs.slice(i, i + batchSize);
        await jobsIndex.deleteObjects(batch);
        console.log(`Deleted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueObjectIDs.length/batchSize)} from Algolia`);
      }
      
      // Delete from Firestore
      let firestoreDeleted = 0;
      for (const id of uniqueFirestoreIDs) {
        try {
          await dbService.deleteOldJobs(id);
          firestoreDeleted++;
        } catch (e) {
          console.warn('Failed to delete mock job from Firestore:', id);
        }
      }
      
      console.log(`Successfully cleared ${uniqueObjectIDs.length} mock jobs from Algolia and ${firestoreDeleted} from Firestore.`);
    } catch (error) {
      console.error('Error clearing mock jobs:', error);
    }
  }
}
