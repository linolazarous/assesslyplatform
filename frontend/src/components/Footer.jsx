// frontend/src/components/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, FileCheck, Mail, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Tagline */}
          <div className="col-span-1 md:col-span-2">
            <img 
              src="/images/logo.png" 
              alt="Assessly Platform" 
              className="h-12 w-auto mb-4"
            />
            <p className="text-gray-400 max-w-md">
              Measure Smarter, Not Harder — From Questions to Insights, Anywhere.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Enterprise-grade assessment platform trusted by 500+ organizations worldwide.
            </p>
            <div className="flex items-center mt-4 text-xs text-gray-500">
              <span>Built with React</span>
              <span className="mx-2">•</span>
              <span>Powered by FastAPI</span>
              <span className="mx-2">•</span>
              <span>UI by Shadcn UI</span>
            </div>
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
                <Link to="/gdpr-compliance" className="hover:text-white transition-colors flex items-center">
                  <FileCheck className="mr-2 h-4 w-4" />
                  GDPR Compliance
                </Link>
              </li>
              <li>
                <Link to="/soc-2" className="hover:text-white transition-colors flex items-center">
                  <FileCheck className="mr-2 h-4 w-4" />
                  SOC-2 Information
                </Link>
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
                <a href="mailto:privacy@assesslyplatform.com" className="hover:text-white transition-colors">
                  privacy@assesslyplatform.com
                </a>
              </li>
              <li>
                <a href="mailto:legal@assesslyplatform.com" className="hover:text-white transition-colors">
                  legal@assesslyplatform.com
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://docs.assesslyplatformfrontend.onrender.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center">
                  Documentation
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </li>
              <li>
                <Link to="/#features" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/#pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
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
              <Link to="/soc-2" className="text-sm text-gray-500 hover:text-white">
                SOC-2 Compliant
              </Link>
              <Link to="/gdpr-compliance" className="text-sm text-gray-500 hover:text-white">
                GDPR Ready
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
