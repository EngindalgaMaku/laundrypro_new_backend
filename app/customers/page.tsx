"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CustomerDetailModal } from "@/components/customers/customer-detail-modal";
import { EnhancedCustomerMap } from "@/components/maps/enhanced-customer-map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DeleteConfirmationModal } from "@/components/ui/confirmation-modal";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { Download, Filter, MoreHorizontal, Pencil, Phone, Search, Trash2, UserPlus, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  totalSpentValue?: number;
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
          // /api/orders returns { orders, total, page, ... }
          const ordersData = await ordersResponse.json();
          const orders = Array.isArray(ordersData) ? ordersData : ordersData.orders ?? [];
          
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
            // _count is exact; the orders list above is paginated
            totalOrders: (dbCustomer as any)._count?.orders ?? stats.totalOrders,
            totalSpent: `₺${stats.totalSpent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            totalSpentValue: stats.totalSpent,
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
    return <div className="p-6 text-muted-foreground">Yükleniyor…</div>;
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
      // keep fields the edit modal does not carry (e.g. totalSpentValue)
      prev.map((c) => (c.id === updatedCustomer.id ? { ...c, ...updatedCustomer } : c))
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
            <PageHeader
              title="Müşteriler"
              description="Müşteri bilgilerini yönetin"
              actions={
                <Button onClick={() => router.push("/customers/create")} className="w-full sm:w-auto">
                  <UserPlus className="h-4 w-4" />
                  Yeni Müşteri
                </Button>
              }
            />

            {/* Search and tools */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="İsim, telefon veya e-posta ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button variant="outline">
                  <Filter className="h-4 w-4" />
                  Filtrele
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  Dışa Aktar
                </Button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Toplam Müşteri", value: customers.length.toLocaleString("tr-TR") },
                {
                  label: "Aktif Müşteri",
                  value: customers.filter((c) => c.status === "active").length.toLocaleString("tr-TR"),
                },
                {
                  label: "Toplam Sipariş",
                  value: customers.reduce((sum, c) => sum + c.totalOrders, 0).toLocaleString("tr-TR"),
                },
                {
                  label: "Toplam Ciro",
                  value: `₺${customers
                    .reduce((sum, c) => sum + (c.totalSpentValue ?? 0), 0)
                    .toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-card p-4 shadow-card">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground sm:text-2xl">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Customer List */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-foreground">Müşteri Listesi</h2>
                <p className="text-sm text-muted-foreground">{filteredCustomers.length} müşteri</p>
              </div>

              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                {filteredCustomers.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-3 font-semibold text-foreground">Müşteri bulunamadı</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Arama kriterlerinize uygun müşteri bulunmuyor.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredCustomers.map((customer) => (
                      <li
                        key={customer.id}
                        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                        onClick={() => router.push(`/customers/${customer.id}`)}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-primary">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-foreground">{customer.name}</span>
                            {customer.status !== "active" && (
                              <Badge variant="muted" className="shrink-0">Pasif</Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {[customer.phone, customer.address].filter(Boolean).join(" • ")}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            <span className="font-semibold tabular-nums text-foreground">{customer.totalSpent}</span>
                            {" • "}
                            {customer.totalOrders} sipariş • Son: {customer.lastOrder}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Müşteriyi ara"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCallCustomer(customer.phone);
                            }}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Diğer işlemler"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleCustomerDetail(customer)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
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
