import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import api from './utils/api';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Buildings = lazy(() => import('./components/Buildings'));
const Rooms = lazy(() => import('./components/Rooms'));
const UsersList = lazy(() => import('./components/Users'));
const Schedules = lazy(() => import('./components/Schedules'));
const CsTasks = lazy(() => import('./components/CsTasks'));
const Verifications = lazy(() => import('./components/Verifications'));
const Findings = lazy(() => import('./components/Findings'));
const AuditLogs = lazy(() => import('./components/AuditLogs'));
const Profile = lazy(() => import('./components/Profile'));
const Reports = lazy(() => import('./components/Reports'));
const Notifications = lazy(() => import('./components/Notifications'));
const AppSettings = lazy(() => import('./components/AppSettings'));
const ChecklistTemplates = lazy(() => import('./components/ChecklistTemplates'));
const RoomAssets = lazy(() => import('./components/RoomAssets'));
const CleaningMaterials = lazy(() => import('./components/CleaningMaterials'));
const SlaParameters = lazy(() => import('./components/SlaParameters'));
const AdhocTaskSupervisor = lazy(() => import('./components/AdhocTaskSupervisor'));
const CsAdhocTasks = lazy(() => import('./components/CsAdhocTasks'));

import { 
  Shield, 
  LogOut, 
  Bell, 
  User, 
  Building, 
  Home, 
  ClipboardCheck, 
  Users, 
  CheckSquare, 
  FileText, 
  AlertOctagon, 
  Clock, 
  Layers, 
  Check, 
  X,
  Menu, 
  ShieldAlert, 
  Sliders, 
  Zap, 
  Box, 
  Sparkles, 
  Award 
} from 'lucide-react';
import { useConfirm } from './context/ConfirmContext.jsx';

const VALID_TABS = [
  'dashboard', 'tasks', 'cs_adhoc', 'verifications', 'adhoc_tasks',
  'findings', 'buildings', 'rooms', 'checklist_templates', 'room_assets',
  'cleaning_materials', 'sla_parameters', 'schedules',
  'reports', 'users', 'app_settings', 'audit_logs', 'notifications_panel', 'profile'
];

const getInitialTab = () => {
  try {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash === 'checklist_items') {
      window.location.hash = 'checklist_templates';
      return 'checklist_templates';
    }
    if (hash && VALID_TABS.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('cams_active_tab');
    if (saved === 'checklist_items') {
      localStorage.setItem('cams_active_tab', 'checklist_templates');
      return 'checklist_templates';
    }
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
  } catch (e) {}
  return 'dashboard';
};

export default function App() {
  const confirm = useConfirm();
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [user, setUser] = useState(api.getUser());
  const [currentTab, setCurrentTab] = useState(getInitialTab);
  const [openScanModalOnMount, setOpenScanModalOnMount] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const contentBodyRef = useRef(null);

  // Mapping judul halaman — Bahasa Indonesia bersih (untuk pengguna non-teknis)
  const TAB_TITLES = {
    dashboard: 'Dashboard',
    tasks: 'Tugas Harian Saya',
    cs_adhoc: 'Tugas Mendadak',
    verifications: 'Verifikasi Laporan',
    adhoc_tasks: 'Tugas Mendadak',
    findings: 'Laporan Temuan Kerusakan',
    buildings: 'Kelola Gedung',
    rooms: 'Kelola Ruangan',
    checklist_templates: 'Template Checklist',
    room_assets: 'Aset & Peralatan Ruangan',
    cleaning_materials: 'Bahan Kimia & Alat',
    sla_parameters: 'Parameter Penilaian SLA',
    schedules: 'Jadwal & Penugasan CS',
    reports: 'Ekspor Laporan',
    users: 'Kelola Pengguna',
    app_settings: 'Pengaturan Sistem',
    audit_logs: 'Riwayat Aktivitas Sistem',
    notifications_panel: 'Kotak Notifikasi',
    profile: 'Profil Saya',
  };

  const selectTab = (tab) => {
    const targetTab = tab === 'checklist_items' ? 'checklist_templates' : tab;
    if (!VALID_TABS.includes(targetTab)) return;
    setCurrentTab(targetTab);
    setIsSidebarOpen(false);

    if (window.location.hash !== `#${targetTab}`) {
      window.location.hash = targetTab;
    }
    localStorage.setItem('cams_active_tab', targetTab);
  };
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alert, setAlert] = useState(null);
  const [scannedTaskData, setScannedTaskData] = useState(null);

  const normalizeLogoUrl = (url) => {
    if (!url) return null;
    if (typeof url === 'string' && (url.includes('/api/v1/settings/logo/image') || url.includes('/settings/logo/image'))) {
      return '/api/v1/settings/logo/image';
    }
    return url;
  };

  // App Identity states (cached in localStorage for instant rendering on refresh)
  const getCachedSettings = () => {
    try {
      const cached = localStorage.getItem('cams_public_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.company_logo) {
          parsed.company_logo = normalizeLogoUrl(parsed.company_logo);
        }
        return parsed;
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const [appIdentity, setAppIdentity] = useState(() => {
    const cached = getCachedSettings();
    if (cached) return cached;
    return {
      company_name: 'PT WIDARTA BHAKTI',
      company_logo: '/api/v1/settings/logo/image',
      company_description: 'Cleaning Activity Monitor',
      app_footer_text: '© 2026 CAMS Pandaan. All rights reserved.'
    };
  });

  const fetchPublicSettings = async () => {
    try {
      const response = await api.get('/settings/public');
      if (response.success && response.data) {
        const normData = {
          ...response.data,
          company_logo: normalizeLogoUrl(response.data.company_logo)
        };
        setAppIdentity(normData);
        localStorage.setItem('cams_public_settings', JSON.stringify(normData));
        if (normData.company_name) {
          document.title = normData.company_name + " - Cleaning Activity Monitoring System";
        }
        if (normData.company_logo) {
          const link = document.querySelector("link[rel~='icon']");
          if (link) {
            link.href = normData.company_logo;
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch public settings:', err);
    }
  };

  useEffect(() => {
    fetchPublicSettings();
  }, []);

  // Sinkronisasi data profil terbaru langsung dari backend database saat App dibuka / di-refresh (F5)
  const syncCurrentUserProfile = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/auth/me');
      if (response.success && response.data) {
        const freshUser = response.data;
        api.setUser(freshUser);
        setUser((prev) => ({ ...prev, ...freshUser }));
      }
    } catch (err) {
      console.error('Failed to sync current user profile:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      syncCurrentUserProfile();
    }
  }, [isAuthenticated]);

  // Auto-dismiss alert banner setelah 5 detik
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, [alert]);

  // Auto-logout helper
  useEffect(() => {
    api.onUnauthorized = () => {
      setIsAuthenticated(false);
      setUser(null);
      setAlert({ type: 'danger', message: 'Sesi Anda telah berakhir. Silakan login kembali.' });
    };
  }, []);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await api.get('/notifications?is_read=false');
      if (response.success && response.data) {
        // Handle paginated notifications
        const list = response.data.data || response.data || [];
        setNotifications(list);
        setUnreadCount(list.length);
        
        // Show an alert if a new notification just came in (simple match)
        if (list.length > unreadCount && unreadCount > 0) {
          const latest = list[0];
          setAlert({ type: 'success', message: `${latest.title}: ${latest.message}` });
        }
      }
    } catch (err) {
      console.error('Failed to poll notifications:', err);
    }
  };

  // Notification short-polling (visibility-aware & relaxed)
  useEffect(() => {
    if (!isAuthenticated) return;

    let intervalId = null;
    let initialDelayId = null;

    const startPolling = () => {
      fetchNotifications();
      // Poll every 20 seconds (more than enough for local simulation and saves massive backend CPU)
      intervalId = setInterval(fetchNotifications, 20000);
    };

    const stopPolling = () => {
      if (initialDelayId) {
        clearTimeout(initialDelayId);
        initialDelayId = null;
      }
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        initialDelayId = setTimeout(startPolling, 1500);
      } else {
        stopPolling();
      }
    };

    // Start initially with a 2-second delay to keep the main thread free for Dashboard LCP
    if (document.visibilityState === 'visible') {
      initialDelayId = setTimeout(startPolling, 2000);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  // 1. Sync on Mount & Tab Change + Auto Scroll-To-Top (Mengatasi masalah modul terpotong)
  useEffect(() => {
    if (isAuthenticated) {
      if (window.location.hash !== `#${currentTab}`) {
        window.location.hash = currentTab;
      }
      localStorage.setItem('cams_active_tab', currentTab);

      // Auto Scroll-To-Top on Tab Change
      if (contentBodyRef.current) {
        contentBodyRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
      window.scrollTo(0, 0);
    }
  }, [currentTab, isAuthenticated]);

  // 2. Listen to Browser Back / Forward hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && VALID_TABS.includes(hash) && hash !== currentTab) {
        setCurrentTab(hash);
        localStorage.setItem('cams_active_tab', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentTab]);

  const handleLoginSuccess = (loggedInUser, token) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
    const initial = getInitialTab();
    setCurrentTab(initial);
    window.location.hash = initial;
    setAlert({ type: 'success', message: `Selamat datang kembali, ${loggedInUser.name}!` });
  };

  const handleLogout = async () => {
    if (!(await confirm({
      title: 'Keluar dari Sistem',
      message: 'Apakah Anda yakin ingin keluar dari sistem?',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      type: 'warning'
    }))) {
      return;
    }
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      api.setToken(null, null);
      setIsAuthenticated(false);
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
      setAlert(null);
      localStorage.removeItem('cams_active_tab');
      window.location.hash = '';
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      const response = await api.patch(`/notifications/${notifId}/read`);
      if (response.success) {
        setNotifications(notifications.filter(n => n.id !== notifId));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} appIdentity={appIdentity} />;
  }

  // Get active roles for menu rendering
  const isAdmin = user.roles && user.roles.includes('admin');
  const isSupervisor = user.roles && user.roles.includes('supervisor');
  const isPic = user.roles && user.roles.includes('pic');
  const isCs = user.roles && user.roles.includes('cleaning_service');
  const isOb = user.roles && user.roles.includes('ob');
  const isManager = user.roles && user.roles.includes('manager');

  const getRoleLabel = () => {
    if (isAdmin) return 'Admin';
    if (isSupervisor) return 'Supervisor';
    if (isPic) return 'PIC Area';
    if (isCs) return 'CS Staff';
    if (isOb) return 'Office Boy';
    if (isManager) return 'Manager';
    return 'Staf';
  };

  const getRoleBadgeClass = () => {
    if (isAdmin) return 'role-admin';
    if (isSupervisor) return 'role-supervisor';
    if (isPic) return 'role-pic';
    if (isCs) return 'role-cs';
    if (isOb) return 'role-ob';
    return 'role-manager';
  };

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
          {appIdentity.company_logo ? (
            <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img 
                src={normalizeLogoUrl(appIdentity.company_logo)} 
                alt="Logo" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/favicon.svg';
                }}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  mixBlendMode: 'multiply'
                }} 
              />
            </div>
          ) : (
            <div className="sidebar-logo" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              <Shield size={20} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '1.05rem', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--primary)', lineHeight: 1.1 }}>
              {appIdentity.company_name}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '3px', letterSpacing: '0.2px' }}>
              {appIdentity.company_description || 'Cleaning Activity Monitor'}
            </span>
          </div>
          <button 
            type="button" 
            className="sidebar-close-btn" 
            onClick={() => setIsSidebarOpen(false)} 
            aria-label="Tutup Menu"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="sidebar-menu">
          <li className="sidebar-item-group-title">Menu Utama</li>
          <li>
            <button 
              className={`sidebar-link ${currentTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => selectTab('dashboard')}
            >
              <Layers size={18} /> Dashboard
            </button>
          </li>
          <li>
            <button 
              className={`sidebar-link ${currentTab === 'notifications_panel' ? 'active' : ''}`}
              onClick={() => selectTab('notifications_panel')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Bell size={18} /> Notifikasi
                </div>
                {unreadCount > 0 && (
                  <span 
                    className="notification-badge-sidebar" 
                    style={{ 
                      background: 'var(--danger)', 
                      color: '#ffffff', 
                      padding: '2px 7px', 
                      borderRadius: '10px', 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold',
                      boxShadow: '0 2px 5px rgba(220, 38, 38, 0.4)'
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
            </button>
          </li>

          {/* Cleaning Service menu */}
          {isCs && (
            <>
              <li className="sidebar-item-group-title">Aktivitas CS</li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'tasks' ? 'active' : ''}`}
                  onClick={() => selectTab('tasks')}
                >
                  <ClipboardCheck size={18} /> Tugas Hari Ini
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'cs_adhoc' ? 'active' : ''}`}
                  onClick={() => selectTab('cs_adhoc')}
                >
                  <FileText size={18} /> Tugas Mendadak
                </button>
              </li>
            </>
          )}

          {/* PIC / Supervisor approvals menu */}
          {(isPic || isSupervisor || isAdmin) && (
            <>
              <li className="sidebar-item-group-title">Monitoring & Approval</li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'verifications' ? 'active' : ''}`}
                  onClick={() => selectTab('verifications')}
                >
                  <CheckSquare size={18} /> Verifikasi Laporan
                </button>
              </li>
              {(isSupervisor || isAdmin) && (
                <li>
                  <button 
                    className={`sidebar-link ${currentTab === 'adhoc_tasks' ? 'active' : ''}`}
                    onClick={() => selectTab('adhoc_tasks')}
                  >
                    <FileText size={18} /> Tugas Mendadak
                  </button>
                </li>
              )}
            </>
          )}

          {/* Findings - accessible by everyone */}
          <li className="sidebar-item-group-title">Fasilitas</li>
          <li>
            <button 
              className={`sidebar-link ${currentTab === 'findings' ? 'active' : ''}`}
              onClick={() => selectTab('findings')}
            >
              <AlertOctagon size={18} /> Temuan Kerusakan
            </button>
          </li>

          {/* Master data (Supervisor / Admin only) */}
          {(isSupervisor || isAdmin) && (
            <>
              <li className="sidebar-item-group-title">Master Data</li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'buildings' ? 'active' : ''}`}
                  onClick={() => selectTab('buildings')}
                >
                  <Building size={18} /> Kelola Gedung
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'rooms' ? 'active' : ''}`}
                  onClick={() => selectTab('rooms')}
                >
                  <Home size={18} /> Kelola Ruangan
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'checklist_templates' ? 'active' : ''}`}
                  onClick={() => selectTab('checklist_templates')}
                >
                  <Layers size={18} /> Template Checklist
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'room_assets' ? 'active' : ''}`}
                  onClick={() => selectTab('room_assets')}
                >
                  <Box size={18} /> Aset Ruangan
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'cleaning_materials' ? 'active' : ''}`}
                  onClick={() => selectTab('cleaning_materials')}
                >
                  <Sparkles size={18} /> Bahan Kimia & Alat
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'sla_parameters' ? 'active' : ''}`}
                  onClick={() => selectTab('sla_parameters')}
                >
                  <Award size={18} /> Parameter SLA
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'schedules' ? 'active' : ''}`}
                  onClick={() => selectTab('schedules')}
                >
                  <Clock size={18} /> Jadwal & Penugasan
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'reports' ? 'active' : ''}`}
                  onClick={() => selectTab('reports')}
                >
                  <FileText size={18} /> Export Laporan
                </button>
              </li>
            </>
          )}

          {/* User Management & System Admin */}
          {(isAdmin || isSupervisor) && (
            <>
              <li className="sidebar-item-group-title">{isAdmin ? 'System Admin' : 'Manajemen Pengguna'}</li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'users' ? 'active' : ''}`}
                  onClick={() => selectTab('users')}
                >
                  <Users size={18} /> Kelola Pengguna
                </button>
              </li>
              {isAdmin && (
                <li>
                  <button 
                    className={`sidebar-link ${currentTab === 'app_settings' ? 'active' : ''}`}
                    onClick={() => selectTab('app_settings')}
                  >
                    <Sliders size={18} /> System Company
                  </button>
                </li>
              )}
            </>
          )}

          {/* Logs accessible by Admin, Supervisor, PIC, CS */}
          {(isAdmin || isSupervisor || isPic || isCs) && (
            <>
              <li className="sidebar-item-group-title">Logs</li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'audit_logs' ? 'active' : ''}`}
                  onClick={() => selectTab('audit_logs')}
                >
                  <FileText size={18} /> Audit Trails
                </button>
              </li>
            </>
          )}

          <li className="sidebar-item-group-title">Pengaturan</li>
          <li>
            <button 
              className={`sidebar-link ${currentTab === 'profile' ? 'active' : ''}`}
              onClick={() => selectTab('profile')}
            >
              <User size={18} /> Profil Saya
            </button>
          </li>
        </ul>

        {/* Dynamic Sidebar Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', marginTop: 'auto', fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.3 }}>
          {appIdentity.app_footer_text}
        </div>
      </nav>

      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <div className="main-content">
        
        {/* Header Bar */}
        <header className="header-bar">
          <div className="header-title-section" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Buka Sidebar Navigasi">
              <Menu size={20} />
            </button>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {TAB_TITLES[currentTab] || currentTab}
            </h2>
          </div>

          <div className="header-user-section">
            {/* Notification Bell */}
            <div className="notification-bell-container" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} style={{ color: 'var(--text-secondary)' }} />
              {unreadCount > 0 && (
                <div className="notification-badge">{unreadCount}</div>
              )}

              {/* Notification Dropdown */}
              {showNotifications && (
                <div 
                  className="glass-panel" 
                  style={{ 
                    position: 'absolute', 
                    top: '40px', 
                    right: 0, 
                    width: '320px', 
                    maxHeight: '380px', 
                    overflowY: 'auto', 
                    borderRadius: 'var(--radius-md)', 
                    zIndex: 200, 
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🔔 Notifikasi ({unreadCount} belum dibaca)</span>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }} 
                      onClick={(e) => { e.stopPropagation(); fetchNotifications(); }}
                    >
                      ↻ Perbarui
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid var(--border-color)', 
                          fontSize: '0.85rem',
                          background: 'rgba(255,255,255,0.01)',
                          cursor: 'pointer' 
                        }}
                        onClick={() => handleMarkAsRead(n.id)}
                      >
                        <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{n.title}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>✓ Tandai Dibaca</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.8rem' }}>{n.message}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✓</div>
                        <div>Semua notifikasi sudah dibaca.</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info Badge — tampil di semua ukuran layar */}
            <div className="user-profile-badge">
              <div className="user-info col-hide-mobile">
                <span className="user-name" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--on-surface)' }}>{user.name}</span>
                <span 
                  className={`role-badge ${getRoleBadgeClass()}`}
                  style={{ fontSize: '0.65rem', marginTop: '3px', display: 'inline-block' }}
                >
                  {getRoleLabel()}
                </span>
              </div>
              <div 
                className="user-avatar" 
                title={`Login sebagai: ${user.name} (${getRoleLabel()})`}
                style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {user.avatar_url || user.foto_profile ? (
                  <img 
                    src={user.avatar_url || user.foto_profile} 
                    alt={user.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  user.name?.[0] || 'U'
                )}
              </div>
            </div>

            {/* Logout button */}
            <button 
              className="btn btn-secondary" 
              onClick={handleLogout} 
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} 
              title="Keluar dari sistem"
            >
              <LogOut size={16} style={{ color: 'var(--danger)' }} />
              <span className="col-hide-mobile" style={{ fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600 }}>Keluar</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body" ref={contentBodyRef}>
          {/* Banner Alert Notification */}
          {alert && (
            <div className={`alert alert-${alert.type}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {alert.type === 'success' ? <Check size={18} /> : <ShieldAlert size={18} />}
                <span>{alert.message}</span>
              </div>
              <button 
                onClick={() => setAlert(null)} 
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Mount appropriate tabs */}
          <ErrorBoundary>
            <Suspense fallback={
              <div className="loading-state">
                <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
                <div className="loading-state-text">⏳ Memuat halaman, mohon tunggu...</div>
              </div>
            }>
              {currentTab === 'dashboard' && (
                <Dashboard 
                  user={user} 
                  setCurrentTab={setCurrentTab} 
                  setOpenScanModalOnMount={setOpenScanModalOnMount}
                  onScanSuccess={(data) => {
                    setScannedTaskData(data);
                    setCurrentTab('tasks');
                  }} 
                />
              )}
              {currentTab === 'buildings' && <Buildings />}
              {currentTab === 'rooms' && <Rooms />}
              {currentTab === 'checklist_templates' && <ChecklistTemplates />}
              {currentTab === 'room_assets' && <RoomAssets />}
              {currentTab === 'cleaning_materials' && <CleaningMaterials />}
              {currentTab === 'sla_parameters' && <SlaParameters />}
              {currentTab === 'adhoc_tasks' && <AdhocTaskSupervisor />}
              {currentTab === 'cs_adhoc' && (
                <CsAdhocTasks onResumeDailyTasks={() => selectTab('tasks')} />
              )}
              {currentTab === 'users' && (
                <UsersList 
                  currentUser={user} 
                  isSupervisor={isSupervisor} 
                  isAdmin={isAdmin} 
                />
              )}
              {currentTab === 'schedules' && <Schedules />}
              {currentTab === 'tasks' && (
                <CsTasks 
                  scannedTaskData={scannedTaskData}
                  setScannedTaskData={setScannedTaskData}
                  openScanModalOnMount={openScanModalOnMount}
                  setOpenScanModalOnMount={setOpenScanModalOnMount}
                  onOpenAdhocTasks={() => selectTab('cs_adhoc')}
                  onNavigateDashboard={() => selectTab('dashboard')}
                />
              )}
              {currentTab === 'verifications' && <Verifications />}
              {currentTab === 'findings' && <Findings user={user} isOb={isOb} />}
              {currentTab === 'audit_logs' && <AuditLogs />}
              {currentTab === 'profile' && (
                <Profile 
                  user={user} 
                  onUserUpdated={(updated) => {
                    setUser((prev) => ({ ...prev, ...updated }));
                  }} 
                />
              )}
              {currentTab === 'reports' && <Reports />}
              {currentTab === 'app_settings' && (
                <AppSettings 
                  onSettingsUpdated={fetchPublicSettings} 
                />
              )}
              {currentTab === 'notifications_panel' && (
                <Notifications 
                  unreadCount={unreadCount} 
                  setUnreadCount={setUnreadCount} 
                  fetchNotifications={fetchNotifications} 
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

    </div>
  );
}

