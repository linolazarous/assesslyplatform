// frontend/src/pages/legal/GDPRCompliance.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Users, Mail, CheckCircle, ExternalLink } from 'lucide-react';

const GDPRCompliance = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-full mb-6">
            <Shield className="h-12 w-12 text-purple-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">GDPR Compliance</h1>
          <p className="text-gray-600">General Data Protection Regulation compliance for our React-based assessment platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              {/* Content similar to other pages with GDPR-specific information */}
              <p className="text-gray-700 mb-6">
                Our platform, built with <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a> and powered by <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a>, is fully compliant with the EU General Data Protection Regulation (GDPR).
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {/* Navigation links */}
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
