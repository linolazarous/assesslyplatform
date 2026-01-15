import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/button';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('assessly_token');

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/images/logo.png" 
              alt="Assessly Platform" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/#platform" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Platform
            </Link>
            <Link to="/#solutions" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Solutions
            </Link>
            <Link to="/#pricing" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Pricing
            </Link>
            <Link to="/#security" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Security
            </Link>
            <a 
              href="https://docs.assesslyplatform.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
            >
              Docs
            </a>
            <Link to="/#contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">
              Contact
            </Link>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Button onClick={() => navigate('/dashboard')} variant="outline">
                  Dashboard
                </Button>
                <Button 
                  onClick={() => {
                    localStorage.removeItem('assessly_token');
                    navigate('/');
                    window.location.reload();
                  }}
                  variant="ghost"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button onClick={() => navigate('/login')} variant="ghost">
                  Login
                </Button>
                <Button 
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:opacity-90 transition-opacity"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <Link 
              to="/#platform" 
              className="block text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
              onClick={toggleMenu}
            >
              Platform
            </Link>
            <Link 
              to="/#solutions" 
              className="block text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
              onClick={toggleMenu}
            >
              Solutions
            </Link>
            <Link 
              to="/#pricing" 
              className="block text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
              onClick={toggleMenu}
            >
              Pricing
            </Link>
            <Link 
              to="/#security" 
              className="block text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
              onClick={toggleMenu}
            >
              Security
            </Link>
            <a 
              href="https://docs.assesslyplatform.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
            >
              Docs
            </a>
            <Link 
              to="/#contact" 
              className="block text-gray-700 hover:text-blue-600 transition-colors font-medium py-2"
              onClick={toggleMenu}
            >
              Contact
            </Link>
            <div className="pt-4 space-y-2">
              {isAuthenticated ? (
                <>
                  <Button onClick={() => { navigate('/dashboard'); toggleMenu(); }} className="w-full">
                    Dashboard
                  </Button>
                  <Button 
                    onClick={() => {
                      localStorage.removeItem('assessly_token');
                      navigate('/');
                      toggleMenu();
                      window.location.reload();
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => { navigate('/login'); toggleMenu(); }} variant="outline" className="w-full">
                    Login
                  </Button>
                  <Button 
                    onClick={() => { handleGetStarted(); toggleMenu(); }}
                    className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
