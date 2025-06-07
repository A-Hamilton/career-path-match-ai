import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { User, FileText, Briefcase, GraduationCap, Star, Bookmark, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const UserProfile = () => {
  const { user, loading } = useAuth();
  const [personalInfo, setPersonalInfo] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: ''
  });
  useEffect(() => {
    if (!loading) {
      setPersonalInfo(info => ({
        ...info,
        name: user?.displayName || '',
        email: user?.email || ''
      }));
    }
  }, [user, loading]);
  if (loading) {
    return <div>Loading profile...</div>;
  }

  const [skills] = useState([
    "JavaScript", "React", "Node.js", "Python", "AWS", "Docker", "MongoDB"
  ]);

  const [savedJobs] = useState([
    { id: 1, title: "Senior Software Engineer", company: "Tech Corp", location: "San Francisco, CA", salary: "$120k - $180k", saved: "2 days ago" },
    { id: 2, title: "Full Stack Developer", company: "StartupXYZ", location: "Remote", salary: "$100k - $150k", saved: "1 week ago" },
    { id: 3, title: "Frontend Engineer", company: "Design Co", location: "New York, NY", salary: "$90k - $130k", saved: "2 weeks ago" }
  ]);

  const [savedCareerPaths] = useState([
    { id: 1, title: "Software Engineering Manager", level: "Senior", growth: "+15%", saved: "3 days ago" },
    { id: 2, title: "DevOps Engineer", level: "Mid-level", growth: "+22%", saved: "1 week ago" }
  ]);

  const [applicationHistory] = useState([
    { id: 1, title: "Senior Developer", company: "TechFlow", status: "In Review", applied: "1 week ago" },
    { id: 2, title: "Full Stack Engineer", company: "CodeBase", status: "Interview Scheduled", applied: "2 weeks ago" },
    { id: 3, title: "Software Engineer", company: "InnovateTech", status: "Rejected", applied: "3 weeks ago" }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Review": return "bg-yellow-100 text-yellow-800";
      case "Interview Scheduled": return "bg-green-100 text-green-800";
      case "Rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                {personalInfo.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{personalInfo.name}</h1>
              <p className="text-gray-600">{personalInfo.location}</p>
            </div>
          </div>

          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="saved-jobs">Saved Jobs</TabsTrigger>
              <TabsTrigger value="career-paths">Career Paths</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" value={personalInfo.name} onChange={(e) => setPersonalInfo({...personalInfo, name: e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={personalInfo.email} onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={personalInfo.phone} onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})} />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" value={personalInfo.location} onChange={(e) => setPersonalInfo({...personalInfo, location: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" value={personalInfo.bio} onChange={(e) => setPersonalInfo({...personalInfo, bio: e.target.value})} rows={3} />
                  </div>
                  <div>
                    <Label>Skills</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button>Save Changes</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resume">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    My Resumes
                  </CardTitle>
                  <CardDescription>Manage your resumes and set a primary one for applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <div>
                          <h3 className="font-medium">Software Engineer Resume</h3>
                          <p className="text-sm text-gray-600">Last updated: 2 days ago</p>
                          <Badge className="mt-1">Primary Resume</Badge>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Download</Button>
                        <Button variant="outline" size="sm">Analyze</Button>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      Upload New Resume
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="experience">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Work Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-l-2 border-blue-200 pl-4 pb-4">
                      <h3 className="font-semibold">Senior Software Engineer</h3>
                      <p className="text-gray-600">TechCorp Inc. • 2022 - Present</p>
                      <p className="text-sm text-gray-600 mt-2">Led development of microservices architecture serving 1M+ users daily.</p>
                    </div>
                    <div className="border-l-2 border-blue-200 pl-4 pb-4">
                      <h3 className="font-semibold">Software Engineer</h3>
                      <p className="text-gray-600">StartupXYZ • 2020 - 2022</p>
                      <p className="text-sm text-gray-600 mt-2">Built scalable web applications using React and Node.js.</p>
                    </div>
                    <Button variant="outline" className="w-full">
                      Add Experience
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="saved-jobs">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bookmark className="h-5 w-5 mr-2" />
                    Saved Jobs ({savedJobs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {savedJobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{job.title}</h3>
                            <p className="text-gray-600">{job.company} • {job.location}</p>
                            <p className="text-green-600 font-medium">{job.salary}</p>
                            <p className="text-sm text-gray-500 mt-2">Saved {job.saved}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm">Apply Now</Button>
                            <Button variant="outline" size="sm">Remove</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="career-paths">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Saved Career Paths ({savedCareerPaths.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {savedCareerPaths.map((path) => (
                      <div key={path.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{path.title}</h3>
                            <p className="text-gray-600">{path.level} Level</p>
                            <p className="text-green-600">Growth: {path.growth}</p>
                            <p className="text-sm text-gray-500 mt-2">Saved {path.saved}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button size="sm">Explore</Button>
                            <Button variant="outline" size="sm">Remove</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="applications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Application History ({applicationHistory.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {applicationHistory.map((application) => (
                      <div key={application.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{application.title}</h3>
                            <p className="text-gray-600">{application.company}</p>
                            <p className="text-sm text-gray-500 mt-2">Applied {application.applied}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(application.status)}>
                              {application.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default UserProfile;
