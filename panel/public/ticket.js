let ticketNavigationSource = null;
window.ticketNavigationSource = null;

function setTicketNavigationSource(source) {
    ticketNavigationSource = source;
    window.ticketNavigationSource = source;
}
window.setTicketNavigationSource = setTicketNavigationSource;

function openTicketWithSource(ticketId, source) {
    if (!ticketId) return;
    setTicketNavigationSource(source);
    if (typeof switchTab === 'function') {

        switchTab('tickets');
        setTimeout(() => {
            if (typeof selectTicket === 'function') {
                selectTicket(ticketId);
            }
        }, 150);
    }
}
window.openTicketWithSource = openTicketWithSource;
let ticketsData = [];
let ticketUsers = [];
let currentTicketId = null;
let loggedInTicketUser = null;
let currentTicketAttachment = null;
let currentTicketAttachmentPreviewUrl = null;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getShortDisplayName(user) {
    const source = user?.cName || user?.cLogin || '';
    const trimmed = String(source).trim();
    if (!trimmed) return 'Bilinmeyen';
    const firstPart = trimmed.split(/\s+/)[0];
    return firstPart || trimmed;
}

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
    isCalendarView = false;
    isReportView = false;
    currentTicketId = null;
    const ticketsCont = document.querySelector('.tickets-container');
    if (ticketsCont) {
        ticketsCont.classList.remove('has-active-ticket', 'viewing-calendar', 'viewing-report');
    }
    document.getElementById('ticketLoginOverlay').style.display = 'flex';
    document.getElementById('ticketLoginPass').value = '';
    // Clear lists
    document.getElementById('ticketsListContainer').innerHTML = '';
    document.getElementById('ticketDetailPane').innerHTML = '<div class="empty-state">Bilet seçin veya oluşturun.</div>';
    if (typeof updateTicketViewPanes === 'function') updateTicketViewPanes();
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
                    userFilter.innerHTML += `<option value="${u.kBenutzer}">${getShortDisplayName(u)}</option>`;
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
    const priorityVal = document.getElementById('ticketPriorityFilter') ? document.getElementById('ticketPriorityFilter').value : "";
    const userVal = document.getElementById('ticketUserFilter').value;

    const filtered = ticketsData.filter(t => {
        const matchSearch = (t.cEindeutigeId && t.cEindeutigeId.toLowerCase().includes(searchVal)) ||
                            (t.Firma && t.Firma.toLowerCase().includes(searchVal)) ||
                            (t.cTitelErsteNachricht && t.cTitelErsteNachricht.toLowerCase().includes(searchVal)) ||
                            (t.KundenNr && String(t.KundenNr).toLowerCase().includes(searchVal));
        
        const matchStatus = statusVal === "" || 
                            String(t.kStatus) === statusVal || 
                            (statusVal === "1_2" && (t.kStatus == 1 || t.kStatus == 2));
        const matchPriority = priorityVal === "" || String(t.nPrioritaet) === priorityVal;
        const matchUser = userVal === "" || String(t.kBenutzer_Ersteller) === userVal;
        
        return matchSearch && matchStatus && matchPriority && matchUser;
    });

    const countBadge = document.getElementById('ticketCountBadge');
    if (countBadge) countBadge.textContent = filtered.length;

    renderTicketsList(filtered);
    if (typeof renderTicketCalendar === 'function' && typeof isCalendarView !== 'undefined' && isCalendarView) {
        renderTicketCalendar(filtered);
    }
    if (typeof renderTicketReport === 'function' && typeof isReportView !== 'undefined' && isReportView) {
        renderTicketReport(filtered);
    }
}

function parseRawDatetimeLocal(value) {
    if (!value) return '';
    const str = String(value);
    const match = str.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    if (match) {
        return `${match[1]}T${match[2]}`;
    }

    const date = new Date(str);
    if (Number.isNaN(date.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRawDateTimeLabel(value) {
    if (!value) return 'Belirtilmedi';
    const str = String(value);
    const match = str.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    if (match) {
        const parts = match[1].split('-');
        return `${parts[2]}.${parts[1]}.${parts[0]} ${match[2]}`;
    }
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) return 'Belirtilmedi';
    return date.toLocaleString('tr-TR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
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
        let dueLabel = '';
        if (t.dFaelligAm) {
            const rawDisplay = formatRawDateTimeLabel(t.dFaelligAm);
            const dueDate = new Date(parseRawDatetimeLocal(t.dFaelligAm));
            const now = new Date();
            const diffHours = (dueDate - now) / (1000 * 60 * 60);
            if (diffHours < 0) {
                div.classList.add('due-overdue');
            } else if (diffHours <= 24) {
                div.classList.add('due-soon');
            }
            dueLabel = `📅 ${rawDisplay}`;
        }
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
        const ownerName = ownerUser ? getShortDisplayName(ownerUser) : 'Bilinmeyen';
        const displayId = `${t.cEindeutigeId || ('TKT-'+t.kTicket)} - ${ownerName}`;

        const priorityNames = {1: "Düşük", 2: "Normal", 3: "Yüksek"};
        const priorityText = priorityNames[t.nPrioritaet] || "Bilinmeyen";
        const priorityClass = `priority-${t.nPrioritaet}`;

        div.innerHTML = `
            <div class="ticket-item-header">
                <span class="ticket-item-id">${displayId}</span>
                <div>
                    <span class="status-badge ${priorityClass}" style="margin-right: 4px;">${priorityText}</span>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="ticket-item-title" title="${title}">${title}</div>
            <div class="ticket-item-meta">
                <span>👤 ${customerName}</span>
                <span>🕒 ${dateStr}</span>
                ${dueLabel ? `<span class="ticket-due-label">${dueLabel}</span>` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

async function selectTicket(id) {
    currentTicketId = id;
    const ticketsCont = document.querySelector('.tickets-container');
    if (ticketsCont) ticketsCont.classList.add('has-active-ticket');
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
    const ownerName = ownerUser ? getShortDisplayName(ownerUser) : 'Bilinmeyen';
    const displayId = `${data.cEindeutigeId || ('TKT-'+data.kTicket)} - ${ownerName}`;
    
    const isOwner = loggedInTicketUser && String(loggedInTicketUser.kBenutzer) === String(erstellerId);

    const ticketInListForTitle = ticketsData.find(t => t.kTicket == data.kTicket);
    const titleStr = (ticketInListForTitle && ticketInListForTitle.cTitelErsteNachricht) ? ticketInListForTitle.cTitelErsteNachricht : 'Başlıksız Bilet';

    window.currentTicketDetailData = data;
    window.currentTicketTitle = titleStr;

    const dueDateLabel = formatRawDateTimeLabel(data.dFaelligAm);
    const dueDateJson = data.dFaelligAm ? JSON.stringify(data.dFaelligAm) : 'null';
    const headerHtml = `
        <div class="ticket-detail-header">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    ${getTicketBackButtonHtml()}
                    <button type="button" class="btn-s secondary mobile-ticket-back-btn" onclick="mobileBackToTicketList()" title="Bilet Listesine Dön">← Biletler</button>
                    <div>
                        <h2 class="ticket-detail-title" style="margin:0;">${displayId}</h2>
                        <div style="margin-top: 4px; font-size: 1.05rem; color: var(--text-color); font-weight: 500;">${escapeHtml(titleStr)}</div>
                    </div>
                </div>
                <div class="ticket-detail-actions">
                    <select class="form-ctrl" style="padding: 2px 8px; font-size: 0.85rem; width: auto;" onchange="changeTicketPriority(${data.kTicket}, this.value)">
                        <option value="1" ${data.nPrioritaet == 1 ? 'selected' : ''}>Düşük</option>
                        <option value="2" ${data.nPrioritaet == 2 ? 'selected' : ''}>Normal</option>
                        <option value="3" ${data.nPrioritaet == 3 ? 'selected' : ''}>Yüksek</option>
                    </select>
                    <button type="button" class="btn-s wiki-ask-btn" onclick="openWikiSearchModal()" title="Wiki Bilgi Bankasında Benzer Konu ve Çözüm Ara">📚 Wiki'ye Sor</button>
                    ${data.kStatus == 1 ? `<button class="btn-s warning" onclick="changeTicketStatus(${data.kTicket}, 2)">⏳ Beklemeye Al</button>` : ''}
                    ${data.kStatus == 2 ? `<button class="btn-s success" onclick="changeTicketStatus(${data.kTicket}, 1)">🟢 Yeniden Aç</button>` : ''}
                    ${data.kStatus != 3 && isOwner ? `<button class="btn-s secondary" onclick="changeTicketStatus(${data.kTicket}, 3)">❌ Kapat</button>` : ''}
                    ${data.kStatus != 3 && !isOwner ? `<button class="btn-s secondary" style="opacity:0.5;cursor:not-allowed;" title="Sadece bilet sahibi kapatabilir" disabled>❌ Kapat</button>` : ''}
                    ${data.kStatus == 3 ? `<button type="button" class="btn-s secondary" onclick="openTicketCloseWikiModal(${data.kTicket}, true)" title="Bu biletin çözümünü Wiki'ye yeni sayfa olarak ekle">📝 Wiki'ye Yaz</button>` : ''}
                    ${data.kStatus == 3 ? `<span style="color:#4caf50;font-weight:bold;margin-right:10px;align-self:center;">✅ Kapalı</span>` : ''}
                    ${data.kStatus == 3 && isOwner ? `<button class="btn-s success" onclick="changeTicketStatus(${data.kTicket}, 1)">🟢 Tekrar Aç</button>` : ''}
                </div>
            </div>
            <div class="ticket-detail-info">
                <span><strong>Müşteri:</strong> ${customerStr}</span>
                <span><strong>Durum:</strong> ${data.kStatus == 1 ? 'Açık' : (data.kStatus == 2 ? 'Beklemede' : 'Çözüldü')}</span>
                <span><strong>Takip Tarihi:</strong> <span class="ticket-due-label editable" onclick='startDueDateEdit(${data.kTicket}, ${dueDateJson})' title="Düzenlemek için tıklayın">${dueDateLabel}</span></span>
            </div>
            <div id="ticketDueDateEditor" class="ticket-due-editor" style="display:none; margin-top:12px; gap:10px; align-items:center;"></div>
            <div id="ticketHeaderWikiBanner" class="ticket-wiki-inline-banner" style="display:none;"></div>
        </div>
    `;

    // Messages
    let messagesHtml = '<div class="chat-container" id="ticketChatContainer">';
    let visibleMessages = 0;
    if (data.messages && data.messages.length > 0) {
        data.messages.forEach(m => {
            const rawContent = m.cInhalt ? String(m.cInhalt).trim() : '';
            const content = rawContent ? rawContent.replace(/\n/g, '<br>') : '';
            const hasAttachment = Boolean(m.attachment);
            if (!content && !hasAttachment) {
                return; // Skip empty messages without attachment
            }

            visibleMessages += 1;
            const isOutgoing = m.nRichtung == 0; // Assuming 0 is outgoing (Agent to Cust)
            const msgClass = isOutgoing ? 'outgoing' : 'incoming';
            
            // Find User Name
            let senderName = 'Müşteri';
            if (isOutgoing) {
                const user = ticketUsers.find(u => u.kBenutzer == m.kBenutzer_Ersteller);
                senderName = user ? getShortDisplayName(user) : ('Agent ' + (m.kBenutzer_Ersteller||''));
            }

            let dateStr = '';
            if (m.dErstellung) {
                const d = new Date(m.dErstellung);
                dateStr = d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});
            }

            let attachmentHtml = '';
            if (hasAttachment) {
                const attachment = m.attachment;
                const isImage = attachment.cFileType && attachment.cFileType.startsWith('image/');
                const isVideo = attachment.cFileType && attachment.cFileType.startsWith('video/');
                const isPdf = attachment.cFileType === 'application/pdf' || (attachment.cFileName || '').toLowerCase().endsWith('.pdf');
                if (isImage) {
                    attachmentHtml = `
                        <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
                            <div class="attachment-preview-media">
                                <img src="${attachment.url}" alt="${attachment.cFileName}" style="max-width:100%;max-height:100%;border-radius:8px;object-fit:contain;">
                            </div>
                            <div class="message-attachment-actions">
                                <button type="button" class="link-button" onclick="downloadTicketAttachment('${attachment.url}', '${encodeURIComponent(attachment.cFileName || 'attachment')}')">⬇️ İndir</button>
                                <button type="button" class="link-button" onclick="deleteTicketAttachment(${data.kTicket}, ${attachment.kFile})">🗑️ Sil</button>
                            </div>
                        </div>`;
                } else if (isVideo) {
                    attachmentHtml = `
                        <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
                            <div class="attachment-preview-media">
                                <video controls src="${attachment.url}" style="max-width:100%;max-height:100%;border-radius:8px;"></video>
                            </div>
                            <div class="message-attachment-actions">
                                <button type="button" class="link-button" onclick="downloadTicketAttachment('${attachment.url}', '${encodeURIComponent(attachment.cFileName || 'attachment')}')">⬇️ İndir</button>
                                <button type="button" class="link-button" onclick="deleteTicketAttachment(${data.kTicket}, ${attachment.kFile})">🗑️ Sil</button>
                            </div>
                        </div>`;
                } else if (isPdf) {
                    attachmentHtml = `
                        <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
                            <div class="attachment-preview-pdf">
                                <iframe class="attachment-pdf-object" src="${attachment.url}" type="application/pdf" aria-label="PDF önizleme"></iframe>
                            </div>
                            <div class="message-attachment-actions">
                                <button type="button" class="link-button" onclick="downloadTicketAttachment('${attachment.url}?download=1', '${encodeURIComponent(attachment.cFileName || 'attachment')}')">⬇️ İndir</button>
                                <button type="button" class="link-button" onclick="deleteTicketAttachment(${data.kTicket}, ${attachment.kFile})">🗑️ Sil</button>
                            </div>
                        </div>`;
                } else {
                    attachmentHtml = '';
                }
            }

            messagesHtml += `
                <div class="chat-message ${msgClass}">
                    <div class="chat-bubble">${content}${attachmentHtml}</div>
                    <div class="chat-meta">
                        <span class="chat-sender">${senderName}</span>
                        <span>${dateStr}</span>
                    </div>
                </div>
            `;
        });
    }

    if (visibleMessages === 0) {
        messagesHtml += '<div style="text-align:center;color:var(--text-muted);margin-top:20px;">Henüz mesaj yok.</div>';
    }

    messagesHtml += '</div>';

    const replyHtml = `
        <div class="reply-area" id="ticketReplyArea">
            <input type="file" id="ticketAttachmentInput" accept="image/*,video/*,.pdf" hidden>
            <textarea id="replyContent" class="reply-textarea" placeholder="Yanıtınızı buraya yazın..."></textarea>
            <div id="ticketAttachmentPreview" class="attachment-preview"></div>
            <div class="reply-actions">
                <button type="button" class="btn-s secondary" onclick="document.getElementById('ticketAttachmentInput').click()">📎 Dosya</button>
                <button class="btn-s success" onclick="submitTicketReply(${data.kTicket})">Gönder 📤</button>
            </div>
        </div>
    `;

    pane.innerHTML = headerHtml + messagesHtml + replyHtml;

    attachTicketReplyDropzone();

    // Scroll chat to bottom
    const chatContainer = document.getElementById('ticketChatContainer');
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Check Wiki for matching articles based on ticket title
    checkTicketHeaderWikiSuggestions(titleStr);
}

function attachTicketReplyDropzone() {
    const replyArea = document.getElementById('ticketReplyArea');
    const input = document.getElementById('ticketAttachmentInput');
    const preview = document.getElementById('ticketAttachmentPreview');
    const detailPane = document.getElementById('ticketDetailPane');
    if (!replyArea || !input || !preview) return;

    const clearPreview = () => {
        if (currentTicketAttachmentPreviewUrl) {
            URL.revokeObjectURL(currentTicketAttachmentPreviewUrl);
            currentTicketAttachmentPreviewUrl = null;
        }
        preview.innerHTML = '';
        currentTicketAttachment = null;
        replyArea.classList.remove('dragover');
    };

    const updatePreview = (file) => {
        clearPreview();
        if (!file) return;

        const isImage = file.type && file.type.startsWith('image/');
        const isVideo = file.type && file.type.startsWith('video/');
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (!isImage && !isVideo && !isPdf) {
            preview.innerHTML = '<span style="color:var(--text-muted);">Sadece resim, video veya PDF dosyası ekleyebilirsiniz.</span>';
            return;
        
        }

        currentTicketAttachment = file;
        if (isImage) {
            currentTicketAttachmentPreviewUrl = URL.createObjectURL(file);
            preview.innerHTML = `<div class="attachment-preview-media"><button type="button" class="attachment-remove-button" aria-label="Dosyayı kaldır">×</button><img src="${currentTicketAttachmentPreviewUrl}" alt="${file.name}" style="max-width:100%;max-height:100%;border-radius:8px;object-fit:contain;"></div>`;
        } else if (isVideo) {
            currentTicketAttachmentPreviewUrl = URL.createObjectURL(file);
            preview.innerHTML = `<div class="attachment-preview-media"><button type="button" class="attachment-remove-button" aria-label="Dosyayı kaldır">×</button><video controls src="${currentTicketAttachmentPreviewUrl}" style="max-width:100%;max-height:100%;border-radius:8px;"></video></div>`;
        } else {
            currentTicketAttachmentPreviewUrl = URL.createObjectURL(file);
            preview.innerHTML = `<div class="attachment-preview-pdf"><button type="button" class="attachment-remove-button" aria-label="Dosyayı kaldır">×</button><iframe class="attachment-pdf-object" src="${currentTicketAttachmentPreviewUrl}" type="application/pdf" aria-label="PDF önizleme"></iframe></div>`;
        }

        const removeButton = preview.querySelector('.attachment-remove-button');
        if (removeButton) {
            removeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                clearPreview();
                input.value = '';
            });
        }

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'btn-s secondary';
        clearButton.textContent = 'Temizle';
        clearButton.style.marginTop = '8px';
        clearButton.onclick = (e) => {
            e.stopPropagation();
            clearPreview();
            input.value = '';
        };
        preview.appendChild(clearButton);
    };

    const dragTarget = detailPane || replyArea;
    ['dragenter', 'dragover'].forEach(eventName => {
        dragTarget.addEventListener(eventName, (e) => {
            e.preventDefault();
            replyArea.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dragTarget.addEventListener(eventName, (e) => {
            e.preventDefault();
            replyArea.classList.remove('dragover');
        });
    });

    dragTarget.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file) updatePreview(file);
    });

    input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) updatePreview(file);
    });
}

async function changeTicketStatus(id, newStatus) {
    if (newStatus == 3) {
        openTicketCloseWikiModal(id, false);
        return;
    }
    const statusNames = {1: "Açık", 2: "Beklemede", 3: "Kapalı"};
    const promptMsg = `Bilet durumunu '${statusNames[newStatus]}' olarak değiştirmek istediğinize emin misiniz?`;
    if (!confirm(promptMsg)) return;
    await executeTicketStatusChange(id, newStatus);
}

async function executeTicketStatusChange(id, newStatus) {
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
            return true;
        } else {
            const err = await res.json();
            alert("Hata: " + (err.error || "Bilinmeyen hata"));
            return false;
        }
    } catch (e) {
        console.error("Hata:", e);
        alert("Bilet durumu değiştirilemedi.");
        return false;
    }
}

async function submitTicketReply(ticketId) {
    const content = document.getElementById('replyContent').value.trim();
    const userId = loggedInTicketUser ? loggedInTicketUser.kBenutzer : 1;

    if (!content && !currentTicketAttachment) {
        alert("Lütfen bir mesaj yazın veya bir dosya ekleyin.");
        return;
    
    }

    try {
        const formData = new FormData();
        if (content) formData.append('cInhalt', content);
        formData.append('kBenutzer', userId);
        if (currentTicketAttachment) formData.append('file', currentTicketAttachment);

        const res = await fetch(`/api/tickets/${ticketId}/reply`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            if (currentTicketAttachmentPreviewUrl) {
                URL.revokeObjectURL(currentTicketAttachmentPreviewUrl);
                currentTicketAttachmentPreviewUrl = null;
            }
            currentTicketAttachment = null;
            document.getElementById('replyContent').value = '';
            const input = document.getElementById('ticketAttachmentInput');
            if (input) input.value = '';
            const preview = document.getElementById('ticketAttachmentPreview');
            if (preview) preview.innerHTML = '';
            const replyArea = document.getElementById('ticketReplyArea');
            if (replyArea) replyArea.classList.remove('dragover');
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

async function downloadTicketAttachment(url, encodedFileName) {
    try {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || 'Dosya indirilemedi.');
        }
        const blob = await response.blob();
        const filename = decodeURIComponent(encodedFileName || 'attachment');
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
    } catch (err) {
        console.error('Download failed:', err);
        alert('Dosya indirilemedi. ' + (err.message || ''));        
    }
}

async function deleteTicketAttachment(ticketId, fileId) {
    if (!confirm('Eki silmek istediğinize emin misiniz?')) return;
    try {
        const response = await fetch(`/api/tickets/${ticketId}/attachments/${fileId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Silme işlemi başarısız.');
        }
        selectTicket(ticketId);
    } catch (err) {
        console.error('Attachment delete failed:', err);
        alert('Ek silinemedi. ' + (err.message || ''));
    }
}

function getTicketDatasets() {
    if (typeof datasets !== 'undefined') return datasets;
    if (typeof window !== 'undefined' && window.datasets) return window.datasets;
    const fallback = { rental: [], custom: [], aylik: [] };
    if (typeof window !== 'undefined') window.datasets = fallback;
    return fallback;
}

async function ensureTicketCustomersLoaded() {
    const dataStore = getTicketDatasets();

    if (Array.isArray(dataStore.custom) && dataStore.custom.length > 0) {
        return;
    
    }

    if (typeof fetchData === 'function') {
        try {
            await fetchData('custom', '/api/customers_custom');
        } catch (error) {
            console.warn('Unable to fetch custom customers via fetchData:', error);
        }
    } else {
        try {
            const response = await fetch('/api/customers_custom');
            if (response.ok) {
                const json = await response.json();
                dataStore.custom = Array.isArray(json) ? json : [];
            }
        } catch (error) {
            console.warn('Unable to fetch custom customers directly:', error);
        }
    }

    if ((!Array.isArray(dataStore.custom) || dataStore.custom.length === 0)) {
        if (typeof fetchData === 'function') {
            try {
                await fetchData('rental', '/api/customers');
            } catch (error) {
                console.warn('Unable to fetch rental customers via fetchData:', error);
            }
        } else {
            try {
                const response = await fetch('/api/customers');
                if (response.ok) {
                    const json = await response.json();
                    dataStore.rental = Array.isArray(json) ? json : [];
                }
            } catch (error) {
                console.warn('Unable to fetch rental customers directly:', error);
            }
        }
    }
}

function getTicketCustomers(filter = '') {
    const dataStore = getTicketDatasets();
    const customCustomers = Array.isArray(dataStore.custom) ? dataStore.custom : [];
    const rentalCustomers = Array.isArray(dataStore.rental) ? dataStore.rental : [];
    const customers = customCustomers.length > 0 ? customCustomers : rentalCustomers;
    const searchValue = String(filter || '').trim().toLowerCase();

    if (!searchValue) {
        return customers;
    }

    return customers.filter(c => {
        const firma = String(c.Firma || c.InhabeName || '').toLowerCase();
        const kundenNr = String(c.KundenNr || c.kundenNr || '').toLowerCase();
        return firma.includes(searchValue) || kundenNr.includes(searchValue);
    });
}

function updateNewTicketCustomerOptions() {
    const filter = document.getElementById('newTicketCustomerSearch')?.value || '';
    const select = document.getElementById('newTicketKunde');
    const countLabel = document.getElementById('newTicketCustomerCount');
    if (!select) return;

    const customers = getTicketCustomers(filter);
    let customerOptions = '<option value="">-- Müşteri Seçin --</option>';

    if (customers.length === 0) {
        customerOptions += '<option value="" disabled>Sonuç bulunamadı</option>';
    } else {
        customers.forEach((c, idx) => {
            const label = `${c.KundenNr || ''} - ${c.Firma || c.InhabeName || 'Bilinmeyen'}`;
            const selected = idx === 0 ? ' selected' : '';
            customerOptions += `<option value="${c.kKunde}"${selected}>${label}</option>`;
        });
    }

    select.innerHTML = customerOptions;

    if (customers.length > 0) {
        select.value = String(customers[0].kKunde);
    } else {
        select.value = '';
    }

    if (countLabel) {
        countLabel.textContent = customers.length;
    }
}

async function showNewTicketForm(defaultDateStr = null) {
    isCalendarView = false;
    isReportView = false;
    currentTicketId = null;
    updateTicketViewPanes();

    const ticketsCont = document.querySelector('.tickets-container');
    if (ticketsCont) {
        ticketsCont.classList.add('has-active-ticket');
        ticketsCont.classList.remove('viewing-calendar', 'viewing-report');
    }

    filterTicketsList(); // clear active selection

    await ensureTicketCustomersLoaded();

    const pane = document.getElementById('ticketDetailPane');
    pane.innerHTML = `
        <div class="new-ticket-form-shell">
            <div class="new-ticket-form">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                    <button type="button" class="btn-s secondary mobile-ticket-back-btn" onclick="mobileBackToTicketList()" title="Bilet Listesine Dön">← Biletler</button>
                    <h2 style="margin:0; border:none; padding:0; color:var(--primary-color);">🎫 Yeni Bilet Oluştur</h2>
                </div>
                
                <div class="form-grp" style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                <div style="flex:1; min-width:220px;">
                    <label>Müşteri Ara</label>
                    <input type="text" id="newTicketCustomerSearch" class="form-ctrl" placeholder="Firma veya müşteri numarası ara..." oninput="updateNewTicketCustomerOptions()">
                </div>
                <div style="display:flex; align-items:center; gap:8px; white-space:nowrap;">
                    <label style="margin:0; font-size:0.95rem; color:var(--text-muted);">Sonuç:</label>
                    <span id="newTicketCustomerCount" style="font-weight:bold;">0</span>
                </div>
            </div>
            <div class="form-grp">
                <label>Müşteri</label>
                <select id="newTicketKunde" class="form-ctrl"></select>
            </div>

            <div class="form-grp">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <label style="margin:0;">Bilet Başlığı / Konu</label>
                    <button type="button" class="btn-s wiki-ask-btn" style="min-height:28px; padding:3px 10px; font-size:0.8rem;" onclick="openWikiSearchModal(document.getElementById('newTicketTitle')?.value || '')">📚 Wiki'de Ara</button>
                </div>
                <input type="text" id="newTicketTitle" class="form-ctrl" placeholder="Örn: TSE Bağlantı Hatası, Teknik Destek Talebi..." oninput="onNewTicketTitleInput(this.value)" style="margin-top:6px;">
                <div id="newTicketWikiSuggestions" class="wiki-inline-suggestions" style="display:none;"></div>
            </div>

            <div class="form-grp">
                <label>Öncelik</label>
                <select id="newTicketPriority" class="form-ctrl">
                    <option value="1">Düşük (Sarı)</option>
                    <option value="2" selected>Normal (Turuncu)</option>
                    <option value="3">Yüksek (Kırmızı)</option>
                </select>
            </div>

            <div class="form-grp">
                <label>İzleme Tarihi / Planlanan Tarih</label>
                <input type="datetime-local" id="newTicketDueDate" class="form-ctrl">
                <small style="color:var(--text-muted);">Bu bilet için bakılacak tarih ve saati seçin.</small>
            </div>

            <div class="form-grp">
                <label>İlk Mesaj</label>
                <textarea id="newTicketContent" class="reply-textarea" placeholder="Mesajınızı buraya yazın..." style="min-height: 150px;"></textarea>
            </div>

                <div style="margin-top: 30px; display: flex; justify-content: flex-end;">
                    <button class="btn-s success lg" onclick="submitNewTicket()">Oluştur 🚀</button>
                </div>
            </div>
        </div>
    `;

    updateNewTicketCustomerOptions();
    
    if (defaultDateStr) {
        const el = document.getElementById('newTicketDueDate');
        if (el) el.value = `${defaultDateStr}T12:00`;
    }
}

async function submitNewTicket() {
    const kKunde = document.getElementById('newTicketKunde').value;
    const cTitel = document.getElementById('newTicketTitle').value.trim();
    const cInhalt = document.getElementById('newTicketContent').value.trim();
    const kBenutzer = loggedInTicketUser ? loggedInTicketUser.kBenutzer : 1;
    const nPrioritaet = document.getElementById('newTicketPriority') ? document.getElementById('newTicketPriority').value : 2;
    const dFaelligAm = document.getElementById('newTicketDueDate').value || null;

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
                kBenutzer: parseInt(kBenutzer),
                nPrioritaet: parseInt(nPrioritaet),
                dFaelligAm: dFaelligAm
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

async function changeTicketPriority(id, newPriority) {
    const kBenutzer = loggedInTicketUser ? loggedInTicketUser.kBenutzer : 1;
    
    try {
        const res = await fetch(`/api/tickets/${id}/priority`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nPrioritaet: parseInt(newPriority), kBenutzer: kBenutzer })
        });

        if (res.ok) {
            await fetchTickets(); // Refresh list to update priority badge
            selectTicket(id); // Refresh chat to show system message
        } else {
            const err = await res.json();
            alert("Hata: " + (err.error || "Bilinmeyen hata"));
        }
    } catch (e) {
        console.error("Hata:", e);
        alert("Bilet önceliği değiştirilemedi.");
    }
}

function startDueDateEdit(ticketId, currentValue) {
    const editor = document.getElementById('ticketDueDateEditor');
    if (!editor) return;
    const inputValue = parseRawDatetimeLocal(currentValue);
    editor.style.display = 'flex';
    editor.innerHTML = `
        <input type="datetime-local" id="ticketDueDateInput" class="form-ctrl" style="max-width:250px;" value="${inputValue}">
        <button class="btn-s success" onclick="saveTicketDueDate(${ticketId})">Kaydet</button>
        <button class="btn-s secondary" onclick="cancelDueDateEdit()">İptal</button>
    `;

    const input = document.getElementById('ticketDueDateInput');
    if (!input) return;

    input.focus();
    input.select();

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveTicketDueDate(ticketId);
        } else if (event.key === 'Escape') {
            cancelDueDateEdit();
        }
    });

    input.addEventListener('blur', () => {
        setTimeout(() => {
            const active = document.activeElement;
            if (!editor.contains(active)) {
                saveTicketDueDate(ticketId);
            }
        }, 150);
    });
}

function cancelDueDateEdit() {
    const editor = document.getElementById('ticketDueDateEditor');
    if (!editor) return;
    editor.style.display = 'none';
    editor.innerHTML = '';
}

async function saveTicketDueDate(ticketId) {
    const input = document.getElementById('ticketDueDateInput');
    if (!input) return;

    const dFaelligAm = input.value ? input.value : null;
    const kBenutzer = loggedInTicketUser ? loggedInTicketUser.kBenutzer : 1;

    try {
        const res = await fetch(`/api/tickets/${ticketId}/duedate`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dFaelligAm, kBenutzer })
        });

        if (res.ok) {
            cancelDueDateEdit();
            await fetchTickets();
            selectTicket(ticketId);
        } else {
            const err = await res.json();
            alert("Hata: " + (err.error || "Bilinmeyen hata"));
        }
    } catch (e) {
        console.error("Hata:", e);
        alert("Takip tarihi kaydedilemedi.");
    }
}


// --- Ticket Calendar Implementation ---
let isCalendarView = false;
let isReportView = false;

function updateTicketViewPanes() {
    const detailPane = document.getElementById("ticketDetailPane");
    const calendarPane = document.getElementById("ticketCalendarPane");
    const reportPane = document.getElementById("ticketReportPane");
    const ticketsCont = document.querySelector('.tickets-container');
    
    const calBtn = document.querySelector('.tickets-list-header button[onclick="toggleTicketCalendarView()"]');
    const repBtn = document.querySelector('.tickets-list-header button[onclick="toggleTicketReportView()"]');
    
    if (calBtn) calBtn.innerHTML = isCalendarView ? '&#128221; Biletler' : '&#128197; Takvim';
    if (repBtn) repBtn.innerHTML = isReportView ? '&#128221; Biletler' : '&#128202; Analiz';
    
    if (ticketsCont) {
        if (isCalendarView) {
            ticketsCont.classList.add("has-active-ticket", "viewing-calendar");
            ticketsCont.classList.remove("viewing-report");
        } else if (isReportView) {
            ticketsCont.classList.add("has-active-ticket", "viewing-report");
            ticketsCont.classList.remove("viewing-calendar");
        } else {
            ticketsCont.classList.remove("viewing-calendar", "viewing-report");
            if (!currentTicketId) {
                ticketsCont.classList.remove("has-active-ticket");
            }
        }
    }

    if (isCalendarView) {
        if (detailPane) detailPane.style.display = "none";
        if (reportPane) reportPane.style.display = "none";
        if (calendarPane) calendarPane.style.display = "flex";
        filterTicketsList();
    } else if (isReportView) {
        if (detailPane) detailPane.style.display = "none";
        if (calendarPane) calendarPane.style.display = "none";
        if (reportPane) reportPane.style.display = "flex";
        filterTicketsList();
    } else {
        if (calendarPane) calendarPane.style.display = "none";
        if (reportPane) reportPane.style.display = "none";
        if (detailPane) detailPane.style.display = "flex";
    }
}

function toggleTicketCalendarView() {
    isCalendarView = !isCalendarView;
    isReportView = false;
    updateTicketViewPanes();
}

function toggleTicketReportView() {
    isReportView = !isReportView;
    isCalendarView = false;
    updateTicketViewPanes();
}


const userColors = {};
const defaultColors = ["#ef5350", "#ab47bc", "#5c6bc0", "#29b6f6", "#26a69a", "#66bb6a", "#d4e157", "#ffa726", "#ff7043", "#8d6e63"];
function getUserColor(userId) {
    if (!userId) return "#777";
    if (!userColors[userId]) {
        userColors[userId] = defaultColors[Object.keys(userColors).length % defaultColors.length];
    }
    return userColors[userId];
}

function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil(( ( (date - yearStart) / 86400000) + 1)/7);
}

let calendarWeekOffset = 0;
let showWeekends = false;

function changeCalendarOffset(offset) {
    calendarWeekOffset += offset;
    filterTicketsList();
}

function toggleWeekends() {
    showWeekends = !showWeekends;
    filterTicketsList();
}

function renderTicketCalendar(filteredTickets) {
    const pane = document.getElementById("ticketCalendarPane");
    if (!pane) return;
    
    const today = new Date();
    today.setDate(today.getDate() + (calendarWeekOffset * 7));
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(diff));
    startOfWeek.setHours(0,0,0,0);
    
    const days = [];
    for(let i=0; i<28; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d);
    }
    
    const ticketsByDate = {};
    filteredTickets.forEach(t => {
        let dateVal = t.dFaelligAm || t.dAenderung || t.dErstellung;
        if (!dateVal) return;
        const str = String(dateVal);
        let dateStr = '';
        const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            dateStr = `${match[1]}-${match[2]}-${match[3]}`;
        } else {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                dateStr = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
            }
        }
        if (!dateStr) return;
        if (!ticketsByDate[dateStr]) ticketsByDate[dateStr] = [];
        ticketsByDate[dateStr].push(t);
    });
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <button type="button" class="btn-s secondary mobile-ticket-back-btn" onclick="mobileBackToTicketList()" title="Bilet Listesine Dön">← Biletler</button>
                <button class="btn-s secondary" onclick="changeCalendarOffset(-4)">⬅️ Önceki 4 Hafta</button>
                <button class="btn-s secondary" onclick="changeCalendarOffset(4)">Sonraki 4 Hafta ➡️</button>
                <button class="btn-s secondary" onclick="calendarWeekOffset=0; filterTicketsList();">Bugün</button>
            </div>
            <div>
                <label style="cursor:pointer; display:flex; align-items:center; gap:5px; color:var(--text-color); font-size: 0.95rem;">
                    <input type="checkbox" ${showWeekends ? "" : "checked"} onchange="toggleWeekends()" style="width: 16px; height: 16px; cursor: pointer;">
                    Hafta Sonunu Gizle
                </label>
            </div>
        </div>
    `;

    const cols = showWeekends ? 7 : 5;
    html += `<div class="ticket-calendar-grid" style="grid-template-columns: 60px repeat(${cols}, 1fr) 60px;">`;
    html += `<div class="cal-header">Hafta</div>`;
    
    const daysArr = ["Pzt", "Sal", "Çar", "Per", "Cum"];
    if (showWeekends) {
        daysArr.push("Cmt", "Paz");
    }
    daysArr.forEach(d => {
        html += `<div class="cal-header">${d}</div>`;
    });
    html += `<div class="cal-header">Ay</div>`;
    
    for (let w = 0; w < 4; w++) {
        const weekStartDay = days[w*7];
        const wn = getWeekNumber(weekStartDay);
        html += `<div class="cal-week-cell">Hafta ${wn}</div>`;
        for (let d = 0; d < 7; d++) {
            if (!showWeekends && (d === 5 || d === 6)) continue;
            
            const currentDay = days[w*7 + d];
            const dateStr = currentDay.getFullYear() + "-" + String(currentDay.getMonth()+1).padStart(2,"0") + "-" + String(currentDay.getDate()).padStart(2,"0");
            
            const isToday = (new Date().toDateString() === currentDay.toDateString());
            
            html += `<div class="cal-day-cell ${isToday ? "cal-today" : ""}" ondragover="handleTicketDragOver(event)" ondrop="handleTicketDrop(event, '${dateStr}')" onclick="handleDayCellClick(event, '${dateStr}')">`;
            html += `<div class="cal-day-number">${currentDay.getDate()}</div>`;
            
            const dayTickets = ticketsByDate[dateStr] || [];
            dayTickets.forEach(t => {
                const color = getUserColor(t.kBenutzer_Ersteller);
                const rawTitle = t.cTitelErsteNachricht || t.Firma || "Bilet";
                const title = escapeHtml(rawTitle);
                const displayId = escapeHtml(t.KundenNr || "");
                
                const userObj = ticketUsers.find(u => u.kBenutzer == t.kBenutzer_Ersteller);
                const userName = escapeHtml(userObj ? getShortDisplayName(userObj) : "Bilinmeyen");
                const tooltipText = `${userName} - ${displayId ? displayId + ' - ' : ''}${title}`;
                
                html += `<div class="cal-ticket-box" style="background-color: ${color};" onclick="openTicketFromCalendar(${t.kTicket})" title="${tooltipText}" draggable="true" ondragstart="handleTicketDragStart(event, ${t.kTicket}, ${t.kBenutzer_Ersteller})">
                    <b>${displayId}</b> ${title}
                </div>`;
            });
            
            html += `</div>`;
        }
        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
        const weekMonthStr = monthNames[weekStartDay.getMonth()];
        html += `<div class="cal-week-cell">${weekMonthStr}</div>`;
    }
    
    html += `</div>`;
    pane.innerHTML = html;
}

function openTicketFromCalendar(ticketId) {
    isCalendarView = false;
    isReportView = false;
    updateTicketViewPanes();
    selectTicket(ticketId);
}



function handleTicketDragStart(e, ticketId, ticketOwnerId) {
    if (!loggedInTicketUser || loggedInTicketUser.kBenutzer != ticketOwnerId) {
        e.preventDefault();
        alert("Sadece kendi biletlerinizi taşıyabilirsiniz.");
        return;
    
    }
    e.dataTransfer.setData("text/plain", ticketId);
    e.dataTransfer.effectAllowed = "move";
}

function handleTicketDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
}

async function handleTicketDrop(e, targetDateStr) {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData("text/plain");
    if (!ticketId) return;
    
    const ticket = ticketsData.find(t => t.kTicket == ticketId);
    if (!ticket) return;
    
    let timePart = "09:00:00";
    if (ticket.dFaelligAm) {
        const timeMatch = String(ticket.dFaelligAm).match(/\d{2}:\d{2}:\d{2}/);
        if (timeMatch) timePart = timeMatch[0];
    }
    
    const dFaelligAm = `${targetDateStr}T${timePart}`;
    const kBenutzer = loggedInTicketUser ? loggedInTicketUser.kBenutzer : 1;
    
    try {
        const res = await fetch(`/api/tickets/${ticketId}/duedate`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dFaelligAm, kBenutzer })
        });
        
        if (res.ok) {
            ticket.dFaelligAm = dFaelligAm.replace('T', ' ');
            filterTicketsList();
        } else {
            alert("Tarih güncellenemedi.");
        }
    } catch (err) {
        alert("Bağlantı hatası.");
    }
}



function toggleTicketLeftPane() {
    const pane = document.querySelector('.tickets-list-pane');
    const icon = document.getElementById('ticketPaneTogglerIcon');
    if (!pane) return;
    
    if (pane.style.display === 'none') {
        pane.style.display = 'flex';
        icon.innerHTML = '&#9664;'; // Left pointing triangle
    } else {
        pane.style.display = 'none';
        icon.innerHTML = '&#9654;'; // Right pointing triangle
    }
}


function handleDayCellClick(e, dateStr) {
    if (e.target.closest('.cal-ticket-box')) return;
    showNewTicketForm(dateStr);
}

function renderTicketReport(filteredTickets) {
    const pane = document.getElementById("ticketReportPane");
    if (!pane) return;
    
    const userGroups = {};
    filteredTickets.forEach(t => {
        const uId = t.kBenutzer_Ersteller || 0;
        if (!userGroups[uId]) {
            userGroups[uId] = { open: 0, pending: 0, resolved: 0, total: 0 };
        }
        userGroups[uId].total++;
        if (t.kStatus == 1) userGroups[uId].open++;
        else if (t.kStatus == 2) userGroups[uId].pending++;
        else if (t.kStatus == 3 || t.kStatus == 4) userGroups[uId].resolved++;
    });
    
    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px; padding: 0 10px; width: 100%; box-sizing: border-box;">
            <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="btn-s secondary mobile-ticket-back-btn" onclick="mobileBackToTicketList()" title="Bilet Listesine Dön">← Biletler</button>
                <h3 style="margin:0; color:var(--primary-color);">📊 Bilet Analiz Raporu</h3>
            </div>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:30px; justify-content:center; align-items:flex-start; padding: 10px;">
    `;
    
    if (Object.keys(userGroups).length === 0) {
        html += `<div style="color:var(--text-muted);">G&ouml;sterilecek veri bulunamad&#305;.</div>`;
    } else {
        Object.keys(userGroups).forEach(uId => {
            const data = userGroups[uId];
            if (data.total === 0) return;
            
            const pOpen = (data.open / data.total) * 100;
            const pPending = (data.pending / data.total) * 100;
            const pResolved = (data.resolved / data.total) * 100;
            
            const colorOpen = '#ef5350';
            const colorPending = '#42a5f5';
            const colorResolved = '#66bb6a';
            
            const grad = `conic-gradient(
                ${colorOpen} 0% ${pOpen}%, 
                ${colorPending} ${pOpen}% ${pOpen + pPending}%, 
                ${colorResolved} ${pOpen + pPending}% 100%
            )`;
            
            const userObj = ticketUsers.find(u => u.kBenutzer == uId);
            const rawUserName = userObj ? getShortDisplayName(userObj) : (uId == 0 ? "Bilinmeyen" : "Kullanıcı " + uId);
            const userName = escapeHtml(rawUserName);
            
            html += `
                <div style="display:flex; flex-direction:column; align-items:center; gap:15px; background:var(--surface-color); padding:20px; border-radius:12px; border:1px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.1); width:240px;">
                    <div style="width: 180px; height: 180px; border-radius: 50%; background: ${grad}; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);">
                        <div style="width: 130px; height: 130px; border-radius: 50%; background: var(--surface-color); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                            <div style="font-weight: bold; font-size: 1.1rem; color: var(--text-color); margin-bottom: 4px; word-break: break-word;">${userName}</div>
                            <div style="font-size: 1rem; color: var(--text-muted);">${data.total} Bilet</div>
                        </div>
                    </div>
                    
                    <div style="display:flex; flex-direction:column; gap:8px; width: 100%; margin-top: 10px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                            <span style="color:${colorOpen}; font-weight:bold;">A&ccedil;&#305;k (K&#305;rm&#305;z&#305;):</span> <span style="color:var(--text-color); font-weight:bold;">${data.open}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                            <span style="color:${colorPending}; font-weight:bold;">Bekleyen (Mavi):</span> <span style="color:var(--text-color); font-weight:bold;">${data.pending}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.95rem;">
                            <span style="color:${colorResolved}; font-weight:bold;">&Ccedil;&ouml;z&uuml;len (Ye&scedil;il):</span> <span style="color:var(--text-color); font-weight:bold;">${data.resolved}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    pane.innerHTML = html;
}



function getTicketBackButtonHtml() {
    const src = ticketNavigationSource || window.ticketNavigationSource;
    if (!src) return '';

    const sources = {
        'rapor':   { label: 'Rapor Listesine Dön', icon: '📊', title: 'Ticket Raporu Listesine Geri Dön' },
        'pos':     { label: "POS'a Dön",           icon: '💳', title: 'POS Paneline Geri Dön' },
        'lacash':  { label: "LaCash'e Dön",        icon: '💶', title: 'LaCash Paneline Geri Dön' },
        'lotus':   { label: "LotusPecas'a Dön",    icon: '🪷', title: 'LotusPecas Paneline Geri Dön' },
        'korgo':   { label: "Kargo'ya Dön",        icon: '🚚', title: 'Kargo Paneline Geri Dön' }
    };

    const nav = sources[src];
    if (!nav) return '';

    return `<button type="button" class="btn-s teal" onclick="backToTicketSource()" title="${nav.title}" style="min-height:32px; padding:4px 10px; font-size:0.85rem; font-weight:600; display:inline-flex; align-items:center; gap:5px; cursor:pointer;">↩ ${nav.icon} ${nav.label}</button>`;
}

function backToTicketSource() {
    const src = ticketNavigationSource || window.ticketNavigationSource;
    ticketNavigationSource = null;
    window.ticketNavigationSource = null;

    const targetTabs = {
        'rapor':  'ticketrapor',
        'pos':    'pos',
        'lacash': 'lacash',
        'lotus':  'lotus',
        'korgo':  'korgo'
    };

    const target = targetTabs[src] || src;
    if (target && typeof switchTab === 'function') {
        switchTab(target);
    }
}

function backToTicketRapor() {
    backToTicketSource();
}

// =========================================================
// WIKI.JS BİLGİ BANKASI ENTEGRASYONU
// =========================================================
let _wikiSearchDebounceTimer = null;
let _wikiCachedConfig = {
    base_url: "http://192.168.178.82:3000",
    locale: "de",
    default_folder: "cozumler",
    folders: ["cozumler"]
};
let _currentViewedWikiPage = null;

function slugifyWikiClient(text) {
    if (!text) return "cozum";
    const trMap = { 'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u','Ç':'c','Ğ':'g','İ':'i','Ö':'o','Ş':'s','Ü':'u','ä':'a','ö':'o','ü':'u','ß':'ss','Ä':'a','Ö':'o','Ü':'u' };
    const clean = String(text).replace(/[çğıöşüÇĞİÖŞÜäöüßÄÖÜ]/g, ch => trMap[ch] || ch).toLowerCase();
    return clean.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || "cozum";
}

function renderSimpleWikiMarkdown(md) {
    if (!md) return '<em style="color:var(--text-muted);">İçerik boş.</em>';
    let html = escapeHtml(md);
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin:12px 0 6px;color:var(--secondary-color);">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin:14px 0 8px;color:var(--primary-color);border-bottom:1px solid var(--border-color);padding-bottom:4px;">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 style="margin:16px 0 10px;color:var(--primary-color);">$1</h2>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;">$1</code>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

function ensureWikiModalDom() {
    let overlay = document.getElementById('ticketWikiModalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ticketWikiModalOverlay';
        overlay.className = 'ticket-wiki-modal-overlay';
        overlay.style.display = 'none';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeTicketWikiModal();
        });
        document.body.appendChild(overlay);
    }
    return overlay;
}

function closeTicketWikiModal() {
    const overlay = document.getElementById('ticketWikiModalOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    }
}

// 1. Yeni Bilet Oluştururken Başlık Yazıldığında Canlı Wiki Önerisi
function onNewTicketTitleInput(value) {
    clearTimeout(_wikiSearchDebounceTimer);
    const box = document.getElementById('newTicketWikiSuggestions');
    if (!box) return;

    const q = String(value || '').trim();
    if (q.length < 2) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
    }

    _wikiSearchDebounceTimer = setTimeout(async () => {
        try {
            const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(q)}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.base_url) _wikiCachedConfig.base_url = data.base_url;
            if (data.locale) _wikiCachedConfig.locale = data.locale;
            if (Array.isArray(data.folders)) _wikiCachedConfig.folders = data.folders;

            const results = data.results || [];
            if (results.length === 0) {
                box.style.display = 'none';
                box.innerHTML = '';
                return;
            }

            let html = `
                <div class="wiki-suggestion-header">
                    <span>💡 <strong>Wiki'de Benzer Çözümler Bulundu (${results.length})</strong> — Bilet açmadan önce inceleyebilirsiniz:</span>
                    <button type="button" class="wiki-mini-btn" onclick="document.getElementById('newTicketWikiSuggestions').style.display='none'">Gizle ✕</button>
                </div>
                <div class="wiki-suggestion-list">
            `;
            results.slice(0, 5).forEach(item => {
                const folderBadge = item.folder ? `<span class="wiki-folder-badge">📁 ${escapeHtml(item.folder)}</span>` : '';
                html += `
                    <div class="wiki-suggestion-item">
                        <div class="wiki-suggestion-main" onclick="openWikiSearchModal('${escapeHtml(q)}', ${item.id})">
                            <div class="wiki-suggestion-title">${folderBadge} ${escapeHtml(item.title)}</div>
                            ${item.description ? `<div class="wiki-suggestion-desc">${escapeHtml(item.description)}</div>` : ''}
                        </div>
                        <div class="wiki-suggestion-actions">
                            <button type="button" class="btn-s secondary" style="min-height:28px;padding:3px 8px;font-size:0.78rem;" onclick="openWikiSearchModal('${escapeHtml(q)}', ${item.id})">👁️ Oku</button>
                            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="btn-s wiki-ask-btn" style="min-height:28px;padding:3px 8px;font-size:0.78rem;text-decoration:none;">🔗 Wiki</a>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
            box.innerHTML = html;
            box.style.display = 'block';
        } catch (err) {
            console.warn('Wiki live search error:', err);
        }
    }, 350);
}

// 2. Mevcut Bilet Açıldığında Üst Barda Benzer Çözüm Uyarısı
async function checkTicketHeaderWikiSuggestions(titleStr) {
    const banner = document.getElementById('ticketHeaderWikiBanner');
    if (!banner) return;
    const q = String(titleStr || '').trim();
    if (!q || q === 'Başlıksız Bilet') {
        banner.style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.base_url) _wikiCachedConfig.base_url = data.base_url;
        if (data.locale) _wikiCachedConfig.locale = data.locale;
        if (Array.isArray(data.folders)) _wikiCachedConfig.folders = data.folders;

        const results = data.results || [];
        if (results.length === 0) {
            banner.style.display = 'none';
            return;
        }

        const topTitles = results.slice(0, 2).map(r => `"${escapeHtml(r.title)}"`).join(', ');
        banner.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;width:100%;">
                <span>💡 <strong>Wiki Çözüm Önerisi:</strong> Bu konuyla eşleşen <strong>${results.length}</strong> kayıt bulundu (${topTitles}${results.length > 2 ? ' vb.' : ''}).</span>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button type="button" class="btn-s wiki-ask-btn" style="min-height:28px;padding:4px 10px;font-size:0.82rem;" onclick="openWikiSearchModal()">📚 Çözümleri Gör</button>
                    <button type="button" class="wiki-mini-btn" onclick="this.closest('#ticketHeaderWikiBanner').style.display='none'">✕</button>
                </div>
            </div>
        `;
        banner.style.display = 'flex';
    } catch (e) {
        banner.style.display = 'none';
    }
}

// 3. "Wiki'ye Sor" Arama & Okuma Modalı
async function openWikiSearchModal(initialQuery = null, autoOpenPageId = null) {
    const overlay = ensureWikiModalDom();
    const defaultQ = initialQuery !== null ? initialQuery : (window.currentTicketTitle && window.currentTicketTitle !== 'Başlıksız Bilet' ? window.currentTicketTitle : '');
    const wikiHomeUrl = `${_wikiCachedConfig.base_url}/${_wikiCachedConfig.locale}/home`;

    overlay.innerHTML = `
        <div class="ticket-wiki-modal">
            <div class="ticket-wiki-modal-header">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:1.4rem;">📚</span>
                    <div>
                        <h3 style="margin:0;color:var(--primary-color);">Wiki Bilgi Bankası & Çözüm Arama</h3>
                        <small style="color:var(--text-muted);">Geçmiş çözümleri arayın, okuyun veya tek tıkla bilete yanıt olarak ekleyin</small>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <a href="${escapeHtml(wikiHomeUrl)}" target="_blank" rel="noopener" class="btn-s secondary" style="text-decoration:none;min-height:32px;padding:4px 10px;font-size:0.82rem;">🌐 Wiki'yi Yeni Sekmede Aç</a>
                    <button type="button" class="btn-s secondary" style="min-height:32px;padding:4px 10px;font-size:0.82rem;" onclick="openWikiConfigModal()">⚙️ API Ayarları</button>
                    <button type="button" class="wiki-modal-close-btn" onclick="closeTicketWikiModal()">✕</button>
                </div>
            </div>
            <div class="ticket-wiki-modal-body">
                <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
                    <input type="text" id="wikiModalSearchInput" class="form-ctrl" style="flex:1;min-width:220px;" placeholder="Konu başlığı, hata kodu veya klasör adı yazın..." value="${escapeHtml(defaultQ)}" onkeydown="if(event.key==='Enter') executeWikiModalSearch()">
                    <select id="wikiModalFolderFilter" class="form-ctrl" style="width:auto;min-width:160px;" onchange="executeWikiModalSearch()">
                        <option value="">📁 Tüm Klasörler</option>
                    </select>
                    <button type="button" class="btn-s wiki-ask-btn" onclick="executeWikiModalSearch()">🔍 Wiki'de Ara</button>
                    <button type="button" class="btn-s secondary" onclick="document.getElementById('wikiModalSearchInput').value='';document.getElementById('wikiModalFolderFilter').value='';executeWikiModalSearch();">Tüm Sayfalar</button>
                </div>
                <div id="wikiModalStatusNotice" style="display:none;margin-bottom:12px;"></div>
                <div class="wiki-modal-split">
                    <div id="wikiModalResultsList" class="wiki-modal-results-pane">
                        <div style="text-align:center;padding:24px;color:var(--text-muted);">Aranıyor...</div>
                    </div>
                    <div id="wikiModalPageReader" class="wiki-modal-reader-pane">
                        <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
                            Sol listeden bir çözüm sayfasına tıklayarak içeriğini burada görüntüleyebilir ve bilet yanıtına aktarabilirsiniz.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';

    await executeWikiModalSearch(autoOpenPageId);
}

async function executeWikiModalSearch(autoOpenPageId = null) {
    const input = document.getElementById('wikiModalSearchInput');
    const folderSelect = document.getElementById('wikiModalFolderFilter');
    const listEl = document.getElementById('wikiModalResultsList');
    const noticeEl = document.getElementById('wikiModalStatusNotice');
    if (!listEl) return;

    const q = input ? input.value.trim() : '';
    const selectedFolder = folderSelect ? folderSelect.value : '';
    listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);">🔄 Wiki taranıyor...</div>';

    try {
        const res = await fetch(`/api/wiki/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();

        if (data.base_url) _wikiCachedConfig.base_url = data.base_url;
        if (data.locale) _wikiCachedConfig.locale = data.locale;
        if (Array.isArray(data.folders)) {
            _wikiCachedConfig.folders = data.folders;
            if (folderSelect && folderSelect.options.length <= 1) {
                data.folders.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f;
                    opt.textContent = `📁 ${f}`;
                    if (f === selectedFolder) opt.selected = true;
                    folderSelect.appendChild(opt);
                });
            }
        }

        if (noticeEl) {
            if (data.warning) {
                const directSearchUrl = `${_wikiCachedConfig.base_url}/${_wikiCachedConfig.locale}/home`;
                noticeEl.innerHTML = `
                    <div class="wiki-warning-box">
                        <div>⚠️ <strong>Bilgi:</strong> ${escapeHtml(data.warning)}</div>
                        <div style="display:flex;gap:8px;margin-top:6px;">
                            <button type="button" class="btn-s secondary" style="min-height:28px;padding:3px 10px;font-size:0.8rem;" onclick="openWikiConfigModal()">🔑 API Anahtarı Gir</button>
                            <a href="${escapeHtml(directSearchUrl)}" target="_blank" rel="noopener" class="btn-s wiki-ask-btn" style="min-height:28px;padding:3px 10px;font-size:0.8rem;text-decoration:none;">🌐 Wiki'yi Tarayıcıda Aç</a>
                        </div>
                    </div>
                `;
                noticeEl.style.display = 'block';
            } else {
                noticeEl.style.display = 'none';
            }
        }

        let results = data.results || [];
        if (selectedFolder) {
            results = results.filter(r => r.folder === selectedFolder || (r.path && r.path.startsWith(selectedFolder + '/')));
        }

        if (results.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center;padding:24px;color:var(--text-muted);">
                    <div style="font-size:1.8rem;margin-bottom:8px;">🔍</div>
                    <div>Eşleşen Wiki sayfası bulunamadı.</div>
                    ${q ? `<button type="button" class="btn-s secondary" style="margin-top:10px;" onclick="document.getElementById('wikiModalSearchInput').value='';executeWikiModalSearch();">Tüm Sayfaları Listele</button>` : ''}
                </div>
            `;
            return;
        }

        listEl.innerHTML = '';
        results.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'wiki-result-card';
            card.dataset.pageId = item.id;
            const folderBadge = item.folder ? `<span class="wiki-folder-badge">📁 ${escapeHtml(item.folder)}</span>` : `<span class="wiki-folder-badge">📄 Kök Dizin</span>`;
            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
                    ${folderBadge}
                    <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation();" style="font-size:0.78rem;color:var(--secondary-color);text-decoration:none;" title="Yeni sekmede aç">🔗 Aç</a>
                </div>
                <div class="wiki-result-card-title">${escapeHtml(item.title)}</div>
                ${item.description ? `<div class="wiki-result-card-desc">${escapeHtml(item.description)}</div>` : ''}
                <div style="font-size:0.74rem;color:var(--text-muted);margin-top:4px;">/${escapeHtml(item.locale)}/${escapeHtml(item.path)}</div>
            `;
            card.onclick = () => viewWikiPageInModal(item.id);
            listEl.appendChild(card);

            if ((autoOpenPageId && item.id == autoOpenPageId) || (!autoOpenPageId && idx === 0)) {
                viewWikiPageInModal(item.id);
            }
        });
    } catch (e) {
        listEl.innerHTML = `<div style="color:#ef5350;padding:16px;">Hata: ${escapeHtml(e.message)}</div>`;
    }
}

async function viewWikiPageInModal(pageId) {
    const readerEl = document.getElementById('wikiModalPageReader');
    if (!readerEl) return;

    document.querySelectorAll('.wiki-result-card').forEach(el => {
        el.classList.toggle('active', String(el.dataset.pageId) === String(pageId));
    });

    readerEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);">📖 Sayfa içeriği yükleniyor...</div>';

    try {
        const res = await fetch(`/api/wiki/page/${pageId}`);
        const data = await res.json();
        if (!res.ok || !data.page) {
            throw new Error(data.error || 'Sayfa okunamadı');
        }

        const page = data.page;
        _currentViewedWikiPage = page;
        const hasReplyBox = Boolean(document.getElementById('replyContent') || document.getElementById('newTicketContent'));

        readerEl.innerHTML = `
            <div class="wiki-reader-header">
                <div>
                    <div style="font-size:0.8rem;color:var(--secondary-color);margin-bottom:4px;">📁 /${escapeHtml(page.locale)}/${escapeHtml(page.path)}</div>
                    <h3 style="margin:0;color:var(--text-color);">${escapeHtml(page.title)}</h3>
                    ${page.description ? `<div style="font-size:0.88rem;color:var(--text-muted);margin-top:4px;">${escapeHtml(page.description)}</div>` : ''}
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${hasReplyBox ? `<button type="button" class="btn-s success" style="min-height:32px;padding:5px 10px;font-size:0.82rem;" onclick="insertCurrentWikiPageToTicket()">📥 Çözümü Mesaja Aktar</button>` : ''}
                    <button type="button" class="btn-s secondary" style="min-height:32px;padding:5px 10px;font-size:0.82rem;" onclick="copyCurrentWikiPageContent()">📋 Kopyala</button>
                    <a href="${escapeHtml(page.url)}" target="_blank" rel="noopener" class="btn-s wiki-ask-btn" style="min-height:32px;padding:5px 10px;font-size:0.82rem;text-decoration:none;">🔗 Wiki'de Aç</a>
                </div>
            </div>
            <div class="wiki-reader-content">${renderSimpleWikiMarkdown(page.content)}</div>
        `;
    } catch (e) {
        readerEl.innerHTML = `<div style="color:#ef5350;padding:20px;">Sayfa içeriği alınamadı: ${escapeHtml(e.message)}</div>`;
    }
}

function insertCurrentWikiPageToTicket() {
    if (!_currentViewedWikiPage) return;
    const replyEl = document.getElementById('replyContent') || document.getElementById('newTicketContent');
    if (!replyEl) return;

    const textToInsert = `📚 Wiki Çözümü (${_currentViewedWikiPage.title}):\n${_currentViewedWikiPage.content}\n\nDetaylı Bağlantı: ${_currentViewedWikiPage.url}`;
    replyEl.value = replyEl.value ? `${replyEl.value}\n\n${textToInsert}` : textToInsert;
    closeTicketWikiModal();
    replyEl.focus();
}

async function copyCurrentWikiPageContent() {
    if (!_currentViewedWikiPage) return;
    try {
        await navigator.clipboard.writeText(_currentViewedWikiPage.content || '');
        alert("Çözüm metni panoya kopyalandı!");
    } catch (e) {
        alert("Kopyalama başarısız oldu.");
    }
}

// 4. Ticket Kapatılırken Wiki'ye Çözüm Yazma & Hatırlatma Modalı
async function openTicketCloseWikiModal(ticketId, onlyWriteMode = false) {
    const overlay = ensureWikiModalDom();
    const ticketData = window.currentTicketDetailData || {};
    const titleStr = (window.currentTicketTitle && window.currentTicketTitle !== 'Başlıksız Bilet')
        ? window.currentTicketTitle
        : `Ticket #${ticketId} Çözümü`;

    // Son giden (destek) mesajlarını varsayılan çözüm taslağı olarak birleştir
    let draftSolution = '';
    if (Array.isArray(ticketData.messages)) {
        const agentMsgs = ticketData.messages
            .filter(m => m.cInhalt && !String(m.cInhalt).startsWith('Sistem Bilgisi:'))
            .map(m => {
                const role = m.nRichtung == 0 ? 'Çözüm / Destek' : 'Müşteri Notu';
                return `### ${role}\n${String(m.cInhalt).trim()}`;
            });
        draftSolution = agentMsgs.join('\n\n');
    }
    if (!draftSolution) {
        draftSolution = `## 🔍 Sorun / Konu\n${titleStr}\n\n## 🛠️ Uygulanan Çözüm\n- Çözüm adımlarını buraya yazın...`;
    }

    const defaultSlug = slugifyWikiClient(titleStr);
    const defaultFolder = _wikiCachedConfig.default_folder || 'cozumler';

    overlay.innerHTML = `
        <div class="ticket-wiki-modal" style="max-width:780px;">
            <div class="ticket-wiki-modal-header">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:1.5rem;">${onlyWriteMode ? '📝' : '💡'}</span>
                    <div>
                        <h3 style="margin:0;color:var(--primary-color);">${onlyWriteMode ? "Çözümü Wiki'ye Yeni Sayfa Olarak Ekle" : "Bileti Kapat & Çözümü Wiki'ye Kaydet"}</h3>
                        <small style="color:var(--text-muted);">Bu konunun çözümü gelecekte benzer sorun yaşayan müşteriler için Wiki'de referans olur</small>
                    </div>
                </div>
                <button type="button" class="wiki-modal-close-btn" onclick="closeTicketWikiModal()">✕</button>
            </div>
            <div class="ticket-wiki-modal-body">
                ${!onlyWriteMode ? `
                <div class="wiki-reminder-banner">
                    <div>
                        <strong>📌 Hatırlatma:</strong> Bu biletteki çözüm önemli bir bilgi içeriyorsa kapatmadan önce Wiki'ye yeni sayfa olarak ekleyebilir veya doğrudan sadece bileti kapatabilirsiniz.
                    </div>
                </div>
                ` : ''}

                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap;">
                    <span style="font-weight:600;color:var(--text-color);">📄 Yeni Wiki Çözüm Sayfası Bilgileri</span>
                    <button type="button" id="wikiAiSummarizeBtn" class="btn-s wiki-ask-btn" onclick="generateWikiSolutionWithAI(${ticketId})">
                        ✨ AI ile Mesajlardan Temiz Çözüm Hazırla
                    </button>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                    <div class="form-grp" style="margin:0;">
                        <label>📁 Wiki Klasörü Seçin veya Yazın</label>
                        <div style="display:flex;gap:6px;">
                            <select id="wikiNewPageFolderSelect" class="form-ctrl" onchange="if(this.value!=='__custom__') document.getElementById('wikiNewPageFolderInput').value=this.value;">
                                <option value="${escapeHtml(defaultFolder)}">📁 ${escapeHtml(defaultFolder)}</option>
                            </select>
                            <input type="text" id="wikiNewPageFolderInput" class="form-ctrl" value="${escapeHtml(defaultFolder)}" placeholder="Örn: kasa/tse">
                        </div>
                    </div>
                    <div class="form-grp" style="margin:0;">
                        <label>🔗 Sayfa Kısa Adı (URL Slug)</label>
                        <input type="text" id="wikiNewPageSlug" class="form-ctrl" value="${escapeHtml(defaultSlug)}" placeholder="ornek-cozum-adi">
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                    <div class="form-grp" style="margin:0;">
                        <label>📌 Wiki Sayfa Başlığı</label>
                        <input type="text" id="wikiNewPageTitle" class="form-ctrl" value="${escapeHtml(titleStr)}" oninput="document.getElementById('wikiNewPageSlug').value = slugifyWikiClient(this.value)">
                    </div>
                    <div class="form-grp" style="margin:0;">
                        <label>📝 Kısa Açıklama (Özet)</label>
                        <input type="text" id="wikiNewPageDesc" class="form-ctrl" value="${escapeHtml(titleStr + ' için çözüm adımları')}" placeholder="Kısa açıklama...">
                    </div>
                </div>

                <div class="form-grp" style="margin-bottom:14px;">
                    <label>🛠️ Çözüm İçeriği (Markdown destekler)</label>
                    <textarea id="wikiNewPageContent" class="reply-textarea" style="min-height:190px;font-family:inherit;">${escapeHtml(draftSolution)}</textarea>
                </div>

                <div id="wikiCreateStatusMsg" style="display:none;margin-bottom:12px;"></div>

                <div class="ticket-wiki-modal-footer">
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button type="button" class="btn-s secondary" onclick="copyWikiSolutionAndOpenBrowser()">
                            📋 Çözümü Kopyala & Wiki'yi Aç
                        </button>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                        <button type="button" class="btn-s secondary" onclick="closeTicketWikiModal()">İptal</button>
                        ${!onlyWriteMode ? `
                        <button type="button" class="btn-s warning" onclick="justCloseTicketWithoutWiki(${ticketId})">
                            ❌ Wiki'ye Yazmadan Sadece Bileti Kapat
                        </button>
                        ` : ''}
                        <button type="button" id="wikiSaveAndCloseBtn" class="btn-s success" onclick="saveWikiAndCloseTicket(${ticketId}, ${onlyWriteMode ? 'true' : 'false'})">
                            📚 ${onlyWriteMode ? "Wiki'ye Yeni Sayfa Olarak Kaydet" : "Wiki'ye Kaydet ve Bileti Kapat"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';

    // Klasör listesini arka planda doldur
    try {
        const fRes = await fetch('/api/wiki/folders');
        if (fRes.ok) {
            const fData = await fRes.json();
            if (fData.base_url) _wikiCachedConfig.base_url = fData.base_url;
            if (fData.locale) _wikiCachedConfig.locale = fData.locale;
            const sel = document.getElementById('wikiNewPageFolderSelect');
            if (sel && Array.isArray(fData.folders)) {
                sel.innerHTML = '';
                fData.folders.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f;
                    opt.textContent = `📁 ${f}`;
                    if (f === (fData.default_folder || defaultFolder)) opt.selected = true;
                    sel.appendChild(opt);
                });
            }
        }
    } catch (e) {
        console.warn('Wiki folders load warning:', e);
    }
}

async function generateWikiSolutionWithAI(ticketId) {
    const btn = document.getElementById('wikiAiSummarizeBtn');
    const statusBox = document.getElementById('wikiCreateStatusMsg');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ AI Çözümü Özetliyor...';
    }

    try {
        const res = await fetch('/api/wiki/summarize-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket_id: ticketId,
                title: document.getElementById('wikiNewPageTitle')?.value || window.currentTicketTitle || ''
            })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (data.title) document.getElementById('wikiNewPageTitle').value = data.title;
            if (data.slug) document.getElementById('wikiNewPageSlug').value = data.slug;
            if (data.folder) document.getElementById('wikiNewPageFolderInput').value = data.folder;
            if (data.description) document.getElementById('wikiNewPageDesc').value = data.description;
            if (data.content) document.getElementById('wikiNewPageContent').value = data.content;

            if (statusBox) {
                statusBox.innerHTML = `<div style="color:#81c784;font-size:0.88rem;">✨ Çözüm metni ${data.ai_generated ? 'yapay zeka tarafından müşteri bilgilerinden arındırılarak' : 'şablon olarak'} hazırlandı. İnceleyip kaydedebilirsiniz.</div>`;
                statusBox.style.display = 'block';
            }
        }
    } catch (e) {
        if (statusBox) {
            statusBox.innerHTML = `<div style="color:#ffb74d;font-size:0.88rem;">⚠️ AI özeti alınamadı: ${escapeHtml(e.message)}</div>`;
            statusBox.style.display = 'block';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '✨ AI ile Mesajlardan Temiz Çözüm Hazırla';
        }
    }
}

async function justCloseTicketWithoutWiki(ticketId) {
    closeTicketWikiModal();
    await executeTicketStatusChange(ticketId, 3);
}

async function copyWikiSolutionAndOpenBrowser() {
    const folder = (document.getElementById('wikiNewPageFolderInput')?.value || _wikiCachedConfig.default_folder || 'cozumler').trim().replace(/^\/+|\/+$/g, '');
    const slug = slugifyWikiClient(document.getElementById('wikiNewPageSlug')?.value || document.getElementById('wikiNewPageTitle')?.value || 'cozum');
    const content = document.getElementById('wikiNewPageContent')?.value || '';

    try {
        await navigator.clipboard.writeText(content);
    } catch (e) {
        console.warn('Clipboard copy failed:', e);
    }

    const targetUrl = `${_wikiCachedConfig.base_url}/${_wikiCachedConfig.locale}/${folder ? folder + '/' : ''}${slug}`;
    window.open(targetUrl, '_blank', 'noopener');
}

async function saveWikiAndCloseTicket(ticketId, onlyWriteMode = false) {
    const title = document.getElementById('wikiNewPageTitle')?.value.trim();
    const folder = document.getElementById('wikiNewPageFolderInput')?.value.trim();
    const slug = document.getElementById('wikiNewPageSlug')?.value.trim();
    const description = document.getElementById('wikiNewPageDesc')?.value.trim();
    const content = document.getElementById('wikiNewPageContent')?.value.trim();
    const statusBox = document.getElementById('wikiCreateStatusMsg');
    const saveBtn = document.getElementById('wikiSaveAndCloseBtn');

    if (!title || !content) {
        alert("Lütfen sayfa başlığı ve çözüm içeriğini doldurun.");
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "⏳ Wiki'ye Kaydediliyor...";
    }

    try {
        const res = await fetch('/api/wiki/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                folder,
                slug,
                description,
                content,
                ticket_id: ticketId
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            closeTicketWikiModal();
            if (!onlyWriteMode) {
                await executeTicketStatusChange(ticketId, 3);
            }
            alert(`✅ Çözüm başarıyla Wiki'ye kaydedildi!\nSayfa: ${data.page?.url || ''}`);
        } else {
            if (statusBox) {
                statusBox.innerHTML = `
                    <div class="wiki-warning-box">
                        <div>⚠️ <strong>Wiki Kayıt Uyarısı:</strong> ${escapeHtml(data.error || 'Sayfa oluşturulamadı.')}</div>
                        <div style="margin-top:6px;font-size:0.84rem;">Wiki.js üzerinden yeni sayfa oluşturmak için API Anahtarı gereklidir. Çözümü panoya kopyalayıp Wiki'de açabilir veya API anahtarınızı tanımlayabilirsiniz:</div>
                        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                            <button type="button" class="btn-s secondary" style="min-height:28px;padding:3px 10px;font-size:0.8rem;" onclick="openWikiConfigModal()">🔑 API Anahtarı Tanımla</button>
                            <button type="button" class="btn-s wiki-ask-btn" style="min-height:28px;padding:3px 10px;font-size:0.8rem;" onclick="copyWikiSolutionAndOpenBrowser()">📋 Çözümü Kopyala & Wiki'de Aç</button>
                        </div>
                    </div>
                `;
                statusBox.style.display = 'block';
            }
        }
    } catch (e) {
        if (statusBox) {
            statusBox.innerHTML = `<div style="color:#ef5350;">Bağlantı hatası: ${escapeHtml(e.message)}</div>`;
            statusBox.style.display = 'block';
        }
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = `📚 ${onlyWriteMode ? "Wiki'ye Yeni Sayfa Olarak Kaydet" : "Wiki'ye Kaydet ve Bileti Kapat"}`;
        }
    }
}

// 5. Wiki.js API & Bağlantı Ayarları Modalı
async function openWikiConfigModal() {
    const overlay = ensureWikiModalDom();
    let cfg = {
        base_url: _wikiCachedConfig.base_url || "http://192.168.178.82:3000",
        locale: _wikiCachedConfig.locale || "de",
        default_folder: _wikiCachedConfig.default_folder || "cozumler",
        has_api_key: false
    };

    try {
        const res = await fetch('/api/wiki/config?test=1');
        if (res.ok) cfg = await res.json();
    } catch (e) {}

    overlay.innerHTML = `
        <div class="ticket-wiki-modal" style="max-width:560px;">
            <div class="ticket-wiki-modal-header">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:1.4rem;">⚙️</span>
                    <div>
                        <h3 style="margin:0;color:var(--primary-color);">Wiki.js Bağlantı & API Ayarları</h3>
                        <small style="color:var(--text-muted);">Wiki arama ve otomatik sayfa oluşturma yapılandırması</small>
                    </div>
                </div>
                <button type="button" class="wiki-modal-close-btn" onclick="closeTicketWikiModal()">✕</button>
            </div>
            <div class="ticket-wiki-modal-body">
                <div style="margin-bottom:14px;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);font-size:0.86rem;">
                    <strong>Durum:</strong>
                    ${cfg.connected
                        ? `<span style="color:#81c784;font-weight:600;">✅ Bağlantı Başarılı (${cfg.page_count || 0} sayfa erişilebilir)</span>`
                        : `<span style="color:#ffb74d;font-weight:600;">⚠️ ${escapeHtml(cfg.connection_error || 'API Anahtarı bekleniyor')}</span>`
                    }
                </div>

                <div class="form-grp">
                    <label>Wiki Sunucu Adresi (URL)</label>
                    <input type="text" id="wikiCfgBaseUrl" class="form-ctrl" value="${escapeHtml(cfg.base_url)}" placeholder="http://192.168.178.82:3000">
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-grp">
                        <label>Dil Kodu (Locale)</label>
                        <input type="text" id="wikiCfgLocale" class="form-ctrl" value="${escapeHtml(cfg.locale)}" placeholder="de">
                    </div>
                    <div class="form-grp">
                        <label>Varsayılan Çözüm Klasörü</label>
                        <input type="text" id="wikiCfgDefaultFolder" class="form-ctrl" value="${escapeHtml(cfg.default_folder)}" placeholder="cozumler">
                    </div>
                </div>

                <div class="form-grp">
                    <label>Wiki.js API Anahtarı (Bearer Token)</label>
                    <input type="password" id="wikiCfgApiKey" class="form-ctrl" placeholder="${cfg.has_api_key ? '•••••••• (Kayıtlı anahtar var - değiştirmek için yeni girin)' : 'Wiki.js -> Yönetim -> API Erişimi bölümünden aldığınız anahtarı yapıştırın'}">
                    <small style="color:var(--text-muted);display:block;margin-top:4px;">
                        Wiki.js'te <strong>Yönetim (Administration) &rarr; API Erişimi (API Access)</strong> menüsünden bir API anahtarı oluşturup buraya kaydedebilirsiniz.
                    </small>
                </div>

                <div id="wikiCfgSaveStatus" style="display:none;margin-bottom:12px;"></div>

                <div class="ticket-wiki-modal-footer">
                    <button type="button" class="btn-s secondary" onclick="openWikiSearchModal()">← Arama Ekranına Dön</button>
                    <button type="button" class="btn-s success" onclick="saveWikiConfigFromModal()">💾 Kaydet ve Bağlantıyı Test Et</button>
                </div>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
}

async function saveWikiConfigFromModal() {
    const base_url = document.getElementById('wikiCfgBaseUrl')?.value.trim();
    const locale = document.getElementById('wikiCfgLocale')?.value.trim();
    const default_folder = document.getElementById('wikiCfgDefaultFolder')?.value.trim();
    const apiKeyInput = document.getElementById('wikiCfgApiKey')?.value.trim();
    const statusEl = document.getElementById('wikiCfgSaveStatus');

    const payload = { base_url, locale, default_folder };
    if (apiKeyInput) payload.api_key = apiKeyInput;

    if (statusEl) {
        statusEl.innerHTML = '<span style="color:var(--text-muted);">🔄 Test ediliyor...</span>';
        statusEl.style.display = 'block';
    }

    try {
        const res = await fetch('/api/wiki/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        _wikiCachedConfig.base_url = data.base_url || base_url;
        _wikiCachedConfig.locale = data.locale || locale;
        _wikiCachedConfig.default_folder = data.default_folder || default_folder;

        if (statusEl) {
            if (data.connected) {
                statusEl.innerHTML = `<div style="color:#81c784;font-weight:600;">✅ Kaydedildi ve bağlantı doğrulandı! (${data.page_count || 0} Wiki sayfası bulundu)</div>`;
            } else {
                statusEl.innerHTML = `<div style="color:#ffb74d;">💾 Ayarlar kaydedildi ancak sunucu yanıtı: ${escapeHtml(data.connection_error || 'Bağlantı kurulamadı')}</div>`;
            }
        }
    } catch (e) {
        if (statusEl) {
            statusEl.innerHTML = `<div style="color:#ef5350;">Hata: ${escapeHtml(e.message)}</div>`;
        }
    }
}

