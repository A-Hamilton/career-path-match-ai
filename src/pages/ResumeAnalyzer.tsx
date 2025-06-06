
import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const ResumeAnalyzer = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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

  const analyzeResume = () => {
    if (!uploadedFile) return;
    
    setIsAnalyzing(true);
    // Simulate analysis process
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      toast({
        title: "Analysis complete!",
        description: "Your resume has been successfully analyzed.",
      });
    }, 3000);
  };

  const mockAnalysisResults = {
    score: 85,
    strengths: [
      "Strong technical skills section with relevant keywords",
      "Clear professional experience with quantified achievements",
      "Well-formatted and ATS-friendly layout",
      "Relevant education background for target roles"
    ],
    improvements: [
      "Add more industry-specific keywords to improve ATS compatibility",
      "Include a professional summary at the top",
      "Quantify achievements with specific metrics and percentages",
      "Update contact information format for better parsing"
    ],
    keywords: {
      found: ["JavaScript", "React", "Node.js", "MongoDB", "Git"],
      missing: ["TypeScript", "AWS", "Docker", "Kubernetes", "CI/CD"]
    },
    formatting: [
      "Font consistency maintained throughout",
      "Proper use of white space",
      "Minor: Consider using bullet points instead of paragraphs"
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Resume Analyzer</h1>
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
            <div className="space-y-8">
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
                      <span className="text-4xl font-bold text-blue-600">{mockAnalysisResults.score}</span>
                      <span className="text-2xl text-gray-400">/100</span>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Great Resume!
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
                  <ul className="space-y-3">
                    {mockAnalysisResults.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
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
                  <ul className="space-y-3">
                    {mockAnalysisResults.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Keywords */}
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Optimization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
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
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ResumeAnalyzer;
