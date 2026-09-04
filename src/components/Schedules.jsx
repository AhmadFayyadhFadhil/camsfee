import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { FREQUENCIES, DAYS_OF_WEEK } from '../utils/constants';
import { Calendar, Plus, Trash2, Check, X, ShieldAlert, Clock, User, Clipboard, Sliders, Search, Filter, RefreshCw, Building, Edit2, Layers } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext.jsx';

export default function Schedules() {
  const confirm = useConfirm();
  const [activeSubTab, setActiveSubTab] = useState('schedules'); // 'schedules' or 'assignments'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Lookups
  const [rooms, setRooms] = useState([]);
  const [csUsers, setCsUsers] = useState([]);
  const [schedulesList, setSchedulesList] = useState([]);
  const [assignmentsList, setAssignmentsList] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const [allShifts, setAllShifts] = useState([]);

  // Form Schedules State
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedTemplateItemIds, setSelectedTemplateItemIds] = useState([]);
  const [templateFilterInDropdown, setTemplateFilterInDropdown] = useState('all');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [availableShifts, setAvailableShifts] = useState([]); // Filtered by building
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [targetJamMulai, setTargetJamMulai] = useState('');
  const [targetJamSelesai, setTargetJamSelesai] = useState('');

  // Form Assignments State
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [selectedCsId, setSelectedCsId] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedAssignmentShiftId, setSelectedAssignmentShiftId] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState('');

  // Filter States for Master Jadwal (Schedules)
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleBuildingFilter, setScheduleBuildingFilter] = useState('');
  const [scheduleRoomFilter, setScheduleRoomFilter] = useState('');
  const [scheduleShiftFilter, setScheduleShiftFilter] = useState('');
  const [scheduleFreqFilter, setScheduleFreqFilter] = useState('');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('');

  // Filter States for CS Assignments
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentCsFilter, setAssignmentCsFilter] = useState('');
  const [assignmentBuildingFilter, setAssignmentBuildingFilter] = useState('');
  const [assignmentShiftFilter, setAssignmentShiftFilter] = useState('');

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      // Fast Aggregated 1-Request Path (Mengurangi 8 round-trip HTTP menjadi 1)
      const res = await api.get('/schedules/init-data');
      if (res.success && res.data) {
        setSchedulesList(res.data.schedules || []);
        setAssignmentsList(res.data.assignments || []);
        setRooms(res.data.rooms || []);
        setBuildings(res.data.buildings || []);
        setChecklistItems(res.data.checklist_items || []);
        setChecklistTemplates(res.data.checklist_templates || []);
        setAllShifts(res.data.shifts || []);
        setCsUsers(res.data.cs_users || []);
        return;
      }

      // Fallback
      const [roomsRes, usersRes, schedsRes, assignsRes, checklistItemsRes, shiftsRes, buildingsRes, templatesRes] = await Promise.all([
        api.get('/rooms?is_active=true&per_page=1000', { lookup: true }),
        api.get('/users?per_page=1000', { lookup: true }),
        api.get('/schedules?is_active=true&per_page=1000'),
        api.get('/cs-assignments?per_page=1000'),
        api.get('/checklist-items?is_active=true&per_page=1000', { lookup: true }),
        api.get('/shifts?per_page=1000', { lookup: true }),
        api.get('/buildings?is_active=true&per_page=1000', { lookup: true }),
        api.get('/checklist-templates?per_page=100', { lookup: true })
      ]);

      if (roomsRes.success) setRooms(roomsRes.data.data || roomsRes.data || []);
      if (schedsRes.success) setSchedulesList(schedsRes.data.data || schedsRes.data || []);
      if (assignsRes.success) setAssignmentsList(assignsRes.data.data || assignsRes.data || []);
      if (checklistItemsRes.success) setChecklistItems(checklistItemsRes.data.data || checklistItemsRes.data || []);
      if (templatesRes.success) setChecklistTemplates(templatesRes.data.data || templatesRes.data || []);
      if (shiftsRes.success) setAllShifts(shiftsRes.data.data || shiftsRes.data || []);
      if (buildingsRes.success) setBuildings(buildingsRes.data.data || buildingsRes.data || []);

      if (usersRes.success) {
        const allUsers = usersRes.data.data || usersRes.data || [];
        const csList = allUsers.filter(u => u.roles && u.roles.includes('cleaning_service'));
        setCsUsers(csList);
      }
    } catch (err) {
      if (showLoading) setError(err.message || 'Gagal memuat data.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
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

  const formatFrequencyLabel = (freq, dayOfWeek, dayOfMonth) => {
    const f = (freq || 'harian').toLowerCase();
    if (f === 'mingguan' || f === 'weekly') {
      const dayNames = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu', 'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu' };
      const dName = dayNames[dayOfWeek] !== undefined ? dayNames[dayOfWeek] : (dayOfWeek || 'Jumat');
      return `Mingguan (${dName})`;
    }
    if (f === 'bulanan' || f === 'monthly') {
      const dNum = dayOfMonth || 1;
      return `Bulanan (Tgl ${dNum})`;
    }
    return 'Harian';
  };

  const getFrequencyBadgeStyle = (freq) => {
    const f = (freq || 'harian').toLowerCase();
    if (f === 'mingguan' || f === 'weekly') {
      return { background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.3)' };
    }
    if (f === 'bulanan' || f === 'monthly') {
      return { background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
    return { background: 'rgba(14, 49, 146, 0.08)', color: 'var(--primary)', border: '1px solid rgba(14, 49, 146, 0.2)' };
  };

  // Scheduled Room IDs (ruangan yang sudah memiliki jadwal aktif)
  const scheduledRoomIds = useMemo(() => {
    const ids = new Set();
    schedulesList.forEach(s => {
      if (s.is_active) {
        const roomId = s.room_id || s.room?.id;
        if (roomId) ids.add(roomId);
      }
    });
    return ids;
  }, [schedulesList]);

  // Ruangan yang dapat dipilih: seluruh ruangan aktif (mendukung multi-jadwal harian/mingguan/bulanan per ruangan)
  const availableRoomsForSchedule = useMemo(() => {
    return rooms;
  }, [rooms]);

  // When room is selected in Schedule form, filter shifts allocated to its building
  // and auto-select the room's checklist template
  useEffect(() => {
    if (!selectedRoomId) {
      setAvailableShifts([]);
      setSelectedShiftId('');
      return;
    }
    const selectedRoom = rooms.find(r => r.id === selectedRoomId);
    const buildingShifts = selectedRoom?.building?.shifts;
    if (buildingShifts && buildingShifts.length > 0) {
      setAvailableShifts(buildingShifts);
      setSelectedShiftId(buildingShifts[0]?.id || '');
    } else {
      // Fallback: use all shifts
      setAvailableShifts(allShifts);
      setSelectedShiftId(allShifts[0]?.id || '');
    }

    // Auto-select template from room if available
    if (selectedRoom && selectedRoom.checklist_template_id) {
      setSelectedTemplateId(selectedRoom.checklist_template_id);
      const tpl = checklistTemplates.find(t => t.id === selectedRoom.checklist_template_id);
      if (tpl && tpl.items) {
        setSelectedTemplateItemIds(tpl.items.map(i => i.id));
      }
    }
  }, [selectedRoomId, rooms, allShifts, checklistTemplates]);

  const handleOpenScheduleForm = () => {
    setEditingSchedule(null);
    setError(null);

    // Ambil ruangan pertama yang BELUM memiliki jadwal aktif
    const unscheduledRooms = rooms.filter(r => !scheduledRoomIds.has(r.id));
    
    if (unscheduledRooms.length > 0) {
      const firstRoom = unscheduledRooms[0];
      const firstRoomId = firstRoom.id;
      setSelectedRoomId(firstRoomId);
      
      // Set template from first room or fallback to first template
      const tplId = firstRoom.checklist_template_id || checklistTemplates[0]?.id || '';
      setSelectedTemplateId(tplId);
      const tpl = checklistTemplates.find(t => t.id === tplId);
      if (tpl && tpl.items) {
        setSelectedTemplateItemIds(tpl.items.map(i => i.id));
      } else {
        setSelectedTemplateItemIds([]);
      }
    } else {
      setSelectedRoomId('');
      setSelectedTemplateId('');
      setSelectedTemplateItemIds([]);
    }

    setFrequency('daily');
    setDayOfWeek('Monday');
    setDayOfMonth('1');
    setTargetJamMulai('');
    setTargetJamSelesai('');
    setShowScheduleForm(true);
    setShowAssignmentForm(false);
  };

  const handleOpenEditScheduleForm = (schedule) => {
    setEditingSchedule(schedule);
    setError(null);
    const roomId = schedule.room_id || schedule.room?.id || '';
    setSelectedRoomId(roomId);
    setSelectedShiftId(schedule.shift_id || schedule.shift?.id || '');

    // Auto-detect template from room
    const roomObj = rooms.find(r => r.id === roomId) || schedule.room;
    const tplId = roomObj?.checklist_template_id || checklistTemplates[0]?.id || '';
    setSelectedTemplateId(tplId);
    const tpl = checklistTemplates.find(t => t.id === tplId);
    if (tpl && tpl.items) {
      setSelectedTemplateItemIds(tpl.items.map(i => i.id));
    } else {
      setSelectedTemplateItemIds([]);
    }
    
    const rawFreq = (schedule.frequency || schedule.frekuensi || 'daily').toLowerCase();
    let normFreq = 'daily';
    if (rawFreq === 'mingguan' || rawFreq === 'weekly') normFreq = 'weekly';
    else if (rawFreq === 'bulanan' || rawFreq === 'monthly') normFreq = 'monthly';
    setFrequency(normFreq);

    if (schedule.day_of_week) {
      setDayOfWeek(schedule.day_of_week);
    } else if (schedule.hari_minggu !== undefined && schedule.hari_minggu !== null) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setDayOfWeek(days[schedule.hari_minggu] || 'Monday');
    } else {
      setDayOfWeek('Monday');
    }

    setDayOfMonth(String(schedule.day_of_month || schedule.tanggal_bulan || '1'));
    setTargetJamMulai(schedule.target_jam_mulai ? schedule.target_jam_mulai.substring(0, 5) : '');
    setTargetJamSelesai(schedule.target_jam_selesai ? schedule.target_jam_selesai.substring(0, 5) : '');
    setShowScheduleForm(true);
    setShowAssignmentForm(false);
  };

  const handleTemplateChange = (tplId) => {
    setSelectedTemplateId(tplId);
    const tpl = checklistTemplates.find(t => t.id === tplId);
    if (tpl && tpl.items) {
      setSelectedTemplateItemIds(tpl.items.map(i => i.id));
    } else {
      setSelectedTemplateItemIds([]);
    }
  };

  const handleToggleTemplateItemCheckbox = (itemId) => {
    if (selectedTemplateItemIds.includes(itemId)) {
      setSelectedTemplateItemIds(selectedTemplateItemIds.filter(id => id !== itemId));
    } else {
      setSelectedTemplateItemIds([...selectedTemplateItemIds, itemId]);
    }
  };

  const handleOpenAssignmentForm = () => {
    setEditingAssignment(null);
    setSelectedCsId(csUsers[0]?.id || '');
    setSelectedBuildingId(buildings[0]?.id || '');
    setSelectedAssignmentShiftId('');
    setTanggalMulai(new Date().toISOString().split('T')[0]);
    setTanggalSelesai('');
    setShowAssignmentForm(true);
    setShowScheduleForm(false);
  };

  const handleOpenEditAssignmentForm = (assignment) => {
    setEditingAssignment(assignment);
    setSelectedCsId(assignment.cs_user_id || assignment.user_id || assignment.cs_id || '');
    setSelectedBuildingId(assignment.building_id || assignment.building?.id || '');
    setSelectedAssignmentShiftId(assignment.shift_id || assignment.shift?.id || '');
    setTanggalMulai(assignment.tanggal_mulai || new Date().toISOString().split('T')[0]);
    setTanggalSelesai(assignment.tanggal_selesai || '');
    setShowAssignmentForm(true);
    setShowScheduleForm(false);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const frequencyMap = {
      daily: 'harian',
      weekly: 'mingguan',
      monthly: 'bulanan'
    };

    if (!selectedTemplateId) {
      setError('Silakan pilih template checklist terlebih dahulu.');
      return;
    }
    if (selectedTemplateItemIds.length === 0) {
      setError('Pilih minimal satu item checklist dari template untuk diterapkan.');
      return;
    }

    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const applyPayload = {
      room_id: selectedRoomId,
      shift_id: parseInt(selectedShiftId),
      template_id: selectedTemplateId,
      frekuensi: frequencyMap[frequency] || frequency,
      hari_minggu: frequency === 'weekly' ? dayMap[dayOfWeek] : null,
      tanggal_bulan: frequency === 'monthly' ? parseInt(dayOfMonth) : null,
      target_jam_mulai: targetJamMulai ? `${targetJamMulai}:00` : null,
      target_jam_selesai: targetJamSelesai ? `${targetJamSelesai}:00` : null,
      item_ids: selectedTemplateItemIds
    };

    setSavingSchedule(true);
    try {
      const response = await api.post('/schedules/apply-template', applyPayload);
      if (response.success) {
        setSuccessMsg(response.message || 'Jadwal pembersihan dari template checklist berhasil diterapkan!');
        setShowScheduleForm(false);
        setEditingSchedule(null);
        fetchData(false);
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Gagal menerapkan template checklist.');
      }
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const payload = {
      cs_user_id: selectedCsId,
      building_id: selectedBuildingId,
      shift_id: selectedAssignmentShiftId ? parseInt(selectedAssignmentShiftId) : null,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai || null
    };

    try {
      let response;
      if (editingAssignment) {
        response = await api.put(`/cs-assignments/${editingAssignment.id}`, payload);
      } else {
        response = await api.post('/cs-assignments', payload);
      }

      if (response.success) {
        setSuccessMsg(editingAssignment ? 'Penugasan CS berhasil diperbarui.' : 'Petugas CS berhasil ditugaskan ke gedung.');
        setShowAssignmentForm(false);
        setEditingAssignment(null);
        fetchData();
      }
    } catch (err) {
      if (err.errors) {
        setError(Object.values(err.errors).flat().join(' '));
      } else {
        setError(err.message || 'Gagal menyimpan penugasan.');
      }
    }
  };

  const handleDeactivateSchedule = async (id) => {
    if (!(await confirm({
      title: 'Nonaktifkan Jadwal',
      message: 'Apakah Anda yakin ingin menonaktifkan jadwal ini?',
      confirmText: 'Ya, Nonaktifkan',
      cancelText: 'Batal',
      type: 'warning'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/schedules/${id}`);
      if (response.success) {
        setSuccessMsg('Jadwal berhasil dinonaktifkan.');
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menonaktifkan jadwal.');
    }
  };

  const handleDeleteGroupedSchedule = async (groupedItem) => {
    const roomName = groupedItem.room?.name || 'Ruangan ini';
    const shiftName = groupedItem.shift?.name || 'Shift ini';
    if (!(await confirm({
      title: 'Hapus / Nonaktifkan Jadwal Ruangan',
      message: `Apakah Anda yakin ingin menonaktifkan seluruh jadwal (${groupedItem.schedules.length} item) untuk ${roomName} (${shiftName})?`,
      confirmText: 'Ya, Nonaktifkan Semua',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      for (const s of groupedItem.schedules) {
        await api.delete(`/schedules/${s.id}`);
      }
      setSuccessMsg(`Seluruh jadwal untuk ${roomName} (${shiftName}) berhasil dinonaktifkan.`);
      fetchData();
    } catch (err) {
      setError(err.message || 'Gagal menonaktifkan jadwal ruangan.');
      fetchData();
    }
  };

  const handleClearAllSchedules = async () => {
    if (!(await confirm({
      title: 'Hapus Seluruh Master Jadwal',
      message: 'Apakah Anda yakin ingin MENGHAPUS SEMUA master data jadwal pembersihan? Tindakan ini akan mengosongkan seluruh jadwal dan tugas harian yang belum selesai.',
      confirmText: 'Ya, Hapus Semua Jadwal',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete('/schedules/clear-all');
      if (response.success) {
        setSuccessMsg(response.message || 'Seluruh data jadwal berhasil dibersihkan.');
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus seluruh data jadwal.');
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!(await confirm({
      title: 'Hapus Penugasan CS',
      message: 'Apakah Anda yakin ingin menghapus penugasan CS ini?',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    }))) {
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      const response = await api.delete(`/cs-assignments/${id}`);
      if (response.success) {
        setSuccessMsg('Penugasan CS berhasil dihapus.');
        fetchData();
      }
    } catch (err) {
      setError(err.message || 'Gagal menghapus penugasan.');
    }
  };

  // Helper: Normalize Frekuensi (harian/daily, mingguan/weekly, bulanan/monthly)
  const normalizeFreq = (f) => {
    if (!f) return '';
    const str = String(f).toLowerCase().trim();
    if (str === 'daily' || str === 'harian') return 'harian';
    if (str === 'weekly' || str === 'mingguan') return 'mingguan';
    if (str === 'monthly' || str === 'bulanan') return 'bulanan';
    return str;
  };

  // Filtered Master Schedules logic
  const filteredSchedules = schedulesList.filter(s => {
    const roomName = s.room?.name || s.nama_ruangan || s.room_name || '';
    const roomCode = s.room?.code || s.kode_ruangan || '';
    const itemName = s.nama_item || s.checklistItem?.nama_item || s.checklist_item?.nama_item || '';
    const buildingName = s.room?.building?.name || s.nama_gedung || s.building_name || '';
    const buildingId = String(s.room?.building?.id || s.room?.building_id || s.building_id || '');
    const shiftName = s.shift?.name || s.nama_shift || s.kode_shift || '';
    const shiftId = String(s.shift_id || s.shift?.id || '');
    const rawFreq = s.frekuensi || s.frequency || '';
    const isActive = Boolean(s.is_active);

    // 1. Search query matching
    const q = scheduleSearch.toLowerCase().trim();
    const matchesSearch = !q || (
      roomName.toLowerCase().includes(q) ||
      roomCode.toLowerCase().includes(q) ||
      itemName.toLowerCase().includes(q) ||
      buildingName.toLowerCase().includes(q) ||
      shiftName.toLowerCase().includes(q)
    );

    // 2. Building filter
    const matchesBuilding = !scheduleBuildingFilter || buildingId === String(scheduleBuildingFilter);

    // 3. Room filter
    const roomId = String(s.room_id || s.room?.id || '');
    const matchesRoom = !scheduleRoomFilter || roomId === String(scheduleRoomFilter);

    // 4. Shift filter
    const matchesShift = !scheduleShiftFilter || shiftId === String(scheduleShiftFilter);

    // 5. Frequency filter
    const matchesFreq = !scheduleFreqFilter || normalizeFreq(rawFreq) === normalizeFreq(scheduleFreqFilter);

    // 6. Status filter
    const matchesStatus = !scheduleStatusFilter || (
      scheduleStatusFilter === 'active' ? isActive === true : isActive === false
    );

    return matchesSearch && matchesBuilding && matchesRoom && matchesShift && matchesFreq && matchesStatus;
  });

  // Grouped Master Schedules logic (Konsolidasi per Ruangan + Shift + Frekuensi)
  const groupedSchedules = useMemo(() => {
    const map = new Map();
    filteredSchedules.forEach(s => {
      const roomId = s.room_id || s.room?.id || s.nama_ruangan || 'no_room';
      const shiftId = s.shift_id || s.shift?.id || s.nama_shift || 'no_shift';
      const freq = normalizeFreq(s.frekuensi || s.frequency || 'harian');
      const key = `${roomId}_${shiftId}_${freq}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          id: s.id,
          room: s.room,
          shift: s.shift,
          shift_id: s.shift_id,
          frekuensi: s.frekuensi || s.frequency,
          frequency: s.frequency || s.frekuensi,
          day_of_week: s.day_of_week,
          day_of_month: s.day_of_month,
          target_jam_mulai: s.target_jam_mulai,
          target_jam_selesai: s.target_jam_selesai,
          estimasi_durasi_menit: s.estimasi_durasi_menit,
          urutan: s.urutan,
          hari_minggu: s.hari_minggu,
          tanggal_bulan: s.tanggal_bulan,
          is_active: Boolean(s.is_active),
          items: [],
          schedules: []
        });
      }
      const entry = map.get(key);
      entry.schedules.push(s);
      if (s.target_jam_mulai && !entry.target_jam_mulai) {
        entry.target_jam_mulai = s.target_jam_mulai;
        entry.target_jam_selesai = s.target_jam_selesai;
      }
      const itemName = s.nama_item || s.checklistItem?.nama_item || s.checklist_item?.nama_item || '';
      if (itemName && !entry.items.includes(itemName)) {
        entry.items.push(itemName);
      }
      if (s.is_active) {
        entry.is_active = true;
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.target_jam_mulai || '99:99';
      const timeB = b.target_jam_mulai || '99:99';
      return timeA.localeCompare(timeB);
    });
  }, [filteredSchedules]);

  const hasActiveScheduleFilter = scheduleSearch !== '' || 
    scheduleBuildingFilter !== '' || 
    scheduleRoomFilter !== '' || 
    scheduleShiftFilter !== '' || 
    scheduleFreqFilter !== '' || 
    scheduleStatusFilter !== '';

  const handleResetScheduleFilters = () => {
    setScheduleSearch('');
    setScheduleBuildingFilter('');
    setScheduleRoomFilter('');
    setScheduleShiftFilter('');
    setScheduleFreqFilter('');
    setScheduleStatusFilter('');
  };

  // Rooms dropdown filtered by selected building
  const filterRoomsList = scheduleBuildingFilter 
    ? rooms.filter(r => (String(r.building_id || r.building?.id || '') === String(scheduleBuildingFilter)))
    : rooms;

  // Filtered CS Assignments logic
  const filteredAssignments = assignmentsList.filter(a => {
    const csName = a.cs_name || a.user?.name || '';
    const buildingName = a.nama_gedung || a.building?.name || '';
    const buildingId = String(a.building_id || a.building?.id || '');
    const shiftName = a.nama_shift || a.shift?.name || '';
    const shiftId = String(a.shift_id || a.shift?.id || '');
    const userId = String(a.cs_user_id || a.user_id || a.cs_id || a.user?.id || '');

    const q = assignmentSearch.toLowerCase().trim();
    const matchesSearch = !q || (
      csName.toLowerCase().includes(q) ||
      buildingName.toLowerCase().includes(q) ||
      shiftName.toLowerCase().includes(q)
    );

    const matchesCs = !assignmentCsFilter || userId === String(assignmentCsFilter);
    const matchesBuilding = !assignmentBuildingFilter || buildingId === String(assignmentBuildingFilter);
    const matchesShift = !assignmentShiftFilter || (
      assignmentShiftFilter === '__all_shifts__' ? (!shiftId || shiftId === 'null') : shiftId === String(assignmentShiftFilter)
    );

    return matchesSearch && matchesCs && matchesBuilding && matchesShift;
  });

  const hasActiveAssignmentFilter = assignmentSearch !== '' || 
    assignmentCsFilter !== '' || 
    assignmentBuildingFilter !== '' || 
    assignmentShiftFilter !== '';

  const handleResetAssignmentFilters = () => {
    setAssignmentSearch('');
    setAssignmentCsFilter('');
    setAssignmentBuildingFilter('');
    setAssignmentShiftFilter('');
  };

  return (
    <div>
      <div className="flex-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 700 }}>Jadwal & Penugasan CS</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manajemen frekuensi pembersihan ruangan dan pembagian tugas harian staf CS</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button 
          className={`btn ${activeSubTab === 'schedules' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveSubTab('schedules'); setShowScheduleForm(false); setShowAssignmentForm(false); setError(null); setSuccessMsg(null); }}
        >
          <Clock size={16} /> Master Jadwal
        </button>
        <button 
          className={`btn ${activeSubTab === 'assignments' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveSubTab('assignments'); setShowScheduleForm(false); setShowAssignmentForm(false); setError(null); setSuccessMsg(null); }}
        >
          <Calendar size={16} /> Penugasan Harian CS
        </button>
      </div>

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

      {/* CREATE / EDIT SCHEDULE FORM (Floating Pop-up) */}
      {showScheduleForm && activeSubTab === 'schedules' && (
        <div className="modal-backdrop" onClick={() => setShowScheduleForm(false)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '620px', width: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {editingSchedule ? 'Perbarui Jadwal' : 'Jadwal Pembersihan'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingSchedule ? 'Edit Jadwal Pembersihan' : 'Buat Jadwal Pembersihan Baru'}
                </h2>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowScheduleForm(false)}
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="alert alert-danger" style={{ margin: '0 0 16px 0' }}>
                <ShieldAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            {availableRoomsForSchedule.length === 0 && !editingSchedule && (
              <div style={{ background: 'rgba(15, 118, 110, 0.08)', border: '1px solid rgba(15, 118, 110, 0.25)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', color: 'var(--success)', display: 'flex', alignItems: 'flex-start', gap: '12px', margin: '0 0 16px 0' }}>
                <Check size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Semua Ruangan Sudah Memiliki Jadwal!</div>
                  <div style={{ fontSize: '0.82rem', marginTop: '3px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    Seluruh ruangan aktif sudah memiliki jadwal pembersihan. Untuk mengubah template, shift, atau SOP ruangan yang sudah ada, silakan gunakan tombol <strong>Edit</strong> pada tabel jadwal.
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSchedule}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                <div className="grid-2-cols" style={{ gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Pilih Ruangan *</label>
                      {!editingSchedule && availableRoomsForSchedule.length > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                          {availableRoomsForSchedule.length} belum dijadwalkan
                        </span>
                      )}
                    </div>
                    <select 
                      className="form-control form-select"
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      required
                      disabled={availableRoomsForSchedule.length === 0}
                    >
                      {availableRoomsForSchedule.length === 0 ? (
                        <option value="" disabled>Semua ruangan sudah memiliki jadwal</option>
                      ) : (
                        <>
                          <option value="" disabled>Pilih Ruangan</option>
                          {availableRoomsForSchedule.map(r => (
                            <option key={r.id} value={r.id}>{r.name} ({r.code}) - {r.building?.name}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Pilih Shift Kerja *</label>
                    <select 
                      className="form-control form-select"
                      value={selectedShiftId}
                      onChange={(e) => setSelectedShiftId(e.target.value)}
                      required
                      disabled={availableShifts.length === 0}
                    >
                      {availableShifts.length === 0 ? (
                        <option value="">Pilih ruangan terlebih dahulu</option>
                      ) : (
                        availableShifts.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.start_time.substring(0,5)} - {s.end_time.substring(0,5)})</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* PILIHAN TEMPLATE CHECKLIST & ITEM PREVIEW */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(14, 49, 146, 0.03)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(14, 49, 146, 0.1)' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>Template Checklist Standar *</label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Otomatis terhubung dengan profil ruangan
                      </span>
                    </div>
                    <select
                      className="form-control form-select"
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      required
                    >
                      <option value="" disabled>Pilih Template</option>
                      {checklistTemplates.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nama_template} ({t.items?.length || 0} item SOP)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preview Daftar Item di dalam Template */}
                  {(() => {
                    const tpl = checklistTemplates.find(t => t.id === selectedTemplateId);
                    if (!tpl || !tpl.items || tpl.items.length === 0) {
                      return (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                          {checklistTemplates.length === 0 ? 'Belum ada template checklist. Buat template terlebih dahulu di menu Template Checklist.' : 'Pilih template untuk melihat daftar item SOP kebersihan.'}
                        </div>
                      );
                    }
                    return (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Item checklist yang akan dijadwalkan ({selectedTemplateItemIds.length}/{tpl.items.length} aktif):
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedTemplateItemIds.length === tpl.items.length) {
                                setSelectedTemplateItemIds([]);
                              } else {
                                setSelectedTemplateItemIds(tpl.items.map(i => i.id));
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            {selectedTemplateItemIds.length === tpl.items.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '170px', overflowY: 'auto', background: '#ffffff', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                          {tpl.items.map(item => (
                            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={selectedTemplateItemIds.includes(item.id)}
                                onChange={() => handleToggleTemplateItemCheckbox(item.id)}
                                style={{ accentColor: 'var(--primary)' }}
                              />
                              <span>{item.nama_item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid-2-cols" style={{ gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Frekuensi Pembersihan *</label>
                    <select 
                      className="form-control form-select"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      required
                    >
                      {FREQUENCIES.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {frequency === 'weekly' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Hari dalam Seminggu *</label>
                      <select 
                        className="form-control form-select"
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(e.target.value)}
                        required
                      >
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {frequency === 'monthly' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700 }}>Tanggal dalam Sebulan (1-31) *</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(e.target.value)}
                        min="1"
                        max="31"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* TARGET WAKTU / RUNDOWN DISIPLIN */}
                <div style={{ background: 'rgba(14, 49, 146, 0.03)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(14, 49, 146, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} style={{ color: 'var(--primary)' }} /> Target Jam Pengerjaan (Rundown CS)
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Opsional • Panduan Disiplin CS
                    </span>
                  </div>

                  <div className="grid-2-cols" style={{ gap: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Jam Mulai</label>
                      <input 
                        type="time" 
                        className="form-control" 
                        value={targetJamMulai} 
                        onChange={(e) => setTargetJamMulai(e.target.value)} 
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Jam Selesai</label>
                      <input 
                        type="time" 
                        className="form-control" 
                        value={targetJamSelesai} 
                        onChange={(e) => setTargetJamSelesai(e.target.value)} 
                      />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '6px', display: 'block' }}>
                    Jam ini akan tampil sebagai target waktu pengerjaan di akun CS agar alur pembersihan teratur.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowScheduleForm(false)}>
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={
                    savingSchedule ||
                    availableRoomsForSchedule.length === 0 ||
                    availableShifts.length === 0 || 
                    !selectedTemplateId || 
                    selectedTemplateItemIds.length === 0
                  } 
                  style={{ fontWeight: 700, minWidth: '150px' }}
                >
                  {savingSchedule ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                      <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                      <span>Menyimpan...</span>
                    </div>
                  ) : (
                    editingSchedule ? 'Simpan Perubahan' : 'Simpan Jadwal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ASSIGNMENT FORM (Floating Pop-up) */}
      {showAssignmentForm && activeSubTab === 'assignments' && (
        <div className="modal-backdrop" onClick={() => setShowAssignmentForm(false)}>
          <div 
            className="glass-panel" 
            style={{ maxWidth: '620px', width: '92vw', maxHeight: '88vh', overflowY: 'auto', padding: '28px', borderRadius: 'var(--radius-2xl)', background: '#ffffff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {editingAssignment ? 'Perbarui Penugasan' : 'Penugasan Lokasi'}
                </span>
                <h2 className="modal-title" style={{ marginTop: '2px' }}>
                  {editingAssignment ? 'Edit Penugasan Staf CS' : 'Tugaskan Staf Cleaning Service'}
                </h2>
              </div>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setShowAssignmentForm(false)}
                title="Tutup formulir"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="grid-2-cols" style={{ gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Petugas CS *</label>
                    <select 
                      className="form-control form-select"
                      value={selectedCsId}
                      onChange={(e) => setSelectedCsId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Pilih Petugas CS</option>
                      {csUsers.map(cs => (
                        <option key={cs.id} value={cs.id}>{cs.name} ({cs.email})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Pilih Gedung *</label>
                    <select 
                      className="form-control form-select"
                      value={selectedBuildingId}
                      onChange={(e) => setSelectedBuildingId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Pilih Gedung</option>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.nama_gedung || b.name} ({b.kode_gedung || b.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Pilih Shift Kerja (Opsional)</label>
                  <select 
                    className="form-control form-select"
                    value={selectedAssignmentShiftId}
                    onChange={(e) => setSelectedAssignmentShiftId(e.target.value)}
                  >
                    <option value="">Semua Shift (Otomatis)</option>
                    {allShifts.map(s => (
                      <option key={s.id} value={s.id}>{s.nama_shift || s.name} ({s.jam_mulai ? s.jam_mulai.substring(0, 5) : s.start_time.substring(0, 5)} - {s.jam_selesai ? s.jam_selesai.substring(0, 5) : s.end_time.substring(0, 5)})</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2-cols" style={{ gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Tanggal Mulai *</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={tanggalMulai}
                      onChange={(e) => setTanggalMulai(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Tanggal Selesai (Opsional)</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      min={tanggalMulai}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignmentForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={buildings.length === 0 || csUsers.length === 0} style={{ fontWeight: 700 }}>
                  {editingAssignment ? 'Simpan Perubahan' : 'Simpan Penugasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER SCHEDULES VIEW */}
      {activeSubTab === 'schedules' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Daftar Jadwal Induk (Schedules)</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Atur jadwal kebersihan rutin per ruangan, shift kerja, dan frekuensi.
              </div>
            </div>

            {!showScheduleForm && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {schedulesList.length > 0 && (
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={handleClearAllSchedules}
                    title="Hapus / Reset semua data master jadwal"
                    style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Trash2 size={13} /> Kosongkan Semua Jadwal
                  </button>
                )}

                <button className="btn btn-primary btn-sm" onClick={handleOpenScheduleForm}>
                  <Plus size={14} /> Buat Jadwal Baru
                </button>
              </div>
            )}
          </div>

          {/* FILTER PANEL: MASTER JADWAL */}
          {!showScheduleForm && (
            <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                
                {/* Search Bar */}
                <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Search size={12} /> Cari Jadwal
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ruangan / Item / Shift..."
                      value={scheduleSearch}
                      onChange={(e) => setScheduleSearch(e.target.value)}
                      style={{ height: '38px', fontSize: '0.86rem', paddingLeft: '32px' }}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Filter Gedung */}
                <div style={{ flex: '1 1 160px', minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Gedung</label>
                  <select
                    className="form-control form-select"
                    value={scheduleBuildingFilter}
                    onChange={(e) => {
                      setScheduleBuildingFilter(e.target.value);
                      setScheduleRoomFilter('');
                    }}
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  >
                    <option value="">Semua Gedung</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>

                {/* Filter Ruangan */}
                <div style={{ flex: '1 1 160px', minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Ruangan</label>
                  <select
                    className="form-control form-select"
                    value={scheduleRoomFilter}
                    onChange={(e) => setScheduleRoomFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  >
                    <option value="">Semua Ruangan</option>
                    {filterRoomsList.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                    ))}
                  </select>
                </div>

                {/* Filter Shift */}
                <div style={{ flex: '1 1 170px', minWidth: '160px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Shift Kerja</label>
                  <select
                    className="form-control form-select"
                    value={scheduleShiftFilter}
                    onChange={(e) => setScheduleShiftFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  >
                    <option value="">Semua Shift</option>
                    {allShifts.map(s => (
                      <option key={s.id} value={s.id}>{s.nama_shift || s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Frekuensi */}
                <div style={{ flex: '1 1 160px', minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Frekuensi</label>
                  <select
                    className="form-control form-select"
                    value={scheduleFreqFilter}
                    onChange={(e) => setScheduleFreqFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  >
                    <option value="">Semua Frekuensi</option>
                    <option value="harian">Harian</option>
                    <option value="mingguan">Mingguan</option>
                    <option value="bulanan">Bulanan</option>
                  </select>
                </div>

                {/* Filter Status */}
                <div style={{ flex: '1 1 150px', minWidth: '140px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Status</label>
                  <select
                    className="form-control form-select"
                    value={scheduleStatusFilter}
                    onChange={(e) => setScheduleStatusFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  >
                    <option value="">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Non-aktif</option>
                  </select>
                </div>

                {/* Reset & Counter */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '1px' }}>
                  {hasActiveScheduleFilter && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleResetScheduleFilters}
                      style={{ height: '36px', whiteSpace: 'nowrap' }}
                      title="Reset semua filter jadwal"
                    >
                      <X size={13} /> Reset
                    </button>
                  )}
                  <div style={{
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: hasActiveScheduleFilter ? 'rgba(14, 49, 146, 0.08)' : 'rgba(0,0,0,0.03)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: hasActiveScheduleFilter ? 'var(--primary)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    gap: '6px'
                  }}>
                    <span style={{
                      minWidth: '20px', height: '20px', borderRadius: '50%',
                      background: hasActiveScheduleFilter ? 'var(--primary)' : 'var(--text-muted)',
                      color: 'white', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, padding: '0 5px'
                    }}>{groupedSchedules.length}</span>
                    <span>Ruangan Terjadwal</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ruangan</th>
                    <th>Item Checklist</th>
                    <th>Gedung</th>
                    <th>Shift Kerja</th>
                    <th>Target Jam (Rundown)</th>
                    <th>Frekuensi</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedSchedules.map(g => (
                    <tr key={g.key}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{g.room?.name || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kode: {g.room?.code || '-'}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--primary)',
                              background: 'rgba(14, 49, 146, 0.08)',
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              {g.items.length} Item Checklist
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4', maxWidth: '300px' }}>
                            {g.items.join(', ')}
                          </div>
                        </div>
                      </td>
                      <td>{g.room?.building?.name || '-'}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong>{g.shift?.name || g.nama_shift || '-'}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {g.shift?.start_time ? `(${g.shift.start_time.substring(0,5)} - ${g.shift.end_time ? g.shift.end_time.substring(0,5) : ''})` : ''}
                          </span>
                        </span>
                      </td>
                      <td>
                        {g.target_jam_mulai && g.target_jam_selesai ? (
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            background: 'rgba(14, 49, 146, 0.08)',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 700
                          }}>
                            <Clock size={12} /> {g.target_jam_mulai} - {g.target_jam_selesai} WIB
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sesuai Shift</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          ...getFrequencyBadgeStyle(g.frekuensi || g.frequency)
                        }}>
                          {formatFrequencyLabel(g.frekuensi || g.frequency, g.hari_minggu || g.day_of_week, g.tanggal_bulan || g.day_of_month)}
                        </span>
                      </td>
                      <td>
                        <span className={`role-badge ${g.is_active ? 'role-cs' : 'role-admin'}`}>
                          {g.is_active ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditScheduleForm(g.schedules[0])}
                            style={{ padding: '6px' }}
                            title="Edit Jadwal Ruangan"
                            aria-label={`Edit jadwal untuk ruangan ${g.room?.name || ''}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          {g.is_active && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDeleteGroupedSchedule(g)}
                              style={{ color: 'var(--danger)', padding: '6px' }}
                              title="Nonaktifkan Seluruh Jadwal Ruangan Ini"
                              aria-label={`Nonaktifkan seluruh jadwal untuk ruangan ${g.room?.name || ''}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {groupedSchedules.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 20px' }}>
                        {hasActiveScheduleFilter ? (
                          <div>
                            <Search size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Tidak ada jadwal pembersihan yang sesuai dengan filter.</div>
                            <button className="btn btn-secondary btn-sm" onClick={handleResetScheduleFilters}>
                              <X size={13} /> Reset Filter
                            </button>
                          </div>
                        ) : (
                          <div>
                            <Clock size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
                            <div style={{ fontWeight: 600 }}>Belum ada jadwal pembersihan yang dibuat.</div>
                            <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Klik tombol <strong>+ Buat Jadwal Baru</strong> di atas untuk membuat jadwal.</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DAILY CS ASSIGNMENTS VIEW */}
      {activeSubTab === 'assignments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Tugas Cleaning Service Harian</h2>
            {!showAssignmentForm && (
              <button className="btn btn-primary btn-sm" onClick={handleOpenAssignmentForm}>
                <Plus size={14} /> Tugaskan CS
              </button>
            )}
          </div>

          {/* FILTER PANEL: PENUGASAN CS */}
          {!showAssignmentForm && (
            <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                
                {/* Search Bar */}
                <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Search size={12} /> Cari Penugasan
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nama Petugas / Gedung / Shift..."
                      value={assignmentSearch}
                      onChange={(e) => setAssignmentSearch(e.target.value)}
                      style={{ height: '38px', fontSize: '0.86rem', paddingLeft: '32px' }}
                    />
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                {/* Filter Petugas CS */}
                <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Petugas CS</label>
                  <select
                    className="form-control form-select"
                    value={assignmentCsFilter}
                    onChange={(e) => setAssignmentCsFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  >
                    <option value="">Semua Petugas CS</option>
                    {csUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Gedung */}
                <div style={{ flex: '1 1 160px', minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Gedung</label>
                  <select
                    className="form-control form-select"
                    value={assignmentBuildingFilter}
                    onChange={(e) => setAssignmentBuildingFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  >
                    <option value="">Semua Gedung</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>

                {/* Filter Shift */}
                <div style={{ flex: '1 1 180px', minWidth: '170px' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '5px', display: 'block' }}>Shift Kerja</label>
                  <select
                    className="form-control form-select"
                    value={assignmentShiftFilter}
                    onChange={(e) => setAssignmentShiftFilter(e.target.value)}
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  >
                    <option value="">Semua Shift</option>
                    <option value="__all_shifts__">Otomatis (Semua Shift)</option>
                    {allShifts.map(s => (
                      <option key={s.id} value={s.id}>{s.nama_shift || s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Reset & Counter */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '1px' }}>
                  {hasActiveAssignmentFilter && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleResetAssignmentFilters}
                      style={{ height: '36px', whiteSpace: 'nowrap' }}
                      title="Reset semua filter penugasan"
                    >
                      <X size={13} /> Reset
                    </button>
                  )}
                  <div style={{
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    background: hasActiveAssignmentFilter ? 'rgba(14, 49, 146, 0.08)' : 'rgba(0,0,0,0.03)',
                    borderRadius: 'var(--radius-lg)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: hasActiveAssignmentFilter ? 'var(--primary)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    gap: '6px'
                  }}>
                    <span style={{
                      minWidth: '20px', height: '20px', borderRadius: '50%',
                      background: hasActiveAssignmentFilter ? 'var(--primary)' : 'var(--text-muted)',
                      color: 'white', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, padding: '0 5px'
                    }}>{filteredAssignments.length}</span>
                    <span>Penugasan</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tanggal Kerja</th>
                    <th>Nama Petugas CS</th>
                    <th>Gedung</th>
                    <th>Shift Kerja</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>
                        {a.tanggal_mulai} {a.tanggal_selesai ? `s/d ${a.tanggal_selesai}` : '(Seterusnya)'}
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                            {a.cs_name ? a.cs_name[0] : 'U'}
                          </span>
                          <strong>{a.cs_name}</strong>
                        </span>
                      </td>
                      <td>{a.nama_gedung || '-'}</td>
                      <td>
                        <span style={{ display: 'inline-flex', background: a.nama_shift ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: a.nama_shift ? '#3b82f6' : '#10b981', border: a.nama_shift ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                          {a.nama_shift || 'Semua Shift (Otomatis)'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditAssignmentForm(a)}
                            style={{ padding: '6px' }}
                            title="Edit Penugasan CS"
                            aria-label={`Edit penugasan CS ${a.cs_name}`}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDeleteAssignment(a.id)}
                            style={{ color: 'var(--danger)', padding: '6px' }}
                            title="Hapus Penugasan"
                            aria-label={`Hapus penugasan CS ${a.cs_name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAssignments.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 20px' }}>
                        {hasActiveAssignmentFilter ? (
                          <div>
                            <Search size={28} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Tidak ada penugasan CS yang sesuai dengan filter.</div>
                            <button className="btn btn-secondary btn-sm" onClick={handleResetAssignmentFilters}>
                              <X size={13} /> Reset Filter
                            </button>
                          </div>
                        ) : (
                          'Belum ada penugasan CS aktif. Hubungkan petugas CS dengan gedung di atas.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
