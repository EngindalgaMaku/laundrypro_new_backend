"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, UserCheck, UserX, Mail, Phone, UserPlus, Edit, Shield, Users, Eye } from "lucide-react";
import { SaveConfirmationModal, DeleteConfirmationModal } from "@/components/ui/confirmation-modal";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  email: string;
  business: {
    name: string;
    businessType: string;
  };
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  email: string;
  role: "OWNER" | "MANAGER" | "EMPLOYEE" | "DRIVER";
  isActive: boolean;
  createdAt: string;
  phone?: string;
}

const roleLabels: Record<TeamMember["role"], { label: string; color: string }> = {
  OWNER: { label: "İşletme Sahibi", color: "bg-purple-100 text-purple-800" },
  MANAGER: { label: "Yönetici", color: "bg-blue-100 text-blue-800" },
  EMPLOYEE: { label: "Çalışan", color: "bg-green-100 text-green-800" },
  DRIVER: { label: "Sürücü", color: "bg-orange-100 text-orange-800" },
};

const statusLabels = {
  ACTIVE: { label: "Aktif", color: "bg-green-100 text-green-800" },
  INACTIVE: { label: "Pasif", color: "bg-red-100 text-red-800" },
  PENDING: { label: "Beklemede", color: "bg-yellow-100 text-yellow-800" },
};

export default function UsersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [showAddConfirmModal, setShowAddConfirmModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [userToEdit, setUserToEdit] = useState<TeamMember | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "EMPLOYEE" as TeamMember["role"],
  });
  const router = useRouter();

  // DEBUG: Log sidebar state changes
  console.log("UsersPage - Sidebar States:", {
    isMobileMenuOpen,
    isSidebarCollapsed,
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(userData));
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const list: TeamMember[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
          ? data.users
          : [];
        setTeamMembers(list);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setShowAddConfirmModal(true);
  };

  const handleEditUser = (member: TeamMember) => {
    setUserToEdit(member);
    setIsEditUserOpen(true);
  };

  const handleSaveEdit = () => {
    setShowEditConfirmModal(true);
  };

  const confirmAddUser = async () => {
    setShowAddConfirmModal(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        toast.success("Kullanıcı başarıyla eklendi!");
        setNewUser({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          role: "EMPLOYEE",
        });
        setIsAddUserOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || "Kullanıcı eklenemedi");
      }
    } catch (error) {
      toast.error("Bir hata oluştu");
    }
  };

  const confirmEditUser = async () => {
    if (!userToEdit) return;
    
    setShowEditConfirmModal(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      console.log("Updating user:", userToEdit);

      const response = await fetch(`/api/users/${userToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: userToEdit.firstName,
          lastName: userToEdit.lastName,
          email: userToEdit.email,
          role: userToEdit.role,
          isActive: userToEdit.isActive,
        }),
      });

      console.log("Update response status:", response.status);
      const responseData = await response.json();
      console.log("Update response data:", responseData);

      if (response.ok) {
        toast.success("Kullanıcı başarıyla güncellendi!");
        setIsEditUserOpen(false);
        setUserToEdit(null);
        fetchUsers();
      } else {
        toast.error(responseData.error || "Kullanıcı güncellenemedi");
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Bir hata oluştu");
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setShowDeleteConfirmModal(false);

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success("Kullanıcı silindi!");
        fetchUsers();
      } else {
        toast.error("Kullanıcı silinemedi");
      }
    } catch (error) {
      toast.error("Bir hata oluştu");
    } finally {
      setUserToDelete(null);
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => {
          console.log("DEBUG: Users page sidebar closing");
          setIsMobileMenuOpen(false);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => {
          console.log("DEBUG: Users page sidebar collapse toggling");
          setIsSidebarCollapsed(!isSidebarCollapsed);
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => {
            console.log("DEBUG: Users page menu button clicked");
            setIsMobileMenuOpen(true);
          }}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Kullanıcı Yönetimi</h1>
                <p className="text-muted-foreground mt-1">
                  Ekip üyelerinizi yönetin ve yetkilendirin
                </p>
              </div>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Kullanıcı Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
                    <DialogDescription>
                      Ekibinize yeni bir üye ekleyin ve yetkilerini belirleyin
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Ad</Label>
                        <Input
                          id="firstName"
                          value={newUser.firstName}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              firstName: e.target.value,
                            })
                          }
                          placeholder="Ad"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Soyad</Label>
                        <Input
                          id="lastName"
                          value={newUser.lastName}
                          onChange={(e) =>
                            setNewUser({ ...newUser, lastName: e.target.value })
                          }
                          placeholder="Soyad"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-posta</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser({ ...newUser, email: e.target.value })
                        }
                        placeholder="kullanici@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Şifre</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) =>
                          setNewUser({ ...newUser, password: e.target.value })
                        }
                        placeholder="Geçici şifre"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rol</Label>
                      <Select
                        value={newUser.role}
                        onValueChange={(value) =>
                          setNewUser({
                            ...newUser,
                            role: value as TeamMember["role"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OWNER">İşletme Sahibi</SelectItem>
                          <SelectItem value="MANAGER">Yönetici</SelectItem>
                          <SelectItem value="EMPLOYEE">Çalışan</SelectItem>
                          <SelectItem value="DRIVER">Sürücü</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddUserOpen(false)}
                      >
                        İptal
                      </Button>
                      <Button
                        onClick={handleAddUser}
                        disabled={
                          !newUser.firstName ||
                          !newUser.email ||
                          !newUser.password
                        }
                      >
                        Kullanıcı Ekle
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit User Dialog */}
              <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Kullanıcı Düzenle</DialogTitle>
                    <DialogDescription>
                      Kullanıcı bilgilerini güncelleyin
                    </DialogDescription>
                  </DialogHeader>
                  {userToEdit && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="editFirstName">Ad</Label>
                          <Input
                            id="editFirstName"
                            value={userToEdit.firstName}
                            onChange={(e) =>
                              setUserToEdit({
                                ...userToEdit,
                                firstName: e.target.value,
                              })
                            }
                            placeholder="Ad"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="editLastName">Soyad</Label>
                          <Input
                            id="editLastName"
                            value={userToEdit.lastName}
                            onChange={(e) =>
                              setUserToEdit({ 
                                ...userToEdit, 
                                lastName: e.target.value 
                              })
                            }
                            placeholder="Soyad"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editEmail">E-posta</Label>
                        <Input
                          id="editEmail"
                          type="email"
                          value={userToEdit.email}
                          onChange={(e) =>
                            setUserToEdit({ 
                              ...userToEdit, 
                              email: e.target.value 
                            })
                          }
                          placeholder="kullanici@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editRole">Rol</Label>
                        <Select
                          value={userToEdit.role}
                          onValueChange={(value) =>
                            setUserToEdit({
                              ...userToEdit,
                              role: value as TeamMember["role"],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {userToEdit.role !== "OWNER" && (
                              <>
                                <SelectItem value="MANAGER">Yönetici</SelectItem>
                                <SelectItem value="EMPLOYEE">Çalışan</SelectItem>
                                <SelectItem value="DRIVER">Sürücü</SelectItem>
                              </>
                            )}
                            {userToEdit.role === "OWNER" && (
                              <SelectItem value="OWNER">İşletme Sahibi</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="editIsActive"
                          checked={userToEdit.isActive}
                          onChange={(e) =>
                            setUserToEdit({
                              ...userToEdit,
                              isActive: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        <Label htmlFor="editIsActive">Aktif kullanıcı</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditUserOpen(false);
                            setUserToEdit(null);
                          }}
                        >
                          İptal
                        </Button>
                        <Button
                          onClick={handleSaveEdit}
                          disabled={
                            !userToEdit.firstName ||
                            !userToEdit.email
                          }
                        >
                          Güncelle
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards - Compact Mobile Design */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="border-0 bg-muted/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-lg sm:text-2xl font-bold">
                        {teamMembers.length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Toplam Kullanıcı
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 bg-muted/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-green-600">
                        {teamMembers.filter((m) => m.isActive).length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Aktif Kullanıcı
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 bg-muted/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-yellow-600" />
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                        {teamMembers.filter((m) => !m.isActive).length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pasif Kullanıcı
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 bg-muted/30">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-blue-600">
                        {teamMembers.filter((m) => m.role === "OWNER" || m.role === "MANAGER").length}
                      </div>
                      <p className="text-xs text-muted-foreground">Yönetici</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList>
                <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
                <TabsTrigger value="roles">Roller & Yetkiler</TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle>Ekip Üyeleri</CardTitle>
                    <CardDescription>
                      İşletmenizde çalışan tüm kullanıcıları görüntüleyin ve
                      yönetin
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kullanıcı</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead>Kayıt Tarihi</TableHead>
                          <TableHead>İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {member.firstName} {member.lastName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {member.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={roleLabels[member.role].color}>
                                {roleLabels[member.role].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  member.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }
                              >
                                {member.isActive ? "Aktif" : "Pasif"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {member.phone || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(member.createdAt).toLocaleDateString(
                                "tr-TR"
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(member)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                {member.role !== "OWNER" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleDeleteUser(member.id, `${member.firstName} ${member.lastName}`)
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="roles">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Rol Tanımları</CardTitle>
                      <CardDescription>
                        Her rolün sahip olduğu yetkiler
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-purple-100 text-purple-800">
                            İşletme Sahibi
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Tüm yetkilere sahip, sistem yöneticisi
                        </p>
                        <ul className="text-xs text-muted-foreground ml-4 space-y-1">
                          <li>• Tüm modüllere erişim</li>
                          <li>• Kullanıcı yönetimi</li>
                          <li>• Sistem ayarları</li>
                          <li>• Faturalandırma</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            Yönetici
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Operasyonel yönetim yetkileri
                        </p>
                        <ul className="text-xs text-muted-foreground ml-4 space-y-1">
                          <li>• Sipariş yönetimi</li>
                          <li>• Müşteri yönetimi</li>
                          <li>• Raporlar</li>
                          <li>• Çalışan yönetimi</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-green-100 text-green-800">
                            Çalışan
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Günlük operasyon yetkileri
                        </p>
                        <ul className="text-xs text-muted-foreground ml-4 space-y-1">
                          <li>• Sipariş görüntüleme/düzenleme</li>
                          <li>• Durum güncelleme</li>
                          <li>• Müşteri iletişimi</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-gray-100 text-gray-800">
                            Görüntüleyici
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Sadece görüntüleme yetkisi
                        </p>
                        <ul className="text-xs text-muted-foreground ml-4 space-y-1">
                          <li>• Sipariş görüntüleme</li>
                          <li>• Rapor görüntüleme</li>
                          <li>• Müşteri bilgileri görüntüleme</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Güvenlik Ayarları</CardTitle>
                      <CardDescription>
                        Kullanıcı güvenliği ve erişim kontrolü
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Şifre Politikası</Label>
                        <p className="text-sm text-muted-foreground">
                          Minimum 8 karakter, büyük/küçük harf, sayı ve özel
                          karakter içermeli
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Oturum Süresi</Label>
                        <p className="text-sm text-muted-foreground">
                          Kullanıcılar 8 saat işlem yapmadıktan sonra otomatik
                          çıkış yapılır
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>İki Faktörlü Doğrulama</Label>
                        <p className="text-sm text-muted-foreground">
                          Yönetici ve üzeri roller için zorunlu
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>IP Kısıtlaması</Label>
                        <p className="text-sm text-muted-foreground">
                          Belirli IP adreslerinden erişim kısıtlaması
                          uygulanabilir
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Confirmation Modals */}
      <SaveConfirmationModal
        isOpen={showAddConfirmModal}
        onClose={() => setShowAddConfirmModal(false)}
        onConfirm={confirmAddUser}
        title="Yeni Kullanıcı Ekle"
        description="Yeni kullanıcı eklemek istediğinize emin misiniz? Kullanıcı eklendikten sonra giriş bilgileri e-posta ile gönderilecektir."
      />

      <SaveConfirmationModal
        isOpen={showEditConfirmModal}
        onClose={() => setShowEditConfirmModal(false)}
        onConfirm={confirmEditUser}
        title="Kullanıcı Güncelle"
        description="Kullanıcı bilgilerini güncellemek istediğinize emin misiniz?"
      />

      <DeleteConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        onConfirm={confirmDeleteUser}
        itemName={userToDelete?.name || ""}
        itemType="Kullanıcı"
      />
    </div>
  );
}
