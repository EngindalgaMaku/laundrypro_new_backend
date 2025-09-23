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

export default function NotificationTemplatesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: "1",
      name: "Sipariş Onayı - Email",
      type: "email",
      trigger: "order_confirmed",
      subject: "Siparişiniz Onaylandı - #{order_number}",
      content:
        "Merhaba #{customer_name},\n\nSiparişiniz başarıyla onaylanmıştır.\n\nSipariş No: #{order_number}\nToplam Tutar: #{total_amount} TL\nTeslim Tarihi: #{delivery_date}\n\nTeşekkür ederiz,\n#{business_name}",
      isActive: true,
    },
    {
      id: "2",
      name: "Sipariş Onayı - SMS",
      type: "sms",
      trigger: "order_confirmed",
      content:
        "#{business_name}: Siparişiniz onaylandı. Sipariş No: #{order_number}. Teslim: #{delivery_date}. Bilgi: #{business_phone}",
      isActive: true,
    },
    {
      id: "3",
      name: "Hazır - WhatsApp",
      type: "whatsapp",
      trigger: "ready_for_delivery",
      content:
        "Merhaba #{customer_name}! 🎉\n\nSiparişiniz hazır!\nSipariş No: #{order_number}\n\nTeslimat için sizinle iletişime geçeceğiz.\n\n#{business_name}",
      isActive: true,
    },
  ])
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Partial<NotificationTemplate>>({})
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  if (!user) {
    return <div>Loading...</div>
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

  const handleSaveTemplate = () => {
    if (editingTemplate.id) {
      // Update existing template
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate.id ? ({ ...t, ...editingTemplate } as NotificationTemplate) : t)),
      )
    } else {
      // Create new template
      const newTemplate: NotificationTemplate = {
        id: Date.now().toString(),
        name: editingTemplate.name || "",
        type: editingTemplate.type || "email",
        trigger: editingTemplate.trigger || "order_created",
        subject: editingTemplate.subject,
        content: editingTemplate.content || "",
        isActive: editingTemplate.isActive ?? true,
      }
      setTemplates((prev) => [...prev, newTemplate])
    }
    setIsEditDialogOpen(false)
    setEditingTemplate({})
  }

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const handleToggleActive = (id: string) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)))
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
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
                          <Switch checked={template.isActive} onCheckedChange={() => handleToggleActive(template.id)} />
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Aktif" : "Pasif"}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(template)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
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
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              <CardDescription>
                                {triggerEvents.find((e) => e.value === template.trigger)?.label}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={template.isActive}
                                onCheckedChange={() => handleToggleActive(template.id)}
                              />
                              <Badge variant={template.isActive ? "default" : "secondary"}>
                                {template.isActive ? "Aktif" : "Pasif"}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
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
