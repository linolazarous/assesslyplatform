// frontend/src/pages/legal/SOC2Info.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileCheck, Award, Calendar, ExternalLink } from 'lucide-react';

const SOC2Info = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-full mb-6">
            <Award className="h-12 w-12 text-teal-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">SOC-2 Information</h1>
          <p className="text-gray-600">Service Organization Control 2 compliance for our FastAPI-powered platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="prose prose-lg max-w-none">
              {/* Content similar to other pages with SOC-2 specific information */}
              <p className="text-gray-700 mb-6">
                Our infrastructure, backed by <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">FastAPI</a> and presented through our <a href="https://react.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium">React</a> interface, maintains SOC-2 Type II compliance.
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

export default SOC2Info;
