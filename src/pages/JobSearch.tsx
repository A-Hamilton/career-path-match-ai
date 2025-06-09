import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, MapPin, Filter, Briefcase, Clock, DollarSign, Building, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const JobSearch = () => {  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("all");
  const [salaryRange, setSalaryRange] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [jobs, setJobs] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStrategy, setApiStrategy] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingMessage, setPollingMessage] = useState<string>('');
  const [pollingAttempts, setPollingAttempts] = useState(0);  // Fetch jobs from backend proxy with pagination and polling support
  const fetchJobs = async (pageNum = 0, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setIsPolling(false);
    setPollingAttempts(0);
    
    let url = `/api/jobs?`;
    const params = new URLSearchParams();
    
    if (searchTerm) params.append('what', searchTerm);
    if (location) params.append('where', location);
    if (jobType !== "all") params.append('contract_type', jobType.toLowerCase());
    
    // Salary range parsing
    if (salaryRange !== "all") {
      if (salaryRange === "50k-75k") { 
        params.append('salary_min', '50000'); 
        params.append('salary_max', '75000'); 
      }
      if (salaryRange === "75k-100k") { 
        params.append('salary_min', '75000'); 
        params.append('salary_max', '100000'); 
      }
      if (salaryRange === "100k-150k") { 
        params.append('salary_min', '100000'); 
        params.append('salary_max', '150000'); 
      }
      if (salaryRange === "150k+") { 
        params.append('salary_min', '150000'); 
      }
    }
    
    // Add sorting parameter
    if (sortBy !== "relevance") {
      params.append('sort', sortBy);
    }
    
    // Add pagination params - limit to 3 jobs per request
    params.append('page', String(pageNum));
    params.append('limit', '3');
    
    url += params.toString();
    
    try {
      const res = await fetch(url);
      
      if (res.status === 429) {
        throw new Error('API rate limit reached. Please try again later.');
      }
      
      if (res.status === 202) {
        // Jobs are being fetched asynchronously, start polling
        const metadata = await res.json();
        setPollingMessage(metadata.message || 'Fetching fresh job data...');
        setIsPolling(true);
        setLoading(false);
        setLoadingMore(false);
        startPolling(url, pageNum, append);
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${res.status}`);
      }
      
      const result = await res.json();
      await handleJobsResponse(result, pageNum, append);
      
    } catch (err: any) {
      console.error('Job search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  // Handle polling for async job fetching with smart logic
  const startPolling = async (url: string, pageNum: number, append: boolean) => {
    const maxAttempts = 20; // Maximum 20 attempts (about 1 minute with 3s intervals)
    let attempts = 0;
    let pollInterval = 3000; // Start with 3 seconds
    
    const poll = async () => {
      attempts++;
      setPollingAttempts(attempts);
      
      if (attempts > maxAttempts) {
        setError('Job search timed out. Please try again.');
        setIsPolling(false);
        return;
      }
      
      try {
        const res = await fetch(url);
        
        if (res.status === 202) {
          // Still processing, check metadata for smart handling
          const metadata = await res.json();
          setPollingMessage(metadata.message || `Searching for jobs... (${attempts}/${maxAttempts})`);
          
          // If search is already in progress, use exponential backoff
          if (metadata.searchInProgress) {
            pollInterval = Math.min(pollInterval * 1.5, 10000); // Max 10 seconds
            setPollingMessage(metadata.message + ' (Extending search...)');
          }
          
          setTimeout(poll, pollInterval);
          return;
        }
        
        if (res.status === 200) {
          // Jobs are ready (or confirmed no results)!
          const result = await res.json();
          
          // Check if this is a cached empty result
          if (result.metadata?.cached && result.data.length === 0) {
            setPollingMessage('No jobs found for this search criteria.');
            // Show empty state immediately
            await handleJobsResponse(result, pageNum, append);
            setIsPolling(false);
            return;
          }
          
          // Regular successful result
          await handleJobsResponse(result, pageNum, append);
          setIsPolling(false);
          return;
        }
        
        // Handle other status codes
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${res.status}`);
        }
        
      } catch (err: any) {
        console.error('Polling error:', err);
        setError(err.message);
        setIsPolling(false);
      }
    };
    
    // Start polling after a 2-second delay
    setTimeout(poll, 2000);
  };
  // Handle job response data (shared between direct fetch and polling)
  const handleJobsResponse = async (result: any, pageNum: number, append: boolean) => {
    const fetchedJobs = result.data || [];
    
    // Update state from API response
    setTotalResults(result.metadata?.total_results || 0);
    setHasMore(result.metadata?.has_more || false);
    setApiStrategy(result.metadata?.api_strategy || null);
    
    // Handle empty results
    if (fetchedJobs.length === 0) {
      if (!append) {
        setJobs([]);
      }
      setPage(pageNum);
      return;
    }
    
    // Augment missing salary with AI estimate
    const jobsWithEstimate = await Promise.all(
      fetchedJobs.map(async (job) => {
        if (!job.min_annual_salary_usd && !job.max_annual_salary_usd) {
          try {
            const resp = await fetch(
              `/api/salary-estimate?id=${job.id}&title=${encodeURIComponent(job.job_title)}&location=${encodeURIComponent(job.long_location || '')}`
            );
            const json = await resp.json();
            return { ...job, salary_estimate: json.range };
          } catch {
            return { ...job, salary_estimate: 'N/A' };
          }
        }
        return job;
      })
    );
    
    setJobs(prev => {
      if (append) {
        const existingJobIds = new Set(prev.map(job => job.id));
        const newUniqueJobs = jobsWithEstimate.filter(job => !existingJobIds.has(job.id));
        return [...prev, ...newUniqueJobs];
      }
      return jobsWithEstimate;
    });
    setPage(pageNum);
  };useEffect(() => {
    fetchJobs(0, false); // Initial load
    // eslint-disable-next-line
  }, []);

  // Client-side sorting function
  const sortedJobs = useMemo(() => {
    const jobsCopy = [...jobs];
    
    switch (sortBy) {
      case 'newest':
        return jobsCopy.sort((a, b) => new Date(b.posted_date || 0).getTime() - new Date(a.posted_date || 0).getTime());
      case 'salary':
        return jobsCopy.sort((a, b) => {
          const salaryA = Math.max(a.min_annual_salary_usd || 0, a.max_annual_salary_usd || 0);
          const salaryB = Math.max(b.min_annual_salary_usd || 0, b.max_annual_salary_usd || 0);
          return salaryB - salaryA;
        });
      case 'match':
        return jobsCopy.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
      case 'relevance':
      default:
        return jobsCopy; // Keep original API relevance order
    }
  }, [jobs, sortBy]);

  // Handle search form submission
  const handleSearch = useCallback(() => {
    fetchJobs(0, false);
  }, [searchTerm, location, jobType, salaryRange]);  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      fetchJobs(page + 1, true);
    }
  }, [hasMore, loadingMore, page]);

  // Handle form submission (Enter key)
  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  }, [handleSearch]);

  const getMatchColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-blue-100 text-blue-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Find Your Next Opportunity</h1>
            <p className="text-xl text-gray-600">Discover jobs that match your skills and career goals</p>
          </div>
          {/* Search and Filter Section */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-5 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Job title, company, or keywords..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={salaryRange} onValueChange={setSalaryRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Salary Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Salary</SelectItem>
                    <SelectItem value="50k-75k">$50k - $75k</SelectItem>
                    <SelectItem value="75k-100k">$75k - $100k</SelectItem>
                    <SelectItem value="100k-150k">$100k - $150k</SelectItem>
                    <SelectItem value="150k+">$150k+</SelectItem>
                  </SelectContent>
                </Select>
              </div>              <div className="flex items-center mt-4 gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSearch} disabled={loading || isPolling}>
                  <Search className="h-4 w-4 mr-2" />
                  {loading || isPolling ? 'Searching...' : 'Search Jobs'}
                </Button>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                </Button>
              </div>
            </CardContent>
          </Card>          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-600">
                {jobs.length} jobs found {searchTerm && `for "${searchTerm}"`}
                {totalResults > jobs.length && ` (${totalResults} total available)`}
              </p>
              {apiStrategy && apiStrategy > 1 && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ Some search filters were simplified to find results
                </p>
              )}
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Most Relevant</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="salary">Highest Salary</SelectItem>
                <SelectItem value="match">Best Match</SelectItem>
              </SelectContent>
            </Select>
          </div>          {/* Job Listing Results */}
          <div className="space-y-4">
            {(loading || isPolling) && (
              <div className="text-center py-12">
                <div className="relative inline-block">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Search className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-700">
                    {isPolling ? pollingMessage : 'Searching for perfect matches...'}
                  </p>
                  <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  {isPolling && pollingAttempts > 0 && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">
                        Searching external job boards for fresh opportunities...
                      </p>
                      <div className="w-64 mx-auto bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(pollingAttempts / 20) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-400">
                        Attempt {pollingAttempts} of 20
                      </p>
                    </div>
                  )}
                  {!isPolling && (
                    <p className="text-sm text-gray-500">Analyzing job market data and matching your preferences</p>
                  )}
                </div>
              </div>
            )}
            
            {error && (
              <div className="text-center py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                  <div className="text-red-600 mb-2">❌ Search Error</div>
                  <p className="text-red-700 mb-4">{error}</p>                  <Button 
                    variant="outline" 
                    onClick={handleSearch}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
            
            {!loading && !isPolling && !error && sortedJobs.map((job) => (
              <Card key={job.id} className="group hover:shadow-lg transition-all duration-300 hover:border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {job.job_title}
                          </h3>
                          <div className="flex items-center text-gray-600 mt-1 space-x-4">
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-1" />
                              <span>{job.company || job.company_object?.name}</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{job.location || job.long_location}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {job.remote != null && (
                            <Badge className="bg-blue-100 text-blue-800">
                              {job.remote ? 'Remote' : 'On-site'}
                            </Badge>
                          )}
                          {(job.min_annual_salary_usd || job.max_annual_salary_usd) && (
                            <Badge variant="outline">
                              {job.min_annual_salary_usd ? `$${job.min_annual_salary_usd}` : ''} - {job.max_annual_salary_usd ? `$${job.max_annual_salary_usd}` : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2">{job.description || job.short_description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-1" />
                            <span>{job.employment_statuses?.[0] || "N/A"}</span>
                          </div>                          <div className="flex items-center group relative">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span>
                              {job.min_annual_salary_usd || job.max_annual_salary_usd
                                ? `${job.min_annual_salary_usd ? `$${job.min_annual_salary_usd.toLocaleString()}` : ''}${job.max_annual_salary_usd ? ` - $${job.max_annual_salary_usd.toLocaleString()}` : ''}`
                                : job.salary_estimate || 'N/A'}
                            </span>
                            {job.min_annual_salary_usd === 50000 && job.max_annual_salary_usd === 75000 && (
                              <span className="ml-1 cursor-help text-xs text-gray-500 underline decoration-dotted" title="This is an estimated salary range for this position">
                                (est.)
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Estimated industry average salary range
                                </div>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{job.date_posted ? new Date(job.date_posted).toLocaleDateString() : "N/A"}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <a href={job.url || job.final_url} target="_blank" rel="noopener noreferrer">
                              View Details
                            </a>
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {/* Adzuna does not provide skills directly; you may parse from description or omit */}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!loading && !isPolling && !error && jobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No jobs found matching your criteria.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setLocation("");
                  setJobType("all");
                  setSalaryRange("all");
                  fetchJobs(0, false);
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}          {/* Load More (pagination) */}
          {!loading && !isPolling && !error && jobs.length > 0 && hasMore && (
            <div className="text-center mt-8">
              <div className="space-y-4">                <Button 
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                  size="lg"
                >
                  {loadingMore ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading More Jobs...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Load More Jobs</span>
                      <div className="w-5 h-5 border border-white rounded-full flex items-center justify-center">
                        <span className="text-xs">+</span>
                      </div>
                    </div>
                  )}
                </Button>                <div className="text-sm text-gray-500 space-y-1">
                  <p>Showing {jobs.length} {jobs.length === totalResults ? 'jobs' : `of ${totalResults} jobs`}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${totalResults > 0 ? Math.min((jobs.length / Math.max(totalResults, jobs.length)) * 100, 100) : 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Progress: {totalResults > 0 ? Math.min(Math.round((jobs.length / Math.max(totalResults, jobs.length)) * 100), 100) : 100}% complete
                  </p>
                </div>
              </div>
            </div>
          )}          
          {/* All jobs loaded message */}
          {!loading && !isPolling && !error && jobs.length > 0 && !hasMore && jobs.length === totalResults && (
            <div className="text-center mt-8 py-6 border-t border-gray-200">
              <div className="inline-flex items-center space-x-2 text-green-600">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span className="font-medium">All {totalResults} jobs loaded</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                You've seen all available jobs for this search
              </p>
            </div>
          )}
         </div>
       </div>
       <Footer />
    </div>
  );
};

export default JobSearch;
