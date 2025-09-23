"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CustomerDetailModal } from "@/components/customers/customer-detail-modal";
import { EnhancedCustomerMap } from "@/components/maps/enhanced-customer-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DeleteConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  email: string;
  businessTypes?: string[];
  businessType?: string;
  businessName: string;
  business: {
    name: string;
    businessType: string;
  };
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  totalOrders: number;
  totalSpent: string;
  lastOrder: string;
  status: "active" | "inactive";
  notes?: string;
  registrationDate?: string;
}

interface DatabaseCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  address: string | null;
  whatsapp: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CustomersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      // Fetch customers
      const customersResponse = await fetch("/api/customers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!customersResponse.ok) {
        throw new Error("Failed to fetch customers");
      }

      const dbCustomers: DatabaseCustomer[] = await customersResponse.json();

      // Fetch orders to calculate totals
      let customerOrderStats: { [customerId: string]: { totalOrders: number; totalSpent: number; lastOrderDate: string } } = {};
      
      try {
        const ordersResponse = await fetch("/api/orders", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (ordersResponse.ok) {
          const orders = await ordersResponse.json();
          
          // Calculate stats for each customer
          orders.forEach((order: any) => {
            const customerId = order.customerId;
            if (!customerOrderStats[customerId]) {
              customerOrderStats[customerId] = {
                totalOrders: 0,
                totalSpent: 0,
                lastOrderDate: order.createdAt
              };
            }
            
            customerOrderStats[customerId].totalOrders += 1;
            customerOrderStats[customerId].totalSpent += parseFloat(order.totalAmount || 0);
            
            // Update last order date if this order is more recent
            if (new Date(order.createdAt) > new Date(customerOrderStats[customerId].lastOrderDate)) {
              customerOrderStats[customerId].lastOrderDate = order.createdAt;
            }
          });
        }
      } catch (ordersError) {
        console.warn("Could not fetch orders for customer stats:", ordersError);
      }

      // Transform database customers to display format
      const transformedCustomers: Customer[] = dbCustomers.map(
        (dbCustomer) => {
          const stats = customerOrderStats[dbCustomer.id] || { totalOrders: 0, totalSpent: 0, lastOrderDate: dbCustomer.createdAt };
          
          return {
            id: dbCustomer.id,
            name: `${dbCustomer.firstName} ${dbCustomer.lastName}`,
            phone: dbCustomer.phone,
            email: dbCustomer.email || "",
            address: dbCustomer.address || "",
            totalOrders: stats.totalOrders,
            totalSpent: `₺${stats.totalSpent.toLocaleString('tr-TR')}`,
            lastOrder: new Date(stats.lastOrderDate).toLocaleDateString("tr-TR"),
            status: dbCustomer.isActive ? "active" : "inactive",
            registrationDate: new Date(dbCustomer.createdAt).toLocaleDateString(
              "tr-TR"
            ),
          };
        }
      );

      setCustomers(transformedCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(userData);
    // Ensure business field exists for Header component compatibility
    if (!parsedUser.business) {
      parsedUser.business = {
        name: parsedUser.businessName || "LaundryPro",
        businessType: parsedUser.businessType || "LAUNDRY",
      };
    }
    setUser(parsedUser);
    fetchCustomers();
  }, [router]);

  if (!user) {
    return <div>Loading...</div>;
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCallCustomer = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  const handleCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const handleCustomerUpdate = (updatedCustomer: Customer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
    );
    setSelectedCustomer(updatedCustomer);
  };

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    setCustomerToDelete({ id: customerId, name: customerName });
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    setShowDeleteConfirmModal(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        return;
      }

      const response = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Müşteri başarıyla silindi!");
      } else {
        toast.error("Müşteri silinirken hata oluştu");
      }

      fetchCustomers();
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error("Müşteri silinirken hata oluştu");
    } finally {
      setCustomerToDelete(null);
    }
  };

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
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
                  Müşteriler
                </h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  Müşteri bilgilerini yönetin
                </p>
              </div>
              <Button 
                onClick={() => router.push("/customers/create")}
                className="w-full sm:w-auto"
              >
                Yeni Müşteri
              </Button>
            </div>

            {/* Search and Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="lg:col-span-3">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <Input
                    className="pl-10"
                    placeholder="İsim, telefon veya e-posta ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <Button variant="outline">Filtrele</Button>
                <Button variant="outline">Dışa Aktar</Button>
              </div>
            </div>

            {/* Customer Stats - Compact Mobile Design */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-0 bg-muted/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-lg sm:text-2xl font-bold">{customers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Toplam Müşteri
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-muted/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-lg sm:text-2xl font-bold">
                    {customers.filter((c) => c.status === "active").length}
                  </div>
                  <p className="text-xs text-muted-foreground">Aktif Müşteri</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-muted/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-lg sm:text-2xl font-bold">
                    {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Toplam Sipariş
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-muted/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-lg sm:text-2xl font-bold">
                    ₺{customers.reduce((sum, c) => {
                      // totalSpent string'ini sayıya çevir (₺ işaretini kaldır)
                      const spent = parseFloat(c.totalSpent.replace(/[₺,]/g, '')) || 0;
                      return sum + spent;
                    }, 0).toLocaleString('tr-TR')}
                  </div>
                  <p className="text-xs text-muted-foreground">Toplam Ciro</p>
                </CardContent>
              </Card>
            </div>

            {/* Customer List */}
            <Card>
              <CardHeader>
                <CardTitle>Müşteri Listesi</CardTitle>
                <CardDescription>
                  {filteredCustomers.length} müşteri bulundu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-4"
                      onClick={() => router.push(`/customers/${customer.id}`)}
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm sm:text-base">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="font-medium text-sm sm:text-base truncate">{customer.name}</span>
                            <Badge
                              variant={
                                customer.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className="w-fit"
                            >
                              {customer.status === "active" ? "Aktif" : "Pasif"}
                            </Badge>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">
                            {customer.phone} • {customer.email}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground truncate">
                            {customer.address}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{customer.totalSpent}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.totalOrders} sipariş
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Son: {customer.lastOrder}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-2 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCallCustomer(customer.phone);
                            }}
                          >
                            📞 Ara
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs px-2 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerDetail(customer);
                            }}
                          >
                            Detay
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs px-2 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomer(customer.id, customer.name);
                            }}
                          >
                            Sil
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-muted-foreground">
                        <svg
                          className="mx-auto h-12 w-12 text-muted-foreground/50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium">
                          Müşteri bulunamadı
                        </h3>
                        <p className="mt-1 text-sm">
                          Arama kriterlerinize uygun müşteri bulunmuyor.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onUpdate={handleCustomerUpdate}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={confirmDeleteCustomer}
        itemName={customerToDelete?.name || ""}
        itemType="Müşteri"
      />
    </div>
  );
}
