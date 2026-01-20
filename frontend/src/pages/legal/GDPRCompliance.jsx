// frontend/src/pages/legal/GDPRCompliance.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Users, Mail, CheckCircle, ExternalLink, ArrowLeft, Cpu, Lock, Building } from 'lucide-react';
import Navigation from '../components/Navigation'; // Add navigation

const GDPRCompliance = () => {
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-full mb-6">
            <Shield className="h-12 w-12 text-purple-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">GDPR Compliance</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            General Data Protection Regulation compliance for our platform built with <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a> and powered by <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a>
          </p>
        </div>

        {/* GDPR Status Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
          <div className="flex items-start">
            <CheckCircle className="h-6 w-6 text-purple-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-purple-800 mb-2">GDPR Compliant Since: May 25, 2018</h3>
              <p className="text-purple-700">
                Our platform has been fully compliant with the EU General Data Protection Regulation since its enforcement date. We regularly update our practices to align with evolving data protection requirements.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              
              {/* Introduction */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">What is GDPR?</h2>
                <p className="text-gray-700 mb-6">
                  The General Data Protection Regulation (GDPR) is a comprehensive data protection law that came into effect in the European Union on May 25, 2018. It regulates how organizations collect, use, and protect personal data of EU residents. Our platform, powered by modern technologies including <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a> and <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a>, is designed with GDPR compliance as a foundational principle.
                </p>
              </section>

              {/* Data Subject Rights */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Users className="h-6 w-6 mr-2 text-blue-600" />
                  Your Rights Under GDPR
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Right to Access</h3>
                        <p className="text-gray-700 text-sm">
                          You have the right to obtain confirmation about whether we process your personal data and access to that data.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Right to Rectification</h3>
                        <p className="text-gray-700 text-sm">
                          You have the right to have inaccurate personal data corrected or completed if it is incomplete.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Right to Erasure</h3>
                        <p className="text-gray-700 text-sm">
                          You have the right to have your personal data deleted in certain circumstances ("right to be forgotten").
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl border border-teal-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-teal-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Right to Restrict Processing</h3>
                        <p className="text-gray-700 text-sm">
                          You have the right to restrict the processing of your personal data in certain circumstances.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Right to Data Portability</h3>
                        <p className="text-gray-700 text-sm">
                          You have the right to receive your personal data in a structured, commonly used format.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Right to Object</h3>
                        <p className="text-gray-700 text-sm">
                          You have the right to object to the processing of your personal data in certain circumstances.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Our GDPR Practices */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Cpu className="h-6 w-6 mr-2 text-blue-600" />
                  Our GDPR Implementation
                </h2>
                
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Data Protection by Design</h3>
                    <p className="text-gray-700 mb-4">
                      Our technology stack, including <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a> for the frontend and <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a> for the backend, incorporates data protection principles from the outset:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Data minimization: Only collecting data necessary for assessment purposes
                      </li>
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Purpose limitation: Using data only for specified assessment purposes
                      </li>
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Storage limitation: Automatic data deletion policies for inactive accounts
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Technical & Organizational Measures</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Technical Measures</h4>
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start">
                            <Lock className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                            End-to-end encryption
                          </li>
                          <li className="flex items-start">
                            <Lock className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                            Regular security testing
                          </li>
                          <li className="flex items-start">
                            <Lock className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                            Access control systems
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Organizational Measures</h4>
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start">
                            <Users className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                            Data protection officer
                          </li>
                          <li className="flex items-start">
                            <Users className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                            Staff training programs
                          </li>
                          <li className="flex items-start">
                            <Users className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                            Data processing agreements
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Data Processing Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Building className="h-6 w-6 mr-2 text-blue-600" />
                  Data Processing Details
                </h2>
                
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Lawful Basis for Processing</h3>
                    <p className="text-gray-700 mb-4">
                      We process personal data based on the following lawful bases under GDPR:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded-lg border border-green-200">
                        <h4 className="font-semibold text-gray-800 mb-1">Contractual Necessity</h4>
                        <p className="text-sm text-gray-600">Processing necessary for fulfilling assessment service contracts</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-green-200">
                        <h4 className="font-semibold text-gray-800 mb-1">Legitimate Interests</h4>
                        <p className="text-sm text-gray-600">Processing for platform security, fraud prevention, and service improvement</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-green-200 md:col-span-2">
                        <h4 className="font-semibold text-gray-800 mb-1">Consent</h4>
                        <p className="text-sm text-gray-600">Explicit consent obtained for marketing communications and optional features</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Exercising Your Rights</h3>
                    <p className="text-gray-700 mb-4">
                      To exercise any of your GDPR rights or for questions about our data processing practices:
                    </p>
                    <div className="flex items-center p-3 bg-white rounded-lg border border-purple-200">
                      <Mail className="h-5 w-5 text-purple-600 mr-3" />
                      <a href="mailto:privacy@assesslyplatform.com" className="text-purple-600 hover:text-purple-800 font-medium">
                        privacy@assesslyplatform.com
                      </a>
                    </div>
                    <p className="text-gray-600 text-sm mt-2">
                      We respond to all requests within 30 days as required by GDPR. No fee is charged for exercising your rights.
                    </p>
                  </div>
                </div>
              </section>

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
              to="/terms" 
              className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg transition-all duration-200 font-medium"
            >
              Terms of Service
            </Link>
            <Link 
              to="/security" 
              className="px-4 py-2 bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 text-green-700 rounded-lg transition-all duration-200 font-medium"
            >
              Security Overview
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

export default GDPRCompliance;
