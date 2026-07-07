let ticketsData = [];
let ticketUsers = [];
let currentTicketId = null;
let loggedInTicketUser = null;
let currentTicketAttachment = null;
let currentTicketAttachmentPreviewUrl = null;

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
}

function parseRawDatetimeLocal(value) {
    if (!value) return '';
    const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    if (match) {
        return `${match[1]}T${match[2]}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRawDateTimeLabel(value) {
    if (!value) return 'Belirtilmedi';
    const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    if (match) {
        const parts = match[1].split('-');
        return `${parts[2]}.${parts[1]}.${parts[0]} ${match[2]}`;
    }
    const date = new Date(value);
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

    const dueDateLabel = formatRawDateTimeLabel(data.dFaelligAm);
    const dueDateJson = data.dFaelligAm ? JSON.stringify(data.dFaelligAm) : 'null';
    const headerHtml = `
        <div class="ticket-detail-header">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div>
                    <h2 class="ticket-detail-title" style="margin:0;">${displayId}</h2>
                    <div style="margin-top: 4px; font-size: 1.05rem; color: var(--text-color); font-weight: 500;">${titleStr}</div>
                </div>
                <div class="ticket-detail-actions">
                    <select class="form-ctrl" style="padding: 2px 8px; font-size: 0.85rem; width: auto;" onchange="changeTicketPriority(${data.kTicket}, this.value)">
                        <option value="1" ${data.nPrioritaet == 1 ? 'selected' : ''}>Düşük</option>
                        <option value="2" ${data.nPrioritaet == 2 ? 'selected' : ''}>Normal</option>
                        <option value="3" ${data.nPrioritaet == 3 ? 'selected' : ''}>Yüksek</option>
                    </select>
                    ${data.kStatus == 1 ? `<button class="btn-s warning" onclick="changeTicketStatus(${data.kTicket}, 2)">⏳ Beklemeye Al</button>` : ''}
                    ${data.kStatus == 2 ? `<button class="btn-s success" onclick="changeTicketStatus(${data.kTicket}, 1)">🟢 Yeniden Aç</button>` : ''}
                    ${data.kStatus != 3 && isOwner ? `<button class="btn-s secondary" onclick="changeTicketStatus(${data.kTicket}, 3)">❌ Kapat</button>` : ''}
                    ${data.kStatus != 3 && !isOwner ? `<button class="btn-s secondary" style="opacity:0.5;cursor:not-allowed;" title="Sadece bilet sahibi kapatabilir" disabled>❌ Kapat</button>` : ''}
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

async function showNewTicketForm() {
    currentTicketId = null;
    filterTicketsList(); // clear active selection

    await ensureTicketCustomersLoaded();

    const pane = document.getElementById('ticketDetailPane');
    pane.innerHTML = `
        <div class="new-ticket-form-shell">
            <div class="new-ticket-form">
                <h2>🎫 Yeni Bilet Oluştur</h2>
                
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
                <label>Bilet Başlığı / Konu</label>
                <input type="text" id="newTicketTitle" class="form-ctrl" placeholder="Örn: Teknik Destek Talebi">
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
