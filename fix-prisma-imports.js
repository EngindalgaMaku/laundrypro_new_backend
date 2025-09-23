const fs = require("fs");
const path = require("path");

// Find all .ts files in app/api directory
function getAllTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (file.endsWith(".ts")) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Fix prisma imports in a file
function fixPrismaImports(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Check if file uses PrismaClient
  if (
    content.includes('from "@prisma/client"') &&
    content.includes("new PrismaClient()")
  ) {
    console.log(`Fixing: ${filePath}`);

    // Remove PrismaClient import
    content = content.replace(
      /import\s*{\s*PrismaClient\s*}\s*from\s*["']@prisma\/client["'];?\n?/g,
      ""
    );

    // Remove const prisma = new PrismaClient()
    content = content.replace(
      /const\s+prisma\s*=\s*new\s+PrismaClient\(\);?\n?/g,
      ""
    );

    // Add prisma import from lib/db if not already there
    if (!content.includes('from "@/lib/db"')) {
      // Find the last import statement
      const importRegex = /^import\s+.*?from\s+["'].*?["'];?\s*$/gm;
      const imports = content.match(importRegex) || [];

      if (imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length;

        content =
          content.slice(0, insertPosition) +
          '\nimport { prisma } from "@/lib/db";' +
          content.slice(insertPosition);
      } else {
        // No imports, add at the beginning
        content = 'import { prisma } from "@/lib/db";\n' + content;
      }
    }

    // Remove prisma.$disconnect() calls as they're not needed with singleton
    content = content.replace(/await\s+prisma\.\$disconnect\(\);?\n?/g, "");
    content = content.replace(/prisma\.\$disconnect\(\);?\n?/g, "");

    // Clean up empty finally blocks
    content = content.replace(/}\s*finally\s*{\s*}\s*/g, "");

    fs.writeFileSync(filePath, content, "utf8");
    modified = true;
    console.log(`✓ Fixed: ${filePath}`);
  }

  return modified;
}

// Main execution
const apiDir = path.join(__dirname, "app", "api");
const tsFiles = getAllTsFiles(apiDir);

console.log(`Found ${tsFiles.length} TypeScript files in app/api`);
console.log("---");

let fixedCount = 0;
tsFiles.forEach((file) => {
  if (fixPrismaImports(file)) {
    fixedCount++;
  }
});

console.log("---");
console.log(`✅ Fixed ${fixedCount} files`);
console.log(
  "🎉 All PrismaClient imports have been updated to use the singleton from @/lib/db"
);
