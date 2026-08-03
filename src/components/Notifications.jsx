import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Bell, Check, Info, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

export default function Notifications({ unreadCount, setUnreadCount, fetchNotifications }) {
  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' or 'unread'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchHistory = async (pageNumber = 1, isAppend = false) => {
    setLoading(true);
    try {
      const isReadParam = activeFilter === 'unread' ? '&is_read=false' : '';
      const response = await api.get(`/notifications?page=${pageNumber}&per_page=15${isReadParam}`);
      if (response.success && response.data) {
        const fetchedData = response.data.data || response.data || [];
        const meta = response.data.meta || {};
        
        if (isAppend) {
          setNotificationsList(prev => [...prev, ...fetchedData]);
        } else {
          setNotificationsList(fetchedData);
        }
        
        // Check if there are more pages
        const currentPage = meta.current_page || pageNumber;
        const lastPage = meta.last_page || 1;
        setHasMore(currentPage < lastPage);
        setPage(pageNumber);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat riwayat notifikasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1, false);
  }, [activeFilter]);

  const handleMarkAsReadLocal = async (notifId) => {
    try {
      const response = await api.patch(`/notifications/${notifId}/read`);
      if (response.success) {
        // Update local list
        setNotificationsList(prev => 
          prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
        );
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
        // Refresh header bell notifications
        if (fetchNotifications) fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const getNotificationIcon = (title = '') => {
    const t = title.toLowerCase();
    if (t.includes('penugasan') || t.includes('jadwal')) {
      return <Clock size={20} style={{ color: 'var(--primary)' }} />;
    }
    if (t.includes('ditolak') || t.includes('perbaikan') || t.includes('kerusakan')) {
      return <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />;
    }
    if (t.includes('disetujui') || t.includes('selesai') || t.includes('sukses')) {
      return <Check size={20} style={{ color: 'var(--success)' }} />;
    }
    return <Info size={20} style={{ color: 'var(--secondary)' }} />;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bell size={22} style={{ color: 'var(--primary)' }} />
          Pusat Notifikasi
        </h2>
        
        {/* Tab Filters */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveFilter('all')}
          >
            Semua
          </button>
          <button 
            className={`btn ${activeFilter === 'unread' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveFilter('unread')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            Belum Dibaca
            {unreadCount > 0 && (
              <span style={{ background: 'var(--danger)', color: 'var(--on-primary)', padding: '1px 5px', borderRadius: '10px', fontSize: '0.65rem' }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notificationsList.map(n => (
          <div 
            key={n.id} 
            className="glass-panel"
            style={{ 
              padding: '16px', 
              display: 'flex', 
              gap: '16px', 
              alignItems: 'flex-start',
              borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--primary)',
              background: n.is_read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(14, 49, 146, 0.03)',
              transition: 'all 0.2s ease',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
              {getNotificationIcon(n.title)}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: n.is_read ? 600 : 700, color: 'var(--on-surface)' }}>
                  {n.title}
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  {formatDateTime(n.created_at)}
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {n.message}
              </p>
            </div>

            {!n.is_read && (
              <button 
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                onClick={() => handleMarkAsReadLocal(n.id)}
                title="Tandai sudah dibaca"
                aria-label="Tandai sebagai dibaca"
              >
                Dibaca
              </button>
            )}
          </div>
        ))}

        {loading && notificationsList.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="spinner"></div>
          </div>
        )}

        {!loading && notificationsList.length === 0 && (
          <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)' }}>
            <Bell size={32} style={{ marginBottom: '12px', color: 'var(--text-muted)', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Tidak ada notifikasi yang ditemukan.</p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => fetchHistory(page + 1, true)}
          >
            Muat Lebih Banyak
          </button>
        </div>
      )}
      
      {hasMore && loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
          <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
        </div>
      )}
    </div>
  );
}
