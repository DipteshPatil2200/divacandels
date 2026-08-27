# DIVA Candles

A production-oriented full-stack catalogue and inquiry platform for DIVA Candles. The React/Vite storefront and admin application communicate only with the Node/Express API. The API uses Prisma with Microsoft SQL Server locally and Azure SQL Database in production. Product media is designed for Cloudinary; no database credential is ever sent to the browser.

## Architecture

- `frontend/` — React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query
- `backend/` — Express, TypeScript, Prisma, `@prisma/adapter-mssql`, JWT cookies
- Local data — SQL Server Express, SQL Server Developer, or the optional SQL Server Developer container
- Production — Vercel frontend, Azure App Service or Render backend, Azure SQL Database, Cloudinary images
- Administration — SQL Server Management Studio (SSMS)

PostgreSQL and Supabase are not used.

## Local setup on Windows

Install Node.js 20+, SQL Server Express/Developer and SSMS. In SQL Server Configuration Manager, enable TCP/IP, set or confirm port 1433, enable SQL authentication if using `sa`, and restart the SQL Server service. In SSMS, create an empty database called `DivaCandlesDB`.

Alternatively, Docker Desktop can run SQL Server Developer:

```powershell
$env:MSSQL_SA_PASSWORD = "Choose-A-Strong-Password!"
docker compose up -d
```

Copy the examples and set local values:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm install
npm run prisma:generate
npm run prisma:deploy -w backend
npm run prisma:seed
npm run dev
```

If a database password contains `:`, `\`, `=`, `;`, `/`, `[`, `]`, `{` or `}`, wrap the value in braces in `DATABASE_URL`. Keep `DB_PASSWORD` as the literal password for the Microsoft adapter. The backend defaults are development conveniences only; production refuses incomplete secrets or trusted server certificates.

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
npm run prisma:generate
npm run prisma:migrate -- --name describe_the_change
npm run prisma:seed
```

Prisma migration files must be committed. Deploy production migrations using `npm run prisma:deploy -w backend`; never use `migrate dev` against Azure SQL.

## Team and bulk-order management

- Public team page: `http://localhost:5174/about/team`
- Bulk catalogue and quotation form: `http://localhost:5174/bulk-orders`
- Admin team management: `http://localhost:5174/admin/team`
- Admin bulk-product and pricing management: `http://localhost:5174/admin/bulk-orders`
- Admin expense management and PDF reports: `http://localhost:5174/admin/expenses`

Team members, bulk settings, quantity pricing tiers and quotation inquiries are stored in SQL Server. Product and profile images remain in Cloudinary in production, with only their URLs and public IDs stored in SQL Server. Local development images are written under `backend/uploads/`.

Customer-facing pages show availability without exposing exact stock quantities. When a customer continues to WhatsApp from a product card, product page, or WhatsApp cart, the selected quantity is deducted atomically in SQL Server. A unique client token makes retries idempotent so the same action cannot deduct stock twice. Expense records are admin-only and support filtering, editing, deletion, totals by category, and downloadable PDF reports.

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

Never place Cloudinary secrets, SMTP credentials, SQL credentials or `DATABASE_URL` in `frontend/.env` or Vercel frontend variables.

## Production deployment

Deploy `frontend/` to Vercel with `VITE_API_BASE_URL=https://YOUR_API/api/v1`; `frontend/vercel.json` already contains the SPA rewrite. Deploy `backend/` to Azure App Service or Render, configure all backend secrets there, set `NODE_ENV=production`, `COOKIE_SECURE=true`, `DB_ENCRYPT=true`, `DB_TRUST_SERVER_CERTIFICATE=false`, allow the Vercel origin in `CORS_ALLOWED_ORIGINS`, and run `npm run prisma:deploy -w backend`. The deployed backend—not Vercel and never a developer PC—connects to Azure SQL.

Detailed firewall, encryption and SSMS guidance is in [docs/AZURE_SQL.md](docs/AZURE_SQL.md). Backup and restore procedures are in [docs/SQLSERVER_BACKUP_RESTORE.md](docs/SQLSERVER_BACKUP_RESTORE.md).

## Database safeguards

The Microsoft driver pool is configurable with `DB_POOL_MAX`, `DB_POOL_MIN`, and `DB_POOL_IDLE_TIMEOUT_MS`. Startup performs exponential connection retries, and `/health/database` performs a real SQL query. `previousData` and `newData` in `AuditLog` are `NVARCHAR(MAX)` strings containing serialized JSON because Prisma JSON fields are unsupported by SQL Server.

The admin dashboard reports actual SQL data-file usage. SQL Server Express automatically uses its 10 GB database limit and Azure SQL reads the configured database maximum. For SQL Server Developer Edition, set `DB_STORAGE_LIMIT_MB` to the capacity you want the dashboard to monitor. Safe cleanup is enforced by the backend and remains locked until usage reaches 80%; it removes only expired/revoked sessions, click analytics older than 365 days, and audit logs older than 730 days. Products, product photos, orders, payments and inquiries are never deleted by this operation.

## Business launch checklist

Replace generated product placeholders with licensed Cloudinary assets, configure SMTP, enter the approved Amazon URLs, review all legal-policy placeholders, add the final address/business hours, rotate the initial admin password, configure Azure SQL firewall and retention, run the end-to-end workflow, and verify the restore procedure before launch.
