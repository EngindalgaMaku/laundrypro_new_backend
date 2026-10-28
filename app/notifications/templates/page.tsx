"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Mail, MessageSquare, Phone, Edit, Trash2, Plus, Eye } from "lucide-react"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  businessName: string
}

interface NotificationTemplate {
  id: string
  name: string
  type: "email" | "sms" | "whatsapp"
  trigger: string
  subject?: string
  content: string
  isActive: boolean
}

const triggerEvents = [
  { value: "order_created", label: "Sipariş Oluşturuldu" },
  { value: "order_confirmed", label: "Sipariş Onaylandı" },
  { value: "pickup_scheduled", label: "Alım Planlandı" },
  { value: "in_progress", label: "İşlemde" },
  { value: "ready_for_delivery", label: "Teslime Hazır" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "payment_received", label: "Ödeme Alındı" },
]

const templateVariables = [
  "#{customer_name}",
  "#{order_number}",
  "#{total_amount}",
  "#{pickup_date}",
  "#{delivery_date}",
  "#{delivery_address}",
  "#{business_name}",
  "#{business_phone}",
]

function mapApiTemplate(t: any): NotificationTemplate {
  const normalizedType = String(t.type || "email").toLowerCase()
  return {
    id: t.id,
    name: t.name,
    type:
      normalizedType === "sms" || normalizedType === "whatsapp"
        ? normalizedType
        : "email",
    trigger: String(t.trigger || "order_created").toLowerCase(),
    subject: t.subject || undefined,
    content: t.message ?? t.content ?? "",
    isActive: Boolean(t.isActive),
  }
}

export default function NotificationTemplatesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Partial<NotificationTemplate>>({})
  const router = useRouter()

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/notifications", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        setTemplates(data.map(mapApiTemplate))
      }
    } catch (err) {
      console.error("Failed to load notification templates:", err)
    }
  }

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))
    loadTemplates()
  }, [router])

  if (!user) {
    return <div className="p-6 text-muted-foreground">Yükleniyor…</div>
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <Phone className="h-4 w-4" />
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "email":
        return "bg-blue-100 text-blue-800"
      case "sms":
        return "bg-green-100 text-green-800"
      case "whatsapp":
        return "bg-emerald-100 text-emerald-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleSaveTemplate = async () => {
    const token = localStorage.getItem("token")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    try {
      if (editingTemplate.id) {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            id: editingTemplate.id,
            name: editingTemplate.name,
            type: editingTemplate.type,
            trigger: editingTemplate.trigger,
            subject: editingTemplate.subject,
            message: editingTemplate.content,
            isActive: editingTemplate.isActive,
          }),
        })
        if (!res.ok) throw new Error("Güncellenemedi")
        const data = await res.json()
        const updated = mapApiTemplate(data.template)
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        toast.success("Şablon güncellendi")
      } else {
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: editingTemplate.name || "",
            type: editingTemplate.type || "email",
            trigger: editingTemplate.trigger || "order_created",
            subject: editingTemplate.subject,
            message: editingTemplate.content || "",
            isActive: editingTemplate.isActive ?? true,
          }),
        })
        if (!res.ok) throw new Error("Oluşturulamadı")
        const data = await res.json()
        const created = mapApiTemplate(data.template)
        setTemplates((prev) => [...prev, created])
        toast.success("Şablon oluşturuldu")
      }
      setIsEditDialogOpen(false)
      setEditingTemplate({})
    } catch {
      toast.error("Şablon kaydedilirken hata oluştu")
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("Silinemedi")
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success("Şablon silindi")
    } catch {
      toast.error("Şablon silinirken hata oluştu")
    }
  }

  const handleToggleActive = async (id: string) => {
    const target = templates.find((t) => t.id === id)
    if (!target) return
    const nextActive = !target.isActive
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: nextActive } : t)))

    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, isActive: nextActive }),
      })
      if (!res.ok) throw new Error("Durum güncellenemedi")
    } catch {
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: target.isActive } : t)))
      toast.error("Şablon durumu güncellenemedi")
    }
  }

  const openEditDialog = (template?: NotificationTemplate) => {
    setEditingTemplate(template || {})
    setIsEditDialogOpen(true)
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById("template-content") as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentContent = editingTemplate.content || ""
      const newContent = currentContent.substring(0, start) + variable + currentContent.substring(end)
      setEditingTemplate((prev) => ({ ...prev, content: newContent }))

      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-semibold text-foreground">Bildirim Şablonları</h1>
                <p className="text-muted-foreground mt-1">Müşterilerinize gönderilecek otomatik bildirimleri yönetin</p>
              </div>
              <Button onClick={() => openEditDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Şablon
              </Button>
            </div>

            <Tabs defaultValue="all" className="space-y-6">
              <TabsList>
                <TabsTrigger value="all">Tümü</TabsTrigger>
                <TabsTrigger value="email">E-posta</TabsTrigger>
                <TabsTrigger value="sms">SMS</TabsTrigger>
                <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg ${getTypeColor(template.type)}`}>
                            {getTypeIcon(template.type)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription>
                              {triggerEvents.find((e) => e.value === template.trigger)?.label}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={template.isActive} onCheckedChange={() => handleToggleActive(template.id)} aria-label="Şablonu etkinleştir" />
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(template)} aria-label="Önizle">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)} aria-label="Düzenle">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template.id)} aria-label="Sil">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {template.subject && (
                      <CardContent className="pt-0">
                        <div className="text-sm text-muted-foreground">
                          <strong>Konu:</strong> {template.subject}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </TabsContent>

              {/* Type-specific tabs */}
              {["email", "sms", "whatsapp"].map((type) => (
                <TabsContent key={type} value={type} className="space-y-4">
                  {templates
                    .filter((t) => t.type === type)
                    .map((template) => (
                      <Card key={template.id}>
                        <CardHeader className="pb-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              <CardDescription>
                                {triggerEvents.find((e) => e.value === template.trigger)?.label}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={template.isActive}
                                onCheckedChange={() => handleToggleActive(template.id)}
                                aria-label="Şablonu etkinleştir"
                              />
                              <Badge variant={template.isActive ? "default" : "secondary"}>
                                {template.isActive ? "Aktif" : "Pasif"}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)} aria-label="Düzenle">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template.id)} aria-label="Sil">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        {template.subject && (
                          <CardContent className="pt-0">
                            <div className="text-sm text-muted-foreground">
                              <strong>Konu:</strong> {template.subject}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                </TabsContent>
              ))}
            </Tabs>

            {/* Template Preview Dialog */}
            {selectedTemplate && (
              <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{selectedTemplate.name}</DialogTitle>
                    <DialogDescription>
                      {triggerEvents.find((e) => e.value === selectedTemplate.trigger)?.label}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {selectedTemplate.subject && (
                      <div>
                        <Label className="text-sm font-medium">Konu</Label>
                        <div className="mt-1 p-3 bg-muted rounded-md text-sm">{selectedTemplate.subject}</div>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">İçerik</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                        {selectedTemplate.content}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Edit/Create Template Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTemplate.id ? "Şablonu Düzenle" : "Yeni Şablon Oluştur"}</DialogTitle>
                  <DialogDescription>Müşterilerinize gönderilecek bildirim şablonunu düzenleyin</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Şablon Adı</Label>
                        <Input
                          id="template-name"
                          value={editingTemplate.name || ""}
                          onChange={(e) => setEditingTemplate((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Örn: Sipariş Onayı - Email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-type">Bildirim Türü</Label>
                        <Select
                          value={editingTemplate.type || "email"}
                          onValueChange={(value) => setEditingTemplate((prev) => ({ ...prev, type: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">E-posta</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template-trigger">Tetikleyici Olay</Label>
                      <Select
                        value={editingTemplate.trigger || "order_created"}
                        onValueChange={(value) => setEditingTemplate((prev) => ({ ...prev, trigger: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {triggerEvents.map((event) => (
                            <SelectItem key={event.value} value={event.value}>
                              {event.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {editingTemplate.type === "email" && (
                      <div className="space-y-2">
                        <Label htmlFor="template-subject">Konu</Label>
                        <Input
                          id="template-subject"
                          value={editingTemplate.subject || ""}
                          onChange={(e) => setEditingTemplate((prev) => ({ ...prev, subject: e.target.value }))}
                          placeholder="Örn: Siparişiniz Onaylandı - #{order_number}"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="template-content">İçerik</Label>
                      <Textarea
                        id="template-content"
                        value={editingTemplate.content || ""}
                        onChange={(e) => setEditingTemplate((prev) => ({ ...prev, content: e.target.value }))}
                        placeholder="Şablon içeriğini yazın..."
                        rows={12}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="template-active"
                        checked={editingTemplate.isActive ?? true}
                        onCheckedChange={(checked) => setEditingTemplate((prev) => ({ ...prev, isActive: checked }))}
                      />
                      <Label htmlFor="template-active">Şablon aktif</Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Değişkenler</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Aşağıdaki değişkenleri şablonunuzda kullanabilirsiniz
                      </p>
                      <div className="grid gap-2">
                        {templateVariables.map((variable) => (
                          <Button
                            key={variable}
                            variant="outline"
                            size="sm"
                            className="justify-start text-xs bg-transparent"
                            onClick={() => insertVariable(variable)}
                          >
                            {variable}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Önizleme</Label>
                      <div className="mt-2 p-3 bg-muted rounded-md text-xs">
                        <div className="space-y-2">
                          {editingTemplate.subject && (
                            <div>
                              <strong>Konu:</strong> {editingTemplate.subject}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap">
                            {editingTemplate.content || "İçerik buraya gelecek..."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleSaveTemplate}>{editingTemplate.id ? "Güncelle" : "Oluştur"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}
