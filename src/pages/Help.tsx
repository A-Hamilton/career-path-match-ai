import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Search, FileText, Users, CreditCard, Settings, MessageCircle } from "lucide-react";

const Help = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const categories = [
    {
      icon: FileText,
      title: "Resume Analyzer",
      description: "Learn how to get the most from our AI-powered resume analysis",
      articles: 12
    },
    {
      icon: Users,
      title: "Career Paths",
      description: "Discover new career opportunities and growth paths",
      articles: 8
    },
    {
      icon: CreditCard,
      title: "Billing & Pricing",
      description: "Questions about subscriptions, payments, and plans",
      articles: 6
    },
    {
      icon: Settings,
      title: "Account Settings",
      description: "Manage your profile, privacy, and preferences",
      articles: 10
    }
  ];

  const faqItems = [
    {
      question: "How accurate is the AI resume analysis?",
      answer: "Our AI analysis is trained on thousands of successful resumes and job postings. It provides highly accurate feedback on formatting, keywords, and content optimization. However, we always recommend combining AI insights with human judgment for the best results."
    },
    {
      question: "Can I analyze multiple resumes?",
      answer: "Yes! Free users can analyze up to 3 resumes per month, while Pro users get unlimited analyses. You can save and compare different versions of your resume to track improvements over time."
    },
    {
      question: "How do I cancel my subscription?",
      answer: "You can cancel your subscription anytime from your account settings. Go to Settings > Subscription > Cancel Plan. Your subscription will remain active until the end of your current billing period."
    },
    {
      question: "Is my data secure and private?",
      answer: "Absolutely. We use enterprise-grade encryption to protect your data. Your resumes and personal information are never shared with third parties without your explicit consent. You can delete your data anytime from your account settings."
    },
    {
      question: "How does job matching work?",
      answer: "Our AI analyzes your resume, skills, and preferences to match you with relevant job opportunities. We consider factors like experience level, location preferences, salary expectations, and career goals to provide personalized recommendations."
    },
    {
      question: "Can I get help with cover letters?",
      answer: "Yes! Pro subscribers have access to our AI-powered cover letter generator. It creates personalized cover letters based on your resume and the specific job you're applying for."
    },
    {
      question: "Do you offer refunds?",
      answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied with our service, contact our support team within 30 days of your purchase for a full refund."
    },
    {
      question: "How can I contact support?",
      answer: "You can reach our support team through the contact form, email us at support@resumematch.ai, or use the live chat feature (available for Pro subscribers). We typically respond within 24 hours."
    }
  ];

  const filteredFAQs = faqItems.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Find answers to common questions and learn how to make the most of ResumeMatch AI
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search for help..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Help Categories */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <category.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Badge variant="secondary">{category.articles} articles</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            {filteredFAQs.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6">
                <AccordionTrigger className="text-left font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {filteredFAQs.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <p className="text-gray-500">No results found for "{searchTerm}"</p>
              <p className="text-sm text-gray-400 mt-2">Try searching with different keywords</p>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-16 text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Still Need Help?
              </CardTitle>
              <CardDescription>
                Can't find what you're looking for? Our support team is here to help.
              </CardDescription>
            </CardHeader>
             <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <strong>Email:</strong> support@resumematch.ai
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Response time:</strong> Usually within 24 hours
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Help;
