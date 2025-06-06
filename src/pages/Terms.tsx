
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: January 1, 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
              <p className="text-gray-600 mb-4">
                By accessing and using ResumeMatch AI ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-600 mb-4">
                ResumeMatch AI provides AI-powered resume analysis, career path recommendations, and job matching services. We use artificial intelligence to help users optimize their resumes and advance their careers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="text-gray-600 mb-4">You are responsible for:</p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and current information</li>
                <li>Notifying us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Acceptable Use</h2>
              <p className="text-gray-600 mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Upload malicious code or viruses</li>
                <li>Interfere with the proper functioning of the Service</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Content and Data</h2>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Your Content</h3>
              <p className="text-gray-600 mb-4">
                You retain ownership of content you upload (resumes, personal information). By using our Service, you grant us a license to process and analyze your content to provide our services.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Our Content</h3>
              <p className="text-gray-600 mb-4">
                All content, features, and functionality of the Service are owned by ResumeMatch AI and are protected by copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Subscription and Payment</h2>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>We may change subscription fees with 30 days notice</li>
                <li>You may cancel your subscription at any time</li>
                <li>Access continues until the end of your billing period</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. AI-Generated Content</h2>
              <p className="text-gray-600 mb-4">
                Our AI provides suggestions and analysis based on patterns and data. While we strive for accuracy:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>AI recommendations are suggestions, not guarantees</li>
                <li>You are responsible for reviewing and validating all content</li>
                <li>We do not guarantee specific outcomes or job placement</li>
                <li>Human judgment should always be applied</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Privacy</h2>
              <p className="text-gray-600 mb-4">
                Your privacy is important to us. Please review our Privacy Policy, which explains how we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimers</h2>
              <p className="text-gray-600 mb-4">
                The Service is provided "as is" without warranties of any kind. We disclaim all warranties, express or implied, including but not limited to merchantability and fitness for a particular purpose.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">
                To the maximum extent permitted by law, ResumeMatch AI shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Termination</h2>
              <p className="text-gray-600 mb-4">
                We may terminate or suspend your account immediately if you breach these Terms. Upon termination, your right to use the Service will cease immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to Terms</h2>
              <p className="text-gray-600 mb-4">
                We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law</h2>
              <p className="text-gray-600 mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Information</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">
                  <strong>Email:</strong> legal@resumematch.ai<br />
                  <strong>Address:</strong> 123 Tech Street, San Francisco, CA 94105<br />
                  <strong>Phone:</strong> +1 (555) 123-4567
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;
