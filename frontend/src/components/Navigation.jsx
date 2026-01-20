import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, User, LayoutDashboard, CreditCard, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { isAuthenticated, logout, getCurrentUser } from '../utils/auth';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleGetStarted = () => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
    toggleMenu();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
    toggleMenu();
  };

  // Handle smooth scroll to sections
  const handleSectionClick = (sectionId, e) => {
    e.preventDefault();
    
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        scrollToSection(sectionId);
      }, 100);
    } else {
      scrollToSection(sectionId);
    }
    
    toggleMenu();
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Handle external links with tracking
  const handleExternalLink = (url, label) => {
    if (window.gtag) {
      window.gtag('event', 'click_external_link', {
        link_label: label,
        link_url: url
      });
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Navigation items
  const navItems = [
    { id: 'platform', label: 'Platform' },
    { id: 'solutions', label: 'Solutions' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'security', label: 'Security' },
    { 
      id: 'docs', 
      label: 'Docs',
      external: true,
      url: 'https://docs.assesslyplatform.com' 
    },
    { id: 'contact', label: 'Contact' }
  ];

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
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `
                  <div class="flex items-center space-x-2">
                    <div class="h-10 w-10 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg"></div>
                    <span class="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                      Assessly
                    </span>
                  </div>
                `;
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              item.external ? (
                <button
                  key={item.id}
                  onClick={() => handleExternalLink(item.url, item.label)}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                >
                  {item.label}
                </button>
              ) : (
                <button
                  key={item.id}
                  onClick={(e) => handleSectionClick(item.id, e)}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                >
                  {item.label}
                </button>
              )
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            {isAuthenticated() ? (
              <div className="flex items-center space-x-4">
                {/* User plan badge */}
                {user?.plan && user.plan !== 'free' && (
                  <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                    {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                  </span>
                )}
                
                {/* Settings button */}
                <Button 
                  onClick={() => navigate('/settings')}
                  variant="ghost"
                  className="flex items-center"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
                
                {/* Dashboard button */}
                <Button 
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="flex items-center"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
                
                {/* Logout button */}
                <Button 
                  onClick={handleLogout}
                  variant="ghost"
                  className="flex items-center"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => navigate('/login')} 
                  variant="ghost"
                  className="flex items-center"
                >
                  <User className="mr-2 h-4 w-4" />
                  Login
                </Button>
                <Button 
                  onClick={() => navigate('/register')}
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
              className="text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2 animate-in fade-in slide-in-from-top-2">
            {navItems.map((item) => (
              item.external ? (
                <button
                  key={item.id}
                  onClick={() => {
                    handleExternalLink(item.url, item.label);
                    toggleMenu();
                  }}
                  className="block w-full text-left text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors font-medium py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {item.label}
                </button>
              ) : (
                <button
                  key={item.id}
                  onClick={(e) => handleSectionClick(item.id, e)}
                  className="block w-full text-left text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors font-medium py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {item.label}
                </button>
              )
            ))}
            
            <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
              {isAuthenticated() ? (
                <>
                  {/* User info */}
                  {user && (
                    <div className="px-4 py-2 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {user.plan && user.plan !== 'free' && (
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                          {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Plan
                        </span>
                      )}
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => { 
                      navigate('/dashboard'); 
                      toggleMenu(); 
                    }} 
                    className="w-full flex items-center justify-center"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Button>
                  
                  <Button 
                    onClick={() => { 
                      navigate('/settings'); 
                      toggleMenu(); 
                    }}
                    variant="outline"
                    className="w-full flex items-center justify-center"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                  
                  <Button 
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full flex items-center justify-center text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => { 
                      navigate('/login'); 
                      toggleMenu(); 
                    }} 
                    variant="outline"
                    className="w-full flex items-center justify-center"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                  <Button 
                    onClick={handleGetStarted}
                    className="w-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-500 hover:opacity-90 transition-opacity flex items-center justify-center"
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
