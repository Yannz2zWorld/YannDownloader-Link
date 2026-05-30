/* =============================================
   YannDownloader-Link — script.js
   dev: YannAjah
   ============================================= */

// ---- State ----
let selectedType = 'both';
let currentResult = null;

// =============================================
// UI HELPERS
// =============================================

/** Set active download type option */
function selectOpt(el, type) {
  document.querySelectorAll('.dl-opt').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  selectedType = type;
}

/** Paste URL from clipboard */
async function pasteUrl() {
  const input = document.getElementById('urlInput');

  // Coba clipboard API dulu
  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        input.value = text;
        showToast('✅ Link berhasil ditempel!');
        return;
      }
    } catch (err) {
      // Permission denied atau tidak support — lanjut fallback
    }
  }

  // Fallback: fokus input lalu trigger paste dari clipboard OS
  input.focus();
  try {
    const success = document.execCommand('paste');
    if (success && input.value) {
      showToast('✅ Link berhasil ditempel!');
      return;
    }
  } catch (e) { /* ignore */ }

  // Fallback terakhir: buka prompt manual
  const manual = prompt('Paste link kamu di sini:');
  if (manual && manual.trim()) {
    input.value = manual.trim();
    showToast('✅ Link berhasil ditempel!');
  } else {
    showToast('⚠️ Ketik atau paste link di kolom input.');
    input.focus();
  }
}

/** Show toast notification */
function showToast(msg) {
  const t = document.getElementById('tooltip');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/** Set status bar state: 'loading' | 'error' | '' */
function setStatus(type, msg) {
  const bar = document.getElementById('statusBar');
  bar.className = 'status-bar ' + type;
  document.getElementById('statusText').textContent = msg;
  if (type === '') bar.style.display = 'none';
}

// =============================================
// PLATFORM DETECTION & DISPLAY
// =============================================

/** Detect platform from URL string */
function detectPlatform(url) {
  if (!url) return 'unknown';
  if (url.includes('tiktok.com') || url.includes('vt.tiktok')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be'))  return 'youtube';
  if (url.includes('instagram.com'))                             return 'instagram';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  if (url.includes('twitter.com') || url.includes('x.com'))     return 'twitter';
  return 'unknown';
}

/** Return platform display label */
function platformLabel(p) {
  const map = {
    tiktok:    'TikTok',
    youtube:   'YouTube',
    instagram: 'Instagram',
    facebook:  'Facebook',
    twitter:   'Twitter / X',
  };
  return map[p] || 'Unknown';
}

/** Return platform badge HTML */
function platformBadge(platform) {
  const map = {
    tiktok:    ['badge-tiktok',    '🎵 TikTok'],
    youtube:   ['badge-youtube',   '▶ YouTube'],
    instagram: ['badge-instagram', '📷 Instagram'],
    facebook:  ['badge-facebook',  '🔵 Facebook'],
    twitter:   ['badge-twitter',   '🐦 Twitter / X'],
    unknown:   ['badge-unknown',   '🌐 Unknown'],
  };
  const [cls, label] = map[platform] || map.unknown;
  return `<span class="platform-badge ${cls}">${label}</span>`;
}

// =============================================
// FORMATTING UTILITIES
// =============================================

/** Format large numbers (1.2K, 4.5M, etc.) */
function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

/** Generate a simulated file size string */
function randomSize(type) {
  if (type === 'audio') return (Math.random() * 8 + 2).toFixed(1) + ' MB';
  return (Math.random() * 60 + 5).toFixed(1) + ' MB';
}

// =============================================
// BUILD DOWNLOAD BUTTONS
// =============================================

function buildButtons(result, type) {
  const container = document.getElementById('dlButtons');
  container.innerHTML = '';

  const { videoUrl, audioUrl } = result;

  if ((type === 'both' || type === 'video') && videoUrl) {
    const btn = document.createElement('a');
    btn.href = videoUrl;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.className = 'dl-btn video-btn';
    btn.innerHTML = `
      <div class="dl-btn-icon icon-video">📹</div>
      <div class="dl-btn-info">
        <div class="dl-btn-name">Download Video (MP4)</div>
        <div class="dl-btn-sub">No Watermark · HD Quality</div>
      </div>
      <div class="dl-btn-arrow">→</div>
    `;
    container.appendChild(btn);
  }

  if ((type === 'both' || type === 'audio') && audioUrl) {
    const btn = document.createElement('a');
    btn.href = audioUrl;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.className = 'dl-btn audio-btn';
    btn.innerHTML = `
      <div class="dl-btn-icon icon-audio">🎵</div>
      <div class="dl-btn-info">
        <div class="dl-btn-name">Download Audio (MP3)</div>
        <div class="dl-btn-sub">128kbps · Audio Only</div>
      </div>
      <div class="dl-btn-arrow">→</div>
    `;
    container.appendChild(btn);
  }

  if (container.innerHTML === '') {
    container.innerHTML = `
      <div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">
        ⚠️ Tidak ada media yang tersedia untuk tipe ini.
      </div>`;
  }
}

// =============================================
// API: ALL IN ONE DOWNLOADER — alip.clutch
// =============================================

async function fetchAIO(url) {
  const apiUrl = `https://docs-alip.clutch.web.id/download/aio?apikey=alipaiapikeybaru&url=${encodeURIComponent(url)}`;

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();

  if (!data.status || !data.result || !data.result.medias || data.result.medias.length === 0) {
    throw new Error(`Gagal mengambil media dari ${data.result?.source || 'platform ini'}`);
  }

  const result = data.result;

  let videoUrl = null;
  let audioUrl = null;

  for (let media of result.medias) {
    if (media.type === 'video' && !videoUrl) videoUrl = media.url;
    if (media.type === 'audio' && !audioUrl) audioUrl = media.url;
  }

  return {
    filename: `${(result.source || 'media').toLowerCase()}_${Date.now()}.mp4`,
    size:     randomSize('video'),
    author:   result.author  || '—',
    title:    result.title   || '—',
    videoUrl,
    audioUrl,
    stats:    null,
  };
}

// =============================================
// MAIN FETCH HANDLER
// =============================================

async function fetchMedia() {
  const url = document.getElementById('urlInput').value.trim();

  if (!url)                      { showToast('⚠ Masukkan link dulu!'); return; }
  if (!url.startsWith('http'))   { showToast('⚠ Link harus dimulai dengan https://'); return; }

  const platform = detectPlatform(url);

  // Reset UI
  document.getElementById('resultSection').classList.remove('show');
  document.getElementById('fetchBtn').disabled = true;
  setStatus('loading', 'Mengambil info media...');

  try {
    const result = await fetchAIO(url);

    if (!result) throw new Error('Gagal mendapatkan media.');
    currentResult = result;

    // Fill info cards
    document.getElementById('infoFilename').textContent = result.filename || 'media_file';
    document.getElementById('infoSize').textContent     = result.size     || '~';
    document.getElementById('infoPlatform').innerHTML   = platformBadge(platform);
    document.getElementById('infoAuthor').textContent   = result.author   || '—';
    document.getElementById('infoTitle').textContent    = result.title    || '—';

    // Stats
    if (result.stats) {
      document.getElementById('statsGrid').style.display = 'grid';
      document.getElementById('statLike').textContent    = fmtNum(result.stats.likes);
      document.getElementById('statComment').textContent = fmtNum(result.stats.comment);
      document.getElementById('statShare').textContent   = fmtNum(result.stats.share);
      document.getElementById('statView').textContent    = fmtNum(result.stats.views);
    } else {
      document.getElementById('statsGrid').style.display = 'none';
    }

    // Build download buttons
    buildButtons(result, selectedType);

    // Show result section
    document.getElementById('resultSection').classList.add('show');
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStatus('', '');

  } catch (err) {
    console.error(err);
    setStatus('error', '❌ ' + (err.message || 'Gagal mengambil media. Coba lagi.'));
  } finally {
    document.getElementById('fetchBtn').disabled = false;
  }
}


// =============================================
// THREE-DOT MENU
// =============================================

function toggleMenu() {
  const menu = document.getElementById('dropdownMenu');
  menu.classList.toggle('open');
}

// Close menu when clicking outside
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('headerMenuWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('dropdownMenu').classList.remove('open');
  }
});

// =============================================
// FEATURE MODAL
// =============================================

const API_BASE   = 'https://docs-alip.clutch.web.id'; // global.apialip dari settings.js
const API_KEY    = 'alipaiapikeybaru'; // global.apikeyalip dari settings.js

// ── Bot WA Sticker API (sticker-api.js di server bot kamu) ──
// Ganti BOT_API_URL ke URL/IP server bot kamu, misal:
//   - Local  : 'http://localhost:3001'
//   - VPS    : 'http://123.456.789.0:3001'
//   - Domain : 'https://api.botmu.com'
const BOT_API_URL    = 'http://localhost:3001'; // ganti ke IP/domain VPS kamu kalau bukan lokal
const BOT_API_SECRET = 'alip-ai'; // sama dengan global.botSecretKey di settings.js

// =============================================
// WA SETTINGS (Fonnte)
// =============================================

function getWaSettings() {
  return {
    token: localStorage.getItem('fonnte_token') || '',
    phone: localStorage.getItem('wa_phone') || '',
  };
}

function saveWaSettings(token, phone) {
  localStorage.setItem('fonnte_token', token.trim());
  localStorage.setItem('wa_phone', phone.trim().replace(/\D/g, ''));
}

function openWaSettings() {
  document.getElementById('dropdownMenu').classList.remove('open');
  const modal = document.getElementById('featModal');
  const overlay = document.getElementById('featModalOverlay');
  const title = document.getElementById('featModalTitle');
  const body  = document.getElementById('featModalBody');
  const s = getWaSettings();

  title.textContent = '⚙️ Pengaturan WA Bot';
  body.innerHTML = `
    <div class="feat-label">TOKEN FONNTE</div>
    <input type="text" class="feat-input" id="settFonnteToken" placeholder="Token Fonnte kamu..." value="${s.token}" style="margin-bottom:12px;">
    <div class="feat-label">NOMOR WA KAMU (tujuan stiker)</div>
    <input type="text" class="feat-input" id="settWaPhone" placeholder="628xxxxxxxxxx (tanpa +)" value="${s.phone}" style="margin-bottom:4px;">
    <div style="font-size:11px;color:var(--muted);margin-bottom:16px;">
      Contoh: <b>628123456789</b> &nbsp;·&nbsp; Daftar token gratis di <a href="https://fonnte.com" target="_blank" style="color:#7c3aed;">fonnte.com</a>
    </div>
    <button class="feat-btn" onclick="saveWaSettingsFromModal()">💾 Simpan Pengaturan</button>
    <div class="feat-status" id="settStatus"></div>
  `;
  overlay.classList.add('open');
  modal.classList.add('open');
}

function saveWaSettingsFromModal() {
  const token = document.getElementById('settFonnteToken').value;
  const phone = document.getElementById('settWaPhone').value;
  const status = document.getElementById('settStatus');
  if (!token || !phone) {
    status.textContent = '⚠️ Isi token dan nomor WA dulu!';
    status.className = 'feat-status error';
    return;
  }
  saveWaSettings(token, phone);
  status.textContent = '✅ Tersimpan! Sekarang stiker Brat & Stiker akan langsung dikirim ke WA kamu.';
  status.className = 'feat-status';
}

// ── Kirim stiker ke WA via Fonnte ──
async function sendStickerToWA(blobOrUrl, statusEl) {
  const s = getWaSettings();
  if (!s.token || !s.phone) {
    return { ok: false, msg: '⚙️ <a href="#" onclick="openWaSettings();return false;" style="color:#7c3aed;">Atur token Fonnte & nomor WA</a> dulu di menu ⋮' };
  }

  statusEl.innerHTML = '⏳ Mengirim stiker ke WA...';

  try {
    // Upload ke catbox dulu agar dapat URL publik
    let fileUrl;
    if (typeof blobOrUrl === 'string') {
      fileUrl = blobOrUrl;
    } else {
      fileUrl = await uploadImageToCatbox(blobOrUrl);
    }

    const form = new FormData();
    form.append('target', s.phone);
    form.append('message', fileUrl);
    form.append('type', 'sticker');

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': s.token },
      body: form,
    });

    const data = await res.json();
    if (data.status === true) {
      return { ok: true };
    } else {
      return { ok: false, msg: '❌ Fonnte: ' + (data.reason || data.message || 'gagal kirim') };
    }
  } catch (err) {
    return { ok: false, msg: '❌ Error kirim WA: ' + err.message };
  }
}

function openFeature(type) {
  document.getElementById('dropdownMenu').classList.remove('open');
  const modal = document.getElementById('featModal');
  const overlay = document.getElementById('featModalOverlay');
  const title = document.getElementById('featModalTitle');
  const body  = document.getElementById('featModalBody');

  if (type === 'brat') {
    const ws = getWaSettings();
    const waNote = ws.token && ws.phone
      ? `<div style="font-size:11px;color:#22c55e;margin-bottom:12px;">✅ WA terhubung · stiker dikirim ke <b>${ws.phone}</b></div>`
      : `<div style="font-size:11px;color:var(--muted);margin-bottom:12px;">⚙️ Belum atur WA? <a href="#" onclick="openWaSettings();return false;" style="color:#7c3aed;">Atur sekarang</a> biar stiker langsung ke WA.</div>`;
    title.textContent = '🅱️ Brat Generator';
    body.innerHTML = `
      ${waNote}
      <div class="feat-label">MASUKKAN TEKS</div>
      <textarea class="feat-input" id="bratText" rows="3" placeholder="Ketik teks brat kamu..."></textarea>
      <div class="feat-label">PILIH TEMA</div>
      <select class="feat-input" id="bratTheme" style="margin-bottom:16px;">
        <option value="biasa">Brat Biasa (Hijau)</option>
        <option value="hd">Brat HD</option>
        <option value="pink">Brat Pink</option>
      </select>
      <button class="feat-btn" onclick="runBrat()">✨ Generate & Kirim ke WA</button>
      <div class="feat-status" id="bratStatus"></div>
      <div id="bratResult"></div>
    `;
  } else if (type === 'iqc') {
    title.textContent = '📱 iPhone Quoted Chat';
    body.innerHTML = `
      <div class="feat-label">TEKS PESAN</div>
      <textarea class="feat-input" id="iqcText" rows="3" placeholder="Isi pesan yang ingin ditampilkan..."></textarea>
      <div class="feat-label">UPLOAD FOTO PROFIL (opsional)</div>
      <div class="feat-upload-area" id="iqcUploadArea">
        <div class="feat-upload-icon">🖼️</div>
        <div class="feat-upload-text">Tap untuk pilih gambar</div>
        <div class="feat-upload-name" id="iqcFileName"></div>
        <input type="file" accept="image/*" id="iqcImageInput" onchange="previewIqcFile(this)">
      </div>
      <button class="feat-btn" onclick="runIqc()">📱 Generate IQC</button>
      <div class="feat-status" id="iqcStatus"></div>
      <div id="iqcResult"></div>
    `;
  } else if (type === 'sticker') {
    const ws2 = getWaSettings();
    const waNote2 = ws2.token && ws2.phone
      ? `<div style="font-size:11px;color:#22c55e;margin-bottom:12px;">✅ WA terhubung · stiker dikirim ke <b>${ws2.phone}</b></div>`
      : `<div style="font-size:11px;color:var(--muted);margin-bottom:12px;">⚙️ Belum atur WA? <a href="#" onclick="openWaSettings();return false;" style="color:#7c3aed;">Atur sekarang</a> biar stiker langsung ke WA.</div>`;
    title.textContent = '🎨 Jadi Stiker WA';
    body.innerHTML = `
      ${waNote2}
      <div class="feat-label">UPLOAD GAMBAR / VIDEO (maks 15 detik)</div>
      <div class="feat-upload-area" id="stickerUploadArea">
        <div class="feat-upload-icon">🖼️</div>
        <div class="feat-upload-text">Tap untuk pilih gambar atau video</div>
        <div class="feat-upload-name" id="stickerFileName"></div>
        <input type="file" accept="image/*,video/*" id="stickerInput" onchange="previewStickerFile(this)">
      </div>
      <div class="feat-label">NAMA PACK STIKER (opsional)</div>
      <input type="text" class="feat-input" id="stickerPack" placeholder="Nama pack stiker kamu..." style="margin-bottom:16px;">
      <button class="feat-btn" onclick="runSticker()">🎨 Buat & Kirim ke WA</button>
      <div class="feat-status" id="stickerStatus"></div>
      <div id="stickerResult"></div>
    `;
  }

  overlay.classList.add('open');
  modal.classList.add('open');
}

function closeFeatModal() {
  document.getElementById('featModal').classList.remove('open');
  document.getElementById('featModalOverlay').classList.remove('open');
}

function previewIqcFile(input) {
  const file = input.files[0];
  if (file) document.getElementById('iqcFileName').textContent = '✅ ' + file.name;
}

function previewStickerFile(input) {
  const file = input.files[0];
  if (file) document.getElementById('stickerFileName').textContent = '✅ ' + file.name;
}

// ── Upload image to imgbb (free, no key needed via allorigins proxy) or catbox ──
async function uploadImageToCatbox(file) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', file);
  const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload gagal');
  const url = await res.text();
  if (!url.startsWith('http')) throw new Error('Upload gagal: ' + url);
  return url.trim();
}

// ── BRAT ──
async function runBrat() {
  const text  = document.getElementById('bratText').value.trim();
  const theme = document.getElementById('bratTheme').value;
  const status = document.getElementById('bratStatus');
  const result = document.getElementById('bratResult');

  if (!text) { status.textContent = '⚠️ Masukkan teks dulu!'; status.className = 'feat-status error'; return; }

  status.textContent = '⏳ Membuat brat...';
  status.className   = 'feat-status';
  result.innerHTML   = '';
  document.querySelector('.feat-btn').disabled = true;

  try {
    let apiUrl;
    if (theme === 'hd') {
      const now   = new Date();
      const time  = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
      apiUrl = `${API_BASE}/imagecreator/brat?apikey=${API_KEY}&text=${encodeURIComponent(text)}&timestamp=${Date.now()}&emojiType=ios&statusBarTime=${encodeURIComponent(time)}&signal=5G&battery=100%25&carrier=TELKOMSEL&hd=true`;
    } else if (theme === 'pink') {
      apiUrl = `https://api.nekorinn.my.id/maker/brat?text=${encodeURIComponent(text)}&theme=pink`;
    } else {
      apiUrl = `${API_BASE}/imagecreator/bratv?apikey=${API_KEY}&text=${encodeURIComponent(text)}`;
    }

    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const imgBlob = await res.blob();
    const imgUrl = URL.createObjectURL(imgBlob);

    // Konversi gambar ke stiker via API
    status.textContent = '⏳ Mengonversi ke stiker...';
    let stickerUrl = imgUrl;
    let stickerBlob = imgBlob;
    try {
      const uploadedUrl = await uploadImageToCatbox(imgBlob);
      const stickerApi = `${API_BASE}/imagecreator/tosticker?apikey=${API_KEY}&url=${encodeURIComponent(uploadedUrl)}&packname=YannDownloader`;
      const stickerRes = await fetch(stickerApi);
      if (stickerRes.ok) {
        stickerBlob = await stickerRes.blob();
        stickerUrl  = URL.createObjectURL(stickerBlob);
      }
    } catch (_) { /* pakai imgBlob jika gagal konversi */ }

    status.textContent = '✅ Brat berhasil dibuat!';
    result.innerHTML = `
      <div class="feat-result">
        <img src="${imgUrl}" alt="brat">
        <div class="feat-result-actions">
          <a class="feat-result-btn" href="${imgUrl}" download="brat_${Date.now()}.png">⬇️ Simpan</a>
          <button class="feat-result-btn wa-btn" onclick="sendBratToWA()" id="bratSendBtn">📲 Kirim ke WA</button>
        </div>
        <div class="feat-status" id="bratWaStatus"></div>
      </div>`;

    // Simpan blob untuk dikirim ke WA
    window._bratStickerBlob = stickerBlob;

    // Auto kirim jika settings sudah ada
    const s = getWaSettings();
    if (s.token && s.phone) {
      sendBratToWA();
    }

  } catch (e) {
    status.textContent = '❌ Gagal: ' + e.message;
    status.className   = 'feat-status error';
  } finally {
    document.querySelector('.feat-btn') && (document.querySelector('#featModalBody .feat-btn').disabled = false);
  }
}

async function sendBratToWA() {
  const waStatus = document.getElementById('bratWaStatus');
  const btn = document.getElementById('bratSendBtn');
  if (!waStatus) return;
  if (btn) btn.disabled = true;
  waStatus.textContent = '⏳ Mengirim ke WA...';
  waStatus.className = 'feat-status';

  const blob = window._bratStickerBlob;
  if (!blob) { waStatus.textContent = '❌ Stiker belum siap'; return; }

  const r = await sendStickerToWA(blob, waStatus);
  if (r.ok) {
    waStatus.innerHTML = '✅ Stiker berhasil dikirim ke WA kamu!';
  } else {
    waStatus.innerHTML = r.msg;
    waStatus.className = 'feat-status error';
    if (btn) btn.disabled = false;
  }
}

// ── IQC ──
async function runIqc() {
  const text   = document.getElementById('iqcText').value.trim();
  const file   = document.getElementById('iqcImageInput').files[0];
  const status = document.getElementById('iqcStatus');
  const result = document.getElementById('iqcResult');

  if (!text) { status.textContent = '⚠️ Masukkan teks pesan dulu!'; status.className = 'feat-status error'; return; }

  status.textContent = '⏳ Membuat IQC...';
  status.className   = 'feat-status';
  result.innerHTML   = '';

  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 3600000);
  const time = wib.getUTCHours().toString().padStart(2,'0') + ':' + wib.getUTCMinutes().toString().padStart(2,'0');

  try {
    let imageUrl = null;
    if (file) {
      status.textContent = '⏳ Mengupload gambar...';
      imageUrl = await uploadImageToCatbox(file);
    }

    let apiUrl = `${API_BASE}/imagecreator/iqc?apikey=${API_KEY}&time=${encodeURIComponent(time)}&text=${encodeURIComponent(text)}`;
    if (imageUrl) apiUrl += `&imageUrl=${encodeURIComponent(imageUrl)}`;

    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const blob = await res.blob();
    const imgUrl = URL.createObjectURL(blob);

    status.textContent = '✅ IQC berhasil dibuat!';
    result.innerHTML = `
      <div class="feat-result">
        <img src="${imgUrl}" alt="iqc">
        <div class="feat-result-actions">
          <a class="feat-result-btn" href="${imgUrl}" download="iqc_${Date.now()}.png">⬇️ Simpan</a>
        </div>
      </div>`;
  } catch (e) {
    status.textContent = '❌ Gagal: ' + e.message;
    status.className   = 'feat-status error';
  }
}

// ── STICKER ──
// ── Cek apakah Bot API aktif ──
async function checkBotApi() {
  try {
    const res = await fetch(`${BOT_API_URL}/api/sticker/status`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.ok === true;
  } catch (_) {
    return false;
  }
}

// ── Kirim stiker via Bot WA (sticker-api.js) ──
async function sendStickerViaBot(file, target, pack, statusEl) {
  statusEl.innerHTML = '⏳ Mengirim ke bot WA...';

  const form = new FormData();
  form.append('file',   file);
  form.append('target', target.replace(/\D/g, '')); // strip non-digit
  form.append('pack',   pack || 'YannSticker');

  try {
    const res = await fetch(`${BOT_API_URL}/api/sticker`, {
      method:  'POST',
      headers: { 'x-api-secret': BOT_API_SECRET },
      body:    form,
    });
    const data = await res.json();
    if (data.ok) return { ok: true };
    return { ok: false, msg: '❌ Bot error: ' + (data.error || 'gagal kirim') };
  } catch (err) {
    return { ok: false, msg: '❌ Tidak bisa hubungi bot: ' + err.message };
  }
}

// ── STICKER ──
async function runSticker() {
  const file   = document.getElementById('stickerInput').files[0];
  const pack   = document.getElementById('stickerPack').value.trim() || global.packname || 'YannSticker';
  const status = document.getElementById('stickerStatus');
  const result = document.getElementById('stickerResult');

  if (!file) {
    status.textContent = '⚠️ Pilih gambar atau video dulu!';
    status.className = 'feat-status error';
    return;
  }

  // Validasi tipe file
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    status.textContent = '⚠️ File harus berupa gambar atau video!';
    status.className = 'feat-status error';
    return;
  }

  status.textContent = '⏳ Memproses stiker...';
  status.className   = 'feat-status';
  result.innerHTML   = '';

  // ── Cek apakah bot API aktif ──
  const botApiOnline = await checkBotApi();
  const s = getWaSettings();

  if (botApiOnline && s.phone) {
    // ══ MODE 1: Kirim langsung via Bot WA ══
    // Bot yang handle crop, resize, convert → kirim ke WA
    status.textContent = '⏳ Mengirim ke bot WA...';

    const r = await sendStickerViaBot(file, s.phone, pack, status);
    if (r.ok) {
      status.textContent = '✅ Stiker berhasil dikirim ke WA kamu!';
      status.className   = 'feat-status';

      // Tampilkan preview lokal
      const reader = new FileReader();
      reader.onload = (ev) => {
        result.innerHTML = `
          <div class="feat-result">
            <img src="${ev.target.result}" alt="preview" style="max-height:250px;object-fit:contain;background:repeating-conic-gradient(#333 0%25%,#222 0%25% 50%) 0 0/20px 20px;">
            <div style="padding:10px 12px;font-size:13px;color:#22c55e;text-align:center;font-weight:600;">
              ✅ Stiker sudah dikirim ke <b>${s.phone}</b>
            </div>
          </div>`;
      };
      reader.readAsDataURL(file);
      return;
    } else {
      // Bot gagal, fallback ke mode API konversi
      console.warn('[Sticker] Bot API gagal, fallback ke API konversi:', r.msg);
    }
  } else if (!botApiOnline) {
    console.info('[Sticker] Bot API offline, pakai API konversi + Fonnte');
  }

  // ══ MODE 2: Fallback — konversi via API eksternal + kirim Fonnte ══
  let uploadedUrl = null;
  let stickerBlob = null;

  try {
    // Upload ke catbox
    status.textContent = '⏳ Mengupload ke server...';
    uploadedUrl = await uploadImageToCatbox(file);
    if (!uploadedUrl || !uploadedUrl.startsWith('http')) throw new Error('Upload gagal');

    // Konversi ke stiker
    status.textContent = '⏳ Mengkonversi ke stiker WA...';
    const apiUrl = `${API_BASE}/imagecreator/tosticker?apikey=${API_KEY}&url=${encodeURIComponent(uploadedUrl)}&packname=${encodeURIComponent(pack)}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error('Konversi gagal: HTTP ' + res.status);

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || errData.error || 'API error');
    }

    stickerBlob = await res.blob();
    if (!stickerBlob || stickerBlob.size === 0) throw new Error('Stiker kosong dari API');

    const stickerUrl = URL.createObjectURL(stickerBlob);
    status.textContent = '✅ Stiker berhasil dibuat!';
    status.className   = 'feat-status';

    result.innerHTML = `
      <div class="feat-result">
        <img src="${stickerUrl}" alt="sticker" style="max-height:250px;object-fit:contain;background:repeating-conic-gradient(#333 0%25%,#222 0%25% 50%) 0 0/20px 20px;">
        <div class="feat-result-actions">
          <a class="feat-result-btn" href="${stickerUrl}" download="sticker_${Date.now()}.webp">⬇️ Simpan .webp</a>
          <button class="feat-result-btn wa-btn" onclick="sendStickerFromResult()" id="stickerSendBtn">📲 Kirim ke WA</button>
        </div>
        <div class="feat-status" id="stickerWaStatus"></div>
      </div>`;

    window._lastStickerBlob   = stickerBlob;
    window._lastStickerPubUrl = uploadedUrl;

    // Auto kirim via Fonnte jika settings ada
    if (s.token && s.phone) sendStickerFromResult();

  } catch (e) {
    console.error('[Sticker Fallback Error]', e);
    status.className = 'feat-status error';

    if (uploadedUrl) {
      status.textContent = '⚠️ Konversi gagal, mencoba kirim gambar asli...';
      window._lastStickerBlob   = null;
      window._lastStickerPubUrl = uploadedUrl;
      result.innerHTML = `
        <div class="feat-result">
          <img src="${uploadedUrl}" alt="preview" style="max-height:250px;object-fit:contain;">
          <div class="feat-result-actions">
            <a class="feat-result-btn" href="${uploadedUrl}" target="_blank" rel="noopener">⬇️ Buka Gambar</a>
            <button class="feat-result-btn wa-btn" onclick="sendStickerFromResult()" id="stickerSendBtn">📲 Kirim ke WA</button>
          </div>
          <div style="padding:6px 12px 12px;font-size:11px;color:var(--muted);text-align:center;">⚠️ ${e.message}</div>
          <div class="feat-status" id="stickerWaStatus"></div>
        </div>`;
      if (s.token && s.phone) sendStickerFromResult();
    } else {
      status.textContent = '❌ Gagal: ' + e.message;
      try {
        const reader = new FileReader();
        reader.onload = (ev) => {
          result.innerHTML = `
            <div class="feat-result">
              <img src="${ev.target.result}" alt="preview" style="max-height:250px;object-fit:contain;">
              <div style="padding:8px 12px 12px;font-size:11px;color:var(--muted);text-align:center;">
                💡 Upload gagal. Cek koneksi internet lalu coba lagi.
              </div>
            </div>`;
        };
        reader.readAsDataURL(file);
      } catch (_) { /* ignore */ }
    }
  }
}

async function sendStickerFromResult() {
  const waStatus = document.getElementById('stickerWaStatus');
  const btn      = document.getElementById('stickerSendBtn');
  if (!waStatus) return;
  if (btn) btn.disabled = true;

  const blob   = window._lastStickerBlob;
  const pubUrl = window._lastStickerPubUrl;

  if (!blob && !pubUrl) {
    waStatus.textContent = '❌ Stiker belum siap';
    waStatus.className   = 'feat-status error';
    if (btn) btn.disabled = false;
    return;
  }

  const r = await sendStickerToWA(blob || pubUrl, waStatus);
  if (r.ok) {
    waStatus.innerHTML = '✅ Stiker berhasil dikirim ke WA kamu!';
    waStatus.className = 'feat-status';
  } else {
    waStatus.innerHTML = r.msg;
    waStatus.className = 'feat-status error';
    if (btn) btn.disabled = false;
  }
}


document.getElementById('urlInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') fetchMedia();
});
