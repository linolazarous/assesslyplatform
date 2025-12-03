# Assessly Platform

![Assessly Platform](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-22.21.1-green.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Multi-Tenant](https://img.shields.io/badge/Architecture-Multi--Tenant-orange.svg)
![B2B SaaS](https://img.shields.io/badge/Business-B2B%20SaaS-purple.svg)

> **Measure Smarter, Not Harder** – From Questions to Insights, Anywhere.

A modern, enterprise-ready **multi-tenant B2B SaaS assessment platform** that enables organizations to create, deliver, and analyze assessments with powerful analytics and seamless user experiences. Built with a **Super Administrator** who controls **Organization Administrators** for complete platform governance.

## 🚀 Live Deployment

| Environment | URL | Status |
|-------------|-----|--------|
| **🌐 Frontend Application** | [https://assessly-gedp.onrender.com](https://assessly-gedp.onrender.com) | ✅ Live |
| **⚙️ Backend API** | [https://assesslyplatform-t49h.onrender.com](https://assesslyplatform-t49h.onrender.com) | ✅ Live |
| **📚 API Documentation** | [https://assesslyplatform-t49h.onrender.com/api/docs](https://assesslyplatform-t49h.onrender.com/api/docs) | ✅ Live |
| **❤️ Health Check** | [https://assesslyplatform-t49h.onrender.com/api/v1/health](https://assesslyplatform-t49h.onrender.com/api/v1/health) | ✅ Live |
| **📊 Server Monitor** | [https://assesslyplatform-t49h.onrender.com/api/monitor](https://assesslyplatform-t49h.onrender.com/api/monitor) | ✅ Live |

## 🏢 Multi-Tenant Architecture

### 🎯 **Role Hierarchy**


### 🔐 **Access Control Matrix**
| Role | Platform Access | Organization Access | User Management | Assessment Management | Billing |
|------|-----------------|---------------------|-----------------|-----------------------|---------|
| **Super Admin** | ✅ Full Control | ✅ All Organizations | ✅ All Users | ✅ All Assessments | ✅ Full Access |
| **Organization Admin** | ❌ No Access | ✅ Own Organization Only | ✅ Own Users Only | ✅ Own Assessments Only | ❌ View Only |
| **Assessor** | ❌ No Access | ✅ Own Organization | ❌ No Access | ✅ Assigned Only | ❌ No Access |
| **Candidate** | ❌ No Access | ✅ Own Organization | ❌ No Access | ✅ Assigned Only | ❌ No Access |

## ✨ Key Features

### 🎯 **Core Platform Capabilities**
- **Multi-Tenant B2B SaaS** - Complete organization isolation with shared infrastructure
- **Hierarchical Role System** - Super Admin → Organization Admin → Assessor → Candidate
- **Drag & Drop Assessment Builder** - Intuitive interface with 10+ question types
- **Real-time Analytics Dashboard** - Actionable insights with comprehensive reporting
- **Offline Capability** - Work without internet with automatic synchronization
- **Enterprise Security** - JWT authentication, rate limiting, and data protection

### 📊 **Assessment Types**
- **Exams & Certification Tests**
- **Employee Performance Evaluations**
- **360° Feedback Collections**
- **Surveys & Questionnaires**
- **Skills Assessment & Quizzes**
- **Compliance & Training Assessments**

### 🛡️ **Enterprise Features**
- **Scalable Architecture** - Built for high-performance and reliability
- **Comprehensive API** - RESTful API with full OpenAPI documentation
- **Security First** - Helmet, CORS, rate limiting, and input sanitization
- **Monitoring Ready** - Built-in health checks and status monitoring
- **Subscription Management** - Free, Professional, and Enterprise plans

## 🏗️ Architecture Overview

```mermaid
graph TB
    A[Frontend Client] --> B[Load Balancer]
    B --> C[API Gateway]
    C --> D[Authentication Service]
    C --> E[Assessment Service]
    C --> F[Analytics Service]
    C --> G[Organization Service]
    
    D --> H[(MongoDB - Auth)]
    E --> I[(MongoDB - Assessments)]
    F --> J[(MongoDB - Analytics)]
    G --> K[(MongoDB - Organizations)]
    
    L[Super Admin Console] --> C
    M[Organization Admin Portal] --> C
    N[Candidate Interface] --> C
    
    subgraph "Tenant Isolation"
        O[Tenant 1 Data] --> H
        P[Tenant 2 Data] --> H
        Q[Tenant N Data] --> H
    end
    
    style L fill:#f9f,stroke:#333,stroke-width:2px
    style M fill:#bbf,stroke:#333,stroke-width:2px
    style N fill:#bfb,stroke:#333,stroke-width:2px
