
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MapPin, Clock, Users, Coffee, Heart, Zap } from "lucide-react";

const Careers = () => {
  const positions = [
    {
      title: "Senior Frontend Engineer",
      department: "Engineering",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      description: "Join our frontend team to build beautiful, intuitive user experiences using React, TypeScript, and modern web technologies."
    },
    {
      title: "AI/ML Engineer",
      department: "Engineering",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      description: "Help us advance our AI capabilities in resume analysis, job matching, and career recommendations using Python and TensorFlow."
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      description: "Shape the user experience of our platform through user research, prototyping, and visual design."
    },
    {
      title: "Data Scientist",
      department: "Data",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      description: "Analyze user behavior and job market trends to improve our matching algorithms and user recommendations."
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Remote",
      type: "Full-time",
      description: "Help our users achieve their career goals by providing exceptional support and guidance throughout their journey."
    },
    {
      title: "Marketing Manager",
      department: "Marketing",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      description: "Drive growth through content marketing, SEO, partnerships, and user acquisition strategies."
    }
  ];

  const benefits = [
    {
      icon: Heart,
      title: "Health & Wellness",
      description: "Comprehensive health, dental, and vision insurance plus wellness stipend"
    },
    {
      icon: Coffee,
      title: "Work-Life Balance",
      description: "Flexible working hours, unlimited PTO, and remote-first culture"
    },
    {
      icon: Zap,
      title: "Growth & Learning",
      description: "Professional development budget, conference attendance, and mentorship programs"
    },
    {
      icon: Users,
      title: "Team & Culture",
      description: "Inclusive environment, team retreats, and collaborative workspace"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Join Our Mission</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Help us transform how people find their dream careers. We're building the future of 
            AI-powered career development, and we need talented people to make it happen.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Why Work With Us</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Open Positions</h2>
          <div className="space-y-6 max-w-4xl mx-auto">
            {positions.map((position, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">{position.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{position.department}</Badge>
                        <Badge variant="outline" className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {position.location}
                        </Badge>
                        <Badge variant="outline" className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {position.type}
                        </Badge>
                      </div>
                    </div>
                    <Button>Apply Now</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {position.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Culture Section */}
        <div className="bg-blue-50 rounded-lg p-8 mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Culture</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We believe that great products come from great teams. Our culture is built on 
              collaboration, innovation, and a shared commitment to helping people succeed.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="font-semibold text-lg mb-2">Innovation</h3>
              <p className="text-gray-600 text-sm">We encourage experimentation and learning from failure</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Collaboration</h3>
              <p className="text-gray-600 text-sm">We work together across teams to achieve our goals</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Impact</h3>
              <p className="text-gray-600 text-sm">Every role directly contributes to our users' success</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Don't See Your Role?</h2>
          <p className="text-gray-600 mb-6">
            We're always looking for talented people. Send us your resume and we'll keep you in mind for future opportunities.
          </p>
          <Button size="lg">Send Resume</Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Careers;
