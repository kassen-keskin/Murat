let tseCurrentData = null;

let tseCustomerData = [];

async function loadTseCustomers() {
    if (tseCustomerData.length > 0) return; // already loaded
    
    try {
        const response = await fetch('/api/pos-customers');
        tseCustomerData = await response.json();
        updateTseCustomerOptions();
    } catch (error) {
        console.error('Error loading customers for TSE:', error);
    }
}

function updateTseCustomerOptions() {
    const filter = document.getElementById('tseCustomerSearch')?.value || '';
    const select = document.getElementById('tseCustomerSelect');
    const countLabel = document.getElementById('tseCustomerCount');
    if (!select) return;

    const searchValue = String(filter).trim().toLowerCase();
    
    let filteredCustomers = tseCustomerData;
    if (searchValue) {
        filteredCustomers = tseCustomerData.filter(c => {
            const firma = String(c.Firma || c.InhabeName || '').toLowerCase();
            const kundenNr = String(c.KundenNr || '').toLowerCase();
            return firma.includes(searchValue) || kundenNr.includes(searchValue);
        });
    }

    if (countLabel) {
        countLabel.textContent = filteredCustomers.length;
    }

    let customerOptions = '<option value="">-- Müşteri Seçin --</option>';

    if (filteredCustomers.length === 0) {
        customerOptions += '<option value="" disabled>Sonuç bulunamadı</option>';
    } else {
        filteredCustomers.forEach((c, idx) => {
            const nr = c.KundenNr || '';
            const firma = c.Firma || '';
            const inhabe = c.InhabeName || '';
            const ort = c.Ort || '';
            const label = `${nr} - ${firma} - ${inhabe} - ${ort}`;
            
            const selected = (searchValue && idx === 0) ? ' selected' : '';
            customerOptions += `<option value="${c.kKunde}"${selected}>${label}</option>`;
        });
    }

    select.innerHTML = customerOptions;

    // Automatically trigger change if a value is pre-selected by search
    if (searchValue && filteredCustomers.length > 0) {
        select.value = String(filteredCustomers[0].kKunde);
    }
}

function parseTseDataLocally(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    const decoder = new TextDecoder('ascii');
    const bytes = new Uint8Array(arrayBuffer);
    
    // TseDescription (288, 128 bytes)
    let descBytes = bytes.slice(288, 288 + 128);
    let nullIdx = descBytes.indexOf(0);
    if (nullIdx !== -1) descBytes = descBytes.slice(0, nullIdx);
    const TseDescription = decoder.decode(descBytes);

    // CertificateExpirationDate (64, 8 bytes uint64 BE)
    const high = dataView.getUint32(64, false);
    const low = dataView.getUint32(68, false);
    const expSeconds = (high * 4294967296) + low;
    let CertificateExpirationDateStr = "Invalid/Uninitialized";
    if (expSeconds > 0 && expSeconds < 253402300799) {
        const date = new Date(expSeconds * 1000);
        CertificateExpirationDateStr = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // TseSoftwareVersion (84: 2 bytes, 86: 1 byte, 87: 1 byte)
    const swMajor = dataView.getUint16(84, false);
    const swMinor = dataView.getUint8(86);
    const swBuild = dataView.getUint8(87);
    const TseSoftwareVersion = `${swMajor}.${swMinor}.${swBuild}`;

    // TseSerial (256, 32 bytes hex)
    const serialBytes = bytes.slice(256, 256 + 32);
    const TseSerial = Array.from(serialBytes).map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();

    return {
        TseDescription,
        CertificateExpirationDateStr,
        TseSoftwareVersion,
        TseSerial
    };
}

async function handleTseFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('tseScanStatus');
    const resultCard = document.getElementById('tseResultCard');
    const btnScan = document.getElementById('btnScanTse');
    
    statusDiv.textContent = "Dosya okunuyor... Lütfen bekleyin.";
    statusDiv.style.color = "var(--primary-color)";
    resultCard.style.display = "none";
    btnScan.disabled = true;
    tseCurrentData = null;

    try {
        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength < 512) {
            throw new Error("Geçersiz veya bozuk TSE_INFO.DAT dosyası.");
        }

        const data = parseTseDataLocally(arrayBuffer);

        statusDiv.textContent = "Veriler başarıyla okundu.";
        statusDiv.style.color = "#4caf50";
        
        document.getElementById('tseResSerial').textContent = data.TseSerial || "-";
        document.getElementById('tseResBsi').textContent = data.TseDescription || "-";
        document.getElementById('tseResDate').textContent = data.CertificateExpirationDateStr || "-";
        document.getElementById('tseResVer').textContent = data.TseSoftwareVersion || "-";
        
        tseCurrentData = data;
        resultCard.style.display = "block";
    } catch (error) {
        statusDiv.textContent = "Hata: " + error.message;
        statusDiv.style.color = "#ef5350";
    } finally {
        btnScan.disabled = false;
        event.target.value = ''; // Reset file input
    }
}

async function saveTse() {
    if (!tseCurrentData) {
        alert("Lütfen önce USB'den tarama yapın.");
        return;
    }
    
    const select = document.getElementById('tseCustomerSelect');
    const kKunde = select.value;
    
    if (!kKunde) {
        alert("Lütfen bir müşteri seçin.");
        return;
    }
    
    const btnSave = document.getElementById('btnSaveTse');
    const oldText = btnSave.textContent;
    btnSave.textContent = "Veriler Yükleniyor...";
    btnSave.disabled = true;
    
    try {
        const response = await fetch(`/api/tse/customer/${kKunde}`);
        const oldData = await response.json();
        
        if (!response.ok) {
            alert("Hata: " + (oldData.error || "Mevcut TSE bilgileri alınamadı."));
            return;
        }

        // Set Modal Title
        const selectedOptionText = select.options[select.selectedIndex].text;
        document.getElementById('tseConfirmModalTitle').textContent = `TSE Güncelleme Onayı - ${selectedOptionText}`;

        // Fill Old Data
        document.getElementById('tseOldSerial').textContent = oldData.TseSerial || "-";
        document.getElementById('tseOldBsi').textContent = oldData.TseDescription || "-";
        document.getElementById('tseOldDate').textContent = oldData.CertificateExpirationDateStr || "-";
        document.getElementById('tseOldVer').textContent = oldData.TseSoftwareVersion || "-";

        // Fill New Data
        document.getElementById('tseNewSerial').textContent = tseCurrentData.TseSerial || "-";
        document.getElementById('tseNewBsi').textContent = tseCurrentData.TseDescription || "-";
        document.getElementById('tseNewDate').textContent = tseCurrentData.CertificateExpirationDateStr || "-";
        document.getElementById('tseNewVer').textContent = tseCurrentData.TseSoftwareVersion || "-";

        document.getElementById('tseConfirmModalOverlay').style.display = 'flex';
    } catch (error) {
        alert("Bağlantı hatası: " + error.message);
    } finally {
        btnSave.textContent = oldText;
        btnSave.disabled = false;
    }
}

function closeTseConfirmModal() {
    document.getElementById('tseConfirmModalOverlay').style.display = 'none';
    
    // Reset search and selection
    const searchInput = document.getElementById('tseCustomerSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Call the update function to re-render the select with no filter
    if (typeof updateTseCustomerOptions === 'function') {
        updateTseCustomerOptions();
    }
    
    // Explicitly set select back to default empty option
    const select = document.getElementById('tseCustomerSelect');
    if (select) {
        select.value = '';
    }
}

async function saveTseConfirm() {
    const select = document.getElementById('tseCustomerSelect');
    const kKunde = select.value;
    
    if (!kKunde || !tseCurrentData) {
        closeTseConfirmModal();
        return;
    }
    
    const payload = {
        kKunde: kKunde,
        TseSerial: tseCurrentData.TseSerial,
        TseDescription: tseCurrentData.TseDescription,
        CertificateExpirationDateStr: tseCurrentData.CertificateExpirationDateStr
    };
    
    try {
        const response = await fetch('/api/tse/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert("TSE verileri başarıyla veritabanına kaydedildi!");
            closeTseConfirmModal();
        } else {
            alert("Hata: " + (data.error || "Bilinmeyen hata"));
        }
    } catch (error) {
        alert("Bağlantı hatası: " + error.message);
    }
}

