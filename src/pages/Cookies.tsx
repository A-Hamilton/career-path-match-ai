
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Cookies = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Cookie Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: January 1, 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What Are Cookies</h2>
              <p className="text-gray-600 mb-4">
                Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences, keeping you logged in, and analyzing how you use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Cookies</h2>
              <p className="text-gray-600 mb-4">We use cookies for several purposes:</p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Authentication and security</li>
                <li>Remembering your preferences and settings</li>
                <li>Analyzing website performance and usage</li>
                <li>Personalizing your experience</li>
                <li>Providing relevant content and recommendations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Types of Cookies We Use</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Essential Cookies</h3>
              <p className="text-gray-600 mb-4">
                These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Performance Cookies</h3>
              <p className="text-gray-600 mb-4">
                These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. This helps us improve our website's performance.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Functional Cookies</h3>
              <p className="text-gray-600 mb-4">
                These cookies enable enhanced functionality and personalization, such as remembering your login details and language preferences.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Analytics Cookies</h3>
              <p className="text-gray-600 mb-4">
                We use analytics cookies to measure and analyze website usage to help us improve our services and user experience.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Third-Party Cookies</h2>
              <p className="text-gray-600 mb-4">
                We may use third-party services that set their own cookies. These include:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Google Analytics for website analytics</li>
                <li>Payment processors for handling transactions</li>
                <li>Customer support tools</li>
                <li>Social media platforms for sharing content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Cookie Duration</h2>
              <p className="text-gray-600 mb-4">Cookies can be either:</p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Session Cookies</h3>
              <p className="text-gray-600 mb-4">
                Temporary cookies that are deleted when you close your browser. These are used for essential website functionality.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Persistent Cookies</h3>
              <p className="text-gray-600 mb-4">
                Cookies that remain on your device for a set period or until you delete them. These help us remember your preferences across visits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Managing Cookies</h2>
              <p className="text-gray-600 mb-4">
                You can control and manage cookies in several ways:
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Browser Settings</h3>
              <p className="text-gray-600 mb-4">
                Most browsers allow you to view, manage, and delete cookies through their settings. You can usually find these options in the "Privacy" or "Security" section of your browser settings.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Cookie Preferences</h3>
              <p className="text-gray-600 mb-4">
                You can manage your cookie preferences through our website's cookie banner when you first visit, or by accessing your account settings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Impact of Disabling Cookies</h2>
              <p className="text-gray-600 mb-4">
                While you can disable cookies, please note that doing so may affect your experience on our website:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>You may need to re-enter information more frequently</li>
                <li>Some features may not work properly</li>
                <li>Your preferences may not be saved</li>
                <li>Website performance may be impacted</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookie List</h2>
              <p className="text-gray-600 mb-4">
                Below are the main cookies we use on our website:
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Essential Cookies</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>session_id:</strong> Maintains your login session</li>
                  <li><strong>csrf_token:</strong> Security protection against attacks</li>
                  <li><strong>user_preferences:</strong> Stores your account preferences</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Analytics Cookies</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><strong>_ga:</strong> Google Analytics tracking</li>
                  <li><strong>_gid:</strong> Google Analytics session tracking</li>
                  <li><strong>analytics_session:</strong> Internal analytics tracking</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Updates to This Policy</h2>
              <p className="text-gray-600 mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about our use of cookies or this Cookie Policy, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">
                  <strong>Email:</strong> privacy@resumematch.ai<br />
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

export default Cookies;
