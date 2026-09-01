/**
 * Recently Added Media Card v2.0.1
 * A unified Home Assistant Lovelace card combining Plex, Kodi, Jellyfin, and Emby
 * recently-added views into one card with a server type selector.
 *
 * Features:
 *  - Server type selector (plex / kodi / jellyfin / emby) with dynamic config fields
 *  - Inline trailer playback inside the card using YouTube IFrame API
 *  - Themed accents per server type + selectable color presets
 *  - Touch swipe left/right to navigate the carousel
 *  - Custom visual editor (getConfigElement)
 */

// ─── Theme definitions ────────────────────────────────────────────────────────

const THEMES = {
  // Server type defaults (used when theme = 'auto')
  plex:     { primary: '#e5a00d', secondary: '#5b9bd5', bg: '#1a1a1a' },
  kodi:     { primary: '#17b2e8', secondary: '#e5a00d', bg: '#1a1a1a' },
  jellyfin: { primary: '#aa5cc3', secondary: '#5b9bd5', bg: '#1a1a1a' },
  emby:     { primary: '#52b54b', secondary: '#e5a00d', bg: '#1a1a1a' },
  // Named presets
  dark:     { primary: '#aaaaaa', secondary: '#888888', bg: '#141414' },
  midnight: { primary: '#4f8ef7', secondary: '#6ec6f5', bg: '#0d1117' },
  sunset:   { primary: '#f97316', secondary: '#ef4444', bg: '#1c1008' },
  forest:   { primary: '#22c55e', secondary: '#16a34a', bg: '#0d1a10' },
};

function getTheme(serverType, themeOverride) {
  const key = (themeOverride && themeOverride !== 'auto') ? themeOverride : serverType;
  return THEMES[key] || THEMES['plex'];
}

function escapeAttr(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

// ─── Logo SVGs ────────────────────────────────────────────────────────────────

const LOGOS = {
  plex: (color) => `<svg class="server-logo" xmlns="http://www.w3.org/2000/svg" viewBox="148 70 216 372" aria-label="Plex">
    <path fill="${color}" d="M256 70H148l108 186-108 186h108l108-186z"/>
  </svg>`,

  kodi: () => `<svg class="server-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-label="Kodi">
    <path fill="#17b2e8" d="M12.03.047c-.226 0-.452.107-.669.324-.922.922-1.842 1.845-2.763 2.768-.233.233-.455.48-.703.695-.31.267-.405.583-.399.988.02 1.399.008 2.799.008 4.198 0 1.453-.002 2.907 0 4.36 0 .11.002.223.03.327.087.337.303.393.546.15 1.31-1.31 2.618-2.622 3.928-3.933l4.449-4.453c.43-.431.43-.905 0-1.336L12.697.37c-.216-.217-.442-.324-.668-.324zm7.224 7.23c-.223 0-.445.104-.65.309L14.82 11.37c-.428.429-.427.895 0 1.322l3.76 3.766c.44.44.908.44 1.346.002 1.215-1.216 2.427-2.433 3.644-3.647.182-.18.353-.364.43-.615v-.33c-.077-.251-.246-.436-.428-.617-1.224-1.22-2.443-2.445-3.666-3.668-.205-.205-.429-.307-.652-.307zM4.18 7.611c-.086.014-.145.094-.207.157L.209 11.572c-.28.284-.278.677.004.96l2.043 2.046c.59.59 1.177 1.182 1.767 1.772.169.168.33.139.416-.084.044-.114.062-.242.063-.364.004-1.283.004-2.567.004-3.851h-.002V8.184c0-.085-.01-.169-.022-.252-.019-.135-.072-.258-.207-.309a.186.186 0 0 0-.095-.012zm7.908 6.838c-.224 0-.447.106-.656.315L7.66 18.537c-.433.434-.433.899.002 1.334 1.215 1.216 2.43 2.43 3.643 3.649.18.18.361.354.611.433h.33c.244-.069.423-.226.598-.402 1.222-1.23 2.45-2.453 3.676-3.68.43-.43.427-.905-.004-1.338l-3.772-3.773c-.208-.208-.432-.311-.656-.31z"/>
  </svg>`,

  jellyfin: () => `<svg class="server-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-label="Jellyfin">
    <path fill="#aa5cc3" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
  </svg>`,

  emby: () => `<svg class="server-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-label="Emby">
    <rect width="32" height="32" rx="7" fill="#52B54B"/>
    <path d="M9 10h14v3H13v2.5h9v3h-9V21h10v3H9V10z" fill="#fff"/>
  </svg>`,
};

function getLogoSvg(serverType, themeColor) {
  if (serverType === 'plex') return LOGOS.plex(themeColor);
  if (serverType === 'kodi') return LOGOS.kodi();
  if (serverType === 'jellyfin') return LOGOS.jellyfin();
  if (serverType === 'emby') return LOGOS.emby();
  return LOGOS.plex(themeColor);
}

// ─── Custom Editor ────────────────────────────────────────────────────────────

class RecentlyAddedMediaCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  get _hass() { return this.__hass; }
  set hass(hass) { this.__hass = hass; }

  _render() {
    const cfg = this._config;
    const serverType = cfg.server_type || 'plex';
    const theme = cfg.theme || 'auto';
    const sortOrder = cfg.sort_order || 'interleaved';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; font-family: var(--primary-font-family, sans-serif); }
        .editor { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
        .field-row { display: flex; flex-direction: column; gap: 4px; }
        .field-row label { font-size: 12px; font-weight: 600; color: var(--secondary-text-color, #888); text-transform: uppercase; letter-spacing: 0.05em; }
        .field-row select,
        .field-row input { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid var(--divider-color, #ddd); background: var(--card-background-color, #fff); color: var(--primary-text-color, #333); font-size: 14px; box-sizing: border-box; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .helper { font-size: 11px; color: var(--secondary-text-color, #999); margin-top: 2px; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--secondary-text-color, #aaa); border-bottom: 1px solid var(--divider-color, #eee); padding-bottom: 4px; margin-top: 4px; }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; }
        .toggle-row span { font-size: 13px; color: var(--primary-text-color, #333); }
        input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
      </style>
      <div class="editor">
        <div class="section-title">Server</div>

        <div class="field-row">
          <label>Server Type</label>
          <select id="server_type">
            <option value="plex"     ${serverType === 'plex'     ? 'selected' : ''}>Plex</option>
            <option value="kodi"     ${serverType === 'kodi'     ? 'selected' : ''}>Kodi</option>
            <option value="jellyfin" ${serverType === 'jellyfin' ? 'selected' : ''}>Jellyfin</option>
            <option value="emby"     ${serverType === 'emby'     ? 'selected' : ''}>Emby</option>
          </select>
        </div>

        <!-- Plex fields -->
        <div id="plex-fields" style="display:${serverType === 'plex' ? 'contents' : 'none'}">
          <div class="field-row">
            <label>Plex Server URL</label>
            <input type="text" id="plex_url" placeholder="http://192.168.1.100:32400" value="${escapeAttr(cfg.plex_url)}">
            <span class="helper">e.g. http://192.168.1.100:32400</span>
          </div>
          <div class="field-row">
            <label>Plex Token</label>
            <input type="password" id="plex_token" value="${escapeAttr(cfg.plex_token)}">
            <span class="helper">Settings → Troubleshooting → XML URL (X-Plex-Token param)</span>
          </div>
        </div>

        <!-- Kodi fields -->
        <div id="kodi-fields" style="display:${serverType === 'kodi' ? 'contents' : 'none'}">
          <div class="field-row">
            <label>Kodi URL</label>
            <input type="text" id="kodi_url" placeholder="http://192.168.1.100:8080" value="${escapeAttr(cfg.kodi_url)}">
            <span class="helper">e.g. http://192.168.1.100:8080</span>
          </div>
          <div class="grid-2">
            <div class="field-row">
              <label>Kodi Username</label>
              <input type="text" id="kodi_username" placeholder="kodi" value="${escapeAttr(cfg.kodi_username)}">
            </div>
            <div class="field-row">
              <label>Kodi Password</label>
              <input type="password" id="kodi_password" value="${escapeAttr(cfg.kodi_password)}">
            </div>
          </div>
        </div>

        <!-- Jellyfin fields -->
        <div id="jellyfin-fields" style="display:${serverType === 'jellyfin' ? 'contents' : 'none'}">
          <div class="field-row">
            <label>Jellyfin URL</label>
            <input type="text" id="jellyfin_url" placeholder="http://192.168.1.100:8096" value="${escapeAttr(cfg.jellyfin_url)}">
            <span class="helper">e.g. http://192.168.1.100:8096</span>
          </div>
          <div class="field-row">
            <label>Jellyfin API Key</label>
            <input type="password" id="jellyfin_api_key" value="${escapeAttr(cfg.jellyfin_api_key)}">
          </div>
          <div class="field-row">
            <label>Jellyfin User ID</label>
            <input type="text" id="jellyfin_user_id" placeholder="Leave blank to auto-detect" value="${escapeAttr(cfg.jellyfin_user_id)}">
            <span class="helper">Optional — auto-detected if blank</span>
          </div>
        </div>

        <!-- Emby fields -->
        <div id="emby-fields" style="display:${serverType === 'emby' ? 'contents' : 'none'}">
          <div class="field-row">
            <label>Emby URL</label>
            <input type="text" id="emby_url" placeholder="http://192.168.1.100:8096" value="${escapeAttr(cfg.emby_url)}">
            <span class="helper">e.g. http://192.168.1.100:8096</span>
          </div>
          <div class="field-row">
            <label>Emby API Key</label>
            <input type="password" id="emby_api_key" value="${escapeAttr(cfg.emby_api_key)}">
            <span class="helper">Emby Dashboard → Advanced → API Keys</span>
          </div>
          <div class="field-row">
            <label>Emby User ID</label>
            <input type="text" id="emby_user_id" placeholder="Leave blank to auto-detect" value="${escapeAttr(cfg.emby_user_id)}">
            <span class="helper">Optional — auto-detected if blank</span>
          </div>
        </div>

        <div class="section-title">Content</div>
        <div class="grid-2">
          <div class="field-row">
            <label>Movies Count</label>
            <input type="number" id="movies_count" min="1" max="20" value="${escapeAttr(cfg.movies_count !== undefined ? cfg.movies_count : 5)}">
          </div>
          <div class="field-row">
            <label>TV Shows Count</label>
            <input type="number" id="shows_count" min="1" max="20" value="${escapeAttr(cfg.shows_count !== undefined ? cfg.shows_count : 5)}">
          </div>
        </div>
        <div class="field-row">
          <label>Item Order</label>
          <select id="sort_order">
            <option value="interleaved" ${sortOrder === 'interleaved' ? 'selected' : ''}>Alternate movies and TV shows</option>
            <option value="recent" ${sortOrder === 'recent' ? 'selected' : ''}>Newest added first</option>
          </select>
          <span class="helper">Newest first sorts movies and TV shows together by their added date.</span>
        </div>
        <div class="grid-2">
          <div class="field-row">
            <label>Cycle Interval (seconds)</label>
            <input type="number" id="cycle_interval" min="0" max="60" value="${escapeAttr(cfg.cycle_interval !== undefined ? cfg.cycle_interval : 8)}">
            <span class="helper">Set to 0 to disable auto-advance.</span>
          </div>
          <div class="field-row">
            <label>Card Title</label>
            <input type="text" id="title" value="${escapeAttr(cfg.title !== undefined ? cfg.title : 'Recently Added')}">
          </div>
        </div>

        <div class="section-title">Appearance</div>
        <div class="field-row">
          <label>Theme</label>
          <select id="theme">
            <option value="auto"     ${theme === 'auto'     ? 'selected' : ''}>Auto (server default)</option>
            <option value="plex"     ${theme === 'plex'     ? 'selected' : ''}>Plex Gold</option>
            <option value="kodi"     ${theme === 'kodi'     ? 'selected' : ''}>Kodi Blue</option>
            <option value="jellyfin" ${theme === 'jellyfin' ? 'selected' : ''}>Jellyfin Purple</option>
            <option value="emby"     ${theme === 'emby'     ? 'selected' : ''}>Emby Green</option>
            <option value="dark"     ${theme === 'dark'     ? 'selected' : ''}>Dark Grey</option>
            <option value="midnight" ${theme === 'midnight' ? 'selected' : ''}>Midnight Blue</option>
            <option value="sunset"   ${theme === 'sunset'   ? 'selected' : ''}>Sunset Orange</option>
            <option value="forest"   ${theme === 'forest'   ? 'selected' : ''}>Forest Green</option>
          </select>
        </div>
        <div class="toggle-row">
          <span>Fill Container Height</span>
          <input type="checkbox" id="fill_height" ${cfg.fill_height !== false ? 'checked' : ''}>
        </div>
        <div class="field-row">
          <label>Card Height (px, when Fill Height is off)</label>
          <input type="number" id="card_height" min="200" max="800" value="${escapeAttr(cfg.card_height || 300)}">
          <span class="helper">Default: 300</span>
        </div>

        <div class="toggle-row">
          <span>Mobile Scaling (for phone screens)</span>
          <input type="checkbox" id="mobile_mode" ${cfg.mobile_mode ? 'checked' : ''}>
        </div>
        <span class="helper">When enabled, scales down the layout on narrow screens.</span>

        <div class="toggle-row">
          <span>Poster Shimmer Animation</span>
          <input type="checkbox" id="show_shimmer" ${cfg.show_shimmer ? 'checked' : ''}>
        </div>
        <span class="helper">Adds a glossy sweep animation across poster art. Off by default to avoid GPU flash on tablets.</span>

        <div class="section-title">Trailers</div>
        <div class="field-row">
          <label>TMDB API Key (for trailers)</label>
          <input type="password" id="tmdb_api_key" value="${escapeAttr(cfg.tmdb_api_key)}">
          <span class="helper">Optional — get a free Bearer token at themoviedb.org</span>
        </div>
        <div class="field-row">
          <label>Trailer Mode</label>
          <select id="trailer_mode">
            <option value="inline" ${(cfg.trailer_mode || 'inline') === 'inline' ? 'selected' : ''}>Inline (on card)</option>
            <option value="popup" ${cfg.trailer_mode === 'popup' ? 'selected' : ''}>Popup (fullscreen)</option>
          </select>
          <span class="helper">Inline plays on top of the card. Popup opens a fullscreen overlay.</span>
        </div>
      </div>
    `;

    // Wire up change handlers
    this._bindEvents();
  }

  _bindEvents() {
    const root = this.shadowRoot;

    // Server type changes — show/hide server-specific fields
    const serverTypeSel = root.getElementById('server_type');
    if (serverTypeSel) {
      serverTypeSel.addEventListener('change', () => {
        const val = serverTypeSel.value;
        ['plex', 'kodi', 'jellyfin', 'emby'].forEach(t => {
          const el = root.getElementById(t + '-fields');
          if (el) el.style.display = (t === val) ? 'contents' : 'none';
        });
        this._fireChange('server_type', val);
      });
    }

    // Generic input/select handlers
    const fields = [
      'plex_url', 'plex_token',
      'kodi_url', 'kodi_username', 'kodi_password',
      'jellyfin_url', 'jellyfin_api_key', 'jellyfin_user_id',
      'emby_url', 'emby_api_key', 'emby_user_id',
      'movies_count', 'shows_count', 'sort_order', 'cycle_interval', 'title',
      'theme', 'card_height', 'tmdb_api_key', 'trailer_mode',
    ];

    fields.forEach(id => {
      const el = root.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        const val = (el.type === 'number') ? Number(el.value) : el.value;
        this._fireChange(id, val);
      });
    });

    // fill_height checkbox
    const fillEl = root.getElementById('fill_height');
    if (fillEl) {
      fillEl.addEventListener('change', () => {
        this._fireChange('fill_height', fillEl.checked);
      });
    }

    // Checkbox toggles must send their checked state, not el.value (which
    // is always "on" for a checkbox). The generic handler above can't be
    // used for these, or saving silently breaks.
    ['mobile_mode', 'show_shimmer'].forEach(id => {
      const el = root.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          this._fireChange(id, el.checked);
        });
      }
    });
  }

  _fireChange(key, value) {
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('recently-added-media-card-editor', RecentlyAddedMediaCardEditor);

// ─── Main Card ────────────────────────────────────────────────────────────────

class RecentlyAddedMediaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._items = [];
    this._currentIndex = 0;
    this._cycleTimer = null;
    this._config = {};
    this._trailerCache = {};
    this._ytPlayer = null;
    this._trailerActive = false;
    // Touch swipe tracking
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartTime = 0;
    // Jellyfin/Emby user ID cache
    this._userId = null;
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  setConfig(config) {
    const serverType = config.server_type || 'plex';

    // Basic validation per server type
    if (serverType === 'plex') {
      if (!config.plex_url) throw new Error('Please define plex_url');
      if (!config.plex_token) throw new Error('Please define plex_token');
    } else if (serverType === 'kodi') {
      if (!config.kodi_url) throw new Error('Please define kodi_url');
    } else if (serverType === 'jellyfin') {
      if (!config.jellyfin_url) throw new Error('Please define jellyfin_url');
      if (!config.jellyfin_api_key) throw new Error('Please define jellyfin_api_key');
    } else if (serverType === 'emby') {
      if (!config.emby_url) throw new Error('Please define emby_url');
      if (!config.emby_api_key) throw new Error('Please define emby_api_key');
    }

    const prevServerType = this._config.server_type;

    this._config = {
      server_type: serverType,
      movies_count: config.movies_count || 5,
      shows_count: config.shows_count || 5,
      sort_order: config.sort_order || 'interleaved',
      cycle_interval: config.cycle_interval !== undefined ? config.cycle_interval : 8,
      title: config.title !== undefined ? config.title : 'Recently Added',
      theme: config.theme || 'auto',
      show_shimmer: config.show_shimmer || false,
      ...config,
    };

    // Reset userId cache if server type or connection details changed
    if (prevServerType !== serverType) {
      this._userId = null;
      this._trailerCache = {};
      this._items = [];
      this._currentIndex = 0;
    }

    // Apply fixed-height class if fill_height is disabled
    if (this._config.fill_height === false) {
      this.classList.add('fixed-height');
      const h = (this._config.card_height || 300) + 'px';
      this.style.setProperty('--card-fixed-height', h);
    } else {
      this.classList.remove('fixed-height');
    }

    // Apply mobile-scaling class if enabled
    if (this._config.mobile_mode) {
      this.classList.add('mobile-scaling');
    } else {
      this.classList.remove('mobile-scaling');
    }

    this._render();
    this._fetchData();
  }

  set hass(hass) {
    this._hass = hass;
  }

  static getConfigElement() {
    return document.createElement('recently-added-media-card-editor');
  }

  static getStubConfig() {
    return {
      server_type: 'plex',
      plex_url: 'http://192.168.1.100:32400',
      plex_token: 'YOUR_PLEX_TOKEN',
      movies_count: 5,
      shows_count: 5,
      sort_order: 'interleaved',
      cycle_interval: 8,
      title: 'Recently Added',
      theme: 'auto',
      fill_height: true,
      show_shimmer: false,
    };
  }

  getCardSize() {
    return 4;
  }

  // ── Theme helpers ────────────────────────────────────────────────────────────

  _getTheme() {
    return getTheme(this._config.server_type, this._config.theme);
  }

  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '201, 167, 59';
  }

  // ── Image URL helpers ────────────────────────────────────────────────────────

  // Plex
  _plexImageUrl(path, width, height) {
    if (!path) return '';
    const base = (this._config.plex_url || '').replace(/\/$/, '');
    const token = this._config.plex_token;
    return `${base}/photo/:/transcode?width=${width}&height=${height}&minSize=1&url=${encodeURIComponent(path)}&X-Plex-Token=${token}`;
  }

  // Kodi
  _kodiImageUrl(artValue) {
    if (!artValue) return '';
    const base = (this._config.kodi_url || '').replace(/\/$/, '');
    return `${base}/image/${encodeURIComponent(artValue)}`;
  }

  // Jellyfin
  _jellyfinPosterUrl(itemId) {
    const base = (this._config.jellyfin_url || '').replace(/\/$/, '');
    const key = this._config.jellyfin_api_key;
    return `${base}/Items/${itemId}/Images/Primary?maxWidth=400&quality=90&api_key=${key}`;
  }

  _jellyfinBackdropUrl(itemId) {
    const base = (this._config.jellyfin_url || '').replace(/\/$/, '');
    const key = this._config.jellyfin_api_key;
    return `${base}/Items/${itemId}/Images/Backdrop?maxWidth=800&quality=80&api_key=${key}`;
  }

  // Emby
  _embyPosterUrl(itemId) {
    const base = (this._config.emby_url || '').replace(/\/$/, '');
    const key = this._config.emby_api_key;
    return `${base}/Items/${itemId}/Images/Primary?maxWidth=400&quality=90&api_key=${key}`;
  }

  _embyBackdropUrl(itemId) {
    const base = (this._config.emby_url || '').replace(/\/$/, '');
    const key = this._config.emby_api_key;
    return `${base}/Items/${itemId}/Images/Backdrop?maxWidth=800&quality=80&api_key=${key}`;
  }

  // Generic — resolve thumb/art URL based on server type
  _resolveThumbUrl(item) {
    return item.thumb || '';
  }

  _resolveArtUrl(item) {
    return item.art || '';
  }

  // ── Kodi RPC ─────────────────────────────────────────────────────────────────

  _base64Utf8(value) {
    // Encode a Unicode string to base64 using UTF-8 bytes.
    // TextEncoder is available in all modern browsers (Chrome 38+, FF 19+, Edge 79+).
    if (typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(value);
      let binary = '';
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      return btoa(binary);
    }
    // Fallback for very old browsers: encodeURIComponent escapes non-ASCII
    // as %XX sequences, then unescape converts them back to Latin-1 bytes
    // that btoa can encode. This correctly handles all Unicode characters.
    return btoa(unescape(encodeURIComponent(value)));
  }

  _kodiHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const username = this._config.kodi_username || '';
    const password = this._config.kodi_password || '';
    if (username || password) {
      headers['Authorization'] = `Basic ${this._base64Utf8(`${username}:${password}`)}`;
    }
    return headers;
  }

  async _kodiRPC(method, params = {}) {
    const baseUrl = (this._config.kodi_url || '').trim();
    if (!baseUrl) {
      throw new Error('Kodi URL is not configured. Set kodi_url in the card config.');
    }
    // Validate the URL has a protocol — fetch() requires an absolute URL
    if (!/^https?:\/\//i.test(baseUrl)) {
      throw new Error(
        `Kodi URL must start with http:// or https://. Got: "${baseUrl}". ` +
        'If your Kodi is on the same machine as Home Assistant, try http://IP_ADDRESS:8080.'
      );
    }
    const url = `${baseUrl.replace(/\/$/, '')}/jsonrpc`;
    const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 });
    let resp;
    try {
      resp = await fetch(url, { method: 'POST', headers: this._kodiHeaders(), body });
    } catch (err) {
      const detail = (err && err.message ? err.message : String(err)).toLowerCase();
      // Detect common browser-level failures and give targeted guidance
      if (detail.includes('failed to fetch') || detail.includes('load failed') || detail.includes('networkerror')) {
        throw new Error(
          'Cannot reach Kodi. This is usually a browser-level block: ' +
          'CORS (Kodi does not allow cross-origin requests by default) or ' +
          'mixed-content (Home Assistant runs on HTTPS but Kodi uses HTTP). ' +
          'To fix CORS, add this to Kodi\'s advancedsettings.xml: ' +
          '<cors><allowedorigins>*</allowedorigins></cors> ' +
          'or use a specific origin like http://homeassistant.local:8123. ' +
          'See browser console (F12) for the exact error.'
        );
      }
      throw new Error(`Kodi connection error: ${detail}`);
    }
    if (resp.status === 401) {
      throw new Error(
        'Kodi authentication failed (HTTP 401). Check the username and password. ' +
        'If your password contains special characters such as @ # : / ? &, ' +
        'make sure they are entered correctly in the card config.'
      );
    }
    if (!resp.ok) throw new Error(`Kodi HTTP error ${resp.status}`);
    const data = await resp.json();
    if (data.error) throw new Error(`Kodi RPC error: ${data.error.message}`);
    return data.result;
  }

  // ── Jellyfin/Emby user resolution ────────────────────────────────────────────

  async _resolveJellyfinUserId() {
    if (this._userId) return this._userId;
    const base = (this._config.jellyfin_url || '').replace(/\/$/, '');
    const key = this._config.jellyfin_api_key;
    // Prefer user-provided user_id
    if (this._config.jellyfin_user_id) {
      this._userId = this._config.jellyfin_user_id;
      return this._userId;
    }
    const resp = await fetch(`${base}/Users?api_key=${key}`, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error(`Failed to fetch Jellyfin users: HTTP ${resp.status}`);
    const users = await resp.json();
    if (!Array.isArray(users) || users.length === 0) throw new Error('No Jellyfin users found');
    this._userId = users[0].Id;
    return this._userId;
  }

  async _resolveEmbyUserId() {
    if (this._userId) return this._userId;
    if (this._config.emby_user_id) {
      this._userId = this._config.emby_user_id;
      return this._userId;
    }
    const base = (this._config.emby_url || '').replace(/\/$/, '');
    const key = this._config.emby_api_key;
    const resp = await fetch(`${base}/Users?api_key=${key}`, { headers: { Accept: 'application/json' } });
    if (!resp.ok) throw new Error(`Failed to fetch Emby users: HTTP ${resp.status}`);
    const users = await resp.json();
    if (!Array.isArray(users) || users.length === 0) throw new Error('No Emby users found');
    this._userId = users[0].Id;
    return this._userId;
  }

  // ── Fetch data ────────────────────────────────────────────────────────────────

  async _fetchData() {
    const serverType = this._config.server_type;
    try {
      let items = [];
      if (serverType === 'plex') {
        items = await this._fetchPlexData();
      } else if (serverType === 'kodi') {
        items = await this._fetchKodiData();
      } else if (serverType === 'jellyfin') {
        items = await this._fetchJellyfinData();
      } else if (serverType === 'emby') {
        items = await this._fetchEmbyData();
      }
      this._items = items;
      this._currentIndex = 0;
      this._updateDisplay();
      this._startCycle();
    } catch (err) {
      console.warn(`Recently Added Media Card [${serverType}]: Fetch error`, err);
      const errEl = this.shadowRoot.querySelector('.error-msg');
      if (errEl) {
        errEl.textContent = `Could not connect to ${serverType}: ${err.message}`;
        errEl.style.display = 'block';
      }
      this._items = [];
      this._currentIndex = 0;
      this._updateDisplay();
    }
  }

  // Plex data fetch
  async _fetchPlexData() {
    const base = (this._config.plex_url || '').replace(/\/$/, '');
    const token = this._config.plex_token;
    const moviesCount = this._config.movies_count;
    const showsCount = this._config.shows_count;

    const sectionsResp = await fetch(`${base}/library/sections?X-Plex-Token=${token}`, { headers: { Accept: 'application/json' } });
    if (!sectionsResp.ok) throw new Error(`HTTP ${sectionsResp.status}`);
    const sectionsData = await sectionsResp.json();
    const sections = sectionsData.MediaContainer?.Directory || [];

    const movieSections = sections.filter(s => s.type === 'movie');
    const tvSections = sections.filter(s => s.type === 'show');

    // Fetch movies
    let movies = [];
    for (const section of movieSections) {
      const resp = await fetch(
        `${base}/library/sections/${section.key}/recentlyAdded?X-Plex-Token=${token}&limit=${moviesCount * 2}`,
        { headers: { Accept: 'application/json' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        movies = movies.concat(data.MediaContainer?.Metadata || []);
      }
    }
    movies.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    movies = movies.slice(0, moviesCount);

    // Fetch TV
    let tvItems = [];
    for (const section of tvSections) {
      const resp = await fetch(
        `${base}/library/sections/${section.key}/recentlyAdded?X-Plex-Token=${token}&limit=${showsCount * 4}`,
        { headers: { Accept: 'application/json' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        tvItems = tvItems.concat(data.MediaContainer?.Metadata || []);
      }
    }
    tvItems.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

    // Deduplicate TV shows
    const seenShows = new Set();
    const uniqueTvItems = [];
    for (const item of tvItems) {
      const showName = item.grandparentTitle || item.parentTitle || item.title;
      if (!seenShows.has(showName)) {
        seenShows.add(showName);
        uniqueTvItems.push(item);
      }
      if (uniqueTvItems.length >= showsCount) break;
    }

    // Map movies
    const movieItems = movies.map(item => ({
      title: item.title,
      subtitle: [item.year, item.contentRating, item.Genre?.map(g => g.tag).join(', ')].filter(Boolean).join(' · '),
      type: 'movie',
      typeLabel: 'Movie',
      rating: item.rating || null,
      duration: item.duration ? Math.round(item.duration / 60000) : null,
      summary: item.summary || '',
      thumb: item.thumb ? this._plexImageUrl(item.thumb, 400, 600) : '',
      art: item.art ? this._plexImageUrl(item.art, 800, 450) : '',
      addedAt: item.addedAt || 0,
      ratingKey: item.ratingKey || null,
      trailerUrl: null,
    }));

    // Map TV shows
    const tvDisplayItems = uniqueTvItems.map(item => {
      const isSeason = item.type === 'season';
      const isEpisode = item.type === 'episode';
      const thumbPath = isEpisode ? (item.grandparentThumb || item.thumb || '') : (item.thumb || '');
      const artPath = isEpisode ? (item.grandparentArt || item.art || '') : (item.art || '');
      return {
        title: isEpisode ? (item.grandparentTitle || item.title) : isSeason ? (item.parentTitle || item.title) : item.title,
        subtitle: isEpisode
          ? `S${String(item.parentIndex || '').padStart(2, '0')}E${String(item.index || '').padStart(2, '0')} · ${item.title}`
          : isSeason ? item.title : '',
        type: 'tv',
        typeLabel: 'TV Show',
        rating: item.rating || null,
        duration: item.duration ? Math.round(item.duration / 60000) : null,
        summary: item.summary || '',
        thumb: thumbPath ? this._plexImageUrl(thumbPath, 400, 600) : '',
        art: artPath ? this._plexImageUrl(artPath, 800, 450) : '',
        addedAt: item.addedAt || 0,
        seriesRatingKey: isEpisode ? (item.grandparentRatingKey || null) : (item.ratingKey || null),
        ratingKey: item.ratingKey || null,
        seasonNumber: isEpisode ? (item.parentIndex || null) : null,
        trailerUrl: null,
      };
    });

    return this._interleave(movieItems, tvDisplayItems);
  }

  // Kodi data fetch
  async _fetchKodiData() {
    const moviesCount = this._config.movies_count;
    const showsCount = this._config.shows_count;

    const moviesResult = await this._kodiRPC('VideoLibrary.GetRecentlyAddedMovies', {
      properties: ['title', 'year', 'rating', 'runtime', 'genre', 'plot', 'art', 'dateadded', 'mpaa', 'imdbnumber'],
      limits: { start: 0, end: moviesCount },
    });

    const episodesResult = await this._kodiRPC('VideoLibrary.GetRecentlyAddedEpisodes', {
      properties: ['title', 'showtitle', 'season', 'episode', 'rating', 'runtime', 'plot', 'art', 'dateadded', 'tvshowid'],
      limits: { start: 0, end: showsCount * 4 },
    });

    const rawMovies = moviesResult.movies || [];
    const rawEpisodes = episodesResult.episodes || [];

    const parseDate = (str) => {
      if (!str) return 0;
      return Math.floor(new Date(str.replace(' ', 'T')).getTime() / 1000);
    };

    // Map movies
    const movieItems = rawMovies.map(movie => {
      const genres = (movie.genre || []).join(', ');
      const subtitleParts = [
        movie.year ? String(movie.year) : null,
        movie.mpaa || null,
        genres || null,
      ].filter(Boolean);
      return {
        title: movie.title || '',
        subtitle: subtitleParts.join(' · '),
        type: 'movie',
        typeLabel: 'Movie',
        rating: movie.rating ? parseFloat(movie.rating.toFixed(1)) : null,
        duration: movie.runtime ? Math.round(movie.runtime / 60) : null,
        summary: movie.plot || '',
        thumb: movie.art && movie.art.poster ? this._kodiImageUrl(movie.art.poster) : '',
        art: movie.art && movie.art.fanart ? this._kodiImageUrl(movie.art.fanart) : '',
        addedAt: parseDate(movie.dateadded),
        tmdbId: movie.imdbnumber || '',
        trailerUrl: null,
      };
    });

    movieItems.sort((a, b) => b.addedAt - a.addedAt);
    const finalMovies = movieItems.slice(0, moviesCount);

    // Sort and deduplicate episodes
    const sortedEpisodes = rawEpisodes.slice().sort((a, b) => parseDate(b.dateadded) - parseDate(a.dateadded));
    const seenShows = new Set();
    const uniqueEpisodes = [];
    for (const ep of sortedEpisodes) {
      const showName = ep.showtitle || ep.title || '';
      if (!seenShows.has(showName)) {
        seenShows.add(showName);
        uniqueEpisodes.push(ep);
      }
      if (uniqueEpisodes.length >= showsCount) break;
    }

    const tvItems = uniqueEpisodes.map(ep => {
      const season = String(ep.season || 0).padStart(2, '0');
      const epNum = String(ep.episode || 0).padStart(2, '0');
      return {
        title: ep.showtitle || ep.title || '',
        subtitle: `S${season}E${epNum} · ${ep.title || ''}`,
        type: 'tv',
        typeLabel: 'TV Show',
        rating: ep.rating ? parseFloat(ep.rating.toFixed(1)) : null,
        duration: ep.runtime ? Math.round(ep.runtime / 60) : null,
        summary: ep.plot || '',
        thumb: (ep.art && (ep.art['tvshow.poster'] || ep.art.thumb)) ? this._kodiImageUrl(ep.art['tvshow.poster'] || ep.art.thumb) : '',
        art: (ep.art && (ep.art['tvshow.fanart'] || ep.art.fanart)) ? this._kodiImageUrl(ep.art['tvshow.fanart'] || ep.art.fanart) : '',
        addedAt: parseDate(ep.dateadded),
        tvshowId: ep.tvshowid || null,
        seasonNumber: ep.season || null,
        trailerUrl: null,
      };
    });

    return this._interleave(finalMovies, tvItems);
  }

  // Jellyfin data fetch
  async _fetchJellyfinData() {
    const base = (this._config.jellyfin_url || '').replace(/\/$/, '');
    const key = this._config.jellyfin_api_key;
    const moviesCount = this._config.movies_count;
    const showsCount = this._config.shows_count;
    const userId = await this._resolveJellyfinUserId();

    const headers = { 'X-MediaBrowser-Token': key, Accept: 'application/json' };

    const moviesResp = await fetch(
      `${base}/Users/${userId}/Items/Latest` +
        `?IncludeItemTypes=Movie` +
        `&Limit=${moviesCount * 2}` +
        `&Fields=Overview,Genres,OfficialRating,CommunityRating,RunTimeTicks,DateCreated,ProviderIds` +
        `&EnableImageTypes=Primary,Backdrop`,
      { headers }
    );
    if (!moviesResp.ok) throw new Error(`Movies fetch failed: HTTP ${moviesResp.status}`);
    const moviesRaw = await moviesResp.json();
    const moviesArr = Array.isArray(moviesRaw) ? moviesRaw : [];
    moviesArr.sort((a, b) => (Date.parse(b.DateCreated) || 0) - (Date.parse(a.DateCreated) || 0));
    const movies = moviesArr.slice(0, moviesCount);

    const showsResp = await fetch(
      `${base}/Users/${userId}/Items/Latest` +
        `?IncludeItemTypes=Episode` +
        `&Limit=${showsCount * 6}` +
        `&Fields=Overview,Genres,OfficialRating,CommunityRating,RunTimeTicks,DateCreated,SeriesName,SeasonName,IndexNumber,ParentIndexNumber,SeriesId` +
        `&EnableImageTypes=Primary,Backdrop`,
      { headers }
    );
    if (!showsResp.ok) throw new Error(`Shows fetch failed: HTTP ${showsResp.status}`);
    const showsRaw = await showsResp.json();
    const showsArr = Array.isArray(showsRaw) ? showsRaw : [];
    showsArr.sort((a, b) => (Date.parse(b.DateCreated) || 0) - (Date.parse(a.DateCreated) || 0));

    const seenShows = new Set();
    const uniqueShows = [];
    for (const item of showsArr) {
      const showName = item.SeriesName || item.Name;
      if (!seenShows.has(showName)) {
        seenShows.add(showName);
        uniqueShows.push(item);
      }
      if (uniqueShows.length >= showsCount) break;
    }

    // Map movies
    const movieItems = movies.map(item => {
      const genres = Array.isArray(item.Genres) ? item.Genres.join(', ') : '';
      const subtitle = [item.ProductionYear, item.OfficialRating, genres].filter(Boolean).join(' · ');
      const rating = item.CommunityRating ? Math.round(item.CommunityRating * 10) / 10 : null;
      const duration = item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null;
      const addedAt = item.DateCreated ? Date.parse(item.DateCreated) / 1000 : 0;
      const hasBackdrop = item.BackdropImageTags && item.BackdropImageTags.length > 0;
      const artUrl = hasBackdrop ? this._jellyfinBackdropUrl(item.Id) : this._jellyfinPosterUrl(item.Id);
      const tmdbId = (item.ProviderIds?.Tmdb || item.ProviderIds?.tmdb || '').trim();
      const imdbId = (item.ProviderIds?.Imdb || item.ProviderIds?.imdb || '').trim();
      return {
        title: item.Name,
        subtitle,
        type: 'movie',
        typeLabel: 'Movie',
        rating,
        duration,
        summary: item.Overview || '',
        thumb: this._jellyfinPosterUrl(item.Id),
        art: artUrl,
        addedAt,
        tmdbId,
        imdbId,
        trailerUrl: null,
      };
    });

    // Map TV episodes
    const tvDisplayItems = uniqueShows.map(item => {
      const season = item.ParentIndexNumber != null ? String(item.ParentIndexNumber).padStart(2, '0') : '??';
      const episode = item.IndexNumber != null ? String(item.IndexNumber).padStart(2, '0') : '??';
      const subtitle = `S${season}E${episode} · ${item.Name}`;
      const rating = item.CommunityRating ? Math.round(item.CommunityRating * 10) / 10 : null;
      const duration = item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null;
      const addedAt = item.DateCreated ? Date.parse(item.DateCreated) / 1000 : 0;
      const seriesId = item.SeriesId || item.Id;
      const hasSeriesBackdrop = item.ParentBackdropItemId != null || (item.BackdropImageTags && item.BackdropImageTags.length > 0);
      const artUrl = hasSeriesBackdrop ? this._jellyfinBackdropUrl(seriesId) : this._jellyfinPosterUrl(seriesId);
      return {
        title: item.SeriesName || item.Name,
        subtitle,
        type: 'tv',
        typeLabel: 'TV Show',
        rating,
        duration,
        summary: item.Overview || '',
        thumb: this._jellyfinPosterUrl(seriesId),
        art: artUrl,
        addedAt,
        seriesId: item.SeriesId || null,
        seasonNumber: item.ParentIndexNumber || null,
        trailerUrl: null,
      };
    });

    return this._interleave(movieItems, tvDisplayItems);
  }

  // Emby data fetch
  async _fetchEmbyData() {
    const base = (this._config.emby_url || '').replace(/\/$/, '');
    const key = this._config.emby_api_key;
    const moviesCount = this._config.movies_count;
    const showsCount = this._config.shows_count;
    const userId = await this._resolveEmbyUserId();

    const moviesResp = await fetch(
      `${base}/Users/${userId}/Items/Latest` +
        `?IncludeItemTypes=Movie` +
        `&Limit=${moviesCount * 2}` +
        `&Fields=Overview,Genres,OfficialRating,CommunityRating,RunTimeTicks,DateCreated,ProviderIds` +
        `&EnableImageTypes=Primary,Backdrop` +
        `&api_key=${key}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!moviesResp.ok) throw new Error(`Movies fetch failed: HTTP ${moviesResp.status}`);
    const moviesRaw = await moviesResp.json();
    const moviesArr = Array.isArray(moviesRaw) ? moviesRaw : [];
    moviesArr.sort((a, b) => (Date.parse(b.DateCreated) || 0) - (Date.parse(a.DateCreated) || 0));
    const movies = moviesArr.slice(0, moviesCount);

    const showsResp = await fetch(
      `${base}/Users/${userId}/Items/Latest` +
        `?IncludeItemTypes=Episode` +
        `&Limit=${showsCount * 6}` +
        `&Fields=Overview,Genres,OfficialRating,CommunityRating,RunTimeTicks,DateCreated,SeriesName,SeasonName,IndexNumber,ParentIndexNumber,ProviderIds,SeriesId` +
        `&EnableImageTypes=Primary,Backdrop` +
        `&api_key=${key}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!showsResp.ok) throw new Error(`Shows fetch failed: HTTP ${showsResp.status}`);
    const showsRaw = await showsResp.json();
    const showsArr = Array.isArray(showsRaw) ? showsRaw : [];
    showsArr.sort((a, b) => (Date.parse(b.DateCreated) || 0) - (Date.parse(a.DateCreated) || 0));

    const seenShows = new Set();
    const uniqueShows = [];
    for (const item of showsArr) {
      const showName = item.SeriesName || item.Name;
      if (!seenShows.has(showName)) {
        seenShows.add(showName);
        uniqueShows.push(item);
      }
      if (uniqueShows.length >= showsCount) break;
    }

    // Map movies
    const movieItems = movies.map(item => {
      const genres = Array.isArray(item.Genres) ? item.Genres.join(', ') : '';
      const subtitle = [item.ProductionYear, item.OfficialRating, genres].filter(Boolean).join(' · ');
      const rating = item.CommunityRating ? Math.round(item.CommunityRating * 10) / 10 : null;
      const duration = item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null;
      const addedAt = item.DateCreated ? Date.parse(item.DateCreated) / 1000 : 0;
      const hasBackdrop = item.BackdropImageTags && item.BackdropImageTags.length > 0;
      const artUrl = hasBackdrop ? this._embyBackdropUrl(item.Id) : this._embyPosterUrl(item.Id);
      const tmdbId = (item.ProviderIds?.Tmdb || item.ProviderIds?.tmdb || '').trim();
      const imdbId = (item.ProviderIds?.Imdb || item.ProviderIds?.imdb || '').trim();
      return {
        title: item.Name,
        subtitle,
        type: 'movie',
        typeLabel: 'Movie',
        rating,
        duration,
        summary: item.Overview || '',
        thumb: this._embyPosterUrl(item.Id),
        art: artUrl,
        addedAt,
        tmdbId,
        imdbId,
        trailerUrl: null,
      };
    });

    // Map TV episodes
    const tvDisplayItems = uniqueShows.map(item => {
      const season = item.ParentIndexNumber != null ? String(item.ParentIndexNumber).padStart(2, '0') : '??';
      const episode = item.IndexNumber != null ? String(item.IndexNumber).padStart(2, '0') : '??';
      const subtitle = `S${season}E${episode} · ${item.Name}`;
      const rating = item.CommunityRating ? Math.round(item.CommunityRating * 10) / 10 : null;
      const duration = item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) : null;
      const addedAt = item.DateCreated ? Date.parse(item.DateCreated) / 1000 : 0;
      const seriesId = item.SeriesId || item.Id;
      const hasSeriesBackdrop = item.ParentBackdropItemId != null || (item.BackdropImageTags && item.BackdropImageTags.length > 0);
      const artUrl = hasSeriesBackdrop ? this._embyBackdropUrl(seriesId) : this._embyPosterUrl(seriesId);
      return {
        title: item.SeriesName || item.Name,
        subtitle,
        type: 'tv',
        typeLabel: 'TV Show',
        rating,
        duration,
        summary: item.Overview || '',
        thumb: this._embyPosterUrl(seriesId),
        art: artUrl,
        addedAt,
        seriesId: item.SeriesId || null,
        seasonNumber: item.ParentIndexNumber || null,
        trailerUrl: null,
      };
    });

    return this._interleave(movieItems, tvDisplayItems);
  }

  // ── Interleave utility ────────────────────────────────────────────────────────

  _interleave(movies, tvShows) {
    if (this._config.sort_order === 'recent') {
      return [...movies, ...tvShows].sort(
        (a, b) => (Number(b.addedAt) || 0) - (Number(a.addedAt) || 0)
      );
    }

    const result = [];
    const maxLen = Math.max(movies.length, tvShows.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < movies.length) result.push(movies[i]);
      if (i < tvShows.length) result.push(tvShows[i]);
    }
    return result;
  }

  // ── Cycling ───────────────────────────────────────────────────────────────────

  _startCycle() {
    if (this._cycleTimer) clearInterval(this._cycleTimer);
    this._cycleTimer = null;
    // cycle_interval 0 (or less) disables auto-advance entirely.
    const interval = Number(this._config.cycle_interval);
    if (!Number.isFinite(interval) || interval <= 0) return;
    if (this._items.length <= 1) return;

    this._cycleTimer = setInterval(() => {
      if (this._trailerActive) return; // Pause cycling while trailer is playing
      this._currentIndex = (this._currentIndex + 1) % this._items.length;
      this._updateDisplay();
    }, interval * 1000);
  }

  _resetCycleTimer() {
    if (this._cycleTimer) {
      clearInterval(this._cycleTimer);
      this._cycleTimer = null;
    }
    this._startCycle();
  }

  // ── Display update ────────────────────────────────────────────────────────────

  _updateDisplay() {
    if (!this._items.length) {
      const cfg = this._config || {};
      const theme = this._getTheme();
      const primaryRgb = this._hexToRgb(theme.primary);
      const root = this.shadowRoot;
      const bgEl = root.querySelector('.bg-art');
      if (bgEl) bgEl.style.backgroundImage = '';
      const bgNew = root.querySelector('.bg-art-next');
      if (bgNew) { bgNew.classList.remove('active'); bgNew.style.backgroundImage = ''; }
      const posterEl = root.querySelector('.poster');
      if (posterEl) { posterEl.src = ''; posterEl.style.opacity = '0.3'; }
      const titleEl = root.querySelector('.item-title');
      if (titleEl) titleEl.textContent = '';
      const subtitleEl = root.querySelector('.item-subtitle');
      if (subtitleEl) subtitleEl.textContent = `No recently added items available from ${cfg.server_type || 'plex'}. Configure your server URL and token, or check the connection.`;
      const typeEl = root.querySelector('.item-type');
      if (typeEl) { typeEl.textContent = 'No items'; typeEl.className = 'item-type movie'; }
      const ratingEl = root.querySelector('.item-rating');
      if (ratingEl) ratingEl.style.display = 'none';
      const summaryEl = root.querySelector('.item-summary');
      if (summaryEl) summaryEl.textContent = '';
      const dotsEl = root.querySelector('.dots');
      if (dotsEl) dotsEl.innerHTML = '';
      const counterEl = root.querySelector('.counter');
      if (counterEl) counterEl.textContent = '';
      const timeEl = root.querySelector('.time-ago');
      if (timeEl) timeEl.textContent = '';
      const trailerBtn = root.querySelector('.trailer-btn');
      if (trailerBtn) { trailerBtn.classList.remove('visible'); trailerBtn.onclick = null; }
      return;
    }
    const item = this._items[this._currentIndex];
    const root = this.shadowRoot;

    // Background art crossfade
    const bgEl = root.querySelector('.bg-art');
    const bgNew = root.querySelector('.bg-art-next');
    if (bgNew) {
      const artSrc = item.art || item.thumb;
      if (artSrc) bgNew.style.backgroundImage = `url(${artSrc})`;
      bgNew.classList.add('active');
      setTimeout(() => {
        if (bgEl && artSrc) bgEl.style.backgroundImage = `url(${artSrc})`;
        bgNew.classList.remove('active');
      }, 800);
    }

    // Poster — fade in on load
    const posterEl = root.querySelector('.poster');
    if (posterEl && item.thumb) {
      posterEl.style.opacity = '0';
      const img = new Image();
      img.onload = () => { posterEl.src = img.src; posterEl.style.opacity = '1'; };
      img.onerror = () => { posterEl.style.opacity = '0.3'; };
      img.src = item.thumb;
    }

    // Text elements
    const titleEl = root.querySelector('.item-title');
    const subtitleEl = root.querySelector('.item-subtitle');
    const typeEl = root.querySelector('.item-type');
    const ratingEl = root.querySelector('.item-rating');
    const summaryEl = root.querySelector('.item-summary');
    const dotsEl = root.querySelector('.dots');
    const counterEl = root.querySelector('.counter');

    if (titleEl) titleEl.textContent = item.title;
    if (subtitleEl) subtitleEl.textContent = item.subtitle;
    if (typeEl) {
      typeEl.textContent = item.typeLabel;
      typeEl.className = `item-type ${item.type}`;
    }
    if (ratingEl) {
      if (item.rating != null) {
        const ratingVal = typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating;
        ratingEl.textContent = `★ ${ratingVal}`;
        ratingEl.style.display = 'inline-block';
      } else {
        ratingEl.style.display = 'none';
      }
    }
    if (summaryEl) summaryEl.textContent = item.summary || '';

    // Dots
    if (dotsEl) {
      dotsEl.innerHTML = this._items
        .map((it, i) => {
          const colorClass = it.type === 'movie' ? 'movie' : 'tv';
          const activeClass = i === this._currentIndex ? 'active' : '';
          return `<span class="dot ${colorClass} ${activeClass}"></span>`;
        })
        .join('');
    }

    // Counter
    if (counterEl) counterEl.textContent = `${this._currentIndex + 1} / ${this._items.length}`;

    // Time ago
    const timeEl = root.querySelector('.time-ago');
    if (timeEl && item.addedAt) {
      const diff = Date.now() / 1000 - item.addedAt;
      let timeStr;
      if (diff < 3600) timeStr = `${Math.round(diff / 60)}m ago`;
      else if (diff < 86400) timeStr = `${Math.round(diff / 3600)}h ago`;
      else timeStr = `${Math.round(diff / 86400)}d ago`;
      timeEl.textContent = timeStr;
    } else if (timeEl) {
      timeEl.textContent = '';
    }

    // Trailer button
    const trailerBtn = root.querySelector('.trailer-btn');
    if (trailerBtn) {
      trailerBtn.classList.remove('visible');
      trailerBtn.onclick = null;

      const showTrailerBtn = (url) => {
        if (url && this._items[this._currentIndex] === item) {
          trailerBtn.classList.add('visible');
          trailerBtn.onclick = (e) => { e.stopPropagation(); this._config.trailer_mode === 'popup' ? this._playTrailerPopup(url) : this._playTrailerInline(url); };
        }
      };

      if (item.trailerUrl) {
        showTrailerBtn(item.trailerUrl);
      } else if (item.trailerUrl === null) {
        let fetchPromise;
        const serverType = this._config.server_type;
        if (serverType === 'plex') {
          if (item.type === 'movie' && item.ratingKey) {
            fetchPromise = this._fetchPlexTrailer(item.ratingKey);
          } else if (item.type === 'tv' && item.seriesRatingKey) {
            fetchPromise = this._fetchPlexTvTrailer(item.seriesRatingKey, item.seasonNumber);
          }
        } else if (serverType === 'kodi') {
          if (item.type === 'movie' && item.tmdbId) {
            fetchPromise = this._fetchKodiTrailer(item.tmdbId);
          } else if (item.type === 'tv' && item.tvshowId) {
            fetchPromise = this._fetchKodiTvTrailer(item.tvshowId, item.seasonNumber);
          }
        } else if (serverType === 'jellyfin') {
          if (item.type === 'movie' && (item.tmdbId || item.imdbId)) {
            fetchPromise = this._fetchJellyfinTrailer(item.tmdbId, item.imdbId);
          } else if (item.type === 'tv' && item.seriesId) {
            fetchPromise = this._fetchJellyfinTvTrailer(item.seriesId, item.seasonNumber);
          }
        } else if (serverType === 'emby') {
          if (item.type === 'movie' && (item.tmdbId || item.imdbId)) {
            fetchPromise = this._fetchEmbyTrailer(item.tmdbId, item.imdbId);
          } else if (item.type === 'tv' && item.seriesId) {
            fetchPromise = this._fetchEmbyTvTrailer(item.seriesId, item.seasonNumber);
          }
        }
        if (fetchPromise) {
          fetchPromise.then(url => {
            item.trailerUrl = url || undefined;
            showTrailerBtn(url);
          });
        }
      }
    }
  }

  // ── YouTube utility ────────────────────────────────────────────────────────────

  _getYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([-\w]{11})/);
    return match ? match[1] : null;
  }

  // ── Popup trailer playback ──────────────────────────────────────────────────

  _playTrailerPopup(url) {
    const ytId = this._getYouTubeId(url);
    if (!ytId) return;

    if (this._cycleTimer) { clearInterval(this._cycleTimer); this._cycleTimer = null; }
    this._trailerActive = true;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer;';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;width:90vw;max-width:960px;aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;';

    const playerDiv = document.createElement('div');
    playerDiv.id = 'ram-yt-popup-' + Date.now();
    playerDiv.style.cssText = 'width:100%;height:100%;';
    wrapper.appendChild(playerDiv);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '\u2715';
    closeBtn.style.cssText = 'position:absolute;top:8px;right:8px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.3);color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:100001;';
    wrapper.appendChild(closeBtn);

    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    const self = this;
    const closeTrailer = () => {
      self._trailerActive = false;
      if (self._ytPlayer) { try { self._ytPlayer.destroy(); } catch (e) {} self._ytPlayer = null; }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      self._startCycle();
    };

    closeBtn.onclick = (e) => { e.stopPropagation(); closeTrailer(); };
    overlay.addEventListener('click', closeTrailer);
    wrapper.addEventListener('click', (e) => e.stopPropagation());

    const initPlayer = () => {
      self._ytPlayer = new YT.Player(playerDiv.id, {
        width: '100%', height: '100%', videoId: ytId,
        playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0, playsinline: 1, enablejsapi: 1, origin: window.location.origin },
        events: { onStateChange: (event) => { if (event.data === 0) closeTrailer(); } },
      });
    };

    if (window.YT && window.YT.Player) { initPlayer(); }
    else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script'); tag.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(tag);
      }
      const check = setInterval(() => { if (window.YT && window.YT.Player) { clearInterval(check); initPlayer(); } }, 100);
      setTimeout(() => clearInterval(check), 10000);
    }
  }

  // ── Inline trailer playback ───────────────────────────────────────────────────

  _playTrailerInline(url) {
    const ytId = this._getYouTubeId(url);
    if (!ytId) return;

    // Stop cycling
    if (this._cycleTimer) { clearInterval(this._cycleTimer); this._cycleTimer = null; }
    this._trailerActive = true;

    const root = this.shadowRoot;
    const mainEl = root.querySelector('.main');
    const dotsEl = root.querySelector('.dots');

    // Hide main content + dots
    if (mainEl) mainEl.style.display = 'none';
    if (dotsEl) dotsEl.style.display = 'none';

    // Create overlay on document.body (outside Shadow DOM so YT.Player works)
    const overlay = document.createElement('div');
    overlay.className = 'ram-trailer-overlay';

    // Position the overlay over the card element
    const cardRect = this.getBoundingClientRect();
    overlay.style.cssText = `position:fixed;top:${cardRect.top}px;left:${cardRect.left}px;width:${cardRect.width}px;height:${cardRect.height}px;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;border-radius:12px;overflow:hidden;`;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;';

    const playerDiv = document.createElement('div');
    playerDiv.id = 'ram-yt-player-' + Date.now();
    playerDiv.style.cssText = 'width:100%;height:100%;';
    wrapper.appendChild(playerDiv);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '\u2715';
    closeBtn.style.cssText = 'position:absolute;top:8px;right:8px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.3);color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:100001;';
    wrapper.appendChild(closeBtn);

    overlay.appendChild(wrapper);
    document.body.appendChild(overlay);

    const self = this;
    const closeTrailer = () => {
      self._trailerActive = false;
      if (self._ytPlayer) {
        try { self._ytPlayer.destroy(); } catch (e) {}
        self._ytPlayer = null;
      }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (mainEl) mainEl.style.display = '';
      if (dotsEl) dotsEl.style.display = '';
      self._startCycle();
    };

    closeBtn.onclick = (e) => { e.stopPropagation(); closeTrailer(); };

    const initPlayer = () => {
      self._ytPlayer = new YT.Player(playerDiv.id, {
        width: '100%',
        height: '100%',
        videoId: ytId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === 0) closeTrailer();
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const check = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(check);
          initPlayer();
        }
      }, 100);
      setTimeout(() => clearInterval(check), 10000);
    }
  }

  // ── Trailer fetch: Plex ────────────────────────────────────────────────────────

  async _fetchPlexTrailer(ratingKey) {
    if (!this._config.tmdb_api_key) return null;
    if (ratingKey in this._trailerCache) return this._trailerCache[ratingKey];

    try {
      const base = (this._config.plex_url || '').replace(/\/$/, '');
      const token = this._config.plex_token;

      const metaResp = await fetch(`${base}/library/metadata/${ratingKey}?X-Plex-Token=${token}`, { headers: { Accept: 'application/json' } });
      if (!metaResp.ok) throw new Error(`Plex metadata HTTP ${metaResp.status}`);
      const metaData = await metaResp.json();
      const item = metaData?.MediaContainer?.Metadata?.[0];
      if (!item) throw new Error('No metadata found');

      let tmdbId = null;
      for (const g of (item.Guid || [])) {
        const id = g.id || g;
        if (typeof id === 'string' && id.startsWith('tmdb://')) {
          tmdbId = id.replace('tmdb://', '').split('?')[0];
          break;
        }
      }
      if (!tmdbId) {
        const oldGuid = item.guid || '';
        const m = oldGuid.match(/themoviedb[:/]+(\d+)/);
        if (m) tmdbId = m[1];
      }
      if (!tmdbId) { this._trailerCache[ratingKey] = null; return null; }

      const tmdbResp = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/videos?language=en-US`,
        { headers: { Accept: 'application/json', Authorization: `Bearer ${this._config.tmdb_api_key}` } }
      );
      if (!tmdbResp.ok) throw new Error(`TMDB HTTP ${tmdbResp.status}`);
      const tmdbData = await tmdbResp.json();
      const videos = tmdbData.results || [];
      const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ||
                      videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
                      videos.find(v => v.site === 'YouTube');
      const url = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
      this._trailerCache[ratingKey] = url;
      return url;
    } catch (err) {
      console.warn('Recently Added Media Card: Plex trailer fetch error', err);
      this._trailerCache[ratingKey] = null;
      return null;
    }
  }

  async _fetchPlexTvTrailer(seriesRatingKey, seasonNumber) {
    const cacheKey = `tv_${seriesRatingKey}_${seasonNumber}`;
    if (cacheKey in this._trailerCache) return this._trailerCache[cacheKey];
    if (!this._config.tmdb_api_key) return null;

    try {
      const base = (this._config.plex_url || '').replace(/\/$/, '');
      const token = this._config.plex_token;
      const tmdbToken = this._config.tmdb_api_key;

      const metaResp = await fetch(`${base}/library/metadata/${seriesRatingKey}?X-Plex-Token=${token}`, { headers: { Accept: 'application/json' } });
      if (!metaResp.ok) throw new Error(`Plex metadata HTTP ${metaResp.status}`);
      const metaData = await metaResp.json();
      const series = metaData?.MediaContainer?.Metadata?.[0];
      if (!series) throw new Error('No series metadata');

      let tmdbId = null;
      for (const g of (series.Guid || [])) {
        const id = g.id || g;
        if (typeof id === 'string' && id.startsWith('tmdb://')) {
          tmdbId = id.replace('tmdb://', '').split('?')[0];
          break;
        }
      }
      if (!tmdbId) {
        const oldGuid = series.guid || '';
        const m = oldGuid.match(/themoviedb[:/]+(\d+)/);
        if (m) tmdbId = m[1];
      }
      if (!tmdbId) { this._trailerCache[cacheKey] = null; return null; }

      let youtubeUrl = null;
      if (seasonNumber) {
        try {
          const sResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/videos?language=en-US`, { headers: { Accept: 'application/json', Authorization: `Bearer ${tmdbToken}` } });
          if (sResp.ok) {
            const sData = await sResp.json();
            const vids = sData.results || [];
            const t = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) || vids.find(v => v.type === 'Trailer' && v.site === 'YouTube') || vids.find(v => v.site === 'YouTube');
            if (t) youtubeUrl = `https://www.youtube.com/watch?v=${t.key}`;
          }
        } catch (e) { /* fall through */ }
      }
      if (!youtubeUrl) {
        const sResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/videos?language=en-US`, { headers: { Accept: 'application/json', Authorization: `Bearer ${tmdbToken}` } });
        if (sResp.ok) {
          const sData = await sResp.json();
          const vids = sData.results || [];
          const t = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) || vids.find(v => v.type === 'Trailer' && v.site === 'YouTube') || vids.find(v => v.site === 'YouTube');
          if (t) youtubeUrl = `https://www.youtube.com/watch?v=${t.key}`;
        }
      }
      this._trailerCache[cacheKey] = youtubeUrl;
      return youtubeUrl;
    } catch (err) {
      console.warn('Recently Added Media Card: Plex TV trailer fetch error', err);
      this._trailerCache[cacheKey] = null;
      return null;
    }
  }

  // ── Trailer fetch: Kodi ────────────────────────────────────────────────────────

  async _fetchKodiTrailer(id) {
    if (!this._config.tmdb_api_key || !id) return null;
    if (id in this._trailerCache) return this._trailerCache[id];

    const headers = { Authorization: `Bearer ${this._config.tmdb_api_key}` };
    try {
      let numericId = id;
      if (String(id).startsWith('tt')) {
        const findResp = await fetch(`https://api.themoviedb.org/3/find/${id}?external_source=imdb_id`, { headers });
        if (!findResp.ok) throw new Error(`TMDB find HTTP ${findResp.status}`);
        const findData = await findResp.json();
        const movieResults = findData.movie_results || [];
        if (!movieResults.length) { this._trailerCache[id] = null; return null; }
        numericId = movieResults[0].id;
      }

      const vResp = await fetch(`https://api.themoviedb.org/3/movie/${numericId}/videos?language=en-US`, { headers });
      if (!vResp.ok) throw new Error(`TMDB videos HTTP ${vResp.status}`);
      const vData = await vResp.json();
      const videos = vData.results || [];
      const ytVideos = videos.filter(v => v.site === 'YouTube');
      const best = ytVideos.find(v => v.type === 'Trailer' && v.official) || ytVideos.find(v => v.type === 'Trailer') || ytVideos[0] || null;
      const result = best ? `https://www.youtube.com/watch?v=${best.key}` : null;
      this._trailerCache[id] = result;
      if (numericId !== id) this._trailerCache[numericId] = result;
      return result;
    } catch (err) {
      console.warn('Recently Added Media Card: Kodi trailer fetch error', err);
      this._trailerCache[id] = null;
      return null;
    }
  }

  async _fetchKodiTvTrailer(tvshowId, seasonNumber) {
    const cacheKey = `tv_${tvshowId}_${seasonNumber}`;
    if (cacheKey in this._trailerCache) return this._trailerCache[cacheKey];
    if (!this._config.tmdb_api_key) return null;

    const headers = { Authorization: `Bearer ${this._config.tmdb_api_key}`, Accept: 'application/json' };

    try {
      const showResult = await this._kodiRPC('VideoLibrary.GetTVShowDetails', { tvshowid: tvshowId, properties: ['imdbnumber'] });
      const imdbnumber = showResult?.tvshowdetails?.imdbnumber || '';
      if (!imdbnumber) { this._trailerCache[cacheKey] = null; return null; }

      let tmdbId = imdbnumber;
      if (String(imdbnumber).startsWith('tt')) {
        const fResp = await fetch(`https://api.themoviedb.org/3/find/${imdbnumber}?external_source=imdb_id`, { headers });
        if (fResp.ok) {
          const fData = await fResp.json();
          const tvResult = (fData.tv_results || [])[0];
          if (tvResult) tmdbId = String(tvResult.id);
          else { this._trailerCache[cacheKey] = null; return null; }
        } else { this._trailerCache[cacheKey] = null; return null; }
      }

      let youtubeUrl = null;
      if (seasonNumber) {
        try {
          const sResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/videos?language=en-US`, { headers });
          if (sResp.ok) {
            const sData = await sResp.json();
            const vids = sData.results || [];
            const t = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) || vids.find(v => v.type === 'Trailer' && v.site === 'YouTube') || vids.find(v => v.site === 'YouTube');
            if (t) youtubeUrl = `https://www.youtube.com/watch?v=${t.key}`;
          }
        } catch (e) { /* fall through */ }
      }
      if (!youtubeUrl) {
        const sResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/videos?language=en-US`, { headers });
        if (sResp.ok) {
          const sData = await sResp.json();
          const vids = sData.results || [];
          const t = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) || vids.find(v => v.type === 'Trailer' && v.site === 'YouTube') || vids.find(v => v.site === 'YouTube');
          if (t) youtubeUrl = `https://www.youtube.com/watch?v=${t.key}`;
        }
      }
      this._trailerCache[cacheKey] = youtubeUrl;
      return youtubeUrl;
    } catch (err) {
      console.warn('Recently Added Media Card: Kodi TV trailer fetch error', err);
      this._trailerCache[cacheKey] = null;
      return null;
    }
  }

  // ── Trailer fetch: Jellyfin ────────────────────────────────────────────────────

  async _fetchJellyfinTrailer(tmdbId, imdbId) {
    if (!this._config.tmdb_api_key) return null;
    return this._fetchTmdbTrailerByIds(tmdbId, imdbId, 'movie');
  }

  async _fetchJellyfinTvTrailer(seriesId, seasonNumber) {
    const cacheKey = `tv_${seriesId}_${seasonNumber}`;
    if (cacheKey in this._trailerCache) return this._trailerCache[cacheKey];
    if (!this._config.tmdb_api_key) return null;

    try {
      const base = (this._config.jellyfin_url || '').replace(/\/$/, '');
      const key = this._config.jellyfin_api_key;
      const userId = await this._resolveJellyfinUserId();

      const sResp = await fetch(`${base}/Users/${userId}/Items/${seriesId}?Fields=ProviderIds&api_key=${key}`, { headers: { Accept: 'application/json' } });
      if (!sResp.ok) throw new Error(`Jellyfin series metadata HTTP ${sResp.status}`);
      const sData = await sResp.json();
      const tmdbId = (sData.ProviderIds?.Tmdb || sData.ProviderIds?.tmdb || '').trim();
      if (!tmdbId) { this._trailerCache[cacheKey] = null; return null; }

      const url = await this._fetchTmdbTvTrailerById(tmdbId, seasonNumber);
      this._trailerCache[cacheKey] = url;
      return url;
    } catch (err) {
      console.warn('Recently Added Media Card: Jellyfin TV trailer fetch error', err);
      this._trailerCache[cacheKey] = null;
      return null;
    }
  }

  // ── Trailer fetch: Emby ────────────────────────────────────────────────────────

  async _fetchEmbyTrailer(tmdbId, imdbId) {
    if (!this._config.tmdb_api_key) return null;
    return this._fetchTmdbTrailerByIds(tmdbId, imdbId, 'movie');
  }

  async _fetchEmbyTvTrailer(seriesId, seasonNumber) {
    const cacheKey = `tv_${seriesId}_${seasonNumber}`;
    if (cacheKey in this._trailerCache) return this._trailerCache[cacheKey];
    if (!this._config.tmdb_api_key) return null;

    try {
      const base = (this._config.emby_url || '').replace(/\/$/, '');
      const key = this._config.emby_api_key;
      const userId = await this._resolveEmbyUserId();

      const sResp = await fetch(`${base}/Users/${userId}/Items/${seriesId}?Fields=ProviderIds&api_key=${key}`, { headers: { Accept: 'application/json' } });
      if (!sResp.ok) throw new Error(`Emby series metadata HTTP ${sResp.status}`);
      const sData = await sResp.json();
      const tmdbId = (sData.ProviderIds?.Tmdb || sData.ProviderIds?.tmdb || '').trim();
      if (!tmdbId) { this._trailerCache[cacheKey] = null; return null; }

      const url = await this._fetchTmdbTvTrailerById(tmdbId, seasonNumber);
      this._trailerCache[cacheKey] = url;
      return url;
    } catch (err) {
      console.warn('Recently Added Media Card: Emby TV trailer fetch error', err);
      this._trailerCache[cacheKey] = null;
      return null;
    }
  }

  // ── Shared TMDB helpers ────────────────────────────────────────────────────────

  async _fetchTmdbTrailerByIds(tmdbId, imdbId, _mediaType) {
    let resolvedTmdbId = tmdbId;
    const tmdbToken = this._config.tmdb_api_key;
    const tmdbHeaders = { Authorization: `Bearer ${tmdbToken}`, Accept: 'application/json' };

    if (!resolvedTmdbId && imdbId) {
      const cacheKey = `imdb:${imdbId}`;
      if (cacheKey in this._trailerCache) return this._trailerCache[cacheKey];
      try {
        const fResp = await fetch(`https://api.themoviedb.org/3/find/${imdbId}?external_source=imdb_id`, { headers: tmdbHeaders });
        if (fResp.ok) {
          const fData = await fResp.json();
          const mResult = (fData.movie_results || [])[0];
          if (mResult) resolvedTmdbId = String(mResult.id);
        }
      } catch (e) { console.warn('TMDB find lookup failed', e); }
      if (!resolvedTmdbId) { this._trailerCache[`imdb:${imdbId}`] = null; return null; }
    }

    if (!resolvedTmdbId) return null;

    const cacheKey = `tmdb:${resolvedTmdbId}`;
    if (cacheKey in this._trailerCache) return this._trailerCache[cacheKey];

    try {
      const resp = await fetch(`https://api.themoviedb.org/3/movie/${resolvedTmdbId}/videos?language=en-US`, { headers: tmdbHeaders });
      if (!resp.ok) { this._trailerCache[cacheKey] = null; return null; }
      const data = await resp.json();
      const videos = Array.isArray(data.results) ? data.results : [];
      const ytVideos = videos.filter(v => v.site === 'YouTube');
      const best = ytVideos.find(v => v.type === 'Trailer' && v.official) || ytVideos.find(v => v.type === 'Trailer') || ytVideos[0] || null;
      const url = best ? `https://www.youtube.com/watch?v=${best.key}` : null;
      this._trailerCache[cacheKey] = url;
      if (imdbId && !tmdbId) this._trailerCache[`imdb:${imdbId}`] = url;
      return url;
    } catch (e) {
      console.warn('TMDB videos fetch failed', e);
      this._trailerCache[cacheKey] = null;
      return null;
    }
  }

  async _fetchTmdbTvTrailerById(tmdbId, seasonNumber) {
    const cacheKeyBase = `tmdb_tv:${tmdbId}`;
    const tmdbToken = this._config.tmdb_api_key;
    const tmdbHeaders = { Authorization: `Bearer ${tmdbToken}`, Accept: 'application/json' };

    let youtubeUrl = null;
    if (seasonNumber) {
      try {
        const sResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/videos?language=en-US`, { headers: tmdbHeaders });
        if (sResp.ok) {
          const sData = await sResp.json();
          const vids = sData.results || [];
          const t = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) || vids.find(v => v.type === 'Trailer' && v.site === 'YouTube') || vids.find(v => v.site === 'YouTube');
          if (t) youtubeUrl = `https://www.youtube.com/watch?v=${t.key}`;
        }
      } catch (e) { /* fall through */ }
    }
    if (!youtubeUrl) {
      const sResp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/videos?language=en-US`, { headers: tmdbHeaders });
      if (sResp.ok) {
        const sData = await sResp.json();
        const vids = sData.results || [];
        const t = vids.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) || vids.find(v => v.type === 'Trailer' && v.site === 'YouTube') || vids.find(v => v.site === 'YouTube');
        if (t) youtubeUrl = `https://www.youtube.com/watch?v=${t.key}`;
      }
    }
    return youtubeUrl;
  }

  // ── Touch swipe ────────────────────────────────────────────────────────────────

  _attachSwipeListeners() {
    const card = this.shadowRoot.querySelector('.card');
    if (!card) return;

    // Touch swipe
    card.addEventListener('touchstart', (e) => {
      if (this._trailerActive) return;
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
      this._touchStartTime = Date.now();
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
      if (this._trailerActive) return;
      const dx = e.changedTouches[0].clientX - this._touchStartX;
      const dy = e.changedTouches[0].clientY - this._touchStartY;
      const dt = Date.now() - this._touchStartTime;
      this._handleSwipe(dx, dy, dt);
    }, { passive: true });

    // Mouse drag (for desktop)
    card.addEventListener('mousedown', (e) => {
      if (this._trailerActive) return;
      this._touchStartX = e.clientX;
      this._touchStartY = e.clientY;
      this._touchStartTime = Date.now();
      this._mouseDown = true;
    });

    card.addEventListener('mouseup', (e) => {
      if (!this._mouseDown || this._trailerActive) return;
      this._mouseDown = false;
      const dx = e.clientX - this._touchStartX;
      const dy = e.clientY - this._touchStartY;
      const dt = Date.now() - this._touchStartTime;
      this._handleSwipe(dx, dy, dt);
    });

    card.addEventListener('mouseleave', () => { this._mouseDown = false; });
  }

  _handleSwipe(dx, dy, dt) {
    // Require horizontal > vertical, minimum 50px, within 500ms
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= 50 && dt < 500) {
      if (dx < 0) {
        this._currentIndex = (this._currentIndex + 1) % this._items.length;
      } else {
        this._currentIndex = (this._currentIndex - 1 + this._items.length) % this._items.length;
      }
      this._updateDisplay();
      this._resetCycleTimer();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  _render() {
    const cfg = this._config;
    const title = cfg.title;
    const theme = this._getTheme();
    const primaryRgb = this._hexToRgb(theme.primary);
    const secondaryRgb = this._hexToRgb(theme.secondary);
    const serverType = cfg.server_type || 'plex';
    const logoSvg = getLogoSvg(serverType, theme.primary);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          min-height: var(--card-fixed-height, 300px);
          --accent-primary: ${theme.primary};
          --accent-secondary: ${theme.secondary};
          --accent-primary-rgb: ${primaryRgb};
          --accent-secondary-rgb: ${secondaryRgb};
          --card-bg: ${theme.bg};
          --card-border: rgba(255,255,255,0.06);
          --text-primary: #f0f0f0;
          --text-secondary: #999;
          --text-dim: #666;
        }

        ha-card {
          height: 100%;
          min-height: var(--card-fixed-height, 300px);
          box-sizing: border-box;
          position: relative;
          background: var(--card-bg) !important;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--card-border) !important;
        }

        :host(.fixed-height) {
          height: auto;
        }

        :host(.fixed-height) ha-card {
          height: var(--card-fixed-height, 300px);
        }

        :host(.fixed-height) .card {
          position: relative;
          height: var(--card-fixed-height, 300px);
        }

        :host(.fixed-height) .content {
          min-height: var(--card-fixed-height, 300px);
        }

        .card {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          min-height: var(--card-fixed-height, 300px);
          background: var(--card-bg);
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Background art with blur */
        .bg-art, .bg-art-next {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-size: cover;
          background-position: center;
          filter: blur(20px) brightness(0.3);
          transform: scale(1.1);
          transition: opacity 0.8s ease;
        }
        .bg-art-next { opacity: 0; }
        .bg-art-next.active { opacity: 1; }

        /* Dark overlay */
        .bg-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.7) 100%);
        }

        /* Content */
        .content {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .header-title {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }

        .server-logo {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          display: inline-block;
          vertical-align: middle;
          border-radius: 4px;
        }

        .counter {
          font-size: 13px;
          color: var(--text-dim);
          font-variant-numeric: tabular-nums;
        }

        /* Main area */
        .main {
          display: flex;
          gap: 20px;
          flex: 1;
          min-height: 0;
        }

        /* Poster */
        .poster-wrap {
          flex-shrink: 0;
          width: auto;
          aspect-ratio: 2/3;
          height: 100%;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          background: #111;
          position: relative;
        }

        .poster {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity 0.5s ease;
        }

        .poster-shimmer {
          ${cfg.show_shimmer ? `
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }` : 'display: none;'}
        }

        /* Info */
        .info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
          gap: 8px;
        }

        .item-type {
          display: inline-block;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 5px 12px;
          border-radius: 3px;
          width: fit-content;
        }

        .item-type.movie {
          background: rgba(var(--accent-primary-rgb), 0.15);
          color: var(--accent-primary);
        }

        .item-type.tv {
          background: rgba(var(--accent-secondary-rgb), 0.15);
          color: var(--accent-secondary);
        }

        .item-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .item-subtitle {
          font-size: 17px;
          color: var(--text-secondary);
          line-height: 1.3;
        }

        .meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .item-rating {
          font-size: 16px;
          font-weight: 600;
          color: var(--accent-primary);
        }

        .time-ago {
          font-size: 15px;
          color: var(--text-dim);
        }

        .item-summary {
          font-size: 16px;
          color: var(--text-dim);
          line-height: 1.5;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 6;
          -webkit-box-orient: vertical;
          margin-top: 2px;
        }

        /* Dots — color-coded */
        .dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          padding-top: 16px;
          flex-shrink: 0;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          transition: all 0.3s ease;
        }

        .dot.movie {
          background: rgba(var(--accent-primary-rgb), 0.25);
        }

        .dot.tv {
          background: rgba(var(--accent-secondary-rgb), 0.25);
        }

        .dot.active.movie {
          background: var(--accent-primary);
          box-shadow: 0 0 6px rgba(var(--accent-primary-rgb), 0.4);
          width: 18px;
          border-radius: 3px;
        }

        .dot.active.tv {
          background: var(--accent-secondary);
          box-shadow: 0 0 6px rgba(var(--accent-secondary-rgb), 0.4);
          width: 18px;
          border-radius: 3px;
        }

        /* Trailer button */
        .trailer-btn {
          display: none;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #ddd;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 100px;
          min-height: 38px;
        }

        .trailer-btn:hover {
          background: rgba(255,255,255,0.2);
          color: #fff;
        }

        .trailer-btn.visible {
          display: inline-flex;
        }

        .trailer-btn svg {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }

        /* Inline trailer container */
        .trailer-wrap {
          display: none;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 10;
          background: #000;
          flex-direction: column;
        }

        .trailer-header {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 8px 12px;
          background: rgba(0,0,0,0.8);
          flex-shrink: 0;
        }

        .trailer-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .trailer-close-btn:hover {
          background: rgba(255,255,255,0.3);
        }

        .trailer-player-area {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          position: relative;
        }

        .trailer-player-area iframe,
        .trailer-player-area > div {
          width: 100%;
          height: 100%;
          border: none;
        }

        /* Mobile scaling — applied via :host(.mobile-scaling) with media query */
        @media (max-width: 520px) {
        :host(.mobile-scaling) .main {
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        :host(.mobile-scaling) .poster-wrap {
          height: auto;
          width: 40%;
          max-width: 140px;
        }
        :host(.mobile-scaling) .content {
          padding: 12px;
        }
        :host(.mobile-scaling) .item-title {
          font-size: 18px;
          -webkit-line-clamp: 1;
        }
        :host(.mobile-scaling) .item-subtitle {
          font-size: 13px;
        }
        :host(.mobile-scaling) .item-summary {
          font-size: 13px;
          -webkit-line-clamp: 3;
        }
        :host(.mobile-scaling) .item-type {
          font-size: 11px;
          padding: 3px 8px;
        }
        :host(.mobile-scaling) .header {
          margin-bottom: 8px;
        }
        :host(.mobile-scaling) .header-title {
          font-size: 12px;
        }
        :host(.mobile-scaling) .dots {
          padding-top: 8px;
        }
        :host(.mobile-scaling) .info {
          gap: 4px;
        }
        :host(.mobile-scaling) .trailer-btn {
          padding: 4px 8px;
          font-size: 11px;
          min-width: auto;
          min-height: auto;
        }
        :host(.mobile-scaling) .item-rating {
          font-size: 13px;
        }
        :host(.mobile-scaling) .time-ago {
          font-size: 12px;
        }
        }

        /* Error */
        .error-msg {
          display: none;
          text-align: center;
          padding: 20px;
          color: #cc4444;
          font-size: 12px;
        }

        /* Loading */
        .loading {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-dim);
          font-size: 12px;
        }
      </style>

      <ha-card>
        <div class="card">
          <div class="bg-art"></div>
          <div class="bg-art-next"></div>
          <div class="bg-overlay"></div>

          <!-- Inline trailer area -->
          <div class="trailer-wrap" id="trailerWrap">
            <div class="trailer-header">
              <button class="trailer-close-btn" id="trailerCloseBtn">&#x2715;</button>
            </div>
            <div class="trailer-player-area" id="trailerPlayerArea"></div>
          </div>

          <div class="content">
            ${title !== '' && title !== undefined ? `
            <div class="header">
              <span class="header-title">
                ${logoSvg}
                ${title}
              </span>
              <button class="trailer-btn" id="trailerBtn">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Trailer
              </button>
              <span class="counter"></span>
            </div>
            ` : ''}

            <div class="error-msg"></div>

            <div class="main">
              <div class="poster-wrap">
                <img class="poster" src="" alt="">
                <div class="poster-shimmer"></div>
              </div>
              <div class="info">
                <span class="item-type"></span>
                <div class="item-title">Loading...</div>
                <div class="item-subtitle"></div>
                <div class="meta-row">
                  <span class="item-rating"></span>
                  <span class="time-ago"></span>
                </div>
                <div class="item-summary"></div>
              </div>
            </div>

            <div class="dots"></div>
          </div>
        </div>
      </ha-card>
    `;

    this._attachSwipeListeners();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  disconnectedCallback() {
    if (this._cycleTimer) {
      clearInterval(this._cycleTimer);
      this._cycleTimer = null;
    }
    if (this._ytPlayer) {
      try { this._ytPlayer.destroy(); } catch (e) {}
      this._ytPlayer = null;
    }
  }
}

// ── Registration ───────────────────────────────────────────────────────────────

customElements.define('recently-added-media-card', RecentlyAddedMediaCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'recently-added-media-card',
  name: 'Recently Added Media',
  description: 'Displays recently added movies and TV shows from Plex, Kodi, Jellyfin, or Emby',
  preview: true,
  documentationURL: 'https://github.com/rusty4444/recently-added-media-card',
});
