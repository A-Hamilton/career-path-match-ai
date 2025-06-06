
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Target, Users, Award, Lightbulb } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "We're committed to democratizing career success through AI-powered tools that level the playing field for all job seekers."
    },
    {
      icon: Lightbulb,
      title: "Innovation First",
      description: "We continuously push the boundaries of what's possible with AI to create smarter, more intuitive career development tools."
    },
    {
      icon: Users,
      title: "User-Centric",
      description: "Every feature we build starts with understanding our users' real challenges and designing solutions that truly help."
    },
    {
      icon: Award,
      title: "Excellence",
      description: "We maintain the highest standards in everything we do, from our AI algorithms to our customer support."
    }
  ];

  const team = [
    {
      name: "Sarah Chen",
      role: "CEO & Co-founder",
      bio: "Former Google engineer with 10+ years in AI and machine learning. Passionate about using technology to solve real-world problems."
    },
    {
      name: "Michael Rodriguez",
      role: "CTO & Co-founder",
      bio: "Ex-Microsoft architect specializing in scalable systems. Led engineering teams at three successful startups."
    },
    {
      name: "Dr. Emily Watson",
      role: "Head of AI Research",
      bio: "PhD in Natural Language Processing from Stanford. Published researcher in career development and HR technology."
    },
    {
      name: "David Kim",
      role: "Head of Product",
      bio: "Former LinkedIn product manager with deep expertise in career platforms and user experience design."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About ResumeMatch AI</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            We believe everyone deserves access to career opportunities that match their potential. 
            Our AI-powered platform is designed to bridge the gap between talent and opportunity, 
            making career advancement more accessible and effective for everyone.
          </p>
        </div>

        {/* Story Section */}
        <div className="mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Story</h2>
            <div className="prose prose-lg mx-auto text-gray-600">
              <p className="mb-6">
                ResumeMatch AI was born from a simple observation: the job market has evolved rapidly, 
                but the tools available to job seekers haven't kept pace. Traditional resume advice 
                and generic job search platforms leave many talented individuals struggling to 
                showcase their true potential.
              </p>
              <p className="mb-6">
                Founded in 2024 by a team of AI researchers, career experts, and former recruiters, 
                we set out to create something different. We wanted to build a platform that doesn't 
                just help people find jobs—it helps them find the right jobs and positions them for 
                long-term career success.
              </p>
              <p>
                Today, we're proud to serve thousands of job seekers, helping them optimize their 
                resumes, discover new career paths, and connect with opportunities that truly 
                match their skills and aspirations.
              </p>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-3">{value.title}</h3>
                  <p className="text-gray-600 text-sm">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Meet Our Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-600">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{member.name}</h3>
                  <p className="text-blue-600 text-sm mb-3">{member.role}</p>
                  <p className="text-gray-600 text-sm">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Our Impact</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">12,000+</div>
              <div className="text-gray-600">Resumes Analyzed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">5,000+</div>
              <div className="text-gray-600">Job Matches Made</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">3,000+</div>
              <div className="text-gray-600">Users Landed Jobs</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">95%</div>
              <div className="text-gray-600">User Satisfaction</div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
