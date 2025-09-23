const fs = require("fs");
const path = require("path");

const filesToFix = [
  { file: "app/api/invoices/[id]/route.ts", issue: "extra_brace" },
  { file: "app/api/invoices/create/route.ts", issue: "missing_brace" },
  {
    file: "app/api/invoices/pdf/download/[id]/route.ts",
    issue: "missing_brace",
  },
  { file: "app/api/invoices/route.ts", issue: "missing_brace" },
  { file: "app/api/invoices/send/route.ts", issue: "missing_brace" },
];

function fixBraceIssues(filePath, issue) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  if (issue === "extra_brace") {
    // Remove double closing braces at the end
    const beforeFix = content;
    content = content.replace(/}\s*}+\s*$/, "}\n");
    if (content !== beforeFix) {
      modified = true;
      console.log(`✓ Removed extra closing brace from: ${filePath}`);
    }
  } else if (issue === "missing_brace") {
    // Count braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;

    if (openBraces > closeBraces) {
      const missing = openBraces - closeBraces;
      content = content.trimEnd() + "\n" + "}".repeat(missing) + "\n";
      modified = true;
      console.log(
        `✓ Added ${missing} missing closing brace(s) to: ${filePath}`
      );
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  } else {
    console.log(`✓ No changes needed for: ${filePath}`);
    return false;
  }
}

console.log("Fixing final brace issues...\n");

let fixedCount = 0;
filesToFix.forEach(({ file, issue }) => {
  const filePath = path.join(__dirname, file);
  if (fixBraceIssues(filePath, issue)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files with brace issues`);
