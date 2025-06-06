
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Check, Star, Zap, Crown } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for getting started with resume optimization",
      features: [
        "3 resume analyses per month",
        "Basic job search",
        "Career path exploration",
        "Email support"
      ],
      popular: false,
      icon: Star
    },
    {
      name: "Pro",
      price: "$19",
      period: "per month",
      description: "Advanced features for serious job seekers",
      features: [
        "Unlimited resume analyses",
        "AI-powered resume optimization",
        "Priority job matching",
        "Cover letter generator",
        "Interview preparation tools",
        "Priority support",
        "ATS-optimized downloads"
      ],
      popular: true,
      icon: Zap
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per month",
      description: "Complete solution for teams and organizations",
      features: [
        "Everything in Pro",
        "Team management dashboard",
        "Bulk resume processing",
        "Custom integrations",
        "Dedicated account manager",
        "Advanced analytics",
        "White-label options"
      ],
      popular: false,
      icon: Crown
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade as your career grows. All plans include our core AI-powered features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg scale-105' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    plan.popular ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <plan.icon className={`h-6 w-6 ${plan.popular ? 'text-blue-600' : 'text-gray-600'}`} />
                  </div>
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-gray-900">
                  {plan.price}
                  <span className="text-sm font-normal text-gray-600">/{plan.period}</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.name === 'Free' ? 'Get Started' : `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-gray-600 text-sm">Our Free plan gives you access to core features. Pro and Enterprise plans offer 14-day free trials.</p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm">We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.</p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
              <p className="text-gray-600 text-sm">Yes, we offer a 30-day money-back guarantee for all paid plans.</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Pricing;
