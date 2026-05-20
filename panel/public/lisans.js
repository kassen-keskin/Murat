let lisansData = [];
let matchedPairs = {}; // slotKey -> KundenNr
const LISANS_MATCH_STORAGE_KEY = 'lisansMatchedPairs';
let lisansScrollSyncInitialized = false;
let lisansScrollSyncActive = false;

function getSlotKey(item) {
    if (!item) return '';
    const l = item.LisansNo || '';
    const k = item.KundenNr || '';
    const f = (item.Firma || '').replace(/\|/g, '');
    return `L:${l}|K:${k}|F:${f}`;
}

function loadLisansMatches() {
    try {
        const stored = localStorage.getItem(LISANS_MATCH_STORAGE_KEY);
        if (!stored) return {};
        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object') return {};

        // Migrate old numeric-indexed storage to new slot-keyed storage
        const hasNumericKeys = Object.keys(parsed).some(k => /^\d+$/.test(k));
        if (hasNumericKeys && Array.isArray(lisansData) && lisansData.length > 0) {
            const migrated = {};
            for (const key of Object.keys(parsed)) {
                if (/^\d+$/.test(key)) {
                    const idx = Number(key);
                    const item = lisansData[idx];
                    if (item) {
                        migrated[getSlotKey(item)] = parsed[key];
                    }
                } else {
                    migrated[key] = parsed[key];
                }
            }
            return migrated;
        }

        return parsed;
    } catch (error) {
        console.error('Failed to load saved lisans matches:', error);
        return {};
    }
}

function saveLisansMatch() {
    try {
        localStorage.setItem(LISANS_MATCH_STORAGE_KEY, JSON.stringify(matchedPairs));
        alert('Eşleşmeler kaydedildi. İstediğiniz zaman tekrar düzenleyebilirsiniz.');
    } catch (error) {
        console.error('Failed to save lisans matches:', error);
        alert('Eşleşmeler kaydedilirken bir hata oluştu.');
    }
}

function attachLisansScrollSync() {
    if (lisansScrollSyncInitialized) return;

    const leftCol = document.getElementById('lisansLeftCol');
    const rightCol = document.getElementById('lisansRightCol');
    if (!leftCol || !rightCol) return;

    const syncScroll = (source, target) => {
        if (lisansScrollSyncActive) return;
        lisansScrollSyncActive = true;
        target.scrollTop = source.scrollTop;
        lisansScrollSyncActive = false;
    };

    leftCol.addEventListener('scroll', () => syncScroll(leftCol, rightCol));
    rightCol.addEventListener('scroll', () => syncScroll(rightCol, leftCol));
    lisansScrollSyncInitialized = true;
}

async function initLisansTab() {
    if (lisansData.length === 0) {
        await fetchLisansData();
    }
    matchedPairs = loadLisansMatches();
    renderLisans();
    attachLisansScrollSync();
}

async function fetchLisansData() {
    try {
        const response = await fetch('/api/lotus-lisans');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        lisansData = data || [];
    } catch (error) {
        console.error('Error fetching lotus lisans data:', error);
    }
}

function filterLisansLeftList() {
    renderLisans();
}

function renderLisans() {
    const leftCol = document.getElementById('lisansLeftCol');
    const rightCol = document.getElementById('lisansRightCol');
    
    leftCol.innerHTML = '';
    rightCol.innerHTML = '';

    const matchedKundenNrs = Object.values(matchedPairs).map(v => String(v).toLowerCase());

    lisansData.forEach((item, index) => {
        const slotKey = getSlotKey(item);
        // --- Left Card Logic ---
        const isMatched = matchedKundenNrs.includes(String(item.KundenNr).toLowerCase());
        const showLeft = true;

        if (showLeft) {
            const card = document.createElement('div');
            card.className = `lisans-card ${isMatched ? 'matched-left' : ''}`;
            card.id = `lcard-${item.KundenNr}`;

            const strasse = item.Strasse || item.Straße || item.Street || '';
            const plz = item.PLZ || item.Postleitzahl || '';

            card.innerHTML = `
                <div class="l-card-title">${item.KundenNr} - ${item.Firma || '-'}</div>
                <div class="l-card-subtitle">Lisans No: ${item.LisansNo || 'Yok'}</div>
                <div class="l-card-row-bottom">
                    <span class="l-compact-val">${item.InhabeName || '-'}</span>
                    ${strasse ? `<span class="l-compact-val">${strasse}</span>` : ''}
                    ${plz ? `<span class="l-compact-val">${plz}</span>` : ''}
                </div>
            `;
            leftCol.appendChild(card);
        }

        // --- Right Slot Logic ---
        // Render exactly one slot per original data record so "ayni ölcude sanki kuyruk eslesmesi gibi"
        const slot = document.createElement('div');
        const matchedKundenNrForSlot = matchedPairs[slotKey];
        const matchedItem = matchedKundenNrForSlot ? lisansData.find(d => String(d.KundenNr).toLowerCase() === String(matchedKundenNrForSlot).toLowerCase()) : null;

        slot.className = `lisans-slot ${matchedItem ? 'filled' : ''}`;
        
        const safeSlotKey = String(slotKey).replace(/'/g, "\\'");
        slot.innerHTML = `
            <div class="lisans-slot-header">
                <label>Iptal Edilecek Lisans Kunden Nr</label>
                <input type="text" class="lisans-slot-input" placeholder="KundenNr yazıp Enter'a basın..." 
                       value="${matchedItem ? matchedItem.KundenNr : ''}" 
                       onchange="handleLisansMatch(this, '${safeSlotKey}')">
            </div>
            <div class="lisans-slot-body">
                ${matchedItem ? `
                    <div class="l-card-title" style="color: var(--secondary-color);">${matchedItem.KundenNr} - ${matchedItem.Firma || '-'}</div>
                    <div class="l-card-subtitle" style="color: var(--text-color);">Lisans No: ${matchedItem.LisansNo || 'Yok'}</div>
                    <div class="l-card-row-bottom">
                        <span class="l-compact-val">${matchedItem.InhabeName || '-'}</span>
                        ${matchedItem.Strasse || matchedItem.Straße || matchedItem.Street ? `<span class="l-compact-val">${matchedItem.Strasse || matchedItem.Straße || matchedItem.Street}</span>` : ''}
                        ${matchedItem.PLZ || matchedItem.Postleitzahl ? `<span class="l-compact-val">${matchedItem.PLZ || matchedItem.Postleitzahl}</span>` : ''}
                    </div>
                ` : `
                    <div class="lisans-slot-empty-msg">Eşleştirilecek kaydı bekliyor...</div>
                `}
            </div>
        `;
        rightCol.appendChild(slot);
    });
}

function handleLisansMatch(inputEl, slotKey) {
    const val = inputEl.value.trim();

    // If empty, remove the match
    if (!val) {
        delete matchedPairs[slotKey];
        renderLisans();
        return;
    }

    // Try to find the KundenNr in our data
    // Do case-insensitive string comparison just in case
    const found = lisansData.find(d => String(d.KundenNr).toLowerCase() === String(val).toLowerCase());
    
    if (found) {
        // Remove this KundenNr from any other slot to avoid duplicates
        for (let k in matchedPairs) {
            if (matchedPairs[k] === found.KundenNr) {
                delete matchedPairs[k];
            }
        }
        // Assign to current slot key
        matchedPairs[slotKey] = found.KundenNr;
    } else {
        alert('KundenNr bulunamadı! Lütfen geçerli bir KundenNr girin.');
        inputEl.value = '';
        delete matchedPairs[slotKey];
    }
    
    renderLisans();
}
