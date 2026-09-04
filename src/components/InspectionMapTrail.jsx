import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Compass,
  Radio,
  LocateFixed
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
  const watchIdRef = useRef(null);

  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isLiveTracking, setIsLiveTracking] = useState(true);
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

  // Jarak live ke gedung
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

  // Handler Deteksi / Pusatkan Lokasi GPS
  const handleDetectUserLocation = useCallback((shouldFlyTo = false) => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung deteksi lokasi.');
      return;
    }
    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
          timestamp: pos.timestamp
        };
        setUserLocation(newLoc);
        setIsDetectingGps(false);

        if (shouldFlyTo && mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([newLoc.latitude, newLoc.longitude], 17, {
            duration: 1.2
          });
        }
      },
      (err) => {
        setIsDetectingGps(false);
        if (err.code === 1) {
          setGpsError('Izin akses lokasi ditolak oleh browser.');
        } else if (err.code === 2) {
          setGpsError('Posisi GPS tidak tersedia.');
        } else {
          setGpsError('Gagal mendeteksi lokasi GPS (timeout).');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  // Real-time GPS Watcher Effect (watchPosition)
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung deteksi lokasi.');
      return;
    }

    if (isLiveTracking) {
      setIsDetectingGps(true);
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
            timestamp: pos.timestamp
          });
          setIsDetectingGps(false);
          setGpsError(null);
        },
        (err) => {
          setIsDetectingGps(false);
          if (err.code === 1) {
            setGpsError('Izin lokasi tidak aktif di browser.');
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
      );

      watchIdRef.current = watchId;

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      };
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
  }, [isLiveTracking, selectedBuildingId]);

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
        // Lingkaran Geofence Gedung
        const geofenceCircle = L.circle([centerLat, centerLng], {
          color: isInsideGeofence ? '#059669' : '#0284c7',
          fillColor: isInsideGeofence ? '#10b981' : '#38bdf8',
          fillOpacity: 0.12,
          radius: radius,
          weight: 1.5,
          dashArray: '4, 4'
        });
        geofenceCircle.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <b style="color: #0f172a; font-size: 13px;">${selectedBuilding.name}</b><br/>
            <span>Radius Geofence: <b>${radius}m</b></span>
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
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2.5px solid white;
              box-shadow: 0 3px 8px rgba(0,0,0,0.25);
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.5px;
            ">
              GD
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        const buildingMarker = L.marker([centerLat, centerLng], { icon: buildingIcon });
        buildingMarker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 4px;">
            <strong style="font-size: 13px;">${selectedBuilding.name}</strong><br/>
            <span>Titik Pusat Geofence (${radius}m)</span>
          </div>
        `);
        layerGroupRef.current.addLayer(buildingMarker);

        // Tampilkan Marker Posisi Pengguna Real-Time (untuk Semua Role: CS, Supervisor, Admin, PIC)
        if (userLocation) {
          const userColor = isCs 
            ? (isInsideGeofence ? '#059669' : '#dc2626')
            : (isInsideGeofence ? '#2563eb' : '#d97706');
          
          const labelText = isCs ? 'CS' : 'ANDA';
          const haloColor = isInsideGeofence ? 'rgba(37, 99, 235, 0.25)' : 'rgba(217, 119, 6, 0.25)';

          const userIcon = L.divIcon({
            className: 'usr-pin',
            html: `
              <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                <div style="
                  position: absolute;
                  inset: 0;
                  border-radius: 50%;
                  background: ${haloColor};
                  animation: pulse 2s infinite ease-out;
                "></div>
                <div style="
                  position: relative;
                  background: ${userColor};
                  color: white;
                  width: 26px;
                  height: 26px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  font-size: 9px;
                  font-weight: 800;
                  letter-spacing: 0.5px;
                ">
                  ${labelText}
                </div>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          const userMarker = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon });
          userMarker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; padding: 4px; min-width: 170px;">
              <div style="font-weight: 700; color: ${userColor}; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
                <span>📍 Posisi Anda ${isLiveTracking ? '(Real-Time)' : ''}</span>
              </div>
              <div>Jarak: <b>${Math.round(distanceToBuilding || 0)}m</b> dari pusat gedung</div>
              <div style="margin-top: 2px;">
                Status: <b style="color: ${isInsideGeofence ? '#059669' : '#dc2626'}">
                  ${isInsideGeofence ? 'Dalam Geofence' : 'Di Luar Geofence'}
                </b>
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
                Akurasi GPS: ±${userLocation.accuracy || 5}m
              </div>
            </div>
          `);
          layerGroupRef.current.addLayer(userMarker);
        }

        // Jika Supervisor/Admin/PIC: Tampilkan Pin Jejak Ruangan
        if (!isCs) {
          const displayTrail = currentBuildingInspections.length > 0 ? currentBuildingInspections : [
            { id: 'pos-1', room_name: 'FA DEPT. HEAD', room_code: 'RKFA', cs_name: 'Budi CS', time: '09:49 WIB', status: 'Terverifikasi On-Site' }
          ];

          const offsets = [
            [0.00015, 0.00020],
            [-0.00018, 0.00015],
            [0.00010, -0.00022],
            [-0.00012, -0.00018],
            [0.00022, -0.00010],
            [-0.00020, -0.00025]
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
                  box-shadow: 0 2px 6px rgba(0,0,0,0.18);
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
              <div style="font-family: inherit; font-size: 12px; padding: 4px;">
                <b style="font-size: 13px;">${t.room_name} (${t.room_code || '-'})</b><br/>
                <span>Petugas: <b>${t.cs_name}</b></span><br/>
                <span>Waktu: ${t.time}</span><br/>
                <span style="display: inline-block; margin-top: 3px; padding: 2px 6px; background: rgba(16, 185, 129, 0.1); color: #059669; border-radius: 4px; font-weight: 600; font-size: 11px;">
                  ${t.status}
                </span>
              </div>
            `);
            layerGroupRef.current.addLayer(roomMarker);
          });
        }
      }
    }
  }, [selectedBuildingId, hasGps, selectedBuilding, userLocation, isInsideGeofence, isCs, isLiveTracking, currentBuildingInspections]);

  return (
    <div className="glass-panel" style={{ marginTop: '20px', padding: '20px', borderRadius: 'var(--radius-xl)' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isCs ? `Kawasan Penugasan: ${selectedBuilding?.name || 'Gedung'}` : 'Peta Jejak Inspeksi & Geofence Kawasan'}
            </h2>
            {isLiveTracking && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 6px #10b981'
                }}></span>
                LIVE GPS
              </span>
            )}
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {isCs 
              ? 'Verifikasi kehadiran fisik di kawasan gedung secara real-time untuk scan QR ruangan'
              : 'Pantauan radius geofence gedung, posisi real-time, dan ruangan yang telah diverifikasi'
            }
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {buildings.length > 1 && (
            <select
              className="form-control form-control-sm"
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '170px' }}
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.latitude !== null ? `${b.radius_meter || 250}m` : 'Belum di-set'})
                </option>
              ))}
            </select>
          )}

          {/* Tombol Cek Lokasi Ulang & Pusatkan Peta (Tersedia untuk Semua Role) */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleDetectUserLocation(true)}
            disabled={isDetectingGps}
            title="Deteksi ulang koordinat GPS dan pusatkan tampilan peta ke posisi Anda"
            style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            {isDetectingGps ? (
              <>
                <RefreshCw size={13} className="spinner" />
                <span>Mendeteksi...</span>
              </>
            ) : (
              <>
                <LocateFixed size={14} style={{ color: 'var(--primary)' }} />
                <span>Cek Lokasi Ulang</span>
              </>
            )}
          </button>

          {/* Toggle Live GPS Tracking */}
          <button
            type="button"
            className={`btn btn-sm ${isLiveTracking ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setIsLiveTracking(!isLiveTracking)}
            title={isLiveTracking ? 'Matikan Live Tracking GPS' : 'Aktifkan Live Tracking GPS Real-Time'}
            style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Radio size={13} />
            <span>{isLiveTracking ? 'Live: ON' : 'Live: OFF'}</span>
          </button>

          {/* Tombol Atur Gedung untuk Supervisor / Admin */}
          {!isCs && onNavigateBuildings && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onNavigateBuildings}
              style={{ fontSize: '0.8rem', fontWeight: 600 }}
            >
              Atur Gedung
            </button>
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
              background: 'rgba(255, 255, 255, 0.94)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              zIndex: 1000,
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                Radius Geofence: {selectedBuilding?.radius_meter || 250}m
              </span>
              {userLocation && (
                <span style={{ 
                  color: isInsideGeofence ? '#059669' : '#d97706',
                  fontWeight: 700,
                  borderLeft: '1px solid #cbd5e1',
                  paddingLeft: '8px'
                }}>
                  {Math.round(distanceToBuilding || 0)}m dari Anda
                </span>
              )}
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

            {/* Tombol Aksi CS */}
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
                  onClick={() => handleDetectUserLocation(true)}
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
          /* TAMPILAN SUPERVISOR / ADMIN: STATUS LOKASI REAL-TIME + DAFTAR JEJAK RUANGAN */
          <div className="glass-card" style={{ padding: '16px', margin: 0, borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', background: 'white' }}>
            
            {/* Real-time Location Indicator Banner for Supervisor / Admin */}
            {userLocation ? (
              <div style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: isInsideGeofence ? 'rgba(16, 185, 129, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                border: `1px solid ${isInsideGeofence ? '#10b981' : '#f59e0b'}`,
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation size={16} style={{ color: isInsideGeofence ? '#059669' : '#d97706', transform: 'rotate(45deg)' }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isInsideGeofence ? '#065f46' : '#92400e' }}>
                      {isInsideGeofence ? `Dalam Kawasan ${selectedBuilding?.name || 'Gedung'}` : `Di Luar Kawasan (${Math.round(distanceToBuilding || 0)}m)`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Jarak ke titik pusat: <b>{Math.round(distanceToBuilding || 0)}m</b> (Radius: {radius}m)
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDetectUserLocation(true)}
                  title="Pusatkan ke lokasi saya"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <LocateFixed size={13} />
                </button>
              </div>
            ) : gpsError ? (
              <div style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid #ef4444',
                marginBottom: '12px',
                fontSize: '0.76rem',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{gpsError}</span>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Jejak Kunjungan Ruangan Hari Ini
              </span>
              <span className="status-badge status-completed" style={{ fontSize: '0.7rem' }}>
                {currentBuildingInspections.length > 0 ? `${currentBuildingInspections.length} Selesai` : '1 Selesai'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '240px' }}>
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
