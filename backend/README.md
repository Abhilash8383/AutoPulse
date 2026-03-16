# Moter Backend

Express.js backend server for the Moter application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

3. Set up Prisma:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:8000` by default.

## Environment Variables

- `DATABASE_URL` - PostgreSQL database connection string
- `JWT_SECRET` - Secret key for JWT token generation
- `WHATSAPP_API_URL` - WhatsApp API base URL
- `WHATSAPP_API_TOKEN` - WhatsApp API authentication token
- `WHATSAPP_API_ACCESS_KEY` - WhatsApp API access key
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token (optional)
- `PORT` - Server port (default: 8000)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Frontend URL for CORS (default: http://localhost:3000)
- `CRON_SECRET` - Secret key for cron job authentication

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout
- `POST /api/auth/profile-picture` - Upload profile picture

### Data Management
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `DELETE /api/categories` - Delete category
- `POST /api/models` - Create model
- `DELETE /api/models` - Delete model
- `POST /api/variants` - Create variant
- `DELETE /api/variants` - Delete variant
- `GET /api/dealership` - Get dealership info
- `PUT /api/dealership` - Update dealership
- `GET /api/lead-sources` - Get lead sources
- `POST /api/lead-sources` - Create lead source
- `PUT /api/lead-sources` - Update lead source
- `DELETE /api/lead-sources` - Delete lead source
- `GET /api/templates` - Get WhatsApp templates
- `PUT /api/templates` - Update template

### Visitors & Sessions
- `POST /api/visitors` - Create visitor
- `GET /api/visitors` - Get visitors (with pagination)
- `POST /api/visitors/session` - Create session for existing visitor
- `GET /api/sessions` - Get sessions
- `POST /api/sessions/exit` - Exit session
- `POST /api/test-drives` - Create test drive
- `GET /api/test-drives` - Get test drives

### Business Logic
- `POST /api/digital-enquiry` - Create digital enquiry
- `GET /api/digital-enquiry` - Get digital enquiries
- `PATCH /api/digital-enquiry/:id` - Update enquiry leadScope
- `POST /api/digital-enquiry/bulk` - Bulk upload enquiries
- `POST /api/field-inquiry` - Create field enquiry
- `GET /api/field-inquiry` - Get field enquiries
- `POST /api/field-inquiry/bulk` - Bulk upload enquiries
- `POST /api/delivery-tickets` - Create delivery ticket
- `GET /api/delivery-tickets` - Get delivery tickets
- `POST /api/delivery-tickets/:id/send-now` - Send delivery message now
- `POST /api/delivery-tickets/:id/send-completion` - Send completion message

### System
- `GET /api/statistics` - Get statistics
- `GET /api/phone-lookup` - Lookup phone number
- `POST /api/phone-lookup` - Batch phone lookup
- `GET /api/cron/send-scheduled-messages` - Cron job for scheduled messages
- `GET /api/health` - Health check
- `GET /api/debug/db-test` - Database connection test
- `GET /api/debug/env-test` - Environment variables test

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:dbpush` - Push schema to DB (no migration history)
- `npm run prisma:migrate` - Create/apply migrations (use this for new schema changes)
- `npm run prisma:migrate:deploy` - Apply migrations in production
- `npm run prisma:studio` - Open Prisma Studio
- `npm run backfill:contacts` - Link existing Visitor/Enquiry rows to Contact (idempotent)
- `npm run coverage:contacts` - Report Contact linkage coverage (linked vs total)

## CRM Contacts – What to do next

1. **Run backfill (if not yet done)**  
   `pnpm run backfill:contacts` (or `npm run backfill:contacts`). Safe to run multiple times.

2. **Monitor coverage**  
   `pnpm run coverage:contacts` to see how many Visitor / DigitalEnquiry / FieldInquiry rows have `contactId` set. Aim for ≥ 98% before Phase 6.

3. **Just monitor (for now) — do not rush Phase 6**  
   Wait at least 1–2 weeks of production usage. Confirm: no missing contacts, no bugs, dual-write stable. Then consider Phase 6 (deprecating duplicated person fields on Visitor/DigitalEnquiry/FieldInquiry in favor of `contactId`; see comment above `Contact` in `prisma/schema.prisma`).

4. **Use migrations from now**  
   For new schema changes, use `pnpm run prisma:migrate` (creates/applies migrations) instead of `prisma db push`. Use `prisma:migrate:deploy` in production.

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set environment variables in your hosting platform

3. Run migrations:
```bash
npm run prisma:migrate
```

4. Start the server:
```bash
npm run start
```

## Architecture

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **JWT** - Authentication
- **CORS** - Cross-origin resource sharing
- **Cookie Parser** - Cookie handling

## Notes

- The backend runs on port 8000 by default
- CORS is configured to allow requests from the frontend URL
- Authentication uses JWT tokens stored in HTTP-only cookies
- Profile pictures can be stored in Vercel Blob or local filesystem
- Cron jobs can be triggered manually with the CRON_SECRET header

