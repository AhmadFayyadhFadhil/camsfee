import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ShieldAlert, 
  Wrench, 
  Box, 
  Filter, 
  ListPlus, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ClipboardCheck, 
  RefreshCw, 
  Eye, 
  Camera, 
  Layers, 
  ArrowRight,
  AlertCircle
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
  const [activeSubTab, setActiveSubTab] = useState(canManageMaster ? 'master' : 'audits'); // 'master' | 'audits' | 'schedules'

  // Master Data State
  const [assets, setAssets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState(initialRoomId || '');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');

  // Master Asset Form State (Multi-row dynamic items)
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [items, setItems] = useState([
    { id: 'item-1', nama_aset: '', kode_aset: '', jumlah: 1, status: 'active' }
  ]);
  const [saving, setSaving] = useState(false);

  // Audit Schedule Config Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleRoomId, setScheduleRoomId] = useState('');
  const [scheduleInterval, setScheduleInterval] = useState('bimonthly');
  const [scheduleIntervalDays, setScheduleIntervalDays] = useState(60);
  const [scheduleNextDue, setScheduleNextDue] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Audits Data State (Tab 2)
  const [audits, setAudits] = useState([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [auditPeriodFilter, setAuditPeriodFilter] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState('');
  const [auditDiscrepancyFilter, setAuditDiscrepancyFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Physical Audit Form Modal State (CS / Supervisor input)
  const [showAuditFormModal, setShowAuditFormModal] = useState(false);
  const [auditFormRoomId, setAuditFormRoomId] = useState(initialRoomId || '');
  const [auditFormPeriod, setAuditFormPeriod] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [auditFormNotes, setAuditFormNotes] = useState('');
  const [auditFormItems, setAuditFormItems] = useState([]);
  const [auditFormLoadingAssets, setAuditFormLoadingAssets] = useState(false);
  const [submittingAudit, setSubmittingAudit] = useState(false);

  // Verify Audit Modal State (Supervisor review)
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedAuditForVerify, setSelectedAuditForVerify] = useState(null);
  const [verifyStatus, setVerifyStatus] = useState('approved');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [autoCreateFindings, setAutoCreateFindings] = useState(true);
  const [syncMasterBaseline, setSyncMasterBaseline] = useState(false);
  const [verifyNextDueDate, setVerifyNextDueDate] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Schedule Summary State
  const [scheduleSummary, setScheduleSummary] = useState(null);
  const [scheduleRoomsList, setScheduleRoomsList] = useState([]);
  const [loadingScheduleSummary, setLoadingScheduleSummary] = useState(false);

  // Preview Photo Modal State
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

  const generateAssetCode = () => `AST-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Fetch Master Assets & Rooms
  const fetchMasterData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/room-assets?per_page=150';
      if (selectedRoomFilter) url += `&room_id=${encodeURIComponent(selectedRoomFilter)}`;
      if (selectedStatusFilter) url += `&status=${encodeURIComponent(selectedStatusFilter)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const [assetsRes, roomsRes] = await Promise.all([
        api.get(url),
        api.get('/rooms?is_active=true&per_page=500')
      ]);

      if (assetsRes.success) {
        setAssets(assetsRes.data.data || assetsRes.data || []);
      }
      if (roomsRes.success) {
        setRooms(roomsRes.data.data || roomsRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat daftar master aset ruangan.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Audits History
  const fetchAuditsData = async () => {
    setAuditsLoading(true);
    try {
      let url = '/room-asset-audits?per_page=50';
      if (selectedRoomFilter) url += `&room_id=${encodeURIComponent(selectedRoomFilter)}`;
      if (auditPeriodFilter) url += `&periode=${encodeURIComponent(auditPeriodFilter)}`;
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

  // 3. Fetch Schedule Summary
  const fetchScheduleSummary = async () => {
    setLoadingScheduleSummary(true);
    try {
      const res = await api.get('/room-asset-audits/schedule-summary');
      if (res.success) {
        setScheduleSummary(res.data.summary);
        setScheduleRoomsList(res.data.rooms || []);
      }
    } catch (err) {
      console.error('Error fetching schedule summary:', err);
    } finally {
      setLoadingScheduleSummary(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'master') {
      fetchMasterData();
    } else if (activeSubTab === 'audits') {
      fetchAuditsData();
    } else if (activeSubTab === 'schedules') {
      fetchScheduleSummary();
    }
  }, [
    activeSubTab,
    selectedRoomFilter,
    selectedStatusFilter,
    search,
    auditPeriodFilter,
    auditStatusFilter,
    auditDiscrepancyFilter,
    auditSearch,
  ]);

  // Load rooms list once on mount
  useEffect(() => {
    api.get('/rooms?is_active=true&per_page=500').then((res) => {
      if (res.success) setRooms(res.data.data || res.data || []);
    });
  }, []);

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

  // -------------------------------------------------------------
  // MASTER ASSET ACTIONS
  // -------------------------------------------------------------
  const handleOpenNew = () => {
    setEditingAsset(null);
    setRoomId(selectedRoomFilter || rooms[0]?.id || '');
    setItems([
      { id: `item-${Date.now()}-1`, nama_aset: '', kode_aset: generateAssetCode(), jumlah: 1, status: 'active' }
    ]);
    setShowModal(true);
  };

  const handleOpenEdit = (asset) => {
    setEditingAsset(asset);
    setRoomId(asset.room_id || '');
    setItems([
      {
        id: asset.id,
        nama_aset: asset.nama_aset || '',
        kode_aset: asset.kode_aset || '',
        jumlah: asset.jumlah ?? 1,
        status: asset.status || 'active'
      }
    ]);
    setShowModal(true);
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nama_aset: '',
        kode_aset: generateAssetCode(),
        jumlah: 1,
        status: 'active'
      }
    ]);
  };

  const handleRemoveItemRow = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(
      updated.length > 0
        ? updated
        : [{ id: `item-${Date.now()}`, nama_aset: '', kode_aset: generateAssetCode(), jumlah: 1, status: 'active' }]
    );
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSaveMaster = async (e) => {
    e.preventDefault();
    if (!roomId) {
      setError('Ruangan penempatan wajib dipilih.');
      return;
    }

    if (editingAsset) {
      const singleItem = items[0];
      if (!singleItem.nama_aset.trim() || !singleItem.kode_aset.trim()) {
        setError('Nama dan kode aset wajib diisi.');
        return;
      }

      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      try {
        const payload = {
          room_id: roomId,
          nama_aset: singleItem.nama_aset.trim(),
          kode_aset: singleItem.kode_aset.trim(),
          jumlah: singleItem.jumlah ? Math.max(1, parseInt(singleItem.jumlah) || 1) : 1,
          status: singleItem.status || 'active',
        };
        const res = await api.put(`/room-assets/${editingAsset.id}`, payload);
        if (res.success) {
          setSuccessMsg('Master aset ruangan berhasil diperbarui.');
          setShowModal(false);
          fetchMasterData();
        }
      } catch (err) {
        setError(err.message || 'Gagal menyimpan pembaruan aset.');
      } finally {
        setSaving(false);
      }
    } else {
      // Batch mode
      const validItems = items.filter(
        (i) => i.nama_aset && i.nama_aset.trim() !== '' && i.kode_aset && i.kode_aset.trim() !== ''
      );

      if (validItems.length === 0) {
        setError('Minimal isi 1 baris nama aset dan kode aset.');
        return;
      }

      const codes = validItems.map((i) => i.kode_aset.trim().toLowerCase());
      const uniqueCodes = new Set(codes);
      if (uniqueCodes.size !== codes.length) {
        setError('Terdapat kode aset duplikat dalam daftar yang Anda masukkan. Pastikan setiap kode aset berbeda.');
        return;
      }

      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      try {
        const payload = {
          room_id: roomId,
          assets: validItems.map((i) => ({
            nama_aset: i.nama_aset.trim(),
            kode_aset: i.kode_aset.trim(),
            jumlah: i.jumlah ? Math.max(1, parseInt(i.jumlah) || 1) : 1,
            status: i.status || 'active',
          })),
        };
        const res = await api.post('/room-assets', payload);
        if (res.success) {
          setSuccessMsg(
            validItems.length > 1
              ? `${validItems.length} master aset berhasil ditambahkan sekaligus!`
              : 'Master aset ruangan baru berhasil ditambahkan.'
          );
          setShowModal(false);
          fetchMasterData();
        }
      } catch (err) {
        setError(err.message || 'Gagal menambahkan master aset.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDeleteMaster = async (asset) => {
    if (
      !(await confirm({
        title: 'Hapus Master Aset',
        message: `Apakah Anda yakin ingin menghapus master aset "${asset.nama_aset}" (${asset.kode_aset})? Riwayat audit dan temuan kerusakan sebelumnya tetap tersimpan.`,
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
        fetchMasterData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus master aset.');
    }
  };

  // -------------------------------------------------------------
  // AUDIT SCHEDULE CONFIG ACTIONS (Supervisor)
  // -------------------------------------------------------------
  const handleOpenScheduleModal = (room = null) => {
    const targetRoom = room || (selectedRoomFilter ? rooms.find((r) => r.id === selectedRoomFilter) : rooms[0]);
    if (targetRoom) {
      setScheduleRoomId(targetRoom.id);
      setScheduleInterval(targetRoom.asset_audit_interval || 'bimonthly');
      setScheduleIntervalDays(targetRoom.asset_audit_interval_days || 60);
      setScheduleNextDue(targetRoom.next_asset_audit_due || '');
    }
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleRoomId) {
      setError('Ruangan wajib dipilih.');
      return;
    }

    setSavingSchedule(true);
    setError(null);
    try {
      const payload = {
        asset_audit_interval: scheduleInterval,
        asset_audit_interval_days: scheduleInterval === 'custom' ? parseInt(scheduleIntervalDays) || 60 : undefined,
        next_asset_audit_due: scheduleNextDue || null,
      };

      const res = await api.put(`/rooms/${scheduleRoomId}/asset-audit-schedule`, payload);
      if (res.success) {
        setSuccessMsg('Jadwal dan interval audit aset ruangan berhasil disimpan!');
        setShowScheduleModal(false);
        if (activeSubTab === 'schedules') fetchScheduleSummary();
        if (activeSubTab === 'master') fetchMasterData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan jadwal audit ruangan.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // -------------------------------------------------------------
  // PHYSICAL AUDIT SUBMISSION ACTIONS (CS / Supervisor)
  // -------------------------------------------------------------
  const handleOpenAuditForm = async (roomIdToAudit = null) => {
    const targetRoomId = roomIdToAudit || selectedRoomFilter || rooms[0]?.id;
    setAuditFormRoomId(targetRoomId);
    setAuditFormPeriod(new Date().toISOString().substring(0, 7));
    setAuditFormNotes('');
    setAuditFormItems([]);
    setShowAuditFormModal(true);

    if (targetRoomId) {
      loadAssetsForAuditForm(targetRoomId);
    }
  };

  const loadAssetsForAuditForm = async (targetRoomId) => {
    setAuditFormLoadingAssets(true);
    try {
      const res = await api.get(`/room-assets?room_id=${encodeURIComponent(targetRoomId)}&per_page=100`);
      if (res.success) {
        const rawAssets = res.data.data || res.data || [];
        const initialFormItems = rawAssets.map((asset) => ({
          room_asset_id: asset.id,
          nama_aset: asset.nama_aset,
          kode_aset: asset.kode_aset,
          jumlah_expected: asset.jumlah ?? 1,
          jumlah_actual: asset.jumlah ?? 1, // Default pas
          kondisi: 'good', // Default baik
          foto_file: null,
          foto_preview: null,
          catatan: '',
        }));
        setAuditFormItems(initialFormItems);
      }
    } catch (err) {
      setError('Gagal memuat daftar master aset ruangan ini.');
    } finally {
      setAuditFormLoadingAssets(false);
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
    setSuccessMsg('Semua item telah ditandai sesuai & kondisi baik!');
  };

  const handleSubmitAuditReport = async (e) => {
    e.preventDefault();
    if (!auditFormRoomId) {
      setError('Ruangan wajib dipilih.');
      return;
    }
    if (auditFormItems.length === 0) {
      setError('Ruangan ini belum memiliki master aset yang terdaftar.');
      return;
    }

    setSubmittingAudit(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('room_id', auditFormRoomId);
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

      const res = await api.post('/room-asset-audits', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success) {
        setSuccessMsg('Laporan audit fisik aset ruangan berhasil dikirim!');
        setShowAuditFormModal(false);
        if (activeSubTab === 'audits') fetchAuditsData();
        if (activeSubTab === 'schedules') fetchScheduleSummary();
      }
    } catch (err) {
      setError(err.message || 'Gagal mengirim laporan audit aset.');
    } finally {
      setSubmittingAudit(false);
    }
  };

  // -------------------------------------------------------------
  // VERIFY AUDIT ACTIONS (Supervisor Review)
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
      }
    } catch (err) {
      setError(err.message || 'Gagal memverifikasi audit.');
    } finally {
      setSubmittingVerify(false);
    }
  };

  // Helper Badges
  const getConditionBadge = (cond) => {
    switch (cond) {
      case 'good':
      case 'active':
        return <span className="status-badge status-completed">Baik / Lengkap</span>;
      case 'damaged':
        return <span className="status-badge status-rejected">Rusak</span>;
      case 'missing':
        return <span className="status-badge status-overdue">Hilang</span>;
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

  const getDueStatusBadge = (status, nextDue) => {
    switch (status) {
      case 'overdue':
        return <span className="status-badge status-rejected" title={nextDue ? `Batas: ${nextDue}` : ''}>Overdue (Terlewat)</span>;
      case 'due_soon':
        return <span className="status-badge status-waiting_verification" title={nextDue ? `Batas: ${nextDue}` : ''}>Due Soon (Jatuh Tempo)</span>;
      case 'up_to_date':
        return <span className="status-badge status-completed" title={nextDue ? `Audit Berikutnya: ${nextDue}` : ''}>Aman (Up-to-Date)</span>;
      default:
        return <span className="status-badge status-pending">Belum Pernah Diaudit</span>;
    }
  };

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

  const filledItemsCount = items.filter((i) => i.nama_aset && i.nama_aset.trim() !== '').length;

  return (
    <div className="container-fluid">
      {/* Top Header */}
      <div className="flex-header" style={{ marginBottom: '18px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>
            {canManageMaster ? 'Aset Ruangan & Stock Opname' : 'Audit Fisik Aset Ruangan'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {canManageMaster
              ? 'Pencatatan master inventaris paten, pengaturan siklus jadwal audit, dan verifikasi stock opname berkala'
              : 'Pemeriksaan fisik inventaris ruangan berkala sesuai data paten untuk memastikan kelengkapan barang'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Button: Lakukan Audit Fisik (Accessible to CS and Supervisor) */}
          <button
            className="btn btn-secondary"
            onClick={() => handleOpenAuditForm()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
          >
            <ClipboardCheck size={16} color="var(--primary)" /> Lakukan Audit Fisik
          </button>

          {/* Buttons for Supervisor/Admin */}
          {canManageMaster && (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => handleOpenScheduleModal()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <Calendar size={16} /> Atur Jadwal Audit
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOpenNew}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              >
                <Plus size={16} /> Tambah Master Aset
              </button>
            </>
          )}
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

      {/* Navigation Sub-Tabs */}
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
        {canManageMaster && (
          <button
            type="button"
            className="tab-button"
            onClick={() => setActiveSubTab('master')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeSubTab === 'master' ? 700 : 500,
              color: activeSubTab === 'master' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeSubTab === 'master' ? '3px solid var(--primary)' : '3px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.95rem',
            }}
          >
            <Box size={17} /> 1. Master Inventaris Paten
          </button>
        )}

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
          <ClipboardCheck size={17} /> 2. Riwayat & Hasil Audit Fisik
        </button>

        {canManageMaster && (
          <button
            type="button"
            className="tab-button"
            onClick={() => setActiveSubTab('schedules')}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeSubTab === 'schedules' ? 700 : 500,
              color: activeSubTab === 'schedules' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeSubTab === 'schedules' ? '3px solid var(--primary)' : '3px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.95rem',
            }}
          >
            <Calendar size={17} /> 3. Matriks Jadwal & Jatuh Tempo
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: MASTER INVENTARIS PATEN (Supervisor / Admin) */}
      {/* ========================================================================= */}
      {activeSubTab === 'master' && (
        <>
          {/* Filter & Search Bar */}
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
            <input
              type="text"
              className="form-control"
              placeholder="Cari nama atau kode aset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: '280px' }}
            />

            <select
              className="form-control"
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              style={{ maxWidth: '240px' }}
            >
              <option value="">Semua Ruangan</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama_ruangan || r.name} ({r.kode_ruangan || r.code})
                </option>
              ))}
            </select>

            <select
              className="form-control"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              style={{ maxWidth: '180px' }}
            >
              <option value="">Semua Status</option>
              <option value="active">Baik / Aktif</option>
              <option value="damaged">Rusak</option>
              <option value="repaired">Sedang Diperbaiki</option>
            </select>

            {(selectedRoomFilter || selectedStatusFilter || search) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedRoomFilter('');
                  setSelectedStatusFilter('');
                  setSearch('');
                }}
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Master Assets Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : assets.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Box size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Tidak ada data master aset ruangan yang sesuai filter.</p>
            </div>
          ) : (
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Kode Aset</th>
                    <th>Nama Aset</th>
                    <th style={{ textAlign: 'center' }}>Jumlah Paten</th>
                    <th>Ruangan & Gedung</th>
                    <th>Status Kondisi</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => (
                    <tr key={asset.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{asset.kode_aset}</td>
                      <td style={{ fontWeight: 500 }}>{asset.nama_aset}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: '#eff6ff',
                            color: '#1e40af',
                            fontWeight: 700,
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                          }}
                        >
                          {asset.jumlah ?? 1} Unit
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{asset.room_name || asset.room?.nama_ruangan}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block' }}>
                          ({asset.room_code || asset.room?.kode_ruangan})
                        </span>
                      </td>
                      <td>{getConditionBadge(asset.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEdit(asset)}
                            title="Edit Master Aset"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteMaster(asset)}
                            title="Hapus Master Aset"
                          >
                            <Trash2 size={14} />
                          </button>
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
      {/* SUB-TAB 2: RIWAYAT & HASIL AUDIT FISIK (CS & SUPERVISOR) */}
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
            <input
              type="text"
              className="form-control"
              placeholder="Cari ruangan, auditor, periode..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              style={{ maxWidth: '260px' }}
            />

            <select
              className="form-control"
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              style={{ maxWidth: '220px' }}
            >
              <option value="">Semua Ruangan</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama_ruangan || r.name} ({r.kode_ruangan || r.code})
                </option>
              ))}
            </select>

            <select
              className="form-control"
              value={auditStatusFilter}
              onChange={(e) => setAuditStatusFilter(e.target.value)}
              style={{ maxWidth: '180px' }}
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
              style={{ maxWidth: '190px' }}
            >
              <option value="">Semua Kondisi Audit</option>
              <option value="true">Ada Selisih / Rusak</option>
              <option value="false">Sesuai & Lengkap</option>
            </select>

            {(selectedRoomFilter || auditStatusFilter || auditDiscrepancyFilter || auditSearch) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedRoomFilter('');
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
              <p>Belum ada riwayat laporan audit fisik aset yang sesuai.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenAuditForm()}
                style={{ marginTop: '10px' }}
              >
                Lakukan Audit Sekarang
              </button>
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
                          <span className="status-badge status-rejected" style={{ display: 'inline-flex', gap: '4px' }}>
                            <AlertTriangle size={12} /> Ada Selisih / Kerusakan
                          </span>
                        ) : (
                          <span className="status-badge status-completed" style={{ display: 'inline-flex', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Lengkap & Sesuai
                          </span>
                        )}
                      </td>
                      <td>{getAuditStatusBadge(audit.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenVerifyModal(audit)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                        >
                          <Eye size={14} /> {canManageMaster ? 'Review / Verifikasi' : 'Lihat Detail'}
                        </button>
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
      {/* SUB-TAB 3: MATRIKS JADWAL & JATUH TEMPO (Supervisor / Admin) */}
      {/* ========================================================================= */}
      {activeSubTab === 'schedules' && canManageMaster && (
        <>
          {/* Stats Summary Cards */}
          {scheduleSummary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <div className="glass-panel" style={{ padding: '18px', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL RUANGAN</span>
                <h3 style={{ fontSize: '1.6rem', margin: '6px 0 0', fontWeight: 800 }}>{scheduleSummary.total_rooms}</h3>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-lg)',
                  borderLeft: '4px solid #16a34a',
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>AMAN / UP-TO-DATE</span>
                <h3 style={{ fontSize: '1.6rem', margin: '6px 0 0', fontWeight: 800, color: '#16a34a' }}>
                  {scheduleSummary.up_to_date}
                </h3>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-lg)',
                  borderLeft: '4px solid #eab308',
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#ca8a04', fontWeight: 700 }}>JATUH TEMPO (&le; 7 HARI)</span>
                <h3 style={{ fontSize: '1.6rem', margin: '6px 0 0', fontWeight: 800, color: '#ca8a04' }}>
                  {scheduleSummary.due_soon}
                </h3>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-lg)',
                  borderLeft: '4px solid #dc2626',
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 700 }}>OVERDUE (TERLEWAT)</span>
                <h3 style={{ fontSize: '1.6rem', margin: '6px 0 0', fontWeight: 800, color: '#dc2626' }}>
                  {scheduleSummary.overdue + scheduleSummary.never_audited}
                </h3>
              </div>
            </div>
          )}

          {/* Schedule Matrix Table */}
          {loadingScheduleSummary ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Ruangan & Gedung</th>
                    <th style={{ textAlign: 'center' }}>Total Master Aset</th>
                    <th>Interval Pengecekan</th>
                    <th>Audit Terakhir</th>
                    <th>Target Jatuh Tempo Berikutnya</th>
                    <th>Status Siklus</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleRoomsList.map((room) => (
                    <tr key={room.id}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{room.nama_ruangan}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block' }}>
                          {room.nama_gedung} ({room.kode_ruangan})
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{room.total_assets} Barang</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>
                          ({room.total_units} Unit)
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {formatIntervalLabel(room.asset_audit_interval, room.asset_audit_interval_days)}
                        </span>
                      </td>
                      <td>
                        {room.last_asset_audit_at ? (
                          <span>{new Date(room.last_asset_audit_at).toLocaleDateString('id-ID')}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Belum Pernah</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {room.next_asset_audit_due || '-'}
                        </span>
                      </td>
                      <td>{getDueStatusBadge(room.audit_status, room.next_asset_audit_due)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenScheduleModal(room)}
                            title="Ubah Siklus / Reschedule"
                          >
                            <Calendar size={14} /> Atur Jadwal
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenAuditForm(room.id)}
                            title="Audit Ruangan Sekarang"
                          >
                            <ClipboardCheck size={14} />
                          </button>
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
      {/* MODAL 1: FORM TAMBAH / EDIT MASTER ASET PATEN */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: editingAsset ? '560px' : '860px',
              width: '94vw',
              maxHeight: '90vh',
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
                  {editingAsset ? 'Edit Master Aset Paten' : 'Master Inventaris Paten'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingAsset ? 'Edit Master Aset Ruangan' : 'Tambah Master Aset Paten Ruangan'}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMaster}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Ruangan Penempatan *
                  </label>
                  <select
                    className="form-control form-select"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    required
                  >
                    <option value="">Pilih Ruangan...</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama_ruangan || r.name} ({r.kode_ruangan || r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      {editingAsset ? 'Detail Master Aset *' : `Daftar Aset Paten (${items.length} Baris)`}
                    </label>
                    {!editingAsset && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {filledItemsCount} dari {items.length} item terisi
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map((item, index) => (
                      <div
                        key={item.id || index}
                        style={{
                          background: '#f9fafb',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        {!editingAsset && items.length > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                              Aset #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(index)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                              }}
                            >
                              <Trash2 size={13} /> Hapus Baris
                            </button>
                          </div>
                        )}

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: editingAsset
                              ? '1fr'
                              : 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '10px',
                          }}
                        >
                          <div>
                            <label
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#4b5563',
                                marginBottom: '4px',
                                display: 'block',
                              }}
                            >
                              Nama Aset *
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Contoh: AC Daikin 2PK, Kursi Ergonomis"
                              value={item.nama_aset}
                              onChange={(e) => handleItemChange(index, 'nama_aset', e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#4b5563',
                                marginBottom: '4px',
                                display: 'block',
                              }}
                            >
                              Kode Aset / Serial *
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Contoh: AST-5538"
                              value={item.kode_aset}
                              onChange={(e) => handleItemChange(index, 'kode_aset', e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#4b5563',
                                marginBottom: '4px',
                                display: 'block',
                              }}
                            >
                              Jumlah Paten (Standar) *
                            </label>
                            <input
                              type="number"
                              min="1"
                              className="form-control"
                              placeholder="Contoh: 1, 10"
                              value={item.jumlah}
                              onChange={(e) => handleItemChange(index, 'jumlah', e.target.value)}
                              required
                            />
                          </div>

                          <div>
                            <label
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#4b5563',
                                marginBottom: '4px',
                                display: 'block',
                              }}
                            >
                              Status Kondisi *
                            </label>
                            <select
                              className="form-control form-select"
                              value={item.status}
                              onChange={(e) => handleItemChange(index, 'status', e.target.value)}
                              required
                            >
                              <option value="active">Baik / Normal</option>
                              <option value="damaged">Rusak</option>
                              <option value="repaired">Dalam Perbaikan</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!editingAsset && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddItemRow}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        borderStyle: 'dashed',
                        fontWeight: 600,
                        background: '#eff6ff',
                        color: '#2563eb',
                        borderColor: '#bfdbfe',
                      }}
                    >
                      <Plus size={16} /> Tambah Baris Aset Baru
                    </button>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontWeight: 700 }}>
                  {saving
                    ? 'Menyimpan...'
                    : editingAsset
                    ? 'Simpan Perubahan'
                    : filledItemsCount > 1
                    ? `Simpan Semua Master (${filledItemsCount} Item)`
                    : 'Simpan Master Aset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PENGATURAN JADWAL & INTERVAL AUDIT RUANGAN (Supervisor) */}
      {/* ========================================================================= */}
      {showScheduleModal && (
        <div className="modal-backdrop" onClick={() => setShowScheduleModal(false)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: '520px',
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
                  Atur Jadwal Audit Aset
                </h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowScheduleModal(false)}
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Pilih Ruangan Target *
                  </label>
                  <select
                    className="form-control form-select"
                    value={scheduleRoomId}
                    onChange={(e) => {
                      const rId = e.target.value;
                      setScheduleRoomId(rId);
                      const r = rooms.find((rm) => rm.id === rId);
                      if (r) {
                        setScheduleInterval(r.asset_audit_interval || 'bimonthly');
                        setScheduleIntervalDays(r.asset_audit_interval_days || 60);
                        setScheduleNextDue(r.next_asset_audit_due || '');
                      }
                    }}
                    required
                  >
                    <option value="">Pilih Ruangan...</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama_ruangan || r.name} ({r.kode_ruangan || r.code})
                      </option>
                    ))}
                  </select>
                </div>

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
      {/* MODAL 3: FORMULIR PENGECEKAN / AUDIT FISIK (CS / SUPERVISOR) */}
      {/* ========================================================================= */}
      {showAuditFormModal && (
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
                  Cek Fisik Lapangan
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  Formulir Audit & Stock Opname Aset
                </h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAuditFormModal(false)}
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAuditReport}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Header Inputs: Room & Period */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Ruangan Yang Diaudit *
                    </label>
                    <select
                      className="form-control form-select"
                      value={auditFormRoomId}
                      onChange={(e) => {
                        const newRId = e.target.value;
                        setAuditFormRoomId(newRId);
                        if (newRId) loadAssetsForAuditForm(newRId);
                      }}
                      required
                    >
                      <option value="">Pilih Ruangan...</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama_ruangan || r.name} ({r.kode_ruangan || r.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
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
                        Gunakan tombol cepat di samping untuk mengisi otomatis semua item sebagai lengkap & baik.
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

                {/* Items Checklist Table / Cards */}
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
                      <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: '6px' }} />
                      <p style={{ margin: 0, fontSize: '0.88rem' }}>
                        Belum ada master aset yang terdaftar di ruangan ini. Hubungi Supervisor untuk input master aset.
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
                              {/* Actual Quantity */}
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

                              {/* Condition */}
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

                              {/* Photo Upload (Required/Recommended if discrepancy) */}
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

                            {/* Note field if discrepancy */}
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

                            {/* Photo Preview Thumbnail */}
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

                {/* Overall Notes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Catatan Umum Audit (Opsional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Catatan tambahan mengenai kondisi umum ruangan saat dilakukan stock opname..."
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
                  {submittingAudit ? 'Mengirim Laporan...' : 'Kirim Laporan Audit Fisik'}
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
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            {/* Audit Summary Details */}
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
                  <span className="status-badge status-rejected" style={{ display: 'inline-flex', gap: '3px' }}>
                    <AlertTriangle size={11} /> Ada Selisih / Kerusakan
                  </span>
                ) : (
                  <span className="status-badge status-completed" style={{ display: 'inline-flex', gap: '3px' }}>
                    <CheckCircle2 size={11} /> Sesuai & Lengkap
                  </span>
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

            {/* Items Table Comparison */}
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

            {/* Verification Form (Supervisor / Admin only) */}
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

                  {/* Actions checkboxes if approved */}
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

            {/* Read-Only Close button for CS */}
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
      {/* MODAL 5: PHOTO PREVIEW MODAL */}
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


