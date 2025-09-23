import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Enhanced Prisma client with connection timeout
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Enhanced database connection test with timeout
export async function testConnection(
  timeoutMs: number = 10000
): Promise<boolean> {
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Database connection timeout")),
        timeoutMs
      );
    });

    // Race between connection and timeout
    await Promise.race([prisma.$connect(), timeoutPromise]);

    // Test with a simple query
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeoutPromise]);

    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);

    // Try to disconnect to clean up
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("❌ Error during database disconnect:", disconnectError);
    }

    return false;
  }
}

// Database operation wrapper with error handling
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context: string = "Database operation"
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`${context} failed:`, error);

    // Check if it's a connection error
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("connection") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("econnrefused") ||
        errorMessage.includes("network")
      ) {
        throw new Error(
          "Veritabanı bağlantısı başarısız. İnternet bağlantınızı kontrol ediniz."
        );
      }

      if (
        errorMessage.includes("authentication") ||
        errorMessage.includes("access denied")
      ) {
        throw new Error(
          "Veritabanı erişim hatası. Lütfen sistem yöneticisiyle iletişime geçin."
        );
      }

      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("does not exist")
      ) {
        throw new Error("İstenen kaynak bulunamadı.");
      }
    }

    // Generic database error
    throw new Error("Veritabanı işlemi başarısız. Lütfen tekrar deneyin.");
  }
}

// Enhanced query wrapper with retry mechanism
export async function queryWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withDatabaseErrorHandling(
        operation,
        `Database query (attempt ${attempt})`
      );
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError || new Error("Database operation failed after retries");
}

// Connection health check with detailed status
export async function getDatabaseHealth() {
  try {
    const startTime = Date.now();

    // Test basic connection
    await prisma.$connect();

    // Test with a simple query
    await prisma.$queryRaw`SELECT 1 as status`;

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      status: "connected",
      responseTime,
      timestamp: new Date(),
      healthy: responseTime < 5000, // Consider healthy if < 5 seconds
    };
  } catch (error) {
    return {
      status: "disconnected",
      responseTime: null,
      timestamp: new Date(),
      healthy: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Graceful shutdown with timeout
export async function disconnectDB(timeoutMs: number = 5000) {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Disconnect timeout")), timeoutMs);
    });

    await Promise.race([prisma.$disconnect(), timeoutPromise]);

    console.log("✅ Database disconnected successfully");
  } catch (error) {
    console.error("❌ Database disconnect failed:", error);
    throw error;
  }
}
