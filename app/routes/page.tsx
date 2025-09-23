"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Route,
  Truck,
  MapPin,
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Navigation,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
} from "lucide-react";

import VehicleModal from "@/components/routes/VehicleModal";
import DeliveryZoneModal from "@/components/routes/DeliveryZoneModal";
import RouteModal from "@/components/routes/RouteModal";

interface User {
  id: string;
  email: string;
  business: {
    name: string;
    businessType: string;
  };
}

interface RouteItem {
  id: string;
  routeName: string;
  description?: string;
  vehicleId: string;
  startTime: string;
  status: "PLANNED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  vehicle: {
    plateNumber: string;
    brand: string;
    model: string;
  };
  driver: {
    name: string;
    phone: string;
  } | null;
  plannedDate: string;
  stopCount: number;
  totalDistance?: number;
  estimatedDuration?: number;
  stops: Array<{
    id?: string;
    address: string;
    customerName: string;
    customerPhone?: string;
    stopOrder: number;
    estimatedArrival?: string;
    notes?: string;
  }>;
}

interface VehicleItem {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: "AVAILABLE" | "IN_USE" | "MAINTENANCE";
  maxWeightKg: number;
  maxItemCount: number;
  notes?: string;
}

interface DeliveryZoneItem {
  id: string;
  name: string;
  city: string;
  district: string;
  coordinates?: string;
  isActive: boolean;
  serviceType: "PICKUP" | "DELIVERY" | "BOTH";
  vehicleCount: number;
  notes?: string;
}

export default function RoutesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZoneItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Modal states
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [deliveryZoneModalOpen, setDeliveryZoneModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<
    VehicleItem | undefined
  >();
  const [selectedZone, setSelectedZone] = useState<
    DeliveryZoneItem | undefined
  >();
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "vehicle" | "zone" | "route";
    id: string;
    name: string;
  } | null>(null);

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
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const [routesRes, vehiclesRes, zonesRes] = await Promise.all([
        fetch("/api/routes?limit=50", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/vehicles?limit=20", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/delivery-zones?limit=20", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (routesRes.ok) {
        const routesData = await routesRes.json();
        setRoutes(routesData.routes || []);
      }

      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(vehiclesData.vehicles || []);
      }

      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setDeliveryZones(zonesData.deliveryZones || []);
      }
    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PLANNED: {
        variant: "secondary" as const,
        icon: Calendar,
        color: "text-blue-600",
      },
      ASSIGNED: {
        variant: "default" as const,
        icon: Users,
        color: "text-purple-600",
      },
      IN_PROGRESS: {
        variant: "outline" as const,
        icon: Navigation,
        color: "text-orange-600",
      },
      COMPLETED: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600",
      },
      CANCELLED: {
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-red-600",
      },
    };

    const config =
      variants[status as keyof typeof variants] || variants.PLANNED;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getVehicleStatusBadge = (status: string) => {
    const variants = {
      AVAILABLE: { variant: "default" as const, color: "text-green-600" },
      IN_USE: { variant: "secondary" as const, color: "text-blue-600" },
      MAINTENANCE: { variant: "destructive" as const, color: "text-red-600" },
    };

    const config =
      variants[status as keyof typeof variants] || variants.AVAILABLE;

    return <Badge variant={config.variant}>{status}</Badge>;
  };

  const filteredRoutes = routes.filter((route) => {
    const matchesSearch =
      route.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.vehicle.plateNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || route.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // CRUD Functions
  const handleEditVehicle = (vehicle: VehicleItem) => {
    setSelectedVehicle({
      ...vehicle,
      year: vehicle.year || new Date().getFullYear(),
      color: vehicle.color || "",
    });
    setVehicleModalOpen(true);
  };

  const handleEditZone = (zone: DeliveryZoneItem) => {
    setSelectedZone(zone);
    setDeliveryZoneModalOpen(true);
  };

  const handleEditRoute = (route: RouteItem) => {
    setSelectedRoute({
      ...route,
      stops: route.stops || [],
      startTime: route.startTime || "08:00",
    });
    setRouteModalOpen(true);
  };

  const handleDeleteConfirm = (
    type: "vehicle" | "zone" | "route",
    id: string,
    name: string
  ) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem("token");
      const endpoints = {
        vehicle: `/api/vehicles/${deleteTarget.id}`,
        zone: `/api/delivery-zones/${deleteTarget.id}`,
        route: `/api/routes/${deleteTarget.id}`,
      };

      const response = await fetch(endpoints[deleteTarget.type], {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Silme işlemi başarısız");
      }

      toast({
        title: "Başarılı",
        description: `${deleteTarget.name} silindi`,
      });

      fetchData(); // Refresh data
    } catch (error) {
      toast({
        title: "Hata",
        description:
          error instanceof Error ? error.message : "Silme işlemi başarısız",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleModalClose = (modalType: "vehicle" | "zone" | "route") => {
    switch (modalType) {
      case "vehicle":
        setVehicleModalOpen(false);
        setSelectedVehicle(undefined);
        break;
      case "zone":
        setDeliveryZoneModalOpen(false);
        setSelectedZone(undefined);
        break;
      case "route":
        setRouteModalOpen(false);
        setSelectedRoute(undefined);
        break;
    }
  };

  const handleModalSuccess = () => {
    fetchData(); // Refresh data
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-muted-foreground">Yükleniyor...</span>
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
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                  <Route className="w-8 h-8 text-primary" />
                  Rota Planlama
                </h1>
                <p className="text-muted-foreground mt-1">
                  Araç rotalarını, teslimat bölgelerini ve sürücü atamalarını
                  yönetin
                </p>
              </div>
              <Button
                className="flex items-center gap-2"
                onClick={() => setRouteModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Yeni Rota Oluştur
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Aktif Rotalar
                      </p>
                      <p className="text-2xl font-bold">
                        {
                          routes.filter((r) => r.status === "IN_PROGRESS")
                            .length
                        }
                      </p>
                    </div>
                    <Navigation className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Toplam Araç
                      </p>
                      <p className="text-2xl font-bold">{vehicles.length}</p>
                    </div>
                    <Truck className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Teslimat Bölgesi
                      </p>
                      <p className="text-2xl font-bold">
                        {deliveryZones.length}
                      </p>
                    </div>
                    <MapPin className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Tamamlanan
                      </p>
                      <p className="text-2xl font-bold">
                        {routes.filter((r) => r.status === "COMPLETED").length}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Button
                variant="outline"
                className="flex items-center gap-2 h-20"
                onClick={() => setRouteModalOpen(true)}
              >
                <Route className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Yeni Rota</div>
                  <div className="text-xs text-muted-foreground">
                    Teslimat rotası oluştur
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 h-20"
                onClick={() => setVehicleModalOpen(true)}
              >
                <Truck className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Araç Ekle</div>
                  <div className="text-xs text-muted-foreground">
                    Yeni araç kaydı
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="flex items-center gap-2 h-20"
                onClick={() => setDeliveryZoneModalOpen(true)}
              >
                <MapPin className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-semibold">Bölge Ekle</div>
                  <div className="text-xs text-muted-foreground">
                    Teslimat bölgesi tanımla
                  </div>
                </div>
              </Button>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="routes" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="grid grid-cols-3 w-fit">
                  <TabsTrigger value="routes">
                    Rotalar ({routes.length})
                  </TabsTrigger>
                  <TabsTrigger value="vehicles">
                    Araçlar ({vehicles.length})
                  </TabsTrigger>
                  <TabsTrigger value="zones">
                    Bölgeler ({deliveryZones.length})
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setVehicleModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Araç
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeliveryZoneModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Bölge
                  </Button>
                  <Button size="sm" onClick={() => setRouteModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Rota
                  </Button>
                </div>
              </div>

              {/* Routes Tab */}
              <TabsContent value="routes" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Rota adı veya plaka ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Durum filtrele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="PLANNED">Planlandı</SelectItem>
                      <SelectItem value="ASSIGNED">Atandı</SelectItem>
                      <SelectItem value="IN_PROGRESS">Devam Ediyor</SelectItem>
                      <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
                      <SelectItem value="CANCELLED">İptal Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4">
                  {filteredRoutes.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Route className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                          Henüz rota bulunmuyor
                        </h3>
                        <p className="text-gray-500 text-center mb-4">
                          İlk rotanızı oluşturmak için "Yeni Rota Oluştur"
                          butonuna tıklayın
                        </p>
                        <Button onClick={() => setRouteModalOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Yeni Rota Oluştur
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredRoutes.map((route) => (
                      <Card
                        key={route.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg">
                                  {route.routeName}
                                </h3>
                                {getStatusBadge(route.status)}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  {route.vehicle.plateNumber} -{" "}
                                  {route.vehicle.brand} {route.vehicle.model}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(
                                    route.plannedDate
                                  ).toLocaleDateString("tr-TR")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {route.stopCount} durak
                                </div>
                                {route.driver && (
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    {route.driver.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRoute(route)}
                              >
                                Düzenle
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleEditRoute(route)}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Düzenle
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteConfirm(
                                        "route",
                                        route.id,
                                        route.routeName
                                      )
                                    }
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Sil
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Vehicles Tab */}
              <TabsContent value="vehicles" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {vehicles.length === 0 ? (
                    <div className="col-span-full">
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <Truck className="w-16 h-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">
                            Henüz araç bulunmuyor
                          </h3>
                          <p className="text-gray-500 text-center mb-4">
                            İlk aracınızı eklemek için "Araç Ekle" butonuna
                            tıklayın
                          </p>
                          <Button onClick={() => setVehicleModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Araç Ekle
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    vehicles.map((vehicle) => (
                      <Card key={vehicle.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between">
                            <span>{vehicle.plateNumber}</span>
                            {getVehicleStatusBadge(vehicle.status)}
                          </CardTitle>
                          <CardDescription>
                            {vehicle.brand} {vehicle.model}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Max Ağırlık:
                              </span>
                              <span>{vehicle.maxWeightKg} kg</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Max Parça:
                              </span>
                              <span>{vehicle.maxItemCount} adet</span>
                            </div>
                          </div>
                        </CardContent>
                        <div className="px-4 pb-4">
                          <div className="flex justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditVehicle(vehicle)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Düzenle
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteConfirm(
                                  "vehicle",
                                  vehicle.id,
                                  vehicle.plateNumber
                                )
                              }
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Sil
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Delivery Zones Tab */}
              <TabsContent value="zones" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {deliveryZones.length === 0 ? (
                    <div className="col-span-full">
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <MapPin className="w-16 h-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">
                            Henüz teslimat bölgesi bulunmuyor
                          </h3>
                          <p className="text-gray-500 text-center mb-4">
                            İlk teslimat bölgenizi eklemek için "Bölge Ekle"
                            butonuna tıklayın
                          </p>
                          <Button
                            onClick={() => setDeliveryZoneModalOpen(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Bölge Ekle
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    deliveryZones.map((zone) => (
                      <Card key={zone.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="flex items-center justify-between">
                            <span>{zone.name}</span>
                            <Badge
                              variant={zone.isActive ? "default" : "secondary"}
                            >
                              {zone.isActive ? "Aktif" : "Pasif"}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {zone.city} / {zone.district}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Atanmış Araç:
                            </span>
                            <span>{zone.vehicleCount} adet</span>
                          </div>
                        </CardContent>
                        <div className="px-4 pb-4">
                          <div className="flex justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditZone(zone)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Düzenle
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteConfirm("zone", zone.id, zone.name)
                              }
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Sil
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Modals */}
            <VehicleModal
              open={vehicleModalOpen}
              onOpenChange={(open) => !open && handleModalClose("vehicle")}
              vehicle={selectedVehicle}
              onSuccess={handleModalSuccess}
            />

            <DeliveryZoneModal
              open={deliveryZoneModalOpen}
              onOpenChange={(open) => !open && handleModalClose("zone")}
              zone={selectedZone}
              onSuccess={handleModalSuccess}
            />

            <RouteModal
              open={routeModalOpen}
              onOpenChange={(open) => !open && handleModalClose("route")}
              route={selectedRoute}
              onSuccess={handleModalSuccess}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Silme Onayı</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{deleteTarget?.name}" adlı{" "}
                    {deleteTarget?.type === "vehicle"
                      ? "aracı"
                      : deleteTarget?.type === "zone"
                      ? "teslimat bölgesini"
                      : "rotayı"}{" "}
                    silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={executeDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </main>
      </div>
    </div>
  );
}
