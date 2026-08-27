ALTER TABLE [Expense]
ADD [gstAmount] DECIMAL(12, 2) NOT NULL CONSTRAINT [Expense_gstAmount_df] DEFAULT 0,
    [paymentStatus] VARCHAR(20) NOT NULL CONSTRAINT [Expense_paymentStatus_df] DEFAULT 'PAID';

CREATE INDEX [Expense_paymentStatus_expenseDate_idx]
ON [Expense]([paymentStatus], [expenseDate]);
