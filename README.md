# Assessly Platform

![Assessly Platform](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-22.21.1-green.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

> **Measure Smarter, Not Harder** – From Questions to Insights, Anywhere.

A modern, enterprise-ready assessment platform that enables organizations to create, deliver, and analyze assessments with powerful analytics and seamless user experiences.

## 🚀 Live Demo

- **Frontend**: [https://assessly-gedp.onrender.com](https://assessly-gedp.onrender.com)
- **Backend API**: [https://assesslyplatform-t49h.onrender.com](https://assesslyplatform-t49h.onrender.com)
- **API Documentation**: [https://assesslyplatform-t49h.onrender.com/api/docs](https://assesslyplatform-t49h.onrender.com/api/docs)
- **Health Check**: [https://assesslyplatform-t49h.onrender.com/api/v1/health](https://assesslyplatform-t49h.onrender.com/api/v1/health)

## ✨ Key Features

### 🎯 Core Capabilities
- **Multi-role Access System** - Admin, Assessor, and Candidate roles with granular permissions
- **Drag & Drop Assessment Builder** - Intuitive interface with 10+ question types
- **Real-time Analytics Dashboard** - Actionable insights with comprehensive reporting
- **Offline Capability** - Work without internet with automatic synchronization
- **Enterprise Security** - JWT authentication, rate limiting, and data protection

### 📊 Assessment Types
- **Exams & Certification Tests**
- **Employee Performance Evaluations**
- **360° Feedback Collections**
- **Surveys & Questionnaires**
- **Skills Assessment & Quizzes**

### 🛡️ Enterprise Features
- **Scalable Architecture** - Built for high-performance and reliability
- **Comprehensive API** - RESTful API with full documentation
- **Security First** - Helmet, CORS, rate limiting, and input sanitization
- **Monitoring Ready** - Built-in health checks and status monitoring

## 🏗️ Architecture Overview

```mermaid
graph TB
    A[Frontend Client] --> B[Load Balancer]
    B --> C[API Server]
    C --> D[MongoDB Database]
    C --> E[File Storage]
    F[Admin Dashboard] --> C
    G[Mobile App] --> C
    H[3rd Party Integrations] --> C
    
    subgraph "Backend Services"
        C --> I[Authentication]
        C --> J[Assessment Engine]
        C --> K[Analytics Engine]
        C --> L[Reporting System]
    end
