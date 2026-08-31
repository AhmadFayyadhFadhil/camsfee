import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ShieldAlert, 
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
  SlidersHorizontal,
  Building2,
  FolderOpen
} from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function RoomAssets({ initialRoomId = null, user = null }) {
  const confirm = useConfirm();

  // Role detection
  const currentUser = user || api.getUser() || {};
  const isAdmin = currentUser.roles && currentUser.roles.includes('admin');
  const isSupervisor = currentUser.roles && currentUser.roles.includes('supervisor');
  const isCs = currentUser.roles && (currentUser.roles.includes('cs') || currentUser.roles.includes('cleaning_service'));
  const canManageMaster = isAdmin || isSupervisor;

  // Sub-Tab State
  const [activeSubTab, setActiveSubTab] = useState('rooms'); // 'rooms' | 'audits'

  // Master Data State
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Tab 1: Building & Room Selection Filter
  const [activeBuildingId, setActiveBuildingId] = useState(''); // '' = Semua Gedung
  const [roomSearch, setRoomSearch] = useState('');
  const [statusAuditFilter, setStatusAuditFilter] = useState('');

  // Modal 1: Kelola Master Aset Ruangan
  const [showManageAssetsModal, setShowManageAssetsModal] = useState(false);
  const [selectedRoomForAssets, setSelectedRoomForAssets] = useState(null);
  const [roomAssetsList, setRoomAssetsList] = useState([]);
  const [loadingRoomAssets, setLoadingRoomAssets] = useState(false);

  // Form Tambah/Edit Master Aset di dalam Modal Kelola Aset
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetFormItems, setAssetFormItems] = useState([
    { id: 'item-1', nama_aset: '', kode_aset: '', jumlah: 1, status: 'active' }
  ]);
  const [savingAsset, setSavingAsset] = useState(false);

  // Modal 2: Pengaturan Jadwal Audit Ruangan
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRoomForSchedule, setSelectedRoomForSchedule] = useState(null);
  const [scheduleInterval, setScheduleInterval] = useState('bimonthly');
  const [scheduleIntervalDays, setScheduleIntervalDays] = useState(60);
  const [scheduleNextDue, setScheduleNextDue] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Modal 3: Formulir Cek Fisik / Audit Ruangan
  const [showAuditFormModal, setShowAuditFormModal] = useState(false);
  const [selectedRoomForAudit, setSelectedRoomForAudit] = useState(null);
  const [editingAudit, setEditingAudit] = useState(null);
  const [auditFormPeriod, setAuditFormPeriod] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [auditFormNotes, setAuditFormNotes] = useState('');
  const [auditFormItems, setAuditFormItems] = useState([]);
  const [auditFormLoadingAssets, setAuditFormLoadingAssets] = useState(false);
  const [submittingAudit, setSubmittingAudit] = useState(false);

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

  // 1. Fetch Buildings & Rooms with assets count and audit status
  const fetchBuildingsAndRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const [buildingsRes, roomsRes] = await Promise.all([
        api.get('/buildings?is_active=true&per_page=200'),
        api.get('/rooms?is_active=true&per_page=500')
      ]);

      if (buildingsRes.success) {
        setBuildings(buildingsRes.data.data || buildingsRes.data || []);
      }
      if (roomsRes.success) {
        setRooms(roomsRes.data.data || roomsRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data gedung dan ruangan.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Audits History
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
    fetchBuildingsAndRooms();
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

  // Determine audit status of a room (aman / due soon / overdue / none)
  const getRoomAuditStatus = (room) => {
    if (!room.next_asset_audit_due) {
      return { status: 'never', label: 'Belum Dijadwalkan', class: 'status-pending' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(room.next_asset_audit_due);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'overdue', label: 'Terlewat / Overdue', class: 'status-rejected' };
    } else if (diffDays <= 7) {
      return { status: 'due_soon', label: `Jatuh Tempo (${diffDays} hari lagi)`, class: 'status-waiting_verification' };
    } else {
      return { status: 'up_to_date', label: 'Aman / Up-to-date', class: 'status-completed' };
    }
  };

  // Filtered rooms based on Active Building, Room Search, and Audit Status Filter
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // 1. Building match
      if (activeBuildingId) {
        const roomBuildingId = room.building_id || room.building?.id;
        if (roomBuildingId !== activeBuildingId) return false;
      }

      // 2. Room Search
      if (roomSearch.trim()) {
        const q = roomSearch.toLowerCase();
        const roomName = (room.nama_ruangan || room.name || '').toLowerCase();
        const roomCode = (room.kode_ruangan || room.code || '').toLowerCase();
        const buildingName = (room.nama_gedung || room.building?.nama_gedung || '').toLowerCase();
        if (!roomName.includes(q) && !roomCode.includes(q) && !buildingName.includes(q)) {
          return false;
        }
      }

      // 3. Status Audit Filter
      if (statusAuditFilter) {
        const auditStatus = getRoomAuditStatus(room).status;
        if (statusAuditFilter !== auditStatus) return false;
      }

      return true;
    });
  }, [rooms, activeBuildingId, roomSearch, statusAuditFilter]);

  // Count rooms per building for pill badges
  const buildingRoomCounts = useMemo(() => {
    const counts = {};
    rooms.forEach((r) => {
      const bId = r.building_id || r.building?.id;
      if (bId) counts[bId] = (counts[bId] || 0) + 1;
    });
    return counts;
  }, [rooms]);

  // -------------------------------------------------------------
  // 1. KELOLA MASTER ASET RUANGAN
  // -------------------------------------------------------------
  const handleOpenManageAssets = async (room) => {
    setSelectedRoomForAssets(room);
    setShowManageAssetsModal(true);
    setShowAssetForm(false);
    setEditingAsset(null);
    loadAssetsForRoom(room.id);
  };

  const loadAssetsForRoom = async (roomId) => {
    setLoadingRoomAssets(true);
    try {
      const res = await api.get(`/room-assets?room_id=${encodeURIComponent(roomId)}&per_page=150`);
      if (res.success) {
        setRoomAssetsList(res.data.data || res.data || []);
      }
    } catch (err) {
      setError('Gagal memuat master aset ruangan ini.');
    } finally {
      setLoadingRoomAssets(false);
    }
  };

  const handleOpenAddNewAsset = () => {
    setEditingAsset(null);
    setAssetFormItems([
      { id: `item-${Date.now()}-1`, nama_aset: '', kode_aset: generateAssetCode(), jumlah: 1, status: 'active' }
    ]);
    setShowAssetForm(true);
  };

  const handleOpenEditAsset = (asset) => {
    setEditingAsset(asset);
    setAssetFormItems([
      {
        id: asset.id,
        nama_aset: asset.nama_aset || '',
        kode_aset: asset.kode_aset || '',
        jumlah: asset.jumlah ?? 1,
        status: asset.status || 'active',
      }
    ]);
    setShowAssetForm(true);
  };

  const handleAddAssetRow = () => {
    setAssetFormItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nama_aset: '',
        kode_aset: generateAssetCode(),
        jumlah: 1,
        status: 'active',
      }
    ]);
  };

  const handleRemoveAssetRow = (index) => {
    const updated = assetFormItems.filter((_, i) => i !== index);
    setAssetFormItems(
      updated.length > 0
        ? updated
        : [{ id: `item-${Date.now()}`, nama_aset: '', kode_aset: generateAssetCode(), jumlah: 1, status: 'active' }]
    );
  };

  const handleAssetFormItemChange = (index, field, value) => {
    const updated = [...assetFormItems];
    updated[index][field] = value;
    setAssetFormItems(updated);
  };

  const handleSaveAssetForm = async (e) => {
    e.preventDefault();
    if (!selectedRoomForAssets) return;

    setSavingAsset(true);
    setError(null);

    try {
      if (editingAsset) {
        const item = assetFormItems[0];
        const payload = {
          room_id: selectedRoomForAssets.id,
          nama_aset: item.nama_aset.trim(),
          kode_aset: item.kode_aset.trim(),
          jumlah: item.jumlah ? Math.max(1, parseInt(item.jumlah) || 1) : 1,
          status: item.status || 'active',
        };
        const res = await api.put(`/room-assets/${editingAsset.id}`, payload);
        if (res.success) {
          setSuccessMsg('Master aset berhasil diperbarui.');
          setShowAssetForm(false);
          setEditingAsset(null);
          loadAssetsForRoom(selectedRoomForAssets.id);
        }
      } else {
        const validItems = assetFormItems.filter(
          (i) => i.nama_aset && i.nama_aset.trim() !== '' && i.kode_aset && i.kode_aset.trim() !== ''
        );
        if (validItems.length === 0) {
          setError('Minimal isi 1 baris nama dan kode aset.');
          setSavingAsset(false);
          return;
        }

        const payload = {
          room_id: selectedRoomForAssets.id,
          assets: validItems.map((i) => ({
            nama_aset: i.nama_aset.trim(),
            kode_aset: i.kode_aset.trim(),
            jumlah: i.jumlah ? Math.max(1, parseInt(i.jumlah) || 1) : 1,
            status: i.status || 'active',
          })),
        };

        const res = await api.post('/room-assets', payload);
        if (res.success) {
          setSuccessMsg(`${validItems.length} master aset berhasil ditambahkan ke ruangan ini.`);
          setShowAssetForm(false);
          loadAssetsForRoom(selectedRoomForAssets.id);
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data master aset.');
    } finally {
      setSavingAsset(false);
    }
  };

  const handleDeleteMasterAsset = async (asset) => {
    if (
      !(await confirm({
        title: 'Hapus Master Aset',
        message: `Hapus master aset "${asset.nama_aset}" (${asset.kode_aset}) dari ruangan ini?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
      }))
    ) {
      return;
    }

    try {
      const res = await api.delete(`/room-assets/${asset.id}`);
      if (res.success) {
        setSuccessMsg('Master aset berhasil dihapus.');
        if (selectedRoomForAssets) loadAssetsForRoom(selectedRoomForAssets.id);
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus master aset.');
    }
  };

  // -------------------------------------------------------------
  // 2. ATUR JADWAL AUDIT RUANGAN
  // -------------------------------------------------------------
  const handleOpenScheduleModal = (room) => {
    setSelectedRoomForSchedule(room);
    setScheduleInterval(room.asset_audit_interval || 'bimonthly');
    setScheduleIntervalDays(room.asset_audit_interval_days || 60);
    setScheduleNextDue(room.next_asset_audit_due || '');
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!selectedRoomForSchedule) return;

    setSavingSchedule(true);
    setError(null);
    try {
      const payload = {
        asset_audit_interval: scheduleInterval,
        asset_audit_interval_days: scheduleInterval === 'custom' ? parseInt(scheduleIntervalDays) || 60 : undefined,
        next_asset_audit_due: scheduleNextDue || null,
      };

      const res = await api.put(`/rooms/${selectedRoomForSchedule.id}/asset-audit-schedule`, payload);
      if (res.success) {
        setSuccessMsg(`Jadwal audit ruangan ${selectedRoomForSchedule.nama_ruangan || selectedRoomForSchedule.name} berhasil disimpan!`);
        setShowScheduleModal(false);
        fetchBuildingsAndRooms();
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan jadwal audit ruangan.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // -------------------------------------------------------------
  // 3. FORMULIR AUDIT FISIK RUANGAN (CS & SUPERVISOR)
  // -------------------------------------------------------------
  const handleOpenAuditForm = async (room) => {
    setEditingAudit(null);
    setSelectedRoomForAudit(room);
    setAuditFormPeriod(new Date().toISOString().substring(0, 7));
    setAuditFormNotes('');
    setAuditFormItems([]);
    setShowAuditFormModal(true);

    // Load room assets for checklist
    setAuditFormLoadingAssets(true);
    try {
      const res = await api.get(`/room-assets?room_id=${encodeURIComponent(room.id)}&per_page=150`);
      if (res.success) {
        const rawAssets = res.data.data || res.data || [];
        const initialFormItems = rawAssets.map((asset) => ({
          room_asset_id: asset.id,
          nama_aset: asset.nama_aset,
          kode_aset: asset.kode_aset,
          jumlah_expected: asset.jumlah ?? 1,
          jumlah_actual: asset.jumlah ?? 1,
          kondisi: 'good',
          foto_file: null,
          foto_preview: null,
          catatan: '',
        }));
        setAuditFormItems(initialFormItems);
      }
    } catch (err) {
      setError('Gagal memuat master aset ruangan ini untuk audit.');
    } finally {
      setAuditFormLoadingAssets(false);
    }
  };

  const handleOpenEditAudit = (audit) => {
    setEditingAudit(audit);
    const targetRoom = rooms.find((r) => r.id === audit.room_id) || {
      id: audit.room_id,
      nama_ruangan: audit.room_name,
      nama_gedung: audit.building_name,
      kode_ruangan: audit.room_code,
    };
    setSelectedRoomForAudit(targetRoom);
    setAuditFormPeriod(audit.periode || new Date().toISOString().substring(0, 7));
    setAuditFormNotes(audit.notes || '');

    const editItems = (audit.items || []).map((item) => ({
      room_asset_id: item.room_asset_id,
      nama_aset: item.nama_aset || item.asset?.nama_aset || item.nama_aset_snapshot || 'Aset Ruangan',
      kode_aset: item.kode_aset || item.asset?.kode_aset || item.kode_aset_snapshot || '',
      jumlah_expected: item.jumlah_expected ?? 1,
      jumlah_actual: item.jumlah_actual ?? 1,
      kondisi: item.kondisi || 'good',
      foto_file: null,
      foto_preview: item.foto_bukti_url || null,
      catatan: item.catatan || '',
    }));
    setAuditFormItems(editItems);
    setShowAuditFormModal(true);
  };

  const handleDeleteAudit = async (audit) => {
    if (
      !(await confirm({
        title: 'Hapus Laporan Audit',
        message: `Hapus riwayat audit fisik ruangan "${audit.room_name}" periode ${audit.periode}?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        type: 'danger',
      }))
    ) {
      return;
    }

    try {
      const res = await api.delete(`/room-asset-audits/${audit.id}`);
      if (res.success) {
        setSuccessMsg('Laporan audit fisik berhasil dihapus.');
        fetchAuditsData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus laporan audit.');
    }
  };

  const handleAuditItemChange = (index, field, value) => {
    const updated = [...auditFormItems];
    updated[index][field] = value;
    setAuditFormItems(updated);
  };

  const handleAuditItemPhotoChange = (index, file) => {
    const updated = [...auditFormItems];
    updated[index].foto_file = file;
    updated[index].foto_preview = file ? URL.createObjectURL(file) : null;
    setAuditFormItems(updated);
  };

  const handleQuickFillAllGood = () => {
    const updated = auditFormItems.map((item) => ({
      ...item,
      jumlah_actual: item.jumlah_expected,
      kondisi: 'good',
      catatan: '',
    }));
    setAuditFormItems(updated);
    setSuccessMsg('Semua barang ditandai sesuai & kondisi baik!');
  };

  const handleSubmitAuditReport = async (e) => {
    e.preventDefault();
    if (!selectedRoomForAudit) return;

    if (auditFormItems.length === 0) {
      setError('Ruangan ini belum memiliki master aset yang terdaftar.');
      return;
    }

    setSubmittingAudit(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('room_id', selectedRoomForAudit.id);
      formData.append('periode', auditFormPeriod);
      if (auditFormNotes) formData.append('notes', auditFormNotes);

      auditFormItems.forEach((item, index) => {
        formData.append(`items[${index}][room_asset_id]`, item.room_asset_id);
        formData.append(`items[${index}][jumlah_actual]`, item.jumlah_actual ?? 0);
        formData.append(`items[${index}][kondisi]`, item.kondisi);
        if (item.catatan) formData.append(`items[${index}][catatan]`, item.catatan);
        if (item.foto_file) {
          formData.append(`items.${index}.foto_bukti`, item.foto_file);
        }
      });

      let res;
      if (editingAudit) {
        formData.append('_method', 'PUT');
        res = await api.post(`/room-asset-audits/${editingAudit.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/room-asset-audits', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res.success) {
        setSuccessMsg(
          editingAudit
            ? 'Laporan audit fisik berhasil diperbarui!'
            : 'Laporan audit fisik aset ruangan berhasil dikirim!'
        );
        setShowAuditFormModal(false);
        setEditingAudit(null);
        fetchBuildingsAndRooms();
        if (activeSubTab === 'audits') fetchAuditsData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan laporan audit aset.');
    } finally {
      setSubmittingAudit(false);
    }
  };

  // -------------------------------------------------------------
  // 4. VERIFIKASI HASIL AUDIT (SUPERVISOR)
  // -------------------------------------------------------------
  const handleOpenVerifyModal = (audit) => {
    setSelectedAuditForVerify(audit);
    setVerifyStatus('approved');
    setVerifyNotes('');
    setAutoCreateFindings(Boolean(audit.has_discrepancy));
    setSyncMasterBaseline(false);
    setVerifyNextDueDate('');
    setShowVerifyModal(true);
  };

  const handleSubmitVerify = async (e) => {
    e.preventDefault();
    if (!selectedAuditForVerify) return;

    setSubmittingVerify(true);
    setError(null);

    try {
      const payload = {
        status: verifyStatus,
        verification_notes: verifyNotes || null,
        auto_create_findings: verifyStatus === 'approved' ? autoCreateFindings : false,
        sync_master_baseline: verifyStatus === 'approved' ? syncMasterBaseline : false,
        next_due_date: verifyNextDueDate || null,
      };

      const res = await api.post(`/room-asset-audits/${selectedAuditForVerify.id}/verify`, payload);
      if (res.success) {
        setSuccessMsg(`Hasil audit berhasil di-${verifyStatus === 'approved' ? 'setujui' : 'tolak'}!`);
        setShowVerifyModal(false);
        fetchAuditsData();
        fetchBuildingsAndRooms();
      }
    } catch (err) {
      setError(err.message || 'Gagal memverifikasi audit.');
    } finally {
      setSubmittingVerify(false);
    }
  };

  // Helpers
  const formatIntervalLabel = (interval, days) => {
    switch (interval) {
      case 'biweekly':
        return '2 Minggu Sekali';
      case 'monthly':
        return '1 Bulan Sekali';
      case 'bimonthly':
        return '2 Bulan Sekali';
      case 'quarterly':
        return '3 Bulan Sekali';
      case 'custom':
        return `Setiap ${days || 60} Hari`;
      default:
        return '2 Bulan Sekali';
    }
  };

  const getConditionBadge = (cond) => {
    switch (cond) {
      case 'good':
      case 'active':
        return <span className="status-badge status-completed">Baik</span>;
      case 'damaged':
        return <span className="status-badge status-rejected">Rusak</span>;
      case 'missing':
        return <span className="status-badge status-overdue">Hilang</span>;
      case 'repaired':
        return <span className="status-badge status-waiting_verification">Diperbaiki</span>;
      default:
        return <span className="status-badge status-pending">{cond}</span>;
    }
  };

  const getAuditStatusBadge = (st) => {
    switch (st) {
      case 'approved':
        return <span className="status-badge status-completed">Disetujui</span>;
      case 'rejected':
        return <span className="status-badge status-rejected">Ditolak</span>;
      case 'submitted':
      default:
        return <span className="status-badge status-waiting_verification">Menunggu Review</span>;
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="flex-header" style={{ marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>
            {canManageMaster ? 'Aset Ruangan & Stock Opname' : 'Audit Fisik Aset Ruangan'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Pilih gedung di bawah untuk melihat daftar ruangan, kelola inventaris, dan melakukan audit fisik berkala.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
      {successMsg && (
        <div className="alert alert-success">
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid var(--border-color)',
          marginBottom: '20px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        <button
          type="button"
          className="tab-button"
          onClick={() => setActiveSubTab('rooms')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeSubTab === 'rooms' ? 700 : 500,
            color: activeSubTab === 'rooms' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'rooms' ? '3px solid var(--primary)' : '3px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
          }}
        >
          <Building2 size={17} /> 1. Ruangan & Aset per Gedung
        </button>

        <button
          type="button"
          className="tab-button"
          onClick={() => setActiveSubTab('audits')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeSubTab === 'audits' ? 700 : 500,
            color: activeSubTab === 'audits' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'audits' ? '3px solid var(--primary)' : '3px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
          }}
        >
          <ClipboardCheck size={17} /> 2. Riwayat & Verifikasi Audit
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: DAFTAR RUANGAN & ASET BERBASIS GEDUNG */}
      {/* ========================================================================= */}
      {activeSubTab === 'rooms' && (
        <>
          {/* 1. GEDUNG SELECTION PILLS */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Pilih Gedung:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveBuildingId('')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: activeBuildingId === '' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                  background: activeBuildingId === '' ? 'var(--primary)' : '#ffffff',
                  color: activeBuildingId === '' ? '#ffffff' : 'var(--text-primary)',
                  fontWeight: activeBuildingId === '' ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                Semua Gedung ({rooms.length} Ruangan)
              </button>

              {buildings.map((b) => {
                const count = buildingRoomCounts[b.id] || 0;
                const isActive = activeBuildingId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBuildingId(b.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                      background: isActive ? 'var(--primary)' : '#ffffff',
                      color: isActive ? '#ffffff' : 'var(--text-primary)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {b.nama_gedung || b.name} ({count} Ruangan)
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. SEARCH & STATUS FILTER BAR */}
          <div
            className="glass-panel"
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Cari nama atau kode ruangan..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>

            <select
              className="form-control"
              value={statusAuditFilter}
              onChange={(e) => setStatusAuditFilter(e.target.value)}
              style={{ maxWidth: '240px' }}
            >
              <option value="">Semua Status Siklus Audit</option>
              <option value="up_to_date">Aman / Up-to-date</option>
              <option value="due_soon">Mendekati Jatuh Tempo</option>
              <option value="overdue">Terlewat / Overdue</option>
              <option value="never">Belum Dijadwalkan</option>
            </select>

            {(roomSearch || statusAuditFilter) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setRoomSearch('');
                  setStatusAuditFilter('');
                }}
              >
                Reset Filter
              </button>
            )}

            <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Menampilkan <strong>{filteredRooms.length}</strong> ruangan
            </div>
          </div>

          {/* 3. ROOMS TABLE / LIST */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <FolderOpen size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Tidak ada ruangan yang sesuai dengan pilihan gedung atau filter pencarian.</p>
            </div>
          ) : (
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Ruangan & Gedung</th>
                    <th>Lantai / Lokasi</th>
                    <th>Siklus Audit</th>
                    <th>Batas Jatuh Tempo</th>
                    <th>Status Siklus</th>
                    <th style={{ textAlign: 'right' }}>Aksi Ruangan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map((room) => {
                    const auditStatus = getRoomAuditStatus(room);

                    return (
                      <tr key={room.id}>
                        <td>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                            {room.nama_ruangan || room.name}
                          </span>
                          <span style={{ color: 'var(--primary)', fontSize: '0.78rem', display: 'block', fontWeight: 600 }}>
                            {room.nama_gedung || room.building?.nama_gedung || 'Gedung'} ({room.kode_ruangan || room.code})
                          </span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {room.lantai || room.floor ? `Lantai ${room.lantai || room.floor}` : '-'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>
                            {formatIntervalLabel(room.asset_audit_interval, room.asset_audit_interval_days)}
                          </span>
                        </td>
                        <td>
                          {room.next_asset_audit_due ? (
                            <span style={{ fontWeight: 600 }}>
                              {room.next_asset_audit_due}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${auditStatus.class}`}>
                            {auditStatus.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            {/* Tombol 1: Cek / Audit Fisik Ruangan */}
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenAuditForm(room)}
                              title="Lakukan Cek / Audit Fisik Ruangan Ini"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
                            >
                              <ClipboardCheck size={14} /> Audit Fisik
                            </button>

                            {/* Tombol 2: Kelola Master Aset Ruangan */}
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenManageAssets(room)}
                              title="Lihat & Kelola Master Aset Ruangan Ini"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                            >
                              <Box size={14} /> Kelola Aset
                            </button>

                            {/* Tombol 3: Atur Jadwal Audit (Supervisor / Admin) */}
                            {canManageMaster && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenScheduleModal(room)}
                                title="Atur Siklus / Jadwal Audit Ruangan Ini"
                              >
                                <Calendar size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: RIWAYAT & HASIL AUDIT FISIK (LOG & VERIFIKASI) */}
      {/* ========================================================================= */}
      {activeSubTab === 'audits' && (
        <>
          {/* Filters for Audits */}
          <div
            className="glass-panel"
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <select
              className="form-control"
              value={auditBuildingFilter}
              onChange={(e) => setAuditBuildingFilter(e.target.value)}
              style={{ maxWidth: '200px', fontWeight: 600 }}
            >
              <option value="">Semua Gedung ({buildings.length})</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama_gedung || b.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              className="form-control"
              placeholder="Cari ruangan, auditor..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              style={{ maxWidth: '220px' }}
            />

            <select
              className="form-control"
              value={auditStatusFilter}
              onChange={(e) => setAuditStatusFilter(e.target.value)}
              style={{ maxWidth: '170px' }}
            >
              <option value="">Semua Status Approval</option>
              <option value="submitted">Menunggu Review</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </select>

            <select
              className="form-control"
              value={auditDiscrepancyFilter}
              onChange={(e) => setAuditDiscrepancyFilter(e.target.value)}
              style={{ maxWidth: '180px' }}
            >
              <option value="">Semua Kondisi Audit</option>
              <option value="true">Ada Selisih / Rusak</option>
              <option value="false">Sesuai & Lengkap</option>
            </select>

            {(auditBuildingFilter || auditStatusFilter || auditDiscrepancyFilter || auditSearch) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setAuditBuildingFilter('');
                  setAuditStatusFilter('');
                  setAuditDiscrepancyFilter('');
                  setAuditSearch('');
                }}
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Audits Table */}
          {auditsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : audits.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <ClipboardCheck size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Belum ada riwayat laporan audit fisik aset yang sesuai filter.</p>
            </div>
          ) : (
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Tanggal & Periode</th>
                    <th>Ruangan & Gedung</th>
                    <th>Petugas Auditor</th>
                    <th style={{ textAlign: 'center' }}>Total Paten vs Fisik</th>
                    <th>Kesesuaian Fisik</th>
                    <th>Status Approval</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr key={audit.id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{audit.audit_date}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>
                          Periode: {audit.periode}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{audit.room_name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block' }}>
                          {audit.building_name} ({audit.room_code})
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{audit.auditor_name || 'Petugas CS'}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: audit.has_discrepancy ? '#dc2626' : '#166534',
                          }}
                        >
                          {audit.total_actual} / {audit.total_expected} Unit
                        </span>
                      </td>
                      <td>
                        {audit.has_discrepancy ? (
                          <span className="status-badge status-rejected">Ada Selisih / Kerusakan</span>
                        ) : (
                          <span className="status-badge status-completed">Lengkap & Sesuai</span>
                        )}
                      </td>
                      <td>{getAuditStatusBadge(audit.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenVerifyModal(audit)}
                            title={canManageMaster ? 'Review / Verifikasi Hasil Audit' : 'Lihat Detail Audit'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                          >
                            <Eye size={14} /> {canManageMaster ? 'Review' : 'Detail'}
                          </button>
                          {canManageMaster && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditAudit(audit)}
                                title="Edit Laporan Audit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteAudit(audit)}
                                title="Hapus Laporan Audit"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: KELOLA MASTER ASET RUANGAN (Melihat & Input Aset Ruangan) */}
      {/* ========================================================================= */}
      {showManageAssetsModal && selectedRoomForAssets && (
        <div className="modal-backdrop" onClick={() => setShowManageAssetsModal(false)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '860px',
              width: '94vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '28px',
              borderRadius: 'var(--radius-2xl)',
              background: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Master Inventaris Paten
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {selectedRoomForAssets.nama_ruangan || selectedRoomForAssets.name} ({selectedRoomForAssets.kode_ruangan || selectedRoomForAssets.code})
                </h2>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Gedung: <strong>{selectedRoomForAssets.nama_gedung || selectedRoomForAssets.building?.nama_gedung || 'Gedung'}</strong>
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowManageAssetsModal(false)}
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-form input aset jika tombol tambah diklik */}
            {showAssetForm && canManageMaster ? (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {editingAsset ? 'Edit Data Aset' : 'Tambah Aset Baru di Ruangan Ini'}
                  </h4>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAssetForm(false)}
                  >
                    Batal Input
                  </button>
                </div>

                <form onSubmit={handleSaveAssetForm}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {assetFormItems.map((item, index) => (
                      <div
                        key={item.id || index}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '12px',
                          display: 'grid',
                          gridTemplateColumns: editingAsset ? '1fr' : 'repeat(auto-fit, minmax(160px, 1fr))',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '3px', display: 'block' }}>
                            Nama Aset *
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Contoh: AC Panasonic 2PK"
                            value={item.nama_aset}
                            onChange={(e) => handleAssetFormItemChange(index, 'nama_aset', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '3px', display: 'block' }}>
                            Kode Aset *
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Contoh: AST-1029"
                            value={item.kode_aset}
                            onChange={(e) => handleAssetFormItemChange(index, 'kode_aset', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '3px', display: 'block' }}>
                            Jumlah Paten *
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="form-control"
                            value={item.jumlah}
                            onChange={(e) => handleAssetFormItemChange(index, 'jumlah', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '3px', display: 'block' }}>
                            Kondisi *
                          </label>
                          <select
                            className="form-control form-select"
                            value={item.status}
                            onChange={(e) => handleAssetFormItemChange(index, 'status', e.target.value)}
                            required
                          >
                            <option value="active">Baik / Normal</option>
                            <option value="damaged">Rusak</option>
                            <option value="repaired">Dalam Perbaikan</option>
                          </select>
                        </div>
                      </div>
                    ))}

                    {!editingAsset && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleAddAssetRow}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        <Plus size={14} /> Tambah Baris Barang Lain
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={savingAsset}
                      style={{ fontWeight: 700 }}
                    >
                      {savingAsset ? 'Menyimpan...' : 'Simpan Master Aset'}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            {/* Header Tindakan */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <strong style={{ fontSize: '0.92rem' }}>
                Daftar Master Aset ({roomAssetsList.length} Barang Terdaftar)
              </strong>
              {canManageMaster && !showAssetForm && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleOpenAddNewAsset}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                >
                  <Plus size={14} /> Tambah Aset di Ruangan Ini
                </button>
              )}
            </div>

            {/* Tabel Aset di Ruangan Ini */}
            {loadingRoomAssets ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <div className="spinner"></div>
              </div>
            ) : roomAssetsList.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', background: '#f9fafb', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
                <Box size={40} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '0.88rem' }}>
                  Belum ada master aset yang terdaftar di ruangan ini.
                </p>
              </div>
            ) : (
              <table className="data-table" style={{ width: '100%', fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    <th>Kode Aset</th>
                    <th>Nama Aset</th>
                    <th style={{ textAlign: 'center' }}>Jumlah Paten</th>
                    <th>Status Kondisi</th>
                    {canManageMaster && <th style={{ textAlign: 'right' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {roomAssetsList.map((asset) => (
                    <tr key={asset.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{asset.kode_aset}</td>
                      <td style={{ fontWeight: 500 }}>{asset.nama_aset}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: '#eff6ff',
                            color: '#1e40af',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.82rem',
                          }}
                        >
                          {asset.jumlah ?? 1} Unit
                        </span>
                      </td>
                      <td>{getConditionBadge(asset.status)}</td>
                      {canManageMaster && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '5px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEditAsset(asset)}
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteMasterAsset(asset)}
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowManageAssetsModal(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ATUR JADWAL AUDIT RUANGAN (Supervisor / Admin) */}
      {/* ========================================================================= */}
      {showScheduleModal && selectedRoomForSchedule && (
        <div className="modal-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '500px',
              width: '92vw',
              padding: '28px',
              borderRadius: 'var(--radius-2xl)',
              background: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Pengaturan Siklus Audit
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {selectedRoomForSchedule.nama_ruangan || selectedRoomForSchedule.name}
                </h2>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Gedung: {selectedRoomForSchedule.nama_gedung || selectedRoomForSchedule.building?.nama_gedung || ''}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowScheduleModal(false)}
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Frekuensi / Interval Pengecekan *
                  </label>
                  <select
                    className="form-control form-select"
                    value={scheduleInterval}
                    onChange={(e) => setScheduleInterval(e.target.value)}
                    required
                  >
                    <option value="biweekly">Setiap 2 Minggu (14 Hari)</option>
                    <option value="monthly">1 Bulan Sekali (30 Hari)</option>
                    <option value="bimonthly">2 Bulan Sekali (60 Hari - Standar)</option>
                    <option value="quarterly">3 Bulan Sekali / Triwulan (90 Hari)</option>
                    <option value="custom">Kustom Hari / Tanggal Khusus</option>
                  </select>
                </div>

                {scheduleInterval === 'custom' && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Jumlah Hari Interval *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="form-control"
                      value={scheduleIntervalDays}
                      onChange={(e) => setScheduleIntervalDays(e.target.value)}
                      placeholder="Misal: 45"
                      required
                    />
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Target Jatuh Tempo Audit Berikutnya (Next Due Date)
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={scheduleNextDue}
                    onChange={(e) => setScheduleNextDue(e.target.value)}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                    * Biarkan kosong jika ingin sistem menghitung otomatis berdasarkan interval di atas.
                  </small>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                  disabled={savingSchedule}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingSchedule} style={{ fontWeight: 700 }}>
                  {savingSchedule ? 'Menyimpan...' : 'Simpan Pengaturan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: FORMULIR AUDIT FISIK RUANGAN (CS & SUPERVISOR) */}
      {/* ========================================================================= */}
      {showAuditFormModal && selectedRoomForAudit && (
        <div className="modal-backdrop" onClick={() => setShowAuditFormModal(false)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '820px',
              width: '94vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '28px',
              borderRadius: 'var(--radius-2xl)',
              background: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {editingAudit ? 'Edit Laporan Audit' : 'Cek Fisik Lapangan'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {selectedRoomForAudit.nama_ruangan || selectedRoomForAudit.name} ({selectedRoomForAudit.kode_ruangan || selectedRoomForAudit.code})
                </h2>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Gedung: {selectedRoomForAudit.nama_gedung || selectedRoomForAudit.building?.nama_gedung || ''}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAuditFormModal(false)}
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAuditReport}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group" style={{ margin: 0, maxWidth: '240px' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Periode Audit *
                  </label>
                  <input
                    type="month"
                    className="form-control"
                    value={auditFormPeriod}
                    onChange={(e) => setAuditFormPeriod(e.target.value)}
                    required
                  />
                </div>

                {/* Quick Action Button */}
                {auditFormItems.length > 0 && (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-lg)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#166534', fontSize: '0.9rem', display: 'block' }}>
                        Semua Barang Lengkap & Tidak Ada Masalah?
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#15803d' }}>
                        Klik tombol di samping untuk otomatis mengisi semua item sebagai lengkap & baik.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={handleQuickFillAllGood}
                      style={{ fontWeight: 700 }}
                    >
                      <Check size={15} /> Semua Sesuai & Lengkap (1-Klik)
                    </button>
                  </div>
                )}

                {/* Items Checklist Table */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: '10px', display: 'block' }}>
                    Pemeriksaan Fisik per Barang ({auditFormItems.length} Item Terdaftar di Master)
                  </label>

                  {auditFormLoadingAssets ? (
                    <div style={{ textAlign: 'center', padding: '24px' }}>
                      <div className="spinner"></div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Memuat master aset ruangan...
                      </p>
                    </div>
                  ) : auditFormItems.length === 0 ? (
                    <div
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        background: '#f9fafb',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.88rem' }}>
                        Belum ada master aset yang terdaftar di ruangan ini. Hubungi Supervisor untuk input master aset terlebih dahulu.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {auditFormItems.map((item, index) => {
                        const isDiscrepancy =
                          item.jumlah_actual !== item.jumlah_expected || item.kondisi !== 'good';

                        return (
                          <div
                            key={item.room_asset_id}
                            style={{
                              background: isDiscrepancy ? '#fffbeb' : '#f9fafb',
                              border: isDiscrepancy ? '1.5px solid #fde047' : '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-lg)',
                              padding: '14px 16px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px',
                                flexWrap: 'wrap',
                                gap: '8px',
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                                  {item.nama_aset}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', marginLeft: '8px', fontWeight: 600 }}>
                                  ({item.kode_aset})
                                </span>
                              </div>

                              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                Standar Paten: <strong>{item.jumlah_expected} Unit</strong>
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                gap: '10px',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                                  Jumlah Riil Fisik *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  className="form-control"
                                  value={item.jumlah_actual}
                                  onChange={(e) =>
                                    handleAuditItemChange(index, 'jumlah_actual', parseInt(e.target.value) || 0)
                                  }
                                  required
                                  style={{
                                    fontWeight: 700,
                                    borderColor: item.jumlah_actual !== item.jumlah_expected ? '#eab308' : undefined,
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                                  Kondisi Fisik *
                                </label>
                                <select
                                  className="form-control form-select"
                                  value={item.kondisi}
                                  onChange={(e) => handleAuditItemChange(index, 'kondisi', e.target.value)}
                                  required
                                  style={{
                                    fontWeight: 600,
                                    color: item.kondisi === 'good' ? '#166534' : '#991b1b',
                                  }}
                                >
                                  <option value="good">Baik / Lengkap</option>
                                  <option value="damaged">Rusak</option>
                                  <option value="missing">Hilang / Tidak Ada</option>
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px', display: 'block' }}>
                                  Foto Bukti {isDiscrepancy ? '(Dianjurkan)' : '(Opsional)'}
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="form-control"
                                  style={{ fontSize: '0.75rem', padding: '5px' }}
                                  onChange={(e) => handleAuditItemPhotoChange(index, e.target.files[0] || null)}
                                />
                              </div>
                            </div>

                            {isDiscrepancy && (
                              <div style={{ marginTop: '10px' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Keterangan kendala (misal: 1 unit dibawa ke Ruang B, baut kendur, dll)..."
                                  value={item.catatan}
                                  onChange={(e) => handleAuditItemChange(index, 'catatan', e.target.value)}
                                  style={{ fontSize: '0.82rem' }}
                                />
                              </div>
                            )}

                            {item.foto_preview && (
                              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img
                                  src={item.foto_preview}
                                  alt="Preview"
                                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Foto terpilih</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Catatan Umum Audit (Opsional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Catatan tambahan mengenai kondisi umum ruangan..."
                    value={auditFormNotes}
                    onChange={(e) => setAuditFormNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAuditFormModal(false)}
                  disabled={submittingAudit}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingAudit || auditFormItems.length === 0}
                  style={{ fontWeight: 700 }}
                >
                  {submittingAudit
                    ? 'Menyimpan...'
                    : editingAudit
                    ? 'Simpan Perubahan Audit'
                    : 'Kirim Laporan Audit Fisik'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DETAIL & VERIFIKASI HASIL AUDIT (SUPERVISOR & ADMIN) */}
      {/* ========================================================================= */}
      {showVerifyModal && selectedAuditForVerify && (
        <div className="modal-backdrop" onClick={() => setShowVerifyModal(false)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '860px',
              width: '94vw',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '28px',
              borderRadius: 'var(--radius-2xl)',
              background: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Detail & Verifikasi Stock Opname
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  Hasil Audit: {selectedAuditForVerify.room_name} ({selectedAuditForVerify.periode})
                </h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowVerifyModal(false)}
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                marginBottom: '18px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>RUANGAN</span>
                <strong>{selectedAuditForVerify.room_name} ({selectedAuditForVerify.room_code})</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>GEDUNG</span>
                <strong>{selectedAuditForVerify.building_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>PETUGAS AUDITOR</span>
                <strong>{selectedAuditForVerify.auditor_name || 'Petugas CS'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>TANGGAL PELAKSANAAN</span>
                <strong>{selectedAuditForVerify.audit_date}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>TOTAL BARANG</span>
                <strong>{selectedAuditForVerify.total_actual} Fisik / {selectedAuditForVerify.total_expected} Paten</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>STATUS KESESUAIAN</span>
                {selectedAuditForVerify.has_discrepancy ? (
                  <span className="status-badge status-rejected">Ada Selisih / Kerusakan</span>
                ) : (
                  <span className="status-badge status-completed">Sesuai & Lengkap</span>
                )}
              </div>
            </div>

            {selectedAuditForVerify.notes && (
              <div
                style={{
                  background: 'rgba(14, 49, 146, 0.04)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                <strong>Catatan Auditor:</strong> {selectedAuditForVerify.notes}
              </div>
            )}

            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 10px 0' }}>
              Perbandingan Aset Paten vs Fisik Lapangan
            </h4>
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Nama & Kode Barang</th>
                    <th style={{ textAlign: 'center' }}>Paten</th>
                    <th style={{ textAlign: 'center' }}>Fisik</th>
                    <th>Kondisi</th>
                    <th>Foto Bukti</th>
                    <th>Catatan Petugas</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAuditForVerify.items?.map((item) => {
                    const isDiff =
                      item.jumlah_actual !== item.jumlah_expected || item.kondisi !== 'good';

                    return (
                      <tr
                        key={item.id}
                        style={{
                          background: isDiff ? '#fffbeb' : undefined,
                        }}
                      >
                        <td>
                          <strong>{item.nama_aset}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>
                            {item.kode_aset}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.jumlah_expected} Unit</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: isDiff ? '#dc2626' : '#166534' }}>
                          {item.jumlah_actual} Unit
                        </td>
                        <td>{getConditionBadge(item.kondisi)}</td>
                        <td>
                          {item.foto_bukti_url ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => setPreviewPhotoUrl(item.foto_bukti_url)}
                            >
                              <Camera size={12} /> Lihat Foto
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ color: item.catatan ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {item.catatan || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {canManageMaster && (
              <form onSubmit={handleSubmitVerify} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--primary)' }}>
                  Keputusan Verifikasi Supervisor
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-lg)',
                        border: verifyStatus === 'approved' ? '2px solid #16a34a' : '1px solid var(--border-color)',
                        background: verifyStatus === 'approved' ? '#f0fdf4' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <input
                        type="radio"
                        name="verifyStatus"
                        value="approved"
                        checked={verifyStatus === 'approved'}
                        onChange={() => setVerifyStatus('approved')}
                      />
                      <strong style={{ color: '#166534' }}>Setujui Hasil Audit (Approved)</strong>
                    </label>

                    <label
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 'var(--radius-lg)',
                        border: verifyStatus === 'rejected' ? '2px solid #dc2626' : '1px solid var(--border-color)',
                        background: verifyStatus === 'rejected' ? '#fef2f2' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <input
                        type="radio"
                        name="verifyStatus"
                        value="rejected"
                        checked={verifyStatus === 'rejected'}
                        onChange={() => setVerifyStatus('rejected')}
                      />
                      <strong style={{ color: '#991b1b' }}>Tolak / Minta Audit Ulang (Rejected)</strong>
                    </label>
                  </div>

                  {verifyStatus === 'approved' && (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {selectedAuditForVerify.has_discrepancy && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={autoCreateFindings}
                            onChange={(e) => setAutoCreateFindings(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#b45309' }}>
                            Otomatis Buat Tiket Temuan Kerusakan (Findings) untuk barang rusak / hilang
                          </span>
                        </label>
                      )}

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={syncMasterBaseline}
                          onChange={(e) => setSyncMasterBaseline(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                          Sinkronisasi Master Paten (Update jumlah baseline master sesuai angka riil fisik)
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Catatan Verifikasi Supervisor
                    </label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Instruksi atau catatan persetujuan hasil audit..."
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: '18px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowVerifyModal(false)}
                    disabled={submittingVerify}
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingVerify}
                    style={{ fontWeight: 700 }}
                  >
                    {submittingVerify ? 'Menyimpan...' : 'Simpan Keputusan Verifikasi'}
                  </button>
                </div>
              </form>
            )}

            {!canManageMaster && (
              <div className="modal-footer" style={{ marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowVerifyModal(false)}>
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PREVIEW FOTO BUKTI */}
      {/* ========================================================================= */}
      {previewPhotoUrl && (
        <div className="modal-backdrop" onClick={() => setPreviewPhotoUrl(null)} style={{ zIndex: 1000 }}>
          <div
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#000',
              padding: '8px',
              borderRadius: '12px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Foto Bukti"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


