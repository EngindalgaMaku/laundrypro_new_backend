"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UserTop {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface OrderTop {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: string;
  status: string;
}

export default function AdminBusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = (params?.id as string) || "";

  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [users, setUsers] = useState<UserTop[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderTop[]>([]);

  const [effectivePlan, setEffectivePlan] = useState<"FREE" | "PRO">("FREE");
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(u));
  }, [router]);

  useEffect(() => {
    if (!businessId) return;
    const token = localStorage.getItem("token");

    const load = async () => {
      try {
        const [detailRes, planRes] = await Promise.all([
          fetch(`/api/admin/businesses/${businessId}`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          }),
          fetch(`/api/subscriptions/plan?businessId=${businessId}`),
        ]);

        const detail = await detailRes.json();
        const planData = await planRes.json();
        if (!detailRes.ok) throw new Error(detail?.error || "Detay yüklenemedi");
        setBusiness(detail.business);
        setSubscription(detail.subscription);
        setUsers(detail.users || []);
        setRecentOrders(detail.recentOrders || []);

        if (planData?.plan) setEffectivePlan(planData.plan);
      } catch (e) {
        console.error("business detail load error", e);
        alert("İşletme detayı yüklenemedi");
      } finally {
        setLoading(false);
        setLoadingPlan(false);
      }
    };

    load();
  }, [businessId]);

  const betaGranted = useMemo(() => {
    // Beta olarak PRO ise ve gerçek subscription yoksa
    return effectivePlan === "PRO" && !subscription;
  }, [effectivePlan, subscription]);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-foreground">İşletme Detayı</h1>
                <p className="text-muted-foreground mt-1">Genel bilgiler, plan ve son aktiviteler</p>
              </div>
              <div className="flex items-center gap-2">
                {loadingPlan ? (
                  <Badge variant="secondary">Plan Yükleniyor...</Badge>
                ) : effectivePlan === "PRO" ? (
                  <Badge className="bg-purple-600">PRO</Badge>
                ) : (
                  <Badge variant="secondary">FREE</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>İşletme Bilgileri</CardTitle>
                  <CardDescription>Temel iletişim ve adres</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div>Yükleniyor...</div>
                  ) : business ? (
                    <div className="space-y-2 text-sm">
                      <div><span className="text-muted-foreground">Ad: </span><span className="font-medium">{business.name}</span></div>
                      <div><span className="text-muted-foreground">E-posta: </span>{business.email || '-'}</div>
                      <div><span className="text-muted-foreground">Telefon: </span>{business.phone || '-'}</div>
                      <div><span className="text-muted-foreground">Adres: </span>{business.address || '-'}</div>
                      <div><span className="text-muted-foreground">Konum: </span>{business.city || '-'} / {business.district || '-'}</div>
                      <div><span className="text-muted-foreground">Kayıt: </span>{new Date(business.createdAt).toLocaleString()}</div>
                    </div>
                  ) : (
                    <div>Bulunamadı.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Plan Bilgisi</CardTitle>
                  <CardDescription>Abonelik durumu</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {loading ? (
                    <div>Yükleniyor...</div>
                  ) : (
                    <>
                      <div><span className="text-muted-foreground">Geçerli Plan: </span>
                        <span className="font-medium">{effectivePlan}</span></div>
                      {subscription ? (
                        <>
                          <div><span className="text-muted-foreground">Durum: </span>{subscription.status || '-'}</div>
                          <div><span className="text-muted-foreground">Sağlayıcı: </span>{subscription.provider || '-'}</div>
                          <div><span className="text-muted-foreground">Ürün: </span>{subscription.productId || '-'}</div>
                          <div><span className="text-muted-foreground">Dönem Bitiş: </span>{subscription.periodEnd ? new Date(subscription.periodEnd).toLocaleString() : '-'}</div>
                          <div><span className="text-muted-foreground">Son Doğrulama: </span>{subscription.lastVerifiedAt ? new Date(subscription.lastVerifiedAt).toLocaleString() : '-'}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-muted-foreground">Abonelik kaydı bulunamadı.</div>
                          {betaGranted && (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                              Beta döneminde olduğumuz için PRO yetkileri geçici olarak aktiftir.
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Kullanıcılar</CardTitle>
                  <CardDescription>İşletmeye bağlı kullanıcılar</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div>Yükleniyor...</div>
                  ) : users.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Kullanıcı bulunamadı.</div>
                  ) : (
                    <div className="space-y-2">
                      {users.map((u) => (
                        <div key={u.id} className="p-2 border rounded flex items-center justify-between text-sm">
                          <div>
                            <div className="font-medium">{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}</div>
                            <div className="text-muted-foreground text-xs">{u.email}</div>
                          </div>
                          <Badge variant="secondary">{u.role}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Son Siparişler</CardTitle>
                  <CardDescription>Son 10 sipariş</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div>Yükleniyor...</div>
                  ) : recentOrders.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Kayıt bulunamadı.</div>
                  ) : (
                    <div className="space-y-2">
                      {recentOrders.map((o) => (
                        <div key={o.id} className="p-2 border rounded flex items-center justify-between text-sm">
                          <div>
                            <div className="font-medium">{o.orderNumber}</div>
                            <div className="text-muted-foreground text-xs">{new Date(o.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="font-medium">₺{o.totalAmount}</div>
                          <Badge variant="secondary">{o.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-end">
              <Button variant="outline" onClick={() => router.push("/admin")}>Panele Dön</Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
