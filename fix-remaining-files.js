const fs = require("fs");
const path = require("path");

const filesToFix = [
  "app/api/invoices/[id]/route.ts",
  "app/api/invoices/status/route.ts",
  "app/api/settings/e-fatura/route.ts",
  "app/api/test-invoice/route.ts",
  "app/api/whatsapp/send/route.ts",
];

function fixSyntaxErrors(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Count braces
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;

  // Add missing closing braces
  if (openBraces > closeBraces) {
    const missing = openBraces - closeBraces;
    content = content.trimEnd() + "\n" + "}".repeat(missing) + "\n";
    modified = true;
    console.log(`✓ Added ${missing} missing closing brace(s) to: ${filePath}`);
  }

  // Fix export outside module code by adding closing braces before exports
  const lines = content.split("\n");
  const fixedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // If we find "  }" followed by empty line and then "export async function"
    // we need to add another closing brace
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

      // Check for comment lines between } and export
      if (nextLine.trim() === "" && i < lines.length - 3) {
        const commentLine = lines[i + 2];
        const exportLine = lines[i + 3];
        if (
          commentLine.trim().startsWith("//") &&
          exportLine.trim().startsWith("export async function")
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
    console.log(`✓ Fixed syntax errors in: ${filePath}`);
    return true;
  } else {
    console.log(`✓ No changes needed: ${filePath}`);
    return false;
  }
}

console.log("Fixing remaining syntax errors...\n");

let fixedCount = 0;
filesToFix.forEach((relativePath) => {
  const filePath = path.join(__dirname, relativePath);
  if (fixSyntaxErrors(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} remaining files`);
