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
// EVENT LISTENERS
// =============================================

document.getElementById('urlInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') fetchMedia();
});
