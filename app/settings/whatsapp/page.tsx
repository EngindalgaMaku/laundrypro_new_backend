"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/auth";
import { useAuth } from "@/lib/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MessageSquare,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  TestTube,
  Copy,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";

interface WhatsAppSettings {
  id?: string;
  businessId: string;
  isEnabled: boolean;
  phoneNumberId: string;
  businessAccountId: string;
  displayPhoneNumber?: string;
  qualityRating?: string;
  rateLimitHit?: boolean;
  lastSync?: string;
}

function WhatsAppSettingsPageContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WhatsAppSettings>({
    businessId: "",
    isEnabled: false,
    phoneNumberId: "",
    businessAccountId: "",
  });

  const [credentials, setCredentials] = useState({
    accessToken: "",
    webhookToken: "",
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showTokens, setShowTokens] = useState({
    accessToken: false,
    webhookToken: false,
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [origin, setOrigin] = useState("");

  // Load existing settings
  useEffect(() => {
    // Prefer React auth context
    if (user?.businessId) {
      setSettings((prev) => ({ ...prev, businessId: user.businessId }));
    } else if (typeof window !== "undefined") {
      try {
        const businessStr = localStorage.getItem("business");
        const userStr = localStorage.getItem("user");
        let resolvedBusinessId = "";
        if (businessStr) {
          const business = JSON.parse(businessStr);
          resolvedBusinessId = business?.id || business?.businessId || "";
        }
        if (!resolvedBusinessId && userStr) {
          const lsUser = JSON.parse(userStr);
          resolvedBusinessId = lsUser?.businessId || "";
        }
        if (resolvedBusinessId) {
          setSettings((prev) => ({ ...prev, businessId: resolvedBusinessId }));
        }
      } catch {}
    }
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [user?.businessId]);

  useEffect(() => {
    if (settings.businessId) {
      loadSettings();
    }
  }, [settings.businessId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/whatsapp/settings/${settings.businessId}`, {
        headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
      });
      const data = await response.json();

      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error loading WhatsApp settings:", error);
    }
  };

  const handleSaveSettings = async () => {
    if (
      settings.isEnabled &&
      (!credentials.accessToken || !settings.phoneNumberId)
    ) {
      toast.error(
        "WhatsApp'ı etkinleştirmek için erişim anahtarı ve telefon numarası kimliği gerekli"
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/whatsapp/settings/${settings.businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken() ?? ""}`,
        },
        body: JSON.stringify({
          isEnabled: settings.isEnabled,
          phoneNumberId: settings.phoneNumberId,
          businessAccountId: settings.businessAccountId,
          accessToken: credentials.accessToken,
          webhookToken: credentials.webhookToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.settings);
        toast.success("WhatsApp ayarları kaydedildi");

        if (data.testResult) {
          setTestResult(data.testResult);
        }
      } else {
        toast.error(data.error || "Ayarlar kaydedilemedi");
      }
    } catch (error) {
      toast.error("Ayarlar kaydedilirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.accessToken || !settings.phoneNumberId) {
      toast.error("Bağlantıyı denemek için erişim anahtarı ve telefon numarası kimliği gerekli");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`/api/whatsapp/settings/${settings.businessId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken() ?? ""}`,
        },
        body: JSON.stringify({
          accessToken: credentials.accessToken,
          phoneNumberId: settings.phoneNumberId,
          businessAccountId: settings.businessAccountId,
        }),
      });

      const data = await response.json();
      setTestResult(data.details);

      if (data.success) {
        toast.success("Bağlantı denemesi başarılı.");
      } else {
        toast.error(
          "Bağlantı denemesi başarısız: " + (data.details?.error || "Bilinmeyen hata")
        );
      }
    } catch (error) {
      toast.error("Deneme sırasında bir hata oluştu");
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${origin}/api/whatsapp/webhook`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(webhookUrl);
    }
    toast.success("Webhook adresi panoya kopyalandı");
  };

  const getQualityRatingBadge = (rating?: string) => {
    if (!rating || rating === "UNKNOWN") {
      return <Badge variant="secondary">Bilinmiyor</Badge>;
    }

    switch (rating) {
      case "GREEN":
        return (
          <Badge variant="default" className="bg-green-500">
            Yüksek kalite
          </Badge>
        );
      case "YELLOW":
        return (
          <Badge variant="secondary" className="bg-yellow-500">
            Orta kalite
          </Badge>
        );
      case "RED":
        return <Badge variant="destructive">Düşük kalite</Badge>;
      default:
        return <Badge variant="secondary">{rating}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-green-600" />
          WhatsApp Business API
        </h1>
        <p className="text-muted-foreground mt-2">
          Müşterilere otomatik bildirim göndermek için WhatsApp Business API entegrasyonunu yapılandırın
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Ayarlar</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="status">Durum</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                API yapılandırması
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Switch */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="whatsapp-enabled"
                  checked={settings.isEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, isEnabled: checked })
                  }
                />
                <Label
                  htmlFor="whatsapp-enabled"
                  className="text-sm font-medium"
                >
                  WhatsApp Business API entegrasyonunu etkinleştir
                </Label>
              </div>

              <Separator />

              {/* Access Token */}
              <div className="space-y-2">
                <Label htmlFor="access-token">Erişim anahtarı (Access Token) *</Label>
                <div className="relative">
                  <Input
                    id="access-token"
                    type={showTokens.accessToken ? "text" : "password"}
                    value={credentials.accessToken}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        accessToken: e.target.value,
                      })
                    }
                    placeholder="WhatsApp Business API erişim anahtarınız"
                    disabled={!settings.isEnabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() =>
                      setShowTokens({
                        ...showTokens,
                        accessToken: !showTokens.accessToken,
                      })
                    }
                  >
                    {showTokens.accessToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Phone Number ID */}
              <div className="space-y-2">
                <Label htmlFor="phone-number-id">Telefon numarası kimliği (Phone Number ID) *</Label>
                <Input
                  id="phone-number-id"
                  value={settings.phoneNumberId}
                  onChange={(e) =>
                    setSettings({ ...settings, phoneNumberId: e.target.value })
                  }
                  placeholder="WhatsApp telefon numarası kimliğiniz"
                  disabled={!settings.isEnabled}
                />
              </div>

              {/* Business Account ID */}
              <div className="space-y-2">
                <Label htmlFor="business-account-id">
                  WhatsApp Business hesap kimliği
                </Label>
                <Input
                  id="business-account-id"
                  value={settings.businessAccountId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      businessAccountId: e.target.value,
                    })
                  }
                  placeholder="WhatsApp Business hesap kimliğiniz"
                  disabled={!settings.isEnabled}
                />
              </div>

              {/* Webhook Token */}
              <div className="space-y-2">
                <Label htmlFor="webhook-token">Webhook doğrulama anahtarı</Label>
                <div className="relative">
                  <Input
                    id="webhook-token"
                    type={showTokens.webhookToken ? "text" : "password"}
                    value={credentials.webhookToken}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        webhookToken: e.target.value,
                      })
                    }
                    placeholder="Webhook doğrulama anahtarı"
                    disabled={!settings.isEnabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() =>
                      setShowTokens({
                        ...showTokens,
                        webhookToken: !showTokens.webhookToken,
                      })
                    }
                  >
                    {showTokens.webhookToken ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <Button
                  onClick={handleTestConnection}
                  variant="outline"
                  disabled={
                    testing ||
                    !settings.isEnabled ||
                    !credentials.accessToken ||
                    !settings.phoneNumberId
                  }
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deneniyor…
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Bağlantıyı dene
                    </>
                  )}
                </Button>

                <Button onClick={handleSaveSettings} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Kaydediliyor…
                    </>
                  ) : (
                    "Ayarları kaydet"
                  )}
                </Button>
              </div>

              {/* Test Results */}
              {testResult && (
                <Alert
                  className={
                    testResult.success ? "border-green-200" : "border-red-200"
                  }
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {testResult.success ? (
                      <div className="space-y-2">
                        <p className="font-medium text-green-800">
                          Bağlantı denemesi başarılı.
                        </p>
                        {testResult.displayPhoneNumber && (
                          <p>Phone Number: {testResult.displayPhoneNumber}</p>
                        )}
                        {testResult.verifiedName && (
                          <p>Business Name: {testResult.verifiedName}</p>
                        )}
                        {testResult.qualityRating && (
                          <p className="flex items-center gap-2">
                            Quality Rating:{" "}
                            {getQualityRatingBadge(testResult.qualityRating)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-red-800">
                        Connection test failed: {testResult.error}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook yapılandırması</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook adresi</Label>
                <div className="flex space-x-2">
                  <Input
                    value={`${origin}/api/whatsapp/webhook`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyWebhookUrl}
                   aria-label="Kopyala">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Bu adresi WhatsApp Business API webhook ayarlarına girin
                </p>
              </div>

              <div className="space-y-2">
                <Label>Webhook doğrulama anahtarı</Label>
                <Input
                  value={credentials.webhookToken || "Not set"}
                  readOnly
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Bu anahtar, WhatsApp'tan gelen webhook isteklerini doğrulamak için kullanılır
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Durum</CardTitle>
                {settings.isEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {settings.isEnabled ? "Etkin" : "Kapalı"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Telefon numarası
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {settings.displayPhoneNumber || "Not set"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Kalite puanı
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getQualityRatingBadge(settings.qualityRating)}
                </div>
              </CardContent>
            </Card>
          </div>

          {settings.lastSync && (
            <Card>
              <CardHeader>
                <CardTitle>Son eşitleme</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {new Date(settings.lastSync).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function WhatsAppSettingsPage() {
  return (
    <AppShell>
      <WhatsAppSettingsPageContent />
    </AppShell>
  );
}
