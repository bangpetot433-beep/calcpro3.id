'use strict';

/* ══════════════════════════════════════════════
   CalcPro v2 — script.js
   ══════════════════════════════════════════════ */

const history = [];
const $ = (id) => document.getElementById(id);
const fmtNum = (n) => parseFloat(n.toFixed(8)).toString();
const fmtRp  = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

/* ── TOAST ─────────────────────────────────── */
function toast(type, title, msg) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span>
    <div class="toast-body">
      <span class="toast-title">${title}</span>
      ${msg ? `<span class="toast-msg">${msg}</span>` : ''}
    </div>`;
  $('toast-container').appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    el.addEventListener('animationend', () => el.remove());
  }, 3200);
}

/* ── LOADING ────────────────────────────────── */
function setLoad(btn, on) {
  const t = btn.querySelector('.btn-text');
  const l = btn.querySelector('.btn-loader');
  if (!t || !l) return;
  btn.disabled = on;
  t.classList.toggle('hidden', on);
  l.classList.toggle('hidden', !on);
}

/* ── NAVIGATION ─────────────────────────────── */
const titles = {
  dashboard:'Dashboard', kalkulator:'Kalkulator', panjang:'Konversi Panjang',
  suhu:'Konversi Suhu', berat:'Konversi Berat', tekanan:'Konversi Tekanan',
  matauang:'Mata Uang Realtime', diskon:'Kalkulator Diskon',
  bunga:'Bunga & Investasi', nabung:'Target Nabung',
  bmi:'Kalkulator BMI', kalori:'Kebutuhan Kalori', riwayat:'Riwayat'
};

function navigate(id) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === id));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const t = document.getElementById(`page-${id}`);
  if (t) t.classList.add('active');
  $('pageTitle').textContent = titles[id] || id;
  closeSidebar();
  if (id === 'riwayat') renderHistory();
}

document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
});

/* ── SIDEBAR MOBILE ──────────────────────────── */
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('open'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

$('mobileMenuBtn').addEventListener('click', openSidebar);
overlay.addEventListener('click', closeSidebar);

/* ── API HELPER ─────────────────────────────── */
async function api(url, body) {
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Terjadi kesalahan pada server.');
  return d;
}

/* ── HISTORY ────────────────────────────────── */
function addHist(type, expr, hasil) { history.unshift({ type, expr, hasil, time: new Date() }); }

function renderHistory() {
  const list = $('riwayat-list');
  if (!history.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><p>Belum ada riwayat.<br>Mulai hitung sesuatu!</p></div>`;
    return;
  }
  list.innerHTML = history.map(h => {
    const t = h.time.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    return `<div class="riwayat-item">
      <span class="riwayat-type">${h.type}</span>
      <span class="riwayat-expr">${h.expr}</span>
      <span class="riwayat-hasil">${h.hasil}</span>
      <span class="riwayat-time">${t}</span>
    </div>`;
  }).join('');
}

$('btn-clear-history').addEventListener('click', () => {
  history.length = 0; renderHistory(); toast('info','Riwayat dihapus');
});

/* ═══════════════════════════════════════════
   KALKULATOR
   ═══════════════════════════════════════════ */
document.querySelectorAll('.op-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const a = parseFloat($('calc-a').value), b = parseFloat($('calc-b').value);
    if (isNaN(a) || isNaN(b)) { toast('error','Input tidak valid','Masukkan dua angka.'); return; }
    document.querySelectorAll('.op-btn').forEach(b2 => b2.classList.remove('active'));
    btn.classList.add('active');
    try {
      const d = await api('/api/kalkulator', { a, b, operasi: btn.dataset.op });
      const sym = { tambah:'+', kurang:'−', kali:'×', bagi:'÷' };
      const expr = `${fmtNum(d.a)} ${sym[d.operasi]} ${fmtNum(d.b)} = ${fmtNum(d.hasil)}`;
      $('calc-value').textContent = fmtNum(d.hasil);
      $('calc-expr').textContent  = expr;
      $('calc-result').classList.remove('hidden');
      addHist('Kalkulator', expr, fmtNum(d.hasil));
      toast('success','Berhasil dihitung');
    } catch(e) { toast('error','Gagal', e.message); }
  });
});

/* ═══════════════════════════════════════════
   PANJANG
   ═══════════════════════════════════════════ */
$('swap-panjang').addEventListener('click', () => {
  [($('panjang-dari').value), ($('panjang-ke').value)] = [$('panjang-ke').value, $('panjang-dari').value];
  // swap via temp
  const tmp = $('panjang-dari').value;
  $('panjang-dari').value = $('panjang-ke').value;
  $('panjang-ke').value = tmp;
});

$('btn-panjang').addEventListener('click', async () => {
  const btn = $('btn-panjang');
  const nilai = parseFloat($('panjang-nilai').value);
  if (isNaN(nilai)) { toast('error','Input kosong','Masukkan nilai panjang.'); return; }
  setLoad(btn, true);
  try {
    const d = await api('/api/panjang', { nilai, dari: $('panjang-dari').value, ke: $('panjang-ke').value });
    const v = fmtNum(d.hasil);
    const expr = `${fmtNum(nilai)} ${d.dari} = ${v} ${d.ke}`;
    $('panjang-value').textContent = `${v} ${d.ke}`;
    $('panjang-expr').textContent  = expr;
    $('panjang-result').classList.remove('hidden');
    addHist('Panjang', expr, `${v} ${d.ke}`);
    toast('success','Konversi berhasil');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});
$('panjang-nilai').addEventListener('keydown', e => e.key==='Enter' && $('btn-panjang').click());

/* ═══════════════════════════════════════════
   SUHU
   ═══════════════════════════════════════════ */
const suhuSym = { celcius:'°C', reamur:'°R', fahrenheit:'°F', kelvin:'K' };

$('btn-suhu').addEventListener('click', async () => {
  const btn = $('btn-suhu');
  const nilai = parseFloat($('suhu-nilai').value);
  if (isNaN(nilai)) { toast('error','Input kosong','Masukkan nilai suhu.'); return; }
  setLoad(btn, true);
  try {
    const d = await api('/api/suhu', { nilai, dari: $('suhu-dari').value });
    $('suhu-grid').innerHTML = Object.entries(d.hasil).map(([k,v]) => `
      <div class="chip">
        <span class="chip-label">${k.charAt(0).toUpperCase()+k.slice(1)}</span>
        <span class="chip-value">${parseFloat(v.toFixed(4))} ${suhuSym[k]||''}</span>
      </div>`).join('');
    $('suhu-result').classList.remove('hidden');
    const expr = `${nilai} ${suhuSym[d.dari]||d.dari}`;
    const hasilStr = Object.entries(d.hasil).map(([k,v]) => `${parseFloat(v.toFixed(2))}${suhuSym[k]||k}`).join(', ');
    addHist('Suhu', expr, hasilStr);
    toast('success','Konversi berhasil');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});
$('suhu-nilai').addEventListener('keydown', e => e.key==='Enter' && $('btn-suhu').click());

/* ═══════════════════════════════════════════
   BERAT
   ═══════════════════════════════════════════ */
$('swap-berat').addEventListener('click', () => {
  const tmp = $('berat-asal').value;
  $('berat-asal').value = $('berat-tujuan').value;
  $('berat-tujuan').value = tmp;
});
$('btn-berat').addEventListener('click', async () => {
  const btn = $('btn-berat');
  const berat = parseFloat($('berat-nilai').value);
  if (isNaN(berat)) { toast('error','Input kosong','Masukkan nilai berat.'); return; }
  setLoad(btn, true);
  try {
    const d = await api('/api/berat', { berat, asal: $('berat-asal').value, tujuan: $('berat-tujuan').value });
    const v = fmtNum(parseFloat(d.hasil.toFixed(6)));
    const expr = `${fmtNum(berat)} ${d.asal} = ${v} ${d.tujuan}`;
    $('berat-value').textContent = `${v} ${d.tujuan}`;
    $('berat-expr').textContent  = expr;
    $('berat-result').classList.remove('hidden');
    addHist('Berat', expr, `${v} ${d.tujuan}`);
    toast('success','Konversi berhasil');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});
$('berat-nilai').addEventListener('keydown', e => e.key==='Enter' && $('btn-berat').click());

/* ═══════════════════════════════════════════
   TEKANAN
   ═══════════════════════════════════════════ */
$('swap-tekanan').addEventListener('click', () => {
  const tmp = $('tekanan-dari').value;
  $('tekanan-dari').value = $('tekanan-ke').value;
  $('tekanan-ke').value = tmp;
});
$('btn-tekanan').addEventListener('click', async () => {
  const btn = $('btn-tekanan');
  const nilai = parseFloat($('tekanan-nilai').value);
  if (isNaN(nilai)) { toast('error','Input kosong','Masukkan nilai tekanan.'); return; }
  setLoad(btn, true);
  try {
    const d = await api('/api/tekanan', { nilai, dari: $('tekanan-dari').value, ke: $('tekanan-ke').value });
    const v = parseFloat(d.hasil.toFixed(6));
    const expr = `${nilai} ${d.dari} = ${v} ${d.ke}`;
    $('tekanan-value').textContent = `${v} ${d.ke}`;
    $('tekanan-expr').textContent  = expr;
    $('tekanan-result').classList.remove('hidden');
    addHist('Tekanan', expr, `${v} ${d.ke}`);
    toast('success','Konversi berhasil');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});
$('tekanan-nilai').addEventListener('keydown', e => e.key==='Enter' && $('btn-tekanan').click());

/* ═══════════════════════════════════════════
   MATA UANG REALTIME
   ═══════════════════════════════════════════ */
$('swap-mu').addEventListener('click', () => {
  const tmp = $('mu-dari').value;
  $('mu-dari').value = $('mu-ke').value;
  $('mu-ke').value = tmp;
});
$('btn-mu').addEventListener('click', async () => {
  const btn = $('btn-mu');
  const jumlah = parseFloat($('mu-jumlah').value);
  if (isNaN(jumlah)) { toast('error','Input kosong','Masukkan jumlah.'); return; }
  setLoad(btn, true);
  toast('info','Mengambil kurs terbaru...','Dari European Central Bank');
  try {
    const d = await api('/api/mata-uang', { jumlah, dari: $('mu-dari').value, ke: $('mu-ke').value });
    const v = parseFloat(d.hasil.toFixed(4));
    $('mu-value').textContent = `${v} ${d.ke}`;
    $('mu-expr').textContent  = `${jumlah} ${d.dari} = ${v} ${d.ke}`;
    $('mu-date').textContent  = `Kurs per tanggal: ${d.tanggal} · Sumber: Frankfurter / ECB`;
    $('mu-result').classList.remove('hidden');
    addHist('Mata Uang', `${jumlah} ${d.dari}`, `${v} ${d.ke}`);
    toast('success','Kurs berhasil diambil');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});
$('mu-jumlah').addEventListener('keydown', e => e.key==='Enter' && $('btn-mu').click());

/* ═══════════════════════════════════════════
   DISKON
   ═══════════════════════════════════════════ */
$('btn-diskon').addEventListener('click', async () => {
  const btn = $('btn-diskon');
  const harga = parseFloat($('disc-harga').value);
  const persen = parseFloat($('disc-persen').value);
  if (isNaN(harga) || isNaN(persen)) { toast('error','Input kosong','Masukkan harga dan persen diskon.'); return; }
  setLoad(btn, true);
  try {
    const d = await api('/api/diskon', { harga, diskon: persen });
    $('disc-value').textContent = fmtRp(d.harga_akhir);
    $('disc-chips').innerHTML = `
      <div class="chip green"><span class="chip-label">Harga Asli</span><span class="chip-value">${fmtRp(harga)}</span></div>
      <div class="chip warn"><span class="chip-label">Diskon ${persen}%</span><span class="chip-value">- ${fmtRp(d.nilai_diskon)}</span></div>
      <div class="chip"><span class="chip-label">Bayar</span><span class="chip-value">${fmtRp(d.harga_akhir)}</span></div>
      <div class="chip green"><span class="chip-label">Hemat</span><span class="chip-value">${fmtRp(d.hemat)}</span></div>`;
    $('diskon-result').classList.remove('hidden');
    addHist('Diskon', `${fmtRp(harga)} - ${persen}%`, fmtRp(d.harga_akhir));
    toast('success','Diskon dihitung');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});

/* ═══════════════════════════════════════════
   BUNGA / INVESTASI
   ═══════════════════════════════════════════ */
$('btn-bunga').addEventListener('click', async () => {
  const btn = $('btn-bunga');
  const pokok  = parseFloat($('bunga-pokok').value);
  const bunga  = parseFloat($('bunga-persen').value);
  const tahun  = parseFloat($('bunga-tahun').value);
  const frek   = parseInt($('bunga-frekuensi').value);
  if (isNaN(pokok)||isNaN(bunga)||isNaN(tahun)) { toast('error','Input kosong','Isi semua field.'); return; }
  setLoad(btn, true);
  try {
    const d = await api('/api/bunga', { pokok, bunga, tahun, frekuensi: frek });
    $('bunga-value').textContent = fmtRp(d.total);
    $('bunga-chips').innerHTML = `
      <div class="chip"><span class="chip-label">Modal Awal</span><span class="chip-value">${fmtRp(d.pokok)}</span></div>
      <div class="chip green"><span class="chip-label">Total Bunga</span><span class="chip-value">${fmtRp(d.bunga)}</span></div>
      <div class="chip warn"><span class="chip-label">Nilai Akhir</span><span class="chip-value">${fmtRp(d.total)}</span></div>
      <div class="chip"><span class="chip-label">Durasi</span><span class="chip-value">${tahun} Tahun</span></div>`;
    $('bunga-result').classList.remove('hidden');
    addHist('Bunga', `${fmtRp(pokok)} × ${bunga}% × ${tahun}th`, fmtRp(d.total));
    toast('success','Investasi dihitung');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});

/* ═══════════════════════════════════════════
   TARGET NABUNG
   ═══════════════════════════════════════════ */
$('btn-nabung').addEventListener('click', async () => {
  const btn = $('btn-nabung');
  const target = parseFloat($('nabung-target').value);
  const bulan  = parseInt($('nabung-bulan').value);
  if (isNaN(target)||isNaN(bulan)) { toast('error','Input kosong','Masukkan target dan lama nabung.'); return; }
  setLoad(btn, true);
  try {
    const d = await api('/api/nabung', { target, bulan });
    $('nabung-value').textContent = fmtRp(d.per_bulan);
    $('nabung-chips').innerHTML = `
      <div class="chip"><span class="chip-label">Target</span><span class="chip-value">${fmtRp(target)}</span></div>
      <div class="chip green"><span class="chip-label">Per Bulan</span><span class="chip-value">${fmtRp(d.per_bulan)}</span></div>
      <div class="chip warn"><span class="chip-label">Per Minggu</span><span class="chip-value">${fmtRp(d.per_minggu)}</span></div>
      <div class="chip"><span class="chip-label">Per Hari</span><span class="chip-value">${fmtRp(d.per_hari)}</span></div>`;
    $('nabung-result').classList.remove('hidden');
    addHist('Nabung', `Target ${fmtRp(target)} / ${bulan} bln`, fmtRp(d.per_bulan)+'/bln');
    toast('success','Target dihitung');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});

/* ═══════════════════════════════════════════
   BMI
   ═══════════════════════════════════════════ */
$('btn-bmi').addEventListener('click', async () => {
  const btn = $('btn-bmi');
  const berat  = parseFloat($('bmi-berat').value);
  const tinggi = parseFloat($('bmi-tinggi').value);
  if (isNaN(berat)||isNaN(tinggi)) { toast('error','Input kosong','Masukkan berat dan tinggi.'); return; }
  setLoad(btn, true);
  try {
    const d = await api('/api/bmi', { berat, tinggi });
    const color = d.bmi < 18.5 ? 'warn' : d.bmi < 25 ? 'green' : d.bmi < 30 ? 'warn' : 'err';
    $('bmi-value').textContent = d.bmi;
    $('bmi-chips').innerHTML = `
      <div class="chip ${color}"><span class="chip-label">Kategori</span><span class="chip-value">${d.kategori}</span></div>
      <div class="chip"><span class="chip-label">BB Ideal Min</span><span class="chip-value">${d.bb_ideal_min} kg</span></div>
      <div class="chip"><span class="chip-label">BB Ideal Max</span><span class="chip-value">${d.bb_ideal_max} kg</span></div>
      <div class="chip green"><span class="chip-label">Sumber</span><span class="chip-value">WHO 2004</span></div>`;
    $('bmi-result').classList.remove('hidden');
    addHist('BMI', `${berat}kg / ${tinggi}cm`, `${d.bmi} (${d.kategori})`);
    toast('success','BMI dihitung');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});

/* ═══════════════════════════════════════════
   KALORI
   ═══════════════════════════════════════════ */
$('btn-kalori').addEventListener('click', async () => {
  const btn = $('btn-kalori');
  const berat  = parseFloat($('kal-berat').value);
  const tinggi = parseFloat($('kal-tinggi').value);
  const usia   = parseInt($('kal-usia').value);
  if (isNaN(berat)||isNaN(tinggi)||isNaN(usia)) { toast('error','Input kosong','Isi semua field.'); return; }
  setLoad(btn, true);
  try {
    const d = await api('/api/kalori', { berat, tinggi, usia, jenis_kelamin: $('kal-gender').value, aktivitas: $('kal-aktivitas').value });
    $('kalori-value').textContent = `${d.tdee} kkal`;
    $('kalori-chips').innerHTML = `
      <div class="chip"><span class="chip-label">BMR</span><span class="chip-value">${d.bmr} kkal</span></div>
      <div class="chip green"><span class="chip-label">TDEE (Maintain)</span><span class="chip-value">${d.tdee} kkal</span></div>
      <div class="chip warn"><span class="chip-label">Diet (-500)</span><span class="chip-value">${d.diet} kkal</span></div>
      <div class="chip"><span class="chip-label">Bulking (+300)</span><span class="chip-value">${d.bulking} kkal</span></div>`;
    $('kalori-result').classList.remove('hidden');
    addHist('Kalori', `${berat}kg ${tinggi}cm ${usia}th`, `${d.tdee} kkal/hari`);
    toast('success','Kalori dihitung');
  } catch(e) { toast('error','Gagal', e.message); } finally { setLoad(btn, false); }
});

/* ── INIT ─────────────────────────────────── */
navigate('dashboard');
