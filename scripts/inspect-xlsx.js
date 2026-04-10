#!/usr/bin/env node
/**
 * Inspect an xlsx file to see how images are stored
 * Usage: node scripts/inspect-xlsx.js path/to/file.xlsx
 */
const JSZip = require("jszip");
const fs = require("fs");

async function inspect(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const allFiles = Object.keys(zip.files);

  console.log("=== ALL FILES IN XLSX ===");
  allFiles.forEach((f) => console.log(" ", f));

  console.log("\n=== MEDIA FILES ===");
  const mediaFiles = allFiles.filter((f) => f.startsWith("xl/media/"));
  mediaFiles.forEach((f) => console.log(" ", f, "size:", zip.files[f]._data?.uncompressedSize || "?"));

  console.log("\n=== RICH DATA FILES ===");
  const richDataFiles = allFiles.filter((f) => f.includes("richData") || f.includes("richvalue") || f.includes("metadata"));
  richDataFiles.forEach((f) => console.log(" ", f));

  console.log("\n=== DRAWING FILES ===");
  const drawingFiles = allFiles.filter((f) => f.includes("drawing"));
  drawingFiles.forEach((f) => console.log(" ", f));

  // Print content of key XML files
  for (const pattern of [
    /xl\/drawings\/drawing\d+\.xml$/,
    /xl\/drawings\/_rels\/drawing\d+\.xml\.rels/,
    /xl\/worksheets\/_rels\/sheet\d+\.xml\.rels/,
    /xl\/richData/,
    /xl\/metadata\.xml/,
  ]) {
    for (const f of allFiles.filter((name) => pattern.test(name))) {
      const content = await zip.file(f).async("text");
      console.log(`\n=== ${f} ===`);
      console.log(content.substring(0, 3000));
    }
  }

  // Check sheet XML for vm attributes
  const sheetFiles = allFiles.filter((f) => /xl\/worksheets\/sheet\d+\.xml$/.test(f));
  for (const sf of sheetFiles) {
    const xml = await zip.file(sf).async("text");
    const vmCells = xml.match(/<c\s[^>]*vm="[^"]*"[^>]*>/g);
    if (vmCells) {
      console.log(`\n=== ${sf} — cells with vm attribute ===`);
      vmCells.forEach((c) => console.log(" ", c));
    } else {
      console.log(`\n=== ${sf} — NO cells with vm attribute ===`);
    }
    // Show first 2000 chars of sheet
    console.log(`\n=== ${sf} (first 2000 chars) ===`);
    console.log(xml.substring(0, 2000));
  }
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/inspect-xlsx.js <file.xlsx>");
  process.exit(1);
}
inspect(file).catch(console.error);
