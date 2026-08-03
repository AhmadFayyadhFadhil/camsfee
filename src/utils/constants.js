// System Constants for CAMS Frontend (Matching seeded values in DB)

export const ROLES = [
  { id: 1, name: 'admin', label: 'Admin / Administrator' },
  { id: 2, name: 'supervisor', label: 'Supervisor' },
  { id: 4, name: 'cleaning_service', label: 'Cleaning Service (CS)' },
  { id: 3, name: 'pic', label: 'PIC (Person In Charge)' },
  { id: 5, name: 'guest', label: 'Guest' },
];

export const SHIFTS = [
  { id: 1, name: 'Shift 1', time: '06:00 - 14:00' },
  { id: 2, name: 'Shift 2', time: '14:00 - 22:00' },
  { id: 3, name: 'Shift 3', time: '22:00 - 06:00' },
  { id: 4, name: 'Shift Normal', time: '07:30 - 16:30' },
];

export const FREQUENCIES = [
  { value: 'daily', label: 'Harian (Daily)' },
  { value: 'weekly', label: 'Mingguan (Weekly)' },
  { value: 'monthly', label: 'Bulanan (Monthly)' },
];

export const DAYS_OF_WEEK = [
  { value: 'Monday', label: 'Senin' },
  { value: 'Tuesday', label: 'Selasa' },
  { value: 'Wednesday', label: 'Rabu' },
  { value: 'Thursday', label: 'Kamis' },
  { value: 'Friday', label: 'Jumat' },
  { value: 'Saturday', label: 'Sabtu' },
  { value: 'Sunday', label: 'Minggu' },
];

export const FINDING_STATUSES = [
  { value: 'open', label: 'Terbuka (Open)' },
  { value: 'in_progress', label: 'Sedang Diperbaiki (In Progress)' },
  { value: 'resolved', label: 'Selesai (Resolved)' },
];
