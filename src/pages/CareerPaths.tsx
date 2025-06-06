
import { useState } from "react";
import { Search, Filter, TrendingUp, DollarSign, Clock, BookOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";

const CareerPaths = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");

  const careerPaths = [
    {
      id: 1,
      title: "Data Scientist",
      industry: "Technology",
      description: "Analyze complex data to help companies make strategic decisions using machine learning and statistical methods.",
      avgSalary: "$115,000",
      growthRate: "22%",
      timeToRole: "2-4 years",
      skills: ["Python", "Machine Learning", "Statistics", "SQL"],
      education: "Bachelor's in Computer Science or related field",
      trending: true
    },
    {
      id: 2,
      title: "UX Designer",
      industry: "Design",
      description: "Create intuitive and engaging user experiences for digital products and applications.",
      avgSalary: "$85,000",
      growthRate: "13%",
      timeToRole: "1-3 years",
      skills: ["Figma", "User Research", "Prototyping", "Design Thinking"],
      education: "Bachelor's in Design or related field",
      trending: false
    },
    {
      id: 3,
      title: "Product Manager",
      industry: "Technology",
      description: "Lead product development from conception to launch, working with cross-functional teams.",
      avgSalary: "$130,000",
      growthRate: "8%",
      timeToRole: "3-5 years",
      skills: ["Product Strategy", "Analytics", "Agile", "Leadership"],
      education: "Bachelor's degree (MBA preferred)",
      trending: true
    },
    {
      id: 4,
      title: "DevOps Engineer",
      industry: "Technology",
      description: "Bridge development and operations to improve software deployment and infrastructure management.",
      avgSalary: "$105,000",
      growthRate: "18%",
      timeToRole: "2-4 years",
      skills: ["AWS", "Docker", "Kubernetes", "CI/CD"],
      education: "Bachelor's in Computer Science or IT",
      trending: true
    },
    {
      id: 5,
      title: "Digital Marketing Manager",
      industry: "Marketing",
      description: "Develop and execute digital marketing strategies across multiple channels to drive business growth.",
      avgSalary: "$75,000",
      growthRate: "10%",
      timeToRole: "2-3 years",
      skills: ["SEO", "SEM", "Social Media", "Analytics"],
      education: "Bachelor's in Marketing or related field",
      trending: false
    },
    {
      id: 6,
      title: "Cybersecurity Specialist",
      industry: "Technology",
      description: "Protect organizations from cyber threats by implementing security measures and monitoring systems.",
      avgSalary: "$120,000",
      growthRate: "31%",
      timeToRole: "2-5 years",
      skills: ["Network Security", "Ethical Hacking", "Risk Assessment", "Compliance"],
      education: "Bachelor's in Cybersecurity or IT",
      trending: true
    }
  ];

  const filteredPaths = careerPaths.filter(path => {
    const matchesSearch = path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         path.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = selectedIndustry === "all" || path.industry === selectedIndustry;
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Explore Your Career Possibilities</h1>
            <p className="text-xl text-gray-600">Discover personalized career paths based on your interests and skills</p>
          </div>

          {/* Search and Filter Section */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search career paths..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Experience Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Career Path Results */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPaths.map((path) => (
              <Card key={path.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                      {path.title}
                    </CardTitle>
                    {path.trending && (
                      <Badge className="bg-green-100 text-green-800 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Trending
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline">{path.industry}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-sm leading-relaxed">{path.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                      <span className="font-medium">{path.avgSalary}</span>
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
                      <span>{path.growthRate} growth</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-orange-600 mr-1" />
                      <span>{path.timeToRole}</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 text-purple-600 mr-1" />
                      <span>Education</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Key Skills:</h4>
                    <div className="flex flex-wrap gap-1">
                      {path.skills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {path.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{path.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                      Learn More
                    </Button>
                    <Button variant="outline" size="icon">
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPaths.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No career paths found matching your criteria.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedIndustry("all");
                  setSelectedLevel("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CareerPaths;
