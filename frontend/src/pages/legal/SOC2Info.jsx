// frontend/src/pages/legal/SOC2Info.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileCheck, Award, Calendar, ExternalLink, CheckCircle, Server, Users, ArrowLeft } from 'lucide-react';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';

const SOC2Info = () => {
  const currentYear = new Date().getFullYear();
  const lastAuditDate = 'December 2024';
  const nextAuditDate = 'June 2025';

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
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-full mb-6">
            <Award className="h-12 w-12 text-teal-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">SOC-2 Information</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Service Organization Control 2 compliance for our platform powered by <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a> and built with <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a>
          </p>
        </div>

        {/* Audit Status Banner */}
        <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200">
          <div className="flex items-start">
            <FileCheck className="h-6 w-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Current Compliance Status: SOC-2 Type II Certified</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Last audit completed: <span className="font-semibold text-gray-900">{lastAuditDate}</span></span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Next audit scheduled: <span className="font-semibold text-gray-900">{nextAuditDate}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              
              {/* Introduction */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Shield className="h-6 w-6 mr-2 text-blue-600" />
                  What is SOC-2?
                </h2>
                <p className="text-gray-700 mb-6">
                  SOC-2 (Service Organization Control 2) is an auditing procedure that ensures our service providers securely manage your data to protect the interests of our organization and the privacy of our clients. Our platform, built with modern technologies including <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a> and <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a>, undergoes regular SOC-2 Type II audits to validate our security controls.
                </p>
              </section>

              {/* Trust Service Principles */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Trust Service Principles</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Security</h3>
                        <p className="text-gray-700 text-sm">
                          Protection against unauthorized access (both physical and logical)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Availability</h3>
                        <p className="text-gray-700 text-sm">
                          System availability for operation and use as committed or agreed
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Processing Integrity</h3>
                        <p className="text-gray-700 text-sm">
                          System processing is complete, valid, accurate, timely, and authorized
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl border border-teal-200">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-teal-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Confidentiality</h3>
                        <p className="text-gray-700 text-sm">
                          Information designated as confidential is protected as committed or agreed
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 md:col-span-2">
                    <div className="flex items-start mb-3">
                      <CheckCircle className="h-5 w-5 text-indigo-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Privacy</h3>
                        <p className="text-gray-700 text-sm">
                          Personal information is collected, used, retained, disclosed, and destroyed in conformity with commitments
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Audit Process */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FileCheck className="h-6 w-6 mr-2 text-blue-600" />
                  Audit Process
                </h2>
                
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Type I vs Type II</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">SOC-2 Type I</h4>
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start">
                            <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            Point-in-time assessment
                          </li>
                          <li className="flex items-start">
                            <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            Design suitability of controls
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">SOC-2 Type II</h4>
                        <ul className="space-y-2 text-gray-700">
                          <li className="flex items-start">
                            <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            Period assessment (6-12 months)
                          </li>
                          <li className="flex items-start">
                            <div className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            Operating effectiveness of controls
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Our Audit Timeline</h3>
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-blue-600 font-bold">1</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Initial Assessment</p>
                          <p className="text-sm text-gray-600">Comprehensive review of all security controls</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-green-600 font-bold">2</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Testing Period</p>
                          <p className="text-sm text-gray-600">6-12 months of continuous monitoring and testing</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-purple-600 font-bold">3</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Report Generation</p>
                          <p className="text-sm text-gray-600">Independent auditor prepares SOC-2 Type II report</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Technology Integration */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Server className="h-6 w-6 mr-2 text-blue-600" />
                  Technology & Compliance
                </h2>
                
                <div className="space-y-6">
                  <div className="p-6 bg-gradient-to-r from-teal-50 to-green-50 rounded-xl border border-teal-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">How Our Technology Supports SOC-2</h3>
                    <p className="text-gray-700 mb-4">
                      Our technology stack, including <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a> for the frontend and <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a> for the backend, is designed with security as a first-class citizen:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Automated security headers and input validation
                      </li>
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Comprehensive logging and monitoring systems
                      </li>
                      <li className="flex items-start">
                        <div className="h-2 w-2 bg-teal-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        Regular vulnerability scanning and dependency updates
                      </li>
                    </ul>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Access to Reports</h3>
                    <p className="text-gray-700 mb-4">
                      Current and prospective enterprise customers may request a copy of our SOC-2 Type II report under NDA. Please contact our security team for more information.
                    </p>
                    <div className="flex items-center p-3 bg-white rounded-lg border border-purple-200">
                      <Users className="h-5 w-5 text-purple-600 mr-3" />
                      <a href="mailto:security@assesslyplatform.com" className="text-purple-600 hover:text-purple-800 font-medium">
                        security@assesslyplatform.com
                      </a>
                    </div>
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

export default SOC2Info;
