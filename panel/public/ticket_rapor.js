// Ticket Rapor (Ekip Hareket & Süre Analizi) Script
let ticketRaporData = [];
let ticketRaporUsers = [];
let ticketRaporPeriod = 'all';

// Sorting & Column Filtering state
let trSortField = 'lastActionDate';
let trSortOrder = 'desc'; // 'asc' or 'desc'
const trColFilters = {
    cEindeutigeId: '',
    cTitelErsteNachricht: '',
    Firma: '',
    personName: '',
    statusText: ''
};

function getShortName(user) {
    if (!user) return 'Bilinmeyen';
    const source = user.cName || user.cLogin || '';
    const trimmed = String(source).trim();
    if (!trimmed) return 'Kullanıcı #' + (user.kBenutzer || '');
    return trimmed.split(/\s+/)[0] || trimmed;
}

async function initTicketRaporTab() {
    await fetchTicketRaporUsers();
    setupTicketRaporDateDefaults();
    await loadTicketRaporData();
}

async function fetchTicketRaporUsers() {
    if (ticketRaporUsers.length > 0) return;
    try {
        const res = await fetch('/api/ticket-users');
        if (res.ok) {
            ticketRaporUsers = await res.json();
            populateTicketRaporUserSelect();
        }
    } catch (e) {
        console.warn('Ticket users could not be loaded for report:', e);
    }
}

function populateTicketRaporUserSelect() {
    const sel = document.getElementById('trUserFilter');
    const colSel = document.getElementById('trColFilterUser');

    let html = '<option value="">👥 Tüm Ekip (Tüm Kullanıcılar)</option>';
    let colHtml = '<option value="">Tümü</option>';

    ticketRaporUsers.forEach(u => {
        const dName = getShortName(u);
        const fullName = u.cName ? `${dName} (${u.cName})` : dName;
        html += `<option value="${u.kBenutzer}">${fullName}</option>`;
        colHtml += `<option value="${dName}">${dName}</option>`;
    });

    if (sel) sel.innerHTML = html;
    if (colSel) colSel.innerHTML = colHtml;
}

function setupTicketRaporDateDefaults() {
    setTicketRaporPeriod('all');
}

function setTicketRaporPeriod(period) {
    ticketRaporPeriod = period;
    document.querySelectorAll('.tr-period-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-period') === period);
    });

    const customWrap = document.getElementById('trCustomDateWrap');
    if (customWrap) {
        customWrap.style.display = (period === 'custom') ? 'flex' : 'none';
    }

    const fromInp = document.getElementById('trDateFrom');
    const toInp = document.getElementById('trDateTo');
    const today = new Date();

    const formatDate = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    if (period === 'today') {
        const s = formatDate(today);
        if (fromInp) fromInp.value = s;
        if (toInp) toInp.value = s;
    } else if (period === 'week') {
        const d = new Date(today);
        const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon = 0
        d.setDate(d.getDate() - dayOfWeek);
        if (fromInp) fromInp.value = formatDate(d);
        if (toInp) toInp.value = formatDate(today);
    } else if (period === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        if (fromInp) fromInp.value = formatDate(firstDay);
        if (toInp) toInp.value = formatDate(today);
    } else if (period === 'last_month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        if (fromInp) fromInp.value = formatDate(firstDay);
        if (toInp) toInp.value = formatDate(lastDay);
    } else if (period === 'year') {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        if (fromInp) fromInp.value = formatDate(firstDay);
        if (toInp) toInp.value = formatDate(today);
    } else if (period === 'all') {
        if (fromInp) fromInp.value = '';
        if (toInp) toInp.value = '';
    }

    if (period !== 'custom') {
        loadTicketRaporData();
    }
}

async function loadTicketRaporData() {
    const tbody = document.getElementById('ticketRaporTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted);"><span class="spinner" style="display:inline-block; margin-right:8px;">⏳</span> Bilet hareketleri yükleniyor...</td></tr>`;
    }

    const q = (document.getElementById('trSearchInput')?.value || '').trim();
    const user = document.getElementById('trUserFilter')?.value || '';
    const status = document.getElementById('trStatusFilter')?.value || '';
    const dateFrom = document.getElementById('trDateFrom')?.value || '';
    const dateTo = document.getElementById('trDateTo')?.value || '';

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (user) params.set('kBenutzer', user);
    if (status) params.set('kStatus', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    params.set('limit', '250');

    try {
        const res = await fetch(`/api/ticket-reports/list?${params.toString()}`);
        if (!res.ok) throw new Error('Veriler alınamadı: ' + res.statusText);
        ticketRaporData = await res.json();
        renderTicketRaporTable();
    } catch (e) {
        console.error('Report fetch error:', e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; color:#ef5350;">Hata: ${e.message}</td></tr>`;
        }
    }
}

function calculateDuration(startIso, endIso, isResolved) {
    if (!startIso) return { text: 'Belirsiz', minutes: 0, isResolved: false, isOverdue: false };
    const start = new Date(startIso);
    const end = (isResolved && endIso) ? new Date(endIso) : new Date();
    
    let diffMs = end - start;
    if (diffMs < 0) diffMs = 0;

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const remMinutes = totalMinutes % 60;

    let text = '';
    if (days > 0) {
        text = `${days}g ${remHours}sa`;
    } else if (hours > 0) {
        text = `${hours}sa ${remMinutes}dk`;
    } else {
        text = `${remMinutes} dk`;
    }

    return {
        text,
        minutes: totalMinutes,
        isResolved,
        days,
        hours
    };
}

function formatReportDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
           d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Column Filter Handler
function onTicketRaporColFilter(colKey, value) {
    trColFilters[colKey] = (value || '').trim().toLowerCase();
    renderTicketRaporTable();
}

// Column Sort Handler
function sortTicketRapor(field) {
    if (trSortField === field) {
        trSortOrder = (trSortOrder === 'asc') ? 'desc' : 'asc';
    } else {
        trSortField = field;
        trSortOrder = (field === 'durationMinutes' || field === 'dErstellung' || field === 'lastActionDate') ? 'desc' : 'asc';
    }
    updateSortIcons();
    renderTicketRaporTable();
}

function updateSortIcons() {
    document.querySelectorAll('.tr-sort-th').forEach(th => th.classList.remove('active-sort'));
    document.querySelectorAll('.tr-sort-icon').forEach(icon => {
        icon.textContent = '⇅';
    });

    const activeIcon = document.getElementById(`sortIcon_${trSortField}`);
    if (activeIcon) {
        activeIcon.parentElement?.classList.add('active-sort');
        activeIcon.textContent = (trSortOrder === 'asc') ? '▲' : '▼';
    }
}

function formatTotalDurationString(totalMinutes) {
    if (!totalMinutes || totalMinutes <= 0) return '0 dk';
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    const remMinutes = totalMinutes % 60;

    if (days > 0) {
        return `${days} gün ${remHours} sa`;
    } else if (totalHours > 0) {
        return `${totalHours} sa ${remMinutes} dk`;
    } else {
        return `${remMinutes} dk`;
    }
}

function renderTicketRaporTable() {
    const tbody = document.getElementById('ticketRaporTableBody');
    const countBadge = document.getElementById('trCountBadge');
    const totalCountEl = document.getElementById('trTotalCount');
    const resolvedCountEl = document.getElementById('trResolvedCount');
    const avgDurationEl = document.getElementById('trAvgDuration');
    const totalDurationEl = document.getElementById('trTotalDuration');

    if (!tbody) return;

    if (!ticketRaporData || ticketRaporData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted); font-size:1.05rem;">🔍 Aradığınız kriterlere uygun bilet hareketi bulunamadı.</td></tr>`;
        if (countBadge) countBadge.textContent = '0';
        if (totalCountEl) totalCountEl.textContent = '0';
        if (resolvedCountEl) resolvedCountEl.textContent = '0';
        if (avgDurationEl) avgDurationEl.textContent = '-';
        if (totalDurationEl) totalDurationEl.textContent = '-';
        return;
    }

    // Precompute enriched properties for sorting and column filtering
    const enrichedList = ticketRaporData.map(t => {
        const isResolved = (t.kStatus == 3 || t.kStatus == 4);
        const isPending = (t.kStatus == 2);
        const startIso = t.dErstellung || t.dAenderung;
        const endIso = t.dLoesung || t.dAenderung;
        const dur = calculateDuration(startIso, endIso, isResolved);

        const personId = t.kBenutzer_Letzter || t.kBenutzer_Bearbeiter || t.kBenutzer_Ersteller;
        const personObj = ticketRaporUsers.find(u => String(u.kBenutzer) === String(personId));
        const personName = personObj ? getShortName(personObj) : (personId ? 'Personel #' + personId : 'Ekip');

        const lastActionDateIso = t.dLetzteNachricht || t.dAenderung || t.dLoesung || t.dErstellung;

        let statusText = 'Açık';
        if (isResolved) statusText = 'Çözüldü';
        else if (isPending) statusText = 'Beklemede';

        return {
            ...t,
            isResolved,
            isPending,
            durationObj: dur,
            durationMinutes: dur.minutes,
            personName,
            statusText,
            lastActionDate: lastActionDateIso,
            titleAndNote: ((t.cTitelErsteNachricht || '') + ' ' + (t.cLetzteNachrichtInhalt || '')).toLowerCase(),
            firmaCombined: ((t.Firma || '') + ' ' + (t.KundenNr || '')).toLowerCase()
        };
    });

    // Apply Column Filters
    const filteredList = enrichedList.filter(item => {
        if (trColFilters.cEindeutigeId) {
            const ticketIdStr = String(item.cEindeutigeId || ('TKT-' + item.kTicket)).toLowerCase();
            if (!ticketIdStr.includes(trColFilters.cEindeutigeId)) return false;
        }
        if (trColFilters.cTitelErsteNachricht) {
            if (!item.titleAndNote.includes(trColFilters.cTitelErsteNachricht)) return false;
        }
        if (trColFilters.Firma) {
            if (!item.firmaCombined.includes(trColFilters.Firma)) return false;
        }
        if (trColFilters.personName) {
            if (item.personName.toLowerCase() !== trColFilters.personName) return false;
        }
        if (trColFilters.statusText) {
            if (item.statusText.toLowerCase() !== trColFilters.statusText) return false;
        }
        return true;
    });

    // KPI Metrics calculation based on filteredList
    let resolvedCount = 0;
    let resolvedMinutesSum = 0;
    let totalAllMinutesSum = 0;

    filteredList.forEach(item => {
        totalAllMinutesSum += (item.durationMinutes || 0);
        if (item.isResolved) {
            resolvedCount++;
            resolvedMinutesSum += item.durationMinutes;
        }
    });

    if (countBadge) countBadge.textContent = filteredList.length;
    if (totalCountEl) totalCountEl.textContent = filteredList.length;
    if (resolvedCountEl) resolvedCountEl.textContent = resolvedCount;

    if (avgDurationEl) {
        if (resolvedCount > 0) {
            const avgMin = Math.round(resolvedMinutesSum / resolvedCount);
            avgDurationEl.textContent = formatTotalDurationString(avgMin);
        } else {
            avgDurationEl.textContent = '-';
        }
    }

    if (totalDurationEl) {
        totalDurationEl.textContent = formatTotalDurationString(totalAllMinutesSum);
    }

    // Apply Sorting
    filteredList.sort((a, b) => {
        let valA = a[trSortField];
        let valB = b[trSortField];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        let cmp = 0;
        if (valA < valB) cmp = -1;
        else if (valA > valB) cmp = 1;

        return (trSortOrder === 'asc') ? cmp : -cmp;
    });

    if (filteredList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted); font-size:1.05rem;">🔍 Sütun filtrelerine uygun bilet bulunamadı.</td></tr>`;
        return;
    }

    // Find max duration in current view for relative progress comparison bars
    let maxMinutes = 60;
    filteredList.forEach(item => {
        if (item.durationMinutes > maxMinutes) maxMinutes = item.durationMinutes;
    });

    let html = '';
    filteredList.forEach(t => {
        const dur = t.durationObj;

        // Status badge
        let statusBadge = '<span class="tr-badge open">Açık</span>';
        if (t.isResolved) statusBadge = '<span class="tr-badge resolved">Çözüldü</span>';
        else if (t.isPending) statusBadge = '<span class="tr-badge pending">Beklemede</span>';

        // Customer
        const custNr = t.KundenNr || '-';
        const firma = t.Firma || 'Müşteri Kaydı Yok';
        const custDisplay = `<div style="font-weight:600; color:var(--text-color);">${firma}</div><div style="font-size:0.8rem; color:var(--text-muted);">No: ${custNr}</div>`;

        // Title & last note
        const title = t.cTitelErsteNachricht || t.cLetzteNachrichtTitel || 'Başlıksız Bilet';
        const snippet = t.cLetzteNachrichtInhalt ? (t.cLetzteNachrichtInhalt.length > 70 ? t.cLetzteNachrichtInhalt.substring(0, 70) + '...' : t.cLetzteNachrichtInhalt) : '';

        // Dates
        const createDateStr = formatReportDateTime(t.dErstellung);
        const lastActionStr = formatReportDateTime(t.lastActionDate);

        // Relative progress bar for duration comparison (0% to 100%)
        const barPct = Math.min(100, Math.max(5, Math.round((dur.minutes / maxMinutes) * 100)));
        const barColor = t.isResolved ? '#66bb6a' : (dur.days > 2 ? '#ef5350' : '#ffa726');
        const durBadgeClass = t.isResolved ? 'dur-resolved' : (dur.days > 2 ? 'dur-overdue' : 'dur-open');

        html += `
            <tr class="tr-row" onclick="openTicketFromReport(${t.kTicket})" title="Bileti Ticket ekranında açmak için tıklayın">
                <td style="white-space:nowrap;">
                    <span class="tr-ticket-id">${t.cEindeutigeId || ('TKT-' + t.kTicket)}</span>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${t.nAnzahlNachrichten || 1} mesaj</div>
                </td>
                <td style="min-width:180px; max-width:260px;">
                    <div style="font-weight:600; color:var(--primary-color); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${title}">${title}</div>
                    ${snippet ? `<div style="font-size:0.8rem; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; margin-top:2px;" title="${snippet}">${snippet}</div>` : ''}
                </td>
                <td style="min-width:160px; max-width:220px;">
                    ${custDisplay}
                </td>
                <td style="white-space:nowrap;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="tr-avatar">${t.personName.charAt(0).toUpperCase()}</span>
                        <span style="font-weight:600;">${t.personName}</span>
                    </div>
                </td>
                <td style="white-space:nowrap; font-size:0.85rem; color:var(--text-muted);">
                    <div>${createDateStr}</div>
                </td>
                <td style="white-space:nowrap; font-size:0.85rem; color:var(--text-color);">
                    <div>${lastActionStr}</div>
                </td>
                <td style="min-width:160px; max-width:210px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
                        <span class="tr-dur-badge ${durBadgeClass}">⏱️ ${dur.text}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted);">${t.isResolved ? 'Çözüm' : 'Açık'}</span>
                    </div>
                    <div class="tr-bar-bg" title="Kıyaslama: Toplam ${dur.text}">
                        <div class="tr-bar-fill" style="width:${barPct}%; background:${barColor};"></div>
                    </div>
                </td>
                <td style="white-space:nowrap; text-align:center;">
                    ${statusBadge}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateSortIcons();
}

function openTicketFromReport(ticketId) {
    if (!ticketId) return;
    if (typeof switchTab === 'function') {
        switchTab('tickets');
        setTimeout(() => {
            if (typeof selectTicket === 'function') {
                selectTicket(ticketId);
            }
        }, 150);
    }
}