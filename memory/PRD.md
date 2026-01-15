# Assessly Platform - Product Requirements Document (PRD)

## 📋 Original Problem Statement

Design and develop a world-class, modern, enterprise-grade B2B SaaS website for **Assessly Platform** (https://assesslyplatform.com) — a multi-tenant assessment, analytics, and insights platform built for organizations that require scalable, secure, and intelligent evaluation systems.

**Positioning**: Premium, production-ready SaaS platform trusted by enterprises, institutions, and global organizations. This is a $50M+ valuation, enterprise SaaS product designed with confidence, authority, and trust.

---

## 🎯 Core Value Proposition

"Measure Smarter, Not Harder — From Questions to Insights, Anywhere."

---

## 👥 User Personas

### Primary Users
1. **Super Admin** - Platform-level control and management
2. **Organization Admin** - Organization-level management and configuration
3. **Assessor** - Creates and manages assessments
4. **Candidate** - Takes assessments and views results

### Target Organizations
- Enterprises & Corporations
- Educational Institutions & EdTech
- Recruitment & Talent Assessment Firms
- Government Agencies, NGOs & Research Bodies
- SaaS companies offering assessments as a service

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Create React App with CRACO
- **Routing**: React Router v7
- **UI Library**: Shadcn UI (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS with custom gradient theme
- **Icons**: Lucide React (NO emoji icons)
- **Notifications**: Sonner (Toast notifications)
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Authentication**: JWT (python-jose)
- **Password Hashing**: Passlib with bcrypt
- **Payment Processing**: Stripe SDK
- **Email Service**: Resend API
- **Security**: CORS middleware, HTTPBearer auth

### Infrastructure
- **Hosting**: Render (production)
- **Database**: MongoDB (local development)
- **Process Manager**: Supervisor
- **Environment**: Docker container

---

## ✅ What's Been Implemented (January 15, 2025)

### Phase 1: Frontend Development (Complete)

#### ✓ Core Pages
- **Home Page** - Full enterprise landing page with all sections
  - Hero section with video background support (fallback to image)
  - Platform features showcase (6 feature cards)
  - Assessment lifecycle visualization (6 steps)
  - Assessment types grid (10 types)
  - Dashboard preview with analytics
  - Pricing section (4 plans: Free, Basic, Professional, Enterprise)
  - Security & compliance section
  - Contact form & Demo request forms
  
- **Authentication Pages**
  - Registration page with organization setup
  - Login page with form validation
  - Password validation (min 8 characters)
  
- **Dashboard Page**
  - User welcome section
  - Statistics cards (4 metrics with trend indicators)
  - Recent assessments list
  - Quick actions panel
  - Performance insights with progress bars

#### ✓ Components
- **Navigation** - Sticky nav with logo, responsive menu, auth state handling
- **Footer** - Dark theme with security links, contact emails, compliance badges
- **Shadcn UI Components** - All pre-installed and configured

#### ✓ Design System
- **Color Palette**: Derived from logo (Blue #4A90E2 → Teal #45B7B8 → Green #7BC67E)
- **Typography**: Clean, readable fonts (no system-ui)
- **Animations**: Smooth transitions, hover effects, micro-interactions
- **Responsive**: Mobile-first design, works on all screen sizes
- **Glassmorphism**: Hero section overlay with backdrop blur
- **No Emoji Icons**: Lucide React icons only (as per requirements)

### Phase 2: Backend Development (Complete)

#### ✓ Authentication System
- User registration with organization creation
- JWT-based authentication
- Password hashing with bcrypt
- Token-based authorization
- Protected routes with dependency injection

#### ✓ Database Models
- **User**: email, name, organization, role, plan, stripe_customer_id
- **Organization**: name, owner_id, domain, settings
- **ContactForm**: name, email, company, message, status
- **DemoRequest**: name, email, company, size, notes, status
- **Subscription**: user_id, plan_id, stripe_subscription_id, status

#### ✓ API Endpoints

**Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

**Contact & Demo**
- `POST /api/contact` - Submit contact form
- `GET /api/contact` - Get all contact forms (admin only)
- `POST /api/demo` - Submit demo request
- `GET /api/demo` - Get all demo requests (admin only)

**Subscriptions**
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions/current` - Get current subscription
- `DELETE /api/subscriptions/{id}` - Cancel subscription

**Payments**
- `POST /api/payments/intent` - Create payment intent

**Organizations**
- `GET /api/organizations/current` - Get current organization

#### ✓ Integrations

**Stripe Integration**
- Customer creation
- Subscription management
- Payment intent creation
- Plan management (Free, Basic, Professional, Enterprise)
- *Status*: Ready (requires API keys in env vars)

**Resend Email Integration**
- Contact form notifications
- Demo request notifications
- Welcome emails for new users
- *Status*: Ready (requires API key in env var)

### Phase 3: Frontend-Backend Integration (Complete)

#### ✓ API Service Layer
- Centralized API client with axios
- Auth token injection via interceptors
- Error handling
- Modular service exports (authAPI, contactAPI, demoAPI, subscriptionAPI)

#### ✓ Connected Features
- Registration flow with real API
- Login flow with real API
- Contact form submission with email notifications
- Demo request submission with email notifications
- Protected dashboard route
- Token-based authentication

---

## 📦 Environment Configuration

### Backend Environment Variables (`.env`)
```bash
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="assessly"

# JWT
JWT_SECRET_KEY="assessly-super-secret-key-change-in-production"

# Stripe (Set in Render)
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_BASIC_PRICE_ID=""
STRIPE_PRO_PRICE_ID=""

# Resend (Set in Render)
RESEND_API_KEY=""
```

### Frontend Environment Variables (`.env`)
```bash
REACT_APP_BACKEND_URL=https://smartassess-6.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false

# Stripe (Set in Render)
REACT_APP_STRIPE_PUBLISHABLE_KEY=""
```

---

## 📊 API Contracts

### Authentication Flow
```
1. User registers → POST /api/auth/register
   - Creates user in MongoDB
   - Creates organization
   - Creates Stripe customer
   - Sends welcome email
   - Returns JWT token + user object

2. User logs in → POST /api/auth/login
   - Verifies credentials
   - Returns JWT token + user object

3. Protected routes → GET /api/auth/me
   - Requires Bearer token in Authorization header
   - Returns current user data
```

### Contact & Demo Flow
```
1. Contact form → POST /api/contact
   - Saves to MongoDB
   - Sends email notification to info@assesslyplatform.com
   - Returns success confirmation

2. Demo request → POST /api/demo
   - Saves to MongoDB
   - Sends email notification to info + support emails
   - Returns success confirmation
```

### Subscription Flow
```
1. Create subscription → POST /api/subscriptions
   - Creates/retrieves Stripe customer
   - Attaches payment method
   - Creates Stripe subscription
   - Updates user's plan in MongoDB
   - Returns subscription object

2. Get current subscription → GET /api/subscriptions/current
   - Returns active subscription for user

3. Cancel subscription → DELETE /api/subscriptions/{id}
   - Cancels in Stripe
   - Updates status in MongoDB
   - Reverts user to free plan
```

---

## 🎨 Design Guidelines Applied

✅ **Color Restrictions Followed**
- NO dark purple/blue gradients
- NO purple/pink gradients
- Used brand colors: Blue → Teal → Green

✅ **Icon Usage**
- NO emoji icons (🚀, 💡, etc.)
- Used Lucide React icons only
- Contextually appropriate icons

✅ **Layout Principles**
- Enterprise-first design
- Material-UI inspired components
- Proper spacing and hierarchy
- Responsive grid layouts

✅ **Animations**
- Smooth transitions on hover
- Micro-interactions on buttons
- Animated counters for metrics
- Scroll animations

---

## 🚀 Prioritized Backlog

### P0 (Critical - To Complete Before Launch)
1. ✅ ~~Set up Stripe API keys in Render environment~~
2. ✅ ~~Set up Resend API key in Render environment~~
3. ⏳ Test end-to-end user registration flow
4. ⏳ Test contact form with actual email delivery
5. ⏳ Test demo request with actual email delivery
6. ⏳ Upload actual media files:
   - `/app/frontend/public/images/logo.png` (use provided logo)
   - `/app/frontend/public/images/hero-fallback.webp`
   - `/app/frontend/public/videos/hero-bg.mp4`
   - `/app/frontend/public/videos/platform-demo.mp4`

### P1 (High Priority - Next Phase)
1. **Assessment Builder** - Core platform feature
   - Drag-and-drop interface
   - 15+ question types
   - AI-assisted question generation
   - Templates and versioning
   
2. **Analytics Dashboard** - Real data integration
   - Live assessment tracking
   - Candidate performance metrics
   - Predictive analytics
   - Export functionality (PDF, Excel, CSV)

3. **Multi-Tenant Features**
   - Organization isolation
   - Custom branding per organization
   - Custom domain support
   - Super Admin panel

4. **Candidate Portal**
   - Assessment taking interface
   - Results viewing
   - Progress tracking

5. **Stripe Checkout Integration**
   - Full payment flow
   - Plan upgrade/downgrade
   - Billing history
   - Invoice management

### P2 (Medium Priority - Future Enhancements)
1. **API & Integrations**
   - RESTful API documentation
   - Webhooks for events
   - Zapier integration
   - LMS/HRIS connectors

2. **Advanced Security**
   - SOC-2 compliance implementation
   - GDPR data management tools
   - Two-factor authentication
   - Audit logs

3. **Reporting & Exports**
   - Customizable report templates
   - Scheduled report delivery
   - Advanced data visualization
   - Real-time collaboration

4. **Mobile Optimization**
   - Native mobile app (React Native)
   - Progressive Web App (PWA)
   - Offline assessment support

---

## 📝 Next Action Items

### Immediate Tasks (Testing Phase)
1. **Set Environment Variables in Render**
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   RESEND_API_KEY=re_...
   STRIPE_BASIC_PRICE_ID=price_...
   STRIPE_PRO_PRICE_ID=price_...
   ```

2. **Upload Media Files**
   - Replace placeholder files with actual media
   - Optimize images for web (WebP format)
   - Compress videos for fast loading

3. **End-to-End Testing**
   - Test user registration → Welcome email
   - Test contact form → Notification email
   - Test demo request → Notification email
   - Test login → Dashboard access
   - Test authentication persistence

4. **Stripe Setup**
   - Create Stripe account
   - Set up products and pricing
   - Test subscription creation
   - Configure webhooks for payment events

### Phase 2 Tasks (Core Features)
1. Start building Assessment Builder
2. Implement real-time analytics
3. Add organization management features
4. Build candidate portal

---

## 🔒 Security Considerations

### Implemented
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ CORS configuration
- ✅ Input validation with Pydantic
- ✅ HTTPBearer token authentication
- ✅ Protected API routes

### To Implement
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] SQL injection prevention (N/A - using MongoDB)
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Two-factor authentication
- [ ] API key rotation
- [ ] Comprehensive audit logs

---

## 📈 Success Metrics

### Technical Metrics
- API response time < 200ms
- Frontend load time < 2s
- 99.9% uptime SLA
- Zero critical security vulnerabilities

### Business Metrics
- User registration conversion rate
- Demo request conversion rate
- Free to paid conversion rate
- Monthly recurring revenue (MRR)
- Customer lifetime value (CLV)

---

## 🎯 Definition of Done

### For Each Feature
- [ ] Code written and tested
- [ ] API endpoints documented
- [ ] Frontend UI implemented
- [ ] Backend logic implemented
- [ ] Database schema updated
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Success/error messages shown
- [ ] Responsive design verified
- [ ] Browser compatibility tested
- [ ] Security review completed

---

## 📚 Resources & Documentation

### External Documentation
- Stripe API: https://stripe.com/docs/api
- Resend API: https://resend.com/docs
- FastAPI: https://fastapi.tiangolo.com
- React Router: https://reactrouter.com
- Shadcn UI: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com

### Internal Documentation
- API Documentation: (To be created)
- Component Library: `/app/frontend/src/components/ui/`
- Database Schema: `/app/backend/models.py`
- Environment Setup: This PRD

---

**Last Updated**: January 15, 2025
**Version**: 1.0.0
**Status**: MVP Complete - Ready for Testing & Integration
