let lisansData = [];
let matchedPairs = {}; // slotKey -> KundenNr
const LISANS_MATCH_STORAGE_KEY = 'lisansMatchedPairs';

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

async function initLisansTab() {
    if (lisansData.length === 0) {
        await fetchLisansData();
    }
    matchedPairs = loadLisansMatches();
    renderLisans();
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
    const pairContainer = document.getElementById('lisansPairContainer');
    const onlyMatchedCheckbox = document.getElementById('lisansOnlyMatched');
    const countElement = document.getElementById('lisansMatchCount');
    const showOnlyMatched = onlyMatchedCheckbox ? onlyMatchedCheckbox.checked : false;

    if (!pairContainer) return;
    pairContainer.innerHTML = '';

    const matchedCount = Object.values(matchedPairs).filter(v => v !== undefined && v !== null && String(v).trim() !== '').length;
    if (countElement) {
        countElement.textContent = `(${matchedCount} eşleşme)`;
    }

    lisansData.forEach((item) => {
        const slotKey = getSlotKey(item);
        const matchedKundenNrForSlot = matchedPairs[slotKey];
        const matchedItem = matchedKundenNrForSlot ? lisansData.find(d => String(d.KundenNr).toLowerCase() === String(matchedKundenNrForSlot).toLowerCase()) : null;

        if (showOnlyMatched && !matchedItem) {
            return;
        }

        const pairRow = document.createElement('div');
        pairRow.className = 'lisans-pair';

        const leftCell = document.createElement('div');
        leftCell.className = 'lisans-pair-left';
        leftCell.innerHTML = `
            <div class="lisans-card">
                <div class="l-card-title">${item.KundenNr} - ${item.Firma || '-'}</div>
                <div class="l-card-subtitle">Lisans No: ${item.LisansNo || 'Yok'}</div>
                <div class="l-card-row-bottom">
                    <span class="l-compact-val">${item.InhabeName || '-'}</span>
                    ${item.Strasse || item.Straße || item.Street ? `<span class="l-compact-val">${item.Strasse || item.Straße || item.Street}</span>` : ''}
                    ${item.PLZ || item.Postleitzahl ? `<span class="l-compact-val">${item.PLZ || item.Postleitzahl}</span>` : ''}
                </div>
            </div>
        `;

        const rightCell = document.createElement('div');
        rightCell.className = 'lisans-pair-right';
        const safeSlotKey = String(slotKey).replace(/'/g, "\\'");
        rightCell.innerHTML = `
            <div class="lisans-slot ${matchedItem ? 'filled' : ''}">
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
                        <div class="lisans-slot-empty-msg"></div>
                    `}
                </div>
            </div>
        `;

        pairRow.appendChild(leftCell);
        pairRow.appendChild(rightCell);
        pairContainer.appendChild(pairRow);
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
