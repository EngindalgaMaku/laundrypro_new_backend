// Comprehensive Frontend Analysis for Invoice System
// This script analyzes React Native code structure and identifies potential issues

const fs = require("fs").promises;
const path = require("path");

// Color coding for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bright: "\x1b[1m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTestStart(testName) {
  log(`\n${colors.bright}${colors.blue}🔍 Testing: ${testName}${colors.reset}`);
}

function logSuccess(message) {
  log(`  ✅ ${message}`, colors.green);
}

function logError(message) {
  log(`  ❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`  ⚠️  ${message}`, colors.yellow);
}

const MOBILE_BASE = path.join(__dirname, "..", "mobile");

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function analyzeNavigation() {
  logTestStart("Frontend Navigation & Routing Analysis");

  const navigationFiles = [
    "src/navigation/InvoicesStackNavigator.tsx",
    "src/navigation/MainTabNavigator.tsx",
    "src/navigation/AppNavigator.tsx",
  ];

  let navigationScore = 0;
  const maxScore = navigationFiles.length * 2; // 2 points per file

  for (const navFile of navigationFiles) {
    const fullPath = path.join(MOBILE_BASE, navFile);

    log(`\n  📱 Analyzing ${navFile}...`);

    if (await fileExists(fullPath)) {
      logSuccess(`File exists: ${navFile}`);
      navigationScore += 1;

      const content = await readFile(fullPath);
      if (content) {
        // Check for proper navigation structure
        const hasStackNavigator = content.includes("createStackNavigator");
        const hasProperTypes =
          content.includes("ParamList") || content.includes("StackParamList");
        const hasScreens =
          content.includes(".Screen") || content.includes("component=");

        if (hasStackNavigator || content.includes("TabNavigator")) {
          logSuccess("  Navigation structure detected");
          navigationScore += 0.5;
        }

        if (hasProperTypes) {
          logSuccess("  TypeScript parameter lists defined");
          navigationScore += 0.3;
        }

        if (hasScreens) {
          logSuccess("  Screen components properly referenced");
          navigationScore += 0.2;
        }

        // Check for invoice-specific navigation
        if (content.includes("Invoice") || content.includes("invoice")) {
          logSuccess("  Invoice navigation routes configured");
        }
      }
    } else {
      logError(`Missing file: ${navFile}`);
    }
  }

  // Check specific invoice routes
  const invoiceNavPath = path.join(
    MOBILE_BASE,
    "src/navigation/InvoicesStackNavigator.tsx"
  );
  if (await fileExists(invoiceNavPath)) {
    const invoiceNavContent = await readFile(invoiceNavPath);
    if (invoiceNavContent) {
      const requiredRoutes = ["InvoicesList", "InvoiceDetail", "InvoiceCreate"];
      let routeCount = 0;

      requiredRoutes.forEach((route) => {
        if (invoiceNavContent.includes(route)) {
          logSuccess(`  Route configured: ${route}`);
          routeCount++;
        } else {
          logWarning(`  Route missing: ${route}`);
        }
      });

      navigationScore += (routeCount / requiredRoutes.length) * 1;
    }
  }

  const navigationHealth = (navigationScore / maxScore) * 100;
  log(`\n  📊 Navigation Health: ${navigationHealth.toFixed(1)}%`);

  return navigationHealth > 80;
}

async function analyzeInvoiceScreens() {
  logTestStart("Invoice Screen Components Analysis");

  const invoiceScreens = [
    "src/screens/invoices/InvoicesScreen.tsx",
    "src/screens/invoices/InvoiceDetailScreen.tsx",
    "src/screens/invoices/InvoiceCreateScreen.tsx",
    "src/screens/invoices/EInvoiceScreen.tsx",
  ];

  let screenScore = 0;
  const maxScreenScore = invoiceScreens.length * 3; // 3 points per screen

  for (const screenFile of invoiceScreens) {
    const fullPath = path.join(MOBILE_BASE, screenFile);

    log(`\n  📱 Analyzing ${screenFile}...`);

    if (await fileExists(fullPath)) {
      logSuccess(`Screen exists: ${path.basename(screenFile)}`);
      screenScore += 1;

      const content = await readFile(fullPath);
      if (content) {
        // Check for proper React Native structure
        const hasReactImport = content.includes("import React");
        const hasExport =
          content.includes("export default") ||
          content.includes("export const");
        const hasProps =
          content.includes("Props") || content.includes("interface");
        const hasNavigation =
          content.includes("navigation") || content.includes("useNavigation");
        const hasAPIIntegration =
          content.includes("use") &&
          content.includes("Query" || content.includes("Mutation"));

        if (hasReactImport && hasExport) {
          logSuccess("  ✓ Proper React component structure");
          screenScore += 0.5;
        }

        if (hasProps) {
          logSuccess("  ✓ TypeScript interfaces defined");
          screenScore += 0.3;
        }

        if (hasNavigation) {
          logSuccess("  ✓ Navigation integration present");
          screenScore += 0.4;
        }

        if (hasAPIIntegration) {
          logSuccess("  ✓ API integration detected");
          screenScore += 0.5;
        }

        // Check for specific invoice functionality
        if (content.includes("invoice") && content.includes("InvoiceCard")) {
          logSuccess("  ✓ Invoice-specific components used");
          screenScore += 0.3;
        }

        // Check for error handling
        if (content.includes("error") && content.includes("catch")) {
          logSuccess("  ✓ Error handling implemented");
        } else {
          logWarning("  ⚠ Error handling may need improvement");
        }
      }
    } else {
      logError(`Missing screen: ${path.basename(screenFile)}`);
    }
  }

  const screenHealth = (screenScore / maxScreenScore) * 100;
  log(`\n  📊 Screen Components Health: ${screenHealth.toFixed(1)}%`);

  return screenHealth > 75;
}

async function analyzeAPIIntegration() {
  logTestStart("API Integration Analysis");

  const apiFiles = [
    "src/services/api/invoiceService.ts",
    "src/services/api/eInvoiceService.ts",
    "src/services/api/invoicePdfService.ts",
  ];

  let apiScore = 0;
  const maxApiScore = apiFiles.length * 3; // 3 points per API file

  for (const apiFile of apiFiles) {
    const fullPath = path.join(MOBILE_BASE, apiFile);

    log(`\n  🔌 Analyzing ${apiFile}...`);

    if (await fileExists(fullPath)) {
      logSuccess(`API service exists: ${path.basename(apiFile)}`);
      apiScore += 1;

      const content = await readFile(fullPath);
      if (content) {
        // Check for RTK Query implementation
        const hasRTKQuery =
          content.includes("createApi") && content.includes("fetchBaseQuery");
        const hasEndpoints = content.includes("endpoints:");
        const hasTypes =
          content.includes("interface") && content.includes("Response");
        const hasHooks = content.includes("use") && content.includes("Query");
        const hasErrorHandling =
          content.includes("error") || content.includes("catch");

        if (hasRTKQuery) {
          logSuccess("  ✓ RTK Query implementation detected");
          apiScore += 0.6;
        }

        if (hasEndpoints) {
          logSuccess("  ✓ API endpoints defined");
          apiScore += 0.4;
        }

        if (hasTypes) {
          logSuccess("  ✓ TypeScript types defined");
          apiScore += 0.3;
        }

        if (hasHooks) {
          logSuccess("  ✓ React hooks exported");
          apiScore += 0.4;
        }

        if (hasErrorHandling) {
          logSuccess("  ✓ Error handling present");
          apiScore += 0.3;
        }

        // Check for invoice-specific operations
        const invoiceOps = ["getInvoices", "createInvoice", "updateInvoice"];
        let opsCount = 0;

        invoiceOps.forEach((op) => {
          if (content.includes(op)) {
            opsCount++;
          }
        });

        if (opsCount > 0) {
          logSuccess(
            `  ✓ Invoice operations: ${opsCount}/${invoiceOps.length}`
          );
        }
      }
    } else {
      logError(`Missing API service: ${path.basename(apiFile)}`);
    }
  }

  const apiHealth = (apiScore / maxApiScore) * 100;
  log(`\n  📊 API Integration Health: ${apiHealth.toFixed(1)}%`);

  return apiHealth > 80;
}

async function analyzeUIComponents() {
  logTestStart("UI Components Analysis");

  const componentPaths = [
    "src/components/invoices",
    "src/components/pdf",
    "src/components/common",
  ];

  let componentScore = 0;
  let totalComponents = 0;

  for (const componentPath of componentPaths) {
    const fullPath = path.join(MOBILE_BASE, componentPath);

    log(`\n  🎨 Analyzing components in ${componentPath}...`);

    try {
      if (await fileExists(fullPath)) {
        const files = await fs.readdir(fullPath);
        const componentFiles = files.filter((file) => file.endsWith(".tsx"));

        logSuccess(
          `Found ${componentFiles.length} components in ${componentPath}`
        );
        totalComponents += componentFiles.length;

        for (const componentFile of componentFiles) {
          const componentFullPath = path.join(fullPath, componentFile);
          const content = await readFile(componentFullPath);

          if (content) {
            const hasProperStructure =
              content.includes("import React") && content.includes("export");
            const hasTypes =
              content.includes("interface") || content.includes("Props");
            const hasStyles =
              content.includes("styles") || content.includes("StyleSheet");

            if (hasProperStructure) componentScore += 0.5;
            if (hasTypes) componentScore += 0.3;
            if (hasStyles) componentScore += 0.2;
          }
        }

        // Check for specific invoice components
        const invoiceComponents = componentFiles.filter((file) =>
          file.toLowerCase().includes("invoice")
        );

        if (invoiceComponents.length > 0) {
          logSuccess(
            `  ✓ Invoice-specific components: ${invoiceComponents.length}`
          );
        }
      }
    } catch (error) {
      logWarning(`Could not analyze ${componentPath}: ${error.message}`);
    }
  }

  if (totalComponents > 0) {
    const componentHealth = (componentScore / totalComponents) * 100;
    log(`\n  📊 UI Components Health: ${componentHealth.toFixed(1)}%`);
    return componentHealth > 70;
  } else {
    logWarning("No components found for analysis");
    return false;
  }
}

async function analyzeTypeScript() {
  logTestStart("TypeScript Configuration Analysis");

  const tsFiles = ["tsconfig.json", "src/types/navigation.ts"];

  let tsScore = 0;

  for (const tsFile of tsFiles) {
    const fullPath = path.join(MOBILE_BASE, tsFile);

    if (await fileExists(fullPath)) {
      logSuccess(`TypeScript config exists: ${tsFile}`);
      tsScore += 1;

      if (tsFile === "tsconfig.json") {
        const content = await readFile(fullPath);
        if (content) {
          try {
            const tsConfig = JSON.parse(content);
            if (tsConfig.compilerOptions) {
              logSuccess("  ✓ Compiler options configured");
              if (tsConfig.compilerOptions.strict) {
                logSuccess("  ✓ Strict mode enabled");
                tsScore += 0.5;
              }
            }
          } catch (error) {
            logWarning("  ⚠ Could not parse tsconfig.json");
          }
        }
      }
    } else {
      logWarning(`TypeScript file missing: ${tsFile}`);
    }
  }

  return tsScore > 1;
}

async function runFrontendAnalysis() {
  log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════════╗
║                 FRONTEND ANALYSIS & VALIDATION                ║
║              React Native Invoice System Review              ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const results = {
    navigation: false,
    screens: false,
    apiIntegration: false,
    uiComponents: false,
    typeScript: false,
  };

  // Check if mobile directory exists
  if (!(await fileExists(MOBILE_BASE))) {
    logError(`Mobile directory not found: ${MOBILE_BASE}`);
    return results;
  }

  // Run all analyses
  results.navigation = await analyzeNavigation();
  results.screens = await analyzeInvoiceScreens();
  results.apiIntegration = await analyzeAPIIntegration();
  results.uiComponents = await analyzeUIComponents();
  results.typeScript = await analyzeTypeScript();

  // Generate summary
  log(`\n${colors.bright}${colors.blue}
╔════════════════════════════════════════════════════════════════╗
║                    FRONTEND ANALYSIS RESULTS                  ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}`);

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;

  Object.entries(results).forEach(([testName, result]) => {
    const status = result ? "✅ HEALTHY" : "❌ NEEDS ATTENTION";
    const color = result ? colors.green : colors.red;
    log(
      `  ${color}${status}${colors.reset} - ${testName
        .toUpperCase()
        .replace(/([A-Z])/g, " $1")
        .trim()}`
    );
  });

  log(
    `\n${colors.bright}FRONTEND HEALTH: ${passedTests}/${totalTests} areas healthy${colors.reset}`
  );

  if (passedTests === totalTests) {
    log(
      `${colors.green}🎉 Frontend implementation is excellent!${colors.reset}`
    );
  } else if (passedTests > totalTests * 0.7) {
    log(
      `${colors.yellow}⚠️  Frontend is mostly healthy, minor improvements needed.${colors.reset}`
    );
  } else {
    log(
      `${colors.red}❌ Frontend needs significant improvements.${colors.reset}`
    );
  }

  return results;
}

// Run the analysis
if (require.main === module) {
  runFrontendAnalysis()
    .then((results) => {
      const allHealthy = Object.values(results).every(Boolean);
      process.exit(allHealthy ? 0 : 1);
    })
    .catch((error) => {
      log(`Frontend analysis failed: ${error.message}`, colors.red);
      process.exit(1);
    });
}

module.exports = { runFrontendAnalysis };
