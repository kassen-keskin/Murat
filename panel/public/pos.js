let posConfig = {};
let posTickets = [];
let posRecords = {};
let allCustomersPos = [];

const KASSEN_KESKIN_LIEFERADRESSE = "Kassen Keskin, Erol Keskin, Stülpnagelstraße 3, 14059 Berlin";

const ELAVON_DEFAULTS = {
    rechtsform: "Einzelunternehmen",
    miete: "0",
    transaktionspreis: "0,05 €",
    simKarte: "Nein",
    masterVisaCredit: "0,89 %",
    masterVisaDebit: "0,89 %",
    maestroVpay: "0,89 %",
    nonEwr: "2,50 %",
    diners: "2,50 %",
    dcc: "1 % Cashback",
    laufzeit: "2 Jahre",
    sonderkuendigung: "Bei Gewerbeabmeldung",
    adminFee: "0",
    pec: "43886",
    lieferadresseType: "Kunde"
};

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
            // Filter tickets belonging to POS (exclude resolved/closed tickets: kStatus 3 or 4)
            posTickets = allTickets.filter(t =>
                t.cTitelErsteNachricht &&
                t.cTitelErsteNachricht.startsWith('POS:') &&
                Number(t.kStatus) !== 3 &&
                Number(t.kStatus) !== 4
            );
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

    const firstStatusId = (posConfig.statuses && posConfig.statuses.length > 0)
        ? [...posConfig.statuses].sort((a, b) => a.order - b.order)[0].id
        : 100;

    let html = `
        <div class="pos-header">
            <h2>💳 POS Takip Sistemi</h2>
            <div style="display:flex; gap:10px; align-items:center;">
                <button class="btn-save" onclick="openNewPosTicketModal(${firstStatusId})" title="Yeni POS Ticket Oluştur">➕ Yeni POS Talebi</button>
                <button class="pos-admin-btn" onclick="openPosAdmin()">⚙️ Yönetim Paneli</button>
            </div>
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
    html += getPosElavonPrintPreviewHtml();

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
                    if (typeof openTicketWithSource === 'function') {
                        openTicketWithSource(ticket.kTicket, 'pos');
                        return;
                    }
                    if (typeof setTicketNavigationSource === 'function') setTicketNavigationSource('pos');
                    else window.ticketNavigationSource = 'pos';
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
        <div class="pos-modal" style="width: 1000px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px; margin-bottom:12px;">
                <h3 style="margin:0;">➕ Yeni POS Cihazı Ekle</h3>
                <button type="button" onclick="document.getElementById('newPosModal').style.display='none'" style="background:none; border:none; color:var(--text-muted); font-size:1.4rem; cursor:pointer; line-height:1;">&times;</button>
            </div>
            
            <!-- Üst Seçim Satırı: Müşteri Arama + Seçim + Tedarikçi + Model -->
            <div class="pos-form-box" style="margin-bottom: 14px;">
                <div class="pos-inline-grid-2">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <label style="margin:0;">Müşteri Ara:</label>
                            <span style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.25;">Sonuç: <strong id="newPosCustomerCount">0</strong></span>
                        </div>
                        <input type="text" id="newPosCustomerSearch" oninput="updateNewPosCustomerOptions()" placeholder="Firma veya müşteri numarası ara...">
                    </div>
                    <div>
                        <label>Müşteri Seçin *</label>
                        <select id="newPosKunde" onchange="onPosCustomerChange()">
                            <option value="">-- Müşteri Seçin --</option>
                        </select>
                    </div>
                </div>

                <div class="pos-inline-grid-2">
                    <div>
                        <label>Tedarikçi Firma *</label>
                        <select id="newPosSupplier">
                            <option value="">-- Tedarikçi Seçin --</option>
                        </select>
                    </div>
                    <div>
                        <label>POS Cihazı Marka / Model</label>
                        <select id="newPosModel">
                            <option value="">-- Model Seçin --</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- İki Sütunlu Detay Alanları -->
            <div class="pos-form-grid">
                <!-- Sol Sütun: Müşteri / İşletme Bilgileri -->
                <div class="pos-form-box">
                    <div class="pos-form-box-title">🏢 Müşteri & İşletme Bilgileri</div>
                    
                    <div class="pos-field-row">
                        <label>Name vom Geschäft (İşletme Adı):</label>
                        <input type="text" id="elavonFirma" oninput="onElavonCustomerFieldEdit()" placeholder="Örn: Mustermann">
                    </div>

                    <div class="pos-inline-grid-2">
                        <div>
                            <label>Straße (Cadde / Sokak):</label>
                            <input type="text" id="elavonStrasse" oninput="onElavonCustomerFieldEdit()" placeholder="Örn: Muster str 1">
                        </div>
                        <div>
                            <label>PLZ, Ort (Posta Kodu, Şehir):</label>
                            <input type="text" id="elavonPlzOrt" oninput="onElavonCustomerFieldEdit()" placeholder="Örn: 12049 Berlin">
                        </div>
                    </div>

                    <div class="pos-field-row">
                        <label>Inhaber (İşletme Sahibi):</label>
                        <input type="text" id="elavonInhaber" oninput="onElavonCustomerFieldEdit()" placeholder="Örn: Müslüm Muster">
                    </div>

                    <div class="pos-inline-grid-2">
                        <div>
                            <label>E-Mail:</label>
                            <input type="text" id="elavonEmail" placeholder="Örn: Muster@gmail.com">
                        </div>
                        <div>
                            <label>Telefon:</label>
                            <input type="text" id="elavonTelefon" placeholder="Örn: +49 178 ...">
                        </div>
                    </div>

                    <div class="pos-inline-grid-2">
                        <div>
                            <label>Rechtsform (Şirket Türü):</label>
                            <input type="text" id="elavonRechtsform" list="elavonRechtsformList" placeholder="Einzelunternehmen">
                            <datalist id="elavonRechtsformList">
                                <option value="Einzelunternehmen">
                                <option value="GbR">
                                <option value="GmbH">
                                <option value="UG (haftungsbeschränkt)">
                                <option value="GmbH & Co. KG">
                                <option value="e.K.">
                            </datalist>
                        </div>
                        <div>
                            <label>Steuer Nr. (Vergi No):</label>
                            <input type="text" id="elavonSteuerNr" placeholder="Örn: DE123456789">
                        </div>
                    </div>
                </div>

                <!-- Sağ Sütun: Sözleşme & Oran Bilgileri -->
                <div class="pos-form-box">
                    <div class="pos-form-box-title">💳 Kondisyon & Sözleşme Bilgileri</div>

                    <div class="pos-inline-grid-3">
                        <div>
                            <label>Miete:</label>
                            <input type="text" id="elavonMiete" placeholder="0">
                        </div>
                        <div>
                            <label>SIM Karte:</label>
                            <select id="elavonSimKarte">
                                <option value="Nein">Yok (Nein)</option>
                                <option value="Ja">Var (Ja)</option>
                            </select>
                        </div>
                        <div>
                            <label>Admin Fee (monatlich):</label>
                            <input type="text" id="elavonAdminFee" placeholder="0">
                        </div>
                    </div>

                    <div class="pos-inline-grid-3">
                        <div>
                            <label>Master/Visa Credit:</label>
                            <input type="text" id="elavonMasterVisaCredit" placeholder="0,89 %">
                        </div>
                        <div>
                            <label>Master/Visa Debit:</label>
                            <input type="text" id="elavonMasterVisaDebit" placeholder="0,89 %">
                        </div>
                        <div>
                            <label>Maestro/Vpay:</label>
                            <input type="text" id="elavonMaestroVpay" placeholder="0,89 %">
                        </div>
                    </div>

                    <div class="pos-inline-grid-3">
                        <div>
                            <label>Diners/JCB/CUP:</label>
                            <input type="text" id="elavonDiners" placeholder="2,50 %">
                        </div>
                        <div>
                            <label>DCC:</label>
                            <input type="text" id="elavonDcc" placeholder="1 % Cashback">
                        </div>
                        <div>
                            <label>Laufzeit:</label>
                            <input type="text" id="elavonLaufzeit" placeholder="2 Jahre">
                        </div>
                    </div>

                    <div class="pos-inline-grid-2">
                        <div>
                            <label title="Transaktionspreis inkl. Clearing">Transaktionspreis inkl. Clearing:</label>
                            <input type="text" id="elavonTransaktionspreis" placeholder="0,05 €">
                        </div>
                        <div>
                            <label title="Non EWR Karten / Business Cards">Non EWR Karten / Business Cards:</label>
                            <input type="text" id="elavonNonEwr" placeholder="2,50 %">
                        </div>
                    </div>

                    <div class="pos-inline-grid-2">
                        <div>
                            <label>Sonderkündigungsrecht:</label>
                            <input type="text" id="elavonSonderkuendigung" placeholder="Bei Gewerbeabmeldung">
                        </div>
                        <div>
                            <label>PEC:</label>
                            <input type="text" id="elavonPec" placeholder="43886">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Alt Bölüm: Lieferadresse & Bemerkung -->
            <div class="pos-form-box" style="margin-top: 14px;">
                <div class="pos-inline-grid-2">
                    <div>
                        <label>Lieferadresse (Teslimat Adresi Seçimi):</label>
                        <select id="elavonLieferadresseType" onchange="updateElavonLieferadresse()">
                            <option value="Kunde">Müşteri Adresi (Kunde)</option>
                            <option value="KassenKeskin">Kassen Keskin Adresi</option>
                        </select>
                    </div>
                    <div>
                        <label>Lieferadresse (PDF ve Ticket'ta Görünecek Adres):</label>
                        <input type="text" id="elavonLieferadresse" placeholder="Teslimat adresi...">
                    </div>
                </div>

                <div class="pos-field-row" style="margin-top: 10px;">
                    <label>Bemerkung (Not / Açıklama):</label>
                    <textarea id="newPosNot" placeholder="Varsa ek açıklamaları girin..."></textarea>
                </div>
            </div>

            <div class="pos-modal-actions">
                <button type="button" class="btn-danger" onclick="document.getElementById('newPosModal').style.display='none'">İptal</button>
                <button type="button" class="btn-pdf-secondary" onclick="downloadPosElavonPdfOnly()">📄 Sadece PDF İndir</button>
                <button type="button" class="btn-save" id="btnCreateNewPos">✅ Ticket Oluştur & PDF İndir</button>
            </div>
        </div>
    </div>
    `;
}

function getPosElavonPrintPreviewHtml() {
    return `
    <!-- Gizli A4 Elavon PDF Yazdırma Alanı (Tek Sayfa A4) -->
    <div id="posElavonPrintPreview" style="position: absolute; left: -9999px; width: 210mm; background: white; color: black; font-family: 'Times New Roman', serif; padding: 0; box-sizing: border-box; overflow: hidden;">
        <img src="/a4.ust.siyah.jpg" style="width: 100%; display: block; margin: 0; padding: 0;" alt="Header">

        <div style="padding: 7mm 18mm 8mm 18mm;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="width: 55%;">
                    <h3 style="margin: 0 0 4px 0; font-size: 12pt; font-weight: bold;">Kunde / Geschäft:</h3>
                    <p id="elavonPrintCustomerBlock" style="margin: 0; font-size: 10.5pt; white-space: pre-wrap; line-height: 1.25;"></p>
                </div>
                <div style="width: 42%; text-align: left;">
                    <p style="margin: 0 0 5px 0; font-size: 10.5pt; font-weight: bold; line-height: 1.25;">Berlin, <span id="elavonPrintDate"></span></p>
                    <p style="margin: 0 0 2px 0; font-size: 10.5pt; line-height: 1.25;"><strong>Kunden-Nr.:</strong> <span id="elavonPrintKundenNr"></span></p>
                    <p style="margin: 0 0 2px 0; font-size: 10.5pt; line-height: 1.25;"><strong>Terminal:</strong> <span id="elavonPrintModel"></span></p>
                    <p style="margin: 0; font-size: 10.5pt; line-height: 1.25;"><strong>PEC:</strong> <span id="elavonPrintPecTop"></span></p>
                </div>
            </div>

            <div style="margin-bottom: 8px; border-bottom: 1.5px solid #000; padding-bottom: 3px;">
                <h2 id="elavonPrintTitle" style="margin: 0; font-size: 12.5pt; font-weight: bold; letter-spacing: 0.3px;">Terminal Auftrag & Konditionen</h2>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 10pt; line-height: 1.22;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th id="elavonPrintThLeft" style="border: 1px solid #222; padding: 4px 8px; text-align: left; width: 48%; font-weight: bold;">Bezeichnung</th>
                        <th style="border: 1px solid #222; padding: 4px 8px; text-align: left; width: 52%; font-weight: bold;">Info</th>
                    </tr>
                </thead>
                <tbody id="elavonPrintTableBody">
                </tbody>
            </table>
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

    onPosCustomerChange();
}

async function onPosCustomerChange() {
    const select = document.getElementById('newPosKunde');
    if (!select) return;
    const kKunde = select.value;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    if (!kKunde) {
        setVal('elavonFirma', '');
        setVal('elavonStrasse', '');
        setVal('elavonPlzOrt', '');
        setVal('elavonInhaber', '');
        setVal('elavonEmail', '');
        setVal('elavonTelefon', '');
        setVal('elavonSteuerNr', '');
        updateElavonLieferadresse();
        return;
    }

    let customer = allCustomersPos.find(c => String(c.kKunde) === String(kKunde));
    if (!customer) return;

    // Ensure full [Custom].[Kunde] columns are loaded if cached before upgrade
    if (customer.FirmaAdress === undefined && customer.Mail === undefined && customer.SteuerNr === undefined) {
        try {
            const res = await fetch(`/api/kunde-by-id/${encodeURIComponent(kKunde)}`);
            if (res.ok) {
                const fullData = await res.json();
                Object.assign(customer, fullData);
            } else if (customer.KundenNr) {
                const res2 = await fetch(`/api/kunde/${encodeURIComponent(customer.KundenNr)}`);
                if (res2.ok) {
                    const fullData = await res2.json();
                    Object.assign(customer, fullData);
                }
            }
        } catch (e) {
            console.error('Kunde detayları alınamadı:', e);
        }
    }

    const firma = customer.Firma || '';
    const strasse = customer.FirmaAdress || [customer.FirmaStrasse, customer.FirmaNo].filter(Boolean).join(' ') || customer.Strasse || '';
    const plzOrt = [customer.PLZ, customer.Ort].filter(Boolean).join(' ');
    const inhaber = customer.InhabeName || [customer.cVorname, customer.cName].filter(Boolean).join(' ') || '';
    const email = customer.Mail || customer.EMail || customer.cMail || '';
    const telefon = customer.Tel || customer.Mobil || '';
    const steuerNr = customer.SteuerNr || customer.IDNr || '';

    setVal('elavonFirma', firma);
    setVal('elavonStrasse', strasse);
    setVal('elavonPlzOrt', plzOrt);
    setVal('elavonInhaber', inhaber);
    setVal('elavonEmail', email);
    setVal('elavonTelefon', telefon);
    setVal('elavonSteuerNr', steuerNr);

    updateElavonLieferadresse();
}

function onElavonCustomerFieldEdit() {
    const typeSelect = document.getElementById('elavonLieferadresseType');
    if (typeSelect && typeSelect.value === 'Kunde') {
        updateElavonLieferadresse();
    }
}

function updateElavonLieferadresse() {
    const typeSelect = document.getElementById('elavonLieferadresseType');
    const addrInput = document.getElementById('elavonLieferadresse');
    if (!typeSelect || !addrInput) return;

    if (typeSelect.value === 'KassenKeskin') {
        addrInput.value = KASSEN_KESKIN_LIEFERADRESSE;
    } else {
        const firma = (document.getElementById('elavonFirma')?.value || '').trim();
        const inhaber = (document.getElementById('elavonInhaber')?.value || '').trim();
        const strasse = (document.getElementById('elavonStrasse')?.value || '').trim();
        const plzOrt = (document.getElementById('elavonPlzOrt')?.value || '').trim();
        const parts = [firma, inhaber, strasse, plzOrt].filter(Boolean);
        addrInput.value = parts.length > 0 ? parts.join(', ') : 'Kundenadresse (Wie Geschäftsadresse)';
    }
}

function resetElavonDefaults() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };
    setVal('elavonRechtsform', ELAVON_DEFAULTS.rechtsform);
    setVal('elavonMiete', ELAVON_DEFAULTS.miete);
    setVal('elavonTransaktionspreis', ELAVON_DEFAULTS.transaktionspreis);
    setVal('elavonSimKarte', ELAVON_DEFAULTS.simKarte);
    setVal('elavonMasterVisaCredit', ELAVON_DEFAULTS.masterVisaCredit);
    setVal('elavonMasterVisaDebit', ELAVON_DEFAULTS.masterVisaDebit);
    setVal('elavonMaestroVpay', ELAVON_DEFAULTS.maestroVpay);
    setVal('elavonNonEwr', ELAVON_DEFAULTS.nonEwr);
    setVal('elavonDiners', ELAVON_DEFAULTS.diners);
    setVal('elavonDcc', ELAVON_DEFAULTS.dcc);
    setVal('elavonLaufzeit', ELAVON_DEFAULTS.laufzeit);
    setVal('elavonSonderkuendigung', ELAVON_DEFAULTS.sonderkuendigung);
    setVal('elavonAdminFee', ELAVON_DEFAULTS.adminFee);
    setVal('elavonPec', ELAVON_DEFAULTS.pec);
    setVal('elavonLieferadresseType', ELAVON_DEFAULTS.lieferadresseType);
}

function openNewPosTicketModal(statusId) {
    currentNewPosStatusId = statusId || 100;
    document.getElementById('newPosModal').style.display = 'flex';
    
    const custSearch = document.getElementById('newPosCustomerSearch');
    if (custSearch) custSearch.value = '';

    resetElavonDefaults();
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
        this.innerText = "⏳ Lütfen bekleyin...";
        await createNewPosTicket();
        this.disabled = false;
        this.innerText = "✅ Ticket Oluştur & PDF İndir";
    };
}

function collectPosElavonFormData() {
    const kKunde = document.getElementById('newPosKunde')?.value || '';
    const customer = allCustomersPos.find(c => String(c.kKunde) === String(kKunde));
    const kundenNr = customer ? (customer.KundenNr || '') : '';
    const supplier = (document.getElementById('newPosSupplier')?.value || '').trim();
    const model = (document.getElementById('newPosModel')?.value || '').trim();

    const firma = (document.getElementById('elavonFirma')?.value || (customer ? customer.Firma : '') || '').trim();
    const strasse = (document.getElementById('elavonStrasse')?.value || '').trim();
    const plzOrt = (document.getElementById('elavonPlzOrt')?.value || '').trim();
    const inhaber = (document.getElementById('elavonInhaber')?.value || '').trim();
    const email = (document.getElementById('elavonEmail')?.value || '').trim();
    const telefon = (document.getElementById('elavonTelefon')?.value || '').trim();
    const rechtsform = (document.getElementById('elavonRechtsform')?.value || '').trim();
    const steuerNr = (document.getElementById('elavonSteuerNr')?.value || '').trim();
    const miete = (document.getElementById('elavonMiete')?.value || '0').trim();
    const transaktionspreis = (document.getElementById('elavonTransaktionspreis')?.value || '').trim();
    const simKarte = (document.getElementById('elavonSimKarte')?.value || 'Nein').trim();
    const masterVisaCredit = (document.getElementById('elavonMasterVisaCredit')?.value || '').trim();
    const masterVisaDebit = (document.getElementById('elavonMasterVisaDebit')?.value || '').trim();
    const maestroVpay = (document.getElementById('elavonMaestroVpay')?.value || '').trim();
    const nonEwr = (document.getElementById('elavonNonEwr')?.value || '').trim();
    const diners = (document.getElementById('elavonDiners')?.value || '').trim();
    const dcc = (document.getElementById('elavonDcc')?.value || '').trim();
    const laufzeit = (document.getElementById('elavonLaufzeit')?.value || '').trim();
    const sonderkuendigung = (document.getElementById('elavonSonderkuendigung')?.value || '').trim();
    const adminFee = (document.getElementById('elavonAdminFee')?.value || '0').trim();
    const pec = (document.getElementById('elavonPec')?.value || '43886').trim();
    const lieferadresseType = (document.getElementById('elavonLieferadresseType')?.value || 'Kunde').trim();
    const lieferadresse = (document.getElementById('elavonLieferadresse')?.value || '').trim();
    const bemerkung = (document.getElementById('newPosNot')?.value || '').trim();

    return {
        kKunde,
        kundenNr,
        supplier,
        model,
        firma,
        strasse,
        plzOrt,
        inhaber,
        email,
        telefon,
        rechtsform,
        steuerNr,
        miete,
        transaktionspreis,
        simKarte,
        masterVisaCredit,
        masterVisaDebit,
        maestroVpay,
        nonEwr,
        diners,
        dcc,
        laufzeit,
        sonderkuendigung,
        adminFee,
        pec,
        lieferadresseType,
        lieferadresse,
        bemerkung
    };
}

async function generatePosElavonPdfDoc(formData) {
    const d = formData || collectPosElavonFormData();

    if (!d.kKunde) {
        alert("Lütfen bir müşteri seçin.");
        return null;
    }

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    document.getElementById('elavonPrintDate').textContent = dateStr;
    document.getElementById('elavonPrintKundenNr').textContent = d.kundenNr || '-';
    document.getElementById('elavonPrintModel').textContent = d.model || '-';
    document.getElementById('elavonPrintPecTop').textContent = d.pec || '43886';

    const titleEl = document.getElementById('elavonPrintTitle');
    if (titleEl) {
        titleEl.textContent = d.supplier
            ? `${d.supplier} – Terminal Auftrag & Konditionen`
            : 'Terminal Auftrag & Konditionen';
    }

    const customerBlockLines = [
        d.firma,
        d.inhaber ? `Inh.: ${d.inhaber}` : '',
        d.strasse,
        d.plzOrt
    ].filter(Boolean);
    document.getElementById('elavonPrintCustomerBlock').textContent = customerBlockLines.join('\n');

    const mieteLabel = d.model
        ? `Miete (${d.model}):`
        : 'Miete:';

    const rows = [
        ['Name vom Geschäft:', d.firma || '-'],
        ['Straße:', d.strasse || '-'],
        ['PLZ, Ort:', d.plzOrt || '-'],
        ['Inhaber:', d.inhaber || '-'],
        ['E-Mail:', d.email || '-'],
        ['Telefon:', d.telefon || '-'],
        ['Rechtsform:', d.rechtsform || '-'],
        ['Steuer Nr.:', d.steuerNr || '-'],
        [mieteLabel, d.miete || '0'],
        ['Transaktionspreis inkl. Clearing:', d.transaktionspreis || '-'],
        ['SIM Karte:', d.simKarte || 'Nein'],
        ['Master/Visa Credit:', d.masterVisaCredit || '-'],
        ['Master/Visa Debit:', d.masterVisaDebit || '-'],
        ['Maestro/Vpay:', d.maestroVpay || '-'],
        ['Non EWR Karten (nicht europäisches Ausland / Business Cards):', d.nonEwr || '-'],
        ['Diners/JCB/CUP:', d.diners || '-'],
        ['DCC:', d.dcc || '-'],
        ['Laufzeit:', d.laufzeit || '-'],
        ['Sonderkündigungsrecht:', d.sonderkuendigung || '-'],
        ['Admin Fee (monatlich):', d.adminFee || '0'],
        ['PEC:', d.pec || '43886'],
        ['Lieferadresse:', d.lieferadresse || '-'],
        ['Bemerkung:', d.bemerkung || '-']
    ];

    const tbody = document.getElementById('elavonPrintTableBody');
    tbody.innerHTML = '';
    rows.forEach(([label, val], idx) => {
        const tr = document.createElement('tr');
        if (idx % 2 === 1) {
            tr.style.backgroundColor = '#fafafa';
        }
        const tdLabel = document.createElement('td');
        tdLabel.style.cssText = 'border: 1px solid #333; padding: 3.5px 8px; font-weight: bold; vertical-align: top;';
        tdLabel.textContent = label;

        const tdVal = document.createElement('td');
        tdVal.style.cssText = 'border: 1px solid #333; padding: 3.5px 8px; white-space: pre-wrap; vertical-align: top;';
        tdVal.textContent = val;

        tr.appendChild(tdLabel);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
    });

    const printArea = document.getElementById('posElavonPrintPreview');
    printArea.style.width = '210mm';
    printArea.style.minHeight = '0';
    printArea.style.left = '0';
    printArea.style.visibility = 'visible';
    printArea.style.position = 'absolute';
    printArea.style.top = '0';
    printArea.style.zIndex = '9999';

    try {
        const canvas = await html2canvas(printArea, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        // Her zaman tek bir A4 sayfasına sığdır (2. sayfa oluşturma)
        if (imgHeight <= pageHeight) {
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
        } else {
            const scaledWidth = (canvas.width * pageHeight) / canvas.height;
            const offsetX = (pdfWidth - scaledWidth) / 2;
            pdf.addImage(imgData, 'JPEG', offsetX, 0, scaledWidth, pageHeight);
        }

        const safeFirma = (d.firma || d.inhaber || 'Musteri').replace(/[\\/:*?"<>|]/g, '').trim();
        const safeKundenNr = (d.kundenNr || d.kKunde || '').toString().replace(/[\\/:*?"<>|]/g, '').trim();
        const safeSupplier = (d.supplier || 'POS').replace(/[\\/:*?"<>|]/g, '').trim();
        const filename = `${safeKundenNr} - ${safeFirma} - ${safeSupplier} - ${dateStr}.pdf`;

        return { pdf, filename, dateStr };
    } finally {
        printArea.style.left = '-9999px';
        printArea.style.top = 'auto';
        printArea.style.zIndex = 'auto';
    }
}

async function downloadPosElavonPdfOnly() {
    try {
        const docInfo = await generatePosElavonPdfDoc();
        if (!docInfo) return;
        docInfo.pdf.save(docInfo.filename);
    } catch (e) {
        console.error('POS PDF oluşturma hatası:', e);
        alert('PDF oluşturulurken hata oluştu: ' + (e.message || e));
    }
}

function buildPosElavonTicketContent(d) {
    const lines = [
        `POS Cihazı Talebi`,
        `Tedarikçi: ${d.supplier || '-'}`,
        d.model ? `Model: ${d.model}` : null,
        `----------------------------------------`,
        `Name vom Geschäft: ${d.firma || '-'}`,
        `Straße: ${d.strasse || '-'}`,
        `PLZ, Ort: ${d.plzOrt || '-'}`,
        `Inhaber: ${d.inhaber || '-'}`,
        `E-Mail: ${d.email || '-'}`,
        `Telefon: ${d.telefon || '-'}`,
        `Rechtsform: ${d.rechtsform || '-'}`,
        `Steuer Nr.: ${d.steuerNr || '-'}`,
        `Miete: ${d.miete || '0'}`,
        `Transaktionspreis inkl. Clearing: ${d.transaktionspreis || '-'}`,
        `SIM Karte: ${d.simKarte || 'Nein'}`,
        `Master/Visa Credit: ${d.masterVisaCredit || '-'}`,
        `Master/Visa Debit: ${d.masterVisaDebit || '-'}`,
        `Maestro/Vpay: ${d.maestroVpay || '-'}`,
        `Non EWR Karten / Business Cards: ${d.nonEwr || '-'}`,
        `Diners/JCB/CUP: ${d.diners || '-'}`,
        `DCC: ${d.dcc || '-'}`,
        `Laufzeit: ${d.laufzeit || '-'}`,
        `Sonderkündigungsrecht: ${d.sonderkuendigung || '-'}`,
        `Admin Fee (monatlich): ${d.adminFee || '0'}`,
        `PEC: ${d.pec || '43886'}`,
        `Lieferadresse: ${d.lieferadresse || '-'}`,
        `Bemerkung: ${d.bemerkung || '-'}`
    ];
    return lines.filter(l => l !== null).join('\n');
}

async function createNewPosTicket() {
    const d = collectPosElavonFormData();

    if (!d.kKunde || !d.supplier) {
        alert("Lütfen müşteri ve tedarikçi seçiniz.");
        return;
    }

    const kundeName = d.firma || 'Bilinmiyor';
    const cTitel = d.model ? `POS: [${d.supplier}] [${d.model}] ${kundeName}` : `POS: [${d.supplier}] ${kundeName}`;
    const cInhalt = buildPosElavonTicketContent(d);
    const kBenutzer = posConfig.pos_user_id || 1;

    try {
        // 1. Generate A4 PDF and download it
        const docInfo = await generatePosElavonPdfDoc(d);
        let pdfBlob = null;
        let pdfFilename = 'POS_Form.pdf';
        if (docInfo && docInfo.pdf) {
            pdfFilename = docInfo.filename;
            docInfo.pdf.save(pdfFilename);
            pdfBlob = docInfo.pdf.output('blob');
        }

        // 2. Create ticket with PDF attached via multipart/form-data
        const formData = new FormData();
        formData.append('kKunde', parseInt(d.kKunde));
        formData.append('cTitel', cTitel);
        formData.append('cInhalt', cInhalt);
        formData.append('kBenutzer', kBenutzer);
        formData.append('kBenutzer_Bearbeiter', kBenutzer);
        formData.append('nPrioritaet', 2);
        if (pdfBlob) {
            formData.append('file', pdfBlob, pdfFilename);
        }

        const res = await fetch('/api/tickets', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const respData = await res.json();
            const newTicketId = respData.kTicket;
            
            // Set the pos status explicitly
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
            alert('Hata: ' + (err.error || 'Ticket oluşturulamadı'));
        }
    } catch(e) {
        console.error(e);
        alert('Hata: ' + e.message);
    }
}
