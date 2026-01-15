// Mock data for Assessly Platform

export const mockFeatures = [
  {
    id: 1,
    title: "Multi-Tenant Architecture",
    description: "Organization-level data isolation with shared infrastructure for cost efficiency. Centralized Super Admin control with custom branding.",
    icon: "Building2"
  },
  {
    id: 2,
    title: "Role-Based Access Control",
    description: "Granular permissions across Super Admin, Organization Admin, Assessor, and Candidate roles with strict access boundaries.",
    icon: "Shield"
  },
  {
    id: 3,
    title: "Assessment Builder",
    description: "Intuitive drag-and-drop builder with 15+ question types, AI-assisted generation, templates, and versioning.",
    icon: "FileEdit"
  },
  {
    id: 4,
    title: "Real-Time Analytics",
    description: "Live dashboards with predictive analytics, AI-powered reports, and export to PDF, Excel, and CSV.",
    icon: "BarChart3"
  },
  {
    id: 5,
    title: "Enterprise Security",
    description: "End-to-end encryption, SOC-2 ready architecture, GDPR & HIPAA alignment with full audit logs.",
    icon: "Lock"
  },
  {
    id: 6,
    title: "API & Integrations",
    description: "RESTful API, webhooks, Zapier integration, and connectors for LMS, HRIS, and CRM systems.",
    icon: "Plug"
  }
];

export const mockCapabilities = [
  {
    id: 1,
    title: "Create & Design",
    description: "Drag-and-drop builder with AI assistance",
    step: "01"
  },
  {
    id: 2,
    title: "Configure & Brand",
    description: "Organization-specific settings and custom domains",
    step: "02"
  },
  {
    id: 3,
    title: "Distribute & Invite",
    description: "Email, links, and seamless integrations",
    step: "03"
  },
  {
    id: 4,
    title: "Monitor & Analyze",
    description: "Live dashboards with real-time insights",
    step: "04"
  },
  {
    id: 5,
    title: "Generate Reports",
    description: "AI-powered insights and visualizations",
    step: "05"
  },
  {
    id: 6,
    title: "Take Action",
    description: "Data-driven decisions with confidence",
    step: "06"
  }
];

export const mockAssessmentTypes = [
  "Exams & Quizzes",
  "Employee Evaluations",
  "360° Feedback",
  "Surveys & Questionnaires",
  "Certification Tests",
  "Skills & Aptitude Assessments",
  "Personality & Behavioral Tests",
  "Pre-employment Screening",
  "Course & Training Assessments",
  "Compliance & Regulatory Testing"
];

export const mockTrustMetrics = [
  { label: "Organizations", value: 500, suffix: "+" },
  { label: "Candidates", value: 85000, suffix: "+" },
  { label: "Questions Delivered", value: 250000, suffix: "+" },
  { label: "Uptime SLA", value: 99.9, suffix: "%" }
];

export const mockPricingPlans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "month",
    description: "Perfect for trying out Assessly",
    features: [
      "Up to 10 assessments",
      "50 candidates per month",
      "Basic question types",
      "Email support",
      "7-day data retention",
      "Community access"
    ],
    cta: "Get Started",
    popular: false
  },
  {
    id: "basic",
    name: "Basic",
    price: 29,
    period: "month",
    description: "For small teams and organizations",
    features: [
      "Unlimited assessments",
      "500 candidates per month",
      "All question types",
      "Priority email support",
      "30-day data retention",
      "Custom branding",
      "Basic analytics",
      "API access"
    ],
    cta: "Start Free Trial",
    popular: false
  },
  {
    id: "professional",
    name: "Professional",
    price: 79,
    period: "month",
    description: "For growing organizations",
    features: [
      "Unlimited assessments",
      "5,000 candidates per month",
      "AI-assisted question generation",
      "24/7 priority support",
      "90-day data retention",
      "Custom branding & domains",
      "Advanced analytics & reports",
      "Full API & webhooks",
      "LMS/HRIS integrations",
      "Dedicated account manager"
    ],
    cta: "Start Free Trial",
    popular: true
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    period: "month",
    description: "For large-scale operations",
    features: [
      "Unlimited everything",
      "Unlimited candidates",
      "White-label solutions",
      "Dedicated infrastructure",
      "Custom SLA & uptime",
      "Custom integrations",
      "SOC-2 compliance support",
      "On-premise deployment option",
      "Custom AI model training",
      "24/7 phone & email support",
      "Implementation assistance"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

export const mockUser = {
  id: "user-123",
  email: "demo@assesslyplatform.com",
  name: "Demo User",
  organization: "Demo Organization",
  role: "admin",
  isAuthenticated: false
};

export const mockContactSubmission = (data) => {
  console.log("Mock Contact Form Submission:", data);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, message: "Message received! We'll get back to you soon." });
    }, 1000);
  });
};

export const mockDemoRequest = (data) => {
  console.log("Mock Demo Request Submission:", data);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, message: "Demo request received! Our team will contact you within 24 hours." });
    }, 1000);
  });
};

export const mockLogin = (email, password) => {
  console.log("Mock Login:", { email, password });
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        token: "mock-jwt-token-12345",
        user: { ...mockUser, email, isAuthenticated: true }
      });
    }, 800);
  });
};

export const mockRegister = (data) => {
  console.log("Mock Register:", data);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        token: "mock-jwt-token-12345",
        user: { ...mockUser, ...data, isAuthenticated: true }
      });
    }, 800);
  });
};
