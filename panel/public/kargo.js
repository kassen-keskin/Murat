let kargoConfig = {};
let kargoTickets = [];
let kargoRecords = {};
let allCustomersKargo = [];

async function initKargoTab() {
    await fetchKargoConfig();
    await fetchKargoRecords();
    await fetchKargoTickets();
    await fetchKargoCustomers();
    renderKargoBoard();
}

async function fetchKargoConfig() {
    try {
        const res = await fetch('/api/kargo-config');
        if (res.ok) kargoConfig = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchKargoRecords() {
    try {
        const res = await fetch('/api/kargo-tickets');
        if (res.ok) kargoRecords = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchKargoTickets() {
    try {
        const res = await fetch('/api/tickets');
        if (res.ok) {
            const allTickets = await res.json();
            // Filter tickets belonging to POS
            kargoTickets = allTickets.filter(t => t.cTitelErsteNachricht && t.cTitelErsteNachricht.toUpperCase().startsWith('KARGO:') || t.cTitelErsteNachricht.toUpperCase().startsWith('KORGO:'));
        }
    } catch (e) { console.error(e); }
}

async function fetchKargoCustomers() {
    try {
        const res = await fetch('/api/pos-customers');
        if (res.ok) {
            allCustomersKargo = await res.json();
        }
    } catch (e) { console.error(e); }
}

function renderKargoBoard() {
    const container = document.getElementById('kargoContainer');
    if (!container) return;

    let html = `
        <div class="pos-header">
            <h2>🚚 Kargo Takip Sistemi</h2>
            <button class="pos-admin-btn" onclick="openKargoAdmin()">⚙️ Yönetim Paneli</button>
        </div>
        <div class="pos-board" id="kargoBoard">
    `;

    if (kargoConfig.statuses && kargoConfig.statuses.length > 0) {
        kargoConfig.statuses.sort((a,b) => a.order - b.order).forEach(status => {
            html += `
                <div class="pos-column" data-status-id="${status.id}">
                    <div class="pos-column-header" style="background-color: ${status.color};">
                        ${status.name} 
                        <button style="float:right; border:none; background:none; color:white; cursor:pointer;" onclick="openNewKargoTicketModal(${status.id})" title="Yeni Ticket Ekle">➕</button>
                    </div>
                    <div class="pos-column-body" id="kargo-col-${status.id}">
                    </div>
                </div>
            `;
        });
    } else {
        html += `<div style="padding: 20px;">Lütfen Yönetim Panelinden durumları yapılandırın.</div>`;
    }

    html += `</div>`;
    html += getKargoAdminModalHtml();
    html += getNewKargoTicketModalHtml();

    container.innerHTML = html;

    if (kargoConfig.statuses) {
        kargoConfig.statuses.forEach(status => {
            const colBody = document.getElementById(`kargo-col-${status.id}`);
            if (!colBody) return;
            
            // Map tickets into columns by kargoRecords
            const columnTickets = kargoTickets.filter(t => {
                let sId = kargoRecords[t.kTicket.toString()];
                // If it doesn't have a recorded status, assume it's in the first column
                if (!sId && kargoConfig.statuses.length > 0 && status.id === kargoConfig.statuses[0].id) {
                    return true;
                }
                return sId === status.id;
            });

            columnTickets.forEach(ticket => {
                const card = document.createElement('div');
                card.className = 'pos-card';
                card.dataset.ticketId = ticket.kTicket;
                
                let rawTitle = ticket.cTitelErsteNachricht || '';
                let titleText = rawTitle.replace(/^(?:KARGO|KORGO):\s*/i, '').trim();
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
                    if (typeof openTicketWithSource === 'function') {
                        openTicketWithSource(ticket.kTicket, 'korgo');
                        return;
                    }
                    if (typeof setTicketNavigationSource === 'function') setTicketNavigationSource('korgo');
                    else window.ticketNavigationSource = 'korgo';
                    switchTab('tickets');
                    setTimeout(() => {
                        if (typeof selectTicket === 'function') selectTicket(ticket.kTicket);
                    }, 500);
                };
                colBody.appendChild(card);
            });

            if (typeof Sortable !== 'undefined') {
                new Sortable(colBody, {
                    group: 'kargo-board',
                    animation: 150,
                    onEnd: async function (evt) {
                        const itemEl = evt.item;
                        const toList = evt.to;
                        const newStatusId = parseInt(toList.closest('.pos-column').dataset.statusId);
                        const ticketId = itemEl.dataset.ticketId;

                        if (kargoRecords[ticketId] !== newStatusId) {
                            kargoRecords[ticketId] = newStatusId;
                            await updateKargoTicketStatus(ticketId, newStatusId);
                        }
                    }
                });
            }
        });
    }
}

async function updateKargoTicketStatus(ticketId, newStatusId) {
    try {
        const payload = {};
        payload[ticketId] = newStatusId;
        const res = await fetch('/api/kargo-tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            alert('Durum güncellenemedi');
        } else {
            const statusObj = kargoConfig.statuses.find(s => s.id === newStatusId);
            const kBenutzer = kargoConfig.pos_user_id || 1;
            const formData = new FormData();
            formData.append('cInhalt', `Kargo Durumu güncellendi: ${statusObj ? statusObj.name : newStatusId}`);
            formData.append('kBenutzer', kBenutzer);
            await fetch(`/api/tickets/${ticketId}/reply`, { method: 'POST', body: formData });
        }
    } catch (e) {
        console.error(e);
    }
}

function getKargoAdminModalHtml() {
    return `
    <div class="pos-modal-overlay" id="kargoAdminModal">
        <div class="pos-modal" style="width: 600px;">
            <h3>⚙️ Kargo Yönetim Paneli</h3>
            
            <div class="pos-admin-section">
                <label>Kargo Kullanıcısı (Ticketların Atanacağı Kullanıcı ID):</label>
                <input type="number" id="adminKargoUser" value="${kargoConfig.pos_user_id || ''}" placeholder="Kullanıcı ID (Örn: 1)">
            </div>

            <div class="pos-admin-section">
                <h3>Durumlar (Kanban Sütunları)</h3>
                <div id="adminKargoStatusesList"></div>
                <button class="btn-add" onclick="addAdminKargoStatus()">+ Yeni Durum Ekle</button>
            </div>

            <div class="pos-admin-section">
                <h3>Tedarikçi Firmalar</h3>
                <div id="adminKargoSuppliersList"></div>
                <button class="btn-add" onclick="addAdminKargoSupplier()">+ Yeni Firma Ekle</button>
            </div>

            <div class="pos-admin-section">
                <h3>Kargo / Paket Tipi</h3>
                <div id="adminKargoModelsList"></div>
                <button class="btn-add" onclick="addAdminKargoModel()">+ Yeni Model Ekle</button>
            </div>

            <div class="pos-modal-actions">
                <button class="btn-danger" onclick="document.getElementById('kargoAdminModal').style.display='none'">İptal</button>
                <button class="btn-save" onclick="saveKargoAdmin()">Kaydet</button>
            </div>
        </div>
    </div>
    `;
}

function openKargoAdmin() {
    document.getElementById('kargoAdminModal').style.display = 'flex';
    renderAdminKargoStatuses();
    renderAdminKargoSuppliers();
    renderAdminKargoModels();
}

function renderAdminKargoStatuses() {
    const list = document.getElementById('adminKargoStatusesList');
    list.innerHTML = '';
    (kargoConfig.statuses || []).forEach((st, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${st.id}" placeholder="Durum ID" style="width: 80px;" class="st-id">
                <input type="text" value="${st.name}" placeholder="Durum Adı" style="flex:1;" class="st-name">
                <input type="color" value="${st.color}" class="st-color">
                <input type="number" value="${st.order}" placeholder="Sıra" style="width: 60px;" class="st-order">
                <button class="btn-danger" onclick="removeAdminKargoStatus(${idx})">X</button>
            </div>
        `;
    });
}

function addAdminKargoStatus() {
    if (!kargoConfig.statuses) kargoConfig.statuses = [];
    kargoConfig.statuses.push({id: 100 + kargoConfig.statuses.length, name: 'Yeni Durum', color: '#607d8b', order: kargoConfig.statuses.length + 1});
    renderAdminKargoStatuses();
}

function removeAdminKargoStatus(idx) {
    kargoConfig.statuses.splice(idx, 1);
    renderAdminKargoStatuses();
}

function renderAdminKargoSuppliers() {
    const list = document.getElementById('adminKargoSuppliersList');
    list.innerHTML = '';
    (kargoConfig.suppliers || []).forEach((sup, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${sup.id}" placeholder="Firma ID" style="width: 80px;" class="sup-id">
                <input type="text" value="${sup.name}" placeholder="Firma Adı" style="flex:1;" class="sup-name">
                <button class="btn-danger" onclick="removeAdminKargoSupplier(${idx})">X</button>
            </div>
        `;
    });
}

function addAdminKargoSupplier() {
    if (!kargoConfig.suppliers) kargoConfig.suppliers = [];
    kargoConfig.suppliers.push({id: kargoConfig.suppliers.length + 1, name: 'Yeni Firma'});
    renderAdminKargoSuppliers();
}

function removeAdminKargoSupplier(idx) {
    kargoConfig.suppliers.splice(idx, 1);
    renderAdminKargoSuppliers();
}

function renderAdminKargoModels() {
    const list = document.getElementById('adminKargoModelsList');
    list.innerHTML = '';
    (kargoConfig.models || []).forEach((mod, idx) => {
        list.innerHTML += `
            <div class="pos-config-row" data-idx="${idx}">
                <input type="number" value="${mod.id}" placeholder="Model ID" style="width: 80px;" class="mod-id">
                <input type="text" value="${mod.name}" placeholder="Model Adı" style="flex:1;" class="mod-name">
                <button class="btn-danger" onclick="removeAdminKargoModel(${idx})">X</button>
            </div>
        `;
    });
}

function addAdminKargoModel() {
    if (!kargoConfig.models) kargoConfig.models = [];
    kargoConfig.models.push({id: kargoConfig.models.length + 1, name: 'Yeni Model'});
    renderAdminKargoModels();
}

function removeAdminKargoModel(idx) {
    kargoConfig.models.splice(idx, 1);
    renderAdminKargoModels();
}

async function saveKargoAdmin() {
    kargoConfig.pos_user_id = parseInt(document.getElementById('adminKargoUser').value) || null;
    
    const statuses = [];
    document.querySelectorAll('#adminKargoStatusesList .pos-config-row').forEach(row => {
        statuses.push({
            id: parseInt(row.querySelector('.st-id').value) || 0,
            name: row.querySelector('.st-name').value,
            color: row.querySelector('.st-color').value,
            order: parseInt(row.querySelector('.st-order').value) || 0
        });
    });
    kargoConfig.statuses = statuses;

    const suppliers = [];
    document.querySelectorAll('#adminKargoSuppliersList .pos-config-row').forEach(row => {
        suppliers.push({
            id: parseInt(row.querySelector('.sup-id').value) || 0,
            name: row.querySelector('.sup-name').value
        });
    });
    kargoConfig.suppliers = suppliers;

    const models = [];
    document.querySelectorAll('#adminKargoModelsList .pos-config-row').forEach(row => {
        models.push({
            id: parseInt(row.querySelector('.mod-id').value) || 0,
            name: row.querySelector('.mod-name').value
        });
    });
    kargoConfig.models = models;

    try {
        const res = await fetch('/api/kargo-config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(kargoConfig)
        });
        if (res.ok) {
            document.getElementById('kargoAdminModal').style.display = 'none';
            initKargoTab(); 
        } else {
            alert('Kaydedilemedi');
        }
    } catch(e) {
        console.error(e);
        alert('Hata');
    }
}

let currentNewKargoStatusId = null;

function getNewKargoTicketModalHtml() {
    return `
    <div class="pos-modal-overlay" id="newKargoModal">
        <div class="pos-modal" style="width: 500px;">
            <h3>➕ Yeni Kargo Ekle</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; margin-top: 15px;">
                <div style="flex:1; margin-right: 10px;">
                    <label>Müşteri Ara:</label>
                    <input type="text" id="newKargoCustomerSearch" oninput="updateNewKargoCustomerOptions()" placeholder="Firma veya müşteri numarası ara..." style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-color); color: var(--text-color);">
                </div>
                <div style="white-space: nowrap; margin-bottom: 8px;">
                    <label>Sonuç: <span id="newKargoCustomerCount" style="font-weight: bold;">0</span></label>
                </div>
            </div>
            <select id="newKargoKunde">
                <option value="">-- Müşteri Seçin --</option>
            </select>

            <label style="margin-top: 15px; display:block;">Tedarikçi Firma:</label>
            <select id="newKargoSupplier">
                <option value="">-- Tedarikçi Seçin --</option>
            </select>
            
            <label style="margin-top: 15px; display:block;">Kargo / Paket Tipi:</label>
            <select id="newKargoModel">
                <option value="">-- Model Seçin --</option>
            </select>
            
            <label style="margin-top: 15px; display:block;">Not / Açıklama:</label>
            <textarea id="newKargoNot" placeholder="Gerekli açıklamaları girin..."></textarea>

            <div class="pos-modal-actions">
                <button class="btn-danger" onclick="document.getElementById('newKargoModal').style.display='none'">İptal</button>
                <button class="btn-save" id="btnCreateNewKargo">Oluştur</button>
            </div>
        </div>
    </div>
    `;
}

function updateNewKargoCustomerOptions() {
    const filter = document.getElementById('newKargoCustomerSearch')?.value || '';
    const select = document.getElementById('newKargoKunde');
    const countLabel = document.getElementById('newKargoCustomerCount');
    if (!select) return;

    const searchValue = String(filter).trim().toLowerCase();

    const customers = allCustomersKargo.filter(c => {
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

function openNewKargoTicketModal(statusId) {
    currentNewKargoStatusId = statusId;
    document.getElementById('newKargoModal').style.display = 'flex';
    
    const custSearch = document.getElementById('newKargoCustomerSearch');
    if (custSearch) custSearch.value = '';

    updateNewKargoCustomerOptions();
    
    const supSelect = document.getElementById('newKargoSupplier');
    supSelect.innerHTML = '<option value="">-- Tedarikçi Seçin --</option>';
    (kargoConfig.suppliers || []).forEach(s => {
        supSelect.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    });

    const modelSelect = document.getElementById('newKargoModel');
    modelSelect.innerHTML = '<option value="">-- Model Seçin --</option>';
    (kargoConfig.models || []).forEach(m => {
        modelSelect.innerHTML += `<option value="${m.name}">${m.name}</option>`;
    });
    
    document.getElementById('newKargoNot').value = '';

    document.getElementById('btnCreateNewKargo').onclick = async function() {
        this.disabled = true;
        this.innerText = "Lütfen bekleyin...";
        await createNewKargoTicket();
        this.disabled = false;
        this.innerText = "Oluştur";
    };
}

async function createNewKargoTicket() {
    const kKunde = document.getElementById('newKargoKunde').value;
    const supplier = document.getElementById('newKargoSupplier').value;
    const model = document.getElementById('newKargoModel').value;
    const notTxt = document.getElementById('newKargoNot').value;

    if (!kKunde || !supplier) {
        alert("Lütfen müşteri ve tedarikçi seçiniz.");
        return;
    }

    const customer = allCustomersKargo.find(c => c.kKunde == kKunde);
    const kundeName = customer ? customer.Firma : 'Bilinmiyor';

    const cTitel = model ? `KARGO: [${supplier}] [${model}] ${kundeName}` : `KARGO: [${supplier}] ${kundeName}`;
    let cInhalt = `Kargo Talebi\nTedarikçi: ${supplier}`;
    if (model) cInhalt += `\nModel: ${model}`;
    cInhalt += `\nNot: ${notTxt}`;
    const kBenutzer = kargoConfig.pos_user_id || 1;

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
            payload[newTicketId] = currentNewKargoStatusId;
            await fetch('/api/kargo-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            document.getElementById('newKargoModal').style.display = 'none';
            await initKargoTab();
        } else {
            const err = await res.json();
            alert('Hata: ' + err.error);
        }
    } catch(e) {
        console.error(e);
        alert('Hata: ' + e.message);
    }
}
