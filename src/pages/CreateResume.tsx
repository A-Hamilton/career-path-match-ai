
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FileText, Download, Bot, Plus, X, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CreateResume = () => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [formData, setFormData] = useState({
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: "",
      summary: ""
    },
    targetRole: "",
    experience: "",
    skills: [] as string[],
    education: "",
    achievements: ""
  });
  const [currentSkill, setCurrentSkill] = useState("");
  const { toast } = useToast();

  const handleAddSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, currentSkill.trim()]
      });
      setCurrentSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleGenerateResume = async () => {
    setIsGenerating(true);
    
    // Simulate AI resume generation
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
      toast({
        title: "Resume Generated!",
        description: "Your AI-powered resume has been created successfully.",
      });
    }, 3000);
  };

  const handleDownload = (format: string) => {
    toast({
      title: `Downloading Resume`,
      description: `Your resume is being downloaded as ${format.toUpperCase()}.`,
    });
  };

  if (isGenerated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Generated Successfully!</h1>
              <p className="text-gray-600">Your AI-powered resume is ready for download</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Resume Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Resume Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border rounded-lg p-6 shadow-sm">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">{formData.personalInfo.name}</h2>
                      <p className="text-gray-600">{formData.personalInfo.email} • {formData.personalInfo.phone}</p>
                      <p className="text-gray-600">{formData.personalInfo.location}</p>
                    </div>
                    
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg mb-2">Professional Summary</h3>
                      <p className="text-sm text-gray-700">
                        {formData.personalInfo.summary || "AI-generated professional summary tailored to your target role..."}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-semibold text-lg mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-1">
                        {formData.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-semibold text-lg mb-2">Experience</h3>
                      <p className="text-sm text-gray-700">AI-optimized experience section...</p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg mb-2">Education</h3>
                      <p className="text-sm text-gray-700">{formData.education}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Download Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Download className="h-5 w-5 mr-2" />
                    Download Options
                  </CardTitle>
                  <CardDescription>Choose your preferred format</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={() => handleDownload('pdf')} 
                    className="w-full justify-start"
                    size="lg"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Download as PDF
                    <Badge variant="secondary" className="ml-auto">Recommended</Badge>
                  </Button>
                  
                  <Button 
                    onClick={() => handleDownload('docx')} 
                    variant="outline" 
                    className="w-full justify-start"
                    size="lg"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Download as DOCX
                  </Button>
                  
                  <Button 
                    onClick={() => handleDownload('txt')} 
                    variant="outline" 
                    className="w-full justify-start"
                    size="lg"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Download as TXT
                  </Button>
                  
                  <Button 
                    onClick={() => handleDownload('png')} 
                    variant="outline" 
                    className="w-full justify-start"
                    size="lg"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Download as PNG
                  </Button>

                  <div className="border-t pt-4">
                    <Button variant="ghost" className="w-full" onClick={() => setIsGenerated(false)}>
                      Create Another Resume
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Resume Builder</h1>
            <p className="text-gray-600">Let AI create a professional resume tailored to your dream job</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Step {step} of 3</span>
              <span className="text-sm text-gray-500">{Math.round((step / 3) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Tell us about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={formData.personalInfo.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        personalInfo: { ...formData.personalInfo, name: e.target.value }
                      })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={formData.personalInfo.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        personalInfo: { ...formData.personalInfo, email: e.target.value }
                      })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone"
                      value={formData.personalInfo.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        personalInfo: { ...formData.personalInfo, phone: e.target.value }
                      })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location"
                      value={formData.personalInfo.location}
                      onChange={(e) => setFormData({
                        ...formData,
                        personalInfo: { ...formData.personalInfo, location: e.target.value }
                      })}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="summary">Professional Summary (Optional)</Label>
                  <Textarea 
                    id="summary"
                    value={formData.personalInfo.summary}
                    onChange={(e) => setFormData({
                      ...formData,
                      personalInfo: { ...formData.personalInfo, summary: e.target.value }
                    })}
                    placeholder="Brief description of your professional background..."
                    rows={3}
                  />
                </div>
                <Button onClick={() => setStep(2)} className="w-full">
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Professional Details</CardTitle>
                <CardDescription>Share your experience and skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="targetRole">Target Job Title</Label>
                  <Input 
                    id="targetRole"
                    value={formData.targetRole}
                    onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                    placeholder="Software Engineer"
                  />
                </div>
                
                <div>
                  <Label htmlFor="experience">Work Experience</Label>
                  <Textarea 
                    id="experience"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="Describe your work experience, achievements, and responsibilities..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="skills">Skills</Label>
                  <div className="flex space-x-2 mb-2">
                    <Input 
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      placeholder="Add a skill"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                    />
                    <Button type="button" onClick={handleAddSkill} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveSkill(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1">
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Education & Final Details</CardTitle>
                <CardDescription>Complete your profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="education">Education</Label>
                  <Textarea 
                    id="education"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    placeholder="Your educational background, degrees, certifications..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="achievements">Key Achievements (Optional)</Label>
                  <Textarea 
                    id="achievements"
                    value={formData.achievements}
                    onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                    placeholder="Awards, recognitions, notable accomplishments..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleGenerateResume} 
                    className="flex-1"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Bot className="h-4 w-4 mr-2 animate-spin" />
                        Generating Resume...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Resume with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isGenerating && (
            <Card className="mt-6">
              <CardContent className="py-8">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto text-blue-600 animate-pulse mb-4" />
                  <h3 className="text-lg font-semibold mb-2">AI is crafting your resume...</h3>
                  <p className="text-gray-600 mb-4">
                    Our AI is analyzing your information and creating a professional resume optimized for your target role.
                  </p>
                  <div className="max-w-md mx-auto">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Analyzing content</span>
                      <span>Optimizing keywords</span>
                      <span>Formatting</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CreateResume;
