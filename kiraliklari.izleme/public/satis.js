// ================================================
// Kassen Keskin — Yeni Satış Modülü JS
// ================================================

const SATIS_KEY = 'kassenKeskinSatisData';

const ADMIN_GROUPS = [
    { key: 'yazarkasa', label: 'A. Yazarkasa',             hasRent: true  },
    { key: 'yazici',    label: 'A. Yazıcı',                hasRent: true  },
    { key: 'cekmece',   label: 'A. Çekmece',               hasRent: true  },
    { key: 'barkod',    label: 'A. Barkod Okuyucu',        hasRent: true  },
    { key: 'yazilim',   label: 'B. Yazılım',               hasRent: true  },
    { key: 'servis',    label: 'C. Servis',                 hasRent: true  },
    { key: 'hizmet',    label: 'D. Hizmet',                 hasRent: true  },
    { key: 'tse',       label: 'E. TSE',                    hasRent: false },
    { key: 'vergi',     label: 'F. Vergi Dairesi Bildirimi',hasRent: false },
];

const WIZARD_STEPS = [
    { key: 'yazarkasa', label: 'Yazarkasa Seçimi',         group: 'A. Donanım',           num: 1, multi: false, maxSel: 1,  hasRent: true  },
    { key: 'yazici',    label: 'Yazıcı Seçimi',            group: 'A. Donanım',           num: 2, multi: false, maxSel: 1,  hasRent: true  },
    { key: 'cekmece',   label: 'Çekmece Seçimi',           group: 'A. Donanım',           num: 3, multi: false, maxSel: 1,  hasRent: true  },
    { key: 'barkod',    label: 'Barkod Okuyucu Seçimi',    group: 'A. Donanım',           num: 4, multi: false, maxSel: 1,  hasRent: true  },
    { key: 'yazilim',   label: 'Yazılım Seçimi',           group: 'B. Yazılım',           num: 5, multi: false, maxSel: 1,  hasRent: true  },
    { key: 'servis',    label: 'Servis Seçimi',            group: 'C. Servis',            num: 6, multi: false, maxSel: 1,  hasRent: true  },
    { key: 'hizmet',    label: 'Hizmet Seçimi (Çoklu)',    group: 'D. Hizmet',            num: 7, multi: true,  maxSel: 99, hasRent: true  },
    { key: 'tse',       label: 'TSE Seçimi',               group: 'E. TSE',               num: 8, multi: false, maxSel: 1,  hasRent: false },
    { key: 'vergi',     label: 'Vergi Dairesi Bildirimi',  group: 'F. Zorunlu Bildirim',  num: 9, multi: true,  maxSel: 2,  hasRent: false },
];

let satisData    = { items: {}, kdvOrani: 19 };
let satisSecimler = {};
let currentStep   = 0;
let satisInited   = false;
let imzaDrawing   = false;
let imzaCanvas    = null;
let imzaCtx       = null;
let editState     = { groupKey: null, itemId: null };

// ---- Helpers ----

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function fmtTL(num) {
    return Number(num || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ---- Data ----

function loadSatisData() {
    try {
        const s = localStorage.getItem(SATIS_KEY);
        if (s) satisData = JSON.parse(s);
    } catch (e) { /* ignore */ }
    if (!satisData.items)       satisData.items       = {};
    if (!satisData.kdvOrani)    satisData.kdvOrani    = 19;
    if (!satisData.temsilciler) satisData.temsilciler = [];
    ADMIN_GROUPS.forEach(g => {
        if (!satisData.items[g.key]) satisData.items[g.key] = [];
    });
}

function saveSatisData() {
    try { localStorage.setItem(SATIS_KEY, JSON.stringify(satisData)); }
    catch (e) { alert('Kaydetme hatası: ' + e.message); }
}

// ---- Init ----

function initSatisTab() {
    loadSatisData();
    document.getElementById('adminKdvOrani').value = satisData.kdvOrani;
    setImzaTarih();
    renderAdminGroups();
    renderTemsilcilerAdmin();
    renderTemsilciSelect();
    if (!satisInited) {
        resetSecimler();
        renderWizardAll();
        initImzaCanvas();
        satisInited = true;
    } else {
        updateTotals();
    }
}

function setImzaTarih() {
    const d   = new Date();
    const str = String(d.getDate()).padStart(2,'0') + '.' +
                String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
    const el  = document.getElementById('imzaTarih');
    if (el) el.textContent = str;
}

// ---- Admin Panel ----

function toggleAdminPanel() {
    const p         = document.getElementById('adminPanel');
    const isOpening = p.style.display === 'none';
    p.style.display = isOpening ? 'block' : 'none';

    // Sections to hide while admin panel is open
    const sectionIds = ['wizardContainer', 'selOzet', 'genelToplamSection', 'imzaSection', 'pdfRow'];

    sectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isOpening) {
            // Save current visibility and hide
            el.dataset.adminHidden = el.style.display || '';
            el.style.display = 'none';
        } else {
            // Restore previous visibility
            el.style.display = el.dataset.adminHidden || '';
            delete el.dataset.adminHidden;
        }
    });
}

function renderAdminGroups() {
    const c = document.getElementById('adminGroupsContainer');
    c.innerHTML = '';
    ADMIN_GROUPS.forEach(g => {
        const items = satisData.items[g.key] || [];
        const div   = document.createElement('div');
        div.className = 'admin-group';
        div.innerHTML = `
            <div class="admin-group-hdr">
                <span class="admin-group-title">${g.label}</span>
            </div>
            <div class="admin-items">
                ${items.map(item => adminItemHTML(g.key, item, g.hasRent)).join('') || '<div style="padding:8px;font-size:0.8rem;color:#555;">Henüz ürün eklenmedi</div>'}
            </div>
            <div class="admin-group-add">
                <button class="btn-add" onclick="openItemModal('${g.key}',null)">+ Ürün / Hizmet Ekle</button>
            </div>`;
        c.appendChild(div);
    });
}

function adminItemHTML(groupKey, item, hasRent) {
    const imgHtml  = item.image
        ? `<img class="admin-item-img" src="${item.image}" alt="">`
        : `<div class="admin-item-ph">📦</div>`;
    const rentText = hasRent ? ` | Kira: ${fmtTL(item.kiralamaFiyati)}/ay` : '';
    return `<div class="admin-item">
        ${imgHtml}
        <div class="admin-item-info">
            <div class="admin-item-name">${item.name}</div>
            <div class="admin-item-prices">Satış: ${fmtTL(item.satisFiyati)}${rentText}</div>
        </div>
        <div class="admin-item-btns">
            <button class="btn-ico edit" onclick="openItemModal('${groupKey}','${item.id}')">✏️</button>
            <button class="btn-ico del"  onclick="deleteItem('${groupKey}','${item.id}')">🗑️</button>
        </div>
    </div>`;
}

function adminKaydet() {
    satisData.kdvOrani = parseFloat(document.getElementById('adminKdvOrani').value) || 19;
    saveSatisData();
    renderAdminGroups();
    renderTemsilcilerAdmin();
    renderTemsilciSelect();
    renderWizardAll();
    alert('✅ Tüm tanımlamalar kaydedildi!');
}

// ---- Temsilci CRUD ----

function renderTemsilcilerAdmin() {
    const c = document.getElementById('adminTemsilcilerList');
    if (!c) return;
    const list = satisData.temsilciler || [];
    c.innerHTML = list.length === 0
        ? '<div style="padding:8px;font-size:0.8rem;color:#555;">Henüz temsilci eklenmedi</div>'
        : list.map(t => `<div class="admin-item">
            <div class="admin-item-ph">👤</div>
            <div class="admin-item-info"><div class="admin-item-name">${t.name}</div></div>
            <div class="admin-item-btns">
                <button class="btn-ico del" onclick="deleteTemsilci('${t.id}')">🗑️</button>
            </div>
        </div>`).join('');
    renderTemsilciSelect();
}

function addTemsilci() {
    const input = document.getElementById('newTemsilciInput');
    const name  = input.value.trim();
    if (!name) { alert('Lütfen bir isim giriniz.'); return; }
    if (!satisData.temsilciler) satisData.temsilciler = [];
    satisData.temsilciler.push({ id: genId(), name });
    input.value = '';
    renderTemsilcilerAdmin();
}

function deleteTemsilci(id) {
    if (!confirm('Bu temsilciyi silmek istiyor musunuz?')) return;
    satisData.temsilciler = (satisData.temsilciler || []).filter(t => t.id !== id);
    renderTemsilcilerAdmin();
}

function renderTemsilciSelect() {
    const sel = document.getElementById('imzaTemsilci');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">-- Seçiniz --</option>';
    (satisData.temsilciler || []).forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.name;
        opt.textContent = t.name;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

// ---- Item Modal ----

function openItemModal(groupKey, itemId) {
    editState = { groupKey, itemId };
    const grp  = ADMIN_GROUPS.find(g => g.key === groupKey);
    let item   = { id: null, name: '', image: '', satisFiyati: 0, kiralamaFiyati: 0 };
    if (itemId) item = (satisData.items[groupKey] || []).find(x => x.id === itemId) || item;

    document.getElementById('itemModalTitle').textContent =
        (itemId ? 'Ürünü Düzenle' : 'Yeni Ekle') + ' — ' + grp.label;
    document.getElementById('iName').value  = item.name;
    document.getElementById('iSatis').value = item.satisFiyati || '';

    const rentRow = document.getElementById('iKiraRow');
    rentRow.style.display = grp.hasRent ? 'block' : 'none';
    if (grp.hasRent) document.getElementById('iKira').value = item.kiralamaFiyati || '';

    const box = document.getElementById('imgPreviewBox');
    const img = document.getElementById('imgPreviewEl');
    if (item.image) { img.src = item.image; box.classList.add('on'); }
    else            { img.src = '';         box.classList.remove('on'); }

    document.getElementById('iImg').value = '';
    document.getElementById('itemModalOverlay').classList.add('open');
}

function closeItemModal() {
    document.getElementById('itemModalOverlay').classList.remove('open');
    editState = { groupKey: null, itemId: null };
}

function handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const img = document.getElementById('imgPreviewEl');
        const box = document.getElementById('imgPreviewBox');
        img.src = e.target.result;
        box.classList.add('on');
    };
    reader.readAsDataURL(file);
}

function saveItem() {
    const { groupKey, itemId } = editState;
    if (!groupKey) return;
    const grp  = ADMIN_GROUPS.find(g => g.key === groupKey);
    const name = document.getElementById('iName').value.trim();
    if (!name) { alert('Lütfen bir isim giriniz.'); return; }

    const satisFiyati    = parseFloat(document.getElementById('iSatis').value) || 0;
    const kiralamaFiyati = grp.hasRent ? (parseFloat(document.getElementById('iKira').value) || 0) : null;

    const img   = document.getElementById('imgPreviewEl');
    const box   = document.getElementById('imgPreviewBox');
    const image = box.classList.contains('on') ? img.src : '';

    if (!satisData.items[groupKey]) satisData.items[groupKey] = [];

    if (itemId) {
        const idx = satisData.items[groupKey].findIndex(x => x.id === itemId);
        if (idx >= 0) satisData.items[groupKey][idx] = { id: itemId, name, image, satisFiyati, kiralamaFiyati };
    } else {
        satisData.items[groupKey].push({ id: genId(), name, image, satisFiyati, kiralamaFiyati });
    }

    closeItemModal();
    renderAdminGroups();
    renderWizardAll();
}

function deleteItem(groupKey, itemId) {
    if (!confirm('Bu ürünü silmek istiyor musunuz?')) return;
    satisData.items[groupKey] = (satisData.items[groupKey] || []).filter(x => x.id !== itemId);
    const step = WIZARD_STEPS.find(s => s.key === groupKey);
    if (step) {
        if (step.multi) satisSecimler[groupKey] = (satisSecimler[groupKey] || []).filter(id => id !== itemId);
        else if (satisSecimler[groupKey] === itemId) satisSecimler[groupKey] = null;
    }
    renderAdminGroups();
    renderWizardAll();
    updateTotals();
}

// ---- Wizard ----

function resetSecimler() {
    satisSecimler = {};
    WIZARD_STEPS.forEach(s => { satisSecimler[s.key] = s.multi ? [] : null; });
    currentStep = 0;
}

function renderWizardAll() {
    const c = document.getElementById('wizardContainer');
    c.innerHTML = '';
    WIZARD_STEPS.forEach((step, idx) => {
        const div = document.createElement('div');
        div.className = 'w-step' + (idx !== 0 ? ' done' : ' entering');
        div.id        = 'wstep_' + step.key;
        div.innerHTML = buildStepHTML(step, idx);
        c.appendChild(div);
    });
    document.getElementById('selOzet').style.display = 'none';
    currentStep = 0;
    updateTotals();
}

function buildStepHTML(step, idx) {
    const items  = satisData.items[step.key] || [];
    const selArr = step.multi
        ? (satisSecimler[step.key] || [])
        : (satisSecimler[step.key] ? [satisSecimler[step.key]] : []);

    const cardsHTML = items.length === 0
        ? `<div class="no-items-msg">⚠️ Bu grupta ürün tanımlanmamış. Yönetim panelinden ekleyiniz.</div>`
        : items.map(item => {
            const isSel  = selArr.includes(item.id);
            const imgTag = item.image
                ? `<img class="p-card-img" src="${item.image}" alt="${item.name}">`
                : `<div class="p-card-ph">📦</div>`;
            const rentLine = step.hasRent
                ? `<div><span class="lbl">Kira: </span><b>${fmtTL(item.kiralamaFiyati)}/ay</b></div>`
                : '';
            return `<div class="p-card ${isSel ? 'sel' : ''}"
                        onclick="selectProduct('${step.key}','${item.id}',${step.multi},${step.maxSel})">
                <div class="p-card-check">✓</div>
                ${imgTag}
                <div class="p-card-body">
                    <div class="p-card-name">${item.name}</div>
                    <div class="p-card-pr">
                        <div><span class="lbl">Satış: </span><b>${fmtTL(item.satisFiyati)}</b></div>
                        ${rentLine}
                    </div>
                </div>
            </div>`;
        }).join('');

    const selCount  = selArr.length;
    const infoText  = step.multi
        ? `<span>${selCount}</span> ürün seçildi`
        : selCount > 0 ? `<span>1</span> ürün seçildi` : 'Lütfen bir seçim yapın';

    return `<div class="w-step-hdr">
        <div class="w-step-num">${idx + 1}</div>
        <div class="w-step-title">${step.group} — ${step.label}</div>
    </div>
    <div class="w-step-body">
        <div class="product-grid">${cardsHTML}</div>
        <div class="w-footer">
            <div class="w-info">${infoText}</div>
            <button class="btn-s primary" onclick="wizardIleri('${step.key}',${idx})">İleri ➡️</button>
        </div>
    </div>`;
}

function selectProduct(stepKey, itemId, multi, maxSel) {
    if (multi) {
        const arr = satisSecimler[stepKey] || [];
        const pos = arr.indexOf(itemId);
        if (pos >= 0) arr.splice(pos, 1);
        else {
            if (arr.length >= maxSel) { alert(`En fazla ${maxSel} seçim yapılabilir.`); return; }
            arr.push(itemId);
        }
        satisSecimler[stepKey] = arr;
    } else {
        satisSecimler[stepKey] = satisSecimler[stepKey] === itemId ? null : itemId;
    }
    const stepIdx = WIZARD_STEPS.findIndex(s => s.key === stepKey);
    document.getElementById('wstep_' + stepKey).innerHTML = buildStepHTML(WIZARD_STEPS[stepIdx], stepIdx);
    updateTotals();
}

function wizardIleri(stepKey, stepIdx) {
    const step   = WIZARD_STEPS[stepIdx];
    const selArr = step.multi
        ? (satisSecimler[stepKey] || [])
        : (satisSecimler[stepKey] ? [satisSecimler[stepKey]] : []);

    if (selArr.length === 0 && !confirm('Seçim yapmadınız. Yine de devam etmek istiyor musunuz?')) return;

    const el = document.getElementById('wstep_' + stepKey);
    el.classList.add('closing');
    setTimeout(() => {
        el.classList.add('done');
        el.classList.remove('closing');
        const nextIdx = stepIdx + 1;
        if (nextIdx < WIZARD_STEPS.length) {
            const nextEl = document.getElementById('wstep_' + WIZARD_STEPS[nextIdx].key);
            nextEl.classList.remove('done');
            nextEl.classList.add('entering');
            setTimeout(() => nextEl.classList.remove('entering'), 350);
            currentStep = nextIdx;
        } else {
            currentStep = WIZARD_STEPS.length;
            renderSelOzet();
        }
        updateTotals();
    }, 420);
}

function yeniSatisBaslat() {
    if (!confirm('Yeni satış başlatılacak. Mevcut seçimler silinecek. Emin misiniz?')) return;
    resetSecimler();
    renderWizardAll();
    satisInited = true;
    const temsilci = document.getElementById('imzaTemsilci');
    if (temsilci) temsilci.value = '';
    const musteriAdi = document.getElementById('imzaMusteriAdi');
    if (musteriAdi) musteriAdi.value = '';
    imzaTemizle();
    document.querySelector('.satis-inner').scrollTop = 0;
}

// ---- Selections Summary ----

function renderSelOzet() {
    const body = document.getElementById('selOzetBody');
    body.innerHTML = '';
    let hasAny = false;
    WIZARD_STEPS.forEach(step => {
        const ids = step.multi
            ? (satisSecimler[step.key] || [])
            : (satisSecimler[step.key] ? [satisSecimler[step.key]] : []);
        ids.forEach(id => {
            const item = (satisData.items[step.key] || []).find(x => x.id === id);
            if (!item) return;
            hasAny = true;
            const imgTag = item.image
                ? `<img class="sel-img" src="${item.image}" alt="">`
                : `<div class="sel-ph">📦</div>`;
            const rentLine = step.hasRent
                ? `<div class="sel-pr"><span class="lbl">Kira: </span><span class="val">${fmtTL(item.kiralamaFiyati)}/ay</span></div>`
                : '';
            body.innerHTML += `<div class="sel-row">
                ${imgTag}
                <div class="sel-info">
                    <div class="sel-grp">${step.group}</div>
                    <div class="sel-name">${item.name}</div>
                    <div class="sel-prs">
                        <div class="sel-pr"><span class="lbl">Satış: </span><span class="val">${fmtTL(item.satisFiyati)}</span></div>
                        ${rentLine}
                    </div>
                </div>
            </div>`;
        });
    });
    if (!hasAny) body.innerHTML = '<div class="no-items-msg">Henüz seçim yapılmamış.</div>';
    document.getElementById('selOzet').style.display = 'block';
}

// ---- Price Calculation ----

function updateTotals() {
    let netKira = 0, netSatis = 0, pesinat = 0;
    const kdv   = parseFloat(satisData.kdvOrani) || 19;

    WIZARD_STEPS.forEach(step => {
        const ids = step.multi
            ? (satisSecimler[step.key] || [])
            : (satisSecimler[step.key] ? [satisSecimler[step.key]] : []);
        ids.forEach(id => {
            const item = (satisData.items[step.key] || []).find(x => x.id === id);
            if (!item) return;
            const sf = parseFloat(item.satisFiyati)    || 0;
            const kf = step.hasRent ? (parseFloat(item.kiralamaFiyati) || 0) : 0;
            netSatis += sf;
            if (kf > 0) netKira += kf;
            else        pesinat += sf;
        });
    });

    const kdvKira        = netKira  * kdv / 100;
    const kdvSatis       = netSatis * kdv / 100;
    const toplamKira     = netKira  + kdvKira;
    const toplamSatis    = netSatis + kdvSatis;
    const pesinatWithKdv = pesinat  * (1 + kdv / 100);

    const s = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = fmtTL(val); };
    s('netKira',      netKira);
    s('netSatis',     netSatis);
    s('kdvKira',      kdvKira);
    s('kdvSatis',     kdvSatis);
    s('toplamKira',   toplamKira);
    s('toplamSatis',  toplamSatis);
    const kalanSatis = toplamSatis - pesinatWithKdv;
    s('pesinatAmount',  pesinatWithKdv);
    s('kalanAmount',    toplamKira);
    s('kalanSatisAmount', kalanSatis);

    const kdvEl = document.getElementById('kdvOranGoster');
    if (kdvEl) kdvEl.textContent = `%${kdv}`;
}

// ---- Signature Canvas ----

function initImzaCanvas() {
    imzaCanvas = document.getElementById('imzaCanvas');
    if (!imzaCanvas) return;
    imzaCtx = imzaCanvas.getContext('2d');

    const rect = imzaCanvas.getBoundingClientRect();
    imzaCanvas.width  = Math.round(rect.width  || 600);
    imzaCanvas.height = 150;

    imzaCtx.strokeStyle = '#1a237e';
    imzaCtx.lineWidth   = 2.5;
    imzaCtx.lineCap     = 'round';
    imzaCtx.lineJoin    = 'round';

    const getPos = e => {
        const r = imzaCanvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (imzaCanvas.width  / r.width),
            y: (e.clientY - r.top)  * (imzaCanvas.height / r.height)
        };
    };
    const getTPos = e => {
        const r = imzaCanvas.getBoundingClientRect();
        const t = e.touches[0];
        return {
            x: (t.clientX - r.left) * (imzaCanvas.width  / r.width),
            y: (t.clientY - r.top)  * (imzaCanvas.height / r.height)
        };
    };

    imzaCanvas.addEventListener('mousedown',  e => { imzaDrawing = true;  const p = getPos(e); imzaCtx.beginPath(); imzaCtx.moveTo(p.x, p.y); });
    imzaCanvas.addEventListener('mousemove',  e => { if (!imzaDrawing) return; const p = getPos(e); imzaCtx.lineTo(p.x, p.y); imzaCtx.stroke(); });
    imzaCanvas.addEventListener('mouseup',    () => imzaDrawing = false);
    imzaCanvas.addEventListener('mouseleave', () => imzaDrawing = false);

    imzaCanvas.addEventListener('touchstart', e => { e.preventDefault(); imzaDrawing = true;  const p = getTPos(e); imzaCtx.beginPath(); imzaCtx.moveTo(p.x, p.y); }, { passive: false });
    imzaCanvas.addEventListener('touchmove',  e => { e.preventDefault(); if (!imzaDrawing) return; const p = getTPos(e); imzaCtx.lineTo(p.x, p.y); imzaCtx.stroke(); }, { passive: false });
    imzaCanvas.addEventListener('touchend',   () => imzaDrawing = false);
}

function imzaTemizle() {
    if (!imzaCtx) return;
    imzaCtx.clearRect(0, 0, imzaCanvas.width, imzaCanvas.height);
}

// ---- PDF Generation ----

async function pdfOlustur() {
    const temsilciEl  = document.getElementById('imzaTemsilci');
    const musteriEl   = document.getElementById('imzaMusteriAdi');
    const adSoyad     = temsilciEl  ? temsilciEl.value.trim()  : '';
    const musteriAdi  = musteriEl   ? musteriEl.value.trim()   : '';
    const tarih       = document.getElementById('imzaTarih').textContent;
    buildPrintArea(adSoyad, musteriAdi, tarih);

    const printEl = document.getElementById('printArea');
    printEl.style.cssText = 'position:absolute;left:0;top:0;z-index:9999;width:794px;background:#fff;font-family:Arial,sans-serif;padding:30px;box-sizing:border-box;';

    // Measure signature position NOW (element is in DOM & visible) — before canvas capture
    const imzaWrap = printEl.querySelector('#imzaPdfWrap');

    try {
        const { jsPDF } = window.jspdf;
        const cvs = await html2canvas(printEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const W = 210, H = 297;
        const ratio = cvs.height / cvs.width;
        const pdfH  = W * ratio;

        if (pdfH <= H) {
            // Fits on one page — no split needed
            pdf.addImage(cvs.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, W, pdfH);
        } else {
            // Calculate how many canvas pixels fit in one A4 page
            const pageH_px = (H / pdfH) * cvs.height;

            // Find the canvas Y position where the signature block starts
            let guardY_px = null;
            if (imzaWrap) {
                const scaleY = cvs.height / printEl.offsetHeight;
                guardY_px    = Math.floor(imzaWrap.offsetTop * scaleY);
            }

            let srcY = 0, page = 0;
            while (srcY < cvs.height && page < 15) {
                if (page > 0) pdf.addPage();

                // Default: end of this page slice
                let endY = Math.min(srcY + pageH_px, cvs.height);

                // If the cut would fall inside the signature block, move cut to just before it
                if (guardY_px !== null && srcY < guardY_px && endY > guardY_px) {
                    endY = guardY_px;
                }

                const chunkH = Math.ceil(endY - srcY);
                if (chunkH <= 0) break;

                const tmp = document.createElement('canvas');
                tmp.width  = cvs.width;
                tmp.height = chunkH;
                tmp.getContext('2d').drawImage(cvs, 0, srcY, cvs.width, chunkH, 0, 0, cvs.width, chunkH);

                const sliceH_mm = W * (chunkH / cvs.width);
                pdf.addImage(tmp.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, sliceH_mm);

                srcY = endY;
                page++;
            }
        }

        const fname = `KassenKeskin_${tarih.replace(/\./g,'-')}_${adSoyad || 'Imzasiz'}.pdf`;
        pdf.save(fname);
    } catch (e) {
        alert('PDF hatası: ' + e.message);
        console.error(e);
    } finally {
        printEl.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;width:794px;background:#fff;';
    }
}

function buildPrintArea(adSoyad, musteriAdi, tarih) {
    const kdv   = parseFloat(satisData.kdvOrani) || 19;
    let netKira = 0, netSatis = 0, pesinat = 0;
    let rows    = '';

    WIZARD_STEPS.forEach(step => {
        const ids = step.multi
            ? (satisSecimler[step.key] || [])
            : (satisSecimler[step.key] ? [satisSecimler[step.key]] : []);
        ids.forEach(id => {
            const item = (satisData.items[step.key] || []).find(x => x.id === id);
            if (!item) return;
            const sf = parseFloat(item.satisFiyati)    || 0;
            const kf = step.hasRent ? (parseFloat(item.kiralamaFiyati) || 0) : 0;
            netSatis += sf;
            if (kf > 0) netKira += kf;
            else        pesinat += sf;

            const imgCell = item.image
                ? `<img src="${item.image}" style="width:50px;height:50px;object-fit:contain;" alt="">`
                : `<div style="width:50px;height:50px;background:#eee;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">📦</div>`;
            const kfText = step.hasRent ? fmtTL(kf) + '/ay' : '—';
            rows += `<tr>
                <td style="text-align:center;">${imgCell}</td>
                <td>${step.group}</td>
                <td><strong>${item.name}</strong></td>
                <td style="text-align:right;">${kfText}</td>
                <td style="text-align:right;">${fmtTL(sf)}</td>
            </tr>`;
        });
    });

    const kdvKira     = netKira  * kdv / 100;
    const kdvSatis    = netSatis * kdv / 100;
    const topKira     = netKira  + kdvKira;
    const topSatis    = netSatis + kdvSatis;
    const pesinatKdv  = pesinat  * (1 + kdv / 100);

    const imzaImg = (imzaCanvas && imzaCtx)
        ? `<img src="${imzaCanvas.toDataURL()}" style="height:80px;border:1px solid #ccc;background:#fff;" alt="imza">`
        : '<div style="height:80px;border:1px solid #ccc;width:200px;"></div>';

    document.getElementById('printArea').innerHTML = `
        <div style="text-align:center;margin-bottom:20px;border-bottom:3px solid #4a148c;padding-bottom:14px;">
            <div style="font-size:1.6rem;font-weight:900;color:#4a148c;">KASSEN KESKİN</div>
            <div style="font-size:0.9rem;color:#666;margin-top:4px;">Satış Sipariş Formu</div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:16px;font-size:0.85rem;">
            <div><strong>Tarih:</strong> ${tarih}</div>
            <div><strong>Müşteri:</strong> ${musteriAdi || '—'}</div>
            <div><strong>Satış Temsilcisi:</strong> ${adSoyad || '—'}</div>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width:60px;">Resim</th>
                    <th>Grup</th>
                    <th>Ürün / Hizmet</th>
                    <th style="text-align:right;">Aylık Kira</th>
                    <th style="text-align:right;">Satın Alma</th>
                </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#999;">Seçim yapılmadı.</td></tr>'}</tbody>
        </table>
        <div style="margin-top:20px;border:1px solid #ddd;border-radius:6px;overflow:hidden;">
            <div style="background:#4a148c;color:#fff;padding:8px 14px;font-weight:700;font-size:0.85rem;">GENEL TOPLAM</div>
            <table>
                <thead><tr>
                    <th>Kalem</th>
                    <th style="text-align:right;">Aylık Kiralama</th>
                    <th style="text-align:right;">Satın Alma</th>
                </tr></thead>
                <tbody>
                    <tr class="tot-row"><td>Net Fiyat</td><td style="text-align:right;">${fmtTL(netKira)}</td><td style="text-align:right;">${fmtTL(netSatis)}</td></tr>
                    <tr class="tot-row"><td>KDV (%${kdv})</td><td style="text-align:right;">${fmtTL(kdvKira)}</td><td style="text-align:right;">${fmtTL(kdvSatis)}</td></tr>
                    <tr><td><strong>TOPLAM</strong></td><td style="text-align:right;font-size:1.1rem;font-weight:800;color:#4a148c;">${fmtTL(topKira)}</td><td style="text-align:right;font-size:1.1rem;font-weight:800;color:#4a148c;">${fmtTL(topSatis)}</td></tr>
                    <tr><td><strong>💰 Peşinat</strong></td><td colspan="2" style="text-align:right;font-size:1.15rem;font-weight:900;color:#e65100;">${fmtTL(pesinatKdv)}</td></tr>
                    <tr><td><strong>📋 Kalan</strong></td><td style="text-align:right;font-size:1.15rem;font-weight:900;color:#b71c1c;">${fmtTL(topKira)}</td><td style="text-align:right;font-size:1.15rem;font-weight:900;color:#b71c1c;">${fmtTL(topSatis - pesinatKdv)}</td></tr>
                </tbody>
            </table>
        </div>
        <div id="imzaPdfWrap" style="margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end;">
            <div>
                <div style="font-size:0.8rem;color:#777;margin-bottom:4px;">Müşteri İmzası:</div>
                ${imzaImg}
                <div style="margin-top:6px;font-size:0.8rem;color:#444;">${tarih} — Müşteri: ${musteriAdi || ''} — Temsilci: ${adSoyad || ''}</div>
            </div>
            <div style="text-align:right;font-size:0.75rem;color:#aaa;">
                <div>Kassen Keskin</div>
                <div>Bu form bilgisayar ortamında oluşturulmuştur.</div>
            </div>
        </div>`;
}
