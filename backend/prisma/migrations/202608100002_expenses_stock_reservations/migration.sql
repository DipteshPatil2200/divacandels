CREATE TABLE [StockReservation] (
  [id] INT NOT NULL IDENTITY(1,1),
  [reservationNumber] VARCHAR(50) NOT NULL,
  [clientToken] VARCHAR(80) NOT NULL,
  [itemsData] NVARCHAR(MAX) NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [StockReservation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [StockReservation_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [StockReservation_reservationNumber_key] UNIQUE NONCLUSTERED ([reservationNumber]),
  CONSTRAINT [StockReservation_clientToken_key] UNIQUE NONCLUSTERED ([clientToken])
);
CREATE INDEX [StockReservation_createdAt_idx] ON [StockReservation]([createdAt]);

CREATE TABLE [Expense] (
  [id] INT NOT NULL IDENTITY(1,1),
  [expenseNumber] VARCHAR(50) NOT NULL,
  [title] NVARCHAR(200) NOT NULL,
  [category] NVARCHAR(100) NOT NULL,
  [amount] DECIMAL(12,2) NOT NULL,
  [expenseDate] DATETIME2 NOT NULL,
  [vendor] NVARCHAR(200),
  [paymentMethod] NVARCHAR(80),
  [referenceNumber] NVARCHAR(120),
  [notes] NVARCHAR(2000),
  [receiptUrl] NVARCHAR(1000),
  [createdByAdminId] INT NOT NULL,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [Expense_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [Expense_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [Expense_expenseNumber_key] UNIQUE NONCLUSTERED ([expenseNumber]),
  CONSTRAINT [Expense_createdByAdminId_fkey] FOREIGN KEY ([createdByAdminId]) REFERENCES [AdminUser]([id])
);
CREATE INDEX [Expense_expenseDate_category_idx] ON [Expense]([expenseDate], [category]);
CREATE INDEX [Expense_createdByAdminId_idx] ON [Expense]([createdByAdminId]);
