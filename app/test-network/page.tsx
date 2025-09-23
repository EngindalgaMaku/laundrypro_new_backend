"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNetwork } from "@/components/providers/network-provider";
import { NetworkStatusIndicator } from "@/components/providers/network-provider";
import { apiClient } from "@/lib/api-client";
import { testApiConnection, testDatabaseConnection } from "@/lib/network";
import { testConnection } from "@/lib/db";

export default function NetworkTestPage() {
  const {
    networkStatus,
    checkConnection,
    isConnecting,
    handleError,
    canNavigate,
  } = useNetwork();

  const [testResults, setTestResults] = useState<{
    [key: string]: { success: boolean; message: string; timestamp: Date };
  }>({});

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const addTestResult = (
    testName: string,
    success: boolean,
    message: string
  ) => {
    setTestResults((prev) => ({
      ...prev,
      [testName]: { success, message, timestamp: new Date() },
    }));
  };

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setIsLoading(testName);
    try {
      const result = await testFn();
      addTestResult(testName, true, `Test başarılı: ${JSON.stringify(result)}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Bilinmeyen hata";
      addTestResult(testName, false, `Test başarısız: ${message}`);
    } finally {
      setIsLoading(null);
    }
  };

  const tests = [
    {
      name: "Internet Bağlantısı",
      id: "internet",
      fn: () => Promise.resolve(navigator.onLine),
    },
    {
      name: "API Health Check",
      id: "api-health",
      fn: () => testApiConnection("/api/health"),
    },
    {
      name: "Veritabanı Bağlantısı",
      id: "database",
      fn: () => testDatabaseConnection(),
    },
    {
      name: "Dashboard Stats API",
      id: "dashboard-stats",
      fn: () => apiClient.get("/dashboard/stats"),
    },
    {
      name: "Recent Orders API",
      id: "recent-orders",
      fn: () => apiClient.get("/orders/recent"),
    },
    {
      name: "Geçersiz Endpoint",
      id: "invalid-endpoint",
      fn: () => apiClient.get("/nonexistent/endpoint"),
    },
    {
      name: "Network Timeout Test",
      id: "timeout-test",
      fn: () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 100)
        ),
    },
  ];

  const simulateOffline = () => {
    // Simulate offline mode by handling a network error
    const error = new Error("Network request failed");
    handleError(error);
  };

  const clearResults = () => {
    setTestResults({});
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Network Error Handling Test</h1>
          <p className="text-muted-foreground">
            Bu sayfa network error handling sistemini test etmek için kullanılır
          </p>
        </div>

        {/* Current Network Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Mevcut Network Durumu
              <Badge variant={canNavigate ? "default" : "destructive"}>
                {canNavigate ? "Online" : "Offline"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NetworkStatusIndicator />
          </CardContent>
        </Card>

        {/* Manual Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Manuel Kontroller</CardTitle>
            <CardDescription>
              Network durumunu manuel olarak test edin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={checkConnection}
                disabled={isConnecting}
                variant="outline"
              >
                {isConnecting ? "Kontrol Ediliyor..." : "Bağlantıyı Kontrol Et"}
              </Button>

              <Button onClick={simulateOffline} variant="destructive">
                Offline Durumunu Simüle Et
              </Button>

              <Button onClick={clearResults} variant="secondary">
                Test Sonuçlarını Temizle
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Sayfayı Yenile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Tests */}
        <Card>
          <CardHeader>
            <CardTitle>API Test Sonuçları</CardTitle>
            <CardDescription>
              Çeşitli API endpoint'lerini test edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {tests.map((test) => (
                <div key={test.id} className="space-y-2">
                  <Button
                    onClick={() => runTest(test.id, test.fn)}
                    disabled={isLoading === test.id}
                    className="w-full"
                    variant="outline"
                  >
                    {isLoading === test.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Test Ediliyor...
                      </>
                    ) : (
                      test.name
                    )}
                  </Button>

                  {testResults[test.id] && (
                    <div
                      className={`p-3 rounded text-sm ${
                        testResults[test.id].success
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      <div className="font-medium mb-1">
                        {testResults[test.id].success
                          ? "✅ Başarılı"
                          : "❌ Başarısız"}
                      </div>
                      <div className="break-all">
                        {testResults[test.id].message}
                      </div>
                      <div className="text-xs mt-1 opacity-70">
                        {testResults[test.id].timestamp.toLocaleString("tr-TR")}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Network Status Details */}
        <Card>
          <CardHeader>
            <CardTitle>Network Status Detayları</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(networkStatus, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Talimatları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Network Error Testing:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  İnternet bağlantınızı kapatarak offline durumunu test edin
                </li>
                <li>
                  Veritabanı bağlantısını simüle etmek için geçersiz
                  DATABASE_URL kullanın
                </li>
                <li>
                  API endpoint'lerini test ederek hata mesajlarını kontrol edin
                </li>
                <li>Toast mesajlarının Türkçe olarak göründüğünü doğrulayın</li>
                <li>
                  Offline durumda NavigationBlocker'ın çalıştığını kontrol edin
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Beklenen Davranışlar:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Network hatalarında Türkçe hata mesajları gösterilmeli</li>
                <li>Offline durumda sayfa navigation'ı engelleneli</li>
                <li>API hataları otomatik olarak toast'larda gösterilmeli</li>
                <li>
                  Bağlantı yeniden kurulduğunda başarı mesajı gösterilmeli
                </li>
                <li>Veritabanı hataları uygun şekilde handle edilmeli</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
