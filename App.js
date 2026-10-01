import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, BackHandler, FlatList,
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api } from './src/api';
import { rupiah, tanggalLokal, validate } from './src/helpers';

function Tombol({ title, onPress, disabled = false }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled}
      onPress={onPress} style={[s.button, disabled && s.disabled]}>
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}

export default function App() {
  return <SafeAreaProvider><Utama /></SafeAreaProvider>;
}

function Utama() {
  const [screen, setScreen] = useState('list');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [judul, setJudul] = useState('');
  const [nominal, setNominal] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const lock = useRef(false);

  async function load() {
    if (lock.current) return;
    lock.current = true; setLoading(true); setError('');
    try {
      const rows = await api.list();
      if (!Array.isArray(rows)) throw new Error('Daftar harus berupa array');
      setItems(rows);
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function back() {
    if (lock.current) return;
    setError('');
    setScreen(screen === 'edit' ? 'detail' : 'list');
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'list' && !lock.current) return false;
      back(); return true;
    });
    return () => sub.remove();
  }, [screen]);

  async function openDetail(id) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      setSelected(await api.detail(id)); setScreen('detail');
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  }

  async function openCreate() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const rows = await api.categories();
      if (!Array.isArray(rows)) throw new Error('Kategori harus berupa array');
      setCategories(rows); setJudul(''); setNominal('');
      setCategoryId(null); setScreen('create');
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  }

  function openEdit() {
    setJudul(selected.judul); setNominal(String(selected.nominal));
    setError(''); setScreen('edit');
  }

  async function save() {
    if (lock.current) return;
    const pesan = validate(judul, nominal);
    if (pesan) { setError(pesan); return; }
    lock.current = true; setBusy(true); setError('');
    let saved = false;
    try {
      const body = { judul: judul.trim(), nominal: Number(nominal) };
      if (screen === 'create') {
        await api.create({ ...body, id_kategori: categoryId });
      } else {
        await api.update(selected.id, body);
      }
      saved = true;
      setItems([]); setScreen('list'); setSelected(null);
      const rows = await api.list();
      if (!Array.isArray(rows)) throw new Error('Daftar harus berupa array');
      setItems(rows);
    } catch (e) {
      setError(saved ? `Data tersimpan. Muat ulang daftar: ${e.message}`
        : `${e.message}. Jika koneksi putus, cek daftar sebelum mengulang.`);
    } finally { lock.current = false; setBusy(false); }
  }

  async function remove() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    let deleted = false;
    try {
      await api.remove(selected.id); deleted = true;
      setItems([]); setSelected(null); setScreen('list');
      const rows = await api.list();
      if (!Array.isArray(rows)) throw new Error('Daftar harus berupa array');
      setItems(rows);
    } catch (e) {
      setError(deleted ? `Data terhapus. Muat ulang daftar: ${e.message}`
        : e.message);
    } finally { lock.current = false; setBusy(false); }
  }

  function confirmDelete() {
    Alert.alert('Hapus pengeluaran', `Hapus ${selected.judul}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: remove },
    ]);
  }

  const disabled = loading || busy;
  const titles = {
    list: 'Pengeluaran', create: 'Tambah pengeluaran',
    detail: 'Detail pengeluaran', edit: 'Ubah pengeluaran'
  };

  return (
    <SafeAreaView style={s.page}>
      <KeyboardAvoidingView style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Text style={s.heading}>{titles[screen]}</Text>
        {screen !== 'list' && <Tombol title="Kembali"
          onPress={back} disabled={disabled} />}
        {!!error && <Text accessibilityRole="alert" style={s.error}>
          {error}</Text>}
        {disabled && <ActivityIndicator accessibilityLabel="Memuat data" />}

        {screen === 'list' && <>
          <Tombol title="Tambah pengeluaran" onPress={openCreate}
            disabled={disabled} />
          <Tombol title="Muat ulang" onPress={load} disabled={disabled} />
          <FlatList data={items} keyExtractor={(item) => String(item.id)}
            refreshing={loading} onRefresh={load}
            ListEmptyComponent={!disabled && !error
              ? <Text>Belum ada pengeluaran.</Text> : null}
            renderItem={({ item }) => (
              <Pressable style={s.card} accessibilityRole="button"
                disabled={disabled} onPress={() => openDetail(item.id)}>
                <Text style={s.cardTitle}>{item.judul}</Text>
                <Text>{rupiah(item.nominal)}</Text>
                <Text>{item.kategori || 'Tanpa kategori'}</Text>
                <Text>{tanggalLokal(item.tanggal)}</Text>
                <Text>Lihat detail</Text>
              </Pressable>
            )} />
        </>}

        {screen === 'detail' && selected && <ScrollView>
          <View style={s.card}>
            <Text style={s.cardTitle}>{selected.judul}</Text>
            <Text>{rupiah(selected.nominal)}</Text>
            <Text>Tanggal: {tanggalLokal(selected.tanggal)}</Text>
            <Text>ID kategori: {selected.id_kategori ?? 'Tanpa kategori'}</Text>
            <Text>Catatan: {selected.catatan || 'Belum ada catatan'}</Text>
          </View>
          <Text>Kategori, tanggal, dan catatan hanya dibaca.</Text>
          <Tombol title="Ubah" onPress={openEdit} disabled={disabled} />
          <Tombol title="Hapus" onPress={confirmDelete} disabled={disabled} />
        </ScrollView>}

        {(screen === 'create' || screen === 'edit') && <ScrollView
          keyboardShouldPersistTaps="handled">
          <Text style={s.label}>Judul</Text>
          <TextInput style={s.input} value={judul} onChangeText={setJudul}
            accessibilityLabel="Judul" editable={!busy} maxLength={100}
            placeholder="Contoh: Makan siang" />
          <Text style={s.label}>Nominal rupiah</Text>
          <TextInput style={s.input} value={nominal}
            onChangeText={setNominal} keyboardType="number-pad"
            accessibilityLabel="Nominal rupiah" editable={!busy}
            placeholder="Contoh: 20000" />
          {screen === 'create' ? <>
            <Text style={s.label}>Kategori opsional</Text>
            {[{ id: null, nama: 'Tanpa kategori' }, ...categories].map((k) => (
              <Pressable key={String(k.id)} accessibilityRole="radio"
                accessibilityState={{ checked: categoryId === k.id }}
                disabled={busy} onPress={() => setCategoryId(k.id)}
                style={[s.choice, categoryId === k.id && s.chosen]}>
                <Text>{categoryId === k.id ? '(x) ' : '( ) '}{k.nama}</Text>
              </Pressable>
            ))}
            <Text>Tanggal diisi otomatis oleh server.</Text>
          </> : <Text>API ubah hanya menerima judul dan nominal.</Text>}
          <Tombol title={busy ? 'Menyimpan...' : 'Simpan'}
            onPress={save} disabled={disabled} />
        </ScrollView>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  heading: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  button: {
    backgroundColor: '#0F766E', padding: 12, minHeight: 48,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    marginVertical: 6
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  card: {
    padding: 16, backgroundColor: '#FFFFFF', borderRadius: 8,
    borderWidth: 1, borderColor: '#CBD5E1', marginVertical: 8, gap: 8
  },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  label: { fontSize: 16, marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#647488', borderRadius: 8,
    padding: 12, fontSize: 16, backgroundColor: '#FFFFFF'
  },
  choice: {
    padding: 12, minHeight: 48, marginBottom: 8,
    borderWidth: 1, borderColor: '#647488', borderRadius: 8
  },
  chosen: { backgroundColor: '#CCFBF1', borderColor: '#0F766E' },
  error: { color: '#B91C1C', marginVertical: 8, fontSize: 16 },
});