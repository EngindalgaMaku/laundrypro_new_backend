"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  Send,
  Eye,
  Zap,
  Activity,
  RefreshCw,
  Settings,
} from "lucide-react";

interface DashboardStats {
  connection: {
    status: "connected" | "disconnected" | "error";
    displayPhoneNumber?: string;
    qualityRating?: string;
    lastSync?: string;
    rateLimitHit?: boolean;
  };
  messages: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  templates: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    mostUsed?: Array<{
      name: string;
      count: number;
    }>;
  };
  activity: Array<{
    id: string;
    type: "message" | "template" | "webhook";
    description: string;
    timestamp: string;
    status: "success" | "error" | "warning";
  }>;
}

interface IntegrationDashboardProps {
  businessId: string;
  refreshInterval?: number; // in seconds
}

export default function IntegrationDashboard({
  businessId,
  refreshInterval = 30,
}: IntegrationDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();

    // Set up auto-refresh
    const interval = setInterval(() => {
      loadDashboardData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [businessId, refreshInterval]);

  const loadDashboardData = async () => {
    try {
      // Load WhatsApp settings (path-based)
      const settingsResponse = await fetch(
        `/api/whatsapp/settings/${businessId}`
      );
      const settingsData = await settingsResponse.json();

      // Load message statistics
      const statusResponse = await fetch(
        `/api/whatsapp/status?businessId=${businessId}&limit=1000`
      );
      const statusData = await statusResponse.json();

      // Load templates
      const templatesResponse = await fetch(
        `/api/whatsapp/templates?businessId=${businessId}`
      );
      const templatesData = await templatesResponse.json();

      // Process data into dashboard format
      const processedStats = processDashboardData(
        settingsData.settings,
        statusData,
        templatesData.templates?.database || []
      );

      setStats(processedStats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processDashboardData = (
    settings: any,
    statusData: any,
    templates: any[]
  ): DashboardStats => {
    const messages = statusData.messages || [];
    const stats = statusData.stats || [];

    // Calculate message statistics
    const messageStats = {
      total: messages.length,
      sent: messages.filter((m: any) => m.status === "sent").length,
      delivered: messages.filter((m: any) => m.status === "delivered").length,
      read: messages.filter((m: any) => m.status === "read").length,
      failed: messages.filter((m: any) => m.status === "failed").length,
      today: messages.filter((m: any) => {
        const messageDate = new Date(m.createdAt);
        const today = new Date();
        return messageDate.toDateString() === today.toDateString();
      }).length,
      thisWeek: messages.filter((m: any) => {
        const messageDate = new Date(m.createdAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return messageDate >= weekAgo;
      }).length,
      thisMonth: messages.filter((m: any) => {
        const messageDate = new Date(m.createdAt);
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return messageDate >= monthAgo;
      }).length,
    };

    // Calculate template statistics
    const templateStats = {
      total: templates.length,
      approved: templates.filter((t) => t.status === "approved").length,
      pending: templates.filter((t) => t.status === "pending").length,
      rejected: templates.filter((t) => t.status === "rejected").length,
      mostUsed: [], // This would come from template usage statistics
    };

    // Generate activity log
    const activity = [
      ...messages.slice(0, 5).map((m: any) => ({
        id: m.id,
        type: "message" as const,
        description: `${m.direction === "OUTGOING" ? "Sent" : "Received"} ${
          m.type
        } message`,
        timestamp: m.createdAt,
        status:
          m.status === "failed" ? ("error" as const) : ("success" as const),
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    return {
      connection: {
        status: settings?.isEnabled ? "connected" : "disconnected",
        displayPhoneNumber: settings?.displayPhoneNumber,
        qualityRating: settings?.qualityRating,
        lastSync: settings?.lastSync,
        rateLimitHit: settings?.rateLimitHit,
      },
      messages: messageStats,
      templates: templateStats,
      activity,
    };
  };

  const getQualityRatingColor = (rating?: string) => {
    switch (rating) {
      case "GREEN":
        return "text-green-600";
      case "YELLOW":
        return "text-yellow-600";
      case "RED":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getQualityRatingText = (rating?: string) => {
    switch (rating) {
      case "GREEN":
        return "High Quality";
      case "YELLOW":
        return "Medium Quality";
      case "RED":
        return "Low Quality";
      default:
        return "Unknown";
    }
  };

  const getDeliveryRate = () => {
    if (!stats || stats.messages.sent === 0) return 0;
    return Math.round((stats.messages.delivered / stats.messages.sent) * 100);
  };

  const getReadRate = () => {
    if (!stats || stats.messages.delivered === 0) return 0;
    return Math.round((stats.messages.read / stats.messages.delivered) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load dashboard data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-green-600" />
            WhatsApp Integration Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor your WhatsApp Business API integration performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Alert
        className={
          stats.connection.status === "connected"
            ? "border-green-200"
            : "border-red-200"
        }
      >
        {stats.connection.status === "connected" ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>
                WhatsApp API is{" "}
                {stats.connection.status === "connected"
                  ? "Connected"
                  : "Disconnected"}
              </strong>
              {stats.connection.displayPhoneNumber && (
                <p className="text-sm mt-1">
                  Phone: {stats.connection.displayPhoneNumber} | Quality:{" "}
                  <span
                    className={getQualityRatingColor(
                      stats.connection.qualityRating
                    )}
                  >
                    {getQualityRatingText(stats.connection.qualityRating)}
                  </span>
                </p>
              )}
            </div>
            {stats.connection.status !== "connected" && (
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Configure
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Rate Limit Warning */}
      {stats.connection.rateLimitHit && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Rate limit reached!</strong> Message sending may be
            temporarily restricted.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Messages Today
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.messages.today}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.messages.thisWeek} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Delivery Rate
                </CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getDeliveryRate()}%</div>
                <Progress value={getDeliveryRate()} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getReadRate()}%</div>
                <Progress value={getReadRate()} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.templates.approved}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.templates.pending} pending approval
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="messages">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Message Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Messages</span>
                  <Badge variant="outline">{stats.messages.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Sent</span>
                  <Badge className="bg-blue-500">{stats.messages.sent}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Delivered</span>
                  <Badge className="bg-green-500">
                    {stats.messages.delivered}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Read</span>
                  <Badge className="bg-purple-500">{stats.messages.read}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Failed</span>
                  <Badge variant="destructive">{stats.messages.failed}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Delivery Rate</span>
                    <span>{getDeliveryRate()}%</span>
                  </div>
                  <Progress value={getDeliveryRate()} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Read Rate</span>
                    <span>{getReadRate()}%</span>
                  </div>
                  <Progress value={getReadRate()} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Success Rate</span>
                    <span>
                      {stats.messages.total > 0
                        ? Math.round(
                            ((stats.messages.total - stats.messages.failed) /
                              stats.messages.total) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <Progress
                    value={
                      stats.messages.total > 0
                        ? ((stats.messages.total - stats.messages.failed) /
                            stats.messages.total) *
                          100
                        : 0
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Templates</span>
                  <Badge variant="outline">{stats.templates.total}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Approved</span>
                  <Badge className="bg-green-500">
                    {stats.templates.approved}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending</span>
                  <Badge className="bg-yellow-500">
                    {stats.templates.pending}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Rejected</span>
                  <Badge variant="destructive">
                    {stats.templates.rejected}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Usage</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.templates.mostUsed?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No template usage data available
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stats.templates.mostUsed?.map((template, index) => (
                      <div
                        key={template.name}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm">{template.name}</span>
                        <Badge variant="outline">{template.count} uses</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.activity.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.activity.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          item.status === "success"
                            ? "bg-green-500"
                            : item.status === "error"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          item.status === "success"
                            ? "default"
                            : item.status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {item.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
