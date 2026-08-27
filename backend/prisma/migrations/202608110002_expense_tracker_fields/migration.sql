ALTER TABLE [Expense]
ADD [subCategory] NVARCHAR(120) NULL,
    [expenseType] VARCHAR(30) NOT NULL CONSTRAINT [Expense_expenseType_df] DEFAULT 'BUSINESS',
    [quantity] DECIMAL(12, 2) NOT NULL CONSTRAINT [Expense_quantity_df] DEFAULT 1,
    [unitCost] DECIMAL(12, 2) NOT NULL CONSTRAINT [Expense_unitCost_df] DEFAULT 0,
    [baseAmount] DECIMAL(12, 2) NOT NULL CONSTRAINT [Expense_baseAmount_df] DEFAULT 0,
    [gstPercent] DECIMAL(5, 2) NOT NULL CONSTRAINT [Expense_gstPercent_df] DEFAULT 0,
    [discountAmount] DECIMAL(12, 2) NOT NULL CONSTRAINT [Expense_discountAmount_df] DEFAULT 0,
    [dueDate] DATETIME2 NULL;
