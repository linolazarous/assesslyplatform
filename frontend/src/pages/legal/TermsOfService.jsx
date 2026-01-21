// frontend/src/pages/legal/TermsOfService.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, FileText, AlertTriangle, BookOpen, Shield, Mail, ExternalLink, ArrowLeft } from 'lucide-react';
import Navigation from '../../components/Navigation';

const TermsOfService = () => {
  const effectiveDate = 'January 1, 2025';
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
            <Scale className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <div className="flex flex-col items-center justify-center text-gray-600">
            <span>Effective Date: {effectiveDate}</span>
            <div className="mt-2 flex items-center text-sm">
              <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />
              <span className="text-yellow-600">Please read these terms carefully</span>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Legal Notice</h3>
              <p className="text-yellow-700">
                These Terms of Service constitute a legally binding agreement between you and Assessly Platform. By accessing or using our platform built with <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-yellow-800 underline">React</a> and <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-yellow-800 underline">FastAPI</a>, you agree to be bound by these Terms.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              
              {/* Quick Navigation */}
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
                  Table of Contents
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'acceptance', label: 'Acceptance of Terms', desc: 'Agreement to Terms' },
                    { id: 'accounts', label: 'User Accounts', desc: 'Account Responsibilities' },
                    { id: 'services', label: 'Platform Services', desc: 'Service Usage' },
                    { id: 'property', label: 'Intellectual Property', desc: 'Ownership Rights' },
                    { id: 'payment', label: 'Payment Terms', desc: 'Billing & Subscriptions' },
                    { id: 'liability', label: 'Liability', desc: 'Limitation of Liability' },
                  ].map((item) => (
                    <a 
                      key={item.id}
                      href={`#${item.id}`}
                      className="group p-4 bg-gray-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-teal-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all duration-200"
                    >
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-1">{item.label}</h3>
                      <p className="text-sm text-gray-600 group-hover:text-blue-500">{item.desc}</p>
                    </a>
                  ))}
                </div>
              </div>

              {/* Sections */}
              <div className="space-y-12">
                
                {/* Acceptance */}
                <section id="acceptance">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-6 w-6 mr-2 text-blue-600" />
                    1. Acceptance of Terms
                  </h2>
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      These Terms govern your access to and use of the Assessly Platform, including any content, functionality, and services offered through our platform built with modern technologies including <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a> and <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">Shadcn UI</a>.
                    </p>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-blue-700">
                        By registering for an account or using the Platform, you represent that you are at least 18 years old and have the legal authority to agree to these Terms.
                      </p>
                    </div>
                  </div>
                </section>

                {/* User Accounts */}
                <section id="accounts">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">2. User Accounts</h2>
                  
                  <div className="space-y-6">
                    <div className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Account Registration</h3>
                      <p className="text-gray-700">
                        To access certain features of our React-powered platform, you must register for an account. You agree to provide accurate, current, and complete information during registration.
                      </p>
                    </div>

                    <div className="p-5 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200">
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Prohibited Uses</h3>
                      <p className="text-gray-700 mb-3">
                        You may not use the Platform to:
                      </p>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start">
                          <div className="h-2 w-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          Violate any applicable laws or regulations
                        </li>
                        <li className="flex items-start">
                          <div className="h-2 w-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          Infringe upon intellectual property rights
                        </li>
                        <li className="flex items-start">
                          <div className="h-2 w-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          Conduct unauthorized assessments
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Platform Services */}
                <section id="services">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">3. Platform Services</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Service Description</h3>
                      <p className="text-gray-700">
                        Assessly Platform provides assessment creation, management, and analytics tools powered by <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 font-medium">FastAPI</a> backend services.
                      </p>
                    </div>

                    <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Service Availability</h3>
                      <p className="text-gray-700">
                        We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. We are not liable for any service interruptions or delays.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Intellectual Property */}
                <section id="property">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Intellectual Property</h2>
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      The Platform and its original content, features, and functionality are owned by Assessly Platform and are protected by international copyright, trademark, and other intellectual property laws.
                    </p>
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h3 className="font-semibold text-purple-800 mb-2">Your Content</h3>
                      <p className="text-purple-700">
                        You retain ownership of assessment content you create. By using the Platform, you grant us a license to process and display your content as necessary to provide our services.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Data Privacy */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Shield className="h-6 w-6 mr-2 text-blue-600" />
                    5. Data Privacy & Security
                  </h2>
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      Your privacy is important to us. Our data collection, use, and protection practices are described in our <Link to="/privacy" className="text-blue-600 hover:text-blue-800 font-medium">Privacy Policy</Link>.
                    </p>
                    <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200">
                      <h3 className="font-semibold text-teal-800 mb-2">Security Commitment</h3>
                      <p className="text-teal-700">
                        We implement industry-standard security measures to protect your data. However, no method of electronic transmission or storage is 100% secure.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Payment Terms */}
                <section id="payment">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Payment Terms</h2>
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">6.1 Subscription Fees</h3>
                    <p className="text-gray-700">
                      Paid subscriptions are billed in advance on a recurring basis. Fees are non-refundable except as required by law.
                    </p>
                  </div>
                </section>

                {/* Limitation of Liability */}
                <section id="liability">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Limitation of Liability</h2>
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      To the maximum extent permitted by law, Assessly Platform shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
                    </p>
                    <p className="text-gray-700">
                      Our total liability for any claims under these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.
                    </p>
                  </div>
                </section>

                {/* Contact */}
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact Information</h2>
                  <div className="space-y-3">
                    <p className="text-gray-700">
                      For questions about these Terms:
                    </p>
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Mail className="h-5 w-5 text-gray-600 mr-3" />
                      <a href="mailto:legal@assesslyplatform.com" className="text-blue-600 hover:text-blue-800 font-medium">
                        legal@assesslyplatform.com
                      </a>
                    </div>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <Link 
              to="/privacy" 
              className="px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 rounded-lg transition-all duration-200 font-medium"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/security" 
              className="px-4 py-2 bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 text-green-700 rounded-lg transition-all duration-200 font-medium"
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

export default TermsOfService;
