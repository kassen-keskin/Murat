// rma.js
async function initRmaTab() {
    // Populate Customer Dropdown
    if (typeof ensureTicketCustomersLoaded === 'function') {
        await ensureTicketCustomersLoaded();
    } else {
        if (!datasets.custom || datasets.custom.length === 0) {
            try {
                const res = await fetch('/api/customers_custom');
                if (res.ok) datasets.custom = await res.json();
            } catch (e) { }
        }
        if (!datasets.rental || datasets.rental.length === 0) {
            try {
                const res = await fetch('/api/customers');
                if (res.ok) datasets.rental = await res.json();
            } catch (e) { }
        }
    }
    
    updateRmaCustomerOptions();

    // Load history for Model and Betreff
    try {
        const modelHistory = JSON.parse(localStorage.getItem('rmaModelHistory')) || [];
        const modelList = document.getElementById('rmaModelList');
        modelList.innerHTML = '';
        modelHistory.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            modelList.appendChild(opt);
        });

        const betreffHistory = JSON.parse(localStorage.getItem('rmaBetreffHistory')) || [];
        const betreffList = document.getElementById('rmaBetreffList');
        betreffList.innerHTML = '';
        betreffHistory.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            betreffList.appendChild(opt);
        });
    } catch (e) {
        console.error("Error loading RMA history:", e);
    }

    // Update signature personel if visible
    const personelInput = document.getElementById('rmaImzaPersonel');
    if (personelInput) {
        personelInput.value = getRmaLoggedInUserName();
    }
}

function addRmaCustomItem() {
    const input = document.getElementById('rmaCustomItem');
    const val = input.value.trim();
    if (val) {
        const list = document.getElementById('rmaCustomItemsList');
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        label.style.cursor = 'pointer';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'rma-item';
        checkbox.value = val;
        checkbox.checked = true;
        checkbox.style.width = '18px';
        checkbox.style.height = '18px';
        
        const textNode = document.createTextNode(' ' + val);
        
        const delBtn = document.createElement('button');
        delBtn.className = 'btn-small btn-danger';
        delBtn.textContent = '✕';
        delBtn.style.padding = '2px 5px';
        delBtn.onclick = (e) => {
            e.preventDefault();
            list.removeChild(label);
        };
        
        label.appendChild(checkbox);
        label.appendChild(textNode);
        label.appendChild(delBtn);
        list.appendChild(label);
        
        input.value = '';
    }
}

async function rmaPdfOlustur() {
    const select = document.getElementById('rmaCustomerSelect');
    const opt = select.options[select.selectedIndex];
    
    if (!opt || !opt.value) {
        alert("Lütfen bir müşteri seçin.");
        return;
    }
    
    // Set Date
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth()+1).padStart(2, '0')}.${today.getFullYear()}`;
    document.getElementById('rmaPrintDate').textContent = dateStr;
    
    // Set Customer Info
    const ort = opt.dataset.ort || '';
    const customerHtml = `${opt.dataset.nr} - ${opt.dataset.firma}\n${opt.dataset.inhabe}\n${opt.dataset.strasse}\n${opt.dataset.plz} ${ort}`;
    document.getElementById('rmaPrintCustomer').textContent = customerHtml.trim().replace(/\n+/g, '\n');
    
    // Set inputs
    const modelVal = document.getElementById('rmaModel').value.trim();
    const betreffVal = document.getElementById('rmaBetreff').value.trim();
    
    document.getElementById('rmaPrintModel').textContent = modelVal || '-';
    document.getElementById('rmaPrintSernr').textContent = document.getElementById('rmaSernr').value || '-';
    document.getElementById('rmaPrintBetreff').textContent = betreffVal || '-';
    const descText = document.getElementById('rmaDescription').value || '';
    const descContainer = document.getElementById('rmaPrintDescription');
    descContainer.innerHTML = '';
    descText.split('\n').forEach(line => {
        const div = document.createElement('div');
        div.textContent = line || '\u00A0'; // non-breaking space for empty lines
        div.style.margin = '0';
        div.style.padding = '0';
        div.style.minHeight = '1.25em';
        div.style.lineHeight = '1.25';
        div.style.pageBreakInside = 'avoid';
        descContainer.appendChild(div);
    });
    
    // Save history
    try {
        if (modelVal) {
            let modelHistory = JSON.parse(localStorage.getItem('rmaModelHistory')) || [];
            if (!modelHistory.includes(modelVal)) {
                modelHistory.unshift(modelVal);
                if (modelHistory.length > 20) modelHistory.pop(); // Keep last 20
                localStorage.setItem('rmaModelHistory', JSON.stringify(modelHistory));
            }
        }
        if (betreffVal) {
            let betreffHistory = JSON.parse(localStorage.getItem('rmaBetreffHistory')) || [];
            if (!betreffHistory.includes(betreffVal)) {
                betreffHistory.unshift(betreffVal);
                if (betreffHistory.length > 20) betreffHistory.pop(); // Keep last 20
                localStorage.setItem('rmaBetreffHistory', JSON.stringify(betreffHistory));
            }
        }
    } catch (e) {
        console.error("Error saving RMA history:", e);
    }
    
    // Set Items
    const itemsList = document.getElementById('rmaPrintItemsList');
    itemsList.innerHTML = '';
    const checkboxes = document.querySelectorAll('.rma-item:checked');
    const materialsBlock = document.getElementById('rmaPrintMaterialsBlock');
    
    if (checkboxes.length === 0) {
        if (materialsBlock) materialsBlock.style.display = 'none';
    } else {
        if (materialsBlock) materialsBlock.style.display = 'block';
        checkboxes.forEach(cb => {
            const li = document.createElement('li');
            li.textContent = cb.value;
            itemsList.appendChild(li);
        });
    }

    // Set Signature Block
    const imzaEkleChecked = document.getElementById('rmaImzaEkle')?.checked;
    const signatureBlock = document.getElementById('rmaPrintSignatureBlock');
    const sigImg = document.getElementById('rmaPrintSignatureImg');
    const sigName = document.getElementById('rmaPrintSignatureName');
    
    if (imzaEkleChecked) {
        if (signatureBlock) signatureBlock.style.display = 'block';
        if (sigName) {
            const personelName = document.getElementById('rmaImzaPersonel')?.value || getRmaLoggedInUserName();
            sigName.textContent = personelName;
        }
        if (sigImg && rmaImzaCanvas && !isRmaCanvasBlank()) {
            sigImg.src = rmaImzaCanvas.toDataURL('image/png');
            sigImg.style.display = 'block';
        } else if (sigImg) {
            sigImg.style.display = 'none';
        }
    } else {
        if (signatureBlock) signatureBlock.style.display = 'none';
        if (sigImg) sigImg.style.display = 'none';
    }

    // Make visible briefly for html2canvas
    const printArea = document.getElementById('rmaPrintPreview');
    // Ensure it acts as A4 dimensions approximately for canvas capturing
    printArea.style.width = '210mm';
    printArea.style.minHeight = '297mm';
    printArea.style.left = '0';
    printArea.style.visibility = 'visible';
    printArea.style.position = 'absolute'; 
    printArea.style.top = '0';
    printArea.style.zIndex = '9999';

    try {
        // --- SMART PAGE BREAK LOGIC ---
        // Calculate approximate page height and 20mm top margin in pixels (printArea has padding 20mm)
        const pageHeightPx = printArea.offsetWidth * (297 / 210);
        const topMarginPx = printArea.offsetWidth * (20 / 210); // 20mm margin at the top of subsequent pages
        
        // Find all description line divs
        const descDivs = document.getElementById('rmaPrintDescription').children;
        
        for (let i = 0; i < descDivs.length; i++) {
            const div = descDivs[i];
            div.style.marginTop = '0'; // reset first
            
            // Get position relative to the printArea
            const rect = div.getBoundingClientRect();
            const parentRect = printArea.getBoundingClientRect();
            const topPx = rect.top - parentRect.top;
            const bottomPx = topPx + rect.height;
            
            // If this element crosses a page boundary or touches the bottom buffer
            const pageNumTop = Math.floor(topPx / pageHeightPx);
            const pageNumBottom = Math.floor((bottomPx + 15) / pageHeightPx);
            
            if (pageNumTop !== pageNumBottom) {
                // Push it down to the next page + 20mm top margin
                const pushAmount = (pageHeightPx * pageNumBottom) - topPx + topMarginPx;
                div.style.marginTop = pushAmount + 'px';
            }
        }
        
        // Also check if the Materials Block crosses the boundary
        if (materialsBlock && materialsBlock.style.display !== 'none') {
            materialsBlock.style.marginTop = '0';
            const rect = materialsBlock.getBoundingClientRect();
            const parentRect = printArea.getBoundingClientRect();
            const topPx = rect.top - parentRect.top;
            const bottomPx = topPx + rect.height;
            
            const pageNumTop = Math.floor(topPx / pageHeightPx);
            const pageNumBottom = Math.floor((bottomPx + 15) / pageHeightPx);
            
            if (pageNumTop !== pageNumBottom) {
                const pushAmount = (pageHeightPx * pageNumBottom) - topPx + topMarginPx;
                materialsBlock.style.marginTop = pushAmount + 'px';
            }
        }

        // Also check if Signature Block crosses the boundary
        if (signatureBlock && signatureBlock.style.display !== 'none') {
            signatureBlock.style.marginTop = '30px'; // default
            const rect = signatureBlock.getBoundingClientRect();
            const parentRect = printArea.getBoundingClientRect();
            const topPx = rect.top - parentRect.top;
            const bottomPx = topPx + rect.height;

            const pageNumTop = Math.floor(topPx / pageHeightPx);
            const pageNumBottom = Math.floor((bottomPx + 15) / pageHeightPx);

            if (pageNumTop !== pageNumBottom) {
                const pushAmount = (pageHeightPx * pageNumBottom) - topPx + topMarginPx;
                signatureBlock.style.marginTop = (pushAmount + 30) + 'px';
            }
        }
        // --- END SMART PAGE BREAK ---

        const canvas = await html2canvas(printArea, { scale: 2 });
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
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft > 5) {
            position -= pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        const firmaAdi = opt.dataset.firma || opt.dataset.inhabe || 'Bilinmiyor';
        const safeFirmaAdi = firmaAdi.replace(/[\\/:*?"<>|]/g, '').trim();
        const filename = `${opt.dataset.nr} - ${safeFirmaAdi} - ${dateStr}.pdf`;
        pdf.save(filename);
    } catch (e) {
        console.error("PDF generation error:", e);
        alert("PDF oluşturulurken bir hata oluştu.");
    } finally {
        printArea.style.left = '-9999px';
        printArea.style.top = 'auto';
        printArea.style.zIndex = 'auto';
    }
}

function updateRmaCustomerOptions() {
    const filter = document.getElementById('rmaCustomerSearch')?.value || '';
    const select = document.getElementById('rmaCustomerSelect');
    const countLabel = document.getElementById('rmaCustomerCount');
    if (!select) return;

    let customers = [];
    if (typeof getTicketCustomers === 'function') {
        customers = getTicketCustomers(filter);
    } else {
        const customCustomers = Array.isArray(datasets?.custom) ? datasets.custom : [];
        const rentalCustomers = Array.isArray(datasets?.rental) ? datasets.rental : [];
        const allCustomers = customCustomers.length > 0 ? customCustomers : rentalCustomers;
        
        const searchValue = filter.trim().toLowerCase();
        if (!searchValue) {
            customers = allCustomers;
        } else {
            customers = allCustomers.filter(c => {
                const firma = String(c.Firma || c.InhabeName || '').toLowerCase();
                const kundenNr = String(c.KundenNr || c.kundenNr || '').toLowerCase();
                return firma.includes(searchValue) || kundenNr.includes(searchValue);
            });
        }
    }

    let customerOptions = '<option value="">-- Müşteri Seçin --</option>';

    if (customers.length === 0) {
        customerOptions += '<option value="" disabled>Sonuç bulunamadı</option>';
    } else {
        customers.forEach((c, idx) => {
            const label = `${c.KundenNr || ''} - ${c.Firma || c.InhabeName || 'Bilinmeyen'}`;
            const selected = idx === 0 ? ' selected' : '';
            customerOptions += `<option value="${c.kKunde}" data-firma="${c.Firma || ''}" data-inhabe="${c.InhabeName || ''}" data-nr="${c.KundenNr || ''}" data-strasse="${c.Strasse || ''}" data-plz="${c.PLZ || ''}" data-ort="${c.Ort || ''}"${selected}>${label}</option>`;
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

// ---- RMA Signature Canvas & User Helpers ----
let rmaImzaCanvas = null;
let rmaImzaCtx = null;
let rmaImzaDrawing = false;
let rmaImzaInited = false;

function getRmaLoggedInUserName() {
    try {
        const ticketUserJson = localStorage.getItem('ticketUser');
        if (ticketUserJson) {
            const user = JSON.parse(ticketUserJson);
            if (user && (user.cName || user.cLogin)) {
                return (user.cName || user.cLogin).trim();
            }
        }
    } catch (e) { }
    return 'Yetkili Personel';
}

function toggleRmaImzaSection() {
    const cb = document.getElementById('rmaImzaEkle');
    const sec = document.getElementById('rmaImzaSection');
    const input = document.getElementById('rmaImzaPersonel');
    
    if (cb && cb.checked) {
        if (sec) sec.style.display = 'flex';
        if (input) input.value = getRmaLoggedInUserName();
        if (!rmaImzaInited) {
            initRmaImzaCanvas();
        } else {
            // Resize canvas if needed when made visible
            resizeRmaCanvas();
        }
    } else {
        if (sec) sec.style.display = 'none';
    }
}

function resizeRmaCanvas() {
    if (!rmaImzaCanvas) return;
    const rect = rmaImzaCanvas.getBoundingClientRect();
    if (rect.width > 0) {
        const temp = document.createElement('canvas');
        temp.width = rmaImzaCanvas.width;
        temp.height = rmaImzaCanvas.height;
        const tempCtx = temp.getContext('2d');
        tempCtx.drawImage(rmaImzaCanvas, 0, 0);

        rmaImzaCanvas.width = Math.round(rect.width || 600);
        rmaImzaCanvas.height = 150;
        
        rmaImzaCtx.strokeStyle = '#1a237e';
        rmaImzaCtx.lineWidth = 2.5;
        rmaImzaCtx.lineCap = 'round';
        rmaImzaCtx.lineJoin = 'round';
        rmaImzaCtx.drawImage(temp, 0, 0);
    }
}

function initRmaImzaCanvas() {
    rmaImzaCanvas = document.getElementById('rmaImzaCanvas');
    if (!rmaImzaCanvas) return;
    rmaImzaCtx = rmaImzaCanvas.getContext('2d');

    const rect = rmaImzaCanvas.getBoundingClientRect();
    rmaImzaCanvas.width = Math.round(rect.width || 600);
    rmaImzaCanvas.height = 150;

    rmaImzaCtx.strokeStyle = '#1a237e';
    rmaImzaCtx.lineWidth = 2.5;
    rmaImzaCtx.lineCap = 'round';
    rmaImzaCtx.lineJoin = 'round';

    const getPos = e => {
        const r = rmaImzaCanvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (rmaImzaCanvas.width / r.width),
            y: (e.clientY - r.top) * (rmaImzaCanvas.height / r.height)
        };
    };

    const getTPos = e => {
        const r = rmaImzaCanvas.getBoundingClientRect();
        const t = e.touches[0];
        return {
            x: (t.clientX - r.left) * (rmaImzaCanvas.width / r.width),
            y: (t.clientY - r.top) * (rmaImzaCanvas.height / r.height)
        };
    };

    rmaImzaCanvas.addEventListener('mousedown', e => {
        rmaImzaDrawing = true;
        const p = getPos(e);
        rmaImzaCtx.beginPath();
        rmaImzaCtx.moveTo(p.x, p.y);
    });
    rmaImzaCanvas.addEventListener('mousemove', e => {
        if (!rmaImzaDrawing) return;
        const p = getPos(e);
        rmaImzaCtx.lineTo(p.x, p.y);
        rmaImzaCtx.stroke();
    });
    rmaImzaCanvas.addEventListener('mouseup', () => rmaImzaDrawing = false);
    rmaImzaCanvas.addEventListener('mouseleave', () => rmaImzaDrawing = false);

    rmaImzaCanvas.addEventListener('touchstart', e => {
        e.preventDefault();
        rmaImzaDrawing = true;
        const p = getTPos(e);
        rmaImzaCtx.beginPath();
        rmaImzaCtx.moveTo(p.x, p.y);
    }, { passive: false });
    rmaImzaCanvas.addEventListener('touchmove', e => {
        e.preventDefault();
        if (!rmaImzaDrawing) return;
        const p = getTPos(e);
        rmaImzaCtx.lineTo(p.x, p.y);
        rmaImzaCtx.stroke();
    }, { passive: false });
    rmaImzaCanvas.addEventListener('touchend', () => rmaImzaDrawing = false);

    window.addEventListener('resize', () => {
        if (document.getElementById('rmaImzaEkle')?.checked) {
            resizeRmaCanvas();
        }
    });

    rmaImzaInited = true;
}

function rmaImzaTemizle() {
    if (!rmaImzaCanvas || !rmaImzaCtx) return;
    rmaImzaCtx.clearRect(0, 0, rmaImzaCanvas.width, rmaImzaCanvas.height);
}

function isRmaCanvasBlank() {
    if (!rmaImzaCanvas) return true;
    const blank = document.createElement('canvas');
    blank.width = rmaImzaCanvas.width;
    blank.height = rmaImzaCanvas.height;
    return rmaImzaCanvas.toDataURL() === blank.toDataURL();
}
