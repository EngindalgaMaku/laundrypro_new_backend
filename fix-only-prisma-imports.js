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

// ONLY fix prisma imports, nothing else
function fixPrismaImports(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Check if file uses PrismaClient direct instantiation
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

    // Remove prisma.$disconnect() calls
    content = content.replace(/\s*await\s+prisma\.\$disconnect\(\);\s*/g, "");
    content = content.replace(/\s*prisma\.\$disconnect\(\);\s*/g, "");

    // Clean up empty finally blocks
    content = content.replace(/\s*}\s*finally\s*{\s*}\s*/g, "\n  }");

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
console.log(
  `✅ Fixed ${fixedCount} files - ONLY prisma imports, no structural changes`
);
