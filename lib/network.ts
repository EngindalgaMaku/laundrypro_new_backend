/**
 * Network connectivity and error handling utilities
 */

export interface NetworkStatus {
  isOnline: boolean;
  isApiReachable: boolean;
  isDatabaseConnected: boolean;
  lastChecked: Date;
}

export interface NetworkError {
  type: "database" | "api" | "internet";
  message: string;
  timestamp: Date;
}

// Turkish error messages
export const NETWORK_ERRORS = {
  INTERNET_CONNECTION: {
    title: "İnternet Bağlantısı Yok",
    message:
      "İnternet bağlantınızı kontrol ediniz. Program çalışması için internet gereklidir.",
    action: "Bağlantınızı kontrol edin",
  },
  DATABASE_CONNECTION: {
    title: "Veritabanı Bağlantısı Başarısız",
    message:
      "Veritabanına bağlanılamıyor. İnternet bağlantınızı kontrol ediniz.",
    action: "Tekrar deneyin",
  },
  API_CONNECTION: {
    title: "API Bağlantısı Başarısız",
    message: "Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol ediniz.",
    action: "Sayfa yenilemeyi deneyin",
  },
  NETWORK_TIMEOUT: {
    title: "Bağlantı Zaman Aşımı",
    message: "Bağlantı çok yavaş. İnternet bağlantınızı kontrol ediniz.",
    action: "Tekrar deneyin",
  },
} as const;

/**
 * Check if the browser has internet connectivity
 */
export function checkInternetConnection(): boolean {
  if (typeof navigator !== "undefined") {
    return navigator.onLine;
  }
  return true; // Server-side assumes connection
}

/**
 * Test API endpoint availability
 */
export async function testApiConnection(
  endpoint: string = "/api/health"
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(endpoint, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-cache",
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error("API connection test failed:", error);
    return false;
  }
}

/**
 * Test database connectivity via API
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch("/api/health/database", {
      method: "GET",
      signal: controller.signal,
      cache: "no-cache",
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

/**
 * Comprehensive network status check
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  const isOnline = checkInternetConnection();

  if (!isOnline) {
    return {
      isOnline: false,
      isApiReachable: false,
      isDatabaseConnected: false,
      lastChecked: new Date(),
    };
  }

  const [isApiReachable, isDatabaseConnected] = await Promise.all([
    testApiConnection(),
    testDatabaseConnection(),
  ]);

  return {
    isOnline,
    isApiReachable,
    isDatabaseConnected,
    lastChecked: new Date(),
  };
}

/**
 * Handle network errors with user-friendly messages
 */
export function handleNetworkError(error: unknown): NetworkError {
  const timestamp = new Date();

  if (error instanceof TypeError && error.message.includes("fetch")) {
    if (!checkInternetConnection()) {
      return {
        type: "internet",
        message: NETWORK_ERRORS.INTERNET_CONNECTION.message,
        timestamp,
      };
    }
    return {
      type: "api",
      message: NETWORK_ERRORS.API_CONNECTION.message,
      timestamp,
    };
  }

  if (error instanceof Error) {
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return {
        type: "api",
        message: NETWORK_ERRORS.NETWORK_TIMEOUT.message,
        timestamp,
      };
    }

    if (
      error.message.toLowerCase().includes("database") ||
      error.message.toLowerCase().includes("prisma")
    ) {
      return {
        type: "database",
        message: NETWORK_ERRORS.DATABASE_CONNECTION.message,
        timestamp,
      };
    }
  }

  // Default to API error
  return {
    type: "api",
    message: NETWORK_ERRORS.API_CONNECTION.message,
    timestamp,
  };
}

/**
 * Retry mechanism for network operations
 */
export async function retryNetworkOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check network status before attempting operation
      if (!checkInternetConnection()) {
        throw new Error(NETWORK_ERRORS.INTERNET_CONNECTION.message);
      }

      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError || new Error("Network operation failed after retries");
}

/**
 * Create a fetch wrapper with network error handling
 */
export async function fetchWithErrorHandling(
  url: string | URL | Request,
  options?: RequestInit
): Promise<Response> {
  return retryNetworkOperation(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Sunucu hatası: ${response.status}`);
        }
        if (response.status === 404) {
          throw new Error("Kaynak bulunamadı");
        }
        throw new Error(`İstek başarısız: ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  });
}
