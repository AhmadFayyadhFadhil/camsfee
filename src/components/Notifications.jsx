import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { resolveNotificationTarget, getNotificationModuleLabel } from '../utils/notificationRouter';

export default function Notifications({ unreadCount, setUnreadCount, fetchNotifications, onNavigate, userRoles = [] }) {
  const confirm = useConfirm();
  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'unread', or 'read'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [counts, setCounts] = useState({ total: 0, unread: 0, read: 0 });

  const fetchHistory = async (pageNumber = 1, isAppend = false) => {
    setLoading(true);
    setError(null);
    try {
      let isReadParam = '';
      if (activeFilter === 'unread') isReadParam = '&is_read=false';
      if (activeFilter === 'read') isReadParam = '&is_read=true';

      const response = await api.get(`/notifications?page=${pageNumber}&per_page=15${isReadParam}`);
      if (response.success) {
        const fetchedData = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.data || []);
        const meta = response.meta || response.data?.meta || {};
        
        if (isAppend) {
          setNotificationsList(prev => [...prev, ...fetchedData]);
        } else {
          setNotificationsList(fetchedData);
        }
        
        // Update counts from backend meta
        const total = meta.total_count ?? (meta.total ?? fetchedData.length);
        const unread = meta.unread_count ?? fetchedData.filter(n => !n.is_read).length;
        const read = meta.read_count ?? Math.max(0, total - unread);
        setCounts({ total, unread, read });
        if (setUnreadCount) setUnreadCount(unread);

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

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Mark single notification as read
  const handleMarkAsReadLocal = async (notifId) => {
    try {
      const response = await api.patch(`/notifications/${notifId}/read`);
      if (response.success) {
        setNotificationsList(prev => {
          if (activeFilter === 'unread') {
            return prev.filter(n => n.id !== notifId);
          }
          return prev.map(n => n.id === notifId ? { ...n, is_read: true } : n);
        });
        setCounts(prev => ({
          ...prev,
          unread: Math.max(0, prev.unread - 1),
          read: prev.read + 1
        }));
        if (setUnreadCount) setUnreadCount(prev => Math.max(0, prev - 1));
        if (fetchNotifications) fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      setError(err.message || 'Gagal menandai notifikasi dibaca.');
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const response = await api.patch('/notifications/mark-all-read');
      if (response.success) {
        setNotificationsList(prev => {
          if (activeFilter === 'unread') return [];
          return prev.map(n => ({ ...n, is_read: true }));
        });
        setCounts(prev => ({
          total: prev.total,
          unread: 0,
          read: prev.total
        }));
        if (setUnreadCount) setUnreadCount(0);
        if (fetchNotifications) fetchNotifications();
        setSuccessMsg('Semua notifikasi berhasil ditandai sebagai terbaca.');
      }
    } catch (err) {
      setError(err.message || 'Gagal menandai semua notifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete single notification
  const handleDeleteSingle = async (notifId) => {
    try {
      const notifItem = notificationsList.find(n => n.id === notifId);
      const isUnread = notifItem && !notifItem.is_read;

      const response = await api.delete(`/notifications/${notifId}`);
      if (response.success) {
        setNotificationsList(prev => prev.filter(n => n.id !== notifId));
        setCounts(prev => ({
          total: Math.max(0, prev.total - 1),
          unread: isUnread ? Math.max(0, prev.unread - 1) : prev.unread,
          read: !isUnread ? Math.max(0, prev.read - 1) : prev.read,
        }));
        if (isUnread && setUnreadCount) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        if (fetchNotifications) fetchNotifications();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus notifikasi.');
    }
  };

  // Delete all notifications
  const handleDeleteAll = async () => {
    if (notificationsList.length === 0 && counts.total === 0) return;

    const confirmed = await confirm({
      title: 'Hapus Semua Notifikasi?',
      message: 'Semua riwayat notifikasi Anda akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus Semua',
      cancelText: 'Batal',
      type: 'danger'
    });

    if (!confirmed) return;

    setActionLoading(true);
    try {
      const response = await api.delete('/notifications/delete-all');
      if (response.success) {
        setNotificationsList([]);
        setCounts({ total: 0, unread: 0, read: 0 });
        if (setUnreadCount) setUnreadCount(0);
        if (fetchNotifications) fetchNotifications();
        setSuccessMsg('Semua notifikasi berhasil dihapus.');
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus semua notifikasi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRowClick = (notif) => {
    if (!notif.is_read) {
      handleMarkAsReadLocal(notif.id);
    }
    const targetTab = resolveNotificationTarget(notif, userRoles);
    if (onNavigate) {
      onNavigate(targetTab);
    } else {
      window.location.hash = '#' + targetTab;
    }
  };

  const getNotificationIcon = (title = '') => {
    const t = title.toLowerCase();
    if (t.includes('penugasan') || t.includes('jadwal') || t.includes('tugas')) {
      return <Clock size={20} style={{ color: 'var(--primary)' }} />;
    }
    if (t.includes('ditolak') || t.includes('perbaikan') || t.includes('kerusakan') || t.includes('temuan')) {
      return <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />;
    }
    if (t.includes('disetujui') || t.includes('selesai') || t.includes('sukses') || t.includes('terverifikasi')) {
      return <Check size={20} style={{ color: 'var(--success)' }} />;
    }
    return <Info size={20} style={{ color: 'var(--primary)' }} />;
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
      {/* Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--primary)' }}>
          <Bell size={22} style={{ color: 'var(--primary)' }} />
          Pusat Notifikasi
        </h2>
      </div>

      {/* Toolbar: Segment Filter & Action Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '12px', 
        marginBottom: '22px',
        padding: '8px 12px',
        background: 'rgba(14, 49, 146, 0.03)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid rgba(14, 49, 146, 0.08)'
      }}>
        {/* Left: Filter Pills */}
        <div style={{ display: 'inline-flex', gap: '6px', background: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: 'var(--radius-lg)' }}>
          <button 
            className="btn btn-sm"
            onClick={() => setActiveFilter('all')}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeFilter === 'all' ? '#ffffff' : 'transparent',
              color: activeFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: activeFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Semua</span>
            <span style={{ 
              background: activeFilter === 'all' ? 'rgba(14, 49, 146, 0.1)' : 'rgba(0,0,0,0.06)', 
              color: activeFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)', 
              padding: '1px 7px', 
              borderRadius: '12px', 
              fontSize: '0.72rem',
              fontWeight: 700 
            }}>
              {counts.total}
            </span>
          </button>

          <button 
            className="btn btn-sm"
            onClick={() => setActiveFilter('unread')}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeFilter === 'unread' ? '#ffffff' : 'transparent',
              color: activeFilter === 'unread' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: activeFilter === 'unread' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Belum Dibaca</span>
            {counts.unread > 0 ? (
              <span style={{ 
                background: 'var(--danger)', 
                color: '#ffffff', 
                padding: '1px 7px', 
                borderRadius: '12px', 
                fontSize: '0.72rem',
                fontWeight: 700 
              }}>
                {counts.unread}
              </span>
            ) : (
              <span style={{ 
                background: activeFilter === 'unread' ? 'rgba(14, 49, 146, 0.1)' : 'rgba(0,0,0,0.06)', 
                color: activeFilter === 'unread' ? 'var(--primary)' : 'var(--text-secondary)', 
                padding: '1px 7px', 
                borderRadius: '12px', 
                fontSize: '0.72rem',
                fontWeight: 700 
              }}>
                0
              </span>
            )}
          </button>

          <button 
            className="btn btn-sm"
            onClick={() => setActiveFilter('read')}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeFilter === 'read' ? '#ffffff' : 'transparent',
              color: activeFilter === 'read' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: activeFilter === 'read' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <span>Sudah Dibaca</span>
            <span style={{ 
              background: activeFilter === 'read' ? 'rgba(14, 49, 146, 0.1)' : 'rgba(0,0,0,0.06)', 
              color: activeFilter === 'read' ? 'var(--primary)' : 'var(--text-secondary)', 
              padding: '1px 7px', 
              borderRadius: '12px', 
              fontSize: '0.72rem',
              fontWeight: 700 
            }}>
              {counts.read}
            </span>
          </button>
        </div>

        {/* Right: Actions Buttons */}
        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
          <button 
            type="button"
            className="btn btn-sm"
            onClick={handleMarkAllAsRead}
            disabled={actionLoading || counts.unread === 0}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '7px 14px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(14, 49, 146, 0.15)',
              background: '#ffffff',
              color: 'var(--primary)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              cursor: counts.unread === 0 ? 'not-allowed' : 'pointer',
              opacity: counts.unread === 0 ? 0.6 : 1
            }}
          >
            <CheckCheck size={16} />
            <span>Tandai Semua Dibaca</span>
          </button>

          <button 
            type="button"
            className="btn btn-sm"
            onClick={handleDeleteAll}
            disabled={actionLoading || (notificationsList.length === 0 && counts.total === 0)}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '7px 14px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              background: 'rgba(239, 68, 68, 0.06)',
              color: 'var(--danger)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              cursor: (notificationsList.length === 0 && counts.total === 0) ? 'not-allowed' : 'pointer',
              opacity: (notificationsList.length === 0 && counts.total === 0) ? 0.6 : 1
            }}
          >
            <Trash2 size={16} />
            <span>Hapus Semua</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {notificationsList.map(n => {
          const targetTab = resolveNotificationTarget(n, userRoles);
          const targetLabel = getNotificationModuleLabel(targetTab);

          return (
            <div 
              key={n.id} 
              className="glass-panel"
              style={{ 
                padding: '16px 18px', 
                display: 'flex', 
                gap: '14px', 
                alignItems: 'center',
                borderLeft: n.is_read ? '4px solid transparent' : '4px solid var(--primary)',
                background: n.is_read ? '#ffffff' : 'rgba(14, 49, 146, 0.03)',
                borderRadius: 'var(--radius-xl)',
                border: n.is_read ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(14, 49, 146, 0.12)',
                boxShadow: n.is_read ? 'none' : '0 2px 8px rgba(14, 49, 146, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => handleRowClick(n)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = n.is_read ? 'rgba(0,0,0,0.06)' : 'rgba(14, 49, 146, 0.12)'; }}
            >
              <div style={{ 
                padding: '10px', 
                background: n.is_read ? 'rgba(0,0,0,0.03)' : 'rgba(14, 49, 146, 0.08)', 
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getNotificationIcon(n.title)}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '0.96rem', 
                    fontWeight: n.is_read ? 600 : 750, 
                    color: n.is_read ? 'var(--text-primary)' : 'var(--primary)' 
                  }}>
                    {n.title}
                  </h4>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} />
                    {formatDateTime(n.created_at)}
                  </span>
                </div>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {n.message}
                </p>
              </div>

              {/* Per-Item Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-md)'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(n);
                  }}
                  title={`Buka modul ${targetLabel}`}
                >
                  <ExternalLink size={13} />
                  <span className="col-hide-mobile">{targetLabel}</span>
                </button>

                {!n.is_read ? (
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      padding: '6px 12px', 
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      borderColor: 'var(--primary)',
                      color: 'var(--primary)',
                      background: '#ffffff',
                      borderRadius: 'var(--radius-md)'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsReadLocal(n.id);
                    }}
                    title="Tandai notifikasi ini sudah dibaca"
                  >
                    <Check size={14} />
                    <span>Dibaca</span>
                  </button>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, padding: '4px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <Check size={13} /> Terbaca
                  </span>
                )}

                <button 
                  type="button"
                  className="btn btn-sm"
                  style={{ 
                    padding: '6px 8px', 
                    color: 'var(--text-muted)',
                    border: '1px solid transparent',
                    background: 'transparent',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSingle(n.id);
                  }}
                  title="Hapus notifikasi ini"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--danger)';
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}

        {loading && notificationsList.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="spinner"></div>
          </div>
        )}

        {!loading && notificationsList.length === 0 && (
          <div className="glass-panel" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', borderRadius: 'var(--radius-xl)' }}>
            <Bell size={36} style={{ marginBottom: '14px', color: 'var(--text-muted)', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 500 }}>Tidak ada notifikasi pada kategori ini.</p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => fetchHistory(page + 1, true)}
            style={{ fontWeight: 600 }}
          >
            Muat Lebih Banyak Notifikasi
          </button>
        </div>
      )}
      
      {hasMore && loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
          <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
        </div>
      )}
    </div>
  );
}
