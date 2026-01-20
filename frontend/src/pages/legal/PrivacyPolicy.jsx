import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, FileText, Calendar, Mail, Building, ExternalLink, ArrowLeft } from 'lucide-react';
import Navigation from '../components/Navigation'; // Add navigation

const PrivacyPolicy = () => {
  const lastUpdated = 'January 1, 2025';
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Add Navigation */}
      <Navigation />
      
      {/* Add Back to Home Button */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
        <Link 
          to="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-blue-50 to-teal-50 rounded-full mb-6">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <div className="flex items-center justify-center text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* Company Information */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200">
          <div className="flex items-start">
            <Building className="h-6 w-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessly Platform Inc.</h3>
              <p className="text-gray-700 mb-3">
                123 Innovation Drive, Suite 500<br />
                San Francisco, CA 94107<br />
                United States
              </p>
              <p className="text-gray-700">
                For privacy-related inquiries: 
                <a href="mailto:privacy@assesslyplatform.com" className="ml-2 text-blue-600 hover:text-blue-800 font-medium inline-flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  privacy@assesslyplatform.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              
              {/* Introduction */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
                <p className="text-gray-700 mb-4">
                  Welcome to Assessly Platform. We are committed to protecting your privacy and ensuring transparency in how we handle your personal data. This Privacy Policy explains our practices regarding the collection, use, and disclosure of your information when you use our assessment platform.
                </p>
                <p className="text-gray-700">
                  Built with <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center">
                    React <ExternalLink className="h-3 w-3 ml-1" />
                  </a>, our platform leverages modern technologies to ensure both functionality and privacy.
                </p>
              </section>

              {/* Data Collection */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FileText className="h-6 w-6 mr-2 text-blue-600" />
                  Information We Collect
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Information</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Full name and contact details
                      </li>
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Email address and organization
                      </li>
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Payment information (for paid plans)
                      </li>
                    </ul>
                  </div>

                  <div className="p-5 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Assessment Data</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Assessment questions and answers
                      </li>
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Candidate responses and scores
                      </li>
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Usage patterns and analytics
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Data Usage */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Platform Operation</h3>
                    <p className="text-gray-700">
                      To provide, maintain, and improve our assessment services powered by <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a>.
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Communication</h3>
                    <p className="text-gray-700">
                      To send important notifications, updates, and respond to your inquiries.
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Security & Compliance</h3>
                    <p className="text-gray-700">
                      To protect our platform, users, and comply with legal obligations.
                    </p>
                  </div>
                </div>
              </section>

              {/* Data Protection */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Lock className="h-6 w-6 mr-2 text-blue-600" />
                  Data Protection & Security
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">Encryption</h3>
                    <p className="text-blue-700 text-sm">
                      End-to-end TLS/SSL encryption for all data in transit
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2">Access Control</h3>
                    <p className="text-green-700 text-sm">
                      Strict access controls and authentication mechanisms
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-2">Regular Audits</h3>
                    <p className="text-purple-700 text-sm">
                      Security audits and penetration testing
                    </p>
                  </div>
                </div>
              </section>

              {/* Third Parties */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Services</h2>
                <p className="text-gray-700 mb-4">
                  We use trusted third-party services to enhance our platform:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">R</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">React</p>
                      <p className="text-sm text-gray-600">Frontend framework</p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-green-600 font-bold">S</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Shadcn UI</p>
                      <p className="text-sm text-gray-600">UI components</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Your Rights */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
                <div className="bg-gradient-to-r from-teal-50 to-blue-50 p-6 rounded-xl border border-teal-200">
                  <p className="text-gray-700 mb-4">
                    You have the right to access, correct, delete, or restrict the processing of your personal data. To exercise these rights, contact us at:
                  </p>
                  <a href="mailto:privacy@assesslyplatform.com" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium">
                    <Mail className="h-5 w-5 mr-2" />
                    privacy@assesslyplatform.com
                  </a>
                </div>
              </section>

              {/* Changes */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
                <p className="text-gray-700">
                  We may update this Privacy Policy periodically. We will notify you of significant changes by posting the new policy on our platform and, where appropriate, through email notification.
                </p>
              </section>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <Link 
              to="/terms" 
              className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg transition-all duration-200 font-medium"
            >
              Terms of Service
            </Link>
            <Link 
              to="/security" 
              className="px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 rounded-lg transition-all duration-200 font-medium"
            >
              Security Overview
            </Link>
            <Link 
              to="/gdpr-compliance" 
              className="px-4 py-2 bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-700 rounded-lg transition-all duration-200 font-medium"
            >
              GDPR Compliance
            </Link>
            <Link 
              to="/soc-2" 
              className="px-4 py-2 bg-gradient-to-r from-teal-100 to-teal-200 hover:from-teal-200 hover:to-teal-300 text-teal-700 rounded-lg transition-all duration-200 font-medium"
            >
              SOC-2 Information
            </Link>
          </div>
          
          <div className="pt-6 border-t border-gray-200">
            <p className="text-gray-600 text-sm mb-2">
              Copyright © {currentYear} Assessly Platform. All rights reserved.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span>Built with React</span>
              <span>•</span>
              <span>UI by Shadcn UI</span>
              <span>•</span>
              <span>Icons from Lucide</span>
              <span>•</span>
              <span>Powered by FastAPI</span>
            </div>
            <p className="text-gray-400 text-xs mt-3">
              Made with ❤️ by the Assessly Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
