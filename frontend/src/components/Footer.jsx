import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, FileCheck, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Tagline */}
          <div className="col-span-1 md:col-span-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_511a146b-da91-4265-9e1f-65fd48a29bda/artifacts/kz1mhqzy_logo.png" 
              alt="Assessly" 
              className="h-12 w-auto mb-4"
            />
            <p className="text-gray-400 max-w-md">
              Measure Smarter, Not Harder — From Questions to Insights, Anywhere.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Enterprise-grade assessment platform trusted by 500+ organizations worldwide.
            </p>
          </div>

          {/* Security & Compliance */}
          <div>
            <h4 className="text-white font-semibold mb-4 flex items-center">
              <Shield className="mr-2 h-5 w-5 text-teal-500" />
              Security & Compliance
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/security" className="hover:text-white transition-colors flex items-center">
                  <Lock className="mr-2 h-4 w-4" />
                  Security Overview
                </Link>
              </li>
              <li>
                <a href="mailto:gdpr@assesslyplatform.com" className="hover:text-white transition-colors flex items-center">
                  <FileCheck className="mr-2 h-4 w-4" />
                  GDPR Compliance
                </a>
              </li>
              <li>
                <a href="mailto:soc-2@assesslyplatform.com" className="hover:text-white transition-colors flex items-center">
                  <FileCheck className="mr-2 h-4 w-4" />
                  SOC-2 Certification
                </a>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4 flex items-center">
              <Mail className="mr-2 h-5 w-5 text-teal-500" />
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="mailto:info@assesslyplatform.com" className="hover:text-white transition-colors">
                  info@assesslyplatform.com
                </a>
              </li>
              <li>
                <a href="mailto:support@assesslyplatform.com" className="hover:text-white transition-colors">
                  support@assesslyplatform.com
                </a>
              </li>
              <li>
                <a href="https://docs.assesslyplatform.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <Link to="/#contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Assessly Platform. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <span className="text-sm text-gray-500 flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                99.9% Uptime
              </span>
              <span className="text-sm text-gray-500">SOC-2 Compliant</span>
              <span className="text-sm text-gray-500">GDPR Ready</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
