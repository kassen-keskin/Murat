let lotusConfig = {};
let lotusTickets = [];
let lotusRecords = {};
let allCustomersLotus = [];

async function initLotusTab() {
    await fetchLotusConfig();
    await fetchLotusRecords();
    await fetchLotusTickets();
    await fetchLotusCustomers();
    renderLotusBoard();
}

async function fetchLotusConfig() {
    try {
        const res = await fetch('/api/lotus-config');
        if (res.ok) lotusConfig = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchLotusRecords() {
    try {
        const res = await fetch('/api/lotus-tickets');
        if (res.ok) lotusRecords = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchLotusTickets() {
    try {
        const res = await fetch('/api/tickets');
        if (res.ok) {
            const allTickets = await res.json();
            // Filter tickets belonging to LotusPecas
            lotusTickets = allTickets.filter(t => t.cTitelErsteNachricht && (
                t.cTitelErsteNachricht.toUpperCase().startsWith('LOTUSPECAS:') ||
                t.cTitelErsteNachricht.toUpperCase().startsWith('LOTUS:')
            ));
        }
    } catch (e) { console.error(e); }
}

async function fetchLotusCustomers() {
    try {
        const res = await fetch('/api/pos-customers');
        if (res.ok) {
            allCustomersLotus = await res.json();
        }
    } catch (e) { console.error(e); }
}

function renderLotusBoard() {
    const container = document.getElementById('lotusContainer');
    if (!container) return;

    let html = `
        <div class="pos-header">
            <h2>🪷 LotusPecas Takip Sistemi</h2>
            <button class="pos-admin-btn" onclick="openLotusAdmin()">⚙️ Yönetim Paneli</button>
        </div>
        <div class="pos-board" id="lotusBoard">
    `;

    if (lotusConfig.statuses && lotusConfig.statuses.length > 0) {
        lotusConfig.statuses.sort((a,b) => a.order - b.order).forEach(status => {
            html += `
                <div class="pos-column" data-status-id="${status.id}">
                    <div class="pos-column-header" style="background-color: ${status.color};">
                        ${status.name} 
                        <button style="float:right; border:none; background:none; color:white; cursor:pointer;" onclick="openNewLotusTicketModal(${status.id})" title="Yeni Ticket Ekle">➕</button>
                    </div>
                    <div class="pos-column-body" id="lotus-col-${status.id}">
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div style="padding: 20px;">Lütfen Yönetim Panelinden durumları yapılandırın.</div>`;
    }

    html += `</div>`;
    html += getLotusAdminModalHtml();
    html += getNewLotusTicketModalHtml();

    container.innerHTML = html;

    if (lotusConfig.statuses) {
        lotusConfig.statuses.forEach(status => {
            const colBody = document.getElementById(`lotus-col-${status.id}`);
            if (!colBody) return;
            
            // Map tickets into columns by lotusRecords
            const columnTickets = lotusTickets.filter(t => {
                let sId = lotusRecords[t.kTicket.toString()];
                // If it doesn't have a recorded status, assume it's in the first column
                if (!sId && lotusConfig.statuses.length > 0 && status.id === lotusConfig.statuses[0].id) {
                    return true;
                }
                return sId === status.id;
            });

            columnTickets.forEach(ticket => {
                const card = document.createElement('div');
                card.className = 'pos-card';
                card.dataset.ticketId = ticket.kTicket;
                
                let titleText = (ticket.cTitelErsteNachricht || '');
                if (titleText.toUpperCase().startsWith('LOTUSPECAS:')) {
                    titleText = titleText.substring(11).trim();
                } else if (titleText.toUpperCase().startsWith('LOTUS:')) {
                    titleText = titleText.substring(6).trim();
                }
                
                let moduleName = '';
                if (titleText.startsWith('[')) {
                    let match = titleText.match(/^\[(.*?)\](?:\s*\[(.*?)\])?/);
                    if (match) {
                        moduleName = match[2] ? `${match[1]} - ${match[2]}` : match[1];
                    }
                }
                
                let kundenText = (ticket.KundenNr ? ticket.KundenNr + ' - ' : '') + (ticket.Firma || 'Bilinmeyen Müşteri');
                
                card.innerHTML = `
                    <div class="pos-card-title">${kundenText}</div>
                    ${moduleName ? `<div class="pos-card-supplier">📦 ${moduleName}</div>` : ''}
                    <div class="pos-card-footer">
                        <span>#${ticket.cEindeutigeId}</span>
                        <span>${new Date(ticket.dAenderung).toLocaleDateString()}</span>
                    </div>
                `;
                card.onclick = (e) => {
                    switchTab('tickets');
                    setTimeout(() => {
                        if (typeof selectTicket === 'function') selectTicket(ticket.kTicket);
                    }, 500);
                };
                colBody.appendChild(card);
            });

            if (typeof Sortable !== 'undefined') {
                new Sortable(colBody, {
                    group: 'lotus-board',
                    animation: 150,
                    onEnd: async function (evt) {
                        const itemEl = evt.item;
                        const toList = evt.to;
                        const newStatusId = parseInt(toList.closest('.pos-column').dataset.statusId);
                        const ticketId = itemEl.dataset.ticketId;

                        if (lotusRecords[ticketId] !== newStatusId) {
                            lotusRecords[ticketId] = newStatusId;
                            await updateLotusTicketStatus(ticketId, newStatusId);
                        }
                    }
                });
            }
        });
    }
}

async function updateLotusTicketStatus(ticketId, newStatusId) {
    try {
        const payload = {};
        payload[ticketId] = newStatusId;
        const res = await fetch('/api/lotus-tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            alert('Durum güncellenemedi');
        } else {
            const statusObj = lotusConfig.statuses.find(s => s.id === newStatusId);
            const kBenutzer = lotusConfig.pos_user_id || 1;
            const formData = new FormData();
            formData.append('cInhalt', `LotusPecas Durumu güncellendi: ${statusObj ? statusObj.name : newStatusId}`);
            formData.append('kBenutzer', kBenutzer);
            await fetch(`/api/tickets/${ticketId}/reply`, { method: 'POST', body: formData });
        }
    } catch (e) {
        console.error(e);
    }
}

function getLotusAdminModalHtml() {
    return `
    <div class="pos-modal-overlay" id="lotusAdminModal">
        <div class="pos-modal" style="width: 600px;">
            <h3>⚙️ LotusPecas Yönetim Paneli</h3>
            
            <div class="pos-admin-section">
                <label>Ticketların Atanacağı Kullanıcı ID:</label>
                <input type="number" id="adminLotusUser" value="${lotusConfig.pos_user_id || ''}" placeholder="Kullanıcı ID (Örn: 1)">
            </div>

            <div class="pos-admin-section">
                <h3>Durumlar</h3>
                <div id="lotusAdminStatusesList"></div>
                <button class="btn-add" onclick="addLotusAdminStatus()">+ Yeni Durum Ekle</button>
            </div>

            <div class="pos-admin-section">
                <h3>LotusPecas Modülü</h3>
                <div id="lotusAdminModelsList"></div>
                <button class="btn-add" onclick="addLotusAdminModel()">+ Yeni Model Ekle</button>
            </div>

            <div class="pos-modal-actions">
                <button class="btn-danger" onclick="document.getElementById('lotusAdminModal').style.display='none'">İptal</button>
                <button class="btn-save" onclick="saveLotusAdmin()">Kaydet</button>
            </div>
        </div>
    </div>
    `;
}

function openLotusAdmin() {
    document.getElementById('lotusAdminModal').style.display = 'flex';
    renderLotusAdminStatuses();
    renderLotusAdminModels();
}

function renderLotusAdminStatuses() {
    const list = document.getElementById('lotusAdminStatusesList');
    list.innerHTML = '';
    (lotusConfig.statuses || []).forEach((st, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${st.id}" placeholder="Durum ID" style="width: 80px;" class="st-id">
                <input type="text" value="${st.name}" placeholder="Durum Adı" style="flex:1;" class="st-name">
                <input type="color" value="${st.color}" class="st-color">
                <input type="number" value="${st.order}" placeholder="Sıra" style="width: 60px;" class="st-order">
                <button class="btn-danger" onclick="removeLotusAdminStatus(${idx})">X</button>
            </div>
        `;
    });
}

function addLotusAdminStatus() {
    if (!lotusConfig.statuses) lotusConfig.statuses = [];
    lotusConfig.statuses.push({id: 100 + lotusConfig.statuses.length, name: 'Yeni Durum', color: '#607d8b', order: lotusConfig.statuses.length + 1});
    renderLotusAdminStatuses();
}

function removeLotusAdminStatus(idx) {
    lotusConfig.statuses.splice(idx, 1);
    renderLotusAdminStatuses();
}

function renderLotusAdminModels() {
    const list = document.getElementById('lotusAdminModelsList');
    list.innerHTML = '';
    (lotusConfig.models || []).forEach((mod, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${mod.id}" placeholder="Model ID" style="width: 80px;" class="mod-id">
                <input type="text" value="${mod.name}" placeholder="Model Adı" style="flex:1;" class="mod-name">
                <button class="btn-danger" onclick="removeLotusAdminModel(${idx})">X</button>
            </div>
        `;
    });
}

function addLotusAdminModel() {
    if (!lotusConfig.models) lotusConfig.models = [];
    lotusConfig.models.push({id: lotusConfig.models.length + 1, name: 'Yeni Model'});
    renderLotusAdminModels();
}

function removeLotusAdminModel(idx) {
    lotusConfig.models.splice(idx, 1);
    renderLotusAdminModels();
}

async function saveLotusAdmin() {
    lotusConfig.pos_user_id = parseInt(document.getElementById('adminLotusUser').value) || null;
    
    const statuses = [];
    document.querySelectorAll('#lotusAdminStatusesList .pos-config-row').forEach(row => {
        statuses.push({
            id: parseInt(row.querySelector('.st-id').value) || 0,
            name: row.querySelector('.st-name').value,
            color: row.querySelector('.st-color').value,
            order: parseInt(row.querySelector('.st-order').value) || 0
        });
    });
    lotusConfig.statuses = statuses;

    const models = [];
    document.querySelectorAll('#lotusAdminModelsList .pos-config-row').forEach(row => {
        models.push({
            id: parseInt(row.querySelector('.mod-id').value) || 0,
            name: row.querySelector('.mod-name').value
        });
    });
    lotusConfig.models = models;

    try {
        const res = await fetch('/api/lotus-config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(lotusConfig)
        });
        if (res.ok) {
            document.getElementById('lotusAdminModal').style.display = 'none';
            initLotusTab(); 
        } else {
            alert('Kaydedilemedi');
        }
    } catch(e) {
        console.error(e);
        alert('Hata');
    }
}

let currentNewLotusStatusId = null;

function getNewLotusTicketModalHtml() {
    return `
    <div class="pos-modal-overlay" id="newLotusModal">
        <div class="pos-modal" style="width: 500px;">
            <h3>➕ Yeni LotusPecas Ekle</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; margin-top: 15px;">
                <div style="flex:1; margin-right: 10px;">
                    <label>Müşteri Ara:</label>
                    <input type="text" id="newLotusCustomerSearch" oninput="updateNewLotusCustomerOptions()" placeholder="Firma veya müşteri numarası ara..." style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-color); color: var(--text-color);">
                </div>
                <div style="white-space: nowrap; margin-bottom: 8px;">
                    <label>Sonuç: <span id="newLotusCustomerCount" style="font-weight: bold;">0</span></label>
                </div>
            </div>
            <select id="newLotusKunde">
                <option value="">-- Müşteri Seçin --</option>
            </select>
            
            <label style="margin-top: 15px; display:block;">LotusPecas Modülü:</label>
            <select id="newLotusModel">
                <option value="">-- Model Seçin --</option>
            </select>
            
            <label style="margin-top: 15px; display:block;">Not / Açıklama:</label>
            <textarea id="newLotusNot" placeholder="Gerekli açıklamaları girin..."></textarea>

            <div class="pos-modal-actions">
                <button class="btn-danger" onclick="document.getElementById('newLotusModal').style.display='none'">İptal</button>
                <button class="btn-save" id="btnCreateNewLotus">Oluştur</button>
            </div>
        </div>
    </div>
    `;
}

function updateNewLotusCustomerOptions() {
    const filter = document.getElementById('newLotusCustomerSearch')?.value || '';
    const select = document.getElementById('newLotusKunde');
    const countLabel = document.getElementById('newLotusCustomerCount');
    if (!select) return;

    const searchValue = String(filter).trim().toLowerCase();

    const customers = allCustomersLotus.filter(c => {
        if (!searchValue) return true;
        const firma = String(c.Firma || c.InhabeName || '').toLowerCase();
        const kundenNr = String(c.KundenNr || c.kundenNr || '').toLowerCase();
        return firma.includes(searchValue) || kundenNr.includes(searchValue);
    });

    let customerOptions = '<option value="">-- Müşteri Seçin --</option>';

    if (customers.length === 0) {
        customerOptions += '<option value="" disabled>Sonuç bulunamadı</option>';
    } else {
        customers.forEach((c, idx) => {
            const label = `${c.KundenNr || ''} - ${c.Firma || c.InhabeName || 'Bilinmeyen'}`;
            const selected = (searchValue && idx === 0) ? ' selected' : '';
            customerOptions += `<option value="${c.kKunde}"${selected}>${label}</option>`;
        });
    }

    select.innerHTML = customerOptions;
    if (countLabel) countLabel.innerText = customers.length;
}

function openNewLotusTicketModal(statusId) {
    currentNewLotusStatusId = statusId;
    document.getElementById('newLotusModal').style.display = 'flex';
    
    const custSearch = document.getElementById('newLotusCustomerSearch');
    if (custSearch) custSearch.value = '';

    updateNewLotusCustomerOptions();

    const modelSelect = document.getElementById('newLotusModel');
    modelSelect.innerHTML = '<option value="">-- Model Seçin --</option>';
    (lotusConfig.models || []).forEach(m => {
        modelSelect.innerHTML += `<option value="${m.name}">${m.name}</option>`;
    });
    
    document.getElementById('newLotusNot').value = '';

    document.getElementById('btnCreateNewLotus').onclick = async function() {
        this.disabled = true;
        this.innerText = "Lütfen bekleyin...";
        await createNewLotusTicket();
        this.disabled = false;
        this.innerText = "Oluştur";
    };
}

async function createNewLotusTicket() {
    const kKunde = document.getElementById('newLotusKunde').value;
    const model = document.getElementById('newLotusModel').value;
    const notTxt = document.getElementById('newLotusNot').value;

    if (!kKunde) {
        alert("Lütfen müşteri seçiniz.");
        return;
    }

    const customer = allCustomersLotus.find(c => c.kKunde == kKunde);
    const kundeName = customer ? customer.Firma : 'Bilinmiyor';

    const cTitel = model ? `LOTUSPECAS: [${model}] ${kundeName}` : `LOTUSPECAS: ${kundeName}`;
    let cInhalt = `LotusPecas Talebi`;
    if (model) cInhalt += `\nModel: ${model}`;
    if (notTxt) cInhalt += `\nNot: ${notTxt}`;
    const kBenutzer = lotusConfig.pos_user_id || 1;

    try {
        const res = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kKunde: parseInt(kKunde),
                cTitel: cTitel,
                cInhalt: cInhalt,
                kBenutzer: kBenutzer,
                kBenutzer_Bearbeiter: kBenutzer,
                nPrioritaet: 2
            })
        });

        if (res.ok) {
            const respData = await res.json();
            const newTicketId = respData.kTicket;
            
            const payload = {};
            payload[newTicketId] = currentNewLotusStatusId;
            await fetch('/api/lotus-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            document.getElementById('newLotusModal').style.display = 'none';
            await initLotusTab();
        } else {
            const err = await res.json();
            alert('Hata: ' + err.error);
        }
    } catch(e) {
        console.error(e);
        alert('Hata: ' + e.message);
    }
}
