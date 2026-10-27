"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, MessageCircle, MapPin, Edit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
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
  totalAmount: number;
  createdAt: string;
  pickupDate?: string;
  deliveryDate?: string;
}

export default function CustomerDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

      // Fetch customer details
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

      // Fetch customer orders
      const ordersResponse = await fetch(`/api/customers/${customerId}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        // The API returns { customer, orders, stats }
        setOrders(Array.isArray(ordersData) ? ordersData : ordersData.orders ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch customer details:", error);
      toast.error("Müşteri bilgileri yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCall = () => {
    if (customer?.phone) {
      window.open(`tel:${customer.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (customer?.whatsapp || customer?.phone) {
      const phone = customer.whatsapp || customer.phone;
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}`);
    }
  };

  const handleEdit = () => {
    router.push(`/customers/${customerId}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Müşteri silindi");
        router.push("/customers");
      } else {
        toast.error("Müşteri silinemedi");
      }
    } catch (error) {
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
            {/* Header */}
            <div className="flex items-center justify-between">
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
                  <h1 className="text-3xl font-bold text-foreground">
                    {customer.firstName} {customer.lastName}
                  </h1>
                  <p className="text-muted-foreground">
                    Müşteri Detayları
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleCall}>
                  📞 Ara
                </Button>
                <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
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
                  <CardTitle>İletişim Bilgileri</CardTitle>
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
                  {customer.whatsapp && (
                    <div>
                      <p className="text-sm text-muted-foreground">WhatsApp</p>
                      <p className="font-medium">{customer.whatsapp}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Adres Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customer.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">Adres</p>
                      <p className="font-medium">{customer.address}</p>
                    </div>
                  )}
                  {customer.city && (
                    <div>
                      <p className="text-sm text-muted-foreground">Şehir/İlçe</p>
                      <p className="font-medium">
                        {customer.city} / {customer.district}
                      </p>
                    </div>
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

            {/* Orders Section */}
            <Tabs defaultValue="orders" className="space-y-4">
              <TabsList>
                <TabsTrigger value="orders">Siparişler ({orders.length})</TabsTrigger>
                <TabsTrigger value="history">Geçmiş</TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Müşteri Siparişleri</CardTitle>
                        <CardDescription>
                          Bu müşteriye ait tüm siparişler
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
                      <div className="space-y-4">
                        {orders.map((order) => (
                          <div
                            key={order.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            <div>
                              <p className="font-medium">#{order.orderNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{order.status}</Badge>
                              <p className="text-sm font-medium mt-1">
                                ₺{Number(order.totalAmount).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Müşteri Geçmişi</CardTitle>
                    <CardDescription>
                      Müşteri ile ilgili tüm aktiviteler
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Geçmiş kayıtları yakında eklenecek
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
