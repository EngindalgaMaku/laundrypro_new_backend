"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface User {
  id: string;
  email: string;
  business?: any;
}

type FeedbackItem = {
  id: string;
  content: string | null;
  status: string;
  createdAt: string;
  sentBy: string | null;
};

type BusinessItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  isActive: boolean;
  createdAt: string;
  users: { id: string }[];
};

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // feedbacks state
  const [fbItems, setFbItems] = useState<FeedbackItem[]>([]);
  const [fbTotal, setFbTotal] = useState(0);
  const [fbPage, setFbPage] = useState(1);
  const [fbLimit] = useState(20);
  const [fbStatus, setFbStatus] = useState<string>("");
  const [fbLoading, setFbLoading] = useState(false);

  // businesses state
  const [bizItems, setBizItems] = useState<BusinessItem[]>([]);
  const [bizTotal, setBizTotal] = useState(0);
  const [bizPage, setBizPage] = useState(1);
  const [bizLimit] = useState(20);
  const [bizSearch, setBizSearch] = useState("");
  const [bizLoading, setBizLoading] = useState(false);

  const totalFbPages = useMemo(() => Math.max(1, Math.ceil(fbTotal / fbLimit)), [fbTotal, fbLimit]);
  const totalBizPages = useMemo(() => Math.max(1, Math.ceil(bizTotal / bizLimit)), [bizTotal, bizLimit]);

  // feedback detail modal state
  const [fbDetailOpen, setFbDetailOpen] = useState(false);
  const [fbDetail, setFbDetail] = useState<FeedbackItem | null>(null);
  const [fbNotes, setFbNotes] = useState<Array<{id:string;content:string|null;createdAt:string;sentBy:string|null}>>([]);
  const [newNote, setNewNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(u));
    try { localStorage.setItem('isAdmin','true'); } catch {}
  }, [router]);

  const fetchFeedbacks = async () => {
    try {
      setFbLoading(true);
      const token = localStorage.getItem("token");
      const qs = new URLSearchParams({ page: String(fbPage), limit: String(fbLimit), ...(fbStatus ? { status: fbStatus } : {}) }).toString();
      const resp = await fetch(`/api/admin/feedbacks?${qs}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Yüklenemedi");
      setFbItems(data.items || []);
      setFbTotal(data.total || 0);
    } catch (e) {
      console.error("feedbacks fetch error", e);
      alert("Geri bildirimler yüklenemedi");
    } finally {
      setFbLoading(false);
    }
  };

  const openFeedbackDetail = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`/api/admin/feedbacks/${id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Yüklenemedi');
      setFbDetail(data.item);
      setFbNotes(data.notes || []);
      setFbDetailOpen(true);
    } catch (e) {
      console.error('feedback detail error', e);
      alert('Detay yüklenemedi');
    }
  };

  const addFeedbackNote = async () => {
    if (!fbDetail || !newNote.trim()) return;
    try {
      setSendingNote(true);
      const token = localStorage.getItem("token");
      const resp = await fetch(`/api/admin/feedbacks/${fbDetail.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ content: newNote.trim() })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Kaydedilemedi');
      setFbNotes((prev) => [...prev, data.note]);
      setNewNote("");
    } catch (e) {
      console.error('add note error', e);
      alert('Not eklenemedi');
    } finally {
      setSendingNote(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      setBizLoading(true);
      const token = localStorage.getItem("token");
      const qs = new URLSearchParams({ page: String(bizPage), limit: String(bizLimit), ...(bizSearch ? { search: bizSearch } : {}) }).toString();
      const resp = await fetch(`/api/admin/businesses?${qs}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Yüklenemedi");
      setBizItems(data.items || []);
      setBizTotal(data.total || 0);
    } catch (e) {
      console.error("businesses fetch error", e);
      alert("İşletmeler yüklenemedi");
    } finally {
      setBizLoading(false);
    }
  };

  useEffect(() => { fetchFeedbacks(); /* eslint-disable-next-line */ }, [fbPage, fbStatus]);
  useEffect(() => { fetchBusinesses(); /* eslint-disable-next-line */ }, [bizPage]);

  const markFeedback = async (id: string, status: "RESOLVED" | "RECEIVED") => {
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch(`/api/admin/feedbacks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ id, status })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Güncellenemedi");
      fetchFeedbacks();
    } catch (e) {
      console.error("feedback update error", e);
      alert("Geri bildirim güncellenemedi");
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <>
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
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Yönetim Paneli</h1>
              <p className="text-muted-foreground mt-1">Geri bildirimleri ve işletmeleri yönetin</p>
            </div>

            <Tabs defaultValue="feedbacks" className="space-y-6">
              <TabsList>
                <TabsTrigger value="feedbacks">Geri Bildirimler</TabsTrigger>
                <TabsTrigger value="businesses">İşletmeler</TabsTrigger>
              </TabsList>

              <TabsContent value="feedbacks" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Geri Bildirimler</CardTitle>
                    <CardDescription>Kullanıcıların ilettiği hata/öneriler</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Button variant={fbStatus === '' ? 'default' : 'outline'} size="sm" onClick={() => { setFbStatus(''); setFbPage(1); }}>Tümü</Button>
                        <Button variant={fbStatus === 'RECEIVED' ? 'default' : 'outline'} size="sm" onClick={() => { setFbStatus('RECEIVED'); setFbPage(1); }}>Yeni</Button>
                        <Button variant={fbStatus === 'RESOLVED' ? 'default' : 'outline'} size="sm" onClick={() => { setFbStatus('RESOLVED'); setFbPage(1); }}>Çözülen</Button>
                      </div>
                      <div className="ml-auto text-sm text-muted-foreground">Toplam: {fbTotal}</div>
                    </div>

                    <div className="space-y-3">
                      {fbLoading ? (
                        <div>Yükleniyor...</div>
                      ) : fbItems.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Kayıt bulunamadı.</div>
                      ) : (
                        fbItems.map((item) => (
                          <div key={item.id} className="p-4 rounded-lg border flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={item.status === 'RESOLVED' ? 'default' : 'secondary'}>
                                  {item.status === 'RESOLVED' ? 'Çözüldü' : 'Yeni'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => openFeedbackDetail(item.id)}>Detay</Button>
                                {item.status !== 'RESOLVED' && (
                                  <Button size="sm" onClick={() => markFeedback(item.id, 'RESOLVED')}>Çözüldü İşaretle</Button>
                                )}
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap text-sm">{item.content}</div>
                            {item.sentBy && (
                              <div className="text-xs text-muted-foreground">Gönderen Kullanıcı ID: {item.sentBy}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {totalFbPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button size="sm" variant="outline" disabled={fbPage <= 1} onClick={() => setFbPage((p) => Math.max(1, p - 1))}>Önceki</Button>
                        <span className="text-sm">Sayfa {fbPage}/{totalFbPages}</span>
                        <Button size="sm" variant="outline" disabled={fbPage >= totalFbPages} onClick={() => setFbPage((p) => Math.min(totalFbPages, p + 1))}>Sonraki</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="businesses" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>İşletmeler</CardTitle>
                    <CardDescription>Kayıtlı işletmelerin listesi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                      <div className="flex items-center gap-2 w-full sm:w-72">
                        <Input placeholder="Ara: isim/e‑posta/telefon" value={bizSearch} onChange={(e) => setBizSearch(e.target.value)} />
                        <Button variant="outline" onClick={() => { setBizPage(1); fetchBusinesses(); }}>Ara</Button>
                      </div>
                      <div className="ml-auto text-sm text-muted-foreground">Toplam: {bizTotal}</div>
                    </div>
                    <div className="space-y-3">
                      {bizLoading ? (
                        <div>Yükleniyor...</div>
                      ) : bizItems.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Kayıt bulunamadı.</div>
                      ) : (
                        bizItems.map((b) => (
                          <div key={b.id} className="p-4 rounded-lg border">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="space-y-1">
                                <div className="font-medium">{b.name}</div>
                                <div className="text-xs text-muted-foreground">{b.email || "-"} • {b.phone || "-"}</div>
                                <div className="text-xs text-muted-foreground">{b.city || "-"} / {b.district || "-"}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={b.isActive ? 'default' : 'secondary'}>{b.isActive ? 'Aktif' : 'Pasif'}</Badge>
                                <span className="text-xs text-muted-foreground">Kullanıcı: {b.users?.length || 0}</span>
                                <span className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString()}</span>
                                <a href={`/admin/businesses/${b.id}`}>
                                  <Button size="sm" variant="outline">Detay</Button>
                                </a>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {totalBizPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <Button size="sm" variant="outline" disabled={bizPage <= 1} onClick={() => setBizPage((p) => Math.max(1, p - 1))}>Önceki</Button>
                        <span className="text-sm">Sayfa {bizPage}/{totalBizPages}</span>
                        <Button size="sm" variant="outline" disabled={bizPage >= totalBizPages} onClick={() => setBizPage((p) => Math.min(totalBizPages, p + 1))}>Sonraki</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>

    {/* Feedback Detail Modal */}
    <Dialog open={fbDetailOpen} onOpenChange={setFbDetailOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Geri Bildirim Detayı</DialogTitle>
          <DialogDescription>
            İçerik, durum ve admin iç notları
          </DialogDescription>
        </DialogHeader>
        {fbDetail ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between">
                <Badge variant={fbDetail!.status === 'RESOLVED' ? 'default' : 'secondary'}>
                  {fbDetail!.status === 'RESOLVED' ? 'Çözüldü' : 'Yeni'}
                </Badge>
                <span className="text-xs text-muted-foreground">{new Date(fbDetail!.createdAt).toLocaleString()}</span>
              </div>
              <div className="mt-2 text-sm whitespace-pre-wrap">{fbDetail!.content}</div>
              {fbDetail!.sentBy && (
                <div className="text-xs text-muted-foreground mt-2">Gönderen Kullanıcı ID: {fbDetail!.sentBy}</div>
              )}
            </div>
            <div>
              <div className="font-medium mb-2">İç Notlar</div>
              <div className="space-y-2 max-h-56 overflow-auto pr-1">
                {fbNotes.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Henüz not yok.</div>
                ) : (
                  fbNotes.map((n) => (
                    <div key={n.id} className="p-2 rounded border">
                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>Yazan: {n.sentBy || '-'}</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-sm mt-1 whitespace-pre-wrap">{n.content}</div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 space-y-2">
                <Textarea placeholder="İç not ekleyin" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                <div className="flex items-center justify-end">
                  <Button onClick={addFeedbackNote} disabled={sendingNote || !newNote.trim()}>
                    {sendingNote ? 'Kaydediliyor...' : 'Not Ekle'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>Yükleniyor...</div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setFbDetailOpen(false)}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
