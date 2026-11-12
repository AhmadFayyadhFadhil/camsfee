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
const AdhocTaskSupervisor = lazy(() => import('./components/AdhocTaskSupervisor'));
const CsAdhocTasks = lazy(() => import('./components/CsAdhocTasks'));
import { resolveNotificationTarget } from './utils/notificationRouter';

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
  ShieldAlert, 
  Sliders, 
  Zap, 
  Box, 
  CheckCircle2,
  RefreshCw,
  LayoutDashboard,
  ChevronDown,
  PanelLeft,
  Activity,
  Wrench,
  Database,
  Settings,
  History
} from 'lucide-react';
import { useConfirm } from './context/ConfirmContext.jsx';

const VALID_TABS = [
  'dashboard', 'tasks', 'cs_adhoc', 'verifications', 'adhoc_tasks',
  'findings', 'buildings', 'rooms', 'checklist_templates', 'room_assets',
  'schedules',
  'reports', 'users', 'app_settings', 'audit_logs', 'notifications_panel', 'profile'
];

// Peta tab -> id grup sidebar. Dipakai agar grup yang berisi halaman tujuan otomatis terbuka.
const TAB_GROUPS = {
  tasks: ['cs_activity'],
  cs_adhoc: ['cs_activity'],
  room_assets: ['cs_activity', 'master'],
  verifications: ['monitoring'],
  adhoc_tasks: ['monitoring'],
  findings: ['facilities'],
  buildings: ['master'],
  rooms: ['master'],
  checklist_templates: ['master'],
  schedules: ['master'],
  reports: ['master'],
  users: ['user_admin'],
  app_settings: ['user_admin'],
  audit_logs: ['logs'],
  profile: ['settings']
};

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cams_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  // Status buka/tutup tiap grup menu (kunci = id grup). Jika belum diatur, memakai nilai bawaan grup.
  const [openGroups, setOpenGroups] = useState({});
  const contentBodyRef = useRef(null);

  // Mapping judul halaman — Bahasa Indonesia bersih (untuk pengguna non-teknis)
  const TAB_TITLES = {
    dashboard: 'Dashboard',
    tasks: 'Tugas Harian Saya',
    cs_adhoc: 'Tugas Khusus & Acara',
    verifications: 'Verifikasi Laporan',
    adhoc_tasks: 'Tugas Khusus & Acara',
    findings: 'Laporan Temuan Kerusakan',
    buildings: 'Kelola Gedung',
    rooms: 'Kelola Ruangan',
    checklist_templates: 'Template Checklist',
    room_assets: 'Aset & Peralatan Ruangan',
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

    const groupIds = TAB_GROUPS[targetTab];
    if (groupIds) {
      setOpenGroups((prev) => {
        const next = { ...prev };
        groupIds.forEach((id) => { next[id] = true; });
        return next;
      });
    }

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
    const roles = loggedInUser.roles || [];
    const isGuestUser = roles.includes('guest') || roles.includes('pelapor');
    const initial = isGuestUser ? 'findings' : 'dashboard';
    setCurrentTab(initial);
    window.location.hash = initial;
    localStorage.setItem('cams_active_tab', initial);
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

  const handleNotificationClick = (notif) => {
    try {
      if (!notif.is_read) {
        api.patch(`/notifications/${notif.id}/read`).catch(() => {});
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error(e);
    }
    setShowNotifications(false);
    const targetTab = resolveNotificationTarget(notif, user?.roles || []);
    if (targetTab) {
      selectTab(targetTab);
    }
  };

  // Get active roles for menu rendering & permissions (always evaluated before conditional returns)
  const isAdmin = Boolean(user?.roles && user.roles.includes('admin'));
  const isSupervisor = Boolean(user?.roles && user.roles.includes('supervisor'));
  const isPic = Boolean(user?.roles && user.roles.includes('pic'));
  const isCs = Boolean(user?.roles && user.roles.includes('cleaning_service'));
  const isOb = Boolean(user?.roles && user.roles.includes('ob'));
  const isManager = Boolean(user?.roles && user.roles.includes('manager'));
  const isGuest = Boolean(user?.roles && (user.roles.includes('guest') || user.roles.includes('pelapor')));

  // Redirect guest automatically to findings if landing on dashboard or disallowed tabs
  useEffect(() => {
    if (isAuthenticated && isGuest && (currentTab === 'dashboard' || !['findings', 'profile', 'notifications_panel'].includes(currentTab))) {
      selectTab('findings');
    }
  }, [isAuthenticated, isGuest, currentTab]);

  const getRoleLabel = () => {
    if (isAdmin) return 'Admin';
    if (isSupervisor) return 'Supervisor';
    if (isPic) return 'PIC Area';
    if (isCs) return 'CS Staff';
    if (isOb) return 'Office Boy';
    if (isManager) return 'Manager';
    if (isGuest) return 'Pelapor Fasilitas';
    return 'Staf';
  };

  // ── Definisi menu sidebar (aturan role sama persis dengan sebelumnya) ──
  const mainNavItems = !isGuest ? [
    { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { tab: 'notifications_panel', label: 'Notifikasi', icon: Bell, badge: unreadCount }
  ] : [];

  const navGroups = [
    {
      id: 'cs_activity',
      title: 'Aktivitas CS',
      icon: ClipboardCheck,
      defaultOpen: true,
      visible: isCs,
      items: [
        { tab: 'tasks', label: 'Tugas Hari Ini', icon: ClipboardCheck },
        { tab: 'cs_adhoc', label: 'Tugas Khusus & Acara', icon: FileText },
        { tab: 'room_assets', label: 'Audit Aset Ruangan', icon: Box }
      ]
    },
    {
      id: 'monitoring',
      title: 'Monitoring & Approval',
      icon: Activity,
      defaultOpen: true,
      visible: isPic || isSupervisor || isAdmin,
      items: [
        { tab: 'verifications', label: 'Verifikasi Laporan', icon: CheckSquare },
        { tab: 'adhoc_tasks', label: 'Tugas Khusus & Acara', icon: FileText, visible: isSupervisor || isAdmin }
      ]
    },
    {
      id: 'facilities',
      title: 'Fasilitas',
      icon: Wrench,
      defaultOpen: true,
      visible: true,
      items: [
        { tab: 'findings', label: 'Temuan Kerusakan', icon: AlertOctagon }
      ]
    },
    {
      id: 'master',
      title: 'Master Data',
      icon: Database,
      defaultOpen: false,
      visible: isSupervisor || isAdmin,
      items: [
        { tab: 'buildings', label: 'Kelola Gedung', icon: Building },
        { tab: 'rooms', label: 'Kelola Ruangan', icon: Home },
        { tab: 'checklist_templates', label: 'Template Checklist', icon: Layers },
        { tab: 'room_assets', label: 'Aset Ruangan', icon: Box },
        { tab: 'schedules', label: 'Jadwal & Penugasan', icon: Clock },
        { tab: 'reports', label: 'Export Laporan', icon: FileText }
      ]
    },
    {
      id: 'user_admin',
      title: isAdmin ? 'System Admin' : 'Manajemen Pengguna',
      icon: Users,
      defaultOpen: false,
      visible: isAdmin || isSupervisor,
      items: [
        { tab: 'users', label: 'Kelola Pengguna', icon: Users },
        { tab: 'app_settings', label: 'System Company', icon: Sliders, visible: isAdmin }
      ]
    },
    {
      id: 'logs',
      title: 'Logs',
      icon: History,
      defaultOpen: false,
      visible: isAdmin || isSupervisor || isPic || isCs,
      items: [
        { tab: 'audit_logs', label: 'Audit Trails', icon: FileText }
      ]
    },
    {
      id: 'settings',
      title: 'Pengaturan',
      icon: Settings,
      defaultOpen: false,
      visible: true,
      items: [
        { tab: 'profile', label: 'Profil Saya', icon: User }
      ]
    }
  ];

  const isGroupOpen = (group) => {
    if (openGroups[group.id] !== undefined) return openGroups[group.id];
    return group.defaultOpen || group.items.some((item) => item.tab === currentTab);
  };

  const toggleGroup = (group) => {
    const open = isGroupOpen(group);
    setOpenGroups((prev) => ({ ...prev, [group.id]: !open }));
  };

  // Tombol sidebar: di layar kecil membuka drawer, di desktop menciutkan sidebar
  const handleToggleSidebar = () => {
    const isSmallScreen = window.matchMedia('(max-width: 992px)').matches;
    if (isSmallScreen) {
      setIsSidebarOpen((prev) => !prev);
      return;
    }
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cams_sidebar_collapsed', next ? '1' : '0');
      } catch {
        // penyimpanan lokal tidak tersedia: abaikan
      }
      return next;
    });
  };

  // Pintasan keyboard Ctrl + B
  useEffect(() => {
    if (!isAuthenticated) return;
    const onKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'b') return;
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      e.preventDefault();
      handleToggleSidebar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthenticated]);

  const renderNavButton = (item, nested = false) => {
    const Icon = item.icon;
    return (
      <button
        key={`${item.tab}-${item.label}`}
        type="button"
        className={`nav-link ${nested ? 'nav-sublink' : ''} ${currentTab === item.tab ? 'active' : ''}`}
        onClick={() => selectTab(item.tab)}
        aria-current={currentTab === item.tab ? 'page' : undefined}
      >
        <Icon size={nested ? 16 : 18} />
        <span className="nav-label">{item.label}</span>
        {item.badge > 0 && <span className="nav-badge">{item.badge}</span>}
      </button>
    );
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} appIdentity={appIdentity} />;
  }

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <nav
        className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}
        aria-label="Navigasi utama"
      >
        <div className="nav-brand">
          {appIdentity.company_logo ? (
            <div className="nav-brand-logo">
              <img
                src={normalizeLogoUrl(appIdentity.company_logo)}
                alt="Logo"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/favicon.svg';
                }}
              />
            </div>
          ) : (
            <div className="nav-brand-logo nav-brand-logo-fallback">
              <Shield size={20} />
            </div>
          )}
          <div className="nav-brand-text">
            <span className="nav-brand-title">CAMS</span>
            <span className="nav-brand-subtitle">{appIdentity.company_name}</span>
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

        <div className="nav-scroll">
          {mainNavItems.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">Menu Utama</div>
              {mainNavItems.map((item) => renderNavButton(item))}
            </div>
          )}

          {navGroups.filter((group) => group.visible).map((group) => {
            const GroupIcon = group.icon;
            const open = isGroupOpen(group);
            const visibleItems = group.items.filter((item) => item.visible !== false);
            const hasActive = visibleItems.some((item) => item.tab === currentTab);
            return (
              <div className="nav-group" key={group.id}>
                <button
                  type="button"
                  className={`nav-group-btn ${hasActive ? 'has-active' : ''}`}
                  onClick={() => toggleGroup(group)}
                  aria-expanded={open}
                >
                  <GroupIcon size={18} />
                  <span className="nav-label">{group.title}</span>
                  <ChevronDown size={16} className={`nav-chevron ${open ? 'open' : ''}`} />
                </button>
                {open && (
                  <div className="nav-submenu">
                    {visibleItems.map((item) => renderNavButton(item, true))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="nav-footer">
          <button type="button" className="nav-link nav-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span className="nav-label">Keluar Akun</span>
          </button>
          <div className="nav-footer-meta">
            <span className="nav-footer-text">{appIdentity.app_footer_text}</span>
            <span className="nav-shortcut-hint">Ctrl + B</span>
          </div>
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
            <button
              type="button"
              className="header-toggle-btn"
              onClick={handleToggleSidebar}
              aria-label="Buka atau tutup sidebar navigasi"
              title="Buka atau tutup sidebar (Ctrl + B)"
            >
              <PanelLeft size={18} />
            </button>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {TAB_TITLES[currentTab] || currentTab}
            </h2>
          </div>

          <div className="header-user-section">
            {/* Notification Bell (Hidden for Guest/Pelapor) */}
            {!isGuest && (
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
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bell size={16} /> Notifikasi ({unreadCount} belum dibaca)
                      </span>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }} 
                        onClick={(e) => { e.stopPropagation(); fetchNotifications(); }}
                      >
                        <RefreshCw size={12} /> Perbarui
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
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                          onClick={() => handleNotificationClick(n)}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(14, 49, 146, 0.05)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                        >
                          <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{n.title}</span>
                            <button
                              type="button"
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                fontSize: '0.72rem',
                                color: 'var(--primary)',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(n.id);
                              }}
                              title="Tandai notifikasi ini sudah dibaca"
                            >
                              <Check size={11} /> Tandai Dibaca
                            </button>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.8rem', lineHeight: 1.4 }}>{n.message}</p>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <CheckCircle2 size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                          <div>Semua notifikasi sudah dibaca.</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Info Badge */}
            <div className="user-profile-badge">
              <div 
                className="user-avatar"
                title={`${user.name} — ${getRoleLabel()}`}
                style={{ overflow: 'hidden', flexShrink: 0 }}
              >
                {user.avatar_url || user.foto_profile ? (
                  <img 
                    src={user.avatar_url || user.foto_profile} 
                    alt={user.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.textContent = user.name?.[0] || 'U'; }}
                  />
                ) : (
                  user.name?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div className="user-info col-hide-mobile">
                <span className="user-name">{user.name}</span>
                <span className="user-role-text">{getRoleLabel()}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body with Dynamic Routing */}
        <main className="content-body" ref={contentBodyRef}>
          {alert && (
            <div className={`alert alert-${alert.type}`} style={{ marginBottom: '20px' }}>
              <span>{alert.message}</span>
            </div>
          )}

          <ErrorBoundary>
            <Suspense fallback={<div className="spinner"></div>}>
              {currentTab === 'dashboard' && (
                <Dashboard 
                  user={user}
                  setCurrentTab={selectTab} 
                  setOpenScanModalOnMount={setOpenScanModalOnMount}
                  onScanSuccess={(data) => {
                    setScannedTaskData(data);
                    selectTab('tasks');
                  }} 
                  onNavigate={(tab) => selectTab(tab)} 
                  onNavigateWithTask={(task) => {
                    setScannedTaskData(task);
                    selectTab('tasks');
                  }} 
                />
              )}
              {currentTab === 'buildings' && <Buildings />}
              {currentTab === 'rooms' && <Rooms />}
              {currentTab === 'checklist_templates' && <ChecklistTemplates />}
              {currentTab === 'room_assets' && <RoomAssets user={user} />}
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
                  onNavigate={(targetTab) => selectTab(targetTab)}
                  userRoles={user?.roles || []}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

    </div>
  );
}