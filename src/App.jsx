import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Map, BarChart3, Square, Layers, TrendingUp, Building, Users } from 'lucide-react';
import AnalyticsPage from './components/AnalyticsPage';
import './App.css';
import data from './assets/data.json';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for KT clients
const ktClientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Default icon for regular business centers
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function Navigation() {
  const location = useLocation();
  
  return (
    <div className="bg-white shadow-sm border-b p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Карта Бизнес-Центров Астаны
          </h1>
          <p className="text-gray-600 mt-1">
            Интерактивная карта с информацией о компаниях и услугах Казахтелеком
          </p>
        </div>
        
        <div className="flex gap-2">
          <Link to="/">
            <Button 
              variant={location.pathname === '/' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Map className="w-4 h-4" />
              Карта
            </Button>
          </Link>
          <Link to="/analytics">
            <Button 
              variant={location.pathname === '/analytics' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Аналитика
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Component for map controls and zone selection
function MapControls({ 
  showHeatmap, 
  setShowHeatmap, 
  showClusters, 
  setShowClusters,
  zoneSelectionMode,
  setZoneSelectionMode,
  selectedZone,
  clearZone
}) {
  return (
    <div className="map-controls">
      <Button
        onClick={() => setShowHeatmap(!showHeatmap)}
        variant={showHeatmap ? "default" : "outline"}
        className="flex items-center gap-2"
      >
        <Layers className="w-4 h-4" />
        {showHeatmap ? 'Скрыть тепловую карту' : 'Показать тепловую карту'}
      </Button>
      
      <Button
        onClick={() => setShowClusters(!showClusters)}
        variant={showClusters ? "default" : "outline"}
        className="flex items-center gap-2"
      >
        <Building className="w-4 h-4" />
        {showClusters ? 'Отдельные маркеры' : 'Кластеризация'}
      </Button>
      
      <Button
        onClick={() => setZoneSelectionMode(!zoneSelectionMode)}
        variant={zoneSelectionMode ? "default" : "outline"}
        className="flex items-center gap-2"
      >
        <Square className="w-4 h-4" />
        {zoneSelectionMode ? 'Отменить выделение' : 'Выделить зону'}
      </Button>
      
      {selectedZone && (
        <Button
          onClick={clearZone}
          variant="destructive"
          className="flex items-center gap-2"
        >
          Очистить зону
        </Button>
      )}
    </div>
  );
}

// Component for zone statistics panel
function ZoneStatsPanel({ selectedZone, businessCenters }) {
  if (!selectedZone) return null;

  const { bounds } = selectedZone;
  const filteredBCs = businessCenters.filter(bc => {
    return bc.latitude >= bounds.south && 
           bc.latitude <= bounds.north && 
           bc.longitude >= bounds.west && 
           bc.longitude <= bounds.east;
  });

  const totalCompanies = filteredBCs.reduce((sum, bc) => sum + bc.companies.length, 0);
  const ktClients = filteredBCs.reduce((sum, bc) => 
    sum + bc.companies.filter(company => company.is_kt_client).length, 0
  );
  const totalRevenue = filteredBCs.reduce((sum, bc) => 
    sum + bc.companies.reduce((companySum, company) => companySum + (company.accruals || 0), 0), 0
  );

  return (
    <Card className="zone-stats-panel">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Статистика по зоне
        </CardTitle>
        <CardDescription>
          Данные по выделенной области
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Бизнес-центров:</span>
          <Badge variant="secondary">{filteredBCs.length}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Компаний:</span>
          <Badge variant="secondary">{totalCompanies}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">КТ клиентов:</span>
          <Badge variant="default" className="bg-blue-600">{ktClients}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Общий доход:</span>
          <Badge variant="outline">{totalRevenue.toLocaleString()} тг</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for handling map interactions
function MapInteractions({ 
  businessCenters, 
  showHeatmap, 
  showClusters,
  zoneSelectionMode,
  selectedZone,
  setSelectedZone
}) {
  const map = useMap();
  const markersRef = useRef(null);
  const heatmapRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Clear existing layers
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
    }
    if (heatmapRef.current) {
      map.removeLayer(heatmapRef.current);
    }

    // Prepare heatmap data
    const heatmapData = [];
    businessCenters.forEach(bc => {
      const ktClientsCount = bc.companies.filter(c => c.is_kt_client).length;
      const totalRevenue = bc.companies.reduce((sum, c) => sum + (c.accruals || 0), 0);
      const intensity = Math.max(ktClientsCount * 0.1, totalRevenue / 1000000);
      heatmapData.push([bc.latitude, bc.longitude, intensity]);
    });

    // Add heatmap layer
    if (showHeatmap) {
      heatmapRef.current = L.heatLayer(heatmapData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.0: 'blue',
          0.2: 'cyan',
          0.4: 'lime',
          0.6: 'yellow',
          0.8: 'orange',
          1.0: 'red'
        }
      }).addTo(map);
    }

    // Add markers
    if (showClusters) {
      // Create marker cluster group
      markersRef.current = L.markerClusterGroup({
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          let c = ' marker-cluster-';
          if (count < 10) {
            c += 'small';
          } else if (count < 100) {
            c += 'medium';
          } else {
            c += 'large';
          }
          c += '';

          return new L.DivIcon({
            html: '<div><span>' + count + '</span></div>',
            className: 'marker-cluster' + c,
            iconSize: new L.Point(40, 40)
          });
        }
      });

      businessCenters.forEach(bc => {
        const marker = L.marker([bc.latitude, bc.longitude], {
          icon: defaultIcon
        });

        marker.bindPopup(renderCompanyPopup(bc));
        markersRef.current.addLayer(marker);
      });

      map.addLayer(markersRef.current);
    } else {
      // Add individual markers
      businessCenters.forEach(bc => {
        const marker = L.marker([bc.latitude, bc.longitude], {
          icon: defaultIcon
        });

        marker.bindPopup(renderCompanyPopup(bc));
        marker.addTo(map);
      });
    }

    return () => {
      if (markersRef.current) {
        map.removeLayer(markersRef.current);
      }
      if (heatmapRef.current) {
        map.removeLayer(heatmapRef.current);
      }
    };
  }, [map, businessCenters, showHeatmap, showClusters]);

  // Handle zone selection
  useEffect(() => {
    if (!map) return;

    let isDrawing = false;
    let startLatLng = null;
    let rectangle = null;

    const handleMouseDown = (e) => {
      if (!zoneSelectionMode) return;
      isDrawing = true;
      startLatLng = e.latlng;
    };

    const handleMouseMove = (e) => {
      if (!zoneSelectionMode || !isDrawing || !startLatLng) return;
      
      if (rectangle) {
        map.removeLayer(rectangle);
      }
      
      const bounds = L.latLngBounds(startLatLng, e.latlng);
      rectangle = L.rectangle(bounds, {
        color: '#3b82f6',
        weight: 2,
        fillOpacity: 0.1
      }).addTo(map);
    };

    const handleMouseUp = (e) => {
      if (!zoneSelectionMode || !isDrawing || !startLatLng) return;
      
      isDrawing = false;
      const bounds = L.latLngBounds(startLatLng, e.latlng);
      
      setSelectedZone({
        bounds: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        },
        rectangle: rectangle
      });
      
      startLatLng = null;
    };

    if (zoneSelectionMode) {
      map.on('mousedown', handleMouseDown);
      map.on('mousemove', handleMouseMove);
      map.on('mouseup', handleMouseUp);
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      if (rectangle) {
        map.removeLayer(rectangle);
      }
      setSelectedZone(null);
      map.getContainer().style.cursor = '';
    }

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.getContainer().style.cursor = '';
    };
  }, [map, zoneSelectionMode, setSelectedZone]);

  return null;
}

function renderCompanyPopup(businessCenter) {
  return `
    <div style="min-width: 300px; max-width: 400px;">
      <h3 style="margin: 0 0 10px 0; font-weight: bold; font-size: 16px;">
        ${businessCenter.business_center_name}
      </h3>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
        <strong>Район:</strong> ${businessCenter.district}<br/>
        <strong>Назначение:</strong> ${businessCenter.building_purpose}
      </p>
      
      <div style="max-height: 300px; overflow-y: auto;">
        <h4 style="margin: 10px 0 5px 0; font-size: 14px; font-weight: bold;">
          Компании (${businessCenter.companies.length}):
        </h4>
        
        ${businessCenter.companies.map(company => `
          <div class="company-item" style="margin-bottom: 8px;">
            <div style="font-weight: bold; font-size: 13px;">
              ${company.organization_name}
            </div>
            
            <div style="font-size: 12px; color: #666; margin-top: 2px;">
              <strong>БИН:</strong> ${company.bin}<br/>
              <strong>Адрес:</strong> ${company.address}
              ${company.accruals > 0 ? `<br/><strong>Начисления:</strong> ${company.accruals.toLocaleString()} тг` : ''}
            </div>
            
            ${company.is_kt_client && company.services.length > 0 ? `
              <div class="services-list" style="margin-top: 8px;">
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">
                  Услуги КТ:
                </div>
                ${company.services.map(service => `
                  <div class="service-item">${service}</div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function MapPage() {
  const [businessCenters, setBusinessCenters] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
  const [zoneSelectionMode, setZoneSelectionMode] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    setBusinessCenters(data);
  }, []);

  const clearZone = () => {
    setSelectedZone(null);
    setZoneSelectionMode(false);
  };

  return (
    <div className="relative">
      <MapContainer
        center={[51.1694, 71.4491]} // Astana coordinates
        zoom={12}
        style={{ height: 'calc(100vh - 100px)', width: '100%' }}
        className={zoneSelectionMode ? 'zone-selection-active' : ''}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapInteractions
          businessCenters={businessCenters}
          showHeatmap={showHeatmap}
          showClusters={showClusters}
          zoneSelectionMode={zoneSelectionMode}
          selectedZone={selectedZone}
          setSelectedZone={setSelectedZone}
        />
        
        {selectedZone && selectedZone.rectangle && (
          <Rectangle
            bounds={[
              [selectedZone.bounds.south, selectedZone.bounds.west],
              [selectedZone.bounds.north, selectedZone.bounds.east]
            ]}
            pathOptions={{
              color: '#3b82f6',
              weight: 2,
              fillOpacity: 0.1
            }}
          />
        )}
      </MapContainer>
      
      <MapControls
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        showClusters={showClusters}
        setShowClusters={setShowClusters}
        zoneSelectionMode={zoneSelectionMode}
        setZoneSelectionMode={setZoneSelectionMode}
        selectedZone={selectedZone}
        clearZone={clearZone}
      />
      
      <ZoneStatsPanel
        selectedZone={selectedZone}
        businessCenters={businessCenters}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="w-full h-screen">
        <Navigation />
        
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

