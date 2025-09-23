"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Route,
  Clock,
  Truck,
  Navigation,
  Phone,
  MessageSquare,
  Mail,
  Map,
} from "lucide-react";
import {
  makePhoneCall,
  sendWhatsAppMessage,
  sendEmail,
  communicationTemplates,
} from "@/lib/communication";

interface DeliveryOrder {
  id: string;
  customer: {
    name: string;
    address: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    latitude?: number;
    longitude?: number;
  };
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  status: "pending" | "in_route" | "delivered";
  orderNumber?: string;
}

interface DeliveryRoutePlannerProps {
  orders: DeliveryOrder[];
}

export function DeliveryRoutePlanner({ orders }: DeliveryRoutePlannerProps) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<DeliveryOrder[]>([]);

  const handleOrderSelection = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    }
  };

  const optimizeRoute = () => {
    const selected = orders.filter((order) =>
      selectedOrders.includes(order.id)
    );
    // Simple optimization: prioritize high priority orders first
    const optimized = selected.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    setOptimizedRoute(optimized);
  };

  const startNavigation = () => {
    if (optimizedRoute.length === 0) return;

    // Create waypoints for Google Maps with coordinates if available
    const waypoints = optimizedRoute
      .map((order) => {
        if (order.customer.latitude && order.customer.longitude) {
          return `${order.customer.latitude},${order.customer.longitude}`;
        }
        return encodeURIComponent(order.customer.address);
      })
      .join("/");

    const destination = optimizedRoute[optimizedRoute.length - 1].customer;
    const origin = optimizedRoute[0].customer;

    const destinationParam =
      destination.latitude && destination.longitude
        ? `${destination.latitude},${destination.longitude}`
        : encodeURIComponent(destination.address);

    const originParam =
      origin.latitude && origin.longitude
        ? `${origin.latitude},${origin.longitude}`
        : encodeURIComponent(origin.address);

    if (optimizedRoute.length === 1) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}`
      );
    } else {
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&waypoints=${waypoints}`
      );
    }
  };

  const openMapsForAddress = (order: DeliveryOrder) => {
    const address =
      order.customer.latitude && order.customer.longitude
        ? `${order.customer.latitude},${order.customer.longitude}`
        : encodeURIComponent(order.customer.address);

    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`);
  };

  const callCustomer = (order: DeliveryOrder) => {
    makePhoneCall(order.customer.phone);
  };

  const whatsappCustomer = (order: DeliveryOrder) => {
    const phone = order.customer.whatsapp || order.customer.phone;
    const message = order.orderNumber
      ? communicationTemplates.orderDelivery.whatsapp(
          order.customer.name,
          order.orderNumber,
          "yaklaşık 30 dakika içinde"
        )
      : `Merhaba ${order.customer.name}, siparişinizi teslim etmek için yola çıktık. Yaklaşık 30 dakika içinde orada olacağız.`;

    sendWhatsAppMessage(phone, message);
  };

  const emailCustomer = (order: DeliveryOrder) => {
    if (!order.customer.email) return;

    const subject = order.orderNumber
      ? `Sipariş Teslimi - ${order.orderNumber}`
      : "Sipariş Teslimi";

    const body = order.orderNumber
      ? communicationTemplates.orderDelivery.email.body(
          order.customer.name,
          order.orderNumber,
          "yaklaşık 30 dakika içinde"
        )
      : `Merhaba ${order.customer.name},\n\nSiparişinizi teslim etmek için yola çıktık. Yaklaşık 30 dakika içinde orada olacağız.\n\nTeşekkür ederiz.`;

    sendEmail(order.customer.email, subject, body);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Yüksek";
      case "medium":
        return "Orta";
      case "low":
        return "Düşük";
      default:
        return "Normal";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Teslimat Rotası Planlayıcısı
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={optimizeRoute}
              disabled={selectedOrders.length === 0}
              className="flex-1"
            >
              <Route className="h-4 w-4 mr-2" />
              Rotayı Optimize Et ({selectedOrders.length} sipariş)
            </Button>
            <Button
              onClick={startNavigation}
              disabled={optimizedRoute.length === 0}
              variant="outline"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Navigasyonu Başlat
            </Button>
          </div>

          {/* Order Selection */}
          <div className="space-y-2">
            <h4 className="font-medium">Teslimat Bekleyen Siparişler:</h4>
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center space-x-3 p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                <Checkbox
                  checked={selectedOrders.includes(order.id)}
                  onCheckedChange={(checked) =>
                    handleOrderSelection(order.id, checked as boolean)
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">
                      {order.customer.name}
                    </span>
                    <Badge className={getPriorityColor(order.priority)}>
                      {getPriorityLabel(order.priority)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {order.customer.address}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {order.estimatedTime}
                    </span>
                    <span>#{order.id}</span>
                    <span>{order.customer.phone}</span>
                  </div>
                </div>

                {/* Communication & Action Buttons - Mobile Responsive */}
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
                  {/* Primary Actions - Always visible */}
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-300"
                      onClick={() => callCustomer(order)}
                      title="📞 Ara"
                    >
                      <Phone className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                      onClick={() => openMapsForAddress(order)}
                      title="Haritada göster"
                    >
                      <Map className="h-3 w-3 text-blue-600" />
                    </Button>
                  </div>

                  {/* Secondary Actions - Hidden on small screens */}
                  <div className="hidden sm:flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 hover:bg-emerald-50 hover:border-emerald-300"
                      onClick={() => whatsappCustomer(order)}
                      title="WhatsApp gönder"
                    >
                      <MessageSquare className="h-3 w-3 text-emerald-600" />
                    </Button>
                    {order.customer.email && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 hover:bg-orange-50 hover:border-orange-300"
                        onClick={() => emailCustomer(order)}
                        title="E-posta gönder"
                      >
                        <Mail className="h-3 w-3 text-orange-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimized Route Display */}
      {optimizedRoute.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Optimize Edilmiş Rota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizedRoute.map((order, index) => (
                <div
                  key={order.id}
                  className="flex items-center space-x-3 p-3 bg-muted rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{order.customer.name}</span>
                      <Badge className={getPriorityColor(order.priority)}>
                        {getPriorityLabel(order.priority)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.customer.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">#{order.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.estimatedTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Toplam Durak:</strong> {optimizedRoute.length} •
                <strong> Tahmini Süre:</strong> {optimizedRoute.length * 15}{" "}
                dakika
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
