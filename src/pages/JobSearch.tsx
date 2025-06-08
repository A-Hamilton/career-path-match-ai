import { useState, useEffect } from "react";
import { Search, MapPin, Filter, Briefcase, Clock, DollarSign, Building, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const JobSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("all");
  const [salaryRange, setSalaryRange] = useState("all");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs from backend proxy
  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    let url = `/api/jobs?`;
    const params = new URLSearchParams();
    if (searchTerm) params.append('what', searchTerm);
    if (location) params.append('where', location);
    if (jobType !== "all") params.append('contract_type', jobType.toLowerCase());
    // Salary range parsing
    if (salaryRange !== "all") {
      if (salaryRange === "50k-75k") { params.append('salary_min', '50000'); params.append('salary_max', '75000'); }
      if (salaryRange === "75k-100k") { params.append('salary_min', '75000'); params.append('salary_max', '100000'); }
      if (salaryRange === "100k-150k") { params.append('salary_min', '100000'); params.append('salary_max', '150000'); }
      if (salaryRange === "150k+") { params.append('salary_min', '150000'); }
    }
    url += params.toString();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const result = await res.json();
      // TheirStack returns { metadata, data: Job[] }
      setJobs(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(); // Initial load
    // eslint-disable-next-line
  }, []);

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
              </div>
              <div className="flex items-center mt-4 gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={fetchJobs}>
                  <Search className="h-4 w-4 mr-2" />
                  Search Jobs
                </Button>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              {jobs.length} jobs found {searchTerm && `for "${searchTerm}"`}
            </p>
            <Select defaultValue="relevance">
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
          </div>
          {/* Job Listing Results */}
          <div className="space-y-4">
            {loading && <div className="text-center py-8">Loading jobs...</div>}
            {error && <div className="text-center text-red-500 py-8">{error}</div>}
            {!loading && !error && jobs.map((job) => (
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
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span>{job.min_annual_salary_usd ? `$${job.min_annual_salary_usd.toLocaleString()}` : "N/A"} - {job.max_annual_salary_usd ? `$${job.max_annual_salary_usd.toLocaleString()}` : "N/A"}</span>
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
          {!loading && !error && jobs.length === 0 && (
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
                  fetchJobs();
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
          {/* Load More (pagination) could be added here */}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JobSearch;
