"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  Search,
  Target,
  CheckCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface AddressSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { coordinates: Coordinates; fullAddress: string }) => void;
  initialCoordinates?: Coordinates;
  initialAddress?: string;
  city?: string;
  district?: string;
}

export function AddressSelectionModal({
  isOpen,
  onClose,
  onSave,
  initialCoordinates,
  initialAddress = "",
  city = "",
  district = "",
}: AddressSelectionModalProps) {
  const [selectedCoordinates, setSelectedCoordinates] =
    useState<Coordinates | null>(initialCoordinates || null);
  const [addressSearch, setAddressSearch] = useState(initialAddress);
  const [isSearching, setIsSearching] = useState(false);
  const [mapClickPosition, setMapClickPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Map dimensions for calculation
  const mapWidth = 500;
  const mapHeight = 350;

  // Coordinate bounds based on city (default to Turkey)
  const getCityBounds = (cityName: string) => {
    const cityBounds: { [key: string]: any } = {
      'istanbul': { north: 41.2, south: 40.8, east: 29.3, west: 28.7 },
      'ankara': { north: 40.0, south: 39.8, east: 32.9, west: 32.7 },
      'izmir': { north: 38.5, south: 38.3, east: 27.3, west: 27.0 },
      'antalya': { north: 36.9, south: 36.8, east: 30.8, west: 30.6 },
      'bursa': { north: 40.3, south: 40.1, east: 29.2, west: 28.9 },
      'adana': { north: 37.1, south: 36.9, east: 35.4, west: 35.2 },
      'gaziantep': { north: 37.1, south: 36.9, east: 37.4, west: 37.2 },
      'konya': { north: 37.9, south: 37.7, east: 32.6, west: 32.4 },
      'default': { north: 41.2, south: 40.8, east: 29.3, west: 28.7 } // Istanbul as default
    };
    
    return cityBounds[cityName?.toLowerCase()] || cityBounds['default'];
  };

  const bounds = getCityBounds(city);

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert pixel coordinates to lat/lng (mock calculation)
    const longitude =
      bounds.west + (x / mapWidth) * (bounds.east - bounds.west);
    const latitude =
      bounds.north - (y / mapHeight) * (bounds.north - bounds.south);

    setSelectedCoordinates({ latitude, longitude });
    setMapClickPosition({ x, y });

    // Mock reverse geocoding - generate address from coordinates
    const mockAddress = generateMockAddress(
      latitude,
      longitude,
      city,
      district
    );
    setAddressSearch(mockAddress);

    toast.success("Konum seçildi! Koordinatlar güncellendi.");
  };

  const generateMockAddress = (
    lat: number,
    lng: number,
    city: string,
    district: string
  ) => {
    const streetNames = [
      "Atatürk",
      "İstiklal",
      "Cumhuriyet",
      "Barış",
      "Yıldız",
      "Çiçek",
      "Güneş",
    ];
    const street = streetNames[Math.floor(Math.random() * streetNames.length)];
    const buildingNo = Math.floor(Math.random() * 150) + 1;

    return `${street} Caddesi No:${buildingNo}, ${district}, ${city}`;
  };

  const handleAddressSearch = async () => {
    if (!addressSearch.trim()) {
      toast.error("Adres giriniz");
      return;
    }

    setIsSearching(true);

    // Mock geocoding - convert address to coordinates
    setTimeout(() => {
      // Generate mock coordinates within bounds
      const mockLat =
        bounds.south + Math.random() * (bounds.north - bounds.south);
      const mockLng = bounds.west + Math.random() * (bounds.east - bounds.west);

      setSelectedCoordinates({ latitude: mockLat, longitude: mockLng });

      // Calculate mock map position
      const x =
        ((mockLng - bounds.west) / (bounds.east - bounds.west)) * mapWidth;
      const y =
        ((bounds.north - mockLat) / (bounds.north - bounds.south)) * mapHeight;
      setMapClickPosition({ x, y });

      setIsSearching(false);
      toast.success("Adres bulundu ve haritada işaretlendi!");
    }, 1000);
  };

  const handleSave = () => {
    if (!selectedCoordinates) {
      toast.error("Lütfen haritadan bir konum seçin");
      return;
    }

    if (!addressSearch.trim()) {
      toast.error("Adres bilgisi gerekli");
      return;
    }

    onSave({
      coordinates: selectedCoordinates,
      fullAddress: addressSearch,
    });

    toast.success("Konum bilgileri kaydedildi!");
  };

  const handleCancel = () => {
    setSelectedCoordinates(initialCoordinates || null);
    setAddressSearch(initialAddress);
    setMapClickPosition(null);
    onClose();
  };

  const formatCoordinates = (coords: Coordinates) => {
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Konum Seçimi
          </DialogTitle>
          <DialogDescription>
            Haritadan tam konumunuzu seçin veya adres aratın. Bu konum teslimat
            rotalarının hesaplanması için kullanılacak.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Address Search */}
          <div className="space-y-2">
            <Label htmlFor="address-search">Adres Ara</Label>
            <div className="flex gap-2">
              <Input
                id="address-search"
                placeholder="Adres yazın..."
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
              />
              <Button
                onClick={handleAddressSearch}
                disabled={isSearching}
                variant="outline"
              >
                {isSearching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Map Interface */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Harita Konumu</Label>
              {city && district && (
                <Badge variant="secondary" className="text-xs">
                  {district} / {city}
                </Badge>
              )}
            </div>

            {/* Interactive Map Interface */}
            <div
              className="relative border-2 border-gray-300 rounded-lg cursor-crosshair overflow-hidden bg-gradient-to-br from-green-50 to-blue-50"
              style={{ width: mapWidth, height: mapHeight }}
              onClick={handleMapClick}
            >
              {/* Realistic Map Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-green-100">
                {/* Street Network */}
                <svg width="100%" height="100%" className="absolute inset-0">
                  <defs>
                    <pattern id="cityGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <rect width="50" height="50" fill="#f0fdf4"/>
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d1d5db" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#cityGrid)" />
                  
                  {/* Main Streets with Labels */}
                  <line x1="0" y1="100" x2="500" y2="100" stroke="#374151" strokeWidth="4" />
                  <line x1="0" y1="175" x2="500" y2="175" stroke="#374151" strokeWidth="5" />
                  <line x1="0" y1="250" x2="500" y2="250" stroke="#374151" strokeWidth="3" />
                  
                  <line x1="150" y1="0" x2="150" y2="350" stroke="#374151" strokeWidth="4" />
                  <line x1="250" y1="0" x2="250" y2="350" stroke="#374151" strokeWidth="5" />
                  <line x1="350" y1="0" x2="350" y2="350" stroke="#374151" strokeWidth="3" />
                  
                  {/* Secondary Streets */}
                  <line x1="75" y1="0" x2="75" y2="350" stroke="#6b7280" strokeWidth="2" />
                  <line x1="425" y1="0" x2="425" y2="350" stroke="#6b7280" strokeWidth="2" />
                  <line x1="0" y1="50" x2="500" y2="50" stroke="#6b7280" strokeWidth="2" />
                  <line x1="0" y1="300" x2="500" y2="300" stroke="#6b7280" strokeWidth="2" />
                  
                  {/* Street Name Labels */}
                  <text x="10" y="95" fontSize="8" fill="#374151" fontWeight="bold">Atatürk Cad.</text>
                  <text x="10" y="170" fontSize="9" fill="#374151" fontWeight="bold">Ana Cadde</text>
                  <text x="10" y="245" fontSize="8" fill="#374151" fontWeight="bold">Cumhuriyet Cad.</text>
                  
                  <text x="155" y="15" fontSize="8" fill="#374151" fontWeight="bold" transform="rotate(90 155 15)">İstiklal Cad.</text>
                  <text x="255" y="15" fontSize="9" fill="#374151" fontWeight="bold" transform="rotate(90 255 15)">Merkez Cad.</text>
                </svg>
                
                {/* Landmark Labels and Buildings */}
                
                {/* Antalya Landmarks (if city is Antalya) */}
                {city?.toLowerCase() === 'antalya' && (
                  <>
                    {/* Kaleiçi (Historic Center) */}
                    <div className="absolute top-12 left-20 w-16 h-12 bg-amber-200 rounded border-2 border-amber-400 shadow-sm">
                      <div className="text-xs font-bold text-amber-800 p-1 text-center">Kaleiçi</div>
                    </div>
                    
                    {/* Antalya Marina */}
                    <div className="absolute top-8 left-60 w-20 h-8 bg-blue-200 rounded border-2 border-blue-400 shadow-sm">
                      <div className="text-xs font-bold text-blue-800 p-1 text-center">Marina</div>
                    </div>
                    
                    {/* Hadrian's Gate */}
                    <div className="absolute top-24 left-40 w-8 h-8 bg-stone-300 rounded-full border-2 border-stone-500 shadow-sm">
                      <div className="text-xs font-bold text-stone-800 text-center leading-3 pt-1">H</div>
                    </div>
                    
                    {/* Konyaaltı Beach */}
                    <div className="absolute bottom-16 left-12 w-24 h-6 bg-cyan-200 rounded-full border-2 border-cyan-400 shadow-sm">
                      <div className="text-xs font-bold text-cyan-800 p-1 text-center">Konyaaltı</div>
                    </div>
                    
                    {/* Lara Beach */}
                    <div className="absolute bottom-12 right-16 w-20 h-6 bg-yellow-200 rounded-full border-2 border-yellow-400 shadow-sm">
                      <div className="text-xs font-bold text-yellow-800 p-1 text-center">Lara</div>
                    </div>
                    
                    {/* Antalya Airport */}
                    <div className="absolute top-32 right-12 w-12 h-8 bg-gray-300 rounded border-2 border-gray-500 shadow-sm">
                      <div className="text-xs font-bold text-gray-800 p-1 text-center">✈️</div>
                    </div>
                    
                    {/* Shopping Centers */}
                    <div className="absolute top-40 left-80 w-16 h-10 bg-purple-200 rounded border-2 border-purple-400 shadow-sm">
                      <div className="text-xs font-bold text-purple-800 p-1 text-center">AVM</div>
                    </div>
                  </>
                )}
                
                {/* Generic landmarks for other cities */}
                {city?.toLowerCase() !== 'antalya' && (
                  <>
                    <div className="absolute top-6 left-8 w-12 h-8 bg-blue-300 rounded shadow-sm opacity-80">
                      <div className="text-xs text-blue-800 p-1 text-center">Merkez</div>
                    </div>
                    <div className="absolute top-16 left-24 w-8 h-12 bg-gray-400 rounded shadow-sm opacity-80">
                      <div className="text-xs text-gray-800 p-1 text-center">🏢</div>
                    </div>
                    <div className="absolute top-6 right-12 w-16 h-10 bg-red-300 rounded shadow-sm opacity-80">
                      <div className="text-xs text-red-800 p-1 text-center">Hastane</div>
                    </div>
                    <div className="absolute bottom-12 left-16 w-14 h-8 bg-green-400 rounded shadow-sm opacity-80">
                      <div className="text-xs text-green-800 p-1 text-center">Park</div>
                    </div>
                    <div className="absolute bottom-8 right-8 w-10 h-10 bg-yellow-400 rounded-full shadow-sm opacity-80">
                      <div className="text-xs text-yellow-800 p-1 text-center">🏫</div>
                    </div>
                  </>
                )}
                
                {/* Parks/Green Areas */}
                <div className="absolute top-20 right-20 w-20 h-16 bg-green-200 rounded-lg opacity-60 border border-green-400">
                  <div className="text-xs text-green-800 p-1 text-center font-semibold">🌳 Park</div>
                </div>
                <div className="absolute bottom-16 left-8 w-16 h-12 bg-green-200 rounded-lg opacity-60 border border-green-400">
                  <div className="text-xs text-green-800 p-1 text-center font-semibold">🌲</div>
                </div>
              </div>

              {/* City/District Overlay */}
              <div className="absolute top-2 left-2 bg-white/90 rounded-lg px-3 py-1 text-sm font-medium shadow-sm border">
                <MapPin className="h-3 w-3 inline mr-1 text-primary" />
                {district && city ? `${district}, ${city}` : "Harita Görünümü"}
              </div>

              {/* Compass */}
              <div className="absolute top-12 right-2 bg-white/90 rounded-full p-2 shadow-sm border">
                <div className="w-8 h-8 relative">
                  <div className="absolute inset-0 rounded-full border border-gray-300"></div>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 text-red-600 font-bold text-xs">K</div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 text-gray-600 font-bold text-xs">G</div>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 text-gray-600 font-bold text-xs">B</div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 text-gray-600 font-bold text-xs">D</div>
                  <Navigation className="h-4 w-4 text-red-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Coordinate Display */}
              {selectedCoordinates && (
                <div className="absolute top-2 right-2 bg-white/90 rounded-lg px-2 py-1 text-xs font-mono shadow-sm border">
                  {selectedCoordinates.latitude.toFixed(4)}, {selectedCoordinates.longitude.toFixed(4)}
                </div>
              )}

              {/* Scale Bar */}
              <div className="absolute bottom-12 right-4 bg-white/90 rounded px-2 py-1 shadow-sm border">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-gray-800 relative">
                    <div className="absolute -bottom-2 left-0 text-xs">0</div>
                    <div className="absolute -bottom-2 right-0 text-xs">500m</div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="absolute bottom-2 left-2 right-20 bg-white/95 rounded-lg p-2 text-xs text-center shadow-sm">
                <Target className="h-3 w-3 inline mr-1" />
                Tam konumunuzu işaretlemek için haritaya tıklayın
              </div>

              {/* Selected Location Marker */}
              {mapClickPosition && (
                <div
                  className="absolute transform -translate-x-1/2 -translate-y-full z-10"
                  style={{ left: mapClickPosition.x, top: mapClickPosition.y }}
                >
                  <div className="relative">
                    {/* Pulsing circle */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 bg-red-400 rounded-full animate-ping opacity-75"></div>
                    {/* Main marker */}
                    <MapPin
                      className="h-6 w-6 text-red-600 drop-shadow-lg animate-bounce"
                      fill="currentColor"
                    />
                  </div>
                </div>
              )}

              {/* Coordinate Grid Helpers */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {/* Horizontal lines */}
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute w-full border-t border-blue-200/50"
                    style={{ top: `${i * 20}%` }}
                  />
                ))}
                {/* Vertical lines */}
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={`v-${i}`}
                    className="absolute h-full border-l border-blue-200/50"
                    style={{ left: `${i * 20}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Coordinate Display */}
            {selectedCoordinates && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-800">
                    Seçilen Koordinatlar
                  </div>
                  <div className="text-xs text-green-600 font-mono">
                    {formatCoordinates(selectedCoordinates)}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-700 border-green-300"
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  GPS
                </Badge>
              </div>
            )}
          </div>

          {/* Selected Address Preview */}
          {addressSearch && (
            <div className="space-y-2">
              <Label>Seçilen Adres</Label>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <MapPin className="h-4 w-4 inline mr-2 text-muted-foreground" />
                {addressSearch}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedCoordinates || !addressSearch.trim()}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Konumu Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
