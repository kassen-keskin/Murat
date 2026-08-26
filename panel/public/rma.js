// rma.js
async function initRmaTab() {
    // Populate Customer Dropdown
    try {
        const response = await fetch('/api/customers');
        if (response.ok) {
            const customers = await response.json();
            const select = document.getElementById('rmaCustomerSelect');
            select.innerHTML = '<option value="">-- Müşteri Seçin --</option>';
            customers.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.kKunde;
                opt.textContent = `${c.KundenNr || ''} - ${c.Firma || c.InhabeName || 'Bilinmiyor'}`;
                // Store data in data attributes for print view
                opt.dataset.firma = c.Firma || '';
                opt.dataset.inhabe = c.InhabeName || '';
                opt.dataset.nr = c.KundenNr || '';
                opt.dataset.strasse = c.Strasse || '';
                opt.dataset.plz = c.PLZ || '';
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error loading customers for RMA:", e);
    }

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
    const customerHtml = `${opt.dataset.nr} - ${opt.dataset.firma}\n${opt.dataset.inhabe}\n${opt.dataset.strasse}\n${opt.dataset.plz}`;
    document.getElementById('rmaPrintCustomer').textContent = customerHtml.trim().replace(/\n+/g, '\n');
    
    // Set inputs
    const modelVal = document.getElementById('rmaModel').value.trim();
    const betreffVal = document.getElementById('rmaBetreff').value.trim();
    
    document.getElementById('rmaPrintModel').textContent = modelVal || '-';
    document.getElementById('rmaPrintSernr').textContent = document.getElementById('rmaSernr').value || '-';
    document.getElementById('rmaPrintBetreff').textContent = betreffVal || '-';
    document.getElementById('rmaPrintDescription').textContent = document.getElementById('rmaDescription').value || '';
    
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
    checkboxes.forEach(cb => {
        const li = document.createElement('li');
        li.textContent = cb.value;
        itemsList.appendChild(li);
    });

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
        const canvas = await html2canvas(printArea, { scale: 2 });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
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
