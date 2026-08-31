import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Box, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ClipboardCheck, 
  RefreshCw, 
  Eye, 
  Camera, 
  Search,
  Building2,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  AlertOctagon,
  Image as ImageIcon
} from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { compressImage } from '../utils/imageCompressor';

export default function RoomAssets({ initialBuildingId = null, user = null }) {
  const confirm = useConfirm();

  // Role detection
  const currentUser = user || api.getUser() || {};
  const isAdmin = currentUser.roles && currentUser.roles.includes('admin');
  const isSupervisor = currentUser.roles && currentUser.roles.includes('supervisor');
  const isCs = currentUser.roles && (currentUser.roles.includes('cs') || currentUser.roles.includes('cleaning_service'));
  const canManageMaster = isAdmin || isSupervisor;

  // Sub-Tab State: 'buildings' (Gedung & Aset) vs 'audits' (Riwayat & Verifikasi Audit)
  const [activeSubTab, setActiveSubTab] = useState('buildings');

  // Master Data State
  const [buildings, setBuildings] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    total_buildings: 0,
    up_to_date: 0,
    due_soon: 0,
    overdue: 0,
    never_audited: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search & Filters for Buildings
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'up_to_date', 'due_soon', 'overdue', 'never_audited'

  // Modal 1: Audit Gedung Terpadu
  const [showAuditBuildingModal, setShowAuditBuildingModal] = useState(false);
  const [selectedBuildingForAudit, setSelectedBuildingForAudit] = useState(null);
  const [buildingTree, setBuildingTree] = useState(null);
  const [loadingBuildingTree, setLoadingBuildingTree] = useState(false);
  const [auditPeriod, setAuditPeriod] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [auditNotes, setAuditNotes] = useState('');
  const [auditItemsState, setAuditItemsState] = useState({}); // { [assetId]: { actual: number, condition: 'good'|'damaged'|'missing', notes: '', file: null, preview: '' } }
  const [submittingAudit, setSubmittingAudit] = useState(false);

  // Modal 2: Kelola Ruangan & Master Aset Gedung
  const [showManageAssetsModal, setShowManageAssetsModal] = useState(false);
  const [selectedBuildingForAssets, setSelectedBuildingForAssets] = useState(null);
  const [activeRoomInModal, setActiveRoomInModal] = useState(null);
  const [roomAssetsList, setRoomAssetsList] = useState([]);
  const [loadingRoomAssets, setLoadingRoomAssets] = useState(false);

  // Form Tambah / Edit Master Aset
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetFormItems, setAssetFormItems] = useState([
    { id: 'item-1', nama_aset: '', kode_aset: '', jumlah: 1, status: 'active' }
  ]);
  const [savingAsset, setSavingAsset] = useState(false);

  // Modal 3: Pengaturan Siklus & Jadwal Audit Gedung
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedBuildingForSchedule, setSelectedBuildingForSchedule] = useState(null);
  const [scheduleInterval, setScheduleInterval] = useState('bimonthly');
  const [scheduleIntervalDays, setScheduleIntervalDays] = useState(60);
  const [scheduleNextDue, setScheduleNextDue] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Tab 2: Riwayat Audit State & Filter
  const [audits, setAudits] = useState([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [auditBuildingFilter, setAuditBuildingFilter] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState('');
  const [auditDiscrepancyFilter, setAuditDiscrepancyFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Modal 4: Detail & Verifikasi Audit (Supervisor)
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedAuditForVerify, setSelectedAuditForVerify] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('approved');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [autoCreateFindings, setAutoCreateFindings] = useState(true);
  const [syncMasterBaseline, setSyncMasterBaseline] = useState(false);
  const [verifyNextDueDate, setVerifyNextDueDate] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Modal 5: Preview Foto Modal State
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  const generateAssetCode = () => `AST-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Fetch Summary Data Gedung & Aset
  const fetchBuildingsData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await api.get('/building-asset-audits/summary');
      if (res.success) {
        setBuildings(res.data.buildings || []);
        if (res.data.summary) {
          setSummaryStats(res.data.summary);
        }
      }
    } catch (err) {
      if (showLoading) setError(err.message || 'Gagal memuat rekap audit aset per gedung.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // 2. Fetch Riwayat Audit
  const fetchAuditsData = async () => {
    setAuditsLoading(true);
    try {
      let url = '/room-asset-audits?per_page=50';
      if (auditBuildingFilter) url += `&building_id=${encodeURIComponent(auditBuildingFilter)}`;
      if (auditStatusFilter) url += `&status=${encodeURIComponent(auditStatusFilter)}`;
      if (auditDiscrepancyFilter) url += `&has_discrepancy=${encodeURIComponent(auditDiscrepancyFilter)}`;
      if (auditSearch) url += `&search=${encodeURIComponent(auditSearch)}`;

      const res = await api.get(url);
      if (res.success) {
        setAudits(res.data.data || res.data || []);
      }
    } catch (err) {
      console.error('Error fetching audits:', err);
    } finally {
      setAuditsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildingsData(true);
  }, []);

  useEffect(() => {
    if (activeSubTab === 'audits') {
      fetchAuditsData();
    }
  }, [
    activeSubTab,
    auditBuildingFilter,
    auditStatusFilter,
    auditDiscrepancyFilter,
    auditSearch,
  ]);

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Determine audit status badge
  const getBuildingAuditStatusBadge = (b) => {
    const status = b.audit_status || 'pending';
    if (!b.next_asset_audit_due || status === 'never_audited' || status === 'pending') {
      return { label: 'Belum Dijadwalkan', class: 'status-pending' };
    }
    if (status === 'overdue') {
      return { label: 'Terlewat / Overdue', class: 'status-rejected' };
    }
    if (status === 'due_soon') {
      return { label: 'Jatuh Tempo Segera', class: 'status-waiting_verification' };
    }
    return { label: 'Aman / Up-to-date', class: 'status-completed' };
  };

  const getIntervalLabel = (interval, days) => {
    switch (interval) {
      case 'biweekly': return '2 Minggu Sekali';
      case 'monthly': return '1 Bulan Sekali';
      case 'bimonthly': return '2 Bulan Sekali';
      case 'quarterly': return '3 Bulan Sekali (Kuartal)';
      case 'semi_annually': return '6 Bulan Sekali (Semester)';
      case 'custom': return `Setiap ${days || 60} Hari`;
      default: return '2 Bulan Sekali';
    }
  };

  // Filtered Buildings
  const filteredBuildings = useMemo(() => {
    return buildings.filter(b => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (b.nama_gedung || '').toLowerCase().includes(q);
        const matchCode = (b.kode_gedung || '').toLowerCase().includes(q);
        const matchAddr = (b.alamat || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchAddr) return false;
      }

      if (statusFilter) {
        if (statusFilter === 'never_audited') {
          if (b.audit_status !== 'never_audited' && b.audit_status !== 'pending' && b.next_asset_audit_due) return false;
        } else if (b.audit_status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [buildings, searchQuery, statusFilter]);

  // --- HANDLER AUDIT GEDUNG ---
  const handleOpenAuditBuilding = async (building) => {
    setSelectedBuildingForAudit(building);
    setShowAuditBuildingModal(true);
    setLoadingBuildingTree(true);
    setError(null);
    setAuditPeriod(new Date().toISOString().substring(0, 7));
    setAuditNotes('');
    setAuditItemsState({});

    try {
      const res = await api.get(`/buildings/${building.id}/assets-tree`);
      if (res.success) {
        const tree = res.data;
        setBuildingTree(tree);

        // Inisialisasi state checklist aset
        const initialMap = {};
        (tree.rooms || []).forEach(room => {
          (room.assets || []).forEach(asset => {
            initialMap[asset.id] = {
              room_id: room.id,
              room_name: room.nama_ruangan,
              asset_id: asset.id,
              nama_aset: asset.nama_aset,
              kode_aset: asset.kode_aset,
              expected: parseInt(asset.jumlah) || 1,
              actual: parseInt(asset.jumlah) || 1,
              condition: 'good',
              notes: '',
              file: null,
              preview: ''
            };
          });
        });
        setAuditItemsState(initialMap);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat pohon data aset gedung.');
    } finally {
      setLoadingBuildingTree(false);
    }
  };

  const handleUpdateAuditItem = (assetId, field, value) => {
    setAuditItemsState(prev => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: value
      }
    }));
  };

  const handleAuditItemPhoto = async (assetId, file) => {
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1600, 1000 * 1024);
      const preview = URL.createObjectURL(compressed || file);
      setAuditItemsState(prev => ({
        ...prev,
        [assetId]: {
          ...prev[assetId],
          file: compressed || file,
          preview
        }
      }));
    } catch (e) {
      const preview = URL.createObjectURL(file);
      setAuditItemsState(prev => ({
        ...prev,
        [assetId]: {
          ...prev[assetId],
          file,
          preview
        }
      }));
    }
  };

  const handleSubmitAuditBuilding = async (e) => {
    e.preventDefault();
    if (!selectedBuildingForAudit) return;

    const itemsList = Object.values(auditItemsState);
    if (itemsList.length === 0) {
      setError('Gedung ini belum memiliki aset yang terdaftar untuk diaudit.');
      return;
    }

    if (!(await confirm({
      title: 'Kirim Laporan Audit Fisik Gedung',
      message: `Apakah Anda yakin ingin mengirim laporan audit fisik untuk seluruh ruangan di Gedung ${selectedBuildingForAudit.nama_gedung}?`,
      confirmText: 'Ya, Kirim Laporan',
      cancelText: 'Batal',
      type: 'info'
    }))) {
      return;
    }

    setSubmittingAudit(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('building_id', selectedBuildingForAudit.id);
      formData.append('periode', auditPeriod);
      if (auditNotes) formData.append('notes', auditNotes);

      itemsList.forEach((item, index) => {
        formData.append(`items[${index}][room_asset_id]`, item.asset_id);
        formData.append(`items[${index}][room_id]`, item.room_id);
        formData.append(`items[${index}][jumlah_actual]`, item.actual);
        formData.append(`items[${index}][kondisi]`, item.condition);
        if (item.notes) formData.append(`items[${index}][catatan]`, item.notes);
        if (item.file) {
          formData.append(`items[${index}][foto_bukti]`, item.file);
        }
      });

      const res = await api.post('/room-asset-audits', formData);
      if (res.success) {
        setSuccessMsg(`Laporan audit aset untuk Gedung ${selectedBuildingForAudit.nama_gedung} berhasil diserahkan!`);
        setShowAuditBuildingModal(false);
        fetchBuildingsData(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal mengirim laporan audit aset gedung.');
    } finally {
      setSubmittingAudit(false);
    }
  };

  // --- HANDLER KELOLA MASTER ASET GEDUNG ---
  const handleOpenManageAssets = async (building) => {
    setSelectedBuildingForAssets(building);
    setShowManageAssetsModal(true);
    setActiveRoomInModal(null);
    setRoomAssetsList([]);
    setShowAssetForm(false);
    setEditingAsset(null);

    // Auto select first room if available
    if (building.rooms && building.rooms.length > 0) {
      handleSelectRoomForAssets(building.rooms[0]);
    }
  };

  const handleSelectRoomForAssets = async (room) => {
    setActiveRoomInModal(room);
    setLoadingRoomAssets(true);
    setShowAssetForm(false);
    setEditingAsset(null);
    try {
      const res = await api.get(`/room-assets?room_id=${room.id}`);
      if (res.success) {
        setRoomAssetsList(res.data.data || res.data || []);
      }
    } catch (err) {
      console.error('Error fetching room assets:', err);
    } finally {
      setLoadingRoomAssets(false);
    }
  };

  const handleOpenAddAssetForm = () => {
    setEditingAsset(null);
    setAssetFormItems([
      { id: 'item-1', nama_aset: '', kode_aset: generateAssetCode(), jumlah: 1, status: 'active' }
    ]);
    setShowAssetForm(true);
  };

  const handleOpenEditAsset = (asset) => {
    setEditingAsset(asset);
    setAssetFormItems([
      { id: 'edit-1', nama_aset: asset.nama_aset, kode_aset: asset.kode_aset, jumlah: asset.jumlah || 1, status: asset.status || 'active' }
    ]);
    setShowAssetForm(true);
  };

  const handleAddAssetRow = () => {
    setAssetFormItems(prev => [
      ...prev,
      { id: `item-${Date.now()}`, nama_aset: '', kode_aset: generateAssetCode(), jumlah: 1, status: 'active' }
    ]);
  };

  const handleRemoveAssetRow = (id) => {
    if (assetFormItems.length <= 1) return;
    setAssetFormItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAssetFieldChange = (id, field, value) => {
    setAssetFormItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSaveAssets = async (e) => {
    e.preventDefault();
    if (!activeRoomInModal) return;

    for (const item of assetFormItems) {
      if (!item.nama_aset.trim()) {
        setError('Harap isi nama seluruh aset.');
        return;
      }
      if (!item.kode_aset.trim()) {
        setError('Harap isi kode untuk seluruh aset.');
        return;
      }
    }

    setSavingAsset(true);
    setError(null);

    try {
      if (editingAsset) {
        const item = assetFormItems[0];
        const res = await api.put(`/room-assets/${editingAsset.id}`, {
          nama_aset: item.nama_aset,
          kode_aset: item.kode_aset,
          jumlah: parseInt(item.jumlah) || 1,
          status: item.status,
        });
        if (res.success) {
          setSuccessMsg(`Aset '${item.nama_aset}' berhasil diperbarui.`);
          setShowAssetForm(false);
          setEditingAsset(null);
          handleSelectRoomForAssets(activeRoomInModal);
          fetchBuildingsData(false);
        }
      } else {
        for (const item of assetFormItems) {
          await api.post('/room-assets', {
            room_id: activeRoomInModal.id,
            nama_aset: item.nama_aset,
            kode_aset: item.kode_aset,
            jumlah: parseInt(item.jumlah) || 1,
            status: item.status,
          });
        }
        setSuccessMsg(`Berhasil menambahkan ${assetFormItems.length} aset baru ke ruang ${activeRoomInModal.nama_ruangan}.`);
        setShowAssetForm(false);
        handleSelectRoomForAssets(activeRoomInModal);
        fetchBuildingsData(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data aset.');
    } finally {
      setSavingAsset(false);
    }
  };

  const handleDeleteAsset = async (asset) => {
    if (!(await confirm({
      title: 'Hapus Aset Ruangan',
      message: `Apakah Anda yakin ingin menghapus aset '${asset.nama_aset}' (${asset.kode_aset}) dari ruang ${activeRoomInModal?.nama_ruangan}?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }

    try {
      const res = await api.delete(`/room-assets/${asset.id}`);
      if (res.success) {
        setSuccessMsg(`Aset '${asset.nama_aset}' berhasil dihapus.`);
        handleSelectRoomForAssets(activeRoomInModal);
        fetchBuildingsData(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus aset.');
    }
  };

  // --- HANDLER SIKLUS AUDIT GEDUNG ---
  const handleOpenScheduleModal = (building) => {
    setSelectedBuildingForSchedule(building);
    setScheduleInterval(building.asset_audit_interval || 'bimonthly');
    setScheduleIntervalDays(building.asset_audit_interval_days || 60);
    setScheduleNextDue(building.next_asset_audit_due || '');
    setShowScheduleModal(true);
  };

  const handleSaveBuildingSchedule = async (e) => {
    e.preventDefault();
    if (!selectedBuildingForSchedule) return;

    setSavingSchedule(true);
    setError(null);

    try {
      const payload = {
        asset_audit_interval: scheduleInterval,
        asset_audit_interval_days: scheduleInterval === 'custom' ? parseInt(scheduleIntervalDays) : undefined,
        next_asset_audit_due: scheduleNextDue || undefined,
      };

      const res = await api.put(`/buildings/${selectedBuildingForSchedule.id}/asset-audit-schedule`, payload);
      if (res.success) {
        setSuccessMsg(`Jadwal siklus audit Gedung ${selectedBuildingForSchedule.nama_gedung} berhasil diperbarui.`);
        setShowScheduleModal(false);
        fetchBuildingsData(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal memperbarui siklus audit gedung.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // --- HANDLER VERIFIKASI AUDIT (SUPERVISOR) ---
  const handleOpenVerifyModal = (audit) => {
    setSelectedAuditForVerify(audit);
    setVerifyStatus('approved');
    setVerifyNotes('');
    setAutoCreateFindings(audit.has_discrepancy);
    setSyncMasterBaseline(false);
    setVerifyNextDueDate('');
    setShowVerifyModal(true);
  };

  const handleSubmitVerify = async (e) => {
    e.preventDefault();
    if (!selectedAuditForVerify) return;

    const actionText = verifyStatus === 'approved' ? 'menyetujui' : 'menolak';
    if (!(await confirm({
      title: `${verifyStatus === 'approved' ? 'Setujui' : 'Tolak'} Laporan Audit`,
      message: `Apakah Anda yakin ingin ${actionText} laporan audit fisik ini?`,
      confirmText: verifyStatus === 'approved' ? 'Ya, Setujui' : 'Ya, Tolak',
      cancelText: 'Batal',
      type: verifyStatus === 'approved' ? 'info' : 'danger'
    }))) {
      return;
    }

    setSubmittingVerify(true);
    setError(null);

    try {
      const payload = {
        status: verifyStatus,
        verification_notes: verifyNotes,
        auto_create_findings: autoCreateFindings,
        sync_master_baseline: syncMasterBaseline,
        next_due_date: verifyNextDueDate || undefined,
      };

      const res = await api.post(`/room-asset-audits/${selectedAuditForVerify.id}/verify`, payload);
      if (res.success) {
        setSuccessMsg(`Hasil audit aset berhasil di-${verifyStatus === 'approved' ? 'setujui' : 'tolak'}.`);
        setShowVerifyModal(false);
        fetchAuditsData();
        fetchBuildingsData(false);
      }
    } catch (err) {
      setError(err.message || 'Gagal memverifikasi audit.');
    } finally {
      setSubmittingVerify(false);
    }
  };

  return (
    <div className="room-assets-container">
      
      {/* HEADER UTAMA */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Box className="text-primary" size={28} />
            Aset &amp; Peralatan Fisik Gedung
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
            Pemeriksaan fisik (stock opname), jadwal audit berkala, dan inventaris aset per gedung.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (activeSubTab === 'buildings') fetchBuildingsData(true);
              else fetchAuditsData();
            }}
            disabled={loading || auditsLoading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <RefreshCw size={14} className={(loading || auditsLoading) ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ALERT NOTIFIKASI */}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUB-TABS NAVIGASI */}
      <div className="custom-tabs" style={{ marginBottom: '20px', borderBottom: '2px solid var(--border-color)', display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('buildings')}
          className={`tab-btn ${activeSubTab === 'buildings' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeSubTab === 'buildings' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeSubTab === 'buildings' ? 'var(--primary)' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Building2 size={18} />
          1. Audit &amp; Aset per Gedung ({buildings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('audits')}
          className={`tab-btn ${activeSubTab === 'audits' ? 'active' : ''}`}
          style={{
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeSubTab === 'audits' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeSubTab === 'audits' ? 'var(--primary)' : 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ClipboardCheck size={18} />
          2. Riwayat &amp; Verifikasi Audit
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAFTAR GEDUNG & AUDIT ASET */}
      {/* ========================================================================= */}
      {activeSubTab === 'buildings' && (
        <div>
          
          {/* STATS CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'rgba(14, 49, 146, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Gedung Terdaftar</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{summaryStats.total_buildings} Gedung</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'rgba(15, 118, 110, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Siklus Audit Aman</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{summaryStats.up_to_date} Gedung</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'rgba(234, 179, 8, 0.15)', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Jatuh Tempo Segera</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>{summaryStats.due_soon} Gedung</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', background: 'rgba(225, 29, 72, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertOctagon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Terlewat / Overdue</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>{summaryStats.overdue} Gedung</div>
              </div>
            </div>
          </div>

          {/* FILTER & SEARCH BAR */}
          <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-xl)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cari nama gedung, kode, atau alamat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>

                <select
                  className="form-control"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: 'auto', minWidth: '200px' }}
                >
                  <option value="">Semua Status Siklus</option>
                  <option value="up_to_date">Aman / Up-to-date</option>
                  <option value="due_soon">Jatuh Tempo Segera</option>
                  <option value="overdue">Terlewat / Overdue</option>
                  <option value="never_audited">Belum Dijadwalkan</option>
                </select>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Menampilkan <strong>{filteredBuildings.length}</strong> gedung
              </div>
            </div>
          </div>

          {/* TABEL / KARTU GEDUNG */}
          {loading ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 14px' }}></div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Memuat daftar gedung &amp; inventaris aset...</div>
            </div>
          ) : (
            <div className="table-responsive glass-panel" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Gedung &amp; Lokasi</th>
                    <th>Ruangan &amp; Aset</th>
                    <th>Siklus Audit Gedung</th>
                    <th>Batas Jatuh Tempo</th>
                    <th>Status Siklus</th>
                    <th style={{ textAlign: 'right' }}>Aksi Gedung</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBuildings.map(b => {
                    const badge = getBuildingAuditStatusBadge(b);
                    const intervalLabel = getIntervalLabel(b.asset_audit_interval, b.asset_audit_interval_days);

                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building2 size={18} />
                            {b.nama_gedung}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Kode: <strong style={{ color: 'var(--text-secondary)' }}>{b.kode_gedung}</strong> {b.alamat ? `• ${b.alamat}` : ''}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {b.rooms_count} Ruangan
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {b.total_assets} Jenis Aset ({b.total_units} Unit Fisik)
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{intervalLabel}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Audit terakhir: {b.last_asset_audit_at ? new Date(b.last_asset_audit_at).toLocaleDateString('id-ID') : 'Belum pernah'}
                          </div>
                        </td>

                        <td>
                          {b.next_asset_audit_due ? (
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              {new Date(b.next_asset_audit_due).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                          )}
                        </td>

                        <td>
                          <span className={`status-badge ${badge.class}`}>
                            {badge.label}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenAuditBuilding(b)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                              title="Lakukan audit fisik seluruh ruangan di gedung ini"
                            >
                              <ClipboardCheck size={15} />
                              Audit Gedung
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenManageAssets(b)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                              title="Kelola master aset tiap ruangan di gedung ini"
                            >
                              <Box size={15} />
                              Kelola Aset
                            </button>

                            {canManageMaster && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenScheduleModal(b)}
                                style={{ padding: '6px 8px' }}
                                title="Atur siklus & tanggal jatuh tempo audit gedung"
                              >
                                <Calendar size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBuildings.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        <Building2 size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                        <h4 style={{ margin: '0 0 4px', color: 'var(--text-primary)' }}>Tidak Ada Gedung yang Ditemukan</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Silakan sesuaikan kata kunci pencarian atau filter status siklus audit.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RIWAYAT & VERIFIKASI AUDIT */}
      {/* ========================================================================= */}
      {activeSubTab === 'audits' && (
        <div>
          {/* FILTER BAR TAB 2 */}
          <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-xl)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Cari nama gedung, catatan, atau auditor..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                />
              </div>

              <select
                className="form-control"
                value={auditBuildingFilter}
                onChange={(e) => setAuditBuildingFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '180px' }}
              >
                <option value="">Semua Gedung</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.nama_gedung}</option>
                ))}
              </select>

              <select
                className="form-control"
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '160px' }}
              >
                <option value="">Semua Status</option>
                <option value="submitted">Menunggu Verifikasi</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>

              <select
                className="form-control"
                value={auditDiscrepancyFilter}
                onChange={(e) => setAuditDiscrepancyFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '180px' }}
              >
                <option value="">Semua Kondisi Fisik</option>
                <option value="true">Ada Kerusakan / Selisih</option>
                <option value="false">Sesuai &amp; Lengkap</option>
              </select>
            </div>
          </div>

          {/* TABEL RIWAYAT AUDIT */}
          {auditsLoading ? (
            <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 14px' }}></div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Memuat riwayat audit aset...</div>
            </div>
          ) : (
            <div className="table-responsive glass-panel" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Gedung / Ruangan</th>
                    <th>Periode &amp; Tanggal</th>
                    <th>Petugas Auditor</th>
                    <th>Hasil Temuan Fisik</th>
                    <th>Status Verifikasi</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map(a => {
                    const statusClass = a.status === 'approved' ? 'status-completed' : a.status === 'rejected' ? 'status-rejected' : 'status-waiting_verification';
                    const statusLabel = a.status === 'approved' ? 'Disetujui' : a.status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi';
                    const targetTitle = a.building_name ? `Gedung ${a.building_name}` : (a.room_name ? `Ruang ${a.room_name}` : 'Gedung Terkait');

                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {targetTitle}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {a.items?.length || 0} item aset diperiksa
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{a.periode}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {a.audit_date ? new Date(a.audit_date).toLocaleDateString('id-ID') : '-'}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.auditor_name || 'Petugas CS'}</div>
                        </td>

                        <td>
                          {a.has_discrepancy ? (
                            <span className="status-badge status-rejected" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={12} />
                              Ada Kerusakan / Selisih
                            </span>
                          ) : (
                            <span className="status-badge status-completed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={12} />
                              Lengkap &amp; Sesuai Paten
                            </span>
                          )}
                        </td>

                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            {statusLabel}
                          </span>
                          {a.verifier_name && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              oleh {a.verifier_name}
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenVerifyModal(a)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                          >
                            <Eye size={14} />
                            {canManageMaster && a.status === 'submitted' ? 'Tinjau & Verifikasi' : 'Lihat Detail'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {audits.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        <ClipboardCheck size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                        <h4 style={{ margin: '0 0 4px', color: 'var(--text-primary)' }}>Belum Ada Riwayat Audit</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Laporan audit fisik gedung yang diserahkan akan tampil di sini.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FORMULIR AUDIT FISIK GEDUNG TERPADU */}
      {/* ========================================================================= */}
      {showAuditBuildingModal && selectedBuildingForAudit && (
        <div className="modal-overlay" onClick={() => !submittingAudit && setShowAuditBuildingModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '960px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardCheck className="text-primary" size={22} />
                  Formulir Audit Fisik: Gedung {selectedBuildingForAudit.nama_gedung}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Kode: {selectedBuildingForAudit.kode_gedung} • Periksa seluruh fisik aset ruangan di gedung ini
                </div>
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setShowAuditBuildingModal(false)}
                disabled={submittingAudit}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAuditBuilding} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
                
                {/* PERIODE AUDIT */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px', background: 'rgba(14, 49, 146, 0.03)', padding: '14px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(14, 49, 146, 0.08)' }}>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>Periode Audit (Bulan &amp; Tahun) *</label>
                    <input
                      type="month"
                      className="form-control"
                      value={auditPeriod}
                      onChange={(e) => setAuditPeriod(e.target.value)}
                      required
                      disabled={submittingAudit}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.88rem' }}>Catatan Umum Audit Gedung (Opsional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: Audit triwulan selesai seluruh lantai..."
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                      disabled={submittingAudit}
                    />
                  </div>
                </div>

                {loadingBuildingTree ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }}></div>
                    <div>Memuat daftar ruangan &amp; aset di gedung ini...</div>
                  </div>
                ) : (
                  <div>
                    {(!buildingTree || !buildingTree.rooms || buildingTree.rooms.length === 0) ? (
                      <div className="alert alert-warning">
                        <AlertTriangle size={18} />
                        <span>Gedung ini belum memiliki ruangan aktif. Silakan tambahkan ruangan terlebih dahulu di menu Kelola Ruangan.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {buildingTree.rooms.map((room, rIdx) => {
                          const roomAssets = room.assets || [];

                          return (
                            <div 
                              key={room.id} 
                              style={{ 
                                background: 'white', 
                                border: '1.5px solid var(--border-color)', 
                                borderRadius: 'var(--radius-xl)', 
                                overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                              }}
                            >
                              {/* HEADER RUANGAN */}
                              <div style={{ padding: '12px 18px', background: 'rgba(14, 49, 146, 0.04)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                                    {rIdx + 1}
                                  </span>
                                  <div>
                                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{room.nama_ruangan}</strong>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                      Kode: {room.kode_ruangan} • Lantai: {room.lantai || '1'}
                                    </span>
                                  </div>
                                </div>
                                <span className="status-badge status-in_progress" style={{ fontSize: '0.75rem' }}>
                                  {roomAssets.length} Aset Terdaftar
                                </span>
                              </div>

                              {/* DAFTAR ASET RUANGAN */}
                              <div style={{ padding: '14px 18px' }}>
                                {roomAssets.length === 0 ? (
                                  <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                                    Belum ada master aset terdaftar di ruangan ini.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {roomAssets.map((asset) => {
                                      const state = auditItemsState[asset.id] || {
                                        actual: parseInt(asset.jumlah) || 1,
                                        condition: 'good',
                                        notes: '',
                                        preview: ''
                                      };
                                      const isDiscrepant = state.actual !== (parseInt(asset.jumlah) || 1) || state.condition !== 'good';

                                      return (
                                        <div 
                                          key={asset.id}
                                          style={{
                                            padding: '14px 16px',
                                            borderRadius: 'var(--radius-lg)',
                                            border: isDiscrepant ? '1.5px solid var(--danger)' : '1px solid var(--border-color)',
                                            background: isDiscrepant ? 'rgba(225, 29, 72, 0.02)' : '#ffffff',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px'
                                          }}
                                        >
                                          {/* ROW 1: INFO & JUMLAH */}
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                            <div>
                                              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{asset.nama_aset}</strong>
                                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '6px' }}>({asset.kode_aset})</span>
                                              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                Paten Master: <strong>{asset.jumlah || 1} Unit</strong>
                                              </div>
                                            </div>

                                            {/* JUMLAH AKTUAL INPUT */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jumlah Riil Fisik:</label>
                                              <input
                                                type="number"
                                                className="form-control"
                                                min="0"
                                                value={state.actual}
                                                onChange={(e) => handleUpdateAuditItem(asset.id, 'actual', parseInt(e.target.value) || 0)}
                                                style={{ width: '80px', textAlign: 'center', fontWeight: 800 }}
                                                disabled={submittingAudit}
                                              />
                                            </div>
                                          </div>

                                          {/* ROW 2: KONDISI FISIK BUTTONS */}
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Kondisi Fisik:</span>
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateAuditItem(asset.id, 'condition', 'good')}
                                                className={`btn btn-sm ${state.condition === 'good' ? 'btn-success' : 'btn-secondary'}`}
                                                style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                disabled={submittingAudit}
                                              >
                                                <Check size={13} /> Bagus (Good)
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateAuditItem(asset.id, 'condition', 'damaged')}
                                                className={`btn btn-sm ${state.condition === 'damaged' ? 'btn-danger' : 'btn-secondary'}`}
                                                style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                disabled={submittingAudit}
                                              >
                                                <AlertTriangle size={13} /> Rusak (Damaged)
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleUpdateAuditItem(asset.id, 'condition', 'missing')}
                                                className={`btn btn-sm ${state.condition === 'missing' ? 'btn-danger' : 'btn-secondary'}`}
                                                style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                disabled={submittingAudit}
                                              >
                                                <X size={13} /> Hilang (Missing)
                                              </button>
                                            </div>
                                          </div>

                                          {/* ROW 3: CATATAN & FOTO BUKTI */}
                                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '4px' }}>
                                            <input
                                              type="text"
                                              className="form-control form-control-sm"
                                              placeholder="Catatan kondisi/kerusakan jika ada..."
                                              value={state.notes}
                                              onChange={(e) => handleUpdateAuditItem(asset.id, 'notes', e.target.value)}
                                              disabled={submittingAudit}
                                            />

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                                <Camera size={14} />
                                                {state.preview ? 'Ganti Foto' : 'Ambil Foto Bukti'}
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  capture="environment"
                                                  style={{ display: 'none' }}
                                                  onChange={(e) => handleAuditItemPhoto(asset.id, e.target.files[0])}
                                                  disabled={submittingAudit}
                                                />
                                              </label>
                                              {state.preview && (
                                                <img
                                                  src={state.preview}
                                                  alt="Preview"
                                                  style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                                                  onClick={() => setPreviewPhotoUrl(state.preview)}
                                                  title="Klik untuk perbesar foto"
                                                />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAuditBuildingModal(false)}
                  disabled={submittingAudit}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingAudit || loadingBuildingTree || !buildingTree}
                  style={{ fontWeight: 800, minWidth: '180px' }}
                >
                  {submittingAudit ? 'Menyimpan...' : '🚀 Kirim Laporan Audit Gedung'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KELOLA RUANGAN & MASTER ASET GEDUNG */}
      {/* ========================================================================= */}
      {showManageAssetsModal && selectedBuildingForAssets && (
        <div className="modal-overlay" onClick={() => setShowManageAssetsModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '980px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Box className="text-primary" size={22} />
                  Kelola Aset: Gedung {selectedBuildingForAssets.nama_gedung}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Pilih ruangan di bawah untuk menambah, mengedit, atau menghapus master data aset fisik.
                </div>
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setShowManageAssetsModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', padding: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              
              {/* SIDEBAR PILIH RUANGAN */}
              <div style={{ width: '260px', flexShrink: 0, borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>Daftar Ruangan di Gedung Ini:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
                  {(selectedBuildingForAssets.rooms || []).map(r => {
                    const isSelected = activeRoomInModal?.id === r.id;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => handleSelectRoomForAssets(r)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-lg)',
                          border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(14, 49, 146, 0.08)' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)', display: 'block' }}>
                            {r.nama_ruangan}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kode: {r.kode_ruangan}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text-secondary)' }}>
                          {r.total_assets || r.assets?.length || 0}
                        </span>
                      </button>
                    );
                  })}

                  {(!selectedBuildingForAssets.rooms || selectedBuildingForAssets.rooms.length === 0) && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Belum ada ruangan.
                    </div>
                  )}
                </div>
              </div>

              {/* KONTEN ASET RUANGAN TERPILIH */}
              <div style={{ flex: 1, minWidth: '300px' }}>
                {activeRoomInModal ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          Aset di Ruang: <span style={{ color: 'var(--primary)' }}>{activeRoomInModal.nama_ruangan}</span>
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Kode: {activeRoomInModal.kode_ruangan} • Lantai {activeRoomInModal.lantai || '1'}</div>
                      </div>

                      {canManageMaster && !showAssetForm && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleOpenAddAssetForm}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                        >
                          <Plus size={15} /> Tambah Aset
                        </button>
                      )}
                    </div>

                    {/* FORM TAMBAH / EDIT ASET */}
                    {showAssetForm && (
                      <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: 'var(--radius-xl)', marginBottom: '20px', background: 'rgba(14, 49, 146, 0.02)', border: '1.5px solid rgba(14, 49, 146, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
                            {editingAsset ? `Edit Aset: ${editingAsset.nama_aset}` : 'Tambah Master Aset Baru'}
                          </strong>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => setShowAssetForm(false)}
                            style={{ padding: '4px' }}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <form onSubmit={handleSaveAssets}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {assetFormItems.map((item, idx) => (
                              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) 80px 40px', gap: '8px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Nama Aset (cth: Meja Kerja)"
                                  value={item.nama_aset}
                                  onChange={(e) => handleAssetFieldChange(item.id, 'nama_aset', e.target.value)}
                                  required
                                />
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="Kode Aset"
                                  value={item.kode_aset}
                                  onChange={(e) => handleAssetFieldChange(item.id, 'kode_aset', e.target.value)}
                                  required
                                />
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  placeholder="Jumlah"
                                  min="1"
                                  value={item.jumlah}
                                  onChange={(e) => handleAssetFieldChange(item.id, 'jumlah', e.target.value)}
                                  style={{ textAlign: 'center' }}
                                  required
                                />
                                {!editingAsset && assetFormItems.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    onClick={() => handleRemoveAssetRow(item.id)}
                                    style={{ color: 'var(--danger)', height: '34px', width: '34px' }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          {!editingAsset && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={handleAddAssetRow}
                              style={{ marginTop: '10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Plus size={13} /> Tambah Baris Aset Lain
                            </button>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setShowAssetForm(false)}
                              disabled={savingAsset}
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              className="btn btn-primary btn-sm"
                              disabled={savingAsset}
                              style={{ fontWeight: 700 }}
                            >
                              {savingAsset ? 'Menyimpan...' : 'Simpan Aset'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* TABEL ASET RUANGAN */}
                    {loadingRoomAssets ? (
                      <div style={{ padding: '30px', textAlign: 'center' }}>
                        <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 10px' }}></div>
                        <div style={{ fontSize: '0.85rem' }}>Memuat daftar aset...</div>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Nama &amp; Kode Aset</th>
                              <th>Jumlah Paten</th>
                              <th>Status</th>
                              {canManageMaster && <th style={{ textAlign: 'right' }}>Aksi</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {roomAssetsList.map(a => (
                              <tr key={a.id}>
                                <td>
                                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{a.nama_aset}</strong>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.kode_aset}</div>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{a.jumlah || 1}</span> Unit
                                </td>
                                <td>
                                  <span className={`status-badge ${a.status === 'damaged' ? 'status-rejected' : 'status-completed'}`} style={{ fontSize: '0.72rem' }}>
                                    {a.status === 'damaged' ? 'Rusak' : 'Aktif'}
                                  </span>
                                </td>
                                {canManageMaster && (
                                  <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleOpenEditAsset(a)}
                                        style={{ padding: '4px 8px' }}
                                        title="Edit aset"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleDeleteAsset(a)}
                                        style={{ padding: '4px 8px', color: 'var(--danger)' }}
                                        title="Hapus aset"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}

                            {roomAssetsList.length === 0 && (
                              <tr>
                                <td colSpan={canManageMaster ? 4 : 3} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                  Belum ada aset terdaftar di ruangan ini. Tekan tombol <strong>"Tambah Aset"</strong> di atas.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Pilih ruangan di panel kiri untuk melihat dan mengelola asetnya.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PENGATURAN SIKLUS AUDIT GEDUNG */}
      {/* ========================================================================= */}
      {showScheduleModal && selectedBuildingForSchedule && (
        <div className="modal-overlay" onClick={() => !savingSchedule && setShowScheduleModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '520px', width: '90%' }}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar className="text-primary" size={20} />
                  Siklus Audit: {selectedBuildingForSchedule.nama_gedung}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Atur frekuensi berkala audit stock opname aset fisik gedung ini.
                </div>
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setShowScheduleModal(false)}
                disabled={savingSchedule}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBuildingSchedule}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Interval Siklus Audit *</label>
                  <select
                    className="form-control"
                    value={scheduleInterval}
                    onChange={(e) => setScheduleInterval(e.target.value)}
                    disabled={savingSchedule}
                  >
                    <option value="monthly">1 Bulan Sekali (Bulanan)</option>
                    <option value="bimonthly">2 Bulan Sekali (Dwibulanan - Rekomendasi)</option>
                    <option value="quarterly">3 Bulan Sekali (Triwulan)</option>
                    <option value="semi_annually">6 Bulan Sekali (Semester)</option>
                    <option value="biweekly">2 Minggu Sekali</option>
                    <option value="custom">Kustom Hari</option>
                  </select>
                </div>

                {scheduleInterval === 'custom' && (
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Interval dalam Hari *</label>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      max="365"
                      value={scheduleIntervalDays}
                      onChange={(e) => setScheduleIntervalDays(e.target.value)}
                      disabled={savingSchedule}
                      required
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Batas Tanggal Jatuh Tempo Berikutnya (Opsional)
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={scheduleNextDue}
                    onChange={(e) => setScheduleNextDue(e.target.value)}
                    disabled={savingSchedule}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    * Jika dikosongkan, sistem akan menghitung otomatis berdasarkan interval yang Anda pilih.
                  </small>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={savingSchedule}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingSchedule}
                  style={{ fontWeight: 700 }}
                >
                  {savingSchedule ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DETAIL & VERIFIKASI AUDIT (SUPERVISOR) */}
      {/* ========================================================================= */}
      {showVerifyModal && selectedAuditForVerify && (
        <div className="modal-overlay" onClick={() => !submittingVerify && setShowVerifyModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '880px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardCheck className="text-primary" size={22} />
                  Detail Laporan Audit: {selectedAuditForVerify.building_name ? `Gedung ${selectedAuditForVerify.building_name}` : `Ruang ${selectedAuditForVerify.room_name}`}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Periode: {selectedAuditForVerify.periode} • Tanggal: {selectedAuditForVerify.audit_date} • Auditor: {selectedAuditForVerify.auditor_name || 'Petugas CS'}
                </div>
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setShowVerifyModal(false)}
                disabled={submittingVerify}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitVerify} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
                
                {/* DISCREPANCY HIGHLIGHT */}
                {selectedAuditForVerify.has_discrepancy ? (
                  <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                    <AlertTriangle size={18} />
                    <span><strong>Perhatian:</strong> Ditemukan selisih jumlah atau kerusakan aset fisik pada audit ini. Silakan tinjau detail di bawah.</span>
                  </div>
                ) : (
                  <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                    <CheckCircle2 size={18} />
                    <span>Seluruh aset fisik dilaporkan lengkap dan berkondisi baik sesuai data master.</span>
                  </div>
                )}

                {selectedAuditForVerify.notes && (
                  <div style={{ background: 'rgba(0,0,0,0.03)', padding: '12px 14px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', fontSize: '0.88rem' }}>
                    <strong>Catatan Auditor:</strong> {selectedAuditForVerify.notes}
                  </div>
                )}

                {/* DAFTAR ITEM AUDIT */}
                <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Rincian Pemeriksaan Fisik Aset:</h4>
                <div className="table-responsive" style={{ marginBottom: '20px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ruangan</th>
                        <th>Nama Aset &amp; Kode</th>
                        <th>Jumlah Paten</th>
                        <th>Jumlah Riil</th>
                        <th>Kondisi Fisik</th>
                        <th>Foto &amp; Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedAuditForVerify.items || []).map(item => {
                        const isDiscrepant = item.jumlah_actual !== item.jumlah_expected || item.kondisi !== 'good';

                        return (
                          <tr key={item.id} style={{ background: isDiscrepant ? 'rgba(225, 29, 72, 0.03)' : 'transparent' }}>
                            <td style={{ fontWeight: 600 }}>{item.room_name || '-'}</td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{item.nama_aset}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.kode_aset}</div>
                            </td>
                            <td style={{ fontWeight: 700 }}>{item.jumlah_expected}</td>
                            <td style={{ fontWeight: 800, color: item.jumlah_actual < item.jumlah_expected ? 'var(--danger)' : 'var(--text-primary)' }}>
                              {item.jumlah_actual}
                            </td>
                            <td>
                              <span className={`status-badge ${item.kondisi === 'good' ? 'status-completed' : 'status-rejected'}`} style={{ fontSize: '0.72rem' }}>
                                {item.kondisi === 'good' ? 'Bagus' : item.kondisi === 'damaged' ? 'Rusak' : 'Hilang'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {item.foto_bukti_url && (
                                  <img
                                    src={item.foto_bukti_url}
                                    alt="Bukti"
                                    style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                                    onClick={() => setPreviewPhotoUrl(item.foto_bukti_url)}
                                    title="Klik untuk perbesar"
                                  />
                                )}
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.catatan || '-'}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* SUPERVISOR VERIFICATION ACTION (IF ROLE PERMITS) */}
                {canManageMaster && selectedAuditForVerify.status === 'submitted' && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--primary)' }}>Keputusan Verifikasi Supervisor:</h4>

                    <div style={{ display: 'flex', gap: '14px', marginBottom: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700 }}>
                        <input
                          type="radio"
                          name="verifyStatus"
                          value="approved"
                          checked={verifyStatus === 'approved'}
                          onChange={() => setVerifyStatus('approved')}
                        />
                        Setujui Laporan Audit
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, color: 'var(--danger)' }}>
                        <input
                          type="radio"
                          name="verifyStatus"
                          value="rejected"
                          checked={verifyStatus === 'rejected'}
                          onChange={() => setVerifyStatus('rejected')}
                        />
                        Tolak / Minta Audit Ulang
                      </label>
                    </div>

                    {verifyStatus === 'approved' && selectedAuditForVerify.has_discrepancy && (
                      <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '12px 14px', borderRadius: 'var(--radius-lg)', marginBottom: '14px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}>
                          <input
                            type="checkbox"
                            checked={autoCreateFindings}
                            onChange={(e) => setAutoCreateFindings(e.target.checked)}
                          />
                          Otomatis Terbitkan Tiket Temuan Kerusakan (Finding) untuk aset yang rusak/hilang
                        </label>
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Catatan Verifikasi</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Tulis catatan persetujuan atau alasan penolakan..."
                        value={verifyNotes}
                        onChange={(e) => setVerifyNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowVerifyModal(false)}
                  disabled={submittingVerify}
                >
                  Tutup
                </button>

                {canManageMaster && selectedAuditForVerify.status === 'submitted' && (
                  <button
                    type="submit"
                    className={`btn ${verifyStatus === 'approved' ? 'btn-success' : 'btn-danger'}`}
                    disabled={submittingVerify}
                    style={{ fontWeight: 800 }}
                  >
                    {submittingVerify ? 'Memproses...' : verifyStatus === 'approved' ? 'Setujui Audit Gedung' : 'Tolak Laporan'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PREVIEW FOTO ZOOM */}
      {/* ========================================================================= */}
      {previewPhotoUrl && (
        <div className="modal-overlay" onClick={() => setPreviewPhotoUrl(null)} style={{ zIndex: 9999 }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewPhotoUrl}
              alt="Foto Bukti Fisik"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
            />
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              style={{
                position: 'absolute',
                top: '-15px',
                right: '-15px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
