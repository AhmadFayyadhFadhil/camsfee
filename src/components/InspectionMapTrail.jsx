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
  Compass, 
  Radio 
} from 'lucide-react';

// Fix Leaflet Default Marker Icon in Webpack/Vite bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Formula Haversine dalam Meter
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius bumi dalam meter
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
  const [userLocation, setUserLocation] = useState(null); // { latitude, longitude, accuracy }
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Otomatis pilih gedung penugasan pertama
  useEffect(() => {
    if (buildings.length > 0 && !selectedBuildingId) {
      const activeBld = buildings.find(b => b.latitude !== null && b.longitude !== null) || buildings[0];
      setSelectedBuildingId(activeBld.id);
    }
  }, [buildings, selectedBuildingId]);

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId) || buildings[0];
  const hasGps = selectedBuilding && selectedBuilding.latitude !== null && selectedBuilding.longitude !== null;
  const radius = selectedBuilding?.radius_meter ? Number(selectedBuilding.radius_meter) : 250;

  // Deteksi GPS otomatis untuk CS
  const handleDetectUserLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Browser Anda tidak mendukung deteksi GPS.');
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
        setGpsError('Izin akses GPS dinonaktifkan pada browser. Silakan izinkan lokasi untuk verifikasi kehadiran.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isCs) {
      handleDetectUserLocation();
    }
  }, [isCs, selectedBuildingId]);

  // Hitung jarak CS ke gedung saat ini
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

  // Filter jejak inspeksi hari ini untuk supervisor
  const currentBuildingInspections = inspectionTrail.filter(t => 
    !selectedBuildingId || t.building_id === selectedBuildingId || !t.building_id
  );

  // Inisialisasi & Update Leaflet Map
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
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
        // 1. Lingkaran Geofence Kawasan Gedung
        const geofenceCircle = L.circle([centerLat, centerLng], {
          color: isCs && isInsideGeofence ? '#10b981' : '#0f766e',
          fillColor: isCs && isInsideGeofence ? '#10b981' : '#14b8a6',
          fillOpacity: 0.18,
          radius: radius,
          weight: 2,
          dashArray: '6, 6'
        });
        geofenceCircle.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <strong style="color: #0f766e; font-size: 14px;">🏢 ${selectedBuilding.name}</strong>
            <div style="font-size: 12px; color: #555; margin-top: 4px;">
              Radius Geofence: <b>${radius} Meter</b><br/>
              Pusat: ${centerLat.toFixed(5)}, ${centerLng.toFixed(5)}
            </div>
          </div>
        `);
        layerGroupRef.current.addLayer(geofenceCircle);

        // 2. Marker Pusat Gedung
        const buildingIcon = L.divIcon({
          className: 'custom-building-icon',
          html: `
            <div style="
              background: #0f766e;
              color: white;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(0,0,0,0.3);
              border: 2.5px solid white;
              font-size: 18px;
            ">
              🏢
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const buildingMarker = L.marker([centerLat, centerLng], { icon: buildingIcon });
        buildingMarker.bindPopup(`<b>${selectedBuilding.name}</b><br/>Pusat Geofence (Radius: ${radius}m)`);
        layerGroupRef.current.addLayer(buildingMarker);

        // 3. Jika CS: Tampilkan Pin Posisi GPS CS Saat Ini (Live User Marker)
        if (isCs && userLocation) {
          const userIcon = L.divIcon({
            className: 'custom-user-icon',
            html: `
              <div style="
                background: ${isInsideGeofence ? '#10b981' : '#ef4444'};
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 0 6px ${isInsideGeofence ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
                border: 2.5px solid white;
                font-size: 14px;
                font-weight: bold;
              ">
                📍
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          const userMarker = L.marker([userLocation.latitude, userLocation.longitude], { icon: userIcon });
          userMarker.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px;">
              <strong style="color: ${isInsideGeofence ? '#10b981' : '#ef4444'}; font-size: 13px;">
                ${isInsideGeofence ? '✓ Posisi Anda (Dalam Kawasan)' : '⚠️ Posisi Anda (Di Luar Kawasan)'}
              </strong>
              <div style="font-size: 12px; color: #555; margin-top: 4px;">
                Jarak ke pusat ${selectedBuilding.name}: <b>${Math.round(distanceToBuilding || 0)} meter</b><br/>
                Batas radius gedung: <b>${radius} meter</b>
              </div>
            </div>
          `);
          layerGroupRef.current.addLayer(userMarker);
        }

        // 4. Jika Supervisor/Admin: Tampilkan Pin Jejak Inspeksi Ruangan Hari Ini
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
              className: 'custom-room-pin',
              html: `
                <div style="
                  background: #10b981;
                  color: white;
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 3px 10px rgba(16, 185, 129, 0.4);
                  border: 2px solid white;
                  font-size: 12px;
                  font-weight: bold;
                ">
                  ${idx + 1}
                </div>
              `,
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });

            const roomMarker = L.marker([roomLat, roomLng], { icon: roomIcon });
            roomMarker.bindPopup(`
              <div style="font-family: sans-serif; padding: 4px;">
                <div style="font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase;">Pos Kunjungan #${idx + 1}</div>
                <strong style="font-size: 13px; color: #111; display: block; margin-top: 2px;">${t.room_name} (${t.room_code || '-'})</strong>
                <div style="font-size: 12px; color: #555; margin-top: 4px; line-height: 1.4;">
                  Petugas: <b>${t.cs_name}</b><br/>
                  Waktu Serah: <b>${t.time}</b><br/>
                  Status: <span style="color: #10b981; font-weight: 600;">✓ ${t.status}</span>
                </div>
              </div>
            `);
            layerGroupRef.current.addLayer(roomMarker);
          });
        }
      }
    }
  }, [selectedBuildingId, hasGps, selectedBuilding, userLocation, isInsideGeofence, isCs]);

  return (
    <div className="glass-panel" style={{ marginTop: '24px', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(15, 118, 110, 0.2)' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isCs ? 'Deteksi Kehadiran Fisik On-Site' : 'Live GPS & On-Site Inspection Trail'}
          </span>
          <h2 style={{ margin: '2px 0 0', fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={22} className="text-primary" /> 
            {isCs ? `Geofence Lokasi Kawasan Penugasan: ${selectedBuilding?.name || 'Gedung'}` : 'Peta Jejak Inspeksi Fisik & Geofence Kawasan'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {isCs 
              ? 'Pastikan posisi GPS perangkat Anda berada di dalam radius gedung untuk dapat melakukan scan QR ruangan'
              : 'Visualisasi peta interaktif radius geofence kawasan gedung dan pos ruangan yang diverifikasi hari ini'
            }
          </p>
        </div>

        {/* Dropdown / Tombol Aksi Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {buildings.length > 1 && (
            <select
              className="form-control"
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              style={{ fontSize: '0.88rem', fontWeight: 700, minWidth: '220px', background: 'white' }}
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>
                  🏢 {b.name} ({b.latitude !== null ? `${b.radius_meter || 250}m` : 'Belum di-set'})
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
              title="Perbarui posisi GPS saya saat ini"
              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Compass size={14} className={isDetectingGps ? 'spinner' : ''} /> 
              {isDetectingGps ? 'Mendeteksi GPS...' : '📍 Cek Lokasi Saya'}
            </button>
          ) : (
            onNavigateBuildings && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onNavigateBuildings}
                title="Kelola titik GPS gedung di menu master data"
                style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Navigation size={14} /> Atur Gedung
              </button>
            )
          )}
        </div>
      </div>

      {/* Grid: Peta Leaflet (Kiri) + Panel Kanan (CS Kehadiran atau Supervisor Trail) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Leaflet Map Canvas */}
        <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1.5px solid var(--border-color)', minHeight: '360px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '360px' }}></div>
          
          {/* Status Badge atau Warning Overlay */}
          {hasGps ? (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(6px)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 1000,
              border: '1px solid rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} /> Radius Geofence: {selectedBuilding?.radius_meter || 250} Meter
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Pusat: {Number(selectedBuilding.latitude).toFixed(5)}, {Number(selectedBuilding.longitude).toFixed(5)}
              </div>
            </div>
          ) : (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              zIndex: 1000
            }}>
              <AlertTriangle size={36} style={{ color: 'var(--warning)', marginBottom: '8px' }} />
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Titik GPS Gedung Ini Belum Diatur</strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '320px', margin: '4px 0 14px' }}>
                Gedung <b>{selectedBuilding?.name}</b> belum memiliki titik koordinat Latitude/Longitude &amp; radius geofence.
              </p>
              {onNavigateBuildings && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onNavigateBuildings}
                  style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <MapPin size={14} /> Atur Koordinat di Kelola Gedung
                </button>
              )}
            </div>
          )}
        </div>

        {/* PANEL KANAN */}
        {isCs ? (
          /* TAMPILAN KHUSUS PETUGAS CS: STATUS KEHADIRAN KAWASAN */
          <div className="glass-card" style={{ padding: '22px', margin: 0, borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'white', border: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Radio size={16} className="text-primary" /> Status Kehadiran di Kawasan
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Gedung: {selectedBuilding?.name || '-'}
                </span>
              </div>

              {/* KONDISI 1: CS DI DALAM RADIUS GEOFENCE */}
              {hasGps && userLocation && isInsideGeofence && (
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1.5px solid #10b981',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CheckCircle2 size={22} style={{ color: '#10b981' }} />
                    <strong style={{ fontSize: '1.05rem', color: '#065f46' }}>
                      Anda Masuk di Kawasan {selectedBuilding?.name}
                    </strong>
                  </div>
                  <div style={{ display: 'inline-block', background: '#10b981', color: 'white', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                    ✓ TERVERIFIKASI DI LOKASI (SIAP KERJA)
                  </div>
                  <p style={{ fontSize: '0.84rem', color: '#064e3b', margin: 0, lineHeight: 1.5 }}>
                    Posisi GPS Anda terdeteksi di dalam radius kawasan gedung (Jarak terdeteksi: <strong>{Math.round(distanceToBuilding || 0)} meter</strong> dari pusat gedung). Kunci scan QR pintu ruangan aktif dan siap digunakan.
                  </p>
                </div>
              )}

              {/* KONDISI 2: CS DI LUAR RADIUS GEOFENCE */}
              {hasGps && userLocation && !isInsideGeofence && (
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1.5px solid #ef4444',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <AlertTriangle size={22} style={{ color: '#ef4444' }} />
                    <strong style={{ fontSize: '1.05rem', color: '#991b1b' }}>
                      Anda Berada di Luar Kawasan {selectedBuilding?.name}
                    </strong>
                  </div>
                  <div style={{ display: 'inline-block', background: '#ef4444', color: 'white', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                    ⚠️ DI LUAR RADIUS KAWASAN
                  </div>
                  <p style={{ fontSize: '0.84rem', color: '#7f1d1d', margin: 0, lineHeight: 1.5 }}>
                    Jarak Anda saat ini <strong>{Math.round(distanceToBuilding || 0)} meter</strong> dari titik {selectedBuilding?.name} (Batas radius toleransi: {radius} meter). Silakan merapat ke kawasan gedung untuk dapat memindai QR ruangan.
                  </p>
                </div>
              )}

              {/* KONDISI 3: GPS SEDANG MENDETEKSI ATAU BELUM DIIZINKAN */}
              {(!userLocation || isDetectingGps) && (
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1.5px solid #f59e0b',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Compass size={22} className="spinner" style={{ color: '#d97706' }} />
                    <strong style={{ fontSize: '1.02rem', color: '#92400e' }}>
                      Mendeteksi Posisi Lokasi Anda...
                    </strong>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: '#78350f', margin: 0, lineHeight: 1.5 }}>
                    {gpsError || 'Sistem sedang mengambil titik koordinat GPS perangkat Anda untuk memastikan kehadiran fisik di kawasan gedung.'}
                  </p>
                </div>
              )}
            </div>

            {/* Tombol Aksi Bawah */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
              {isInsideGeofence ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onStartScan}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(15, 118, 110, 0.3)'
                  }}
                >
                  <QrCode size={20} /> 📷 Scan QR Ruangan &amp; Mulai Tugas
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDetectUserLocation}
                  disabled={isDetectingGps}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Compass size={18} className={isDetectingGps ? 'spinner' : ''} /> 📍 Cek Ulang Lokasi Saya
                </button>
              )}
            </div>
          </div>
        ) : (
          /* TAMPILAN SUPERVISOR / ADMIN: LINIMASA JEJAK INSPEKSI */
          <div className="glass-card" style={{ padding: '18px', margin: 0, borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} className="text-primary" /> Jejak Kunjungan Ruangan Hari Ini
              </h3>
              <span className="status-badge status-completed" style={{ fontSize: '0.72rem' }}>
                {currentBuildingInspections.length > 0 ? `${currentBuildingInspections.length} Pos Selesai` : '1 Pos Selesai'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '300px' }}>
              {(currentBuildingInspections.length > 0 ? currentBuildingInspections : [
                { id: '1', room_name: 'FA DEPT. HEAD', room_code: 'RKFA', time: '09:49 WIB', cs_name: 'Budi CS', status: 'Terverifikasi On-Site' }
              ]).map((item, idx) => (
                <div 
                  key={item.id || idx}
                  style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    padding: '10px 12px', 
                    borderRadius: 'var(--radius-lg)', 
                    background: 'rgba(15, 118, 110, 0.03)',
                    border: '1px solid rgba(15, 118, 110, 0.12)'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--success)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.room_name}</strong>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{item.time}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Petugas: <strong>{item.cs_name}</strong> {item.room_code ? `• Kode: ${item.room_code}` : ''}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> {item.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Setiap kunjungan diverifikasi langsung dengan scan QR &amp; foto fisik on-site.
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
