"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare,
  Plus,
  Trash2,
  Eye,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO";
  text?: string;
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface Template {
  id?: string;
  name: string;
  displayName: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  status: string;
  components: TemplateComponent[];
  variables?: Record<string, string>;
  isActive: boolean;
}

interface TemplateEditorProps {
  businessId: string;
  templateId?: string;
  onSave?: (template: Template) => void;
  onCancel?: () => void;
}

export default function TemplateEditor({
  businessId,
  templateId,
  onSave,
  onCancel,
}: TemplateEditorProps) {
  const [template, setTemplate] = useState<Template>({
    name: "",
    displayName: "",
    category: "UTILITY",
    language: "tr",
    status: "pending",
    components: [
      {
        type: "BODY",
        text: "",
      },
    ],
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  useEffect(() => {
    generatePreview();
    validateTemplate();
  }, [template]);

  const loadTemplate = async () => {
    try {
      const response = await fetch(
        `/api/whatsapp/templates?businessId=${businessId}`
      );
      const data = await response.json();

      if (data.success) {
        const existingTemplate = data.templates.database.find(
          (t: Template) => t.id === templateId
        );
        if (existingTemplate) {
          setTemplate({
            ...existingTemplate,
            components: JSON.parse(existingTemplate.components as any),
          });
        }
      }
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Failed to load template");
    }
  };

  const validateTemplate = () => {
    const errors: string[] = [];

    if (!template.name.trim()) {
      errors.push("Template name is required");
    } else if (!/^[a-z][a-z0-9_]*$/.test(template.name)) {
      errors.push(
        "Template name must start with lowercase letter and contain only lowercase letters, numbers, and underscores"
      );
    }

    if (!template.displayName.trim()) {
      errors.push("Display name is required");
    }

    const hasBody = template.components.some((comp) => comp.type === "BODY");
    if (!hasBody) {
      errors.push("Template must have at least one BODY component");
    }

    template.components.forEach((component, index) => {
      if (component.type === "BODY" && !component.text?.trim()) {
        errors.push(`Body component at position ${index + 1} must have text`);
      }

      if (
        component.type === "HEADER" &&
        component.format === "TEXT" &&
        !component.text?.trim()
      ) {
        errors.push(`Header component at position ${index + 1} must have text`);
      }

      if (component.type === "BUTTONS") {
        if (!component.buttons || component.buttons.length === 0) {
          errors.push(
            `Button component at position ${
              index + 1
            } must have at least one button`
          );
        } else if (component.buttons.length > 10) {
          errors.push(
            `Button component at position ${
              index + 1
            } cannot have more than 10 buttons`
          );
        }

        component.buttons?.forEach((button, buttonIndex) => {
          if (!button.text.trim()) {
            errors.push(
              `Button ${buttonIndex + 1} in component ${
                index + 1
              } must have text`
            );
          }
          if (button.type === "URL" && !button.url?.trim()) {
            errors.push(
              `URL button ${buttonIndex + 1} in component ${
                index + 1
              } must have a URL`
            );
          }
          if (button.type === "PHONE_NUMBER" && !button.phone_number?.trim()) {
            errors.push(
              `Phone button ${buttonIndex + 1} in component ${
                index + 1
              } must have a phone number`
            );
          }
        });
      }
    });

    setValidationErrors(errors);
  };

  const generatePreview = () => {
    let previewText = "";

    template.components.forEach((component) => {
      switch (component.type) {
        case "HEADER":
          if (component.format === "TEXT" && component.text) {
            previewText += `**${component.text}**\n\n`;
          }
          break;
        case "BODY":
          if (component.text) {
            // Replace template variables with example values
            let bodyText = component.text
              .replace(/\{\{1\}\}/g, "Ahmet Yılmaz")
              .replace(/\{\{2\}\}/g, "SIP001")
              .replace(/\{\{3\}\}/g, "250 TL")
              .replace(/\{\{4\}\}/g, "14:00");
            previewText += `${bodyText}\n\n`;
          }
          break;
        case "FOOTER":
          if (component.text) {
            previewText += `_${component.text}_\n\n`;
          }
          break;
        case "BUTTONS":
          if (component.buttons && component.buttons.length > 0) {
            previewText += "Buttons:\n";
            component.buttons.forEach((button) => {
              previewText += `• ${button.text}\n`;
            });
            previewText += "\n";
          }
          break;
      }
    });

    setPreview(previewText.trim());
  };

  const addComponent = (type: TemplateComponent["type"]) => {
    const newComponent: TemplateComponent = { type };

    if (type === "HEADER") {
      newComponent.format = "TEXT";
      newComponent.text = "";
    } else if (type === "BODY" || type === "FOOTER") {
      newComponent.text = "";
    } else if (type === "BUTTONS") {
      newComponent.buttons = [{ type: "QUICK_REPLY", text: "" }];
    }

    setTemplate({
      ...template,
      components: [...template.components, newComponent],
    });
  };

  const removeComponent = (index: number) => {
    setTemplate({
      ...template,
      components: template.components.filter((_, i) => i !== index),
    });
  };

  const updateComponent = (
    index: number,
    updatedComponent: TemplateComponent
  ) => {
    setTemplate({
      ...template,
      components: template.components.map((comp, i) =>
        i === index ? updatedComponent : comp
      ),
    });
  };

  const addButton = (componentIndex: number) => {
    const component = template.components[componentIndex];
    if (component.type === "BUTTONS") {
      const updatedComponent = {
        ...component,
        buttons: [
          ...(component.buttons || []),
          { type: "QUICK_REPLY" as const, text: "" },
        ],
      };
      updateComponent(componentIndex, updatedComponent);
    }
  };

  const removeButton = (componentIndex: number, buttonIndex: number) => {
    const component = template.components[componentIndex];
    if (component.type === "BUTTONS" && component.buttons) {
      const updatedComponent = {
        ...component,
        buttons: component.buttons.filter((_, i) => i !== buttonIndex),
      };
      updateComponent(componentIndex, updatedComponent);
    }
  };

  const updateButton = (
    componentIndex: number,
    buttonIndex: number,
    updatedButton: any
  ) => {
    const component = template.components[componentIndex];
    if (component.type === "BUTTONS" && component.buttons) {
      const updatedComponent = {
        ...component,
        buttons: component.buttons.map((btn, i) =>
          i === buttonIndex ? updatedButton : btn
        ),
      };
      updateComponent(componentIndex, updatedComponent);
    }
  };

  const handleSave = async () => {
    if (validationErrors.length > 0) {
      toast.error("Please fix validation errors before saving");
      return;
    }

    setLoading(true);
    try {
      const method = templateId ? "PATCH" : "POST";
      const response = await fetch("/api/whatsapp/templates", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
          ...template,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Template saved successfully");
        onSave?.(data.template);
      } else {
        toast.error(data.error || "Failed to save template");
      }
    } catch (error) {
      toast.error("An error occurred while saving template");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {templateId ? "Edit Template" : "Create Template"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={template.name}
                onChange={(e) =>
                  setTemplate({ ...template, name: e.target.value })
                }
                placeholder="e.g., order_confirmation"
                pattern="^[a-z][a-z0-9_]*$"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name *</Label>
              <Input
                id="display-name"
                value={template.displayName}
                onChange={(e) =>
                  setTemplate({ ...template, displayName: e.target.value })
                }
                placeholder="e.g., Order Confirmation"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={template.category}
                onValueChange={(value: any) =>
                  setTemplate({ ...template, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={template.language}
                onValueChange={(value) =>
                  setTemplate({ ...template, language: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tr">Turkish</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="pt-2">{getStatusBadge(template.status)}</div>
            </div>
          </div>

          <Separator />

          {/* Template Components */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Template Components</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addComponent("HEADER")}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Header
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addComponent("BODY")}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Body
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addComponent("FOOTER")}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Footer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addComponent("BUTTONS")}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Buttons
                </Button>
              </div>
            </div>

            {template.components.map((component, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {component.type} Component
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeComponent(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {component.type === "HEADER" && (
                    <>
                      <div className="space-y-2">
                        <Label>Format</Label>
                        <Select
                          value={component.format || "TEXT"}
                          onValueChange={(format: any) =>
                            updateComponent(index, { ...component, format })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEXT">Text</SelectItem>
                            <SelectItem value="IMAGE">Image</SelectItem>
                            <SelectItem value="DOCUMENT">Document</SelectItem>
                            <SelectItem value="VIDEO">Video</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {component.format === "TEXT" && (
                        <div className="space-y-2">
                          <Label>Header Text</Label>
                          <Input
                            value={component.text || ""}
                            onChange={(e) =>
                              updateComponent(index, {
                                ...component,
                                text: e.target.value,
                              })
                            }
                            placeholder="Header text"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {(component.type === "BODY" ||
                    component.type === "FOOTER") && (
                    <div className="space-y-2">
                      <Label>
                        {component.type === "BODY"
                          ? "Body Text"
                          : "Footer Text"}
                      </Label>
                      <Textarea
                        value={component.text || ""}
                        onChange={(e) =>
                          updateComponent(index, {
                            ...component,
                            text: e.target.value,
                          })
                        }
                        placeholder={`${
                          component.type === "BODY"
                            ? "Message body"
                            : "Footer text"
                        }. Use {{1}}, {{2}}, etc. for variables`}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use {"{{1}}"}, {"{{2}}"}, etc. for dynamic variables
                      </p>
                    </div>
                  )}

                  {component.type === "BUTTONS" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Buttons</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addButton(index)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Button
                        </Button>
                      </div>

                      {component.buttons?.map((button, buttonIndex) => (
                        <div
                          key={buttonIndex}
                          className="p-3 border rounded-md space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">
                              Button {buttonIndex + 1}
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeButton(index, buttonIndex)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Type</Label>
                              <Select
                                value={button.type}
                                onValueChange={(type: any) =>
                                  updateButton(index, buttonIndex, {
                                    ...button,
                                    type,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="QUICK_REPLY">
                                    Quick Reply
                                  </SelectItem>
                                  <SelectItem value="URL">URL</SelectItem>
                                  <SelectItem value="PHONE_NUMBER">
                                    Phone
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">Text</Label>
                              <Input
                                value={button.text}
                                onChange={(e) =>
                                  updateButton(index, buttonIndex, {
                                    ...button,
                                    text: e.target.value,
                                  })
                                }
                                placeholder="Button text"
                              />
                            </div>
                          </div>

                          {button.type === "URL" && (
                            <div className="space-y-1">
                              <Label className="text-xs">URL</Label>
                              <Input
                                value={button.url || ""}
                                onChange={(e) =>
                                  updateButton(index, buttonIndex, {
                                    ...button,
                                    url: e.target.value,
                                  })
                                }
                                placeholder="https://example.com"
                              />
                            </div>
                          )}

                          {button.type === "PHONE_NUMBER" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Phone Number</Label>
                              <Input
                                value={button.phone_number || ""}
                                onChange={(e) =>
                                  updateButton(index, buttonIndex, {
                                    ...button,
                                    phone_number: e.target.value,
                                  })
                                }
                                placeholder="+90 555 123 4567"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    Please fix the following errors:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Show preview modal or expand preview section
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>

              <Button
                onClick={handleSave}
                disabled={loading || validationErrors.length > 0}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-md font-mono text-sm whitespace-pre-line">
              {preview}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
