let elsterRecords = [];
let elsterStatuses = [];
let elsterAutoRefreshTimer = null;
let elsterGroupExpandedStates = new Set();

function toggleElsterGroup(statusId, event) {
    const tbody = event.currentTarget.closest('tbody');
    if (tbody.classList.contains('collapsed')) {
        tbody.classList.remove('collapsed');
        elsterGroupExpandedStates.add(Number(statusId));
    } else {
        tbody.classList.add('collapsed');
        elsterGroupExpandedStates.delete(Number(statusId));
    }
    updateToggleAllBtnState();
}

function updateToggleAllBtnState() {
    const btn = document.getElementById('elsterToggleAllBtn');
    if (btn) {
        const isAllExpanded = elsterStatuses.length > 0 && elsterGroupExpandedStates.size >= elsterStatuses.length;
        btn.textContent = isAllExpanded ? 'Tümünü Kapat' : 'Tümünü Aç';
    }
}

function toggleAllElsterGroups() {
    const isAllExpanded = elsterGroupExpandedStates.size >= elsterStatuses.length;
    if (isAllExpanded) {
        elsterGroupExpandedStates.clear();
    } else {
        elsterStatuses.forEach(s => elsterGroupExpandedStates.add(Number(s.id)));
    }
    renderElsterList();
}

function formatElsterDateTime(value) {
    if (!value) return '—';

    try {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return String(value);
        }

        return parsed.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return String(value);
    }
}

async function fetchElsterStatuses() {
    try {
        const res = await fetch('/api/elster-statuses');
        if (!res.ok) {
            throw new Error('Durumlar alınamadı');
        }
        elsterStatuses = await res.json();
        renderElsterStatusManager();
        populateElsterStatusSelect();
    } catch (error) {
        console.error('ELSTER status fetch failed:', error);
    }
}

async function ensureElsterCustomersLoaded() {
    if (typeof ensureTicketCustomersLoaded === 'function') {
        return ensureTicketCustomersLoaded();
    }
    return Promise.resolve();
}

async function fetchElsterRecords() {
    try {
        const res = await fetch('/api/elster-records');
        if (!res.ok) {
            throw new Error('Kayıtlar alınamadı');
        }
        elsterRecords = await res.json();
        renderElsterList();
    } catch (error) {
        console.error('ELSTER records fetch failed:', error);
    }
}

async function refreshElsterData() {
    await Promise.all([fetchElsterStatuses(), fetchElsterRecords()]);
    await ensureElsterCustomersLoaded();
    updateElsterCustomerOptions();
}

async function initElsterTab() {
    if (elsterAutoRefreshTimer) {
        clearInterval(elsterAutoRefreshTimer);
        elsterAutoRefreshTimer = null;
    }

    await ensureElsterCustomersLoaded();
    await refreshElsterData();

    elsterAutoRefreshTimer = setInterval(async () => {
        if (currentTab !== 'elster') return;
        
        const openPanels = document.querySelectorAll('.elster-card[open]');
        if (openPanels.length > 0) return;

        await refreshElsterData();
    }, 5000);
}

function populateElsterStatusSelect() {
    const select = document.getElementById('elsterStatusSelect');
    if (!select) return;

    const statuses = [...(Array.isArray(elsterStatuses) ? elsterStatuses : [])]
        .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || (Number(a.id) - Number(b.id)));

    if (statuses.length === 0) {
        select.innerHTML = '<option value="">Durum yok</option>';
        select.disabled = true;
        return;
    }

    select.disabled = false;
    select.innerHTML = statuses.map(status => `<option value="${status.id}" style="color: ${status.color}; font-weight: 600;">${status.name}</option>`).join('');
}

function renderElsterStatusManager() {
    const manager = document.getElementById('elsterStatusManager');
    if (!manager) return;

    if (!Array.isArray(elsterStatuses) || elsterStatuses.length === 0) {
        manager.innerHTML = '<div class="elster-state-empty">Durum tanımı bulunamadı.</div>';
        return;
    }

    manager.innerHTML = elsterStatuses
        .slice()
        .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || (Number(a.id) - Number(b.id)))
        .map((status, idx) => `
            <div class="elster-status-row">
                <input type="text" class="form-ctrl" data-status-id="${status.id}" data-status-field="name" value="${(status.name || '').replace(/"/g, '&quot;')}" placeholder="Durum adı...">
                <input type="color" class="form-ctrl" data-status-id="${status.id}" data-status-field="color" value="${status.color || '#607d8b'}">
                <button class="btn-s secondary" onclick="removeElsterStatus(${status.id})">Sil</button>
            </div>
        `)
        .join('');
}

function addElsterStatusRow() {
    const nextId = Date.now();
    const nextOrder = (elsterStatuses.length || 0) + 1;
    elsterStatuses.push({
        id: nextId,
        name: `Durum ${nextOrder}`,
        color: '#607d8b',
        order: nextOrder
    });
    renderElsterStatusManager();
}

function removeElsterStatus(id) {
    if (!confirm('Bu durumu silmek istediğinize emin misiniz?')) return;
    elsterStatuses = elsterStatuses.filter(status => Number(status.id) !== Number(id));
    renderElsterStatusManager();
}

async function saveElsterStatuses() {
    const rows = [...document.querySelectorAll('[data-status-field]')];
    const mapped = [];
    rows.forEach((rowInput) => {
        const id = Number(rowInput.dataset.statusId);
        const field = rowInput.dataset.statusField;
        let existing = mapped.find(item => Number(item.id) === id);
        if (!existing) {
            existing = { id: id, name: '', color: '#607d8b', order: mapped.length + 1 };
            mapped.push(existing);
        }
        if (field === 'name') existing.name = rowInput.value.trim() || `Durum ${existing.order}`;
        if (field === 'color') existing.color = rowInput.value;
    });

    const payload = mapped
        .map((item, index) => ({
            id: Number(item.id),
            name: item.name || `Durum ${index + 1}`,
            color: item.color || '#607d8b',
            order: index + 1
        }));

    try {
        const res = await fetch('/api/elster-statuses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statuses: payload })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Durum kaydedilemedi');
        }
        await fetchElsterStatuses();
        await fetchElsterRecords();
        alert('Durum ayarları kaydedildi.');
    } catch (error) {
        console.error('ELSTER status save failed:', error);
        alert(error.message || 'Durum kaydedilemedi.');
    }
}

function updateElsterCustomerOptions() {
    const filter = document.getElementById('elsterCustomerSearch')?.value || '';
    const select = document.getElementById('elsterCustomerSelect');
    const countLabel = document.getElementById('elsterCustomerCount');
    if (!select) return;

    const customers = getTicketCustomers(filter);
    let options = '<option value="">-- Müşteri Seçin --</option>';

    if (customers.length === 0) {
        options += '<option value="" disabled>Sonuç bulunamadı</option>';
    } else {
        customers.forEach((customer, idx) => {
            const label = `${customer.KundenNr || ''} - ${customer.Firma || customer.InhabeName || 'Bilinmeyen'}`;
            const selected = idx === 0 ? ' selected' : '';
            options += `<option value="${customer.kKunde}"${selected}>${label}</option>`;
        });
    }

    select.innerHTML = options;
    if (customers.length > 0) {
        select.value = String(customers[0].kKunde);
    } else {
        select.value = '';
    }

    if (countLabel) {
        countLabel.textContent = customers.length;
    }
}

async function addElsterRecord() {
    const kKunde = document.getElementById('elsterCustomerSelect')?.value;
    const kStatus = document.getElementById('elsterStatusSelect')?.value;

    if (!kKunde || !kStatus) {
        alert('Lütfen müşteri ve durum seçin.');
        return;
    }

    const ticketUserJson = localStorage.getItem('ticketUser');
    const user = ticketUserJson ? JSON.parse(ticketUserJson) : null;
    const userName = user ? (user.cName || user.cLogin || 'Bilinmiyor') : 'Bilinmiyor';

    try {
        const res = await fetch('/api/elster-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kKunde: Number(kKunde),
                kStatus: Number(kStatus),
                userName: userName
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Kayıt eklenemedi.');
        }

        await fetchElsterRecords();
        await fetchElsterStatuses();
        updateElsterCustomerOptions();
        alert('ELSTER kaydı başarıyla eklendi.');
    } catch (error) {
        console.error('ELSTER add failed:', error);
        alert(error.message || 'ELSTER kaydı eklenemedi.');
    }
}

async function updateElsterRecordStatus(id, value) {
    const ticketUserJson = localStorage.getItem('ticketUser');
    const user = ticketUserJson ? JSON.parse(ticketUserJson) : null;
    const userName = user ? (user.cName || user.cLogin || 'Bilinmiyor') : 'Bilinmiyor';

    try {
        const res = await fetch(`/api/elster-records/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kStatus: Number(value), userName: userName })
        });
        if (!res.ok) {
            throw new Error('Durum güncellenemedi');
        }
        await fetchElsterRecords();
    } catch (error) {
        console.error('ELSTER status update failed:', error);
        alert('Durum güncellenemedi.');
    }
}

function renderElsterList() {
    const container = document.getElementById('elsterListContainer');
    if (!container) return;

    if (!Array.isArray(elsterRecords) || elsterRecords.length === 0) {
        container.innerHTML = '<div class="elster-state-empty">Henüz ELSTER kaydı yok.</div>';
        return;
    }

    const statusOrder = [...elsterStatuses]
        .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || (Number(a.id) - Number(b.id)));

    const groupedHtml = statusOrder.map((status) => {
        const groupRecords = elsterRecords.filter(record => Number(record.kStatus) === Number(status.id));
        const headerCount = groupRecords.length;
        const statusColor = status.color || '#607d8b';

        const rowsHtml = groupRecords.length > 0
            ? groupRecords.map(record => {
                const selectOptions = statusOrder.map((option) => {
                    const selected = Number(record.kStatus) === Number(option.id) ? ' selected' : '';
                    return `<option value="${option.id}"${selected} style="color: ${option.color}; font-weight: 600;">${option.name}</option>`;
                }).join('');

                return `
                    <tr>
                        <td>${record.customerText || record.Firma || 'Bilinmeyen müşteri'}</td>
                        <td>
                            <select class="form-ctrl" onchange="updateElsterRecordStatus(${record.id}, this.value)">
                                ${selectOptions}
                            </select>
                        </td>
                        <td>
                            ${formatElsterDateTime(record.dAenderung)}
                            <span style="color:var(--text-muted); font-weight:600; margin-left:12px;">${(record.userName || 'Bilinmiyor').trim().split(' ')[0]}</span>
                        </td>
                    </tr>
                `;
            }).join('')
            : '<tr><td colspan="3" class="elster-state-empty" style="border-bottom:none;">Bu durumda kayıt bulunmuyor.</td></tr>';

        const isExpanded = elsterGroupExpandedStates.has(Number(status.id));
        const collapsedClass = isExpanded ? '' : 'collapsed';

        return `
            <tbody class="elster-group-body ${collapsedClass}" style="--status-color:${statusColor};">
                <tr class="elster-group-header-row" onclick="toggleElsterGroup(${status.id}, event)" style="cursor: pointer; user-select: none;">
                    <td colspan="3" style="padding:0; border:none;">
                        <div class="elster-group-header">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span class="group-chevron">▼</span>
                                <span>${status.name}</span>
                            </div>
                            <span>${headerCount} kayıt</span>
                        </div>
                    </td>
                </tr>
                ${rowsHtml}
            </tbody>
        `;
    }).join('');

    container.innerHTML = `
        <table class="elster-table">
            <thead>
                <tr>
                    <th>Müşteri Bilgisi</th>
                    <th>Durum</th>
                    <th>Son Kayıt / Değişiklik</th>
                </tr>
            </thead>
            ${groupedHtml}
        </table>
    `;
    updateToggleAllBtnState();
}
