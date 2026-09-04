# DIVA Candles

A production-oriented full-stack catalogue and inquiry platform for DIVA Candles. The React/Vite storefront and admin application communicate only with the Node/Express API. The API uses MongoDB in local development and production. Product media is designed for Cloudinary; no database credential is ever sent to the browser.

## Architecture

- `frontend/` — React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query
- `backend/` — Express, TypeScript, MongoDB, JWT cookies
- Local data — MongoDB Community Edition or the optional MongoDB container
- Production — Vercel frontend, Azure App Service or Render backend, MongoDB Atlas, Cloudinary images

MongoDB is the only database engine used by the application.

## Local setup on Windows

Install Node.js 20+ and MongoDB, or use Docker Desktop for the included MongoDB service.

Docker Desktop can run MongoDB:

```powershell
docker compose up -d
```

Copy the examples and set local values:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm install
npm run seed -w backend
npm run dev
```

Set `MONGODB_URI` to the connection string for your local or hosted MongoDB instance. The backend defaults are development conveniences only; production requires an explicit authenticated connection string and strong secrets.

For storage monitoring, set `MONGODB_STORAGE_LIMIT_MB` to the MongoDB deployment quota (for example, the Atlas tier limit). `LOG_RETENTION_DAYS` defaults to 30. Morgan request logs are stored only in the explicitly allowlisted `application_logs` collection; admin cleanup removes only records older than the configured retention period. Audit logs and all business collections are protected.

Open:

- Storefront: `http://localhost:5174`
- API: `http://localhost:8080`
- API documentation: `http://localhost:8080/api-docs`
- API health: `http://localhost:8080/health`
- Database health: `http://localhost:8080/health/database`
- Admin: `http://localhost:5174/admin/login`

The seeded administrator uses `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD` and must change the temporary password after the first login. Never commit `backend/.env`.

## Common commands

```powershell
npm run dev
npm run build
npm run test
npm run seed -w backend
```

MongoDB indexes are created by the backend during startup. Back up and restore the MongoDB database using `mongodump` and `mongorestore`.

## Team and bulk-order management

- Public team page: `http://localhost:5174/about/team`
- Bulk catalogue and quotation form: `http://localhost:5174/bulk-orders`
- Admin team management: `http://localhost:5174/admin/team`
- Admin bulk-product and pricing management: `http://localhost:5174/admin/bulk-orders`
- Admin expense management and PDF reports: `http://localhost:5174/admin/expenses`

Team members, bulk settings, quantity pricing tiers and quotation inquiries are stored in MongoDB. Product and profile images remain in Cloudinary in production, with only their URLs and public IDs stored in MongoDB. Local development images are written under `backend/uploads/`.

Customer-facing pages show availability without exposing exact stock quantities. When a customer continues to WhatsApp from a product card, product page, or WhatsApp cart, the selected quantity is deducted atomically in MongoDB. A unique client token makes retries idempotent so the same action cannot deduct stock twice. Expense records are admin-only and support filtering, editing, deletion, totals by category, and downloadable PDF reports.

## Cloudinary and Gmail SMTP

For production images, configure the backend only:

```env
IMAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
BACKEND_PUBLIC_URL=https://your-api.example.com
```

For Gmail notifications, create a Google App Password and configure:

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info.divacandles@gmail.com
SMTP_PASSWORD=your_google_app_password
EMAIL_FROM_ADDRESS=info.divacandles@gmail.com
NOTIFICATION_EMAIL=info.divacandles@gmail.com
```

Never place Cloudinary secrets, SMTP credentials, MongoDB credentials or `MONGODB_URI` in `frontend/.env` or Vercel frontend variables.

## Production deployment

Deploy `frontend/` to Vercel with `VITE_API_BASE_URL=https://YOUR_API/api/v1`; `frontend/vercel.json` already contains the SPA rewrite. Deploy `backend/` to Render or another Node host, configure all backend secrets there, set `NODE_ENV=production`, `COOKIE_SECURE=true`, provide a private `MONGODB_URI` (MongoDB Atlas is recommended), and allow the Vercel origin in `CORS_ALLOWED_ORIGINS`.

Use MongoDB Atlas network access controls and database users for production. Back up and restore with `mongodump` and `mongorestore`.

## Database safeguards

The MongoDB connection pool is configurable through the connection string. Startup performs exponential connection retries, and `/health/database` performs a real MongoDB ping. Audit snapshots are stored as native BSON documents.

The admin dashboard reports MongoDB storage when the deployment exposes storage metrics; otherwise it reports collection-level usage. Safe cleanup is enforced by the backend and remains locked until usage reaches 80%; it removes only expired/revoked sessions, click analytics older than 365 days, and audit logs older than 730 days. Products, product photos, orders, payments and inquiries are never deleted by this operation.

## Business launch checklist

Replace generated product placeholders with licensed Cloudinary assets, configure SMTP, enter the approved Amazon URLs, review all legal-policy placeholders, add the final address/business hours, rotate the initial admin password, configure MongoDB Atlas access and backups, run the end-to-end workflow, and verify the restore procedure before launch.
