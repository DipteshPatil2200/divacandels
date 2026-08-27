# Azure SQL production runbook

The production website must use Azure SQL Database. Never point a deployed backend at SQL Server on a developer workstation.

## Provision and connect

1. Create an Azure SQL logical server and a database named `DivaCandlesDB`.
2. Select a service tier after estimating catalogue traffic, admin use and backup retention needs.
3. In **Networking**, deny public access unless it is required by the chosen backend. Prefer a private endpoint when the hosting plan supports virtual-network integration.
4. If public access is required, add only the outbound IP addresses of Azure App Service or Render. Do not select “Allow Azure services” as a shortcut when a narrow rule is possible. Add an administrator IP temporarily for SSMS, then remove it when maintenance is complete.
5. In SSMS, connect to `YOUR_SERVER.database.windows.net,1433`, choose SQL Server Authentication or Microsoft Entra authentication, enable encryption, and do not trust the server certificate.
6. Configure the backend environment (never Vercel frontend variables):

```env
DB_SERVER=YOUR_SERVER.database.windows.net
DB_PORT=1433
DB_NAME=DivaCandlesDB
DB_USER=YOUR_USER
DB_PASSWORD=YOUR_SECRET
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
DATABASE_URL="sqlserver://YOUR_SERVER.database.windows.net:1433;database=DivaCandlesDB;user=YOUR_USER;password={YOUR_PASSWORD};encrypt=true;trustServerCertificate=false;schema=dbo"
```

7. From a trusted release job or App Service console, run `npm run prisma:deploy -w backend`. Run the seed only once to create the first administrator.
8. Verify `/health` and `/health/database`, then verify an admin login, a product read and an inquiry write.

## Firewall changes

Treat firewall rules as production changes. Record the requestor, reason, exact IP range and expiry. Use the narrowest possible range; remove temporary SSMS client rules after maintenance. A failed connection should be diagnosed before broadening access.

## Secrets and transport

Store credentials in App Service settings, Render secrets, or Azure Key Vault. Production startup rejects trusted certificates. Rotate the database password and JWT secrets on a managed schedule and immediately after suspected exposure.
