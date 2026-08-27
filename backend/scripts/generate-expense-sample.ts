import { mkdir, writeFile } from "node:fs/promises";
import { createExpenseReportPdf } from "../src/services/expense-pdf.js";

const outputDirectory = new URL("../../output/pdf/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });
const pdf = await createExpenseReportPdf({
  year: 2026, quarter: 3,
  rows: [
    { expenseNumber: "DIVA-EXP-2026-DEMO0001", title: "Premium soy wax", category: "Raw Materials", amount: 12500, expenseDate: new Date("2026-07-03"), vendor: "Sample Wax Supplier", paymentMethod: "Bank Transfer" },
    { expenseNumber: "DIVA-EXP-2026-DEMO0002", title: "Fragrance oils", category: "Raw Materials", amount: 9400, expenseDate: new Date("2026-08-06"), vendor: "Sample Fragrance House", paymentMethod: "UPI" },
    { expenseNumber: "DIVA-EXP-2026-DEMO0003", title: "Luxury gift boxes", category: "Packaging", amount: 7800, expenseDate: new Date("2026-07-12"), vendor: "Sample Packaging Studio", paymentMethod: "UPI" },
    { expenseNumber: "DIVA-EXP-2026-DEMO0004", title: "Ribbon and labels", category: "Packaging", amount: 4250, expenseDate: new Date("2026-09-08"), vendor: "Sample Packaging Studio", paymentMethod: "Credit Card" },
    { expenseNumber: "DIVA-EXP-2026-DEMO0005", title: "Courier dispatch", category: "Shipping", amount: 2450, expenseDate: new Date("2026-08-18"), vendor: "Sample Logistics", paymentMethod: "Credit Card" },
    { expenseNumber: "DIVA-EXP-2026-DEMO0006", title: "Festive campaign", category: "Marketing", amount: 15000, expenseDate: new Date("2026-09-14"), vendor: "Sample Creative Studio", paymentMethod: "Bank Transfer" }
  ]
});
await writeFile(new URL("diva-expense-report-sample.pdf", outputDirectory), pdf);
