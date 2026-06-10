let ticketsData = [];
let ticketUsers = [];
let currentTicketId = null;

async function initTicketsTab() {
    await fetchTicketUsers();
    await fetchTickets();
}

async function fetchTicketUsers() {
    try {
        const res = await fetch('/api/ticket-users');
        if (res.ok) {
            ticketUsers = await res.json();
        }
    } catch (e) {
        console.error("Error fetching ticket users:", e);
    }
}

async function fetchTickets() {
    try {
        const res = await fetch('/api/tickets');
        if (res.ok) {
            ticketsData = await res.json();
            filterTicketsList();
        }
    } catch (e) {
        console.error("Error fetching tickets:", e);
    }
}

function filterTicketsList() {
    const searchVal = document.getElementById('ticketSearchInput').value.toLowerCase();
    const statusVal = document.getElementById('ticketStatusFilter').value;

    const filtered = ticketsData.filter(t => {
        const matchSearch = (t.cEindeutigeId && t.cEindeutigeId.toLowerCase().includes(searchVal)) ||
                            (t.Firma && t.Firma.toLowerCase().includes(searchVal)) ||
                            (t.cTitelErsteNachricht && t.cTitelErsteNachricht.toLowerCase().includes(searchVal));
        
        const matchStatus = statusVal === "" || String(t.kStatus) === statusVal;
        return matchSearch && matchStatus;
    });

    renderTicketsList(filtered);
}

function renderTicketsList(data) {
    const container = document.getElementById('ticketsListContainer');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:20px;">Kayıt bulunamadı.</div>';
        return;
    }

    data.forEach(t => {
        const div = document.createElement('div');
        div.className = 'ticket-list-item';
        if (t.kTicket === currentTicketId) {
            div.classList.add('active');
        }
        
        div.onclick = () => selectTicket(t.kTicket);

        let statusClass = 'status-open';
        let statusText = 'Açık';
        if (t.kStatus == 2) { statusClass = 'status-pending'; statusText = 'Beklemede'; }
        else if (t.kStatus == 3) { statusClass = 'status-resolved'; statusText = 'Çözüldü'; }

        // Format Date
        let dateStr = '';
        if (t.dAenderung) {
            const d = new Date(t.dAenderung);
            dateStr = d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});
        }

        const title = t.cTitelErsteNachricht || 'Başlıksız Bilet';
        const customerName = t.KundenNr ? `${t.KundenNr} - ${t.Firma || ''}` : (t.Firma || 'Bilinmeyen Müşteri');

        div.innerHTML = `
            <div class="ticket-item-header">
                <span class="ticket-item-id">${t.cEindeutigeId || ('TKT-'+t.kTicket)}</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="ticket-item-title" title="${title}">${title}</div>
            <div class="ticket-item-meta">
                <span>👤 ${customerName}</span>
                <span>🕒 ${dateStr}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

async function selectTicket(id) {
    currentTicketId = id;
    filterTicketsList(); // Update active state

    const pane = document.getElementById('ticketDetailPane');
    pane.innerHTML = '<div class="empty-state">Yükleniyor...</div>';

    try {
        const res = await fetch(`/api/tickets/${id}`);
        if (!res.ok) throw new Error('Bilet getirilemedi');
        const data = await res.json();
        renderTicketChat(data);
    } catch (e) {
        pane.innerHTML = `<div class="empty-state" style="color:#ef5350;">Hata: ${e.message}</div>`;
    }
}

function renderTicketChat(data) {
    const pane = document.getElementById('ticketDetailPane');
    
    // Header
    const customerStr = data.KundenNr ? `${data.KundenNr} - ${data.Firma}` : (data.Firma || 'Bilinmeyen');
    const headerHtml = `
        <div class="ticket-detail-header">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h2 class="ticket-detail-title" style="margin:0;">${data.cEindeutigeId || ('TKT-'+data.kTicket)}</h2>
                <div style="display:flex; gap: 8px;">
                    ${data.kStatus == 1 ? `<button class="btn-s warning" onclick="changeTicketStatus(${data.kTicket}, 2)">⏳ Beklemeye Al</button>` : ''}
                    ${data.kStatus == 2 ? `<button class="btn-s success" onclick="changeTicketStatus(${data.kTicket}, 1)">🟢 Yeniden Aç</button>` : ''}
                    ${data.kStatus != 3 ? `<button class="btn-s secondary" onclick="changeTicketStatus(${data.kTicket}, 3)">❌ Kapat</button>` : `<span style="color:#4caf50;font-weight:bold;">✅ Kapalı</span>`}
                </div>
            </div>
            <div class="ticket-detail-info">
                <span><strong>Müşteri:</strong> ${customerStr}</span>
                <span><strong>Durum:</strong> ${data.kStatus == 1 ? 'Açık' : (data.kStatus == 2 ? 'Beklemede' : 'Çözüldü')}</span>
            </div>
        </div>
    `;

    // Messages
    let messagesHtml = '<div class="chat-container" id="ticketChatContainer">';
    if (data.messages && data.messages.length > 0) {
        data.messages.forEach(m => {
            const isOutgoing = m.nRichtung == 0; // Assuming 0 is outgoing (Agent to Cust)
            const msgClass = isOutgoing ? 'outgoing' : 'incoming';
            
            // Find User Name
            let senderName = 'Müşteri';
            if (isOutgoing) {
                const user = ticketUsers.find(u => u.kBenutzer == m.kBenutzer_Ersteller);
                senderName = user ? (user.cName || user.cLogin) : ('Agent ' + (m.kBenutzer_Ersteller||''));
            }

            let dateStr = '';
            if (m.dErstellung) {
                const d = new Date(m.dErstellung);
                dateStr = d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});
            }

            const content = m.cInhalt ? m.cInhalt.replace(/\n/g, '<br>') : '';

            messagesHtml += `
                <div class="chat-message ${msgClass}">
                    <div class="chat-bubble">${content}</div>
                    <div class="chat-meta">
                        <span class="chat-sender">${senderName}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            `;
        });
    } else {
        messagesHtml += '<div style="text-align:center;color:var(--text-muted);margin-top:20px;">Henüz mesaj yok.</div>';
    }
    messagesHtml += '</div>';

    // Reply Box
    let userOptions = ticketUsers.map(u => `<option value="${u.kBenutzer}">${u.cName || u.cLogin}</option>`).join('');
    const replyHtml = `
        <div class="reply-area">
            <textarea id="replyContent" class="reply-textarea" placeholder="Yanıtınızı buraya yazın..."></textarea>
            <div class="reply-actions">
                <div style="display:flex; align-items:center; gap:10px;">
                    <label style="color:var(--text-muted);font-size:0.9rem;">Gönderen:</label>
                    <select id="replyUserSelect" class="form-ctrl">${userOptions}</select>
                </div>
                <button class="btn-s success" onclick="submitTicketReply(${data.kTicket})">Gönder 📤</button>
            </div>
        </div>
    `;

    pane.innerHTML = headerHtml + messagesHtml + replyHtml;

    // Scroll chat to bottom
    const chatContainer = document.getElementById('ticketChatContainer');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function changeTicketStatus(id, newStatus) {
    const statusNames = {1: "Açık", 2: "Beklemede", 3: "Kapalı"};
    const promptMsg = newStatus == 3 ? "Bu bileti kapatmak istediğinize emin misiniz?" : 
                      `Bilet durumunu '${statusNames[newStatus]}' olarak değiştirmek istediğinize emin misiniz?`;
                      
    if (!confirm(promptMsg)) return;
    
    // Try to get current user from dropdown, default to 1
    const userSelect = document.getElementById('replyUserSelect');
    const kBenutzer = userSelect ? parseInt(userSelect.value) : 1;
    
    try {
        const res = await fetch(`/api/tickets/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kStatus: newStatus, kBenutzer: kBenutzer })
        });

        if (res.ok) {
            await fetchTickets(); // Refresh list to update status
            selectTicket(id); // Refresh chat to show closed status
        } else {
            const err = await res.json();
            alert("Hata: " + (err.error || "Bilinmeyen hata"));
        }
    } catch (e) {
        console.error("Hata:", e);
        alert("Bilet durumu değiştirilemedi.");
    }
}

async function submitTicketReply(ticketId) {
    const content = document.getElementById('replyContent').value.trim();
    const userId = document.getElementById('replyUserSelect').value;

    if (!content) {
        alert("Lütfen bir mesaj yazın.");
        return;
    }

    try {
        const res = await fetch(`/api/tickets/${ticketId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cInhalt: content,
                kBenutzer: userId
            })
        });

        if (res.ok) {
            await fetchTickets(); // Refresh list to update modified date
            selectTicket(ticketId); // Refresh chat
        } else {
            const err = await res.json();
            alert("Hata: " + (err.error || "Bilinmeyen hata"));
        }
    } catch (e) {
        console.error("Hata:", e);
        alert("Yanıt gönderilemedi.");
    }
}

function showNewTicketForm() {
    currentTicketId = null;
    filterTicketsList(); // clear active selection

    const pane = document.getElementById('ticketDetailPane');
    
    // Fetch customers from custom dataset to populate dropdown
    const customers = datasets.custom || [];
    let customerOptions = '<option value="">-- Müşteri Seçin --</option>';
    customers.forEach(c => {
        customerOptions += `<option value="${c.kKunde}">${c.KundenNr} - ${c.Firma || c.InhabeName}</option>`;
    });

    let userOptions = ticketUsers.map(u => `<option value="${u.kBenutzer}">${u.cName || u.cLogin}</option>`).join('');

    pane.innerHTML = `
        <div class="new-ticket-form">
            <h2>🎫 Yeni Bilet Oluştur</h2>
            
            <div class="form-grp">
                <label>Müşteri</label>
                <select id="newTicketKunde" class="form-ctrl">${customerOptions}</select>
            </div>

            <div class="form-grp">
                <label>Bilet Başlığı / Konu</label>
                <input type="text" id="newTicketTitle" class="form-ctrl" placeholder="Örn: Teknik Destek Talebi">
            </div>

            <div class="form-grp">
                <label>İlk Mesaj</label>
                <textarea id="newTicketContent" class="reply-textarea" placeholder="Mesajınızı buraya yazın..." style="min-height: 150px;"></textarea>
            </div>

            <div class="form-grp">
                <label>Oluşturan Agent</label>
                <select id="newTicketUser" class="form-ctrl">${userOptions}</select>
            </div>

            <div style="margin-top: 30px; display: flex; justify-content: flex-end;">
                <button class="btn-s success lg" onclick="submitNewTicket()">Oluştur 🚀</button>
            </div>
        </div>
    `;
}

async function submitNewTicket() {
    const kKunde = document.getElementById('newTicketKunde').value;
    const cTitel = document.getElementById('newTicketTitle').value.trim();
    const cInhalt = document.getElementById('newTicketContent').value.trim();
    const kBenutzer = document.getElementById('newTicketUser').value;

    if (!cInhalt) {
        alert("İlk mesaj içeriği zorunludur.");
        return;
    }

    try {
        const res = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kKunde: kKunde ? parseInt(kKunde) : null,
                cTitel: cTitel,
                cInhalt: cInhalt,
                kBenutzer: parseInt(kBenutzer)
            })
        });

        if (res.ok) {
            const data = await res.json();
            await fetchTickets(); // Refresh list
            selectTicket(data.kTicket); // Open newly created ticket
        } else {
            const err = await res.json();
            alert("Hata: " + (err.error || "Bilinmeyen hata"));
        }
    } catch (e) {
        console.error("Hata:", e);
        alert("Bilet oluşturulamadı.");
    }
}
