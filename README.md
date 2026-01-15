# Assessly Platform 🚀

<div align="center">

![Assessly Logo](https://customer-assets.emergentagent.com/job_511a146b-da91-4265-9e1f-65fd48a29bda/artifacts/kz1mhqzy_logo.png)

**Measure Smarter, Not Harder — From Questions to Insights, Anywhere.**

Enterprise-grade B2B SaaS assessment platform with multi-tenant architecture, real-time analytics, and AI-powered insights.

[Live Demo](#) | [Documentation](#) | [API Docs](#)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

---

## 🎯 Overview

Assessly is a premium, production-ready SaaS platform designed for organizations that require scalable, secure, and intelligent evaluation systems. Trusted by 500+ organizations worldwide, serving 85,000+ candidates with 250,000+ assessments delivered.

### Target Users
- **Enterprises & Corporations** - Employee evaluations, skills assessments
- **Educational Institutions** - Exams, course assessments, certifications
- **Recruitment Firms** - Pre-employment screening, aptitude tests
- **Government & NGOs** - Compliance testing, regulatory assessments

---

## ✨ Features

### 🏢 Multi-Tenant Architecture
- Organization-level data isolation
- Shared infrastructure for cost efficiency
- Centralized Super Admin control
- Custom branding per organization

### 👥 Role-Based Access Control
- Super Admin, Organization Admin, Assessor, Candidate roles
- Granular permissions
- Strict access boundaries

### 🎨 Assessment Builder
- Intuitive drag-and-drop interface (coming soon)
- 15+ question types
- AI-assisted question generation
- Templates and versioning

### 📊 Real-Time Analytics
- Live dashboards
- Predictive analytics
- AI-powered reports
- Export to PDF, Excel, CSV

### 🔐 Enterprise Security
- End-to-end encryption
- SOC-2 ready architecture
- GDPR & HIPAA alignment
- Full audit logs

### 🔌 API & Integrations
- RESTful API
- Stripe payment processing
- Resend email service
- Ready for LMS/HRIS connectors

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern React with latest features
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - High-quality UI components (Radix UI + Tailwind)
- **Lucide React** - Beautiful icon library
- **Axios** - HTTP client
- **React Router v7** - Client-side routing
- **Sonner** - Toast notifications

### Backend
- **FastAPI** - High-performance Python web framework
- **MongoDB** - NoSQL database with Motor (async driver)
- **JWT** - JSON Web Tokens for authentication
- **Stripe** - Payment processing
- **Resend** - Transactional email service
- **Passlib** - Password hashing with bcrypt

### Infrastructure
- **Supervisor** - Process management
- **Docker** - Containerization
- **Render** - Hosting platform

---

## 📦 Prerequisites

- **Node.js** 18+ and Yarn
- **Python** 3.11+
- **MongoDB** 4.4+
- **Stripe Account** (for payments)
- **Resend Account** (for emails)

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd assessly-platform
```

### 2. Install Frontend Dependencies
```bash
cd frontend
yarn install
```

### 3. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

---

## ⚙️ Environment Configuration

### Backend Environment (`.env` in `/app/backend/`)

```bash
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="assessly"
CORS_ORIGINS="*"

# JWT
JWT_SECRET_KEY="your-secret-key-change-in-production"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_BASIC_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."

# Resend Email Configuration
RESEND_API_KEY="re_..."
```

### Frontend Environment (`.env` in `/app/frontend/`)

```bash
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false

# Stripe Configuration
REACT_APP_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

---

## 🏃 Running the Application

### Development Mode

#### Start Backend
```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

#### Start Frontend
```bash
cd frontend
yarn start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs

### Using Supervisor (Production-like)

```bash
# Start all services
sudo supervisorctl start all

# Check status
sudo supervisorctl status

# View logs
tail -f /var/log/supervisor/backend.out.log
tail -f /var/log/supervisor/frontend.out.log

# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

---

## 🌐 Deployment

### Deployment on Render

#### 1. Create a New Web Service
- Connect your Git repository
- Choose **Docker** as the environment
- Set the root directory to `/`

#### 2. Set Environment Variables
Add all the required environment variables from both backend and frontend `.env` files:

```
MONGO_URL
DB_NAME
JWT_SECRET_KEY
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_BASIC_PRICE_ID
STRIPE_PRO_PRICE_ID
RESEND_API_KEY
REACT_APP_BACKEND_URL
REACT_APP_STRIPE_PUBLISHABLE_KEY
```

#### 3. Configure Build Command
```bash
# Frontend
cd frontend && yarn install && yarn build

# Backend
cd backend && pip install -r requirements.txt
```

#### 4. Configure Start Command
```bash
supervisord -c /etc/supervisor/supervisord.conf
```

### Important: Upload Media Files

Before deploying, upload the actual media files to replace placeholders:

```
/app/frontend/public/images/logo.png
/app/frontend/public/images/hero-fallback.webp
/app/frontend/public/videos/hero-bg.mp4
/app/frontend/public/videos/platform-demo.mp4
```

---

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@company.com",
  "organization": "ACME Corp",
  "password": "securepassword",
  "role": "admin"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@company.com",
  "password": "securepassword"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

### Contact & Demo Endpoints

#### Submit Contact Form
```http
POST /api/contact
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "company": "Example Inc",
  "message": "I'm interested in your platform"
}
```

#### Submit Demo Request
```http
POST /api/demo
Content-Type: application/json

{
  "name": "Bob Johnson",
  "email": "bob@enterprise.com",
  "company": "Enterprise Co",
  "size": "100-500 employees",
  "notes": "Need custom integrations"
}
```

### Subscription Endpoints

#### Create Subscription
```http
POST /api/subscriptions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "plan_id": "professional",
  "payment_method_id": "pm_..."
}
```

#### Get Current Subscription
```http
GET /api/subscriptions/current
Authorization: Bearer <jwt_token>
```

#### Cancel Subscription
```http
DELETE /api/subscriptions/{subscription_id}
Authorization: Bearer <jwt_token>
```

For full API documentation, visit `/docs` endpoint when the backend is running.

---

## 📁 Project Structure

```
assessly-platform/
├── frontend/
│   ├── public/
│   │   ├── images/          # Logo and hero images
│   │   └── videos/          # Hero background video
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   └── ui/         # Shadcn UI components
│   │   ├── pages/          # Page components (Home, Login, Register, Dashboard)
│   │   ├── services/       # API service layer
│   │   ├── utils/          # Utility functions and mock data
│   │   ├── App.js          # Main app component
│   │   └── index.js        # Entry point
│   ├── package.json
│   └── tailwind.config.js
│
├── backend/
│   ├── server.py           # FastAPI application
│   ├── models.py           # Pydantic models
│   ├── auth_utils.py       # Authentication utilities
│   ├── email_service.py    # Resend email integration
│   ├── stripe_service.py   # Stripe payment integration
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
│
└── memory/
    └── PRD.md             # Product Requirements Document
```

---

## 🔒 Security

### Implemented Security Measures
- ✅ JWT-based authentication with Bearer tokens
- ✅ Password hashing with bcrypt
- ✅ CORS configuration
- ✅ Input validation with Pydantic
- ✅ Protected API routes
- ✅ Environment variable protection

### Recommended Additional Measures
- [ ] Rate limiting (e.g., with slowapi)
- [ ] API key rotation
- [ ] Two-factor authentication
- [ ] Comprehensive audit logs
- [ ] DDoS protection
- [ ] Regular security audits

---

## 🧪 Testing

### Frontend Testing (Coming Soon)
```bash
cd frontend
yarn test
```

### Backend Testing (Coming Soon)
```bash
cd backend
pytest
```

### End-to-End Testing
Use the testing agent or manual testing:
1. Register a new account
2. Check for welcome email
3. Login with credentials
4. Submit contact form (check for notification email)
5. Submit demo request (check for notification email)
6. Access dashboard
7. Test subscription flow (with Stripe test mode)

---

## 📧 Support & Contact

- **General Inquiries**: info@assesslyplatform.com
- **Support**: support@assesslyplatform.com
- **GDPR**: gdpr@assesslyplatform.com
- **SOC-2**: soc-2@assesslyplatform.com

---

## 📄 License

Copyright © 2025 Assessly Platform. All rights reserved.

---

## 🎉 Acknowledgments

- Built with [React](https://react.dev)
- UI components from [Shadcn UI](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
- Powered by [FastAPI](https://fastapi.tiangolo.com)

---

<div align="center">

**Made with ❤️ by the Assessly Team**

[Website](https://assesslyplatform.com) • [Documentation](#) • [API](#)

</div>
