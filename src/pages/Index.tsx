
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, TrendingUp, Search, CheckCircle, Users, Briefcase } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Index = () => {
  const features = [
    {
      icon: FileText,
      title: "AI Resume Analysis",
      description: "Get instant feedback on your resume with our advanced AI technology. Identify strengths, weaknesses, and optimization opportunities.",
      testimonial: "\"The AI analysis helped me land my dream job at Google!\" - Sarah M."
    },
    {
      icon: TrendingUp,
      title: "Career Path Guidance",
      description: "Discover personalized career paths based on your skills, experience, and interests. Explore new opportunities and growth trajectories.",
      testimonial: "\"Found my perfect career transition path in minutes.\" - Mark D."
    },
    {
      icon: Search,
      title: "Smart Job Matching",
      description: "Find jobs that perfectly match your profile. Our AI matches you with opportunities based on your resume and career goals.",
      testimonial: "\"Matched with my current role - couldn't be happier!\" - Lisa K."
    }
  ];

  const testimonials = [
    {
      name: "Alex Johnson",
      role: "Software Engineer at Microsoft",
      content: "ResumeMatch AI transformed my job search. The resume analysis was spot-on and helped me land my dream role.",
      rating: 5
    },
    {
      name: "Maria Garcia",
      role: "Marketing Manager at Salesforce",
      content: "The career path recommendations opened my eyes to opportunities I never considered. Highly recommended!",
      rating: 5
    },
    {
      name: "David Chen",
      role: "Data Scientist at Netflix",
      content: "The job matching feature is incredible. It found positions that perfectly aligned with my skills and interests.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Elevate Your Career with AI-Powered Resume Optimization
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get instant AI feedback on your resume, discover personalized career paths, and find jobs that match your skills perfectly.
          </p>
          
          {/* Primary and Secondary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/resume-analyzer">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
                Analyze My Resume
              </Button>
            </Link>
            <Link to="/career-paths">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Browse Career Paths
              </Button>
            </Link>
            <Link to="/create-resume">
              <Button variant="ghost" size="lg" className="text-lg px-8 py-3">
                Create a Resume
              </Button>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">12,000+</span>
              <span>Resumes Analyzed</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Briefcase className="h-5 w-5 text-green-600" />
              <span className="font-semibold">5,000+</span>
              <span>Job Matches Made</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Users className="h-5 w-5 text-purple-600" />
              <span className="font-semibold">3,000+</span>
              <span>Users Landed Jobs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600">
              Comprehensive tools powered by AI to accelerate your career growth
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
                <CardContent className="p-8 text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <feature.icon className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {feature.description}
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700 italic">
                      {feature.testimonial}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What Our Users Say
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of professionals who've transformed their careers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <CheckCircle key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start your journey today with our AI-powered career tools
          </p>
          <Link to="/resume-analyzer">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
