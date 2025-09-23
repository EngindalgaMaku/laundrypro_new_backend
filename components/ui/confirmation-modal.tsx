"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Info, XCircle, Trash2, Save, AlertCircle } from "lucide-react";

export type ConfirmationType = "danger" | "warning" | "info" | "success";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
  isLoading?: boolean;
}

const typeConfig = {
  danger: {
    icon: XCircle,
    iconColor: "text-red-500",
    confirmButtonVariant: "destructive" as const,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
    confirmButtonVariant: "default" as const,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-500",
    confirmButtonVariant: "default" as const,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    confirmButtonVariant: "default" as const,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
};

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Onayla",
  cancelText = "İptal",
  type = "warning",
  isLoading = false,
}: ConfirmationModalProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${config.bgColor} ${config.borderColor} border`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={config.confirmButtonVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>İşleniyor...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Specific confirmation modals for common use cases
interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: string;
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = "öğe",
  isLoading = false,
}: DeleteConfirmationProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`${itemType} Sil`}
      description={`"${itemName}" ${itemType.toLowerCase()}sini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
      confirmText="Sil"
      cancelText="İptal"
      type="danger"
      isLoading={isLoading}
    />
  );
}

interface SaveConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export function SaveConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Değişiklikleri Kaydet",
  description = "Yaptığınız değişiklikleri kaydetmek istediğinize emin misiniz?",
  isLoading = false,
}: SaveConfirmationProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      confirmText="Kaydet"
      cancelText="İptal"
      type="info"
      isLoading={isLoading}
    />
  );
}
