"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  RefreshCw,
  User,
  Bot,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Phone,
} from "lucide-react";

interface WhatsAppMessage {
  id: string;
  messageId?: string;
  waId: string;
  direction: "INCOMING" | "OUTGOING";
  type: string;
  status: string;
  content?: string;
  templateName?: string;
  templateData?: string;
  timestamp?: string;
  createdAt: string;
  customer?: {
    firstName: string;
    lastName: string;
    phone: string;
    whatsapp?: string;
  };
  order?: {
    orderNumber: string;
    status: string;
  };
}

interface ConversationHistoryProps {
  businessId: string;
  customerId?: string;
  orderId?: string;
  height?: string;
}

export default function ConversationHistory({
  businessId,
  customerId,
  orderId,
  height = "600px",
}: ConversationHistoryProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [businessId, customerId, orderId, filter]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        businessId,
        limit: "100",
      });

      if (customerId) params.set("customerId", customerId);
      if (orderId) params.set("orderId", orderId);

      const response = await fetch(`/api/whatsapp/status?${params}`);
      const data = await response.json();

      if (data.success) {
        let filteredMessages = data.messages;

        if (filter !== "all") {
          filteredMessages = data.messages.filter(
            (msg: WhatsAppMessage) => msg.direction.toLowerCase() === filter
          );
        }

        setMessages(filteredMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load conversation history");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !customerId) return;

    setSending(true);
    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
          customerId,
          phoneNumber:
            messages[0]?.customer?.whatsapp || messages[0]?.customer?.phone,
          message: newMessage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewMessage("");
        toast.success("Message sent successfully");
        // Reload messages to show the new message
        setTimeout(() => loadMessages(), 1000);
      } else {
        toast.error(data.error || "Failed to send message");
      }
    } catch (error) {
      toast.error("An error occurred while sending message");
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("tr-TR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const getStatusIcon = (status: string, direction: string) => {
    if (direction === "INCOMING") {
      return <User className="h-3 w-3 text-blue-500" />;
    }

    switch (status) {
      case "sent":
        return <CheckCircle className="h-3 w-3 text-gray-400" />;
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-gray-600" />;
      case "read":
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = (status: string, direction: string) => {
    if (direction === "INCOMING") return "Received";

    switch (status) {
      case "sent":
        return "Sent";
      case "delivered":
        return "Delivered";
      case "read":
        return "Read";
      case "failed":
        return "Failed";
      default:
        return "Pending";
    }
  };

  const getMessageTypeLabel = (type: string, templateName?: string) => {
    if (templateName) {
      return `Template: ${templateName}`;
    }

    switch (type) {
      case "text":
        return "Text";
      case "template":
        return "Template";
      case "image":
        return "Image";
      case "document":
        return "Document";
      default:
        return type;
    }
  };

  return (
    <Card className="flex flex-col" style={{ height }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Conversation
            {messages.length > 0 && messages[0].customer && (
              <span className="text-sm text-muted-foreground">
                with {messages[0].customer.firstName}{" "}
                {messages[0].customer.lastName}
              </span>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadMessages}
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {messages.length > 0 && messages[0].customer && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {messages[0].customer.whatsapp || messages[0].customer.phone}
            </div>
            <div>Total messages: {messages.length}</div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {messages.length === 0 && !loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages found</p>
                  <p className="text-sm">
                    Start a conversation by sending a message
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.direction === "OUTGOING"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] ${
                      message.direction === "OUTGOING" ? "order-1" : "order-2"
                    }`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.direction === "OUTGOING"
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {message.type === "template" && message.templateName && (
                        <div className="text-xs opacity-75 mb-1">
                          📋 {message.templateName}
                        </div>
                      )}

                      <div className="break-words">
                        {message.content || "Template message"}
                      </div>

                      <div
                        className={`flex items-center justify-between mt-1 text-xs ${
                          message.direction === "OUTGOING"
                            ? "text-green-100"
                            : "text-gray-500"
                        }`}
                      >
                        <span>
                          {getMessageTypeLabel(
                            message.type,
                            message.templateName
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <span>
                            {formatTimestamp(
                              message.timestamp || message.createdAt
                            )}
                          </span>
                          {getStatusIcon(message.status, message.direction)}
                        </div>
                      </div>
                    </div>

                    {message.direction === "OUTGOING" && (
                      <div className="text-right mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            message.status === "read"
                              ? "border-blue-500 text-blue-600"
                              : message.status === "delivered"
                              ? "border-gray-500 text-gray-600"
                              : message.status === "failed"
                              ? "border-red-500 text-red-600"
                              : "border-gray-400 text-gray-500"
                          }`}
                        >
                          {getStatusText(message.status, message.direction)}
                        </Badge>
                      </div>
                    )}

                    {message.order && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Order: {message.order.orderNumber} (
                        {message.order.status})
                      </div>
                    )}
                  </div>

                  <Avatar
                    className={`w-8 h-8 ${
                      message.direction === "OUTGOING"
                        ? "order-2 ml-2"
                        : "order-1 mr-2"
                    }`}
                  >
                    <AvatarFallback
                      className={
                        message.direction === "OUTGOING"
                          ? "bg-green-500 text-white"
                          : "bg-gray-200"
                      }
                    >
                      {message.direction === "OUTGOING" ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Send Message Input */}
        {customerId && (
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={sending}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                size="sm"
              >
                {sending ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
