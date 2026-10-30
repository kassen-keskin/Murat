// Kasa Haberleri & Mevzuat Radarı - Frontend Module
let khState = {
    initialized: false,
    loading: false,
    articles: [],
    categories: {},
    queries: [],
    lastUpdated: null,
    activeCategory: 'all',
    searchQuery: '',
    importanceFilter: 'all',
    currentReaderId: null
};

const KH_DEFAULT_CATEGORIES = {
    kanun: { name: "Kanun & Mevzuat", icon: "⚖️", color: "#ef5350" },
    teknoloji: { name: "Teknolojik Yenilikler", icon: "🚀", color: "#03dac6" },
    tse: { name: "TSE & Güvenlik", icon: "🔐", color: "#ffb300" },
    vergi: { name: "Vergi, ELSTER & DATEV", icon: "🏛️", color: "#42a5f5" },
    sektor: { name: "Sektör & POS Haberleri", icon: "🖥️", color: "#bb86fc" }
};

function khEscapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function initKasaHaberleriTab() {
    const container = document.getElementById('kasahaberleriContainer');
    if (!container) return;

    if (!khState.initialized) {
        renderKasaHaberleriShell(container);
        khState.initialized = true;
    }
    await loadKasaHaberleri();
}

function renderKasaHaberleriShell(container) {
    container.innerHTML = `
        <div class="kh-container">
            <!-- Top Bar -->
            <div class="kh-top-bar">
                <div class="kh-title-area">
                    <div class="kh-title-row">
                        <h2>📰 Kasa Haberleri, Mevzuat & Teknoloji Radarı</h2>
                        <span id="khLastUpdatedBadge" class="kh-last-updated">Yükleniyor...</span>
                    </div>
                    <div class="kh-subtitle">
                        Almanya yazar kasa sistemleri (KassenSichV, GoBD, § 146a AO Meldepflicht, TSE, E-Rechnung, ELSTER/DATEV ve yeni POS teknolojileri) güncel bilgi merkezi
                    </div>
                </div>
                <div class="kh-actions">
                    <button type="button" class="kh-btn kh-btn-teal" onclick="openKasaAiAdvisorModal()">
                        🤖 Mevzuat & Teknoloji Danışmanı (AI)
                    </button>
                    <button type="button" class="kh-btn" onclick="openKasaQueriesModal()">
                        ⚙️ Arama Konuları
                    </button>
                    <button type="button" id="khFetchBtn" class="kh-btn kh-btn-primary" onclick="fetchNewKasaHaberleri()">
                        🔄 Güncel Haberleri Çek (AI Analiz)
                    </button>
                </div>
            </div>

            <!-- Status Banner -->
            <div id="khStatusBanner" class="kh-status-banner"></div>

            <!-- Filter & Search Bar -->
            <div class="kh-filter-bar">
                <div id="khCategoryPills" class="kh-category-pills"></div>
                <div class="kh-search-row">
                    <input type="text" id="khSearchInput" class="kh-search-input"
                        placeholder="Haberlerde, kanun maddelerinde veya etiketlerde ara... (örn: E-Rechnung, TSE, 146a, ELSTER, SoftPOS)"
                        oninput="onKhSearchChange(this.value)">
                    <select id="khImportanceSelect" class="kh-select" onchange="onKhImportanceChange(this.value)">
                        <option value="all">Tüm Önem Dereceleri</option>
                        <option value="yuksek">🔴 Yüksek Önem / Zorunluluk</option>
                        <option value="orta">🟡 Orta Önem / Güncel</option>
                        <option value="bilgi">🔵 Bilgi / Sektörel</option>
                    </select>
                </div>
            </div>

            <!-- Cards Grid -->
            <div id="khCardsGrid" class="kh-grid"></div>
        </div>

        <!-- Reader Modal (Detaylı Okuma & Analiz Penceresi) -->
        <div id="khReaderModalOverlay" class="kh-modal-overlay" onclick="if(event.target===this) closeKasaHaberiReader()">
            <div class="kh-modal">
                <div class="kh-modal-header">
                    <div style="flex:1;">
                        <div id="khReaderBadges" class="kh-badges" style="margin-bottom:8px;"></div>
                        <h3 id="khReaderTitle" class="kh-modal-title">Haber Başlığı</h3>
                        <div id="khReaderSubMeta" style="font-size:0.84rem; color:var(--text-muted); margin-top:6px;"></div>
                    </div>
                    <button type="button" class="kh-modal-close" onclick="closeKasaHaberiReader()">&times;</button>
                </div>
                <div id="khReaderBody" class="kh-modal-body"></div>
                <div class="kh-modal-footer">
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" id="khReaderRefreshAiBtn" class="kh-btn" onclick="refreshCurrentReaderAi()">
                            ✨ AI İncelemesini Yeniden Üret
                        </button>
                        <button type="button" id="khReaderBookmarkBtn" class="kh-btn" onclick="toggleCurrentReaderBookmark()">
                            ⭐ Favorilere Ekle
                        </button>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <a id="khReaderExternalLink" href="#" target="_blank" rel="noopener noreferrer" class="kh-btn kh-btn-primary" style="text-decoration:none;">
                            🔗 Orijinal Kaynağı Aç ↗
                        </a>
                        <button type="button" class="kh-btn" onclick="closeKasaHaberiReader()">Kapat</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- AI Mevzuat & Teknoloji Danışmanı Modal -->
        <div id="khAiAdvisorModalOverlay" class="kh-modal-overlay" onclick="if(event.target===this) closeKasaAiAdvisorModal()">
            <div class="kh-modal" style="max-width:850px;">
                <div class="kh-modal-header">
                    <div>
                        <h3 class="kh-modal-title">🤖 Kasa Sistemleri Mevzuat & Teknoloji Danışmanı</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
                            Almanya kasa kanunları (KassenSichV, GoBD, ELSTER, E-Rechnung) ve POS teknolojileri hakkında merak ettiğiniz her şeyi sorun
                        </div>
                    </div>
                    <button type="button" class="kh-modal-close" onclick="closeKasaAiAdvisorModal()">&times;</button>
                </div>
                <div class="kh-modal-body">
                    <div>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">⚡ Hızlı Araştırma Konuları (Tıklayın):</div>
                        <div class="kh-quick-topics">
                            <span class="kh-topic-chip" onclick="askKasaAiAdvisor('2025-2026 § 146a AO ELSTER Kasa Bildirim Zorunluluğu (Meldepflicht) kuralları, süreleri ve cezaları nelerdir?')">⚖️ § 146a AO ELSTER Bildirim Zorunluluğu</span>
                            <span class="kh-topic-chip" onclick="askKasaAiAdvisor('Almanya E-Rechnung zorunluluğu yazar kasaları ve 250 Euro altı kasa fişlerini (Kleinbetragsrechnung) nasıl etkiler?')">🧾 E-Rechnung & Kasa Fişleri (250€ Sınırı)</span>
                            <span class="kh-topic-chip" onclick="askKasaAiAdvisor('Finanzamt Kassen-Nachschau (habersiz kasa denetimi) sırasında denetçiler kasada neleri kontrol eder?')">🕵️ Finanzamt Kassen-Nachschau Denetimi</span>
                            <span class="kh-topic-chip" onclick="askKasaAiAdvisor('TSE sertifika süresi dolduğunda kasa bayisi ve işletme adım adım ne yapmalıdır? Eski TSE kaç yıl saklanır?')">🔐 TSE Süresi Dolunca Ne Yapılmalı?</span>
                            <span class="kh-topic-chip" onclick="askKasaAiAdvisor('Gastronomi ve perakendede yeni nesil POS teknolojileri (SoftPOS, ZVT, Self-Checkout, Dijital Bon, Cloud-TSE) nelerdir?')">🚀 Yeni Nesil POS & SoftPOS Yenilikleri</span>
                            <span class="kh-topic-chip" onclick="askKasaAiAdvisor('Verfahrensdokumentation nedir, neden her yazar kasa kullanan işletmede bulunması zorunludur?')">📋 Verfahrensdokumentation Zorunluluğu</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input type="text" id="khAdvisorQuestionInput" class="kh-search-input"
                            placeholder="Örn: Restoranlarda Bewirtungsbeleg üzerinde hangi TSE bilgileri zorunludur?"
                            onkeydown="if(event.key==='Enter') askKasaAiAdvisor()">
                        <button type="button" id="khAdvisorAskBtn" class="kh-btn kh-btn-primary" onclick="askKasaAiAdvisor()">
                            🔍 Araştır & Açıkla
                        </button>
                    </div>
                    <div id="khAdvisorResultArea" style="min-height:120px;">
                        <div style="color:var(--text-muted); text-align:center; padding:30px 10px;">
                            Yukarıdaki hazır konulardan birine tıklayın veya öğrenmek istediğiniz konuyu yazıp <b>Araştır & Açıkla</b> butonuna basın.
                        </div>
                    </div>
                </div>
                <div class="kh-modal-footer">
                    <span></span>
                    <button type="button" class="kh-btn" onclick="closeKasaAiAdvisorModal()">Kapat</button>
                </div>
            </div>
        </div>

        <!-- Arama Konuları (Queries) Modal -->
        <div id="khQueriesModalOverlay" class="kh-modal-overlay" onclick="if(event.target===this) closeKasaQueriesModal()">
            <div class="kh-modal" style="max-width:720px;">
                <div class="kh-modal-header">
                    <div>
                        <h3 class="kh-modal-title">⚙️ Google News RSS Arama Konuları</h3>
                        <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">
                            Haber taramasında kullanılan Almanca anahtar kelimeleri ve kategorilerini yönetin
                        </div>
                    </div>
                    <button type="button" class="kh-modal-close" onclick="closeKasaQueriesModal()">&times;</button>
                </div>
                <div class="kh-modal-body">
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <input type="text" id="khNewQueryLabel" class="kh-search-input" placeholder="Konu Başlığı (örn: LaCash & POS)" style="flex:1; min-width:160px;">
                        <input type="text" id="khNewQueryText" class="kh-search-input" placeholder="Almanca Sorgu (örn: Kassensystem Gastronomie)" style="flex:2; min-width:200px;">
                        <select id="khNewQueryCat" class="kh-select">
                            <option value="kanun">⚖️ Kanun & Mevzuat</option>
                            <option value="teknoloji">🚀 Teknolojik Yenilikler</option>
                            <option value="tse">🔐 TSE & Güvenlik</option>
                            <option value="vergi">🏛️ Vergi, ELSTER & DATEV</option>
                            <option value="sektor">🖥️ Sektör & POS</option>
                        </select>
                        <button type="button" class="kh-btn kh-btn-teal" onclick="addKhQueryItem()">+ Ekle</button>
                    </div>
                    <div id="khQueriesListContainer" style="display:flex; flex-direction:column; gap:8px; max-height:360px; overflow-y:auto;"></div>
                </div>
                <div class="kh-modal-footer">
                    <button type="button" class="kh-btn" onclick="resetKhQueriesToDefault()">Varsayılanlara Sıfırla</button>
                    <div style="display:flex; gap:10px;">
                        <button type="button" class="kh-btn" onclick="closeKasaQueriesModal()">İptal</button>
                        <button type="button" class="kh-btn kh-btn-primary" onclick="saveKhQueries()">💾 Kaydet</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadKasaHaberleri() {
    try {
        const res = await fetch('/api/kasahaberleri');
        const data = await res.json();
        if (data && data.success) {
            khState.articles = Array.isArray(data.articles) ? data.articles : [];
            khState.categories = data.categories || KH_DEFAULT_CATEGORIES;
            khState.queries = Array.isArray(data.queries) ? data.queries : [];
            khState.lastUpdated = data.last_updated || '-';
            updateKhUI();
            if (khState.articles.length === 0 && !khState.loading) {
                await fetchNewKasaHaberleri();
            }
        }
    } catch (err) {
        console.error('Kasa haberleri yüklenemedi:', err);
    }
}

function showKhStatus(msg, isError = false) {
    const banner = document.getElementById('khStatusBanner');
    if (!banner) return;
    if (!msg) {
        banner.style.display = 'none';
        return;
    }
    banner.style.display = 'flex';
    banner.style.background = isError ? 'rgba(239, 83, 80, 0.14)' : 'rgba(3, 218, 198, 0.12)';
    banner.style.borderColor = isError ? 'rgba(239, 83, 80, 0.4)' : 'rgba(3, 218, 198, 0.35)';
    banner.style.color = isError ? '#ff8a80' : 'var(--secondary-color)';
    banner.innerHTML = msg;
}

async function fetchNewKasaHaberleri() {
    const btn = document.getElementById('khFetchBtn');
    if (khState.loading) return;
    khState.loading = true;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Google News & Gemini AI Taranıyor...';
    }
    showKhStatus('📡 Almanya Google News RSS kaynakları taranıyor, kasa sistemleriyle ilgili haberler seçilip Gemini AI ile Türkçeye özetleniyor. Lütfen bekleyin (10-20 sn)...');

    try {
        const res = await fetch('/api/kasahaberleri/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days: 30, max_new: 20 })
        });
        const data = await res.json();
        if (data && data.success) {
            khState.articles = Array.isArray(data.articles) ? data.articles : [];
            khState.lastUpdated = data.last_updated || khState.lastUpdated;
            updateKhUI();
            showKhStatus(`✅ Güncelleme tamamlandı! <b>${data.added_count || 0}</b> yeni haber analiz edilerek eklendi. Toplam <b>${khState.articles.length}</b> içerik mevcut.`);
            setTimeout(() => showKhStatus(''), 7000);
        } else {
            showKhStatus(`⚠️ Hata: ${khEscapeHtml(data.error || 'Bilinmeyen hata')}`, true);
        }
    } catch (err) {
        showKhStatus(`⚠️ Bağlantı hatası: ${khEscapeHtml(err.message)}`, true);
    } finally {
        khState.loading = false;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🔄 Güncel Haberleri Çek (AI Analiz)';
        }
    }
}

function updateKhUI() {
    const badge = document.getElementById('khLastUpdatedBadge');
    if (badge) {
        badge.textContent = `Son Güncelleme: ${khState.lastUpdated || '-'}`;
    }
    renderKhCategoryPills();
    renderKhCardsGrid();
}

function renderKhCategoryPills() {
    const container = document.getElementById('khCategoryPills');
    if (!container) return;

    const articles = khState.articles || [];
    const counts = {
        all: articles.length,
        kanun: articles.filter(a => a.category === 'kanun').length,
        teknoloji: articles.filter(a => a.category === 'teknoloji').length,
        tse: articles.filter(a => a.category === 'tse').length,
        vergi: articles.filter(a => a.category === 'vergi').length,
        sektor: articles.filter(a => a.category === 'sektor').length,
        bookmarked: articles.filter(a => a.is_bookmarked).length,
        unread: articles.filter(a => !a.is_read).length
    };

    const pills = [
        { key: 'all', label: '📋 Tümü', count: counts.all },
        { key: 'kanun', label: '⚖️ Kanun & Mevzuat', count: counts.kanun },
        { key: 'teknoloji', label: '🚀 Teknolojik Yenilikler', count: counts.teknoloji },
        { key: 'tse', label: '🔐 TSE & Güvenlik', count: counts.tse },
        { key: 'vergi', label: '🏛️ Vergi, ELSTER & DATEV', count: counts.vergi },
        { key: 'sektor', label: '🖥️ Sektör & POS', count: counts.sektor },
        { key: 'bookmarked', label: '⭐ Favoriler / Rehberler', count: counts.bookmarked },
        { key: 'unread', label: '🔵 Okunmamış', count: counts.unread }
    ];

    container.innerHTML = pills.map(p => `
        <div class="kh-pill ${khState.activeCategory === p.key ? 'active' : ''}" onclick="setKhCategory('${p.key}')">
            <span>${p.label}</span>
            <span class="kh-pill-count">${p.count}</span>
        </div>
    `).join('');
}

function setKhCategory(cat) {
    khState.activeCategory = cat;
    renderKhCategoryPills();
    renderKhCardsGrid();
}

function onKhSearchChange(val) {
    khState.searchQuery = (val || '').trim().toLowerCase();
    renderKhCardsGrid();
}

function onKhImportanceChange(val) {
    khState.importanceFilter = val || 'all';
    renderKhCardsGrid();
}

function getFilteredKhArticles() {
    return (khState.articles || []).filter(a => {
        if (khState.activeCategory === 'bookmarked' && !a.is_bookmarked) return false;
        if (khState.activeCategory === 'unread' && a.is_read) return false;
        if (!['all', 'bookmarked', 'unread'].includes(khState.activeCategory) && a.category !== khState.activeCategory) {
            return false;
        }
        if (khState.importanceFilter !== 'all' && a.importance !== khState.importanceFilter) {
            return false;
        }
        if (khState.searchQuery) {
            const hay = [
                a.title_tr,
                a.original_title,
                a.summary_tr,
                a.impact_tr,
                a.source,
                ...(Array.isArray(a.tags) ? a.tags : [])
            ].join(' ').toLowerCase();
            if (!hay.includes(khState.searchQuery)) return false;
        }
        return true;
    });
}

function renderKhCardsGrid() {
    const grid = document.getElementById('khCardsGrid');
    if (!grid) return;

    const filtered = getFilteredKhArticles();
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align:center; padding: 50px 20px; background: var(--surface-color); border-radius: 10px; border: 1px dashed var(--border-color); color: var(--text-muted);">
                <div style="font-size:2.2rem; margin-bottom:10px;">📭</div>
                <div style="font-size:1.1rem; font-weight:600; color:var(--text-color);">Bu filtreye uygun haber veya mevzuat kaydı bulunamadı.</div>
                <div style="margin-top:8px; font-size:0.9rem;">Üstteki <b>"🔄 Güncel Haberleri Çek (AI Analiz)"</b> butonuna tıklayarak Google News'ten en yeni gelişmeleri çekebilirsiniz.</div>
            </div>
        `;
        return;
    }

    const cats = khState.categories || KH_DEFAULT_CATEGORIES;
    const impLabels = {
        yuksek: 'Kritik / Yüksek Önem',
        orta: 'Güncel Gelişme',
        bilgi: 'Bilgi'
    };

    grid.innerHTML = filtered.map(a => {
        const catMeta = cats[a.category] || KH_DEFAULT_CATEGORIES.sektor;
        const imp = a.importance || 'orta';
        const tagsHtml = (Array.isArray(a.tags) ? a.tags : []).slice(0, 4).map(t => `<span class="kh-tag">#${khEscapeHtml(t)}</span>`).join('');
        const targetUrl = a.resolved_url || a.url || '#';

        return `
            <div class="kh-card ${a.is_read ? '' : 'unread'} importance-${khEscapeHtml(imp)}" onclick="openKasaHaberiReader('${khEscapeHtml(a.id)}')">
                <div>
                    <div class="kh-card-top">
                        <div class="kh-badges">
                            <span class="kh-badge-cat" style="background:${catMeta.color}22; color:${catMeta.color}; border:1px solid ${catMeta.color}55;">
                                ${catMeta.icon} ${khEscapeHtml(catMeta.name)}
                            </span>
                            <span class="kh-badge-imp ${khEscapeHtml(imp)}">
                                ${khEscapeHtml(impLabels[imp] || 'Güncel')}
                            </span>
                            ${!a.is_read ? '<span style="font-size:0.72rem; color:var(--secondary-color); font-weight:700;">● YENİ</span>' : ''}
                        </div>
                        <button type="button" class="kh-bookmark-btn ${a.is_bookmarked ? 'active' : ''}"
                            title="${a.is_bookmarked ? 'Favorilerden çıkar' : 'Favorilere / Önemlilere ekle'}"
                            onclick="toggleKasaHaberiBookmark(event, '${khEscapeHtml(a.id)}')">
                            ${a.is_bookmarked ? '★' : '☆'}
                        </button>
                    </div>

                    <h3 class="kh-card-title-tr" style="margin-top:10px;">${khEscapeHtml(a.title_tr || a.original_title)}</h3>
                    <div class="kh-card-title-de">DE: ${khEscapeHtml(a.original_title)}</div>

                    <p class="kh-card-summary" style="margin-top:10px;">
                        ${khEscapeHtml(a.summary_tr || 'Detaylı Türkçe inceleme ve çeviri için karta tıklayın.')}
                    </p>

                    ${a.impact_tr ? `
                        <div class="kh-card-impact" style="margin-top:10px;">
                            <strong>💡 Kasa Sistemleri İçin Önemi:</strong> ${khEscapeHtml(a.impact_tr)}
                        </div>
                    ` : ''}
                </div>

                <div>
                    ${tagsHtml ? `<div class="kh-tags" style="margin-bottom:10px;">${tagsHtml}</div>` : ''}
                    <div class="kh-card-footer">
                        <div class="kh-source-meta">
                            <span class="kh-source-name">📰 ${khEscapeHtml(a.source || 'Google News')}</span>
                            <span>📅 ${khEscapeHtml(a.date_display || '')}</span>
                        </div>
                        <div class="kh-card-btns">
                            <button type="button" class="kh-read-btn" onclick="event.stopPropagation(); openKasaHaberiReader('${khEscapeHtml(a.id)}')">
                                📖 Panelde Oku
                            </button>
                            <a href="${khEscapeHtml(targetUrl)}" target="_blank" rel="noopener noreferrer"
                                class="kh-ext-link" title="Orijinal kaynağı yeni sekmede aç"
                                onclick="event.stopPropagation();">
                                ↗
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function toggleKasaHaberiBookmark(event, articleId) {
    if (event) event.stopPropagation();
    const target = (khState.articles || []).find(a => a.id === articleId);
    if (!target) return;

    const newVal = !target.is_bookmarked;
    target.is_bookmarked = newVal;
    updateKhUI();

    try {
        await fetch('/api/kasahaberleri/update-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: articleId, is_bookmarked: newVal })
        });
    } catch (err) {
        console.error('Favori güncellenemedi:', err);
    }
}

async function openKasaHaberiReader(articleId, forceRefresh = false) {
    const article = (khState.articles || []).find(a => a.id === articleId);
    if (!article) return;

    khState.currentReaderId = articleId;
    article.is_read = true;
    updateKhUI();

    const overlay = document.getElementById('khReaderModalOverlay');
    const titleEl = document.getElementById('khReaderTitle');
    const subMetaEl = document.getElementById('khReaderSubMeta');
    const badgesEl = document.getElementById('khReaderBadges');
    const bodyEl = document.getElementById('khReaderBody');
    const extLinkEl = document.getElementById('khReaderExternalLink');
    const bookmarkBtn = document.getElementById('khReaderBookmarkBtn');

    if (!overlay || !bodyEl) return;

    const cats = khState.categories || KH_DEFAULT_CATEGORIES;
    const catMeta = cats[article.category] || KH_DEFAULT_CATEGORIES.sektor;

    badgesEl.innerHTML = `
        <span class="kh-badge-cat" style="background:${catMeta.color}22; color:${catMeta.color}; border:1px solid ${catMeta.color}55;">
            ${catMeta.icon} ${khEscapeHtml(catMeta.name)}
        </span>
    `;
    const updateModalLinks = (art) => {
        const fullUrl = art.resolved_url || art.url || '#';
        extLinkEl.href = fullUrl;
        subMetaEl.innerHTML = `
            <div><b>Orijinal Başlık (DE):</b> ${khEscapeHtml(art.original_title)} &nbsp;|&nbsp; <b>Kaynak:</b> ${khEscapeHtml(art.source)} &nbsp;|&nbsp; <b>Tarih:</b> ${khEscapeHtml(art.date_display)}</div>
            <div style="margin-top:4px; word-break:break-all;"><b>🔗 Haberin Tam Adresi:</b> <a href="${khEscapeHtml(fullUrl)}" target="_blank" rel="noopener noreferrer" style="color:var(--secondary-color); text-decoration:underline;">${khEscapeHtml(fullUrl)}</a></div>
        `;
    };

    titleEl.textContent = article.title_tr || article.original_title;
    updateModalLinks(article);
    bookmarkBtn.innerHTML = article.is_bookmarked ? '★ Favorilerde Kayıtlı' : '☆ Favorilere Ekle';

    overlay.style.display = 'flex';

    const currentUrl = article.resolved_url || article.url || '';
    const needsDeepResolve = currentUrl.includes('news.google.com') || !(article.reader_content && article.reader_content.scraped_de);

    if (article.reader_content && !forceRefresh && !needsDeepResolve) {
        renderReaderBodyContent(article, article.reader_content);
        fetch('/api/kasahaberleri/update-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: articleId, is_read: true })
        }).catch(() => {});
        return;
    }

    bodyEl.innerHTML = `
        <div style="text-align:center; padding:45px 20px;">
            <div style="font-size:2rem; margin-bottom:12px;">🤖📖</div>
            <div style="font-size:1.1rem; font-weight:600; color:var(--primary-color);">
                Haberin tam bağlantısı çözümleniyor, makale metni çekiliyor ve Türkçeye çevriliyor...
            </div>
            <div style="font-size:0.9rem; color:var(--text-muted); margin-top:8px;">
                Haber kaynağındaki tam metin ve kasa sistemleri mevzuat/teknoloji analizi Gemini AI tarafından hazırlanıyor.
            </div>
        </div>
    `;

    try {
        const res = await fetch('/api/kasahaberleri/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: articleId, force_refresh: forceRefresh })
        });
        const data = await res.json();
        if (data && data.success && data.reader) {
            article.reader_content = data.reader;
            if (data.article) {
                if (data.article.resolved_url) article.resolved_url = data.article.resolved_url;
                if (data.article.url) article.url = data.article.url;
                updateModalLinks(article);
                updateKhUI();
            }
            renderReaderBodyContent(article, data.reader);
        } else {
            bodyEl.innerHTML = `<div style="color:#ff8a80; padding:20px;">İçerik yüklenemedi: ${khEscapeHtml(data.error || 'Bilinmeyen hata')}</div>`;
        }
    } catch (err) {
        bodyEl.innerHTML = `<div style="color:#ff8a80; padding:20px;">Bağlantı hatası: ${khEscapeHtml(err.message)}</div>`;
    }
}

function renderReaderBodyContent(article, reader) {
    const bodyEl = document.getElementById('khReaderBody');
    if (!bodyEl) return;

    const actions = Array.isArray(reader.action_items_tr) ? reader.action_items_tr : [];
    const glossary = Array.isArray(reader.glossary) ? reader.glossary : [];

    bodyEl.innerHTML = `
        ${reader.lead_tr ? `<div class="kh-reader-lead">${khEscapeHtml(reader.lead_tr)}</div>` : ''}

        <div class="kh-reader-section">
            <h4>📄 Haberin Detaylı İçeriği ve Türkçe Açıklaması</h4>
            <div class="kh-reader-body-text">${khEscapeHtml(reader.article_body_tr || article.summary_tr)}</div>
        </div>

        ${reader.legal_or_tech_context_tr ? `
            <div class="kh-reader-section" style="border-color: rgba(3, 218, 198, 0.4);">
                <h4>⚖️ Kanuni / Teknolojik Arka Plan & Kasa Sistemlerine Etkisi</h4>
                <div class="kh-reader-body-text">${khEscapeHtml(reader.legal_or_tech_context_tr)}</div>
            </div>
        ` : ''}

        ${actions.length > 0 ? `
            <div class="kh-reader-section">
                <h4>✅ Kasa Kurulum, Satış ve Servis İçin Dikkat Edilmesi Gerekenler</h4>
                <ul class="kh-action-list">
                    ${actions.map(item => `<li>${khEscapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        ${glossary.length > 0 ? `
            <div class="kh-reader-section">
                <h4>📚 Konuyla İlgili Almanca - Türkçe Terimler Sözlüğü</h4>
                <div class="kh-glossary-grid">
                    ${glossary.map(g => `
                        <div class="kh-glossary-item">
                            <div class="kh-glossary-term">${khEscapeHtml(g.term)}</div>
                            <div class="kh-glossary-meaning">${khEscapeHtml(g.meaning_tr)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        ${reader.scraped_de ? `
            <details class="kh-reader-section" style="cursor:pointer;">
                <summary style="font-weight:600; color:var(--text-muted);">🇩🇪 Kaynaktan Çekilen Orijinal Almanca Metin Kesitini Göster</summary>
                <div class="kh-reader-body-text" style="margin-top:12px; font-size:0.88rem; color:#aaa;">${khEscapeHtml(reader.scraped_de)}</div>
            </details>
        ` : ''}

        <div class="kh-reader-section">
            <h4>📝 Kişisel Notlarım (Bu haber veya kanun maddesi hakkında not ekleyin)</h4>
            <textarea id="khArticleNoteInput" class="kh-note-textarea" placeholder="Örn: Müşterilere TSE değişiminde bu kuralı hatırlat...">${khEscapeHtml(article.user_note || '')}</textarea>
            <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                <button type="button" class="kh-btn kh-btn-teal" onclick="saveKasaHaberiNote('${khEscapeHtml(article.id)}')">💾 Notu Kaydet</button>
            </div>
        </div>
    `;
}

function closeKasaHaberiReader() {
    const overlay = document.getElementById('khReaderModalOverlay');
    if (overlay) overlay.style.display = 'none';
    khState.currentReaderId = null;
}

function refreshCurrentReaderAi() {
    if (khState.currentReaderId) {
        openKasaHaberiReader(khState.currentReaderId, true);
    }
}

async function toggleCurrentReaderBookmark() {
    if (!khState.currentReaderId) return;
    await toggleKasaHaberiBookmark(null, khState.currentReaderId);
    const article = (khState.articles || []).find(a => a.id === khState.currentReaderId);
    const btn = document.getElementById('khReaderBookmarkBtn');
    if (article && btn) {
        btn.innerHTML = article.is_bookmarked ? '★ Favorilerde Kayıtlı' : '☆ Favorilere Ekle';
    }
}

async function saveKasaHaberiNote(articleId) {
    const input = document.getElementById('khArticleNoteInput');
    if (!input) return;
    const note = input.value.trim();
    const article = (khState.articles || []).find(a => a.id === articleId);
    if (article) article.user_note = note;

    try {
        const res = await fetch('/api/kasahaberleri/update-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: articleId, user_note: note })
        });
        const data = await res.json();
        if (data && data.success) {
            alert('Notunuz kaydedildi.');
        }
    } catch (err) {
        alert('Not kaydedilirken hata oluştu: ' + err.message);
    }
}

/* AI Mevzuat & Teknoloji Danışmanı */
function openKasaAiAdvisorModal() {
    const overlay = document.getElementById('khAiAdvisorModalOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function closeKasaAiAdvisorModal() {
    const overlay = document.getElementById('khAiAdvisorModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

async function askKasaAiAdvisor(presetQuestion) {
    const input = document.getElementById('khAdvisorQuestionInput');
    const resultArea = document.getElementById('khAdvisorResultArea');
    const askBtn = document.getElementById('khAdvisorAskBtn');

    if (presetQuestion && input) {
        input.value = presetQuestion;
    }
    const question = input ? input.value.trim() : (presetQuestion || '');
    if (!question) {
        alert('Lütfen araştırmak istediğiniz soruyu veya konuyu yazın.');
        return;
    }

    if (askBtn) askBtn.disabled = true;
    if (resultArea) {
        resultArea.innerHTML = `
            <div style="text-align:center; padding:35px 15px;">
                <div style="font-size:1.8rem; margin-bottom:10px;">⏳🤖</div>
                <div style="color:var(--primary-color); font-weight:600;">"${khEscapeHtml(question)}" konusu Almanya kasa mevzuatı ve POS standartlarına göre inceleniyor...</div>
            </div>
        `;
    }

    try {
        const res = await fetch('/api/kasahaberleri/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });
        const data = await res.json();
        if (data && data.success && data.result) {
            const r = data.result;
            const points = Array.isArray(r.key_points) ? r.key_points : [];
            const terms = Array.isArray(r.terms) ? r.terms : [];

            resultArea.innerHTML = `
                <div class="kh-reader-lead" style="margin-bottom:14px;">
                    <strong>${khEscapeHtml(r.title || question)}</strong><br>
                    <span style="font-weight:400; font-size:0.96rem;">${khEscapeHtml(r.summary || '')}</span>
                </div>
                <div class="kh-reader-section" style="margin-bottom:14px;">
                    <h4>📖 Detaylı Açıklama</h4>
                    <div class="kh-reader-body-text">${khEscapeHtml(r.detailed_explanation || '')}</div>
                </div>
                ${points.length > 0 ? `
                    <div class="kh-reader-section" style="margin-bottom:14px;">
                        <h4>🎯 Kritik Kurallar & Dikkat Edilecek Noktalar</h4>
                        <ul class="kh-action-list">
                            ${points.map(p => `<li>${khEscapeHtml(p)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${terms.length > 0 ? `
                    <div class="kh-reader-section">
                        <h4>📚 İlgili Almanca Terimler</h4>
                        <div class="kh-glossary-grid">
                            ${terms.map(t => `
                                <div class="kh-glossary-item">
                                    <div class="kh-glossary-term">${khEscapeHtml(t.term)}</div>
                                    <div class="kh-glossary-meaning">${khEscapeHtml(t.meaning_tr)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
        } else {
            resultArea.innerHTML = `<div style="color:#ff8a80; padding:16px;">Hata: ${khEscapeHtml(data.error || 'Yanıt alınamadı')}</div>`;
        }
    } catch (err) {
        if (resultArea) {
            resultArea.innerHTML = `<div style="color:#ff8a80; padding:16px;">Bağlantı hatası: ${khEscapeHtml(err.message)}</div>`;
        }
    } finally {
        if (askBtn) askBtn.disabled = false;
    }
}

/* Arama Konuları (Queries) Yönetimi */
function openKasaQueriesModal() {
    const overlay = document.getElementById('khQueriesModalOverlay');
    if (overlay) {
        renderKhQueriesEditorList();
        overlay.style.display = 'flex';
    }
}

function closeKasaQueriesModal() {
    const overlay = document.getElementById('khQueriesModalOverlay');
    if (overlay) overlay.style.display = 'none';
}

function renderKhQueriesEditorList() {
    const listEl = document.getElementById('khQueriesListContainer');
    if (!listEl) return;
    const cats = khState.categories || KH_DEFAULT_CATEGORIES;

    listEl.innerHTML = (khState.queries || []).map((q, idx) => {
        const catMeta = cats[q.category] || KH_DEFAULT_CATEGORIES.sektor;
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; background:var(--card-bg); border:1px solid var(--border-color); padding:10px 14px; border-radius:8px;">
                <div style="flex:1;">
                    <div style="font-weight:700; color:#fff; font-size:0.92rem;">
                        ${catMeta.icon} ${khEscapeHtml(q.label || q.query)}
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-muted); font-family:monospace; margin-top:2px;">
                        ${khEscapeHtml(q.query)}
                    </div>
                </div>
                <button type="button" class="kh-btn" style="padding:5px 10px; color:#ff8a80;" onclick="removeKhQueryItem(${idx})">🗑️</button>
            </div>
        `;
    }).join('');
}

function addKhQueryItem() {
    const labelEl = document.getElementById('khNewQueryLabel');
    const queryEl = document.getElementById('khNewQueryText');
    const catEl = document.getElementById('khNewQueryCat');
    const query = (queryEl?.value || '').trim();
    const label = (labelEl?.value || query).trim();
    const category = catEl?.value || 'sektor';

    if (!query) {
        alert('Lütfen Almanca arama sorgusunu girin.');
        return;
    }
    khState.queries.push({ label, query, category });
    if (labelEl) labelEl.value = '';
    if (queryEl) queryEl.value = '';
    renderKhQueriesEditorList();
}

function removeKhQueryItem(idx) {
    khState.queries.splice(idx, 1);
    renderKhQueriesEditorList();
}

async function saveKhQueries() {
    try {
        const res = await fetch('/api/kasahaberleri/queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queries: khState.queries })
        });
        const data = await res.json();
        if (data && data.success) {
            khState.queries = data.queries;
            closeKasaQueriesModal();
            showKhStatus('✅ Arama konuları kaydedildi. "Güncel Haberleri Çek" butonuyla yeni konulara göre tarama yapabilirsiniz.');
        }
    } catch (err) {
        alert('Kaydedilemedi: ' + err.message);
    }
}

async function resetKhQueriesToDefault() {
    try {
        const res = await fetch('/api/kasahaberleri/queries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset: true })
        });
        const data = await res.json();
        if (data && data.success) {
            khState.queries = data.queries;
            renderKhQueriesEditorList();
        }
    } catch (err) {
        alert('Sıfırlanamadı: ' + err.message);
    }
}
