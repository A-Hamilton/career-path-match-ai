
import { ArrowRight, FileText, TrendingUp, Target, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Index = () => {
  const features = [
    {
      icon: FileText,
      title: "AI Resume Analysis",
      description: "Get instant feedback on your resume with our advanced AI technology. Identify strengths, weaknesses, and optimization opportunities.",
      image: "/placeholder.svg"
    },
    {
      icon: TrendingUp,
      title: "Career Path Recommendations",
      description: "Discover personalized career paths based on your skills, experience, and interests. Plan your professional growth.",
      image: "/placeholder.svg"
    },
    {
      icon: Target,
      title: "Smart Job Matching",
      description: "Find opportunities that perfectly match your profile. Our AI analyzes job requirements against your resume.",
      image: "/placeholder.svg"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Software Engineer",
      content: "ResumeMatch AI helped me land my dream job at a top tech company. The resume feedback was incredibly detailed and actionable.",
      avatar: "/placeholder.svg"
    },
    {
      name: "Michael Chen",
      role: "Marketing Manager",
      content: "The career path recommendations opened my eyes to opportunities I never considered. Highly recommend this platform!",
      avatar: "/placeholder.svg"
    },
    {
      name: "Emily Rodriguez",
      role: "Data Analyst",
      content: "The job matching feature is spot-on. I received interview requests within days of optimizing my resume.",
      avatar: "/placeholder.svg"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Elevate Your Career with<br />
            <span className="text-blue-600">AI-Powered Resume Optimization</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your resume into a powerful career tool. Get instant AI feedback, discover new career paths, and find your perfect job match.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/resume-analyzer">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg">
                Analyze My Resume
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/career-paths">
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg border-blue-600 text-blue-600 hover:bg-blue-50">
                Explore Career Paths
              </Button>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-blue-600">12,000+</span>
              <span className="text-gray-600">Resumes Analyzed</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-blue-600">5,000+</span>
              <span className="text-gray-600">Job Matches Made</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-blue-600">3,000+</span>
              <span className="text-gray-600">Users Landed Jobs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Powerful Features to Accelerate Your Career</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI-powered platform provides everything you need to optimize your job search and career development.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:-translate-y-2">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
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
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">Join thousands of professionals who've transformed their careers</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">"{testimonial.content}"</p>
                  <div className="flex mt-4">
                    {[...Array(5)].map((_, i) => (
                      <CheckCircle key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Career?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who've already optimized their resumes and found their dream jobs.
          </p>
          <Link to="/resume-analyzer">
            <Button size="lg" variant="secondary" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
