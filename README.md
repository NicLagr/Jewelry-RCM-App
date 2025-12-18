# Jewelry CRM - Repair Job Tracker

A functional prototype of a jewelry store CRM and repair job tracking system, optimized for iPad use.

## Status: Prototype

This is a working prototype with core features implemented. Some features are marked as "not yet implemented" and will be added before MVP release.

## Features

### Implemented
- Job Board: Kanban-style board with jobs grouped by status (Intake, In Progress, Ready, Picked Up)
- Quick Filters: Overdue jobs, Promised Today, My Jobs
- Global Search: Search by customer name, phone, job number, or item
- Ticket Creation: Multi-section form with customer selection, item details, services, and scheduling
- Job Detail: Full job view with tabs for Overview, Activity, Media, and Billing
- Customer Directory: Customer list with stats, filtering, and quick actions
- Settings: Store info, SMS configuration, service catalog, and user management
- Authentication: Login with role-based access (Owner/Admin, Manager, Jeweler, Staff)

### Coming Soon (MVP)
- User registration
- Photo upload
- SMS notifications (Twilio)
- Production deployment

## Tech Stack

- Framework: Next.js 15 (App Router) with React 19 and TypeScript
- Styling: Tailwind CSS v4
- Database: SQLite via Prisma (will migrate to Supabase PostgreSQL)
- Authentication: JWT-based (will migrate to Supabase Auth)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/NicLagr/Jewelry-RCM-App.git
cd Jewelry-RCM-App
```

2. Install dependencies:
```bash
npm install
```

3. Run database migrations:
```bash
npm run db:migrate
```

4. Seed the database with sample data:
```bash
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open http://localhost:3000 in your browser

### Demo Credentials

```
Email: admin@jewelry.com
Password: admin123
```

Other test users (all with password `admin123`):
- mike@jewelry.com (Manager)
- david@jewelry.com (Jeweler)
- lisa@jewelry.com (Jeweler)
- tom@jewelry.com (Staff)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset and reseed database
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   │   ├── auth/      # Authentication endpoints
│   │   ├── jobs/      # Job CRUD operations
│   │   ├── customers/ # Customer operations
│   │   ├── services/  # Service catalog
│   │   ├── settings/  # Store settings
│   │   ├── sms/       # SMS stub endpoint
│   │   └── users/     # User management
│   ├── jobs/          # Job pages (board, new, detail)
│   ├── customers/     # Customer directory
│   ├── settings/      # Settings pages
│   └── login/         # Login page
├── components/
│   ├── ui/            # Reusable UI components
│   └── nav.tsx        # Navigation component
└── lib/
    ├── auth.ts        # Authentication utilities
    ├── prisma.ts      # Prisma client
    └── utils.ts       # Helper functions
```

## Data Model

- User: Team members with roles
- Customer: Customer information with VIP flag
- Job: Repair tickets with status tracking
- ServiceCatalog: Available services with default prices
- JobServiceLine: Services assigned to jobs
- JobMedia: Photos attached to jobs
- JobActivity: Activity timeline for jobs
- StoreSettings: Store configuration and SMS settings

## Design

UI/UX designed in Figma with:
- Dark green primary accent (#1a4d3e)
- Light neutral background (#f8f9fa)
- iPad-first responsive design
- Clean, airy spacing

## License

MIT
