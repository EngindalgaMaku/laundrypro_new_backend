const fs = require("fs");
const path = require("path");

// Function to fix missing closing braces and syntax issues
function fixFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Count braces to see if any are missing
  let openBraces = 0;
  let closeBraces = 0;
  let inString = false;
  let inComment = false;
  let stringChar = "";

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : "";
    const nextChar = i < content.length - 1 ? content[i + 1] : "";

    // Handle string literals
    if (
      (char === '"' || char === "'" || char === "`") &&
      prevChar !== "\\" &&
      !inComment
    ) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = "";
      }
      continue;
    }

    // Skip if we're in a string
    if (inString) continue;

    // Handle comments
    if (char === "/" && nextChar === "/" && !inComment) {
      inComment = true;
      continue;
    }
    if (char === "\n" && inComment) {
      inComment = false;
      continue;
    }
    if (inComment) continue;

    // Count braces
    if (char === "{") openBraces++;
    if (char === "}") closeBraces++;
  }

  // If we have more opening than closing braces, add closing braces
  if (openBraces > closeBraces) {
    const missing = openBraces - closeBraces;
    console.log(`Fixing ${filePath}: adding ${missing} closing brace(s)`);

    // Add missing closing braces
    content = content.trimEnd() + "\n" + "}".repeat(missing) + "\n";
    modified = true;
  }

  // Remove any double closing braces at the end that might have been added
  content = content.replace(/}\s*}\s*$/, "}\n");

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`✓ OK: ${filePath}`);
    return false;
  }
}

// Files that were mentioned in the error
const problematicFiles = [
  "app/api/admin/feedbacks/[id]/route.ts",
  "app/api/invoices/[id]/route.ts",
  "app/api/invoices/archive/route.ts",
  "app/api/invoices/cancel/route.ts",
];

console.log("Fixing syntax errors in API routes...\n");

let fixedCount = 0;
problematicFiles.forEach((relativePath) => {
  const filePath = path.join(__dirname, relativePath);
  if (fixFile(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files with syntax errors`);
