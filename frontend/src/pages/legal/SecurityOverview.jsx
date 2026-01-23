// frontend/src/pages/legal/SecurityOverview.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Server, Users, AlertTriangle, CheckCircle, Cpu, ExternalLink, ArrowLeft } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';

const SecurityOverview = () => {
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
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-full mb-6">
            <Shield className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Security Overview
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Enterprise-grade security powered by modern technologies including <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a> and built with <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a>
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              
              {/* Introduction */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Cpu className="h-6 w-6 mr-2 text-blue-600" />
                  Technology Stack Security
                </h2>
                <p className="text-gray-700 mb-6">
                  Our platform leverages industry-leading technologies to ensure maximum security:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-blue-600 font-bold text-xl">R</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">React Frontend</h3>
                    <p className="text-gray-700 text-sm">
                      Built with React for secure, component-based architecture with automatic vulnerability scanning
                    </p>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-green-600 font-bold text-xl">F</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">FastAPI Backend</h3>
                    <p className="text-gray-700 text-sm">
                      Powered by FastAPI with automatic security headers, input validation, and rate limiting
                    </p>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-purple-600 font-bold text-xl">S</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Shadcn UI</h3>
                    <p className="text-gray-700 text-sm">
                      UI components from Shadcn UI with built-in accessibility and security best practices
                    </p>
                  </div>
                </div>
              </section>

              {/* Security Features */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Lock className="h-6 w-6 mr-2 text-blue-600" />
                  Security Features
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-teal-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Data Encryption</h3>
                        <p className="text-gray-700 text-sm">
                          End-to-end TLS/SSL encryption for all data in transit and AES-256 encryption at rest
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Access Control</h3>
                        <p className="text-gray-700 text-sm">
                          Role-based access control (RBAC) with multi-factor authentication (MFA) support
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Regular Audits</h3>
                        <p className="text-gray-700 text-sm">
                          Continuous security monitoring and regular third-party penetration testing
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Compliance</h3>
                        <p className="text-gray-700 text-sm">
                          SOC-2 Type II compliant with regular audits and GDPR-ready data processing agreements
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Infrastructure */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Server className="h-6 w-6 mr-2 text-blue-600" />
                  Infrastructure Security
                </h2>
                
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Data Centers</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start">
                          <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          SOC-2 Type II certified facilities
                        </li>
                        <li className="flex items-start">
                          <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          Redundant power and network systems
                        </li>
                        <li className="flex items-start">
                          <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          24/7 physical security monitoring
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Network Security</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start">
                          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          DDoS protection and mitigation
                        </li>
                        <li className="flex items-start">
                          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          Web Application Firewall (WAF)
                        </li>
                        <li className="flex items-start">
                          <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          Intrusion detection and prevention
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* Compliance */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Users className="h-6 w-6 mr-2 text-blue-600" />
                  Compliance & Certifications
                </h2>
                
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-teal-50 to-green-50 rounded-xl border border-teal-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">SOC-2 Compliance</h3>
                    <p className="text-gray-700 mb-4">
                      We undergo regular SOC-2 Type II audits to ensure our security controls meet industry standards for security, availability, processing integrity, confidentiality, and privacy.
                    </p>
                    <div className="flex items-center text-sm text-gray-600">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Last audit completed: December 2024
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">GDPR Compliance</h3>
                    <p className="text-gray-700">
                      We comply with the EU General Data Protection Regulation (GDPR) for users in the European Economic Area. We provide data processing agreements and support data subject rights requests.
                    </p>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>

        {/* Imported Footer Component */}
        <Footer />
      </div>
    </div>
  );
};

export default SecurityOverview;
