// Teslimat Prosedürü JS Logic

let teslimatConfig = { steps: [] };
let teslimatAdminMode = false;
let teslimatImzaPad = null;

// Initialize when tab is opened
async function initTeslimatTab() {
    await loadTeslimatConfig();
    await loadTeslimatTemsilciler();
    initTeslimatImzaPad();
    
    // Default: render checklist view
    renderTeslimatChecklist();
    
    // Set today's date
    const today = new Date();
    document.getElementById('teslimatImzaTarih').textContent = today.toLocaleDateString('tr-TR');
}

function toggleTeslimatAdminPanel() {
    teslimatAdminMode = !teslimatAdminMode;
    const adminPanel = document.getElementById('teslimatAdminPanel');
    const checklistContainer = document.getElementById('teslimatChecklistContainer');
    const imzaSection = document.getElementById('teslimatImzaSection');
    const pdfRow = document.getElementById('teslimatPdfRow');
    
    if (teslimatAdminMode) {
        adminPanel.style.display = 'flex';
        checklistContainer.style.display = 'none';
        if (imzaSection) imzaSection.style.display = 'none';
        if (pdfRow) pdfRow.style.display = 'none';
        renderTeslimatAdmin();
    } else {
        adminPanel.style.display = 'none';
        checklistContainer.style.display = 'block';
        if (imzaSection) imzaSection.style.display = 'flex';
        if (pdfRow) pdfRow.style.display = 'flex';
        renderTeslimatChecklist();
    }
}

async function loadTeslimatConfig() {
    try {
        const response = await fetch('/api/teslimat_config');
        if (response.ok) {
            teslimatConfig = await response.json();
            if (!teslimatConfig.steps) teslimatConfig.steps = [];
        }
    } catch (error) {
        console.error("Error loading teslimat config:", error);
    }
}

async function saveTeslimatConfig() {
    // Rebuild config from DOM
    const steps = [];
    const stepCards = document.querySelectorAll('.teslimat-step-card');
    
    stepCards.forEach((card, stepIndex) => {
        const titleInput = card.querySelector('.teslimat-step-title-input');
        const step = {
            id: `step_${Date.now()}_${stepIndex}`,
            title: titleInput.value,
            questions: []
        };
        
        const questionCards = card.querySelectorAll('.teslimat-question-card');
        questionCards.forEach((qCard, qIndex) => {
            const qInput = qCard.querySelector('.teslimat-question-input');
            const typeSelect = qCard.querySelector('.teslimat-type-select');
            
            const question = {
                id: `q_${Date.now()}_${stepIndex}_${qIndex}`,
                text: qInput.value,
                type: typeSelect.value,
                options: []
            };
            
            if (typeSelect.value === 'checkbox' || typeSelect.value === 'radio') {
                const optInputs = qCard.querySelectorAll('.teslimat-option-input');
                optInputs.forEach(optInput => {
                    if (optInput.value.trim() !== '') {
                        question.options.push(optInput.value.trim());
                    }
                });
            }
            
            step.questions.push(question);
        });
        
        steps.push(step);
    });
    
    teslimatConfig.steps = steps;
    
    try {
        const response = await fetch('/api/teslimat_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teslimatConfig)
        });
        
        if (response.ok) {
            alert("Teslimat Prosedürü başarıyla kaydedildi!");
            toggleTeslimatAdminPanel(); // Switch back to checklist view
        } else {
            alert("Kaydetme sırasında bir hata oluştu.");
        }
    } catch (error) {
        console.error("Error saving teslimat config:", error);
        alert("Kaydetme başarısız oldu.");
    }
}

// ADMIN PANEL RENDERING
function renderTeslimatAdmin() {
    const container = document.getElementById('teslimatAdminStepsContainer');
    container.innerHTML = '';
    
    teslimatConfig.steps.forEach((step, sIndex) => {
        container.appendChild(createAdminStepElement(step, sIndex));
    });
}

// DRAG AND DROP HANDLERS
let dragSrcEl = null;

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (dragSrcEl !== this) {
        const container = this.parentNode;
        const allItems = Array.from(container.querySelectorAll('.teslimat-step-card'));
        const srcIndex = allItems.indexOf(dragSrcEl);
        const targetIndex = allItems.indexOf(this);
        
        if (srcIndex < targetIndex) {
            container.insertBefore(dragSrcEl, this.nextSibling);
        } else {
            container.insertBefore(dragSrcEl, this);
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const items = document.querySelectorAll('.teslimat-step-card');
    items.forEach(function (item) {
        item.classList.remove('drag-over');
    });
}

function createAdminStepElement(step = { title: '', questions: [] }, sIndex = null) {
    const div = document.createElement('div');
    div.className = 'teslimat-step-card';
    div.draggable = true;
    
    // Drag events
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);
    div.addEventListener('dragenter', handleDragEnter);
    div.addEventListener('dragleave', handleDragLeave);
    div.addEventListener('dragend', handleDragEnd);
    
    const header = document.createElement('div');
    header.className = 'teslimat-step-header';
    
    // Drag handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '☰';
    dragHandle.title = "Sürükle bırak ile sıralamayı değiştir";
    
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'teslimat-step-title-input';
    titleInput.placeholder = 'Aşama Başlığı (Örn: Kurulum İşlemleri)';
    titleInput.value = step.title;
    
    const actionsDiv = document.createElement('div');
    
    const addQBtn = document.createElement('button');
    addQBtn.className = 'btn-s secondary';
    addQBtn.textContent = '+ Soru Ekle';
    addQBtn.onclick = () => {
        const qContainer = div.querySelector('.teslimat-questions-container');
        qContainer.appendChild(createAdminQuestionElement());
    };
    
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-s btn-danger';
    delBtn.textContent = '🗑️ Sil';
    delBtn.style.marginLeft = '10px';
    delBtn.onclick = () => div.remove();
    
    actionsDiv.appendChild(addQBtn);
    actionsDiv.appendChild(delBtn);
    
    // Collapse toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-ico collapse-toggle';
    toggleBtn.innerHTML = '▼';
    toggleBtn.title = "Daralt / Genişlet";
    toggleBtn.onclick = () => {
        div.classList.toggle('collapsed');
        toggleBtn.innerHTML = div.classList.contains('collapsed') ? '▶' : '▼';
    };
    
    // Header setup
    header.appendChild(dragHandle);
    header.appendChild(toggleBtn);
    header.appendChild(titleInput);
    header.appendChild(actionsDiv);
    
    const qContainer = document.createElement('div');
    qContainer.className = 'teslimat-questions-container';
    
    step.questions.forEach(q => {
        qContainer.appendChild(createAdminQuestionElement(q));
    });
    
    // By default, if it has questions, start collapsed to make dragging easy
    if (step.questions.length > 0) {
        div.classList.add('collapsed');
        toggleBtn.innerHTML = '▶';
    }
    
    div.appendChild(header);
    div.appendChild(qContainer);
    
    return div;
}

function createAdminQuestionElement(question = { text: '', type: 'checkbox', options: [] }) {
    const div = document.createElement('div');
    div.className = 'teslimat-question-card';
    
    const header = document.createElement('div');
    header.className = 'teslimat-question-header';
    
    const qInput = document.createElement('input');
    qInput.type = 'text';
    qInput.className = 'teslimat-question-input';
    qInput.placeholder = 'Soru metni...';
    qInput.value = question.text;
    
    const typeSelect = document.createElement('select');
    typeSelect.className = 'teslimat-type-select';
    typeSelect.innerHTML = `
        <option value="checkbox" ${question.type === 'checkbox' ? 'selected' : ''}>Çoklu Seçim (Checkbox)</option>
        <option value="radio" ${question.type === 'radio' ? 'selected' : ''}>Tekil Seçim (Radio)</option>
        <option value="text" ${question.type === 'text' ? 'selected' : ''}>Metin Girişi (Text)</option>
    `;
    
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-s btn-danger';
    delBtn.textContent = 'X';
    delBtn.onclick = () => div.remove();
    
    header.appendChild(qInput);
    header.appendChild(typeSelect);
    header.appendChild(delBtn);
    
    const optsContainer = document.createElement('div');
    optsContainer.className = 'teslimat-options-container';
    
    // Setup options if type supports it
    const renderOptions = () => {
        optsContainer.innerHTML = '';
        if (typeSelect.value === 'checkbox' || typeSelect.value === 'radio') {
            const optsToRender = question.options.length > 0 ? question.options : [''];
            optsToRender.forEach(opt => {
                optsContainer.appendChild(createAdminOptionElement(opt));
            });
            
            const addOptBtn = document.createElement('button');
            addOptBtn.className = 'btn-s';
            addOptBtn.style.marginTop = '5px';
            addOptBtn.textContent = '+ Seçenek Ekle';
            addOptBtn.onclick = () => {
                optsContainer.insertBefore(createAdminOptionElement(), addOptBtn);
            };
            optsContainer.appendChild(addOptBtn);
        } else {
            optsContainer.innerHTML = '<span style="color:var(--text-muted);font-size:0.9rem;">Bu soru tipi için kullanıcı metin girecektir.</span>';
        }
    };
    
    typeSelect.addEventListener('change', renderOptions);
    renderOptions();
    
    div.appendChild(header);
    div.appendChild(optsContainer);
    
    return div;
}

function createAdminOptionElement(text = '') {
    const row = document.createElement('div');
    row.className = 'teslimat-option-row';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'teslimat-option-input';
    input.placeholder = 'Seçenek metni...';
    input.value = text;
    
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-s btn-danger';
    delBtn.textContent = 'x';
    delBtn.onclick = () => row.remove();
    
    row.appendChild(input);
    row.appendChild(delBtn);
    return row;
}

function addTeslimatStep() {
    const container = document.getElementById('teslimatAdminStepsContainer');
    container.appendChild(createAdminStepElement());
}

// CHECKLIST RENDERING
function renderTeslimatChecklist() {
    const container = document.getElementById('teslimatChecklistContainer');
    container.innerHTML = '';
    
    if (!teslimatConfig.steps || teslimatConfig.steps.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Henüz hiç aşama tanımlanmamış. Yönetim panelinden ekleyebilirsiniz.</div>';
        return;
    }
    
    teslimatConfig.steps.forEach(step => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'checklist-step';
        
        const title = document.createElement('h3');
        title.className = 'checklist-step-title';
        title.textContent = step.title;
        stepDiv.appendChild(title);
        
        step.questions.forEach(q => {
            const qDiv = document.createElement('div');
            qDiv.className = 'checklist-question';
            
            const qText = document.createElement('div');
            qText.className = 'checklist-question-text';
            qText.textContent = q.text;
            qDiv.appendChild(qText);
            
            const optsDiv = document.createElement('div');
            optsDiv.className = 'checklist-options';
            
            if (q.type === 'text') {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'checklist-text-input';
                input.placeholder = 'Cevabınızı buraya yazınız...';
                optsDiv.appendChild(input);
            } else if (q.type === 'checkbox' || q.type === 'radio') {
                q.options.forEach((opt, oIndex) => {
                    const label = document.createElement('label');
                    label.className = 'checklist-option-label';
                    
                    const input = document.createElement('input');
                    input.type = q.type;
                    input.name = q.id; // Group radios by question ID
                    input.value = opt;
                    
                    label.appendChild(input);
                    label.appendChild(document.createTextNode(' ' + opt));
                    optsDiv.appendChild(label);
                });
            }
            
            qDiv.appendChild(optsDiv);
            stepDiv.appendChild(qDiv);
        });
        
        container.appendChild(stepDiv);
    });
}

// SIGNATURE & TEMSILCILER
async function loadTeslimatTemsilciler() {
    try {
        const response = await fetch('/api/satis');
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('teslimatImzaTemsilci');
            select.innerHTML = '<option value="">-- Seçiniz --</option>';
            
            if (data.temsilciler && Array.isArray(data.temsilciler)) {
                data.temsilciler.forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.name;
                    opt.textContent = t.name;
                    select.appendChild(opt);
                });
            }
        }
    } catch (error) {
        console.error("Error loading satis data for temsilciler:", error);
    }
}

function initTeslimatImzaPad() {
    const canvas = document.getElementById('teslimatImzaCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Fit canvas to parent
    const resizeCanvas = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        ctx.scale(ratio, ratio);
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Clear canvas background to white for PDF export
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = getCoordinates(e);
    }
    
    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scrolling on touch
        const [x, y] = getCoordinates(e);
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        [lastX, lastY] = [x, y];
    }
    
    function stopDrawing() {
        isDrawing = false;
    }
    
    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return [
                e.touches[0].clientX - rect.left,
                e.touches[0].clientY - rect.top
            ];
        }
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing, {passive: false});
    canvas.addEventListener('touchmove', draw, {passive: false});
    canvas.addEventListener('touchend', stopDrawing);
}

function teslimatImzaTemizle() {
    const canvas = document.getElementById('teslimatImzaCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function teslimatFormSifirla() {
    if (!confirm('Tüm form verileri silinecek. Emin misiniz?')) return;
    
    // Clear inputs and selections
    renderTeslimatChecklist();
    
    // Reset selections
    document.getElementById('teslimatImzaTemsilci').value = '';
    document.getElementById('teslimatImzaMusteriAdi').value = '';
    
    // Reset signature
    teslimatImzaTemizle();
    
    // Reset date to today
    const today = new Date();
    document.getElementById('teslimatImzaTarih').textContent = today.toLocaleDateString('tr-TR');
    
    // Scroll to top
    document.querySelector('.satis-inner').scrollTop = 0;
}

// PDF GENERATION
async function teslimatPdfOlustur() {
    const temsilci = document.getElementById('teslimatImzaTemsilci').value;
    const musteri = document.getElementById('teslimatImzaMusteriAdi').value;
    
    if (!temsilci) {
        alert("Lütfen Satış Temsilcisi seçiniz.");
        return;
    }
    
    if (!musteri) {
        alert("Lütfen Müşteri Adı giriniz.");
        return;
    }

    const { jsPDF } = window.jspdf;
    
    // Create a temporary container for printing to ensure white background and dark text
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = '';
    printArea.style.display = 'block';
    printArea.style.position = 'absolute';
    printArea.style.left = '-9999px';
    printArea.style.top = '0';
    printArea.style.width = '210mm'; // A4 width
    printArea.style.backgroundColor = '#ffffff';
    printArea.style.color = '#000000';
    printArea.style.padding = '20mm';
    printArea.style.fontFamily = 'Arial, sans-serif';
    
    // Header
    let html = `
        <div style="text-align:center; margin-bottom: 20px;">
            <h1 style="font-size:24px; border-bottom: 2px solid #000; padding-bottom:10px;">Kasa Teslimat Prosedürü</h1>
        </div>
        <div style="margin-bottom: 20px; font-size: 14px;">
            <strong>Müşteri:</strong> ${musteri}<br>
            <strong>Tarih:</strong> ${document.getElementById('teslimatImzaTarih').textContent}<br>
            <strong>Satış Temsilcisi:</strong> ${temsilci}
        </div>
    `;
    
    // Checklist content
    const steps = document.querySelectorAll('#teslimatChecklistContainer .checklist-step');
    steps.forEach((stepDiv, index) => {
        const title = stepDiv.querySelector('.checklist-step-title').textContent;
        html += `<h2 style="font-size:18px; margin-top:20px; color:#333; border-bottom:1px solid #ccc;">${index + 1}. ${title}</h2>`;
        
        const questions = stepDiv.querySelectorAll('.checklist-question');
        questions.forEach(qDiv => {
            const qText = qDiv.querySelector('.checklist-question-text').textContent;
            html += `<div style="margin-bottom: 10px;"><strong>Soru:</strong> ${qText}</div>`;
            
            const textInput = qDiv.querySelector('input[type="text"]');
            if (textInput) {
                html += `<div style="margin-bottom: 15px; padding-left:15px;">Cevap: ${textInput.value || '______________'}</div>`;
            } else {
                const checkedOpts = Array.from(qDiv.querySelectorAll('input:checked')).map(el => el.value);
                if (checkedOpts.length > 0) {
                    html += `<div style="margin-bottom: 15px; padding-left:15px;">Seçilenler: ${checkedOpts.join(', ')}</div>`;
                } else {
                    html += `<div style="margin-bottom: 15px; padding-left:15px;"><em>Seçim yapılmadı</em></div>`;
                }
            }
        });
    });
    
    // Signatures
    const canvas = document.getElementById('teslimatImzaCanvas');
    const signatureImage = canvas.toDataURL('image/png');
    
    html += `
        <div style="margin-top: 50px; display:flex; justify-content:space-between;">
            <div style="width: 45%;">
                <strong>Satış Temsilcisi / Tekniker</strong><br>
                ${temsilci}
                <div style="margin-top:40px; border-top:1px solid #000; width:80%;">İmza</div>
            </div>
            <div style="width: 45%;">
                <strong>Müşteri / Yetkili</strong><br>
                ${musteri}
                <div style="margin-top:10px;">
                    <img src="${signatureImage}" style="max-width:100%; height:60px;">
                </div>
                <div style="border-top:1px solid #000; width:80%;">İmza</div>
            </div>
        </div>
    `;
    
    printArea.innerHTML = html;
    
    try {
        const canvasOutput = await html2canvas(printArea, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
        });
        
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const W = 210, H = 297;
        const ratio = canvasOutput.height / canvasOutput.width;
        const pdfH = W * ratio;
        
        if (pdfH <= H) {
            pdf.addImage(canvasOutput.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, W, pdfH);
        } else {
            const pageH_px = (H / pdfH) * canvasOutput.height;
            let srcY = 0, page = 0;
            
            while (srcY < canvasOutput.height && page < 15) {
                if (page > 0) pdf.addPage();
                
                let endY = Math.min(srcY + pageH_px, canvasOutput.height);
                const chunkH = Math.ceil(endY - srcY);
                if (chunkH <= 0) break;
                
                const tmp = document.createElement('canvas');
                tmp.width = canvasOutput.width;
                tmp.height = chunkH;
                tmp.getContext('2d').drawImage(canvasOutput, 0, srcY, canvasOutput.width, chunkH, 0, 0, canvasOutput.width, chunkH);
                
                const sliceH_mm = W * (chunkH / canvasOutput.width);
                pdf.addImage(tmp.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, sliceH_mm);
                
                srcY = endY;
                page++;
            }
        }
        
        const filename = `Teslimat_${musteri.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.pdf`;
        pdf.save(filename);
        
    } catch (error) {
        console.error("PDF generation error:", error);
        alert("PDF oluşturulurken bir hata meydana geldi.");
    } finally {
        printArea.innerHTML = '';
        printArea.style.display = 'none';
    }
}
