"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { toast } from "sonner";
import {
  type NetworkStatus as NetworkStatusType,
  type NetworkError,
  getNetworkStatus,
  handleNetworkError,
  NETWORK_ERRORS,
} from "@/lib/network";

interface NetworkContextType {
  networkStatus: NetworkStatusType;
  lastError: NetworkError | null;
  isConnecting: boolean;
  checkConnection: () => Promise<void>;
  handleError: (error: unknown) => void;
  canNavigate: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}

interface NetworkProviderProps {
  children: React.ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatusType>({
    isOnline: true,
    isApiReachable: true,
    isDatabaseConnected: true,
    lastChecked: new Date(),
  });

  const [lastError, setLastError] = useState<NetworkError | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if navigation should be allowed
  const canNavigate =
    networkStatus.isOnline &&
    networkStatus.isApiReachable &&
    networkStatus.isDatabaseConnected;

  const checkConnection = useCallback(async () => {
    setIsConnecting(true);
    try {
      const status = await getNetworkStatus();
      setNetworkStatus(status);

      // Clear error if connection is restored
      if (
        status.isOnline &&
        status.isApiReachable &&
        status.isDatabaseConnected
      ) {
        setLastError(null);

        // Show success message if we were previously offline
        if (
          !networkStatus.isOnline ||
          !networkStatus.isApiReachable ||
          !networkStatus.isDatabaseConnected
        ) {
          toast.success("Bağlantı restored", {
            description: "İnternet bağlantısı yeniden kuruldu.",
          });
        }
      } else {
        // Handle different types of connection issues
        let errorType: keyof typeof NETWORK_ERRORS = "INTERNET_CONNECTION";

        if (!status.isOnline) {
          errorType = "INTERNET_CONNECTION";
        } else if (!status.isApiReachable) {
          errorType = "API_CONNECTION";
        } else if (!status.isDatabaseConnected) {
          errorType = "DATABASE_CONNECTION";
        }

        const error: NetworkError = {
          type:
            errorType === "INTERNET_CONNECTION"
              ? "internet"
              : errorType === "API_CONNECTION"
              ? "api"
              : "database",
          message: NETWORK_ERRORS[errorType].message,
          timestamp: new Date(),
        };

        setLastError(error);

        toast.error(NETWORK_ERRORS[errorType].title, {
          description: NETWORK_ERRORS[errorType].message,
          action: {
            label: NETWORK_ERRORS[errorType].action,
            onClick: () => checkConnection(),
          },
          duration: 10000,
        });
      }
    } catch (error) {
      console.error("Network check failed:", error);
      const networkError = handleNetworkError(error);
      setLastError(networkError);

      toast.error("Bağlantı Kontrolü Başarısız", {
        description: networkError.message,
        action: {
          label: "Tekrar Dene",
          onClick: () => checkConnection(),
        },
      });
    } finally {
      setIsConnecting(false);
    }
  }, [
    networkStatus.isOnline,
    networkStatus.isApiReachable,
    networkStatus.isDatabaseConnected,
  ]);

  const handleError = useCallback(
    (error: unknown) => {
      const networkError = handleNetworkError(error);
      setLastError(networkError);

      // Get appropriate error message based on error type
      const errorConfig =
        networkError.type === "internet"
          ? NETWORK_ERRORS.INTERNET_CONNECTION
          : networkError.type === "database"
          ? NETWORK_ERRORS.DATABASE_CONNECTION
          : NETWORK_ERRORS.API_CONNECTION;

      toast.error(errorConfig.title, {
        description: networkError.message,
        action: {
          label: errorConfig.action,
          onClick: () => checkConnection(),
        },
        duration: 10000,
      });

      // Trigger connection check
      checkConnection();
    },
    [checkConnection]
  );

  // Monitor online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log("Browser detected online");
      checkConnection();
    };

    const handleOffline = () => {
      console.log("Browser detected offline");
      setNetworkStatus((prev: NetworkStatusType) => ({
        ...prev,
        isOnline: false,
        isApiReachable: false,
        isDatabaseConnected: false,
        lastChecked: new Date(),
      }));

      const error: NetworkError = {
        type: "internet",
        message: NETWORK_ERRORS.INTERNET_CONNECTION.message,
        timestamp: new Date(),
      };
      setLastError(error);

      toast.error(NETWORK_ERRORS.INTERNET_CONNECTION.title, {
        description: NETWORK_ERRORS.INTERNET_CONNECTION.message,
        action: {
          label: NETWORK_ERRORS.INTERNET_CONNECTION.action,
          onClick: () => checkConnection(),
        },
        duration: Infinity,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection]);

  // Initial connection check and periodic checks
  useEffect(() => {
    checkConnection();

    // Check connection every 30 seconds if offline
    const intervalId = setInterval(() => {
      if (!canNavigate) {
        checkConnection();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [checkConnection, canNavigate]);

  // Show persistent error toast when offline
  useEffect(() => {
    if (!canNavigate && lastError) {
      const errorConfig =
        lastError.type === "internet"
          ? NETWORK_ERRORS.INTERNET_CONNECTION
          : lastError.type === "database"
          ? NETWORK_ERRORS.DATABASE_CONNECTION
          : NETWORK_ERRORS.API_CONNECTION;

      toast.error(errorConfig.title, {
        description: lastError.message,
        id: "network-error", // Use ID to prevent duplicate toasts
        action: {
          label: errorConfig.action,
          onClick: () => checkConnection(),
        },
        duration: Infinity,
      });
    } else {
      // Dismiss persistent error toast when back online
      toast.dismiss("network-error");
    }
  }, [canNavigate, lastError, checkConnection]);

  const contextValue: NetworkContextType = {
    networkStatus,
    lastError,
    isConnecting,
    checkConnection,
    handleError,
    canNavigate,
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
}

// Navigation blocker component
export function NavigationBlocker({ children }: { children: React.ReactNode }) {
  const { canNavigate, lastError } = useNetwork();

  if (!canNavigate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Bağlantı Sorunu
            </h1>
            <p className="text-muted-foreground">
              {lastError?.message ||
                "İnternet bağlantınızı kontrol ediniz. Program çalışması için internet gereklidir."}
            </p>
          </div>

          <div className="space-y-3">
            <NetworkStatusIndicator />
            <p className="text-sm text-muted-foreground">
              Bağlantı kurulduktan sonra uygulama otomatik olarak yeniden
              yüklenecektir.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Network status indicator component
export function NetworkStatusIndicator() {
  const { networkStatus, isConnecting, checkConnection } = useNetwork();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span>İnternet Bağlantısı:</span>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                networkStatus.isOnline ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span
              className={
                networkStatus.isOnline ? "text-green-600" : "text-red-600"
              }
            >
              {networkStatus.isOnline ? "Bağlı" : "Bağlantısız"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span>API Bağlantısı:</span>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                networkStatus.isApiReachable ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span
              className={
                networkStatus.isApiReachable ? "text-green-600" : "text-red-600"
              }
            >
              {networkStatus.isApiReachable ? "Aktif" : "Ulaşılamıyor"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span>Veritabanı:</span>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                networkStatus.isDatabaseConnected
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span
              className={
                networkStatus.isDatabaseConnected
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {networkStatus.isDatabaseConnected ? "Bağlı" : "Bağlantısız"}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={checkConnection}
        disabled={isConnecting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Kontrol Ediliyor...
          </>
        ) : (
          "Bağlantıyı Kontrol Et"
        )}
      </button>
    </div>
  );
}
