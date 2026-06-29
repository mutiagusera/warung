
/* ============================================================
   WARUNG MUTIA — APLIKASI KASIR SEDERHANA
   Data disimpan di localStorage browser (tanpa server)
   ============================================================ */

const DB_KEY = 'warungBerkahData_v1';

let db = {
  barang: [],      // {id, nama, kategori, hargaBeli, hargaJual, stok, satuan, stokMin}
  transaksi: [],    // {id, waktu, pelanggan, jenis:'cash'|'hutang', items:[{barangId,nama,qty,hargaJual,hargaBeli}], total, modal, diterima}
  pembayaranHutang: [], // {id, waktu, pelanggan, jumlah}
  stokLog: []       // {id, waktu, barangId, nama, jenis:'masuk'|'keluar', jumlah, keterangan}
};

function loadDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(raw){
    try{ db = JSON.parse(raw); }catch(e){ console.error('Gagal load data', e); }
  }
}
function saveDB(){
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}
function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function rupiah(n){
  n = Math.round(n||0);
  return 'Rp ' + n.toLocaleString('id-ID');
}
function fmtWaktu(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) + ' ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function todayStr(){
  return new Date().toISOString().slice(0,10);
}
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 2600);
}

/* ============ NAVIGATION ============ */
const titles = {
  dashboard:['Dashboard','Ringkasan warung hari ini'],
  'barang-tambah':['Tambah Barang','Daftarkan barang baru ke gudang warung'],
  'barang-daftar':['Daftar & Edit Barang','Kelola seluruh barang yang dijual'],
  'jual-cash':['Penjualan Cash','Catat transaksi yang dibayar langsung'],
  'jual-hutang':['Penjualan Hutang','Catat transaksi yang dibayar nanti'],
  'riwayat-transaksi':['Riwayat Transaksi','Semua transaksi cash dan hutang'],
  'daftar-hutang':['Daftar Hutang','Rekap hutang per pelanggan'],
  'bayar-hutang':['Pembayaran Hutang','Catat pelanggan yang membayar hutang'],
  'riwayat-bayar':['Riwayat Pembayaran','Riwayat pelunasan hutang'],
  'stok-masuk':['Stok Masuk','Tambahkan stok barang yang baru datang'],
  'stok-keluar':['Stok Keluar','Catat barang yang keluar bukan dari penjualan'],
  'riwayat-stok':['Riwayat Stok','Seluruh pergerakan stok barang'],
  'lap-penjualan':['Laporan Penjualan','Rekap penjualan warung'],
  'lap-hutang':['Laporan Hutang','Rekap hutang seluruh pelanggan'],
  'lap-stok':['Laporan Stok','Kondisi stok seluruh barang'],
  'lap-untung':['Laporan Keuntungan','Estimasi keuntungan warung'],
  'backup':['Backup & Restore','Cadangkan dan pulihkan data warung'],
};

function showSection(target, el){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById('sec-'+target).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('pageTitle').textContent = titles[target][0];
  document.getElementById('pageSubtitle').textContent = titles[target][1];
  toggleSidebar(false);
  renderAllForSection(target);
  window.scrollTo(0,0);
}

function renderAllForSection(target){
  switch(target){
    case 'dashboard': renderDashboard(); break;
    case 'barang-daftar': renderDaftarBarang(); break;
    case 'jual-cash': renderQuickPickCash(); renderCart('cash'); break;
    case 'jual-hutang': renderQuickPickHutang(); renderCart('hutang'); break;
    case 'riwayat-transaksi': renderRiwayatTransaksi(); break;
    case 'daftar-hutang': renderDaftarHutang(); break;
    case 'bayar-hutang': renderSelectPelangganHutang(); break;
    case 'riwayat-bayar': renderRiwayatBayar(); break;
    case 'stok-masuk': renderSelectBarangStok('masukBarang'); break;
    case 'stok-keluar': renderSelectBarangStok('keluarBarang'); break;
    case 'riwayat-stok': renderRiwayatStok(); break;
    case 'lap-penjualan': renderLaporanPenjualan(); break;
    case 'lap-hutang': renderLaporanHutang(); break;
    case 'lap-stok': renderLaporanStok(); break;
    case 'lap-untung': renderLaporanUntung(); break;
    case 'backup': renderBackupInfo(); break;
  }
}

function toggleSidebar(open){
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if(window.innerWidth > 760) return;
  if(open===undefined) open = !sb.classList.contains('open');
  sb.classList.toggle('open', open);
  ov.classList.toggle('show', open);
}

/* ============ CLOCK ============ */
function tickClock(){
  const now = new Date();
  document.getElementById('clockPill').textContent = now.toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) + ' • ' + now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
setInterval(tickClock,1000);

/* ============ BARANG ============ */
function tambahBarang(e){
  e.preventDefault();
  const nama = document.getElementById('b_nama').value.trim();
  if(!nama){ showToast('Nama barang wajib diisi'); return false; }
  const item = {
    id: uid(),
    nama,
    kategori: document.getElementById('b_kategori').value.trim() || 'Umum',
    hargaBeli: Number(document.getElementById('b_hargabeli').value)||0,
    hargaJual: Number(document.getElementById('b_hargajual').value)||0,
    stok: Number(document.getElementById('b_stok').value)||0,
    satuan: document.getElementById('b_satuan').value.trim() || 'pcs',
    stokMin: Number(document.getElementById('b_stokmin').value)||5,
  };
  db.barang.push(item);
  saveDB();
  document.getElementById('formTambahBarang').reset();
  showToast('Barang "'+nama+'" berhasil ditambahkan');
  return false;
}

function renderDaftarBarang(){
  const q = (document.getElementById('cariBarang')?.value || '').toLowerCase();
  const tbody = document.getElementById('tblDaftarBarang');
  const list = db.barang.filter(b=>b.nama.toLowerCase().includes(q));
  if(list.length===0){
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><span class="icon">📦</span>Belum ada barang. Tambahkan dari menu "Tambah Barang".</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(b=>{
    const low = b.stok <= b.stokMin;
    return `<tr>
      <td><strong>${b.nama}</strong></td>
      <td>${b.kategori}</td>
      <td>${rupiah(b.hargaBeli)}</td>
      <td>${rupiah(b.hargaJual)}</td>
      <td>${b.stok} ${b.satuan} ${low?'<span class="badge badge-low">Menipis</span>':''}</td>
      <td>${b.satuan}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editBarangPrompt('${b.id}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="hapusBarang('${b.id}')">Hapus</button>
      </td>
    </tr>`;
  }).join('');
}

function editBarangPrompt(id){
  const b = db.barang.find(x=>x.id===id);
  if(!b) return;
  const nama = prompt('Nama barang:', b.nama); if(nama===null) return;
  const kategori = prompt('Kategori:', b.kategori); if(kategori===null) return;
  const hargaBeli = prompt('Harga beli (Rp):', b.hargaBeli); if(hargaBeli===null) return;
  const hargaJual = prompt('Harga jual (Rp):', b.hargaJual); if(hargaJual===null) return;
  const stok = prompt('Stok saat ini:', b.stok); if(stok===null) return;
  const satuan = prompt('Satuan:', b.satuan); if(satuan===null) return;
  const stokMin = prompt('Stok minimum (batas peringatan):', b.stokMin); if(stokMin===null) return;

  b.nama = nama.trim() || b.nama;
  b.kategori = kategori.trim() || b.kategori;
  b.hargaBeli = Number(hargaBeli)||0;
  b.hargaJual = Number(hargaJual)||0;
  b.stok = Number(stok)||0;
  b.satuan = satuan.trim() || b.satuan;
  b.stokMin = Number(stokMin)||5;
  saveDB();
  renderDaftarBarang();
  showToast('Barang "'+b.nama+'" berhasil diperbarui');
}

function hapusBarang(id){
  const b = db.barang.find(x=>x.id===id);
  if(!b) return;
  if(!confirm('Hapus barang "'+b.nama+'"? Riwayat transaksi terkait tidak akan terhapus.')) return;
  db.barang = db.barang.filter(x=>x.id!==id);
  saveDB();
  renderDaftarBarang();
  showToast('Barang "'+b.nama+'" dihapus');
}

/* ============ CART (shared logic for cash & hutang) ============ */
let carts = { cash:{}, hutang:{} }; // {barangId: qty}

function renderQuickPickCash(){ renderQuickPick('cariJualCash','quickPickCash','cash'); }
function renderQuickPickHutang(){ renderQuickPick('cariJualHutang','quickPickHutang','hutang'); }

function renderQuickPick(inputId, gridId, type){
  const q = (document.getElementById(inputId)?.value || '').toLowerCase();
  const grid = document.getElementById(gridId);
  const list = db.barang.filter(b=>b.nama.toLowerCase().includes(q));
  if(list.length===0){
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="icon">📦</span>Belum ada barang tersedia</div>';
    return;
  }
  grid.innerHTML = list.map(b=>`
    <button type="button" class="quick-item" onclick="addToCart('${type}','${b.id}')">
      <span class="qn">${b.nama}</span>
      <span class="qp">${rupiah(b.hargaJual)}</span>
      <span class="qs">Stok: ${b.stok} ${b.satuan}</span>
    </button>
  `).join('');
}

function addToCart(type, barangId){
  const b = db.barang.find(x=>x.id===barangId);
  if(!b) return;
  const cart = carts[type];
  const currentQty = cart[barangId] || 0;
  if(currentQty + 1 > b.stok){
    showToast('Stok "'+b.nama+'" tidak cukup (sisa '+b.stok+')');
    return;
  }
  cart[barangId] = currentQty + 1;
  renderCart(type);
}

function changeQty(type, barangId, delta){
  const b = db.barang.find(x=>x.id===barangId);
  const cart = carts[type];
  let qty = (cart[barangId]||0) + delta;
  if(qty <= 0){ delete cart[barangId]; }
  else if(b && qty > b.stok){ showToast('Stok "'+b.nama+'" tidak cukup (sisa '+b.stok+')'); return; }
  else { cart[barangId] = qty; }
  renderCart(type);
}

function kosongkanCart(type){
  carts[type] = {};
  renderCart(type);
}

function renderCart(type){
  const cart = carts[type];
  const containerId = type==='cash' ? 'cartCash' : 'cartHutang';
  const totalId = type==='cash' ? 'totalCash' : 'totalHutang';
  const container = document.getElementById(containerId);
  const ids = Object.keys(cart);
  if(ids.length===0){
    container.innerHTML = '<div class="empty-state"><span class="icon">🛒</span>Keranjang masih kosong</div>';
    document.getElementById(totalId).textContent = rupiah(0);
    if(type==='cash') hitungKembalianCash();
    return;
  }
  let total = 0;
  container.innerHTML = ids.map(id=>{
    const b = db.barang.find(x=>x.id===id);
    if(!b) return '';
    const qty = cart[id];
    const subtotal = qty * b.hargaJual;
    total += subtotal;
    return `<div class="cart-line">
      <span class="nm">${b.nama}<br><span style="font-weight:400;color:var(--ink-soft);font-size:11.5px;">${rupiah(b.hargaJual)} / ${b.satuan}</span></span>
      <div class="qty-control">
        <button type="button" onclick="changeQty('${type}','${id}',-1)">−</button>
        <span>${qty}</span>
        <button type="button" onclick="changeQty('${type}','${id}',1)">+</button>
      </div>
      <span style="min-width:80px;text-align:right;font-weight:700;">${rupiah(subtotal)}</span>
    </div>`;
  }).join('');
  document.getElementById(totalId).textContent = rupiah(total);
  if(type==='cash') hitungKembalianCash();
}

function hitungKembalianCash(){
  const cart = carts.cash;
  let total = 0;
  Object.keys(cart).forEach(id=>{
    const b = db.barang.find(x=>x.id===id);
    if(b) total += cart[id]*b.hargaJual;
  });
  const diterima = Number(document.getElementById('cashDiterima').value)||0;
  const kembali = diterima - total;
  document.getElementById('kembalianCash').textContent = 'Kembalian: ' + rupiah(Math.max(kembali,0)) + (kembali<0 ? '  (kurang '+rupiah(-kembali)+')' : '');
}

function prosesCash(){
  const cart = carts.cash;
  const ids = Object.keys(cart);
  if(ids.length===0){ showToast('Keranjang masih kosong'); return; }
  let total = 0, modal = 0;
  const items = ids.map(id=>{
    const b = db.barang.find(x=>x.id===id);
    const qty = cart[id];
    total += qty * b.hargaJual;
    modal += qty * b.hargaBeli;
    return {barangId:id, nama:b.nama, qty, hargaJual:b.hargaJual, hargaBeli:b.hargaBeli};
  });
  const diterima = Number(document.getElementById('cashDiterima').value)||0;
  if(diterima < total){
    if(!confirm('Uang diterima kurang dari total. Lanjutkan transaksi?')) return;
  }
  // kurangi stok
  ids.forEach(id=>{
    const b = db.barang.find(x=>x.id===id);
    b.stok -= cart[id];
  });
  const trx = {
    id:uid(), waktu:new Date().toISOString(), pelanggan:'Umum', jenis:'cash',
    items, total, modal, diterima
  };
  db.transaksi.push(trx);
  saveDB();
  carts.cash = {};
  document.getElementById('cashDiterima').value='';
  renderCart('cash');
  renderQuickPickCash();
  showReceipt(trx);
  showToast('Transaksi cash berhasil disimpan');
}

function prosesHutang(){
  const nama = document.getElementById('namaPelangganHutang').value.trim();
  if(!nama){ showToast('Nama pelanggan wajib diisi'); return; }
  const cart = carts.hutang;
  const ids = Object.keys(cart);
  if(ids.length===0){ showToast('Keranjang masih kosong'); return; }
  let total = 0, modal = 0;
  const items = ids.map(id=>{
    const b = db.barang.find(x=>x.id===id);
    const qty = cart[id];
    total += qty * b.hargaJual;
    modal += qty * b.hargaBeli;
    return {barangId:id, nama:b.nama, qty, hargaJual:b.hargaJual, hargaBeli:b.hargaBeli};
  });
  ids.forEach(id=>{
    const b = db.barang.find(x=>x.id===id);
    b.stok -= cart[id];
  });
  const trx = {
    id:uid(), waktu:new Date().toISOString(), pelanggan:nama, jenis:'hutang',
    items, total, modal, diterima:0
  };
  db.transaksi.push(trx);
  saveDB();
  carts.hutang = {};
  document.getElementById('namaPelangganHutang').value='';
  renderCart('hutang');
  renderQuickPickHutang();
  showReceipt(trx);
  showToast('Hutang untuk "'+nama+'" berhasil dicatat');
}

function showReceipt(trx){
  const html = `
    <h3>WARUNG MUTIA</h3>
    <div class="center">${fmtWaktu(trx.waktu)}</div>
    <hr>
    ${trx.items.map(it=>`<div class="line"><span>${it.nama} x${it.qty}</span><span>${rupiah(it.qty*it.hargaJual)}</span></div>`).join('')}
    <hr>
    <div class="line"><strong>TOTAL</strong><strong>${rupiah(trx.total)}</strong></div>
    ${trx.jenis==='cash' ? `
      <div class="line"><span>Diterima</span><span>${rupiah(trx.diterima)}</span></div>
      <div class="line"><span>Kembali</span><span>${rupiah(Math.max(trx.diterima-trx.total,0))}</span></div>
    ` : `<div class="line"><span>Status</span><span>HUTANG (${trx.pelanggan})</span></div>`}
    <hr>
    <div class="center">Terima kasih telah berbelanja 🙏</div>
    <button class="btn btn-outline" style="width:100%;margin-top:14px;" onclick="closeReceipt()">Tutup</button>
  `;
  document.getElementById('receiptContent').innerHTML = html;
  document.getElementById('receiptModalBg').classList.add('show');
}
function closeReceipt(){
  document.getElementById('receiptModalBg').classList.remove('show');
}

/* ============ RIWAYAT TRANSAKSI ============ */
function renderRiwayatTransaksi(){
  const dari = document.getElementById('filterTrxDari').value;
  const sampai = document.getElementById('filterTrxSampai').value;
  const jenis = document.getElementById('filterTrxJenis').value;
  let list = [...db.transaksi].sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  if(dari) list = list.filter(t=>t.waktu.slice(0,10) >= dari);
  if(sampai) list = list.filter(t=>t.waktu.slice(0,10) <= sampai);
  if(jenis) list = list.filter(t=>t.jenis===jenis);

  const tbody = document.getElementById('tblRiwayatTransaksi');
  if(list.length===0){
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><span class="icon">🧾</span>Belum ada transaksi pada rentang ini</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(t=>{
    const untung = t.total - t.modal;
    const itemStr = t.items.map(i=>i.nama+' x'+i.qty).join(', ');
    return `<tr>
      <td>${fmtWaktu(t.waktu)}</td>
      <td>${t.pelanggan}</td>
      <td>${t.jenis==='cash' ? '<span class="badge badge-ok">Cash</span>' : '<span class="badge badge-belum">Hutang</span>'}</td>
      <td>${itemStr}</td>
      <td>${rupiah(t.total)}</td>
      <td>${rupiah(untung)}</td>
      <td><button class="btn btn-outline btn-sm" onclick='showReceipt(${JSON.stringify(t).replace(/'/g,"&#39;")})'>Lihat Struk</button></td>
    </tr>`;
  }).join('');
}

/* ============ HUTANG ============ */
function getHutangPerPelanggan(){
  const map = {}; // nama -> {total, dibayar}
  db.transaksi.filter(t=>t.jenis==='hutang').forEach(t=>{
    if(!map[t.pelanggan]) map[t.pelanggan] = {total:0, dibayar:0};
    map[t.pelanggan].total += t.total;
  });
  db.pembayaranHutang.forEach(p=>{
    if(!map[p.pelanggan]) map[p.pelanggan] = {total:0, dibayar:0};
    map[p.pelanggan].dibayar += p.jumlah;
  });
  return map;
}

function renderDaftarHutang(){
  const map = getHutangPerPelanggan();
  const tbody = document.getElementById('tblDaftarHutang');
  const names = Object.keys(map).filter(n=>map[n].total>0);
  if(names.length===0){
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span class="icon">💳</span>Belum ada hutang tercatat</div></td></tr>';
    return;
  }
  tbody.innerHTML = names.map(n=>{
    const d = map[n];
    const sisa = d.total - d.dibayar;
    const lunas = sisa <= 0;
    return `<tr>
      <td><strong>${n}</strong></td>
      <td>${rupiah(d.total)}</td>
      <td>${rupiah(d.dibayar)}</td>
      <td>${rupiah(Math.max(sisa,0))}</td>
      <td>${lunas ? '<span class="badge badge-lunas">Lunas</span>' : '<span class="badge badge-belum">Belum Lunas</span>'}</td>
    </tr>`;
  }).join('');
}

function renderSelectPelangganHutang(){
  const map = getHutangPerPelanggan();
  const sel = document.getElementById('bayarPelanggan');
  const names = Object.keys(map).filter(n=> (map[n].total - map[n].dibayar) > 0);
  if(names.length===0){
    sel.innerHTML = '<option value="">Tidak ada hutang aktif</option>';
    document.getElementById('infoSisaHutang').value = rupiah(0);
    return;
  }
  sel.innerHTML = names.map(n=>`<option value="${n}">${n}</option>`).join('');
  updateInfoSisaHutang();
}

function updateInfoSisaHutang(){
  const nama = document.getElementById('bayarPelanggan').value;
  const map = getHutangPerPelanggan();
  const sisa = nama && map[nama] ? (map[nama].total - map[nama].dibayar) : 0;
  document.getElementById('infoSisaHutang').value = rupiah(Math.max(sisa,0));
}

function prosesBayarHutang(){
  const nama = document.getElementById('bayarPelanggan').value;
  const jumlah = Number(document.getElementById('jumlahBayarHutang').value)||0;
  if(!nama){ showToast('Pilih pelanggan terlebih dahulu'); return; }
  if(jumlah<=0){ showToast('Jumlah bayar harus lebih dari 0'); return; }
  const map = getHutangPerPelanggan();
  const sisa = map[nama].total - map[nama].dibayar;
  if(jumlah > sisa){
    if(!confirm('Jumlah bayar ('+rupiah(jumlah)+') lebih besar dari sisa hutang ('+rupiah(sisa)+'). Lanjutkan?')) return;
  }
  db.pembayaranHutang.push({id:uid(), waktu:new Date().toISOString(), pelanggan:nama, jumlah});
  saveDB();
  document.getElementById('jumlahBayarHutang').value='';
  renderSelectPelangganHutang();
  showToast('Pembayaran dari "'+nama+'" sebesar '+rupiah(jumlah)+' tersimpan');
}

function renderRiwayatBayar(){
  const tbody = document.getElementById('tblRiwayatBayar');
  const list = [...db.pembayaranHutang].sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  if(list.length===0){
    tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state"><span class="icon">💰</span>Belum ada riwayat pembayaran</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(p=>`<tr><td>${fmtWaktu(p.waktu)}</td><td>${p.pelanggan}</td><td>${rupiah(p.jumlah)}</td></tr>`).join('');
}

/* ============ STOK ============ */
function renderSelectBarangStok(selectId){
  const sel = document.getElementById(selectId);
  if(db.barang.length===0){
    sel.innerHTML = '<option value="">Belum ada barang</option>';
    return;
  }
  sel.innerHTML = db.barang.map(b=>`<option value="${b.id}">${b.nama} (stok: ${b.stok} ${b.satuan})</option>`).join('');
}

function prosesStokMasuk(e){
  e.preventDefault();
  const id = document.getElementById('masukBarang').value;
  const jumlah = Number(document.getElementById('masukJumlah').value)||0;
  const ket = document.getElementById('masukKet').value.trim();
  const b = db.barang.find(x=>x.id===id);
  if(!b){ showToast('Pilih barang terlebih dahulu'); return false; }
  if(jumlah<=0){ showToast('Jumlah harus lebih dari 0'); return false; }
  b.stok += jumlah;
  db.stokLog.push({id:uid(), waktu:new Date().toISOString(), barangId:id, nama:b.nama, jenis:'masuk', jumlah, keterangan:ket||'-'});
  saveDB();
  document.getElementById('formStokMasuk').reset();
  renderSelectBarangStok('masukBarang');
  showToast('Stok "'+b.nama+'" bertambah '+jumlah+' '+b.satuan);
  return false;
}

function prosesStokKeluar(e){
  e.preventDefault();
  const id = document.getElementById('keluarBarang').value;
  const jumlah = Number(document.getElementById('keluarJumlah').value)||0;
  const alasan = document.getElementById('keluarAlasan').value;
  const b = db.barang.find(x=>x.id===id);
  if(!b){ showToast('Pilih barang terlebih dahulu'); return false; }
  if(jumlah<=0){ showToast('Jumlah harus lebih dari 0'); return false; }
  if(jumlah > b.stok){ showToast('Jumlah keluar melebihi stok yang ada'); return false; }
  b.stok -= jumlah;
  db.stokLog.push({id:uid(), waktu:new Date().toISOString(), barangId:id, nama:b.nama, jenis:'keluar', jumlah, keterangan:alasan});
  saveDB();
  document.getElementById('formStokKeluar').reset();
  renderSelectBarangStok('keluarBarang');
  showToast('Stok "'+b.nama+'" berkurang '+jumlah+' '+b.satuan+' ('+alasan+')');
  return false;
}

function renderRiwayatStok(){
  const tbody = document.getElementById('tblRiwayatStok');
  const list = [...db.stokLog].sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  if(list.length===0){
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span class="icon">📦</span>Belum ada pergerakan stok</div></td></tr>';
    return;
  }
  tbody.innerHTML = list.map(s=>`<tr>
    <td>${fmtWaktu(s.waktu)}</td>
    <td>${s.nama}</td>
    <td>${s.jenis==='masuk' ? '<span class="badge badge-ok">Masuk</span>' : '<span class="badge badge-low">Keluar</span>'}</td>
    <td>${s.jumlah}</td>
    <td>${s.keterangan}</td>
  </tr>`).join('');
}

/* ============ DASHBOARD ============ */
function renderDashboard(){
  const today = todayStr();
  const trxHariIni = db.transaksi.filter(t=>t.waktu.slice(0,10)===today);
  const omsetHariIni = trxHariIni.reduce((s,t)=>s+t.total,0);
  const untungHariIni = trxHariIni.reduce((s,t)=>s+(t.total-t.modal),0);

  document.getElementById('stOmsetHariIni').textContent = rupiah(omsetHariIni);
  document.getElementById('stTrxHariIni').textContent = trxHariIni.length + ' transaksi';
  document.getElementById('stUntungHariIni').textContent = rupiah(untungHariIni);

  const map = getHutangPerPelanggan();
  let hutangAktif = 0, jmlPelangganHutang = 0;
  Object.keys(map).forEach(n=>{
    const sisa = map[n].total - map[n].dibayar;
    if(sisa>0){ hutangAktif += sisa; jmlPelangganHutang++; }
  });
  document.getElementById('stHutangAktif').textContent = rupiah(hutangAktif);
  document.getElementById('stJmlPelangganHutang').textContent = jmlPelangganHutang + ' pelanggan';

  const stokMenipis = db.barang.filter(b=>b.stok<=b.stokMin);
  document.getElementById('stStokMenipis').textContent = stokMenipis.length;

  // transaksi terbaru
  const terbaru = [...db.transaksi].sort((a,b)=>new Date(b.waktu)-new Date(a.waktu)).slice(0,6);
  const tbTrx = document.getElementById('tblTrxTerbaru');
  tbTrx.innerHTML = terbaru.length ? terbaru.map(t=>`<tr>
    <td>${fmtWaktu(t.waktu)}</td><td>${t.pelanggan}</td>
    <td>${t.jenis==='cash'?'Cash':'Hutang'}</td><td>${rupiah(t.total)}</td>
  </tr>`).join('') : '<tr><td colspan="4"><div class="empty-state">Belum ada transaksi</div></td></tr>';

  const tbStok = document.getElementById('tblStokMenipis');
  tbStok.innerHTML = stokMenipis.length ? stokMenipis.slice(0,6).map(b=>`<tr>
    <td>${b.nama}</td><td>${b.stok} ${b.satuan}</td>
  </tr>`).join('') : '<tr><td colspan="2"><div class="empty-state">Stok semua barang aman</div></td></tr>';
}

/* ============ LAPORAN ============ */
let periodeAktif = { penjualan:'harian', untung:'harian' };

function setPeriodeLaporan(jenis, periode, el){
  periodeAktif[jenis] = periode;
  el.parentElement.querySelectorAll('.pill-tab').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  if(jenis==='penjualan') renderLaporanPenjualan();
  if(jenis==='untung') renderLaporanUntung();
}

function filterByPeriode(list, periode){
  const today = todayStr();
  const thisMonth = today.slice(0,7);
  if(periode==='harian') return list.filter(t=>t.waktu.slice(0,10)===today);
  if(periode==='bulanan') return list.filter(t=>t.waktu.slice(0,7)===thisMonth);
  return list;
}

function renderLaporanPenjualan(){
  const periode = periodeAktif.penjualan;
  const list = filterByPeriode(db.transaksi, periode).sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  const omset = list.reduce((s,t)=>s+t.total,0);
  document.getElementById('lapPenjualanOmset').textContent = rupiah(omset);
  document.getElementById('lapPenjualanJumlah').textContent = list.length;
  document.getElementById('lapPenjualanRata').textContent = rupiah(list.length ? omset/list.length : 0);

  const tbody = document.getElementById('tblLapPenjualan');
  tbody.innerHTML = list.length ? list.map(t=>`<tr>
    <td>${fmtWaktu(t.waktu)}</td><td>${t.pelanggan}</td>
    <td>${t.jenis==='cash'?'Cash':'Hutang'}</td><td>${rupiah(t.total)}</td>
  </tr>`).join('') : '<tr><td colspan="4"><div class="empty-state">Tidak ada data pada periode ini</div></td></tr>';
}

function renderLaporanHutang(){
  const map = getHutangPerPelanggan();
  let totalHutang=0, totalDibayar=0;
  Object.values(map).forEach(d=>{ totalHutang+=d.total; totalDibayar+=d.dibayar; });
  document.getElementById('lapHutangTotal').textContent = rupiah(totalHutang);
  document.getElementById('lapHutangDibayar').textContent = rupiah(totalDibayar);
  document.getElementById('lapHutangSisa').textContent = rupiah(Math.max(totalHutang-totalDibayar,0));

  const tbody = document.getElementById('tblLapHutang');
  const names = Object.keys(map);
  tbody.innerHTML = names.length ? names.map(n=>{
    const d = map[n]; const sisa = d.total-d.dibayar;
    return `<tr>
      <td>${n}</td><td>${rupiah(d.total)}</td><td>${rupiah(d.dibayar)}</td>
      <td>${rupiah(Math.max(sisa,0))}</td>
      <td>${sisa<=0?'<span class="badge badge-lunas">Lunas</span>':'<span class="badge badge-belum">Belum Lunas</span>'}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="5"><div class="empty-state">Belum ada data hutang</div></td></tr>';
}

function renderLaporanStok(){
  const tbody = document.getElementById('tblLapStok');
  if(db.barang.length===0){
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Belum ada barang</div></td></tr>';
    return;
  }
  tbody.innerHTML = db.barang.map(b=>{
    const low = b.stok<=b.stokMin;
    return `<tr>
      <td>${b.nama}</td><td>${b.stok} ${b.satuan}</td><td>${b.stokMin}</td>
      <td>${low?'<span class="badge badge-low">Menipis</span>':'<span class="badge badge-ok">Aman</span>'}</td>
      <td>${rupiah(b.stok*b.hargaBeli)}</td>
    </tr>`;
  }).join('');
}

function renderLaporanUntung(){
  const periode = periodeAktif.untung;
  const list = filterByPeriode(db.transaksi, periode).sort((a,b)=>new Date(b.waktu)-new Date(a.waktu));
  const omset = list.reduce((s,t)=>s+t.total,0);
  const modal = list.reduce((s,t)=>s+t.modal,0);
  document.getElementById('lapUntungOmset').textContent = rupiah(omset);
  document.getElementById('lapUntungModal').textContent = rupiah(modal);
  document.getElementById('lapUntungLaba').textContent = rupiah(omset-modal);

  const tbody = document.getElementById('tblLapUntung');
  tbody.innerHTML = list.length ? list.map(t=>`<tr>
    <td>${fmtWaktu(t.waktu)}</td><td>${rupiah(t.total)}</td><td>${rupiah(t.modal)}</td><td>${rupiah(t.total-t.modal)}</td>
  </tr>`).join('') : '<tr><td colspan="4"><div class="empty-state">Tidak ada data pada periode ini</div></td></tr>';
}

/* ============ BACKUP & RESTORE ============ */
const BACKUP_KEY = 'warungBerkahLastBackup_v1';

function pad2(n){ return n.toString().padStart(2,'0'); }
function namaFileBackup(ext){
  const d = new Date();
  const tgl = d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'_'+pad2(d.getHours())+pad2(d.getMinutes());
  return 'warung-berkah-backup_'+tgl+'.'+ext;
}
function unduhFile(filename, content, mime){
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function tandaiBackupTerakhir(){
  localStorage.setItem(BACKUP_KEY, new Date().toISOString());
}
function renderBackupInfo(){
  document.getElementById('bkJmlBarang').textContent = db.barang.length;
  document.getElementById('bkJmlTransaksi').textContent = db.transaksi.length;
  document.getElementById('bkJmlBayar').textContent = db.pembayaranHutang.length;
  document.getElementById('bkJmlStokLog').textContent = db.stokLog.length;
  const last = localStorage.getItem(BACKUP_KEY);
  document.getElementById('bkInfoTerakhir').textContent = last
    ? 'Backup terakhir: ' + fmtWaktu(last)
    : 'Belum pernah backup sejak data ini dibuat.';
}

function exportJSON(){
  const payload = {
    aplikasi: 'Warung Mutia',
    versi: 1,
    diekspor: new Date().toISOString(),
    data: db
  };
  unduhFile(namaFileBackup('json'), JSON.stringify(payload, null, 2), 'application/json');
  tandaiBackupTerakhir();
  renderBackupInfo();
  showToast('Backup JSON berhasil diunduh');
}

function escXml(v){
  return String(v==null?'':v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}
function xmlSheet(nama, header, rows){
  let out = '<Worksheet ss:Name="'+escXml(nama)+'"><Table>';
  out += '<Row>'+header.map(h=>'<Cell><Data ss:Type="String">'+escXml(h)+'</Data></Cell>').join('')+'</Row>';
  rows.forEach(r=>{
    out += '<Row>'+r.map(c=>{
      const isNum = typeof c === 'number';
      return '<Cell><Data ss:Type="'+(isNum?'Number':'String')+'">'+escXml(c)+'</Data></Cell>';
    }).join('')+'</Row>';
  });
  out += '</Table></Worksheet>';
  return out;
}
function exportExcel(){
  const sheetBarang = xmlSheet('Barang',
    ['Nama','Kategori','Harga Beli','Harga Jual','Stok','Satuan','Stok Minimum'],
    db.barang.map(b=>[b.nama,b.kategori||'-',b.hargaBeli,b.hargaJual,b.stok,b.satuan||'-',b.stokMin])
  );
  const sheetTransaksi = xmlSheet('Transaksi',
    ['Waktu','Pelanggan','Jenis','Total','Modal','Diterima'],
    db.transaksi.map(t=>[fmtWaktu(t.waktu),t.pelanggan||'-',t.jenis,t.total,t.modal,t.diterima||0])
  );
  const sheetBayar = xmlSheet('Pembayaran Hutang',
    ['Waktu','Pelanggan','Jumlah'],
    db.pembayaranHutang.map(p=>[fmtWaktu(p.waktu),p.pelanggan,p.jumlah])
  );
  const sheetStok = xmlSheet('Riwayat Stok',
    ['Waktu','Barang','Jenis','Jumlah','Keterangan'],
    db.stokLog.map(s=>[fmtWaktu(s.waktu),s.nama,s.jenis,s.jumlah,s.keterangan||'-'])
  );
  const xml = '<?xml version="1.0"?>'+
    '<?mso-application progid="Excel.Sheet"?>'+
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" '+
    'xmlns:o="urn:schemas-microsoft-com:office:office" '+
    'xmlns:x="urn:schemas-microsoft-com:office:excel" '+
    'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'+
    sheetBarang + sheetTransaksi + sheetBayar + sheetStok +
    '</Workbook>';
  unduhFile(namaFileBackup('xls'), xml, 'application/vnd.ms-excel');
  showToast('File Excel berhasil diunduh (cek folder Download)');
}

function importJSON(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    let parsed;
    try{
      parsed = JSON.parse(ev.target.result);
    }catch(err){
      showToast('File tidak valid / bukan format JSON yang benar');
      e.target.value = '';
      return;
    }
    const data = parsed && parsed.data ? parsed.data : parsed;
    if(!data || !Array.isArray(data.barang) || !Array.isArray(data.transaksi)){
      showToast('Struktur data dalam file ini tidak dikenali');
      e.target.value = '';
      return;
    }
    if(!confirm('Pulihkan data dari file ini akan MENGGANTI seluruh data yang ada sekarang ('+db.barang.length+' barang, '+db.transaksi.length+' transaksi, dll). Lanjutkan?')) {
      e.target.value = '';
      return;
    }
    db = {
      barang: data.barang || [],
      transaksi: data.transaksi || [],
      pembayaranHutang: data.pembayaranHutang || [],
      stokLog: data.stokLog || []
    };
    saveDB();
    e.target.value = '';
    showToast('Data berhasil dipulihkan dari backup');
    renderBackupInfo();
    renderAllForSection('backup');
  };
  reader.onerror = function(){
    showToast('Gagal membaca file');
    e.target.value = '';
  };
  reader.readAsText(file);
}

/* ============ RESET DATA ============ */
function resetAllData(){
  if(!confirm('Yakin ingin menghapus SEMUA data warung (barang, transaksi, hutang, stok)? Tindakan ini tidak dapat dibatalkan.')) return;
  localStorage.removeItem(DB_KEY);
  db = { barang:[], transaksi:[], pembayaranHutang:[], stokLog:[] };
  showToast('Semua data telah dihapus');
  renderAllForSection('dashboard');
  showSection('dashboard', document.querySelector('.nav-item.dash'));
}

/* ============ INIT ============ */
function seedContohData(){
  if(db.barang.length>0) return; // jangan timpa data yang sudah ada
  db.barang = [
    {id:uid(), nama:'Indomie Goreng', kategori:'Makanan Instan', hargaBeli:2500, hargaJual:3000, stok:40, satuan:'bungkus', stokMin:10},
    {id:uid(), nama:'Beras 5kg', kategori:'Sembako', hargaBeli:58000, hargaJual:63000, stok:15, satuan:'karung', stokMin:3},
    {id:uid(), nama:'Telur Ayam', kategori:'Sembako', hargaBeli:2200, hargaJual:2700, stok:60, satuan:'butir', stokMin:20},
    {id:uid(), nama:'Air Mineral 600ml', kategori:'Minuman', hargaBeli:2500, hargaJual:3500, stok:5, satuan:'botol', stokMin:10},
    {id:uid(), nama:'Gula Pasir 1kg', kategori:'Sembako', hargaBeli:14000, hargaJual:16000, stok:20, satuan:'kg', stokMin:5},
  ];
  saveDB();
}

loadDB();
if(db.barang.length===0 && db.transaksi.length===0){
  seedContohData();
}
tickClock();
renderDashboard();
