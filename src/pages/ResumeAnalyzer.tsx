import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, Download, Eye, Target, Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { firebaseAuth } from "@/lib/firebase"; // add at top

const ResumeAnalyzer = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [targetJobTitle, setTargetJobTitle] = useState("");
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded and is ready for analysis.`,
      });
    }
  };

  const analyzeResume = async () => {
    if (!uploadedFile) return;
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('resume', uploadedFile);
    if (targetJobTitle) formData.append('targetJobTitle', targetJobTitle);
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const res = await fetch('/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setAnalysisData(data);
      setAnalysisComplete(true);
      toast({ title: 'Analysis complete!', description: 'Your resume has been successfully uploaded.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { text: "Excellent Resume!", color: "bg-green-100 text-green-800" };
    if (score >= 70) return { text: "Great Resume!", color: "bg-blue-100 text-blue-800" };
    if (score >= 50) return { text: "Good Resume", color: "bg-yellow-100 text-yellow-800" };
    return { text: "Needs Improvement", color: "bg-red-100 text-red-800" };
  };

  const mockAnalysisResults = {
    score: 85,
    strengths: [
      { text: "Strong technical skills section with relevant keywords", detail: "You've included modern technologies like React, Node.js, and MongoDB which are highly sought after." },
      { text: "Clear professional experience with quantified achievements", detail: "Your use of metrics like '30% increase in user engagement' demonstrates impact." },
      { text: "Well-formatted and ATS-friendly layout", detail: "Clean structure with proper headings and bullet points for easy parsing." },
      { text: "Relevant education background for target roles", detail: "Your Computer Science degree aligns well with software development positions." }
    ],
    improvements: [
      { text: "Add more industry-specific keywords to improve ATS compatibility", priority: "High", impact: "+8 points" },
      { text: "Include a professional summary at the top", priority: "Medium", impact: "+5 points" },
      { text: "Quantify achievements with specific metrics and percentages", priority: "High", impact: "+7 points" },
      { text: "Update contact information format for better parsing", priority: "Low", impact: "+2 points" }
    ],
    keywords: {
      found: ["JavaScript", "React", "Node.js", "MongoDB", "Git"],
      missing: ["TypeScript", "AWS", "Docker", "Kubernetes", "CI/CD"],
      placement: [
        { keyword: "TypeScript", suggestion: "Add to technical skills section" },
        { keyword: "AWS", suggestion: "Include in recent project descriptions" },
        { keyword: "Docker", suggestion: "Mention in development workflow" }
      ]
    },
    formatting: [
      { issue: "Font consistency maintained throughout", status: "good" },
      { issue: "Proper use of white space", status: "good" },
      { issue: "Consider using bullet points instead of paragraphs", status: "warning" }
    ]
  };

  const recommendedJobs = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      company: "TechCorp Inc.",
      location: "San Francisco, CA",
      salary: "$120k - $150k",
      matchScore: 95,
      type: "Full-time",
      posted: "2 days ago",
      description: "Looking for a skilled React developer to join our growing team.",
      skills: ["React", "TypeScript", "Node.js"]
    },
    {
      id: 2,
      title: "Full Stack Developer",
      company: "StartupXYZ",
      location: "Remote",
      salary: "$100k - $130k",
      matchScore: 88,
      type: "Full-time",
      posted: "1 day ago",
      description: "Build amazing web applications with modern technologies.",
      skills: ["JavaScript", "React", "MongoDB"]
    },
    {
      id: 3,
      title: "React Developer",
      company: "Innovation Labs",
      location: "New York, NY",
      salary: "$90k - $120k",
      matchScore: 82,
      type: "Contract",
      posted: "3 days ago",
      description: "Create beautiful user interfaces for our SaaS platform.",
      skills: ["React", "JavaScript", "Git"]
    }
  ];

  const scoreBadge = getScoreBadge(mockAnalysisResults.score);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {analysisComplete && analysisData && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded">
              {JSON.stringify(analysisData, null, 2)}
            </pre>
            <Button variant="outline" onClick={() => { setAnalysisComplete(false); setAnalysisData(null); setUploadedFile(null); }}>
              Analyze Another
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Resume Analyzer - Get Instant Feedback</h1>
            <p className="text-xl text-gray-600">Get instant AI-powered feedback on your resume</p>
          </div>

          {!analysisComplete ? (
            <>
              {/* Upload Section */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Your Resume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Choose your resume file
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Upload PDF, DOC, or DOCX files (max 5MB)
                      </p>
                      <Button variant="outline">
                        Browse Files
                      </Button>
                    </label>
                  </div>

                  {/* Target Job Selection */}
                  <div className="mt-6">
                    <Label htmlFor="target-job">Target Job Title (Optional)</Label>
                    <Input
                      id="target-job"
                      placeholder="e.g., Senior Software Engineer, Product Manager"
                      value={targetJobTitle}
                      onChange={(e) => setTargetJobTitle(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Specify a target role to get tailored feedback and score refinement
                    </p>
                  </div>

                  {uploadedFile && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="text-sm font-medium">{uploadedFile.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 text-center">
                    <Button 
                      onClick={analyzeResume}
                      disabled={!uploadedFile || isAnalyzing}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
                    </Button>
                  </div>

                  {isAnalyzing && (
                    <div className="mt-6">
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-600">AI is analyzing your resume...</p>
                      </div>
                      <Progress value={66} className="w-full" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sample Analysis Link */}
              <div className="text-center">
                <Button 
                  variant="link" 
                  onClick={() => setAnalysisComplete(true)}
                  className="text-blue-600"
                >
                  View Sample Resume Analysis
                </Button>
              </div>
            </>
          ) : (
            /* Analysis Results */
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Analysis Results */}
              <div className="lg:col-span-2 space-y-8">
                {/* Overall Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Overall Resume Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className={`text-4xl font-bold ${getScoreColor(mockAnalysisResults.score)}`}>
                          {mockAnalysisResults.score}
                        </span>
                        <span className="text-2xl text-gray-400">/100</span>
                      </div>
                      <div className="text-right">
                        <Badge className={scoreBadge.color}>
                          {scoreBadge.text}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">Your resume is in excellent shape</p>
                      </div>
                    </div>
                    <Progress value={mockAnalysisResults.score} className="w-full" />
                  </CardContent>
                </Card>

                {/* Strengths */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-600">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockAnalysisResults.strengths.map((strength, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-gray-700 font-medium">{strength.text}</span>
                              <p className="text-sm text-gray-600 mt-1">{strength.detail}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Areas for Improvement */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-orange-600">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Areas for Improvement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockAnalysisResults.improvements.map((improvement, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start">
                              <AlertCircle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{improvement.text}</span>
                            </div>
                            <div className="flex space-x-2">
                              <Badge variant="outline" className={improvement.priority === "High" ? "border-red-200 text-red-700" : improvement.priority === "Medium" ? "border-yellow-200 text-yellow-700" : "border-gray-200 text-gray-700"}>
                                {improvement.priority}
                              </Badge>
                              <Badge variant="secondary">
                                {improvement.impact}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Keywords */}
                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Optimization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-semibold text-green-600 mb-3">Keywords Found</h4>
                        <div className="flex flex-wrap gap-2">
                          {mockAnalysisResults.keywords.found.map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-600 mb-3">Suggested Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {mockAnalysisResults.keywords.missing.map((keyword, index) => (
                            <Badge key={index} variant="outline" className="border-orange-200 text-orange-700">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-blue-600 mb-3">Keyword Placement Suggestions</h4>
                      <div className="space-y-2">
                        {mockAnalysisResults.keywords.placement.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <span className="font-medium">{item.keyword}</span>
                            <span className="text-sm text-gray-600">{item.suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Download className="h-4 w-4 mr-2" />
                    Download Improved Resume
                  </Button>
                  <Button variant="outline">
                    Save Analysis to Profile
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setAnalysisComplete(false);
                    setUploadedFile(null);
                  }}>
                    Analyze Another Resume
                  </Button>
                </div>
              </div>

              {/* Recommended Jobs Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Briefcase className="h-5 w-5 mr-2" />
                      Recommended Jobs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Based on your resume analysis, here are jobs that match your profile:
                    </p>
                    <div className="space-y-4">
                      {recommendedJobs.map((job) => (
                        <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm">{job.title}</h4>
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              {job.matchScore}% Match
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{job.company}</p>
                          <div className="flex items-center text-xs text-gray-500 space-x-3 mb-2">
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              <span>{job.salary}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {job.skills.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          <Button size="sm" className="w-full">
                            View Details
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      View All Recommended Jobs
                    </Button>
                  </CardContent>
                </Card>

                {/* Related Articles */}
                <Card>
                  <CardHeader>
                    <CardTitle>Related Articles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <a href="#" className="block text-sm text-blue-600 hover:underline">
                        How to Write an ATS-Friendly Resume
                      </a>
                      <a href="#" className="block text-sm text-blue-600 hover:underline">
                        Top Resume Keywords for 2024
                      </a>
                      <a href="#" className="block text-sm text-blue-600 hover:underline">
                        Resume Formatting Best Practices
                      </a>
                    </div>
                  </CardContent>
                </Card>

                {/* Need Help */}
                <Card>
                  <CardHeader>
                    <CardTitle>Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      Get personalized resume writing assistance from our experts.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Contact Support
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ResumeAnalyzer;
