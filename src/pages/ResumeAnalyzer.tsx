import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, Download, Eye, Target, Briefcase, MapPin, DollarSign, Clock, BookOpen } from "lucide-react";
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
import axios from 'axios';

const ResumeAnalyzer = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [targetJobTitle, setTargetJobTitle] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
      const user = firebaseAuth.currentUser;
      if (!user) {
        toast({ title: 'Not Authenticated', description: 'Please sign in to analyze your resume.', variant: 'destructive' });
        setIsAnalyzing(false);
        return;
      }

      const token = await user.getIdToken();
      const res = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      setAnalysisData(res.data);
      setAnalysisComplete(true);
      toast({ title: 'Analysis complete!', description: 'Your resume has been successfully analyzed.' });
    } catch (error: any) {
      console.error("Analysis Error:", error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFilePreview = () => {
    if (uploadedFile) {
      const fileURL = URL.createObjectURL(uploadedFile);
      setPreviewUrl(fileURL);
      window.open(fileURL, '_blank'); // Open in new tab
    } else {
      toast({ title: 'No file uploaded', description: 'Please upload a resume file to preview.', variant: 'destructive' });
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

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
                        <Button variant="ghost" size="sm" onClick={handleFilePreview}>
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
                        <span className={`text-4xl font-bold ${getScoreColor(analysisData.score)}`}>
                          {analysisData.score}
                        </span>
                        <span className="text-2xl text-gray-400">/100</span>
                      </div>
                      <div className="text-right">
                        <Badge className={getScoreBadge(analysisData.score).color}>
                          {getScoreBadge(analysisData.score).text}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">Your resume is in excellent shape</p>
                      </div>
                    </div>
                    <Progress value={analysisData.score} className="w-full" />
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
                      {analysisData.strengths && Array.isArray(analysisData.strengths) ? (
                        analysisData.strengths.map((strength: string, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <span className="text-gray-700 font-medium">{strength}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No strengths identified.</p>
                      )}
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
                      {analysisData.improvements && Array.isArray(analysisData.improvements) ? (
                        analysisData.improvements.map((improvement: string, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <span className="text-gray-700">{improvement}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No areas for improvement identified.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Keywords */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-blue-600">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-semibold text-green-600 mb-3">Keywords Found</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisData.keywords?.found && Array.isArray(analysisData.keywords.found) ? (
                            analysisData.keywords.found.map((keyword: string, index: number) => (
                              <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                                {keyword}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">No keywords found.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-600 mb-3">Suggested Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisData.keywords?.missing && Array.isArray(analysisData.keywords.missing) ? (
                            analysisData.keywords.missing.map((keyword: string, index: number) => (
                              <Badge key={index} variant="outline" className="border-orange-200 text-orange-700">
                                {keyword}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-gray-500 text-sm">No keyword suggestions available.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-600">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysisData.skills && Array.isArray(analysisData.skills) ? (
                        analysisData.skills.map((skill: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No skills identified.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Work Experience */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-blue-600">
                      <Briefcase className="h-5 w-5 mr-2" />
                      Work Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysisData.workExperience && Array.isArray(analysisData.workExperience) ? (
                        analysisData.workExperience.map((experience: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <h4 className="font-semibold">{experience.title}</h4>
                            <p className="text-sm text-gray-600">{experience.company}</p>
                            <p className="text-sm text-gray-500">{experience.startDate} - {experience.endDate || 'Present'}</p>
                            <p className="text-sm text-gray-700 mt-2">{experience.description}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No work experience identified.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Education */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-blue-600">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Education
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysisData.education && Array.isArray(analysisData.education) ? (
                        analysisData.education.map((edu: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <h4 className="font-semibold">{edu.institution}</h4>
                            <p className="text-sm text-gray-600">{edu.degree} in {edu.field}</p>
                            <p className="text-sm text-gray-500">{edu.startDate} - {edu.endDate || 'Present'}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No education details identified.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Projects */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-blue-600">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Projects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysisData.projects && Array.isArray(analysisData.projects) ? (
                        analysisData.projects.map((project: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <h4 className="font-semibold text-gray-900">{project.name}</h4>
                            <p className="text-sm text-gray-600">{project.description}</p>
                            <p className="text-sm text-gray-500">
                              Technologies:{" "}
                              {Array.isArray(project.technologies)
                                ? project.technologies.join(", ")
                                : project.technologies || "N/A"}
                            </p>
                            {project.link && (
                              <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                View Project
                              </a>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No projects identified.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Certifications */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-blue-600">
                      <BookOpen className="h-5 w-5 mr-2" />
                      Professional Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <h4 className="font-semibold text-lg">Professional Summary</h4>
                      <p className="text-sm text-gray-700">{analysisData.summary || 'No summary available.'}</p>
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
                      {/* Recommended jobs list - this should be dynamically generated based on analysisData */}
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm">Senior Frontend Developer</h4>
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            95% Match
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">TechCorp Inc.</p>
                        <div className="flex items-center text-xs text-gray-500 space-x-3 mb-2">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>San Francisco, CA</span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-3 w-3 mr-1" />
                            <span>$120k - $150k</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            React
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            TypeScript
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Node.js
                          </Badge>
                        </div>
                        <Button size="sm" className="w-full">
                          View Details
                        </Button>
                      </div>
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