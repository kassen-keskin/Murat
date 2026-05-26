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

        const normalizeValue = (value) => {
            if (value && typeof value === 'object') {
                return {
                    kundenNr: value.kundenNr !== undefined ? String(value.kundenNr) : '',
                    mailGonderildi: Boolean(value.mailGonderildi),
                    odendi: Boolean(value.odendi),
                    bosta: Boolean(value.bosta)
                };
            }
            if (typeof value === 'string') {
                return {
                    kundenNr: value,
                    mailGonderildi: false,
                    odendi: false,
                    bosta: false
                };
            }
            return null;
        };

        // Migrate old numeric-indexed storage to new slot-keyed storage
        const hasNumericKeys = Object.keys(parsed).some(k => /^\d+$/.test(k));
        if (hasNumericKeys && Array.isArray(lisansData) && lisansData.length > 0) {
            const migrated = {};
            for (const key of Object.keys(parsed)) {
                if (/^\d+$/.test(key)) {
                    const idx = Number(key);
                    const item = lisansData[idx];
                    if (item) {
                        const normalized = normalizeValue(parsed[key]);
                        if (normalized && (normalized.kundenNr || normalized.bosta)) {
                            migrated[getSlotKey(item)] = normalized;
                        }
                    }
                } else {
                    const normalized = normalizeValue(parsed[key]);
                    if (normalized && (normalized.kundenNr || normalized.bosta)) {
                        migrated[key] = normalized;
                    }
                }
            }
            return migrated;
        }

        const normalizedPairs = {};
        for (const key of Object.keys(parsed)) {
            const normalized = normalizeValue(parsed[key]);
            if (normalized && (normalized.kundenNr || normalized.bosta)) {
                normalizedPairs[key] = normalized;
            }
        }
        return normalizedPairs;
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
    const onlyBostaCheckbox = document.getElementById('lisansOnlyBosta');
    const countElement = document.getElementById('lisansMatchCount');
    const showOnlyMatched = onlyMatchedCheckbox ? onlyMatchedCheckbox.checked : false;
    const showOnlyBosta = onlyBostaCheckbox ? onlyBostaCheckbox.checked : false;

    if (!pairContainer) return;
    pairContainer.innerHTML = '';

const matchedCount = Object.values(matchedPairs).filter(v => {
    if (!v) return false;
    if (typeof v === 'object') return Boolean(v.kundenNr && String(v.kundenNr).trim() !== '');
    return String(v).trim() !== '';
}).length;
        if (countElement) {
            countElement.textContent = `(${matchedCount} eşleşme)`;
        }

        lisansData.forEach((item) => {
            const slotKey = getSlotKey(item);
            const matchedPair = matchedPairs[slotKey];
            const matchedKundenNrForSlot = (matchedPair && typeof matchedPair === 'object') ? String(matchedPair.kundenNr || '').trim() : (matchedPair ? String(matchedPair).trim() : '');
            const matchedItem = matchedKundenNrForSlot ? lisansData.find(d => String(d.KundenNr).toLowerCase() === String(matchedKundenNrForSlot).toLowerCase()) : null;
            const mailChecked = matchedPair ? Boolean(matchedPair.mailGonderildi) : false;
            const odendiChecked = matchedPair ? Boolean(matchedPair.odendi) : false;
            const bostaChecked = matchedPair ? Boolean(matchedPair.bosta) : false;

        if (showOnlyMatched && !matchedItem) {
            return;
        }
        if (showOnlyBosta && !bostaChecked) {
            return;
        }

        const pairRow = document.createElement('div');
        pairRow.className = 'lisans-pair';

        // Check if this left-side item is already matched elsewhere
        const isItemMatched = Object.values(matchedPairs).some(pair => {
            const kundenNr = pair && typeof pair === 'object' ? String(pair.kundenNr || '') : String(pair || '');
            if (!kundenNr) return false;
            return kundenNr.toLowerCase() === String(item.KundenNr).toLowerCase();
        });

        const safeSlotKey = String(slotKey).replace(/'/g, "\\'");
        const leftCell = document.createElement('div');
        leftCell.className = 'lisans-pair-left';
        const leftCardClass = isItemMatched ? 'lisans-card lisans-card-passive' : 'lisans-card';
        leftCell.innerHTML = `
            <div class="${leftCardClass}">
                <div class="l-card-top-row">
                    <div class="l-card-title">${item.KundenNr} - ${item.Firma || '-'}</div>
                    <label class="l-card-checkbox l-card-checkbox-bosta">
                        <input type="checkbox" onchange="handleLisansCheckbox(this, '${safeSlotKey}', 'bosta')" ${bostaChecked ? 'checked' : ''} />
                        Bosta
                    </label>
                </div>
                <div class="l-card-subtitle">Lisans No: ${item.LisansNo || 'Yok'}</div>
                <div class="l-card-row-bottom">
                    <span class="l-compact-val">${item.InhabeName || '-'}</span>
                    ${item.Strasse || item.Straße || item.Street ? `<span class="l-compact-val">${item.Strasse || item.Straße || item.Street}</span>` : ''}
                    ${item.PLZ || item.Postleitzahl ? `<span class="l-compact-val">${item.PLZ || item.Postleitzahl}</span>` : ''}
                    ${item.Versiyon ? `<span class="l-compact-val">Versiyon: ${item.Versiyon}</span>` : ''}
                </div>
            </div>
        `;

        const rightCell = document.createElement('div');
        rightCell.className = 'lisans-pair-right';
        rightCell.innerHTML = `
            <div class="lisans-slot ${matchedItem ? 'filled' : ''}">
                <div class="lisans-slot-header">
                    <label>Iptal Edilecek Lisans Kunden Nr</label>
                    <input type="text" class="lisans-slot-input" placeholder="KundenNr yazıp Enter'a basın..."
                           value="${matchedItem ? matchedItem.KundenNr : ''}"
                           onchange="handleLisansMatch(this, '${safeSlotKey}')">
                    ${matchedItem ? `
                        <div class="l-card-checkboxes l-card-checkboxes-header">
                            <label class="l-card-checkbox l-card-checkbox-mail">
                                <input type="checkbox" onchange="handleLisansCheckbox(this, '${safeSlotKey}', 'mailGonderildi')" ${mailChecked ? 'checked' : ''} />
                                Mail gönderildi
                            </label>
                            <label class="l-card-checkbox l-card-checkbox-paid">
                                <input type="checkbox" onchange="handleLisansCheckbox(this, '${safeSlotKey}', 'odendi')" ${odendiChecked ? 'checked' : ''} />
                                Ödendi
                            </label>
                        </div>
                    ` : ''}
                </div>
                <div class="lisans-slot-body">
                    ${matchedItem ? `
                        <div class="l-card-title">${matchedItem.KundenNr} - ${matchedItem.Firma || '-'}</div>
                        <div class="l-card-subtitle" style="color: var(--text-color);">Lisans No: ${matchedItem.LisansNo || 'Yok'}</div>
                        <div class="l-card-row-bottom">
                            <span class="l-compact-val">${matchedItem.InhabeName || '-'}</span>
                            ${matchedItem.Strasse || matchedItem.Straße || matchedItem.Street ? `<span class="l-compact-val">${matchedItem.Strasse || matchedItem.Straße || matchedItem.Street}</span>` : ''}
                            ${matchedItem.PLZ || matchedItem.Postleitzahl ? `<span class="l-compact-val">${matchedItem.PLZ || matchedItem.Postleitzahl}</span>` : ''}
                            ${matchedItem.Versiyon ? `<span class="l-compact-val">Versiyon: ${matchedItem.Versiyon}</span>` : ''}
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

    // Extract the left-side KundenNr from the slotKey
    const leftKundenNrMatch = slotKey.match(/\|K:([^|]*)\|/);
    const leftKundenNr = leftKundenNrMatch ? leftKundenNrMatch[1] : '';

    // If empty, remove the match but preserve bosta state if set
    if (!val) {
        const existing = matchedPairs[slotKey];
        if (existing && typeof existing === 'object' && existing.bosta) {
            matchedPairs[slotKey] = {
                kundenNr: '',
                mailGonderildi: false,
                odendi: false,
                bosta: true
            };
        } else {
            delete matchedPairs[slotKey];
        }
        saveLisansMatch();
        renderLisans();
        return;
    }

    // Check if trying to match with itself
    if (val.toLowerCase() === leftKundenNr.toLowerCase()) {
        alert('Soldaki kunden Nr ile sagdaki eslesen kunden nr farkli olmali.');
        // Reset the input to the previous value
        const currentPair = matchedPairs[slotKey];
        inputEl.value = currentPair && typeof currentPair === 'object' ? String(currentPair.kundenNr) : (currentPair ? String(currentPair) : '');
        return;
    }

    // Try to find the KundenNr in our data
    const found = lisansData.find(d => String(d.KundenNr).toLowerCase() === String(val).toLowerCase());
    
    if (found) {
        // Check if this KundenNr is already used in a different slot
        for (let k in matchedPairs) {
            if (k !== slotKey) { // Check only other slots
                const pair = matchedPairs[k];
                const kundenNr = pair && typeof pair === 'object' ? String(pair.kundenNr) : String(pair);
                if (kundenNr.toLowerCase() === String(found.KundenNr).toLowerCase()) {
                    // KundenNr already used elsewhere - show warning and don't change the matching
                    alert('Bu Kunden Nr zaten kullanilmis. Lütfen tekrar kontrol edin.');
                    // Reset the input to the previous value
                    const currentPair = matchedPairs[slotKey];
                    inputEl.value = currentPair && typeof currentPair === 'object' ? String(currentPair.kundenNr) : (currentPair ? String(currentPair) : '');
                    return;
                }
            }
        }
        // Assign or preserve current status values
        const existing = matchedPairs[slotKey];
        matchedPairs[slotKey] = {
            kundenNr: found.KundenNr,
            mailGonderildi: existing && typeof existing === 'object' ? Boolean(existing.mailGonderildi) : false,
            odendi: existing && typeof existing === 'object' ? Boolean(existing.odendi) : false,
            bosta: existing && typeof existing === 'object' ? Boolean(existing.bosta) : false
        };
    } else {
        alert('KundenNr bulunamadı! Lütfen geçerli bir KundenNr girin.');
        inputEl.value = '';
        delete matchedPairs[slotKey];
    }
    saveLisansMatch();
    renderLisans();
}

function handleLisansCheckbox(inputEl, slotKey, key) {
    const pair = matchedPairs[slotKey];
    const existing = matchedPairs[slotKey];
    const updatedPair = existing && typeof existing === 'object' ? { ...existing } : {
        kundenNr: '',
        mailGonderildi: false,
        odendi: false,
        bosta: false
    };
    updatedPair[key] = inputEl.checked;
    matchedPairs[slotKey] = updatedPair;
    saveLisansMatch();
}
