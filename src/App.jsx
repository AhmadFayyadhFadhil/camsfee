import React, { useState, useEffect, lazy, Suspense } from 'react';
import api from './utils/api';
import Login from './components/Login';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Buildings = lazy(() => import('./components/Buildings'));
const Rooms = lazy(() => import('./components/Rooms'));
const UsersList = lazy(() => import('./components/Users'));
const ChecklistItems = lazy(() => import('./components/ChecklistItems'));
const Schedules = lazy(() => import('./components/Schedules'));
const CsTasks = lazy(() => import('./components/CsTasks'));
const Verifications = lazy(() => import('./components/Verifications'));
const Findings = lazy(() => import('./components/Findings'));
const AuditLogs = lazy(() => import('./components/AuditLogs'));
const Profile = lazy(() => import('./components/Profile'));
const Reports = lazy(() => import('./components/Reports'));
const Notifications = lazy(() => import('./components/Notifications'));
const AppSettings = lazy(() => import('./components/AppSettings'));

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
  Sliders
} from 'lucide-react';
import { useConfirm } from './context/ConfirmContext.jsx';

export default function App() {
  const confirm = useConfirm();
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [user, setUser] = useState(api.getUser());
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [openScanModalOnMount, setOpenScanModalOnMount] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const selectTab = (tab) => {
    setCurrentTab(tab);
    setIsSidebarOpen(false);
  };
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alert, setAlert] = useState(null);

  // App Identity states (cached in localStorage for instant rendering on refresh)
  const getCachedSettings = () => {
    try {
      const cached = localStorage.getItem('cams_public_settings');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  };

  const [appIdentity, setAppIdentity] = useState(getCachedSettings() || {
    company_name: 'CAMS PANDAAN',
    company_logo: null,
    company_description: 'Cleaning Activity Monitor',
    app_footer_text: '© 2026 CAMS Pandaan. All rights reserved.'
  });

  const fetchPublicSettings = async () => {
    try {
      const response = await api.get('/settings/public');
      if (response.success && response.data) {
        setAppIdentity(response.data);
        localStorage.setItem('cams_public_settings', JSON.stringify(response.data));
        if (response.data.company_name) {
          document.title = response.data.company_name + " - Cleaning Activity Monitoring System";
        }
      }
    } catch (err) {
      console.error('Failed to fetch public settings:', err);
    }
  };

  useEffect(() => {
    fetchPublicSettings();
  }, []);

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

  const handleLoginSuccess = (loggedInUser, token) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setCurrentTab('dashboard');
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
                src={appIdentity.company_logo} 
                alt="Logo" 
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
                  className={`sidebar-link ${currentTab === 'checklist_items' ? 'active' : ''}`}
                  onClick={() => selectTab('checklist_items')}
                >
                  <CheckSquare size={18} /> Checklist Items
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

          {/* Admin only features */}
          {isAdmin && (
            <>
              <li className="sidebar-item-group-title">System Admin</li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'users' ? 'active' : ''}`}
                  onClick={() => selectTab('users')}
                >
                  <Users size={18} /> Kelola Pengguna
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-link ${currentTab === 'app_settings' ? 'active' : ''}`}
                  onClick={() => selectTab('app_settings')}
                >
                  <Sliders size={18} /> System Company
                </button>
              </li>
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
            <h2 style={{ textTransform: 'capitalize', margin: 0 }}>
              {currentTab.replace('_', ' ')}
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
                    maxHeight: '360px', 
                    overflowY: 'auto', 
                    borderRadius: 'var(--radius-md)', 
                    zIndex: 200, 
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Notifikasi Baru ({unreadCount})</span>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={fetchNotifications}>Poll</button>
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
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Read</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.8rem' }}>{n.message}</p>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Tidak ada notifikasi baru.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Info Badge */}
            <div className="user-profile-badge">
              <div className="user-info">
                <span className="user-name" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--on-surface)' }}>{user.name}</span>
                <span className="user-role-text" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px', fontWeight: 500 }}>
                  {getRoleLabel()}
                </span>
              </div>
              <div className="user-avatar">{user.name[0]}</div>
            </div>

            {/* Logout button */}
            <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '8px' }} title="Keluar">
              <LogOut size={18} style={{ color: 'var(--danger)' }} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="content-body">
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
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <div className="spinner"></div>
            </div>
          }>
            {currentTab === 'dashboard' && (
              <Dashboard 
                user={user} 
                setCurrentTab={setCurrentTab} 
                setOpenScanModalOnMount={setOpenScanModalOnMount} 
              />
            )}
            {currentTab === 'buildings' && <Buildings />}
            {currentTab === 'rooms' && <Rooms />}
            {currentTab === 'users' && <UsersList />}
            {currentTab === 'checklist_items' && <ChecklistItems />}
            {currentTab === 'schedules' && <Schedules />}
            {currentTab === 'tasks' && (
              <CsTasks 
                openScanModalOnMount={openScanModalOnMount} 
                setOpenScanModalOnMount={setOpenScanModalOnMount} 
              />
            )}
            {currentTab === 'verifications' && <Verifications />}
            {currentTab === 'findings' && <Findings user={user} isOb={isOb} />}
            {currentTab === 'audit_logs' && <AuditLogs />}
            {currentTab === 'profile' && <Profile user={user} />}
            {currentTab === 'reports' && <Reports />}
            {currentTab === 'settings' && <Settings />}
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
        </main>
      </div>

    </div>
  );
}

