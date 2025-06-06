
import { useState } from "react";
import { Search, MapPin, Filter, Briefcase, Clock, DollarSign, Building, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const JobSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [salaryRange, setSalaryRange] = useState("");

  const jobs = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      company: "TechCorp Inc.",
      location: "San Francisco, CA",
      type: "Full-time",
      salary: "$120k - $150k",
      posted: "2 days ago",
      description: "We're looking for a skilled Frontend Developer to join our growing team and help build amazing user experiences.",
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
      remote: true,
      urgent: false,
      matchScore: 95
    },
    {
      id: 2,
      title: "Product Manager",
      company: "StartupXYZ",
      location: "New York, NY",
      type: "Full-time",
      salary: "$130k - $160k",
      posted: "1 day ago",
      description: "Join our product team to define strategy and roadmap for our innovative SaaS platform.",
      skills: ["Product Strategy", "Analytics", "Agile", "User Research"],
      remote: false,
      urgent: true,
      matchScore: 88
    },
    {
      id: 3,
      title: "UX/UI Designer",
      company: "Design Studio Co.",
      location: "Remote",
      type: "Contract",
      salary: "$80k - $100k",
      posted: "3 days ago",
      description: "Create beautiful and intuitive user interfaces for our client's digital products.",
      skills: ["Figma", "Sketch", "Prototyping", "User Testing"],
      remote: true,
      urgent: false,
      matchScore: 78
    },
    {
      id: 4,
      title: "Data Scientist",
      company: "Analytics Pro",
      location: "Austin, TX",
      type: "Full-time",
      salary: "$110k - $140k",
      posted: "1 week ago",
      description: "Analyze large datasets to extract insights and build predictive models for business growth.",
      skills: ["Python", "Machine Learning", "SQL", "Tableau"],
      remote: true,
      urgent: false,
      matchScore: 85
    },
    {
      id: 5,
      title: "DevOps Engineer",
      company: "CloudTech Solutions",
      location: "Seattle, WA",
      type: "Full-time",
      salary: "$105k - $135k",
      posted: "4 days ago",
      description: "Build and maintain our cloud infrastructure and deployment pipelines.",
      skills: ["AWS", "Docker", "Kubernetes", "Terraform"],
      remote: true,
      urgent: true,
      matchScore: 82
    },
    {
      id: 6,
      title: "Marketing Manager",
      company: "Growth Marketing Inc.",
      location: "Los Angeles, CA",
      type: "Full-time",
      salary: "$75k - $95k",
      posted: "5 days ago",
      description: "Lead digital marketing campaigns and drive customer acquisition for our growing business.",
      skills: ["Digital Marketing", "SEO", "Content Strategy", "Analytics"],
      remote: false,
      urgent: false,
      matchScore: 72
    }
  ];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !location || job.location.toLowerCase().includes(location.toLowerCase());
    const matchesType = !jobType || job.type === jobType;
    return matchesSearch && matchesLocation && matchesType;
  });

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
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={salaryRange} onValueChange={setSalaryRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Salary Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Salary</SelectItem>
                    <SelectItem value="50k-75k">$50k - $75k</SelectItem>
                    <SelectItem value="75k-100k">$75k - $100k</SelectItem>
                    <SelectItem value="100k-150k">$100k - $150k</SelectItem>
                    <SelectItem value="150k+">$150k+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center mt-4 gap-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
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
              {filteredJobs.length} jobs found {searchTerm && `for "${searchTerm}"`}
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
            {filteredJobs.map((job) => (
              <Card key={job.id} className="group hover:shadow-lg transition-all duration-300 hover:border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link to={`/jobs/${job.id}`}>
                            <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {job.title}
                            </h3>
                          </Link>
                          <div className="flex items-center text-gray-600 mt-1 space-x-4">
                            <div className="flex items-center">
                              <Building className="h-4 w-4 mr-1" />
                              <span>{job.company}</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{job.location}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getMatchColor(job.matchScore)}>
                            {job.matchScore}% Match
                          </Badge>
                          {job.urgent && (
                            <Badge className="bg-red-100 text-red-800">
                              Urgent
                            </Badge>
                          )}
                          {job.remote && (
                            <Badge variant="outline">
                              Remote
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4 line-clamp-2">{job.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-1" />
                            <span>{job.type}</span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span>{job.salary}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{job.posted}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Heart className="h-4 w-4" />
                          </Button>
                          <Link to={`/jobs/${job.id}`}>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {job.skills.slice(0, 4).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {job.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{job.skills.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No jobs found matching your criteria.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setLocation("");
                  setJobType("");
                  setSalaryRange("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Load More */}
          {filteredJobs.length > 0 && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg">
                Load More Jobs
              </Button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default JobSearch;
