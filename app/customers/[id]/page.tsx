"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { orderStatusLabel } from "@/lib/order-status";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MessageCircle, MessageSquare, Edit, Trash2, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { customerDeleteMessage } from "@/lib/customer-delete-message";
import { CustomerEditForm } from "@/components/customers/customer-edit-form";
import { CustomerMap } from "@/components/maps/customer-map";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { makePhoneCall, sendWhatsAppMessage, sendSMS } from "@/lib/communication";

interface User {
  id: string;
  email: string;
  businessName?: string;
  business: {
    name: string;
    businessType: string;
  };
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  customerType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  paidAmount?: number;
  remainingAmount?: number;
  createdAt: string;
  pickupDate?: string;
  deliveryDate?: string;
}

export default function CustomerDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalRemainingDebt, setTotalRemainingDebt] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(userData));
    fetchCustomerDetails();
  }, [router, customerId]);

  const fetchCustomerDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const customerResponse = await fetch(`/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        setCustomer(customerData);
      } else {
        toast.error("Müşteri bulunamadı");
        router.push("/customers");
        return;
      }

      const ordersResponse = await fetch(`/api/customers/${customerId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const orderList: Order[] = Array.isArray(ordersData)
          ? ordersData
          : ordersData.orders ?? [];
        setOrders(orderList);
        if (ordersData.stats) {
          setTotalRemainingDebt(Number(ordersData.stats.totalRemainingDebt || 0));
          setTotalSpent(Number(ordersData.stats.totalSpent || 0));
        } else {
          setTotalRemainingDebt(
            orderList.reduce((s, o) => s + Number(o.remainingAmount || 0), 0)
          );
          setTotalSpent(
            orderList.reduce((s, o) => s + Number(o.totalAmount || 0), 0)
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch customer details:", error);
      toast.error("Müşteri bilgileri yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  const formatMoney = (value: number) =>
    `₺${value.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleCall = () => {
    if (customer?.phone) {
      makePhoneCall(customer.phone);
    }
  };

  const handleWhatsApp = () => {
    if (customer?.whatsapp || customer?.phone) {
      sendWhatsAppMessage(customer.whatsapp || customer.phone);
    }
  };

  const handleSMS = () => {
    if (customer?.phone) {
      sendSMS(customer.phone);
    }
  };

  const handleRemindDebt = () => {
    if (!customer) return;
    const fullName = `${customer.firstName} ${customer.lastName}`.trim();
    const businessName = user?.business?.name || user?.businessName || "";
    const msg = `Merhaba ${fullName}, cari hesabınızda toplam ${formatMoney(
      totalRemainingDebt
    )} kalan bakiyeniz bulunmaktadır. İyi günler dileriz. ${businessName}`;
    sendWhatsAppMessage(customer.whatsapp || customer.phone, msg);
  };

  const handleEdit = () => setIsEditOpen(true);

  const handleDelete = async () => {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success(customerDeleteMessage(await response.json().catch(() => null)));
        router.push("/customers");
      } else {
        toast.error("Müşteri silinemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Müşteri bulunamadı</h2>
          <Button onClick={() => router.push("/customers")}>
            Müşteri Listesine Dön
          </Button>
        </div>
      </div>
    );
  }

  const fullAddress = [customer.address, customer.district, customer.city]
    .filter(Boolean)
    .join(", ");

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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/customers")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Geri
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    {customer.firstName} {customer.lastName}
                  </h1>
                  <p className="text-muted-foreground">Müşteri & Cari Detayları</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleCall}>
                  📞 Ara
                </Button>
                <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button variant="outline" size="sm" onClick={handleSMS}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  SMS
                </Button>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Düzenle
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sil
                </Button>
              </div>
            </div>

            {/* Customer Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>İletişim & Adres</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                  {customer.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">E-posta</p>
                      <p className="font-medium">{customer.email}</p>
                    </div>
                  )}
                  {(customer.address || customer.city) && (
                    <div>
                      <p className="text-sm text-muted-foreground">Adres</p>
                      <p className="font-medium">{fullAddress}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Cari Hesap / Bakiye Özeti
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Toplam İşlem Hacmi</span>
                    <span className="font-semibold">{formatMoney(totalSpent)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Kalan Borç (Veresiye)</span>
                    <span
                      className={`text-lg font-bold ${
                        totalRemainingDebt > 0 ? "text-red-600" : "text-emerald-600"
                      }`}
                    >
                      {totalRemainingDebt > 0
                        ? formatMoney(totalRemainingDebt)
                        : "₺0,00 (Borcu Yok)"}
                    </span>
                  </div>
                  {totalRemainingDebt > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={handleRemindDebt}
                    >
                      💬 WhatsApp ile Bakiye Hatırlat
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Genel Bilgiler</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Durum</p>
                    <Badge variant={customer.isActive ? "default" : "secondary"}>
                      {customer.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kayıt Tarihi</p>
                    <p className="font-medium">
                      {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                    <p className="font-medium">{orders.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Orders & Map Section */}
            <Tabs defaultValue="orders" className="space-y-4">
              <TabsList>
                <TabsTrigger value="orders">Siparişler ({orders.length})</TabsTrigger>
                <TabsTrigger value="map">Konum & Harita</TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Müşteri Siparişleri</CardTitle>
                        <CardDescription>
                          Siparişe tıklayarak detay ve tahsilat ekranını açabilirsiniz
                        </CardDescription>
                      </div>
                      <Button onClick={() => router.push(`/orders/create?customerId=${customerId}`)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Sipariş
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">
                          Bu müşteriye ait sipariş bulunmuyor
                        </p>
                        <Button onClick={() => router.push(`/orders/create?customerId=${customerId}`)}>
                          <Plus className="h-4 w-4 mr-2" />
                          İlk Siparişi Oluştur
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order) => {
                          const rem = Number(order.remainingAmount ?? 0);
                          return (
                            <div
                              key={order.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                              onClick={() => router.push(`/orders/${order.id}`)}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">#{order.orderNumber}</p>
                                  <Badge variant="outline">{orderStatusLabel(order.status)}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold">
                                  {formatMoney(Number(order.totalAmount))}
                                </p>
                                {rem > 0 ? (
                                  <p className="text-xs font-medium text-red-600">
                                    Kalan: {formatMoney(rem)}
                                  </p>
                                ) : (
                                  <p className="text-xs font-medium text-emerald-600">
                                    Ödendi
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="map">
                <CustomerMap
                  customer={{
                    name: `${customer.firstName} ${customer.lastName}`.trim(),
                    address: fullAddress || undefined,
                    latitude: customer.latitude,
                    longitude: customer.longitude,
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Müşteriyi Düzenle</DialogTitle>
          </DialogHeader>
          <CustomerEditForm
            customer={{
              id: customer.id,
              name: `${customer.firstName} ${customer.lastName}`.trim(),
              phone: customer.phone,
              email: customer.email || "",
              address: customer.address || "",
              city: customer.city,
              district: customer.district,
              latitude: customer.latitude,
              longitude: customer.longitude,
              totalOrders: orders.length,
              totalSpent: formatMoney(totalSpent),
              lastOrder: "",
              status: customer.isActive ? "active" : "inactive",
            }}
            onSave={() => {
              setIsEditOpen(false);
              fetchCustomerDetails();
            }}
            onCancel={() => setIsEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
