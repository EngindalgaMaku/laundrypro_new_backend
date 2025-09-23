"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { businessTypes, type BusinessType } from "@/lib/business-types"
import { cn } from "@/lib/utils"

interface BusinessTypeSelectorProps {
  selectedTypes?: string[] // Changed from selectedType to selectedTypes array
  onSelect: (types: string[]) => void // Changed to handle multiple selections
  className?: string
  multiSelect?: boolean // Added option for multi-select mode
}

export function BusinessTypeSelector({
  selectedTypes = [],
  onSelect,
  className,
  multiSelect = false,
}: BusinessTypeSelectorProps) {
  const handleSelect = (typeValue: string) => {
    if (multiSelect) {
      const newSelection = selectedTypes.includes(typeValue)
        ? selectedTypes.filter((t) => t !== typeValue)
        : [...selectedTypes, typeValue]
      onSelect(newSelection)
    } else {
      // Single select mode
      onSelect([typeValue])
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {multiSelect && (
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700 font-medium">💡 Birden fazla işletme türü seçebilirsiniz</p>
          <p className="text-xs text-blue-600 mt-1">
            Örneğin: Hem halı yıkama hem kuru temizleme yapıyorsanız ikisini de seçin
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businessTypes.map((type: BusinessType) => {
          const isSelected = selectedTypes.includes(type.value)

          return (
            <Card
              key={type.value}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md relative",
                isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:border-primary/50",
              )}
              onClick={() => handleSelect(type.value)}
            >
              {multiSelect && (
                <div className="absolute top-3 right-3">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => {}} // Handled by card click
                    className="pointer-events-none"
                  />
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", type.color)}>
                    <span className="text-lg">{type.icon}</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg">{type.label}</CardTitle>
                    {isSelected && (
                      <Badge variant="default" className="text-xs mt-1">
                        ✓ Seçildi
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="text-sm">{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Hizmetler:</p>
                  <div className="flex flex-wrap gap-1">
                    {type.services.slice(0, 4).map((service) => (
                      <Badge key={service} variant="secondary" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {type.services.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{type.services.length - 4} daha
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedTypes.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-2">Seçilen İşletme Türleri ({selectedTypes.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedTypes.map((typeValue) => {
              const type = businessTypes.find((t) => t.value === typeValue)
              return type ? (
                <Badge key={typeValue} className="bg-green-100 text-green-800">
                  {type.icon} {type.label}
                </Badge>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
