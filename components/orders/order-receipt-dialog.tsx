"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { encodeCode128B, generateQRMatrix } from "@/lib/qr-barcode";
import { Printer, QrCode, Tag, Receipt } from "lucide-react";

export interface PrintableOrderData {
  id: string;
  orderNumber: string;
  trackingToken?: string | null;
  businessName?: string;
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  date: string;
  deliveryDate?: string;
  amount: string;
  notes?: string;
  description?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
}

interface OrderReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PrintableOrderData;
}

export function QRCodeSVG({
  value,
  size = 132,
}: {
  value: string;
  size?: number;
}) {
  const matrix = useMemo(() => generateQRMatrix(value || "ORD"), [value]);
  const quietZone = 2;
  const totalModules = matrix.length + quietZone * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalModules} ${totalModules}`}
      shapeRendering="crispEdges"
      className="mx-auto block bg-white"
      aria-label={`QR: ${value}`}
    >
      <rect width={totalModules} height={totalModules} fill="#ffffff" />
      {matrix.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          cell ? (
            <rect
              key={`${rIdx}-${cIdx}`}
              x={cIdx + quietZone}
              y={rIdx + quietZone}
              width={1}
              height={1}
              fill="#000000"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export function Barcode128SVG({
  value,
  height = 44,
}: {
  value: string;
  height?: number;
}) {
  const bits = useMemo(() => encodeCode128B(value || "ORD"), [value]);
  if (!bits) return null;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${bits.length} ${height}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className="mx-auto block max-w-[240px] bg-white"
      aria-label={`Barkod: ${value}`}
    >
      <rect width={bits.length} height={height} fill="#ffffff" />
      {Array.from(bits).map((bit, idx) =>
        bit === "1" ? (
          <rect
            key={idx}
            x={idx}
            y={0}
            width={1}
            height={height}
            fill="#000000"
          />
        ) : null
      )}
    </svg>
  );
}

export function OrderReceiptDialog({
  open,
  onOpenChange,
  order,
}: OrderReceiptDialogProps) {
  const [mode, setMode] = useState<"receipt" | "tag">("receipt");
  const printAreaRef = useRef<HTMLDivElement>(null);

  // The QR holds the public tracking URL so customers can scan it with any phone camera;
  // the in-app scanner reads the token from /takip/<token> and opens the order
  const qrValue =
    order.trackingToken && typeof window !== "undefined" && window.location?.origin
      ? `${window.location.origin}/takip/${encodeURIComponent(order.trackingToken)}`
      : order.orderNumber;

  const handlePrint = () => {
    if (!printAreaRef.current) return;
    const printContents = printAreaRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=420,height=700");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="tr">
        <head>
          <meta charset="utf-8" />
          <title>Fiş - ${order.orderNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }
            * {
              box-sizing: border-box;
              font-family: 'Courier New', Courier, monospace, sans-serif;
              color: #000 !important;
            }
            body {
              margin: 0;
              padding: 8px;
              width: 72mm;
              background: #fff;
              font-size: 12px;
              line-height: 1.35;
            }
            .receipt-box {
              width: 100%;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .divider {
              border-top: 1px dashed #000;
              margin: 8px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
            }
            th, td {
              text-align: left;
              padding: 3px 0;
              font-size: 11px;
              vertical-align: top;
            }
            .right { text-align: right; }
            .tag-card {
              border: 2px solid #000;
              padding: 8px;
              margin-bottom: 10px;
              page-break-inside: avoid;
            }
            svg {
              display: block;
              margin: 6px auto;
            }
          </style>
        </head>
        <body>
          <div class="receipt-box">${printContents}</div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const itemsToRender =
    order.items && order.items.length > 0
      ? order.items
      : [{ name: order.description || "Yıkama / Temizlik Hizmeti", quantity: 1, price: order.amount }];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR / Barkod Fiş ve Etiket Yazdır
          </DialogTitle>
          <DialogDescription>
            Termal fiş (80mm) veya halı/ürün üzerine zımbalanan QR barkod etiketini yazdırın.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "receipt" | "tag")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receipt" className="gap-1.5">
              <Receipt className="h-4 w-4" />
              Müşteri Fişi (80mm)
            </TabsTrigger>
            <TabsTrigger value="tag" className="gap-1.5">
              <Tag className="h-4 w-4" />
              Halı / Ürün Etiketi
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Printable Preview Area */}
        <div className="rounded-lg border bg-white text-black p-4 shadow-inner font-mono text-xs">
          <div ref={printAreaRef}>
            {mode === "receipt" ? (
              <div className="space-y-2">
                <div className="text-center">
                  <div className="font-bold text-base uppercase tracking-wide">
                    {order.businessName || "LAUNDRYPRO İŞLETMESİ"}
                  </div>
                  <div className="text-[11px]">SİPARİŞ BİLGİ FİŞİ</div>
                </div>

                <div className="divider border-t border-dashed border-black my-2" />

                <div className="space-y-1 text-[11px]">
                  <div>
                    <span className="font-bold">FİŞ / SİPARİŞ NO:</span>{" "}
                    <span className="font-bold text-sm">{order.orderNumber}</span>
                  </div>
                  <div>
                    <span className="font-bold">TARİH:</span> {order.date}
                  </div>
                  {order.deliveryDate && (
                    <div>
                      <span className="font-bold">TESLİM TARİHİ:</span>{" "}
                      {order.deliveryDate}
                    </div>
                  )}
                  <div>
                    <span className="font-bold">MÜŞTERİ:</span>{" "}
                    {order.customer.name}
                  </div>
                  <div>
                    <span className="font-bold">TEL:</span>{" "}
                    {order.customer.phone}
                  </div>
                  {order.customer.address && (
                    <div>
                      <span className="font-bold">ADRES:</span>{" "}
                      {order.customer.address}
                    </div>
                  )}
                </div>

                <div className="divider border-t border-dashed border-black my-2" />

                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="text-left py-1">HİZMET / ÜRÜN</th>
                      <th className="text-left py-1">MİK.</th>
                      <th className="right text-right py-1">TUTAR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsToRender.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1 pr-2">{item.name}</td>
                        <td className="py-1 pr-2">{item.quantity}</td>
                        <td className="right text-right py-1">{item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="divider border-t border-dashed border-black my-2" />

                <div className="flex justify-between items-center font-bold text-sm">
                  <span>TOPLAM TUTAR:</span>
                  <span>{order.amount}</span>
                </div>

                {order.notes && (
                  <div className="text-[11px] pt-1">
                    <span className="font-bold">NOT:</span> {order.notes}
                  </div>
                )}

                <div className="divider border-t border-dashed border-black my-2" />

                <div className="text-center space-y-1.5 pt-1">
                  <QRCodeSVG value={qrValue} size={120} />
                  <div className="pt-1">
                    <Barcode128SVG value={order.orderNumber} height={38} />
                  </div>
                  <div className="font-bold tracking-widest text-xs">
                    {order.orderNumber}
                  </div>
                  <div className="text-[10px]">
                    Sipariş durumunu sorgulamak veya hızlı işlem için QR/Barkodu okutunuz.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {itemsToRender.map((item, idx) => (
                  <div
                    key={idx}
                    className="tag-card border-2 border-black p-3 rounded text-center space-y-1.5"
                  >
                    <div className="text-[10px] font-bold uppercase">
                      {order.businessName || "LAUNDRYPRO"} • PARÇA ETİKETİ ({idx + 1}/
                      {itemsToRender.length})
                    </div>
                    <div className="font-bold text-lg tracking-wider border-y border-black py-1">
                      {order.orderNumber}
                    </div>
                    <div className="text-left text-[11px] space-y-0.5 py-1">
                      <div>
                        <span className="font-bold">MÜŞTERİ:</span>{" "}
                        {order.customer.name}
                      </div>
                      <div>
                        <span className="font-bold">TEL:</span>{" "}
                        {order.customer.phone}
                      </div>
                      <div>
                        <span className="font-bold">ÜRÜN:</span> {item.name} (x
                        {item.quantity})
                      </div>
                    </div>
                    <QRCodeSVG value={qrValue} size={112} />
                    <Barcode128SVG value={order.orderNumber} height={34} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            {mode === "receipt" ? "Fişi Yazdır" : "Etiketleri Yazdır"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
