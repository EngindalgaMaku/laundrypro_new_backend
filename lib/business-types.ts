export interface BusinessType {
  value: string
  label: string
  description: string
  services: string[]
  icon: string
  color: string // Added color property for visual distinction
}

export const businessTypes: BusinessType[] = [
  {
    value: "LAUNDRY",
    label: "Çamaşırhane",
    description: "Günlük çamaşır yıkama ve ütüleme hizmetleri",
    icon: "🧺",
    color: "bg-blue-500", // Added color for each business type
    services: [
      "Günlük Çamaşır",
      "Yatak Takımı",
      "Havlu Yıkama",
      "Ütüleme",
      "Çarşaf Yıkama",
      "Bebek Çamaşırları",
      "Spor Kıyafetleri",
    ],
  },
  {
    value: "DRY_CLEANING",
    label: "Kuru Temizleme",
    description: "Hassas kumaşlar için profesyonel kuru temizleme",
    icon: "👔",
    color: "bg-purple-500",
    services: ["Takım Elbise", "Palto", "Etek", "Gömlek", "Elbise", "Kravat", "Blazer", "Gelinlik"],
  },
  {
    value: "CARPET_CLEANING",
    label: "Halı Yıkama",
    description: "Ev ve ofis halıları için derin temizlik",
    icon: "🏠",
    color: "bg-green-500",
    services: ["Salon Halısı", "Yatak Odası Halısı", "Yolluk", "Kilim", "Antika Halı", "Ofis Halısı", "Makine Halısı"],
  },
  {
    value: "UPHOLSTERY_CLEANING",
    label: "Koltuk Temizliği",
    description: "Mobilya ve döşeme temizlik hizmetleri",
    icon: "🛋️",
    color: "bg-orange-500",
    services: ["Koltuk Takımı", "Berjer", "Sandalye", "Yatak", "Yatak Başlığı", "Puf", "Ofis Koltuğu"],
  },
  {
    value: "CURTAIN_CLEANING",
    label: "Perde Yıkama",
    description: "Ev ve ofis perdelerinin özel bakımı",
    icon: "🪟",
    color: "bg-teal-500",
    services: [
      "Salon Perdesi",
      "Yatak Odası Perdesi",
      "Mutfak Perdesi",
      "Tül Perde",
      "Stor Perde",
      "Jaluzi",
      "Panel Perde",
    ],
  },
  {
    value: "OTHER",
    label: "Diğer",
    description: "Özel temizlik hizmetleri ve diğer işlemler",
    icon: "🔧",
    color: "bg-gray-500",
    services: [
      "Özel Temizlik",
      "Deri Temizliği",
      "Ayakkabı Temizliği",
      "Çanta Temizliği",
      "Ev Tekstili",
      "Diğer Hizmetler",
    ],
  },
]

export const getBusinessTypeByValue = (value: string): BusinessType | undefined => {
  return businessTypes.find((type) => type.value === value)
}

export const getServicesByBusinessTypes = (businessTypes: string[]): string[] => {
  const allServices: string[] = []
  businessTypes.forEach((type) => {
    const businessType = getBusinessTypeByValue(type)
    if (businessType) {
      allServices.push(...businessType.services)
    }
  })
  return [...new Set(allServices)] // Remove duplicates
}

export const getBusinessTypeLabels = (values: string[]): string => {
  const labels = values.map((value) => {
    const type = getBusinessTypeByValue(value)
    return type ? `${type.icon} ${type.label}` : value
  })
  return labels.join(", ")
}

// Legacy functions for backward compatibility
export const getServicesByBusinessType = (businessType: string): string[] => {
  return getServicesByBusinessTypes([businessType])
}

export const getBusinessTypeLabel = (value: string): string => {
  return getBusinessTypeLabels([value])
}
