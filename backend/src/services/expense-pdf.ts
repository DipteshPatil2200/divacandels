import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

export type ExpenseReportRow = { expenseNumber: string; title: string; category: string; amount: number; expenseDate: Date; vendor?: string | null; paymentMethod?: string | null };
export type ExpenseReportInput = { year: number; quarter: 1 | 2 | 3 | 4; rows: ExpenseReportRow[]; recordCount?: number };

const colors = { charcoal: "#24211c", wine: "#7a4a3f", gold: "#ae8451", cream: "#f3ede4", light: "#e9e7e4", white: "#ffffff", muted: "#746c60" };
const inr = (value: number) => `INR ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

function findLogo() {
  const compiledRelative = fileURLToPath(new URL("../../../assets/diva-logo.jpg", import.meta.url));
  const candidates = [path.resolve(process.cwd(), "assets/diva-logo.jpg"), path.resolve(process.cwd(), "backend/assets/diva-logo.jpg"), compiledRelative];
  return candidates.find(existsSync);
}

export function createExpenseReportPdf(input: ExpenseReportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0, bufferPages: true, autoFirstPage: false, info: { Title: `${input.year} DIVA Candles Expense Report Q${input.quarter}`, Author: "DIVA Candles" } });
    const chunks: Buffer[] = []; doc.on("data", (chunk) => chunks.push(Buffer.from(chunk))); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject);
    const startMonth = (input.quarter - 1) * 3; const months = [startMonth, startMonth + 1, startMonth + 2];
    const grouped = new Map<string, number[]>();
    for (const row of input.rows) { const values = grouped.get(row.category) ?? [0, 0, 0]; const monthIndex = months.indexOf(row.expenseDate.getMonth()); if (row.expenseDate.getFullYear() === input.year && monthIndex >= 0) values[monthIndex] = (values[monthIndex] ?? 0) + row.amount; grouped.set(row.category, values); }
    const categoryRows = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
    const displayRows = categoryRows.length ? categoryRows : [["No expenses recorded", [0, 0, 0]] as [string, number[]]];
    const pageChunks: [string, number[]][][] = []; for (let index = 0; index < displayRows.length; index += 12) pageChunks.push(displayRows.slice(index, index + 12));
    const monthTotals = months.map((_, index) => categoryRows.reduce((sum, [, values]) => sum + (values[index] ?? 0), 0)); const grandTotal = monthTotals.reduce((sum, value) => sum + value, 0); const logo = findLogo();

    pageChunks.forEach((rows, pageIndex) => {
      doc.addPage({ size: "A4", layout: "landscape", margin: 0 }); const pageWidth = doc.page.width; const pageHeight = doc.page.height;
      doc.rect(0, 0, pageWidth * .68, 132).fill(colors.charcoal); doc.rect(pageWidth * .68, 0, pageWidth * .32, 132).fill(colors.wine);
      doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(30).text(String(input.year), 42, 30); doc.fontSize(28).text(`Expense Report Q${input.quarter}`, 42, 68);
      if (logo) { doc.roundedRect(pageWidth - 158, 16, 116, 100, 5).fill(colors.white); doc.image(logo, pageWidth - 151, 20, { fit: [102, 92], align: "center", valign: "center" }); }
      else { doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(20).text("DIVA", pageWidth - 150, 48, { width: 110, align: "center" }); }

      const tableX = 42, tableY = 178, tableWidth = pageWidth - 84; const widths = [205, 135, 135, 135, tableWidth - 610]; const headerHeight = 32, rowHeight = 25;
      const headers = ["EXPENSES", monthNames[months[0]!]!, monthNames[months[1]!]!, monthNames[months[2]!]!, "TOTAL"];
      let x = tableX; headers.forEach((header, index) => { doc.rect(x, tableY, widths[index]!, headerHeight).fillAndStroke(colors.charcoal, colors.white); doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(10).text(header, x + 9, tableY + 11, { width: widths[index]! - 18, align: index ? "right" : "left", lineBreak: false }); x += widths[index]!; });
      let y = tableY + headerHeight;
      rows.forEach(([category, values], rowIndex) => { x = tableX; const total = values.reduce((sum, value) => sum + value, 0); const cells = [category, ...values.map(inr), inr(total)]; cells.forEach((cell, index) => { doc.rect(x, y, widths[index]!, rowHeight).fillAndStroke(rowIndex % 2 ? colors.light : colors.cream, colors.white); doc.fillColor(colors.charcoal).font(index === 0 ? "Helvetica" : "Helvetica-Bold").fontSize(index === 0 ? 9 : 8).text(String(cell), x + 9, y + 8, { width: widths[index]! - 18, align: index ? "right" : "left", lineBreak: false, ellipsis: true }); x += widths[index]!; }); y += rowHeight; });
      if (pageIndex === pageChunks.length - 1) { x = tableX; const totals = ["TOTAL EXPENSES", ...monthTotals.map(inr), inr(grandTotal)]; totals.forEach((cell, index) => { doc.rect(x, y + 22, widths[index]!, 34).fillAndStroke(colors.wine, colors.white); doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(index === 0 ? 11 : 9).text(cell, x + 9, y + 34, { width: widths[index]! - 18, align: index ? "right" : "left", lineBreak: false }); x += widths[index]!; }); }

      doc.rect(0, pageHeight - 46, pageWidth, 46).fill(colors.wine); doc.fillColor(colors.white).font("Helvetica").fontSize(8).text("DIVA CANDLES | Illuminate Moments. Inspire Memories.", 42, pageHeight - 28, { lineBreak: false }); doc.text("info.divacandles@gmail.com | +91 84218 69308", pageWidth - 330, pageHeight - 28, { width: 288, align: "right", lineBreak: false });
      doc.fillColor(colors.muted).fontSize(7).text(`Generated ${new Date().toLocaleString("en-IN")} | Page ${pageIndex + 1} of ${pageChunks.length} | ${input.recordCount ?? input.rows.length} records`, 42, pageHeight - 62, { width: pageWidth - 84, align: "center", lineBreak: false });
    });
    doc.end();
  });
}
