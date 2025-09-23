const fs = require("fs");
const path = require("path");

const filesToFix = [
  "app/api/invoices/[id]/route.ts",
  "app/api/invoices/create/route.ts",
  "app/api/invoices/pdf/download/[id]/route.ts",
  "app/api/invoices/route.ts",
  "app/api/invoices/send/route.ts",
];

function fixExportModuleErrors(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Split into lines for easier processing
  const lines = content.split("\n");
  const fixedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // If we find a line that's just "}" followed by an empty line and then "export async function"
    // we need to add a closing "}" after the first "}"
    if (trimmedLine === "}" && i < lines.length - 2) {
      const nextLine = lines[i + 1];
      const lineAfterNext = lines[i + 2];

      if (
        nextLine.trim() === "" &&
        lineAfterNext.trim().startsWith("export async function")
      ) {
        fixedLines.push(line);
        fixedLines.push("}");
        modified = true;
        continue;
      }

      // Also check for comment lines between } and export
      if (nextLine.trim() === "" && i < lines.length - 3) {
        const lineAfterComment = lines[i + 3];
        if (
          lines[i + 2].trim().startsWith("//") &&
          lineAfterComment.trim().startsWith("export async function")
        ) {
          fixedLines.push(line);
          fixedLines.push("}");
          modified = true;
          continue;
        }
      }
    }

    fixedLines.push(line);
  }

  if (modified) {
    const newContent = fixedLines.join("\n");
    fs.writeFileSync(filePath, newContent, "utf8");
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`✓ No changes needed: ${filePath}`);
    return false;
  }
}

console.log("Fixing remaining export module errors...\n");

let fixedCount = 0;
filesToFix.forEach((relativePath) => {
  const filePath = path.join(__dirname, relativePath);
  if (fixExportModuleErrors(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files with export module errors`);
