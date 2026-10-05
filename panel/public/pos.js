let posConfig = {};
let posTickets = [];
let posRecords = {};
let allCustomersPos = [];

async function initPosTab() {
    await fetchPosConfig();
    await fetchPosRecords();
    await fetchPosTickets();
    await fetchPosCustomers();
    renderPosBoard();
}

async function fetchPosConfig() {
    try {
        const res = await fetch('/api/pos-config');
        if (res.ok) posConfig = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchPosRecords() {
    try {
        const res = await fetch('/api/pos-tickets');
        if (res.ok) posRecords = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchPosTickets() {
    try {
        const res = await fetch('/api/tickets');
        if (res.ok) {
            const allTickets = await res.json();
            // Filter tickets belonging to POS
            posTickets = allTickets.filter(t => t.cTitelErsteNachricht && t.cTitelErsteNachricht.startsWith('POS:'));
        }
    } catch (e) { console.error(e); }
}

async function fetchPosCustomers() {
    try {
        const res = await fetch('/api/pos-customers');
        if (res.ok) {
            allCustomersPos = await res.json();
        }
    } catch (e) { console.error(e); }
}

function renderPosBoard() {
    const container = document.getElementById('posContainer');
    if (!container) return;

    let html = `
        <div class="pos-header">
            <h2>💳 POS Takip Sistemi</h2>
            <button class="pos-admin-btn" onclick="openPosAdmin()">⚙️ Yönetim Paneli</button>
        </div>
        <div class="pos-board" id="posBoard">
    `;

    if (posConfig.statuses && posConfig.statuses.length > 0) {
        posConfig.statuses.sort((a,b) => a.order - b.order).forEach(status => {
            html += `
                <div class="pos-column" data-status-id="${status.id}">
                    <div class="pos-column-header" style="background-color: ${status.color};">
                        ${status.name} 
                        <button style="float:right; border:none; background:none; color:white; cursor:pointer;" onclick="openNewPosTicketModal(${status.id})" title="Yeni Ticket Ekle">➕</button>
                    </div>
                    <div class="pos-column-body" id="pos-col-${status.id}">
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div style="padding: 20px;">Lütfen Yönetim Panelinden durumları yapılandırın.</div>`;
    }

    html += `</div>`;
    html += getPosAdminModalHtml();
    html += getNewPosTicketModalHtml();

    container.innerHTML = html;

    if (posConfig.statuses) {
        posConfig.statuses.forEach(status => {
            const colBody = document.getElementById(`pos-col-${status.id}`);
            if (!colBody) return;
            
            // Map tickets into columns by posRecords
            const columnTickets = posTickets.filter(t => {
                let sId = posRecords[t.kTicket.toString()];
                // If it doesn't have a recorded status, assume it's in the first column
                if (!sId && posConfig.statuses.length > 0 && status.id === posConfig.statuses[0].id) {
                    return true;
                }
                return sId === status.id;
            });

            columnTickets.forEach(ticket => {
                const card = document.createElement('div');
                card.className = 'pos-card';
                card.dataset.ticketId = ticket.kTicket;
                
                let titleText = (ticket.cTitelErsteNachricht || '').substring(4).trim();
                let supplierName = 'Bilinmeyen';
                
                if (titleText.startsWith('[')) {
                    let match = titleText.match(/^\[(.*?)\]\s*(?:\[(.*?)\])?/);
                    if (match) {
                        let sup = match[1];
                        let mod = match[2];
                        supplierName = mod ? `${sup} - ${mod}` : sup;
                    }
                } else {
                    let titleParts = titleText.split('-');
                    supplierName = titleParts[0] ? titleParts[0].trim() : 'Bilinmeyen';
                }
                
                let kundenText = (ticket.KundenNr ? ticket.KundenNr + ' - ' : '') + (ticket.Firma || 'Bilinmeyen Müşteri');
                
                card.innerHTML = `
                    <div class="pos-card-title">${kundenText}</div>
                    <div class="pos-card-supplier">🏢 ${supplierName}</div>
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
                    group: 'pos-board',
                    animation: 150,
                    onEnd: async function (evt) {
                        const itemEl = evt.item;
                        const toList = evt.to;
                        const newStatusId = parseInt(toList.closest('.pos-column').dataset.statusId);
                        const ticketId = itemEl.dataset.ticketId;

                        if (posRecords[ticketId] !== newStatusId) {
                            posRecords[ticketId] = newStatusId;
                            await updatePosTicketStatus(ticketId, newStatusId);
                        }
                    }
                });
            }
        });
    }
}

async function updatePosTicketStatus(ticketId, newStatusId) {
    try {
        const payload = {};
        payload[ticketId] = newStatusId;
        const res = await fetch('/api/pos-tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            alert('Durum güncellenemedi');
        } else {
            const statusObj = posConfig.statuses.find(s => s.id === newStatusId);
            const kBenutzer = posConfig.pos_user_id || 1;
            const formData = new FormData();
            formData.append('cInhalt', `POS Durumu güncellendi: ${statusObj ? statusObj.name : newStatusId}`);
            formData.append('kBenutzer', kBenutzer);
            await fetch(`/api/tickets/${ticketId}/reply`, { method: 'POST', body: formData });
        }
    } catch (e) {
        console.error(e);
    }
}

function getPosAdminModalHtml() {
    return `
    <div class="pos-modal-overlay" id="posAdminModal">
        <div class="pos-modal" style="width: 600px;">
            <h3>⚙️ POS Yönetim Paneli</h3>
            
            <div class="pos-admin-section">
                <label>POS Kullanıcısı (Ticketların Atanacağı Kullanıcı ID):</label>
                <input type="number" id="adminPosUser" value="${posConfig.pos_user_id || ''}" placeholder="Kullanıcı ID (Örn: 1)">
            </div>

            <div class="pos-admin-section">
                <h3>Durumlar (Kanban Sütunları)</h3>
                <div id="adminStatusesList"></div>
                <button class="btn-add" onclick="addAdminStatus()">+ Yeni Durum Ekle</button>
            </div>

            <div class="pos-admin-section">
                <h3>Tedarikçi Firmalar</h3>
                <div id="adminSuppliersList"></div>
                <button class="btn-add" onclick="addAdminSupplier()">+ Yeni Firma Ekle</button>
            </div>

            <div class="pos-admin-section">
                <h3>POS Cihazı Marka/Modeli</h3>
                <div id="adminModelsList"></div>
                <button class="btn-add" onclick="addAdminModel()">+ Yeni Model Ekle</button>
            </div>

            <div class="pos-modal-actions">
                <button class="btn-danger" onclick="document.getElementById('posAdminModal').style.display='none'">İptal</button>
                <button class="btn-save" onclick="savePosAdmin()">Kaydet</button>
            </div>
        </div>
    </div>
    `;
}

function openPosAdmin() {
    document.getElementById('posAdminModal').style.display = 'flex';
    renderAdminStatuses();
    renderAdminSuppliers();
    renderAdminModels();
}

function renderAdminStatuses() {
    const list = document.getElementById('adminStatusesList');
    list.innerHTML = '';
    (posConfig.statuses || []).forEach((st, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${st.id}" placeholder="Durum ID" style="width: 80px;" class="st-id">
                <input type="text" value="${st.name}" placeholder="Durum Adı" style="flex:1;" class="st-name">
                <input type="color" value="${st.color}" class="st-color">
                <input type="number" value="${st.order}" placeholder="Sıra" style="width: 60px;" class="st-order">
                <button class="btn-danger" onclick="removeAdminStatus(${idx})">X</button>
            </div>
        `;
    });
}

function addAdminStatus() {
    if (!posConfig.statuses) posConfig.statuses = [];
    posConfig.statuses.push({id: 100 + posConfig.statuses.length, name: 'Yeni Durum', color: '#607d8b', order: posConfig.statuses.length + 1});
    renderAdminStatuses();
}

function removeAdminStatus(idx) {
    posConfig.statuses.splice(idx, 1);
    renderAdminStatuses();
}

function renderAdminSuppliers() {
    const list = document.getElementById('adminSuppliersList');
    list.innerHTML = '';
    (posConfig.suppliers || []).forEach((sup, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${sup.id}" placeholder="Firma ID" style="width: 80px;" class="sup-id">
                <input type="text" value="${sup.name}" placeholder="Firma Adı" style="flex:1;" class="sup-name">
                <button class="btn-danger" onclick="removeAdminSupplier(${idx})">X</button>
            </div>
        `;
    });
}

function addAdminSupplier() {
    if (!posConfig.suppliers) posConfig.suppliers = [];
    posConfig.suppliers.push({id: posConfig.suppliers.length + 1, name: 'Yeni Firma'});
    renderAdminSuppliers();
}

function removeAdminSupplier(idx) {
    posConfig.suppliers.splice(idx, 1);
    renderAdminSuppliers();
}

function renderAdminModels() {
    const list = document.getElementById('adminModelsList');
    list.innerHTML = '';
    (posConfig.models || []).forEach((mod, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${mod.id}" placeholder="Model ID" style="width: 80px;" class="mod-id">
                <input type="text" value="${mod.name}" placeholder="Model Adı" style="flex:1;" class="mod-name">
                <button class="btn-danger" onclick="removeAdminModel(${idx})">X</button>
            </div>
        `;
    });
}

function addAdminModel() {
    if (!posConfig.models) posConfig.models = [];
    posConfig.models.push({id: posConfig.models.length + 1, name: 'Yeni Model'});
    renderAdminModels();
}

function removeAdminModel(idx) {
    posConfig.models.splice(idx, 1);
    renderAdminModels();
}

async function savePosAdmin() {
    posConfig.pos_user_id = parseInt(document.getElementById('adminPosUser').value) || null;
    
    const statuses = [];
    document.querySelectorAll('#adminStatusesList .pos-config-row').forEach(row => {
        statuses.push({
            id: parseInt(row.querySelector('.st-id').value) || 0,
            name: row.querySelector('.st-name').value,
            color: row.querySelector('.st-color').value,
            order: parseInt(row.querySelector('.st-order').value) || 0
        });
    });
    posConfig.statuses = statuses;

    const suppliers = [];
    document.querySelectorAll('#adminSuppliersList .pos-config-row').forEach(row => {
        suppliers.push({
            id: parseInt(row.querySelector('.sup-id').value) || 0,
            name: row.querySelector('.sup-name').value
        });
    });
    posConfig.suppliers = suppliers;

    const models = [];
    document.querySelectorAll('#adminModelsList .pos-config-row').forEach(row => {
        models.push({
            id: parseInt(row.querySelector('.mod-id').value) || 0,
            name: row.querySelector('.mod-name').value
        });
    });
    posConfig.models = models;

    try {
        const res = await fetch('/api/pos-config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(posConfig)
        });
        if (res.ok) {
            document.getElementById('posAdminModal').style.display = 'none';
            initPosTab(); 
        } else {
            alert('Kaydedilemedi');
        }
    } catch(e) {
        console.error(e);
        alert('Hata');
    }
}

let currentNewPosStatusId = null;

function getNewPosTicketModalHtml() {
    return `
    <div class="pos-modal-overlay" id="newPosModal">
        <div class="pos-modal" style="width: 500px;">
            <h3>➕ Yeni POS Cihazı Ekle</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; margin-top: 15px;">
                <div style="flex:1; margin-right: 10px;">
                    <label>Müşteri Ara:</label>
                    <input type="text" id="newPosCustomerSearch" oninput="updateNewPosCustomerOptions()" placeholder="Firma veya müşteri numarası ara..." style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-color); color: var(--text-color);">
                </div>
                <div style="white-space: nowrap; margin-bottom: 8px;">
                    <label>Sonuç: <span id="newPosCustomerCount" style="font-weight: bold;">0</span></label>
                </div>
            </div>
            <select id="newPosKunde">
                <option value="">-- Müşteri Seçin --</option>
            </select>

            <label style="margin-top: 15px; display:block;">Tedarikçi Firma:</label>
            <select id="newPosSupplier">
                <option value="">-- Tedarikçi Seçin --</option>
            </select>
            
            <label style="margin-top: 15px; display:block;">POS Cihazı Marka/Modeli:</label>
            <select id="newPosModel">
                <option value="">-- Model Seçin --</option>
            </select>
            
            <label style="margin-top: 15px; display:block;">Not / Açıklama:</label>
            <textarea id="newPosNot" placeholder="Gerekli açıklamaları girin..."></textarea>

            <div class="pos-modal-actions">
                <button class="btn-danger" onclick="document.getElementById('newPosModal').style.display='none'">İptal</button>
                <button class="btn-save" id="btnCreateNewPos">Oluştur</button>
            </div>
        </div>
    </div>
    `;
}

function updateNewPosCustomerOptions() {
    const filter = document.getElementById('newPosCustomerSearch')?.value || '';
    const select = document.getElementById('newPosKunde');
    const countLabel = document.getElementById('newPosCustomerCount');
    if (!select) return;

    const searchValue = String(filter).trim().toLowerCase();

    const customers = allCustomersPos.filter(c => {
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

function openNewPosTicketModal(statusId) {
    currentNewPosStatusId = statusId;
    document.getElementById('newPosModal').style.display = 'flex';
    
    const custSearch = document.getElementById('newPosCustomerSearch');
    if (custSearch) custSearch.value = '';

    updateNewPosCustomerOptions();
    
    const supSelect = document.getElementById('newPosSupplier');
    supSelect.innerHTML = '<option value="">-- Tedarikçi Seçin --</option>';
    (posConfig.suppliers || []).forEach(s => {
        supSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    });

    const modelSelect = document.getElementById('newPosModel');
    modelSelect.innerHTML = '<option value="">-- Model Seçin --</option>';
    (posConfig.models || []).forEach(m => {
        modelSelect.innerHTML += `<option value="${m.name}">${m.name}</option>`;
    });
    
    document.getElementById('newPosNot').value = '';

    document.getElementById('btnCreateNewPos').onclick = async function() {
        this.disabled = true;
        this.innerText = "Lütfen bekleyin...";
        await createNewPosTicket();
        this.disabled = false;
        this.innerText = "Oluştur";
    };
}

async function createNewPosTicket() {
    const kKunde = document.getElementById('newPosKunde').value;
    const supplier = document.getElementById('newPosSupplier').value;
    const model = document.getElementById('newPosModel').value;
    const notTxt = document.getElementById('newPosNot').value;

    if (!kKunde || !supplier) {
        alert("Lütfen müşteri ve tedarikçi seçiniz.");
        return;
    }

    const customer = allCustomersPos.find(c => c.kKunde == kKunde);
    const kundeName = customer ? customer.Firma : 'Bilinmiyor';

    const cTitel = model ? `POS: [${supplier}] [${model}] ${kundeName}` : `POS: [${supplier}] ${kundeName}`;
    let cInhalt = `POS Cihazı Talebi\nTedarikçi: ${supplier}`;
    if (model) cInhalt += `\nModel: ${model}`;
    cInhalt += `\nNot: ${notTxt}`;
    const kBenutzer = posConfig.pos_user_id || 1;

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
            
            // Set the pos status explicitly since we no longer pass it in POST /api/tickets
            const payload = {};
            payload[newTicketId] = currentNewPosStatusId;
            await fetch('/api/pos-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            document.getElementById('newPosModal').style.display = 'none';
            await initPosTab();
        } else {
            const err = await res.json();
            alert('Hata: ' + err.error);
        }
    } catch(e) {
        console.error(e);
        alert('Hata: ' + e.message);
    }
}
