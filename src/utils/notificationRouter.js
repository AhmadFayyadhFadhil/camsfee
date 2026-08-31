/**
 * notificationRouter.js
 * Utilitas untuk menentukan modul tujuan (tab) saat notifikasi diklik.
 */

export function resolveNotificationTarget(notif, userRoles = []) {
  if (!notif) return 'dashboard';

  const type = (notif.type || '').toUpperCase();
  const title = (notif.title || '').toLowerCase();
  const msg = (notif.message || '').toLowerCase();
  const data = notif.data || {};

  const roles = Array.isArray(userRoles) ? userRoles.map(r => String(r).toLowerCase()) : [];
  const isCs = roles.includes('cleaning_service') || roles.includes('cs') || roles.includes('ob');
  const isSupervisorOrAdmin = roles.includes('supervisor') || roles.includes('admin') || roles.includes('manager');

  // 1. Tugas Khusus, Ad-hoc, & Jadwal Acara / Meeting
  if (
    type.includes('ADHOC') ||
    title.includes('persiapan') ||
    title.includes('meeting') ||
    title.includes('acara') ||
    title.includes('tugas mendadak') ||
    title.includes('tugas khusus') ||
    data.adhoc_task_id
  ) {
    return isCs ? 'cs_adhoc' : 'adhoc_tasks';
  }

  // 2. Audit Fisik Aset Ruangan
  if (
    type.includes('ROOM_ASSET') ||
    type.includes('AUDIT') ||
    title.includes('audit aset') ||
    title.includes('aset ruangan') ||
    data.audit_id ||
    data.room_asset_audit_id
  ) {
    return 'room_assets';
  }

  // 3. Temuan Kerusakan & Fasilitas (Findings)
  if (
    type.includes('FINDING') ||
    title.includes('temuan') ||
    title.includes('kerusakan') ||
    title.includes('eskalasi') ||
    data.finding_id
  ) {
    return 'findings';
  }

  // 4. Verifikasi Laporan Kebersihan / Submissions
  if (
    type.includes('SUBMISSION') ||
    type.includes('VERIF') ||
    title.includes('laporan disetujui') ||
    title.includes('laporan ditolak') ||
    title.includes('verifikasi laporan') ||
    title.includes('laporan kebersihan') ||
    title.includes('submission') ||
    data.submission_id
  ) {
    if (isCs) return 'tasks';
    return 'verifications';
  }

  // 5. Tugas Rutin Harian CS / Jadwal Shift
  if (
    type.includes('TASK') ||
    title.includes('tugas harian') ||
    title.includes('jadwal') ||
    title.includes('pengingat') ||
    title.includes('tenggat')
  ) {
    if (isCs) return 'tasks';
    return isSupervisorOrAdmin ? 'schedules' : 'dashboard';
  }

  // Fallback
  return isCs ? 'tasks' : 'dashboard';
}

export function getNotificationModuleLabel(targetTab) {
  switch (targetTab) {
    case 'tasks': return 'Tugas Rutin Harian';
    case 'cs_adhoc': return 'Tugas Khusus & Acara';
    case 'adhoc_tasks': return 'Tugas Khusus & Acara';
    case 'verifications': return 'Verifikasi Laporan';
    case 'findings': return 'Temuan Kerusakan';
    case 'room_assets': return 'Aset Ruangan';
    case 'schedules': return 'Jadwal & Penugasan';
    default: return 'Dashboard';
  }
}
