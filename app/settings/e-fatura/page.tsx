"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  TestTube,
  Upload,
  Calendar,
  Building,
} from "lucide-react";

interface EFaturaSettings {
  id?: string;
  businessId: string;
  isEnabled: boolean;
  gibTestMode: boolean;
  gibPortalUrl: string;
  invoiceSeriesPrefix: string;
  currentInvoiceNumber: number;
  invoiceNumberLength: number;
  companyVkn: string;
  companyTitle: string;
  companyAddress: string;
  companyDistrict: string;
  companyCity: string;
  companyPostalCode?: string;
  companyCountry: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  autoCreateInvoice: boolean;
  autoSendInvoice: boolean;
  invoiceOnPayment: boolean;
  invoiceOnOrderComplete: boolean;
  archiveRetentionYears: number;
  certificateValidUntil?: string;
  lastArchiveDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function EFaturaSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<EFaturaSettings>({
    businessId: "",
    isEnabled: false,
    gibTestMode: true,
    gibPortalUrl: "https://earsivportal.efatura.gov.tr",
    invoiceSeriesPrefix: "EMU",
    currentInvoiceNumber: 1,
    invoiceNumberLength: 8,
    companyVkn: "",
    companyTitle: "",
    companyAddress: "",
    companyDistrict: "",
    companyCity: "",
    companyCountry: "Türkiye",
    autoCreateInvoice: false,
    autoSendInvoice: false,
    invoiceOnPayment: true,
    invoiceOnOrderComplete: false,
    archiveRetentionYears: 5,
  });

  const [credentials, setCredentials] = useState({
    gibUsername: "",
    gibPassword: "",
    certificatePassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    gibPassword: false,
    certificatePassword: false,
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  // Resolve businessId then load settings (prefer React auth context)
  useEffect(() => {
    if (user?.businessId) {
      setSettings((prev) => ({ ...prev, businessId: user.businessId }));
      return;
    }
    if (typeof window !== "undefined") {
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
  }, [user?.businessId]);

  useEffect(() => {
    if (settings.businessId) {
      loadSettings();
    }
  }, [settings.businessId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `/api/e-invoice/config/${settings.businessId}`
      );
      const data = await response.json();

      if (data.success && data.config) {
        setSettings(data.config);
      }
    } catch (error) {
      console.error("Error loading E-Fatura settings:", error);
    }
  };

  const handleSaveSettings = async () => {
    if (settings.isEnabled && !settings.companyVkn) {
      toast.error("Company VKN is required when enabling E-Fatura");
      return;
    }

    if (settings.isEnabled && !settings.companyTitle) {
      toast.error("Company title is required when enabling E-Fatura");
      return;
    }

    // Validate VKN format
    if (settings.companyVkn && !/^\d{10}$/.test(settings.companyVkn)) {
      toast.error("VKN must be exactly 10 digits");
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        ...credentials,
        // Only include editable settings fields
        isEnabled: settings.isEnabled,
        gibTestMode: settings.gibTestMode,
        gibPortalUrl: settings.gibPortalUrl,
        invoiceSeriesPrefix: settings.invoiceSeriesPrefix,
        currentInvoiceNumber: settings.currentInvoiceNumber,
        invoiceNumberLength: settings.invoiceNumberLength,
        companyVkn: settings.companyVkn,
        companyTitle: settings.companyTitle,
        companyAddress: settings.companyAddress,
        companyDistrict: settings.companyDistrict,
        companyCity: settings.companyCity,
        companyPostalCode: settings.companyPostalCode,
        companyCountry: settings.companyCountry,
        companyEmail: settings.companyEmail,
        companyPhone: settings.companyPhone,
        companyWebsite: settings.companyWebsite,
        autoCreateInvoice: settings.autoCreateInvoice,
        autoSendInvoice: settings.autoSendInvoice,
        invoiceOnPayment: settings.invoiceOnPayment,
        invoiceOnOrderComplete: settings.invoiceOnOrderComplete,
        archiveRetentionYears: settings.archiveRetentionYears,
      } as any;

      const response = await fetch(`/api/e-invoice/config/${settings.businessId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.config);
        toast.success("E-Fatura settings saved successfully");

        if (data.testResult) {
          setTestResult(data.testResult);
        }
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("An error occurred while saving settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.gibUsername || !credentials.gibPassword) {
      toast.error("GIB username and password are required for testing");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch("/api/settings/e-fatura", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId: settings.businessId,
          gibUsername: credentials.gibUsername,
          gibPassword: credentials.gibPassword,
          gibTestMode: settings.gibTestMode,
          gibPortalUrl: settings.gibPortalUrl,
        }),
      });

      const data = await response.json();
      setTestResult(data.details);

      if (data.success) {
        toast.success("GIB Portal connection test successful!");
      } else {
        toast.error(
          "Connection test failed: " + (data.details?.error || "Unknown error")
        );
      }
    } catch (error) {
      toast.error("An error occurred during testing");
    } finally {
      setTesting(false);
    }
  };

  const handleCertificateUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      if (
        !file.name.toLowerCase().endsWith(".p12") &&
        !file.name.toLowerCase().endsWith(".pfx")
      ) {
        toast.error("Please select a P12 or PFX certificate file");
        return;
      }
      setCertificateFile(file);
      toast.success("Certificate file selected");
    }
  };

  const getVknValidationStatus = () => {
    if (!settings.companyVkn) return null;

    const isValid = /^\d{10}$/.test(settings.companyVkn);
    return isValid ? "valid" : "invalid";
  };

  const formatInvoiceNumber = () => {
    const paddedNumber = settings.currentInvoiceNumber
      .toString()
      .padStart(settings.invoiceNumberLength, "0");
    return `${
      settings.invoiceSeriesPrefix
    }${new Date().getFullYear()}${paddedNumber}`;
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-blue-600" />
          E-Fatura Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure Turkish E-Invoice (E-Fatura) integration with GIB Portal
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                E-Fatura Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Switch */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="efatura-enabled"
                  checked={settings.isEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, isEnabled: checked })
                  }
                />
                <Label
                  htmlFor="efatura-enabled"
                  className="text-sm font-medium"
                >
                  Enable E-Fatura Integration
                </Label>
              </div>

              <Separator />

              {/* GIB Portal Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gib-username">GIB Portal Username *</Label>
                  <Input
                    id="gib-username"
                    value={credentials.gibUsername}
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        gibUsername: e.target.value,
                      })
                    }
                    placeholder="Enter GIB Portal username"
                    disabled={!settings.isEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gib-password">GIB Portal Password *</Label>
                  <div className="relative">
                    <Input
                      id="gib-password"
                      type={showPasswords.gibPassword ? "text" : "password"}
                      value={credentials.gibPassword}
                      onChange={(e) =>
                        setCredentials({
                          ...credentials,
                          gibPassword: e.target.value,
                        })
                      }
                      placeholder="Enter GIB Portal password"
                      disabled={!settings.isEnabled}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          gibPassword: !showPasswords.gibPassword,
                        })
                      }
                    >
                      {showPasswords.gibPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select
                    value={settings.gibTestMode ? "test" : "production"}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        gibTestMode: value === "test",
                      })
                    }
                    disabled={!settings.isEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test Environment</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-url">GIB Portal URL</Label>
                  <Input
                    id="portal-url"
                    value={settings.gibPortalUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, gibPortalUrl: e.target.value })
                    }
                    disabled={!settings.isEnabled}
                  />
                </div>
              </div>

              {/* Certificate Settings */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Digital Certificate</h3>

                <div className="space-y-2">
                  <Label htmlFor="certificate-file">
                    Certificate File (P12/PFX)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="certificate-file"
                      type="file"
                      accept=".p12,.pfx"
                      onChange={handleCertificateUpload}
                      disabled={!settings.isEnabled}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!certificateFile}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                  </div>
                  {certificateFile && (
                    <p className="text-sm text-green-600">
                      Selected: {certificateFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate-password">
                    Certificate Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="certificate-password"
                      type={
                        showPasswords.certificatePassword ? "text" : "password"
                      }
                      value={credentials.certificatePassword}
                      onChange={(e) =>
                        setCredentials({
                          ...credentials,
                          certificatePassword: e.target.value,
                        })
                      }
                      placeholder="Enter certificate password"
                      disabled={!settings.isEnabled}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          certificatePassword:
                            !showPasswords.certificatePassword,
                        })
                      }
                    >
                      {showPasswords.certificatePassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {settings.certificateValidUntil && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        Certificate valid until:{" "}
                        {new Date(
                          settings.certificateValidUntil
                        ).toLocaleDateString("tr-TR")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Invoice Series Settings */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Invoice Series</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="series-prefix">Series Prefix</Label>
                    <Input
                      id="series-prefix"
                      value={settings.invoiceSeriesPrefix}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          invoiceSeriesPrefix: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="EMU"
                      maxLength={3}
                      disabled={!settings.isEnabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current-number">Current Number</Label>
                    <Input
                      id="current-number"
                      type="number"
                      value={settings.currentInvoiceNumber}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          currentInvoiceNumber: parseInt(e.target.value) || 1,
                        })
                      }
                      min={1}
                      disabled={!settings.isEnabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number-length">Number Length</Label>
                    <Select
                      value={settings.invoiceNumberLength.toString()}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          invoiceNumberLength: parseInt(value),
                        })
                      }
                      disabled={!settings.isEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6 digits</SelectItem>
                        <SelectItem value="8">8 digits</SelectItem>
                        <SelectItem value="10">10 digits</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-sm">
                    <span className="font-medium">Next invoice number: </span>
                    <code className="bg-white px-2 py-1 rounded text-blue-600">
                      {formatInvoiceNumber()}
                    </code>
                  </div>
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
                    !credentials.gibUsername ||
                    !credentials.gibPassword
                  }
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Connection
                    </>
                  )}
                </Button>

                <Button onClick={handleSaveSettings} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
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
                          GIB Portal connection successful!
                        </p>
                        <p>Status: {testResult.connectionStatus}</p>
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

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-vkn">Company VKN *</Label>
                  <div className="relative">
                    <Input
                      id="company-vkn"
                      value={settings.companyVkn}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          companyVkn: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder="1234567890"
                      maxLength={10}
                      disabled={!settings.isEnabled}
                    />
                    {getVknValidationStatus() && (
                      <div className="absolute right-2 top-2">
                        {getVknValidationStatus() === "valid" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    10-digit Tax ID number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-title">Company Title *</Label>
                  <Input
                    id="company-title"
                    value={settings.companyTitle}
                    onChange={(e) =>
                      setSettings({ ...settings, companyTitle: e.target.value })
                    }
                    placeholder="Company Ltd."
                    disabled={!settings.isEnabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-address">Address</Label>
                <Textarea
                  id="company-address"
                  value={settings.companyAddress}
                  onChange={(e) =>
                    setSettings({ ...settings, companyAddress: e.target.value })
                  }
                  placeholder="Company address"
                  rows={3}
                  disabled={!settings.isEnabled}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-district">District</Label>
                  <Input
                    id="company-district"
                    value={settings.companyDistrict}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        companyDistrict: e.target.value,
                      })
                    }
                    placeholder="Kadıköy"
                    disabled={!settings.isEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-city">City</Label>
                  <Input
                    id="company-city"
                    value={settings.companyCity}
                    onChange={(e) =>
                      setSettings({ ...settings, companyCity: e.target.value })
                    }
                    placeholder="İstanbul"
                    disabled={!settings.isEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-postal">Postal Code</Label>
                  <Input
                    id="company-postal"
                    value={settings.companyPostalCode || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        companyPostalCode: e.target.value,
                      })
                    }
                    placeholder="34000"
                    disabled={!settings.isEnabled}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={settings.companyEmail || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, companyEmail: e.target.value })
                    }
                    placeholder="info@company.com"
                    disabled={!settings.isEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone</Label>
                  <Input
                    id="company-phone"
                    value={settings.companyPhone || ""}
                    onChange={(e) =>
                      setSettings({ ...settings, companyPhone: e.target.value })
                    }
                    placeholder="+90 212 123 4567"
                    disabled={!settings.isEnabled}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-website">Website</Label>
                <Input
                  id="company-website"
                  value={settings.companyWebsite || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, companyWebsite: e.target.value })
                  }
                  placeholder="https://company.com"
                  disabled={!settings.isEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-create">Auto-create invoices</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create invoices when orders are completed
                    </p>
                  </div>
                  <Switch
                    id="auto-create"
                    checked={settings.autoCreateInvoice}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoCreateInvoice: checked })
                    }
                    disabled={!settings.isEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-send">Auto-send to GIB Portal</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send created invoices to GIB Portal
                    </p>
                  </div>
                  <Switch
                    id="auto-send"
                    checked={settings.autoSendInvoice}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoSendInvoice: checked })
                    }
                    disabled={!settings.isEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="invoice-on-payment">
                      Invoice on payment
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Create invoice when payment is received
                    </p>
                  </div>
                  <Switch
                    id="invoice-on-payment"
                    checked={settings.invoiceOnPayment}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, invoiceOnPayment: checked })
                    }
                    disabled={!settings.isEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="invoice-on-complete">
                      Invoice on order complete
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Create invoice when order is marked as complete
                    </p>
                  </div>
                  <Switch
                    id="invoice-on-complete"
                    checked={settings.invoiceOnOrderComplete}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        invoiceOnOrderComplete: checked,
                      })
                    }
                    disabled={!settings.isEnabled}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Archive Retention</Label>
                <Select
                  value={settings.archiveRetentionYears.toString()}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      archiveRetentionYears: parseInt(value),
                    })
                  }
                  disabled={!settings.isEnabled}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 years</SelectItem>
                    <SelectItem value="7">7 years</SelectItem>
                    <SelectItem value="10">10 years</SelectItem>
                    <SelectItem value="15">15 years</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How long to keep archived invoices (required by Turkish tax
                  law: minimum 5 years)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                {settings.isEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {settings.isEnabled ? "Enabled" : "Disabled"}
                </div>
                <p className="text-xs text-muted-foreground">
                  E-Fatura integration
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Environment
                </CardTitle>
                <Badge variant={settings.gibTestMode ? "secondary" : "default"}>
                  {settings.gibTestMode ? "Test" : "Production"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {settings.gibTestMode ? "Test Mode" : "Live Mode"}
                </div>
                <p className="text-xs text-muted-foreground">
                  GIB Portal environment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Next Invoice
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">
                  {formatInvoiceNumber()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Next invoice number
                </p>
              </CardContent>
            </Card>
          </div>

          {settings.lastArchiveDate && (
            <Card>
              <CardHeader>
                <CardTitle>Last Archive</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {new Date(settings.lastArchiveDate).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
