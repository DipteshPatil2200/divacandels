import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "C:/Users/dipte/Downloads/DIVA_Candle_Expenses_Tracker.xlsx";
const input = await FileBlob.load(source);
const workbook = await SpreadsheetFile.importXlsx(input);

const sheets = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 5000 });
console.log("SHEETS\n" + sheets.ndjson);

for (const record of sheets.ndjson.trim().split("\n").map((line) => JSON.parse(line))) {
  const name = record.name;
  if (!name) continue;
  const region = await workbook.inspect({ kind: "region", sheetId: name, maxChars: 8000, tableMaxRows: 30, tableMaxCols: 20 });
  const formulas = await workbook.inspect({ kind: "formula", sheetId: name, maxChars: 4000, options: { maxResults: 100 } });
  const drawings = await workbook.inspect({ kind: "drawing", sheetId: name, maxChars: 3000 });
  console.log(`\nREGION ${name}\n${region.ndjson}`);
  console.log(`\nFORMULAS ${name}\n${formulas.ndjson}`);
  console.log(`\nDRAWINGS ${name}\n${drawings.ndjson}`);
  const preview = await workbook.render({ sheetName: name, autoCrop: "all", scale: 1.3, format: "png" });
  await fs.writeFile(`render-${name.replace(/[^a-z0-9]+/gi, "-")}.png`, new Uint8Array(await preview.arrayBuffer()));
}
