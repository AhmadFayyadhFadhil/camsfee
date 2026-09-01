import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Building, 
  RefreshCw, 
  AlertTriangle, 
  QrCode, 
  Compass 
} from 'lucide-react';

// Fix Leaflet Default Marker Icon in Webpack/Vite bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Formula Haversine dalam satuan Meter
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function InspectionMapTrail({ 
  isCs = false, 
  buildings = [], 
  inspectionTrail = [], 
  onNavigateBuildings,
  onStartScan 
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Set default gedung penugasan
  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      const activeBld = buildings.find(b => b.latitude !== null && b.longitude !== null) || buildings[0];
      setSelectedBuildingId(activeBld.id);
    }
  }, [buildings, selectedBuildingId]);

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId) || buildings[0];
  const hasGps = selectedBuilding && selectedBuilding.latitude !== null && selectedBuilding.longitude !== null;
  const radius = selectedBuilding?.radius_meter ? Number(selectedBuilding.radius_meter) : 250;

  // Deteksi GPS
  const handleDetectUserLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung deteksi lokasi.');
      return;
    }
    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setIsDetectingGps(false);
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsError('Izin lokasi tidak aktif di browser.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isCs) {
      handleDetectUserLocation();
    }
  }, [isCs, selectedBuildingId]);

  // Jarak ke gedung
  let distanceToBuilding = null;
  let isInsideGeofence = false;

  if (hasGps && userLocation) {
    distanceToBuilding = calculateDistanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      Number(selectedBuilding.latitude),
      Number(selectedBuilding.longitude)
    );
    isInsideGeofence = distanceToBuilding <= radius;
  }

  // Filter trail untuk supervisor
  const currentBuildingInspections = inspectionTrail.filter(t => 
    !selectedBuildingId || t.building_id === selectedBuildingId || !t.building_id
  );

  // Inisialisasi & Render Peta
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const centerLat = hasGps ? Number(selectedBuilding.latitude) : -7.64549;
    const centerLng = hasGps ? Number(selectedBuilding.longitude) : 112.69375;
    const zoomLevel = radius <= 100 ? 17 : 16;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: zoomLevel,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([centerLat, centerLng], zoomLevel);
    }

    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();

      if (hasGps) {
        // Lingkaran Geofence
        const geofenceCircle = L.circle([centerLat, centerLng], {
          color: isCs && isInsideGeofence ? '#059669' : '#0284c7',
          fillColor: isCs && isInsideGeofence ? '#10b981' : '#38bdf8',
          fillOpacity: 0.12,
          radius: radius,
          weight: 1.5,
          dashArray: '4, 4'
        });
        geofenceCircle.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <b>${selectedBuilding.name}</b><br/>
            Radius Geofence: ${radius}m
          </div>
        `);
        layerGroupRef.current.addLayer(geofenceCircle);

        // Marker Pusat Gedung
        const buildingIcon = L.divIcon({
          className: 'bld-pin',
          html: `
            <div style="
              background: #0f766e;
              color: white;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
              font-size: 11px;
              font-weight: 700;
            ">
              GD
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const buildingMarker = L.marker([centerLat, centerLng], { icon: buildingIcon });
        buildingMarker.bindPopup(`<b>${selectedBuilding.name}</b><br/>Titik Pusat Gedung (${radius}m)`);
        layerGroupRef.current.addLayer(buildingMarker);

        // Jika CS: Tampilkan Pin Posisi CS Saat Ini
        if (isCs && userLocation) {
          const userIcon = L.divIcon({
            className: 'usr-pin',
            html: `
              <div style="
                background: ${isInsideGeofence ? '#059669' : '#dc2626'};
                color: white;
                width: 26px;
                height: 26px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 0 0 4px ${isInsideGeofence ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
                font-size: 10px;
                font-weight: 700;
              ">
                ME
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });

          const userMarker = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon });
          userMarker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; padding: 2px;">
              <b>${isInsideGeofence ? 'Posisi Anda (Dalam Kawasan)' : 'Posisi Anda (Di Luar Kawasan)'}</b><br/>
              Jarak: ${Math.round(distanceToBuilding || 0)}m dari gedung
            </div>
          `);
          layerGroupRef.current.addLayer(userMarker);
        }

        // Jika Supervisor: Tampilkan Pin Jejak Ruangan
        if (!isCs) {
          const displayTrail = currentBuildingInspections.length > 0 ? currentBuildingInspections : [
            { id: 'pos-1', room_name: 'FA DEPT. HEAD', room_code: 'RKFA', cs_name: 'Budi CS', time: '09:49 WIB', status: 'Terverifikasi On-Site' }
          ];

          const offsets = [
            [0.00015, 0.00020],
            [-0.00018, 0.00015],
            [0.00010, -0.00022],
            [-0.00012, -0.00018]
          ];

          displayTrail.forEach((t, idx) => {
            const offset = offsets[idx % offsets.length];
            const roomLat = centerLat + offset[0];
            const roomLng = centerLng + offset[1];

            const roomIcon = L.divIcon({
              className: 'room-pin',
              html: `
                <div style="
                  background: #10b981;
                  color: white;
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                  font-size: 11px;
                  font-weight: 700;
                ">
                  ${idx + 1}
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            const roomMarker = L.marker([roomLat, roomLng], { icon: roomIcon });
            roomMarker.bindPopup(`
              <div style="font-family: inherit; font-size: 12px; padding: 2px;">
                <b>${t.room_name} (${t.room_code || '-'})</b><br/>
                Petugas: ${t.cs_name}<br/>
                Waktu: ${t.time}<br/>
                Status: ${t.status}
              </div>
            `);
            layerGroupRef.current.addLayer(roomMarker);
          });
        }
      }
    }
  }, [selectedBuildingId, hasGps, selectedBuilding, userLocation, isInsideGeofence, isCs]);

  return (
    <div className="glass-panel" style={{ marginTop: '20px', padding: '20px', borderRadius: 'var(--radius-xl)' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isCs ? `Kawasan Penugasan: ${selectedBuilding?.name || 'Gedung'}` : 'Peta Jejak Inspeksi & Geofence Kawasan'}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {isCs 
              ? 'Verifikasi kehadiran fisik di kawasan gedung untuk scan QR ruangan'
              : 'Pantauan radius geofence gedung dan ruangan yang telah diverifikasi'
            }
          </p>
        </div>

        {/* Dropdown / Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {buildings.length > 1 && (
            <select
              className="form-control form-control-sm"
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '180px' }}
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.latitude !== null ? `${b.radius_meter || 250}m` : 'Belum di-set'})
                </option>
              ))}
            </select>
          )}

          {isCs ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDetectUserLocation}
              disabled={isDetectingGps}
              style={{ fontSize: '0.8rem', fontWeight: 600 }}
            >
              {isDetectingGps ? 'Mendeteksi...' : 'Cek Lokasi'}
            </button>
          ) : (
            onNavigateBuildings && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onNavigateBuildings}
                style={{ fontSize: '0.8rem', fontWeight: 600 }}
              >
                Atur Gedung
              </button>
            )
          )}
        </div>
      </div>

      {/* Grid: Peta (Kiri) + Panel Status (Kanan) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        
        {/* Peta Leaflet */}
        <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)', minHeight: '320px' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '320px' }}></div>
          
          {hasGps ? (
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              background: 'rgba(255, 255, 255, 0.92)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              zIndex: 1000,
              border: '1px solid rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                Radius: {selectedBuilding?.radius_meter || 250}m
              </span>
            </div>
          ) : (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              textAlign: 'center',
              zIndex: 1000
            }}>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>Titik Lokasi Belum Diatur</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 12px' }}>
                Koordinat GPS untuk gedung ini belum diatur di master data.
              </p>
              {onNavigateBuildings && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onNavigateBuildings}
                  style={{ fontSize: '0.8rem' }}
                >
                  Kelola Gedung
                </button>
              )}
            </div>
          )}
        </div>

        {/* Panel Kanan */}
        {isCs ? (
          /* TAMPILAN CS: STATUS KEHADIRAN KAWASAN */
          <div className="glass-card" style={{ padding: '18px', margin: 0, borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'white' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Status Kehadiran Lokasi
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {selectedBuilding?.name || '-'}
                </span>
              </div>

              {/* KONDISI 1: DALAM KAWASAN */}
              {hasGps && userLocation && isInsideGeofence && (
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid #10b981',
                  marginBottom: '14px'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#065f46', marginBottom: '4px' }}>
                    Anda Masuk di Kawasan {selectedBuilding?.name}
                  </div>
                  <span className="status-badge status-completed" style={{ fontSize: '0.72rem', display: 'inline-block', marginBottom: '8px' }}>
                    Terverifikasi di Lokasi
                  </span>
                  <p style={{ fontSize: '0.82rem', color: '#064e3b', margin: 0, lineHeight: 1.45 }}>
                    Posisi GPS terdeteksi di dalam radius gedung (Jarak: <b>{Math.round(distanceToBuilding || 0)}m</b> dari pusat gedung). Kunci scan QR ruangan aktif.
                  </p>
                </div>
              )}

              {/* KONDISI 2: DI LUAR KAWASAN */}
              {hasGps && userLocation && !isInsideGeofence && (
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid #ef4444',
                  marginBottom: '14px'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#991b1b', marginBottom: '4px' }}>
                    Anda Berada di Luar Kawasan {selectedBuilding?.name}
                  </div>
                  <span className="status-badge status-rejected" style={{ fontSize: '0.72rem', display: 'inline-block', marginBottom: '8px' }}>
                    Di Luar Radius
                  </span>
                  <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0, lineHeight: 1.45 }}>
                    Jarak Anda saat ini <b>{Math.round(distanceToBuilding || 0)}m</b> dari {selectedBuilding?.name} (Batas radius: {radius}m). Silakan merapat ke kawasan gedung.
                  </p>
                </div>
              )}

              {/* KONDISI 3: LOADING / GPS BELUM ADA */}
              {(!userLocation || isDetectingGps) && (
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1px solid #f59e0b',
                  marginBottom: '14px'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#92400e', marginBottom: '4px' }}>
                    Mendeteksi Posisi Lokasi...
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#78350f', margin: 0, lineHeight: 1.4 }}>
                    {gpsError || 'Mengambil titik koordinat GPS perangkat Anda untuk verifikasi kehadiran fisik.'}
                  </p>
                </div>
              )}
            </div>

            {/* Tombol Aksi */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              {isInsideGeofence ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onStartScan}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <QrCode size={18} /> Scan QR Ruangan &amp; Mulai Tugas
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDetectUserLocation}
                  disabled={isDetectingGps}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  Cek Ulang Lokasi
                </button>
              )}
            </div>
          </div>
        ) : (
          /* TAMPILAN SUPERVISOR: DAFTAR JEJAK RUANGAN */
          <div className="glass-card" style={{ padding: '16px', margin: 0, borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Jejak Kunjungan Ruangan Hari Ini
              </span>
              <span className="status-badge status-completed" style={{ fontSize: '0.7rem' }}>
                {currentBuildingInspections.length > 0 ? `${currentBuildingInspections.length} Selesai` : '1 Selesai'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '260px' }}>
              {(currentBuildingInspections.length > 0 ? currentBuildingInspections : [
                { id: '1', room_name: 'FA DEPT. HEAD', room_code: 'RKFA', time: '09:49 WIB', cs_name: 'Budi CS', status: 'Terverifikasi On-Site' }
              ]).map((item, idx) => (
                <div 
                  key={item.id || idx}
                  style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    padding: '8px 10px', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'var(--success)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{item.room_name}</strong>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{item.time}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {item.cs_name} {item.room_code ? `• ${item.room_code}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
