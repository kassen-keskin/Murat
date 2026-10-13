let lacashConfig = {};
let lacashTickets = [];
let lacashRecords = {};
let allCustomersLacash = [];

async function initLacashTab() {
    await fetchLacashConfig();
    await fetchLacashRecords();
    await fetchLacashTickets();
    await fetchLacashCustomers();
    renderLacashBoard();
}

async function fetchLacashConfig() {
    try {
        const res = await fetch('/api/lacash-config');
        if (res.ok) lacashConfig = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchLacashRecords() {
    try {
        const res = await fetch('/api/lacash-tickets');
        if (res.ok) lacashRecords = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchLacashTickets() {
    try {
        const res = await fetch('/api/tickets');
        if (res.ok) {
            const allTickets = await res.json();
            // Filter tickets belonging to LaCash
            lacashTickets = allTickets.filter(t => t.cTitelErsteNachricht && t.cTitelErsteNachricht.startsWith('LACASH:'));
        }
    } catch (e) { console.error(e); }
}

async function fetchLacashCustomers() {
    try {
        const res = await fetch('/api/pos-customers');
        if (res.ok) {
            allCustomersLacash = await res.json();
        }
    } catch (e) { console.error(e); }
}

function renderLacashBoard() {
    const container = document.getElementById('lacashContainer');
    if (!container) return;

    let html = `
        <div class="pos-header">
            <h2>💶 LaCash Takip Sistemi</h2>
            <button class="pos-admin-btn" onclick="openLacashAdmin()">⚙️ Yönetim Paneli</button>
        </div>
        <div class="pos-board" id="lacashBoard">
    `;

    if (lacashConfig.statuses && lacashConfig.statuses.length > 0) {
        lacashConfig.statuses.sort((a,b) => a.order - b.order).forEach(status => {
            html += `
                <div class="pos-column" data-status-id="${status.id}">
                    <div class="pos-column-header" style="background-color: ${status.color};">
                        ${status.name} 
                        <button style="float:right; border:none; background:none; color:white; cursor:pointer;" onclick="openNewLacashTicketModal(${status.id})" title="Yeni Ticket Ekle">➕</button>
                    </div>
                    <div class="pos-column-body" id="lacash-col-${status.id}">
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div style="padding: 20px;">Lütfen Yönetim Panelinden durumları yapılandırın.</div>`;
    }

    html += `</div>`;
    html += getLacashAdminModalHtml();
    html += getNewLacashTicketModalHtml();

    container.innerHTML = html;

    if (lacashConfig.statuses) {
        lacashConfig.statuses.forEach(status => {
            const colBody = document.getElementById(`lacash-col-${status.id}`);
            if (!colBody) return;
            
            // Map tickets into columns by lacashRecords
            const columnTickets = lacashTickets.filter(t => {
                let sId = lacashRecords[t.kTicket.toString()];
                // If it doesn't have a recorded status, assume it's in the first column
                if (!sId && lacashConfig.statuses.length > 0 && status.id === lacashConfig.statuses[0].id) {
                    return true;
                }
                return sId === status.id;
            });

            columnTickets.forEach(ticket => {
                const card = document.createElement('div');
                card.className = 'pos-card';
                card.dataset.ticketId = ticket.kTicket;
                
                let titleText = (ticket.cTitelErsteNachricht || '').substring(7).trim();
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
                    group: 'lacash-board',
                    animation: 150,
                    onEnd: async function (evt) {
                        const itemEl = evt.item;
                        const toList = evt.to;
                        const newStatusId = parseInt(toList.closest('.pos-column').dataset.statusId);
                        const ticketId = itemEl.dataset.ticketId;

                        if (lacashRecords[ticketId] !== newStatusId) {
                            lacashRecords[ticketId] = newStatusId;
                            await updateLacashTicketStatus(ticketId, newStatusId);
                        }
                    }
                });
            }
        });
    }
}

async function updateLacashTicketStatus(ticketId, newStatusId) {
    try {
        const payload = {};
        payload[ticketId] = newStatusId;
        const res = await fetch('/api/lacash-tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            alert('Durum güncellenemedi');
        } else {
            const statusObj = lacashConfig.statuses.find(s => s.id === newStatusId);
            const kBenutzer = lacashConfig.pos_user_id || 1;
            const formData = new FormData();
            formData.append('cInhalt', `LaCash Durumu güncellendi: ${statusObj ? statusObj.name : newStatusId}`);
            formData.append('kBenutzer', kBenutzer);
            await fetch(`/api/tickets/${ticketId}/reply`, { method: 'POST', body: formData });
        }
    } catch (e) {
        console.error(e);
    }
}

function getLacashAdminModalHtml() {
    return `
    <div class="pos-modal-overlay" id="lacashAdminModal">
        <div class="pos-modal" style="width: 600px;">
            <h3>⚙️ LaCash Yönetim Paneli</h3>
            
            <div class="pos-admin-section">
                <label>Ticketların Atanacağı Kullanıcı ID:</label>
                <input type="number" id="adminLacashUser" value="${lacashConfig.pos_user_id || ''}" placeholder="Kullanıcı ID (Örn: 1)">
            </div>

            <div class="pos-admin-section">
                <h3>Durumlar</h3>
                <div id="lacashAdminStatusesList"></div>
                <button class="btn-add" onclick="addLacashAdminStatus()">+ Yeni Durum Ekle</button>
            </div>

            <div class="pos-admin-section">
                <h3>LaCash Modülü</h3>
                <div id="lacashAdminModelsList"></div>
                <button class="btn-add" onclick="addLacashAdminModel()">+ Yeni Model Ekle</button>
            </div>

            <div class="pos-modal-actions">
                <button class="btn-danger" onclick="document.getElementById('lacashAdminModal').style.display='none'">İptal</button>
                <button class="btn-save" onclick="saveLacashAdmin()">Kaydet</button>
            </div>
        </div>
    </div>
    `;
}

function openLacashAdmin() {
    document.getElementById('lacashAdminModal').style.display = 'flex';
    renderLacashAdminStatuses();
    renderLacashAdminModels();
}

function renderLacashAdminStatuses() {
    const list = document.getElementById('lacashAdminStatusesList');
    list.innerHTML = '';
    (lacashConfig.statuses || []).forEach((st, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${st.id}" placeholder="Durum ID" style="width: 80px;" class="st-id">
                <input type="text" value="${st.name}" placeholder="Durum Adı" style="flex:1;" class="st-name">
                <input type="color" value="${st.color}" class="st-color">
                <input type="number" value="${st.order}" placeholder="Sıra" style="width: 60px;" class="st-order">
                <button class="btn-danger" onclick="removeLacashAdminStatus(${idx})">X</button>
            </div>
        `;
    });
}

function addLacashAdminStatus() {
    if (!lacashConfig.statuses) lacashConfig.statuses = [];
    lacashConfig.statuses.push({id: 100 + lacashConfig.statuses.length, name: 'Yeni Durum', color: '#607d8b', order: lacashConfig.statuses.length + 1});
    renderLacashAdminStatuses();
}

function removeLacashAdminStatus(idx) {
    lacashConfig.statuses.splice(idx, 1);
    renderLacashAdminStatuses();
}

function renderLacashAdminModels() {
    const list = document.getElementById('lacashAdminModelsList');
    list.innerHTML = '';
    (lacashConfig.models || []).forEach((mod, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${mod.id}" placeholder="Model ID" style="width: 80px;" class="mod-id">
                <input type="text" value="${mod.name}" placeholder="Model Adı" style="flex:1;" class="mod-name">
                <button class="btn-danger" onclick="removeLacashAdminModel(${idx})">X</button>
            </div>
        `;
    });
}

function addLacashAdminModel() {
    if (!lacashConfig.models) lacashConfig.models = [];
    lacashConfig.models.push({id: lacashConfig.models.length + 1, name: 'Yeni Model'});
    renderLacashAdminModels();
}

function removeLacashAdminModel(idx) {
    lacashConfig.models.splice(idx, 1);
    renderLacashAdminModels();
}

async function saveLacashAdmin() {
    lacashConfig.pos_user_id = parseInt(document.getElementById('adminLacashUser').value) || null;
    
    const statuses = [];
    document.querySelectorAll('#lacashAdminStatusesList .pos-config-row').forEach(row => {
        statuses.push({
            id: parseInt(row.querySelector('.st-id').value) || 0,
            name: row.querySelector('.st-name').value,
            color: row.querySelector('.st-color').value,
            order: parseInt(row.querySelector('.st-order').value) || 0
        });
    });
    lacashConfig.statuses = statuses;

    const models = [];
    document.querySelectorAll('#lacashAdminModelsList .pos-config-row').forEach(row => {
        models.push({
            id: parseInt(row.querySelector('.mod-id').value) || 0,
            name: row.querySelector('.mod-name').value
        });
    });
    lacashConfig.models = models;

    try {
        const res = await fetch('/api/lacash-config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(lacashConfig)
        });
        if (res.ok) {
            document.getElementById('lacashAdminModal').style.display = 'none';
            initLacashTab(); 
        } else {
            alert('Kaydedilemedi');
        }
    } catch(e) {
        console.error(e);
        alert('Hata');
    }
}

let currentNewLacashStatusId = null;

function getNewLacashTicketModalHtml() {
    return `
    <div class="pos-modal-overlay" id="newLacashModal">
        <div class="pos-modal" style="width: 500px;">
            <h3>➕ Yeni LaCash Ekle</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; margin-top: 15px;">
                <div style="flex:1; margin-right: 10px;">
                    <label>Müşteri Ara:</label>
                    <input type="text" id="newLacashCustomerSearch" oninput="updateNewLacashCustomerOptions()" placeholder="Firma veya müşteri numarası ara..." style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-color); color: var(--text-color);">
                </div>
                <div style="white-space: nowrap; margin-bottom: 8px;">
                    <label>Sonuç: <span id="newLacashCustomerCount" style="font-weight: bold;">0</span></label>
                </div>
            </div>
            <select id="newLacashKunde">
                <option value="">-- Müşteri Seçin --</option>
            </select>
            
            <label style="margin-top: 15px; display:block;">LaCash Modülü:</label>
            <select id="newLacashModel">
                <option value="">-- Model Seçin --</option>
            </select>
            
            <label style="margin-top: 15px; display:block;">Not / Açıklama:</label>
            <textarea id="newLacashNot" placeholder="Gerekli açıklamaları girin..."></textarea>

            <div class="pos-modal-actions">
                <button class="btn-danger" onclick="document.getElementById('newLacashModal').style.display='none'">İptal</button>
                <button class="btn-save" id="btnCreateNewLacash">Oluştur</button>
            </div>
        </div>
    </div>
    `;
}

function updateNewLacashCustomerOptions() {
    const filter = document.getElementById('newLacashCustomerSearch')?.value || '';
    const select = document.getElementById('newLacashKunde');
    const countLabel = document.getElementById('newLacashCustomerCount');
    if (!select) return;

    const searchValue = String(filter).trim().toLowerCase();

    const customers = allCustomersLacash.filter(c => {
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

function openNewLacashTicketModal(statusId) {
    currentNewLacashStatusId = statusId;
    document.getElementById('newLacashModal').style.display = 'flex';
    
    const custSearch = document.getElementById('newLacashCustomerSearch');
    if (custSearch) custSearch.value = '';

    updateNewLacashCustomerOptions();

    const modelSelect = document.getElementById('newLacashModel');
    modelSelect.innerHTML = '<option value="">-- Model Seçin --</option>';
    (lacashConfig.models || []).forEach(m => {
        modelSelect.innerHTML += `<option value="${m.name}">${m.name}</option>`;
    });
    
    document.getElementById('newLacashNot').value = '';

    document.getElementById('btnCreateNewLacash').onclick = async function() {
        this.disabled = true;
        this.innerText = "Lütfen bekleyin...";
        await createNewLacashTicket();
        this.disabled = false;
        this.innerText = "Oluştur";
    };
}

async function createNewLacashTicket() {
    const kKunde = document.getElementById('newLacashKunde').value;
    const model = document.getElementById('newLacashModel').value;
    const notTxt = document.getElementById('newLacashNot').value;

    if (!kKunde) {
        alert("Lütfen müşteri seçiniz.");
        return;
    }

    const customer = allCustomersLacash.find(c => c.kKunde == kKunde);
    const kundeName = customer ? customer.Firma : 'Bilinmiyor';

    const cTitel = model ? `LACASH: [${model}] ${kundeName}` : `LACASH: ${kundeName}`;
    let cInhalt = `LaCash Talebi`;
    if (model) cInhalt += `\nModel: ${model}`;
    if (notTxt) cInhalt += `\nNot: ${notTxt}`;
    const kBenutzer = lacashConfig.pos_user_id || 1;

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
            
            // Set the lacash status explicitly since we no longer pass it in POST /api/tickets
            const payload = {};
            payload[newTicketId] = currentNewLacashStatusId;
            await fetch('/api/lacash-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            document.getElementById('newLacashModal').style.display = 'none';
            await initLacashTab();
        } else {
            const err = await res.json();
            alert('Hata: ' + err.error);
        }
    } catch(e) {
        console.error(e);
        alert('Hata: ' + e.message);
    }
}
