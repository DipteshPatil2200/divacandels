CREATE INDEX [Expense_expenseDate_id_idx] ON [Expense]([expenseDate], [id]);
CREATE INDEX [Expense_category_expenseDate_idx] ON [Expense]([category], [expenseDate]);
