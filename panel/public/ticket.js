let ticketsData = [];
let ticketUsers = [];
let currentTicketId = null;
let loggedInTicketUser = null;

async function initTicketsTab() {
    const userJson = localStorage.getItem('ticketUser');
    if (userJson) {
        loggedInTicketUser = JSON.parse(userJson);
        document.getElementById('ticketLoginOverlay').style.display = 'none';
        await fetchTicketUsers();
        
        // Set default filters
        const statusFilter = document.getElementById('ticketStatusFilter');
        const userFilter = document.getElementById('ticketUserFilter');
        if (statusFilter) statusFilter.value = '1_2';
        if (userFilter) userFilter.value = String(loggedInTicketUser.kBenutzer);
        
        await fetchTickets();
    } else {
        document.getElementById('ticketLoginOverlay').style.display = 'flex';
        await fetchTicketUsers(); // Fetch users so the combobox is ready later
    }
}

async function doTicketLogin() {
    const u = document.getElementById('ticketLoginUser').value.trim();
    const p = document.getElementById('ticketLoginPass').value.trim();
    const err = document.getElementById('ticketLoginError');
    const btn = document.getElementById('ticketLoginBtn');
    
    if (!u || !p) {
        err.textContent = "Lütfen kullanıcı adı ve şifre girin.";
        err.style.display = 'block';
        return;
    }
    
    btn.disabled = true;
    btn.textContent = "Giriş Yapılıyor...";
    err.style.display = 'none';
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: u, password: p})
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            localStorage.setItem('ticketUser', JSON.stringify(data.user));
            loggedInTicketUser = data.user;
            document.getElementById('ticketLoginOverlay').style.display = 'none';
            
            // Set default filters
            const statusFilter = document.getElementById('ticketStatusFilter');
            const userFilter = document.getElementById('ticketUserFilter');
            if (statusFilter) statusFilter.value = '1_2';
            if (userFilter) userFilter.value = String(loggedInTicketUser.kBenutzer);
            
            await fetchTickets();
        } else {
            err.textContent = data.error || "Giriş başarısız.";
            err.style.display = 'block';
        }
    } catch (e) {
        err.textContent = "Bağlantı hatası oluştu.";
        err.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = "Giriş Yap 🚀";
    }
}

function doTicketLogout() {
    localStorage.removeItem('ticketUser');
    loggedInTicketUser = null;
    document.getElementById('ticketLoginOverlay').style.display = 'flex';
    document.getElementById('ticketLoginPass').value = '';
    // Clear lists
    document.getElementById('ticketsListContainer').innerHTML = '';
    document.getElementById('ticketDetailPane').innerHTML = '<div class="empty-state">Bilet seçin veya oluşturun.</div>';
}

async function fetchTicketUsers() {
    try {
        const res = await fetch('/api/ticket-users');
        if (res.ok) {
            ticketUsers = await res.json();
            const userFilter = document.getElementById('ticketUserFilter');
            if (userFilter) {
                userFilter.innerHTML = '<option value="">Tümü (Tüm Kullanıcılar)</option>';
                ticketUsers.forEach(u => {
                    userFilter.innerHTML += `<option value="${u.kBenutzer}">${u.cName || u.cLogin}</option>`;
                });
            }
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
    const userVal = document.getElementById('ticketUserFilter').value;

    const filtered = ticketsData.filter(t => {
        const matchSearch = (t.cEindeutigeId && t.cEindeutigeId.toLowerCase().includes(searchVal)) ||
                            (t.Firma && t.Firma.toLowerCase().includes(searchVal)) ||
                            (t.cTitelErsteNachricht && t.cTitelErsteNachricht.toLowerCase().includes(searchVal)) ||
                            (t.KundenNr && String(t.KundenNr).toLowerCase().includes(searchVal));
        
        const matchStatus = statusVal === "" || 
                            String(t.kStatus) === statusVal || 
                            (statusVal === "1_2" && (t.kStatus == 1 || t.kStatus == 2));
        const matchUser = userVal === "" || String(t.kBenutzer_Ersteller) === userVal;
        
        return matchSearch && matchStatus && matchUser;
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
        
        const ownerUser = ticketUsers.find(u => u.kBenutzer == t.kBenutzer_Ersteller);
        const ownerName = ownerUser ? (ownerUser.cName || ownerUser.cLogin) : 'Bilinmeyen';
        const displayId = `${t.cEindeutigeId || ('TKT-'+t.kTicket)} - ${ownerName}`;

        div.innerHTML = `
            <div class="ticket-item-header">
                <span class="ticket-item-id">${displayId}</span>
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
    
    // Fallback: if data.kBenutzer_Ersteller is undefined (e.g. backend not restarted), check the list
    let erstellerId = data.kBenutzer_Ersteller;
    if (erstellerId === undefined) {
        const ticketInList = ticketsData.find(t => t.kTicket == data.kTicket);
        if (ticketInList) erstellerId = ticketInList.kBenutzer_Ersteller;
    }

    const ownerUser = ticketUsers.find(u => u.kBenutzer == erstellerId);
    const ownerName = ownerUser ? (ownerUser.cName || ownerUser.cLogin) : 'Bilinmeyen';
    const displayId = `${data.cEindeutigeId || ('TKT-'+data.kTicket)} - ${ownerName}`;
    
    const headerHtml = `
        <div class="ticket-detail-header">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h2 class="ticket-detail-title" style="margin:0;">${displayId}</h2>
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

    const replyHtml = `
        <div class="reply-area">
            <textarea id="replyContent" class="reply-textarea" placeholder="Yanıtınızı buraya yazın..."></textarea>
            <div class="reply-actions" style="justify-content: flex-end;">
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
    
    // Use logged in user
    const kBenutzer = loggedInTicketUser ? loggedInTicketUser.kBenutzer : 1;
    
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
    const userId = loggedInTicketUser ? loggedInTicketUser.kBenutzer : 1;

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
    const kBenutzer = loggedInTicketUser ? loggedInTicketUser.kBenutzer : 1;

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
