import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Printer, X, Filter, QrCode } from 'lucide-react';

function RoomQrCard({ room }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchQr = async () => {
      try {
        const blob = await api.get(`/rooms/${room.id}/qr-code/download`);
        const url = URL.createObjectURL(blob);
        if (active) {
          setQrUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error(`Error loading QR for room ${room.id}:`, err);
        if (active) setLoading(false);
      }
    };

    fetchQr();

    return () => {
      active = false;
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
  }, [room.id]);

  return (
    <div className="qr-print-card">
      <div className="qr-card-header">
        <span className="qr-building-name">{room.building?.nama_gedung || room.building?.name || 'CAMS'}</span>
        <span className="qr-room-floor">Lantai {room.lantai || room.floor || 1}</span>
      </div>

      <div className="qr-image-container">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px' }}>
            <span style={{ fontSize: '0.75rem', color: '#666' }}>Memuat QR...</span>
          </div>
        ) : qrUrl ? (
          <img src={qrUrl} alt={`QR ${room.kode_ruangan}`} className="qr-img" />
        ) : (
          <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={40} color="#999" />
          </div>
        )}
      </div>

      <div className="qr-card-footer">
        <div className="qr-room-code">{room.kode_ruangan || room.code}</div>
        <div className="qr-room-name">{room.nama_ruangan || room.name}</div>
        <div className="qr-branding">Cleaning Activity Monitoring System</div>
      </div>
    </div>
  );
}

export default function BulkQrPrint({ onClose }) {
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [roomsRes, bldRes] = await Promise.all([
          api.get('/rooms?is_active=true&per_page=1000'),
          api.get('/buildings?is_active=true&per_page=100'),
        ]);

        if (roomsRes.success) {
          setRooms(roomsRes.data.data || roomsRes.data || []);
        }
        if (bldRes.success) {
          setBuildings(bldRes.data.data || bldRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching rooms for print:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRooms = selectedBuilding
    ? rooms.filter((r) => r.building_id === selectedBuilding || r.building?.id === selectedBuilding)
    : rooms;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bulk-qr-modal-wrapper">
      {/* Non-printable Control Header */}
      <div className="no-print print-header-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>
            Cetak Massal QR Code Ruangan ({filteredRooms.length} Ruangan)
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="#64748b" />
            <select
              className="form-control"
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              style={{ width: '220px', padding: '6px 12px', fontSize: '0.85rem' }}
            >
              <option value="">Semua Gedung ({rooms.length})</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama_gedung || b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'inline-flex', gap: '6px' }}>
            <Printer size={16} /> Cetak Sekarang (Ctrl+P)
          </button>
          {onClose && (
            <button className="btn btn-secondary" onClick={onClose} style={{ display: 'inline-flex', gap: '4px' }}>
              <X size={16} /> Tutup
            </button>
          )}
        </div>
      </div>

      {/* Print Instructions Banner */}
      <div className="no-print" style={{ background: '#f8fafc', padding: '10px 24px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
        <strong>Tips Cetak:</strong> Di dialog print browser, pilih <em>Paper size: A4</em>, <em>Layout: Portrait</em>, dan centang <em>Background graphics</em> agar batas kartu terlihat jelas saat digunting.
      </div>

      {/* Printable Sheet */}
      <div className="print-area">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '12px', color: '#64748b' }}>Menyiapkan QR Code seluruh ruangan...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            Tidak ada ruangan yang ditemukan untuk gedung yang dipilih.
          </div>
        ) : (
          <div className="qr-cards-grid">
            {filteredRooms.map((room) => (
              <RoomQrCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>

      {/* Embedded CSS for Print Styling */}
      <style>{`
        .bulk-qr-modal-wrapper {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #ffffff;
          z-index: 99999;
          overflow-y: auto;
          color: #0f172a;
        }

        .print-header-controls {
          padding: 16px 24px;
          background: #ffffff;
          border-bottom: 2px solid #e2e8f0;
          display: flex;
          justifyContent: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .print-area {
          padding: 24px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .qr-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .qr-print-card {
          border: 2px dashed #94a3b8;
          border-radius: 8px;
          padding: 14px;
          background: #ffffff;
          text-align: center;
          page-break-inside: avoid;
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }

        .qr-card-header {
          width: 100%;
          display: flex;
          justifyContent: space-between;
          font-size: 0.72rem;
          font-weight: 700;
          color: #334155;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 4px;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .qr-image-container {
          width: 140px;
          height: 140px;
          margin: 4px 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qr-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .qr-card-footer {
          width: 100%;
          border-top: 1px solid #cbd5e1;
          padding-top: 6px;
          margin-top: 6px;
        }

        .qr-room-code {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.5px;
        }

        .qr-room-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .qr-branding {
          font-size: 0.62rem;
          color: #94a3b8;
          margin-top: 3px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .bulk-qr-modal-wrapper, .bulk-qr-modal-wrapper * {
            visibility: visible;
          }
          .bulk-qr-modal-wrapper {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: auto;
            background: #ffffff !important;
            overflow: visible;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            padding: 0;
            max-width: 100%;
            margin: 0;
          }
          .qr-cards-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
          }
          .qr-print-card {
            border: 1.5px dashed #475569 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
