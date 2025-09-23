const fs = require("fs");
const path = require("path");

// Files that need final syntax fixes based on the build error
const filesToFix = [
  "app/api/invoices/[id]/route.ts",
  "app/api/invoices/archive/route.ts",
  "app/api/invoices/cancel/route.ts",
  "app/api/invoices/create/route.ts",
];

function fixFunctionClosingBraces(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Fix patterns where export functions appear after missing closing braces
  const patterns = [
    // Pattern: "  }\n\nexport async function" (missing function close)
    {
      regex: /(\s*}\s*)\n\n(export async function)/g,
      replacement: "$1\n}\n\n$2",
    },
    // Pattern: lines ending with } but missing function close before next export
    {
      regex: /(\s*}\s*)\n\n(\/\/[^\n]*\n)?export async function/g,
      replacement: "$1\n}\n\n$2export async function",
    },
  ];

  patterns.forEach((pattern) => {
    const before = content;
    content = content.replace(pattern.regex, pattern.replacement);
    if (content !== before) {
      modified = true;
    }
  });

  // More specific fixes based on the error patterns
  // Look for cases where there's a missing } before "export async function"
  const lines = content.split("\n");
  const fixedLines = [];
  let inFunction = false;
  let braceLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Track when we're in a function
    if (
      trimmedLine.startsWith("export async function") ||
      trimmedLine.startsWith("async function") ||
      trimmedLine.includes("export async function")
    ) {
      inFunction = true;
      braceLevel = 0;
    }

    // Count braces
    if (inFunction) {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceLevel += openBraces - closeBraces;

      // If we find another export while in a function with braceLevel > 0,
      // we need to close the previous function
      if (braceLevel > 0 && i < lines.length - 1) {
        const nextLine = lines[i + 1];
        const nextNextLine = i < lines.length - 2 ? lines[i + 2] : "";

        if (
          (nextLine.trim() === "" &&
            nextNextLine.trim().startsWith("export async function")) ||
          nextLine.trim().startsWith("export async function")
        ) {
          // Add missing closing brace
          fixedLines.push(line);
          fixedLines.push("}");
          inFunction = false;
          braceLevel = 0;
          modified = true;
          continue;
        }
      }

      // If we reach brace level 0, we're out of the function
      if (braceLevel === 0 && line.includes("}")) {
        inFunction = false;
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
    console.log(`✓ No fixes needed: ${filePath}`);
    return false;
  }
}

console.log("Fixing remaining syntax errors...\n");

let fixedCount = 0;
filesToFix.forEach((relativePath) => {
  const filePath = path.join(__dirname, relativePath);
  if (fixFunctionClosingBraces(filePath)) {
    fixedCount++;
  }
});

console.log(`\n✅ Applied fixes to ${fixedCount} files`);
