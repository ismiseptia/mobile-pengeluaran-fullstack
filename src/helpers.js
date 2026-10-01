export function validate(judul, nominal) {
  if (!judul.trim()) return 'Judul wajib diisi';
  if (judul.trim().length > 100) return 'Judul maksimal 100 karakter';
  if (!/^\d+$/.test(nominal)) return 'Nominal harus berupa angka rupiah utuh';
  const nilai = Number(nominal);
  if (!Number.isInteger(nilai) || nilai < 1 || nilai > 2147483647) {
    return 'Nominal harus 1 sampai 2147483647';
  }
  return '';
}

export const rupiah = (nilai) =>
  `Rp ${String(Number(nilai)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export function tanggalLokal(value) {
  if (!value) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.split('-').reverse().join('/');
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return [d.getDate(), d.getMonth() + 1, d.getFullYear()].join('/');
}