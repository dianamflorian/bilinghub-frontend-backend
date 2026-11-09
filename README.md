⚠️ **IMPORTANT NOTICE FOR REVIEWERS:** Educational full-stack showcase for subscription features using Stripe Sandbox / Test Mode with dummy credentials.

# Bilinghub

Bilinghub is a bilingual, reliable, and scalable billing and subscription application for modern companies.

## Descripción

An interactive frontend built with React + Vite and a robust Flask backend featuring JWT authentication, plan management, subscriptions, payment processing, and an admin panel.

## Why it is attractive to companies

- **Full-stack solution**: Ready-to-use frontend and backend.
- **SaaS approach**: Subscriptions, plans, and recurring billing.
- **Payments via Stripe**: Structured for real payment integration.
- **Security**: JWT authentication and backend sensitive data handling.
- **Scalable**: Easy to extend for new endpoints and payment gateways.
- **Professional design**: Modern interface with reusable components.

## Key features

- Login and JWT authentication
- Dynamic navigation with React and Vite
- Plan and subscription management
- Payment status and renewals
- Administrative interface to monitor subscribers
- Backend powered by Flask and SQLAlchemy
- Local proxy configuration and production-ready architecture

## Technology stack

- React, Vite, TypeScript, Tailwind CSS
- Flask, SQLAlchemy, SQLite (local dev database)
- JWT authentication & Stripe (subscriptions model)

## Installation and execution

### Backend

1. Create and activate a Python virtual environment.
2. Install dependencies: `python -m pip install -r requirements.txt`
3. Run the backend: `python wsgi.py`

### Frontend

1. Go to the `frontend` directory and install dependencies: `npm install`
2. Run the frontend: `npm run dev` (proxied to `http://localhost:5000`)

## Use cases

- SaaS billing MVPs, bilingual products, proof of concepts for recurring payments, and React-Flask integration demos.

## Value added

An ideal project to showcase complete business-oriented solutions with clear structure and practical documentation.

## Suggested next steps

- Connect Stripe live mode, migrate SQLite to PostgreSQL/MySQL, add roles/permissions, implement automated tests/CI/CD, and full multi-language localization.

## Keywords

bilinghub, billing, subscriptions, Stripe, SaaS, React, Vite, Flask, JWT, invoicing, backend, frontend, full-stack, recurring payment, subscription management, CRM, ERP, minimum viable product

## 🚀 Future Roadmap & TODO (Next 20+ Hours of Work)

- Upgrade Stripe webhook handlers, implement automated integration testing, refactor API requests with TypeScript interfaces, and optimize JWT middleware.
