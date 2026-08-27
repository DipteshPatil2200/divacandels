# SQL Server backup, restore and long-term access

## Local SQL Server Express or Developer

In SSMS, right-click `DivaCandlesDB` → **Tasks** → **Back Up**. Choose a full backup and an explicit `.bak` destination on a protected disk. Periodically test the backup by restoring it under a different name.

Equivalent T-SQL (adjust the path for the SQL Server service account):

```sql
BACKUP DATABASE [DivaCandlesDB]
TO DISK = N'D:\SQLBackups\DivaCandlesDB_full.bak'
WITH INIT, CHECKSUM, COMPRESSION, STATS = 10;

RESTORE VERIFYONLY
FROM DISK = N'D:\SQLBackups\DivaCandlesDB_full.bak'
WITH CHECKSUM;
```

Restore into a non-production database first:

```sql
RESTORE FILELISTONLY FROM DISK = N'D:\SQLBackups\DivaCandlesDB_full.bak';

RESTORE DATABASE [DivaCandlesDB_RestoreTest]
FROM DISK = N'D:\SQLBackups\DivaCandlesDB_full.bak'
WITH MOVE N'DivaCandlesDB' TO N'D:\SQLData\DivaCandlesDB_RestoreTest.mdf',
     MOVE N'DivaCandlesDB_log' TO N'D:\SQLData\DivaCandlesDB_RestoreTest_log.ldf',
     RECOVERY, CHECKSUM, STATS = 10;
```

Logical file names and filesystem paths vary. Read `RESTORE FILELISTONLY` and use folders writable by the SQL Server service account.

## Azure SQL Database

Azure SQL creates automated backups and supports point-in-time restore according to the selected retention policy. Configure short-term retention and, if the business requires it, long-term retention in Azure before launch. Test point-in-time restoration into a new database at least quarterly. For a portable logical copy, export a BACPAC to protected Azure Storage or use SqlPackage from an authorised workstation.

Backups should be encrypted, access-controlled, stored separately from application credentials, and covered by a documented retention schedule. Also retain Cloudinary originals, approved non-secret environment-variable names, committed Prisma migrations, and CSV/JSON business exports. Never include password hashes or tokens in user-facing exports.
