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
  try {
    const text = await navigator.clipboard.readText();
    document.getElementById('urlInput').value = text;
    showToast('✅ Link berhasil ditempel!');
  } catch {
    document.getElementById('urlInput').focus();
    showToast('⚠️ Klik input lalu Ctrl+V');
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
// API: TIKTOK — tikwm.com
// =============================================

async function fetchTikTok(url) {
  const tikwmUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;

  try {
    const res  = await fetch(tikwmUrl, { headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();

    if (data.code === 0 && data.data) {
      const d = data.data;

      // Ambil nama uploader selengkap mungkin
      const authorNick   = d.author?.nickname   || '';
      const authorUnique = d.author?.unique_id  || '';
      const authorFull   = d.author?.name       || '';
      const authorLabel  = authorNick
        ? `${authorNick}${authorUnique ? ' (@' + authorUnique + ')' : ''}`
        : authorFull || authorUnique || '—';

      // Ambil judul / deskripsi video
      const videoTitle = d.title || d.desc || d.text || '(tidak ada judul)';

      // Nama file dari unique_id + video id
      const safeId = d.id || Date.now();
      const safeName = authorUnique ? `${authorUnique}_${safeId}` : `tiktok_${safeId}`;

      return {
        filename: `${safeName}.mp4`,
        size:     d.size ? (d.size / 1024 / 1024).toFixed(1) + ' MB' : randomSize('video'),
        author:   authorLabel,
        title:    videoTitle,
        videoUrl: d.hdplay || d.play || null,
        audioUrl: d.music || d.music_info?.play || null,
        stats: {
          likes:   d.digg_count    || 0,
          comment: d.comment_count || 0,
          share:   d.share_count   || 0,
          views:   d.play_count    || 0,
        },
      };
    }
  } catch (e) {
    console.warn('[TikTok API] Gagal:', e);
  }

  // Fallback — API tidak bisa diakses
  throw new Error('Gagal mengambil data dari TikTok. Coba lagi atau pastikan link benar.');
}

// =============================================
// API: OTHER PLATFORMS — cobalt.tools
// =============================================

async function fetchCobalt(url, platform) {
  const apiUrl = 'https://api.cobalt.tools/';

  try {
    const res  = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        downloadMode:  selectedType === 'audio' ? 'audio' : 'auto',
        audioFormat:   'mp3',
        filenameStyle: 'basic',
      }),
    });

    const data = await res.json();
    if (data.status === 'error') throw new Error(data.error?.code || 'Error dari API');

    let videoUrl = null;
    let audioUrl = null;

    if (data.status === 'redirect' || data.status === 'tunnel') {
      if (selectedType === 'audio') audioUrl = data.url;
      else                          videoUrl  = data.url;
    } else if (data.status === 'picker') {
      for (const item of (data.picker || [])) {
        if ((item.type === 'video' || item.type === 'photo') && !videoUrl) videoUrl = item.url;
      }
      if (data.audio) audioUrl = data.audio;
    }

    // Try fetching audio separately for "both" mode
    if (videoUrl && selectedType === 'both' && !audioUrl) {
      try {
        const ares  = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, downloadMode: 'audio', audioFormat: 'mp3', filenameStyle: 'basic' }),
        });
        const adata = await ares.json();
        if (adata.url) audioUrl = adata.url;
      } catch { /* ignore */ }
    }

    // Ekstrak nama file / judul dari URL
    const ext          = selectedType === 'audio' ? 'mp3' : 'mp4';
    const urlObj       = (() => { try { return new URL(url); } catch { return null; } })();
    const pathParts    = urlObj ? urlObj.pathname.split('/').filter(Boolean) : [];
    const baseFilename = pathParts.pop() || pathParts.pop() || 'media';
    const cleanName    = decodeURIComponent(baseFilename).slice(0, 40).replace(/[^a-zA-Z0-9_\-]/g, '_');

    // Coba ambil judul dari cobalt response atau URL
    const videoTitle = data.title || data.filename || cleanName || `${platformLabel(platform)} Video`;

    // Uploader: coba ambil dari URL path (misal username Instagram/YouTube)
    let authorName = platformLabel(platform);
    if (urlObj) {
      if (platform === 'instagram') {
        // instagram.com/p/... atau instagram.com/username/...
        const igMatch = urlObj.pathname.match(/^\/([^/]+)\//);
        if (igMatch && igMatch[1] !== 'p' && igMatch[1] !== 'reel') authorName = igMatch[1];
      } else if (platform === 'youtube') {
        // youtube.com/@username atau /c/name
        const ytMatch = urlObj.pathname.match(/^\/@?([^/]+)/);
        if (ytMatch) authorName = ytMatch[1];
      } else if (platform === 'twitter') {
        // twitter.com/username/status/...
        const twMatch = urlObj.pathname.match(/^\/([^/]+)\//);
        if (twMatch) authorName = '@' + twMatch[1];
      } else if (platform === 'facebook') {
        // facebook.com/username/videos/...
        const fbMatch = urlObj.pathname.match(/^\/([^/]+)\//);
        if (fbMatch && fbMatch[1] !== 'watch') authorName = fbMatch[1];
      }
    }

    return {
      filename: `${platform}_${cleanName}.${ext}`,
      size:     randomSize(selectedType),
      author:   authorName,
      title:    videoTitle,
      videoUrl,
      audioUrl,
      stats:    null,
    };

  } catch (err) {
    console.warn('[Cobalt API] Gagal:', err);
    throw new Error('Gagal mengambil media. Coba lagi atau pastikan link benar.');
  }
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
    let result = null;

    if (platform === 'tiktok') {
      result = await fetchTikTok(url);
    } else {
      result = await fetchCobalt(url, platform);
    }

    if (!result) throw new Error('Gagal mendapatkan media.');
    currentResult = result;

    // Fill info cards
    document.getElementById('infoFilename').textContent = result.filename || 'media_file';
    document.getElementById('infoSize').textContent     = result.size     || '~';
    document.getElementById('infoPlatform').innerHTML   = platformBadge(platform);
    document.getElementById('infoAuthor').textContent   = result.author   || '—';
    document.getElementById('infoTitle').textContent    = result.title    || '—';

    // Stats (TikTok only)
    if (result.stats && platform === 'tiktok') {
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
