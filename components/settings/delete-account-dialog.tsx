"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CONFIRM_WORD = "SİL";

export function DeleteAccountDialog({
  open,
  onOpenChange,
  isOwner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const canDelete = password.length > 0 && confirmText.trim().toLocaleUpperCase("tr") === CONFIRM_WORD;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error || "Hesap silinemedi");
        return;
      }
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      toast.success("Hesabınız silindi");
      window.location.href = "/";
    } catch {
      toast.error("Bağlantı hatası: hesap silinemedi");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPassword("");
          setConfirmText("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hesabı sil</DialogTitle>
          <DialogDescription>Bu işlem geri alınamaz.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {isOwner ? (
              <>
                İşletme sahibi olduğunuz için <strong>işletmeniz ve tüm verileri</strong> kalıcı olarak silinir:
                siparişler, müşteriler, faturalar, hizmetler, rotalar ve işletmedeki diğer kullanıcılar.
                Yasal olarak saklamanız gereken faturaları silmeden önce indirin.
              </>
            ) : (
              <>
                Ad, e-posta ve telefon bilgileriniz silinir ve bu hesapla bir daha giriş yapılamaz. İşletmenin
                siparişleri ve kayıtları silinmez.
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-password">Şifreniz</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Onaylamak için <strong>{CONFIRM_WORD}</strong> yazın
            </Label>
            <Input
              id="delete-confirm"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Vazgeç
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || isDeleting}>
            {isDeleting ? "Siliniyor..." : "Hesabı kalıcı olarak sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
