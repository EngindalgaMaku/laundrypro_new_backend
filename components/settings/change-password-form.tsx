"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Settings > Güvenlik: POST /api/auth/change-password */
export function ChangePasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isSaving, setIsSaving] = useState(false);
  const mismatch = form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword;
  const tooShort = form.newPassword.length > 0 && form.newPassword.length < 8;
  const canSave = form.currentPassword && form.newPassword.length >= 8 && form.newPassword === form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error || "Şifre değiştirilemedi");
        return;
      }
      toast.success("Şifreniz değiştirildi");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast.error("Bağlantı hatası: şifre değiştirilemedi");
    } finally {
      setIsSaving(false);
    }
  };

  const field = (id: keyof typeof form, label: string, autoComplete: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={form[id]}
        onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {field("currentPassword", "Mevcut şifre", "current-password")}
      {field("newPassword", "Yeni şifre", "new-password")}
      {tooShort && <p className="text-sm text-destructive">Yeni şifre en az 8 karakter olmalı.</p>}
      {field("confirmPassword", "Yeni şifre (tekrar)", "new-password")}
      {mismatch && <p className="text-sm text-destructive">Şifreler eşleşmiyor.</p>}
      <Button type="submit" disabled={!canSave || isSaving}>
        {isSaving ? "Kaydediliyor..." : "Şifreyi Değiştir"}
      </Button>
    </form>
  );
}
