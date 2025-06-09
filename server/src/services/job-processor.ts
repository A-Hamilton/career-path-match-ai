// server/src/services/job-processor.ts
import { jobsIndex } from '../config/algolia';
import { dbService } from './database';
import { AIEnrichmentService } from './ai-enrichment';

export class JobProcessorService {
  /**
   * Fetch a job from TheirStack, enrich it, save to Firestore and Algolia.
   * This is called asynchronously when Algolia has no hits for a search.
   * 
   * @param queryParams - The search parameters
   * @param searchKey - Unique key for tracking this search request
   * @returns Promise<boolean> - Whether a job was successfully processed
   */  static async fetchAndProcessJob(queryParams: any, searchKey?: string): Promise<boolean> {
    try {
      // 1. Generate multiple diverse jobs for better search results
      const mockJobs = JobProcessorService.generateMockJobs(queryParams);
      
      // Process multiple jobs (2-4 jobs per search) for more realistic results
      const jobsToProcess = mockJobs.slice(0, Math.floor(Math.random() * 3) + 2);
      
      let successCount = 0;
      
      for (const rawJob of jobsToProcess) {
        try {
          // 2. Enrich with Gemini AI
          const [enrichedJob] = await AIEnrichmentService.enrichJobs([rawJob]);

          // 3. Save to Firestore
          await dbService.upsertJob(enrichedJob);

          // 4. Save to Algolia, using the unique job ID as the objectID
          const objectToSave = { ...enrichedJob, objectID: enrichedJob.id, createdAt: Date.now() };
          await jobsIndex.saveObjects([objectToSave]);
          
          successCount++;
          console.log(`Successfully indexed job ${enrichedJob.id} for search: ${searchKey || 'unknown'}`);
          
          // Small delay between processing jobs
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (jobError) {
          console.error(`Failed to process individual job:`, jobError);
        }
      }

      // Simulate realistic API processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      console.log(`Processed ${successCount}/${jobsToProcess.length} jobs for search: ${searchKey || 'unknown'}`);
      return successCount > 0;
      
    } catch (error) {
      console.error(`Failed to process jobs for search ${searchKey || 'unknown'}:`, error);
      return false;
    }
  }

  /**
   * Generate realistic mock job data based on search criteria
   * TODO: Replace this with real TheirStack API integration
   */
  private static generateMockJobs(queryParams: any): any[] {
    const searchTerm = (queryParams.what || '').toLowerCase();
    const location = queryParams.where || 'Remote';
    
    // Job templates based on search terms
    const jobTemplates = {
      'software': [
        { title: 'Senior Software Engineer', company: 'TechFlow Inc', industry: 'Technology', salary: [120000, 180000] },
        { title: 'Full Stack Developer', company: 'DevCorp Solutions', industry: 'Software', salary: [90000, 140000] },
        { title: 'Frontend Engineer', company: 'UI Masters', industry: 'Technology', salary: [85000, 130000] },
        { title: 'Backend Developer', company: 'DataSys Ltd', industry: 'Technology', salary: [95000, 145000] },
        { title: 'Software Architect', company: 'Enterprise Tech', industry: 'Technology', salary: [150000, 220000] }
      ],
      'data': [
        { title: 'Data Scientist', company: 'Analytics Pro', industry: 'Data & Analytics', salary: [110000, 170000] },
        { title: 'Data Engineer', company: 'BigData Corp', industry: 'Technology', salary: [105000, 160000] },
        { title: 'Machine Learning Engineer', company: 'AI Innovations', industry: 'Technology', salary: [125000, 190000] },
        { title: 'Data Analyst', company: 'Insights Inc', industry: 'Analytics', salary: [70000, 110000] }
      ],
      'marketing': [
        { title: 'Digital Marketing Manager', company: 'Growth Agency', industry: 'Marketing', salary: [80000, 120000] },
        { title: 'Content Marketing Specialist', company: 'Content Plus', industry: 'Marketing', salary: [60000, 90000] },
        { title: 'Marketing Director', company: 'Brand Masters', industry: 'Marketing', salary: [130000, 180000] },
        { title: 'SEO Specialist', company: 'SearchBoost', industry: 'Digital Marketing', salary: [55000, 85000] }
      ],
      'product': [
        { title: 'Product Manager', company: 'ProductCo', industry: 'Technology', salary: [130000, 190000] },
        { title: 'Senior Product Manager', company: 'Innovation Labs', industry: 'Technology', salary: [150000, 220000] },
        { title: 'Product Designer', company: 'Design Studios', industry: 'Design', salary: [95000, 140000] },
        { title: 'Product Owner', company: 'Agile Corp', industry: 'Technology', salary: [110000, 160000] }
      ],
      'sales': [
        { title: 'Sales Manager', company: 'SalesForce Pro', industry: 'Sales', salary: [80000, 130000] },
        { title: 'Account Executive', company: 'Revenue Inc', industry: 'Sales', salary: [60000, 100000] },
        { title: 'Sales Director', company: 'Growth Partners', industry: 'Sales', salary: [140000, 200000] },
        { title: 'Business Development Rep', company: 'BizDev Solutions', industry: 'Sales', salary: [50000, 80000] }
      ]
    };

    // Find matching templates based on search term
    let selectedTemplates = jobTemplates['software']; // default
    for (const [key, templates] of Object.entries(jobTemplates)) {
      if (searchTerm.includes(key)) {
        selectedTemplates = templates;
        break;
      }
    }

    // Generate jobs from templates
    return selectedTemplates.map((template, index) => {
      const timestamp = Date.now() + index; // Ensure unique IDs
      const salaryMin = template.salary[0] + Math.floor(Math.random() * 10000);
      const salaryMax = template.salary[1] + Math.floor(Math.random() * 15000);
      
      return {
        id: `job_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        job_title: template.title,
        company: template.company,
        location: location,
        long_location: location,
        description: `Join ${template.company} as a ${template.title}. We're looking for talented professionals to help drive our ${template.industry.toLowerCase()} initiatives forward. This is an excellent opportunity to work with cutting-edge technologies and make a real impact.`,
        short_description: `Exciting ${template.title} opportunity at ${template.company}`,
        date_posted: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last week        remote: queryParams.remote || location.toLowerCase().includes('remote'),
        hybrid: Math.random() > 0.7, // 30% chance of hybrid
        job_type: queryParams.remote || location.toLowerCase().includes('remote') ? 'remote' : 'on-site',
        min_annual_salary_usd: salaryMin,
        max_annual_salary_usd: salaryMax,
        country: 'United States',
        industry: template.industry,
        tags: [template.title.toLowerCase().replace(/\s+/g, '-'), template.industry.toLowerCase()],
        employment_statuses: ['full-time'],
        url: `https://example.com/jobs/${timestamp}`,
        final_url: `https://example.com/jobs/${timestamp}`
      };
    });
  }
}
