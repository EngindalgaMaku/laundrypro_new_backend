const fs = require("fs");
const path = require("path");

// Files that need closing braces fixed
const filesToFix = [
  "app/api/admin/businesses/[id]/route.ts",
  "app/api/admin/feedbacks/[id]/route.ts",
  "app/api/admin/feedbacks/route.ts",
  "app/api/feedback/route.ts",
];

filesToFix.forEach((relativePath) => {
  const filePath = path.join(__dirname, relativePath);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");

  // Count opening and closing braces
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;

  if (openBraces > closeBraces) {
    const missing = openBraces - closeBraces;
    console.log(`Fixing ${relativePath}: adding ${missing} closing brace(s)`);

    // Add missing closing braces at the end
    content = content.trimEnd() + "\n" + "}".repeat(missing) + "\n";

    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✓ Fixed: ${relativePath}`);
  } else {
    console.log(`✓ OK: ${relativePath} (braces balanced)`);
  }
});

console.log("\n✅ All files checked and fixed");
