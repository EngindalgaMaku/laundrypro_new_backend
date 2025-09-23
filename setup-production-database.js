const { execSync } = require("child_process");

console.log("🚀 Setting up Production Database...\n");

const commands = [
  {
    name: "Generate Prisma Client",
    cmd: "pnpm exec prisma generate",
    description: "Generates Prisma client based on schema",
  },
  {
    name: "Push Database Schema",
    cmd: "pnpm exec prisma db push",
    description: "Creates tables from Prisma schema",
  },
  {
    name: "Seed Database",
    cmd: "pnpm exec prisma db seed",
    description: "Populates initial data",
  },
];

async function runCommand(command) {
  console.log(`📦 ${command.name}...`);
  console.log(`   ${command.description}`);

  try {
    const output = execSync(command.cmd, { encoding: "utf8", stdio: "pipe" });
    console.log("✅ Success!\n");
    if (output.trim()) {
      console.log("Output:", output.trim(), "\n");
    }
    return true;
  } catch (error) {
    console.error("❌ Failed!");
    console.error("Error:", error.message);
    console.error("Stderr:", error.stderr || "No error details");
    console.log("");
    return false;
  }
}

async function setupDatabase() {
  console.log("Environment Check:");
  console.log(
    "DATABASE_URL:",
    process.env.DATABASE_URL ? "✅ Set" : "❌ Missing"
  );
  console.log("NODE_ENV:", process.env.NODE_ENV || "development");
  console.log("");

  let allSuccess = true;

  for (const command of commands) {
    const success = await runCommand(command);
    if (!success) {
      allSuccess = false;
      console.log("⚠️ Continuing with next command...\n");
    }
  }

  console.log("📋 Setup Summary:");
  if (allSuccess) {
    console.log("🎉 All database setup commands completed successfully!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Restart your Coolify application");
    console.log("2. Test the API endpoints");
    console.log("3. Try mobile app login");
  } else {
    console.log("⚠️ Some commands failed. Please check the errors above.");
    console.log("");
    console.log("Manual recovery options:");
    console.log("1. Check DATABASE_URL is correctly set");
    console.log("2. Ensure database server is accessible");
    console.log("3. Try running commands individually");
  }

  console.log("");
  console.log(
    "📖 For detailed instructions, see: PRODUCTION_DATABASE_SETUP_GUIDE.md"
  );
}

// Run the setup
setupDatabase().catch(console.error);
