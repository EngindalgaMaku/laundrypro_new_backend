"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";

const MIN_PASSWORD_LENGTH = 8;

function RequestLinkForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const result = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      setError(result?.error || "İstek gönderilemedi. Lütfen tekrar deneyin.");
      setStatus("idle");
      return;
    }
    setStatus("sent");
  };

  if (status === "sent") {
    return (
      <div className="space-y-4">
        <p className="text-foreground">
          Bu e-posta adresi kayıtlıysa birkaç dakika içinde bir sıfırlama bağlantısı alacaksınız.
          Gelen kutunuzu ve istenmeyen klasörünü kontrol edin.
        </p>
        <p className="text-sm text-muted-foreground">Bağlantı 1 saat geçerlidir.</p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Girişe dön</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">E-posta adresi</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@email.com"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full h-11" disabled={status === "sending"}>
        {status === "sending" ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </Button>
      <p className="text-center text-sm">
        <Link href="/" className="text-primary hover:underline">
          Girişe dön
        </Link>
      </p>
    </form>
  );
}

function NewPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH || password !== confirm) return;
    setError(null);
    setSaving(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    const result = await response?.json().catch(() => ({}));
    setSaving(false);
    if (!response?.ok) {
      setError(result?.error || "Şifre güncellenemedi. Lütfen tekrar deneyin.");
      return;
    }
    // Any session on this device belonged to the old password
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setDone(true);
  };

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-foreground">Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.</p>
        <Button className="w-full h-11" onClick={() => router.push("/")}>
          Giriş yap
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">Yeni şifre</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={tooShort}
        />
        <p className={tooShort ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          En az {MIN_PASSWORD_LENGTH} karakter.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Yeni şifre (tekrar)</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
        />
        {mismatch && <p className="text-sm text-destructive">Şifreler aynı değil.</p>}
      </div>
      {error && (
        <p className="text-sm text-destructive">
          {error}{" "}
          <Link href="/sifre-sifirla" className="underline">
            Yeni bağlantı iste
          </Link>
        </p>
      )}
      <Button
        type="submit"
        className="w-full h-11"
        disabled={saving || password.length < MIN_PASSWORD_LENGTH || password !== confirm}
      >
        {saving ? "Kaydediliyor…" : "Şifreyi güncelle"}
      </Button>
    </form>
  );
}

function ResetPasswordContent() {
  const token = useSearchParams().get("token");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{token ? "Yeni şifre belirleyin" : "Şifremi unuttum"}</CardTitle>
            <CardDescription>
              {token
                ? "Hesabınız için yeni bir şifre girin."
                : "Hesabınızın e-posta adresini girin; şifre sıfırlama bağlantısı gönderelim."}
            </CardDescription>
          </CardHeader>
          <CardContent>{token ? <NewPasswordForm token={token} /> : <RequestLinkForm />}</CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary for static rendering
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
