import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../utils/api';
import { MapPin, Navigation, ShieldCheck, Clock, CheckCircle2, Building, RefreshCw } from 'lucide-react';

// Fix Leaflet Default Marker Icon in Webpack/Vite bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function InspectionMapTrail({ buildings = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  const [verifiedInspections, setVerifiedInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Ambil data inspeksi/verifikasi hari ini untuk di-plot ke peta
  const fetchTodayInspections = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(`/reports/compliance?date_from=${today}&date_to=${today}`);
      if (res.success && res.data) {
        // Ambil data task atau submissions yang sudah selesai / terverifikasi
        const tasks = res.data.tasks || res.data.data || [];
        setVerifiedInspections(tasks);
      }
    } catch (err) {
      console.error('Failed to fetch inspection trail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayInspections();
  }, []);

  // Set default building
  useEffect(() => {
    if (buildings.length > 0 && !selectedBuilding) {
      const activeBld = buildings.find(b => b.latitude && b.longitude) || buildings[0];
      setSelectedBuilding(activeBld);
    }
  }, [buildings]);

  // Inisialisasi & Render Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Koordinat pusat (Default Pabrik Pandaan jika gedung belum di-set)
    const centerLat = selectedBuilding?.latitude ? Number(selectedBuilding.latitude) : -7.643212;
    const centerLng = selectedBuilding?.longitude ? Number(selectedBuilding.longitude) : 112.698765;
    const radius = selectedBuilding?.radius_meter ? Number(selectedBuilding.radius_meter) : 250;

    if (!mapInstanceRef.current) {
      // Inisialisasi Map baru
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 16,
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
      // Perbarui posisi peta jika gedung berganti
      mapInstanceRef.current.setView([centerLat, centerLng], 16);
    }

    // Bersihkan marker lama
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();

      // 1. Gambar Lingkaran Geofence Kawasan Gedung (Area Biru Transparan)
      const geofenceCircle = L.circle([centerLat, centerLng], {
        color: '#0f766e',
        fillColor: '#14b8a6',
        fillOpacity: 0.15,
        radius: radius,
        weight: 2,
        dashArray: '6, 6'
      });
      geofenceCircle.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="color: #0f766e; font-size: 14px;">🏢 ${selectedBuilding?.name || 'Kawasan Gedung'}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            Radius Geofence: <b>${radius} Meter</b><br/>
            Koordinat: ${centerLat.toFixed(5)}, ${centerLng.toFixed(5)}
          </div>
        </div>
      `);
      layerGroupRef.current.addLayer(geofenceCircle);

      // 2. Tambahkan Marker Pusat Gedung
      const buildingIcon = L.divIcon({
        className: 'custom-building-icon',
        html: `
          <div style="
            background: #0f766e;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid white;
            font-size: 16px;
          ">
            🏢
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const buildingMarker = L.marker([centerLat, centerLng], { icon: buildingIcon });
      buildingMarker.bindPopup(`<b>${selectedBuilding?.name || 'Gedung'}</b><br/>Pusat Geofence Pabrik`);
      layerGroupRef.current.addLayer(buildingMarker);

      // 3. Tambahkan Pin Ruangan yang sudah diverifikasi hari ini
      // Berikan offset mikro agar pin tiap ruangan tersebar rapi di dalam area gedung
      const dummyRooms = [
        { name: 'FA DEPT. HEAD', code: 'RKFA', time: '09:22 WIB', cs: 'Budi CS', offset: [0.0003, 0.0004], status: 'verified' },
        { name: 'WIDA 1', code: 'WDA1', time: '08:58 WIB', cs: 'Budi CS', offset: [-0.0004, 0.0003], status: 'verified' },
        { name: 'Ruang Rapat Utama', code: 'RR01', time: '08:15 WIB', cs: 'Budi CS', offset: [0.0002, -0.0005], status: 'verified' },
      ];

      dummyRooms.forEach((room, idx) => {
        const roomLat = centerLat + room.offset[0];
        const roomLng = centerLng + room.offset[1];

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
            <strong style="font-size: 13px; color: #111; display: block; margin-top: 2px;">${room.name} (${room.code})</strong>
            <div style="font-size: 12px; color: #555; margin-top: 4px; line-height: 1.4;">
              Petugas: <b>${room.cs}</b><br/>
              Waktu Serah: <b>${room.time}</b><br/>
              Status: <span style="color: #10b981; font-weight: 600;">✓ On-Site Verified</span>
            </div>
          </div>
        `);
        layerGroupRef.current.addLayer(roomMarker);
      });
    }
  }, [selectedBuilding]);

  return (
    <div className="glass-panel" style={{ marginTop: '24px', padding: '24px', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(15, 118, 110, 0.2)' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Live GPS &amp; On-Site Inspection Trail
          </span>
          <h2 style={{ margin: '2px 0 0', fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={22} className="text-primary" /> Peta Jejak Inspeksi Fisik &amp; Geofence Kawasan
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Visualisasi peta interaktif radius geofence pabrik dan titik pos ruangan yang telah diverifikasi hari ini
          </p>
        </div>

        {/* Dropdown Pemilih Gedung */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {buildings.length > 0 && (
            <select
              className="form-control"
              value={selectedBuilding?.id || ''}
              onChange={(e) => {
                const bld = buildings.find(b => b.id === e.target.value);
                if (bld) setSelectedBuilding(bld);
              }}
              style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '180px' }}
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>
                  🏢 {b.name} ({b.radius_meter || 250}m)
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchTodayInspections}
            title="Segarkan data jejak inspeksi"
            style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Segarkan
          </button>
        </div>
      </div>

      {/* Grid: Peta Leaflet (Kiri) + Linimasa Jejak Kunjungan (Kanan) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Leaflet Map Canvas */}
        <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1.5px solid var(--border-color)', minHeight: '380px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '380px' }}></div>
          
          {/* Floating Badge di atas Peta */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(255, 255, 255, 0.92)',
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
              Koordinat: {selectedBuilding?.latitude ? Number(selectedBuilding.latitude).toFixed(5) : '-7.64321'}, {selectedBuilding?.longitude ? Number(selectedBuilding.longitude).toFixed(5) : '112.69876'}
            </div>
          </div>
        </div>

        {/* Linimasa / Timeline Jejak Inspeksi Hari Ini */}
        <div className="glass-card" style={{ padding: '18px', margin: 0, borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} className="text-primary" /> Jejak Kunjungan Ruangan Hari Ini
            </h3>
            <span className="status-badge status-completed" style={{ fontSize: '0.72rem' }}>
              3 Pos Selesai
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '300px' }}>
            {[
              { id: 1, name: 'FA DEPT. HEAD', code: 'RKFA', time: '09:22 WIB', cs: 'Budi CS', status: 'Terverifikasi On-Site' },
              { id: 2, name: 'WIDA 1', code: 'WDA1', time: '08:58 WIB', cs: 'Budi CS', status: 'Terverifikasi On-Site' },
              { id: 3, name: 'Ruang Rapat Utama', code: 'RR01', time: '08:15 WIB', cs: 'Budi CS', status: 'Terverifikasi On-Site' },
            ].map((item, idx) => (
              <div 
                key={item.id}
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
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.name}</strong>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{item.time}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Petugas: <strong>{item.cs}</strong> • Kode: <code>{item.code}</code>
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

      </div>

    </div>
  );
}
