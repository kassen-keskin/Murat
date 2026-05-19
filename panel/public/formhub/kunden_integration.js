document.addEventListener('DOMContentLoaded', () => {
    // 1. Identify the current page name from URL
    const pathname = window.location.pathname;
    const pageName = pathname.split('/').pop().replace('.html', '') || 'index';

    // 2. Create the UI
    const searchContainer = document.createElement('div');
    searchContainer.className = 'kunden-search-container d-flex flex-wrap gap-2 align-items-center mb-3 p-3 rounded shadow-sm no-print';
    searchContainer.style.cssText = 'background-color: var(--card-bg, var(--form-section-bg, #ffffff)); border: 1px solid var(--border-color-light, #ddd); color: var(--text-color, var(--text-color-primary, #333)); font-family: "Inter", sans-serif; max-width: 800px; margin: 15px auto; width: 100%;';
    
    // Attempt to match the Bootstrap style of the surrounding site, or provide sensible fallbacks
    searchContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; width: 100%;">
            <span style="font-weight: 600; font-size: 14px;"><i class="fas fa-search" style="margin-right: 5px;"></i> Kunden Ara:</span>
            <input type="text" id="kundenSearchInput" style="padding: 8px 12px; border: 1px solid var(--border-color-input, #ccc); border-radius: 6px; flex: 1; min-width: 150px; background: transparent; color: inherit;" placeholder="KundenNr girin...">
            <button type="button" id="kundenSearchBtn" style="padding: 8px 16px; background-color: #0d6efd; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Bul ve Doldur</button>
            <button type="button" id="kundenMappingBtn" style="padding: 8px 16px; background-color: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; margin-left: auto;">
                <i class="fas fa-cogs" style="margin-right: 5px;"></i> Eşleşme Paneli
            </button>
        </div>
        <div id="kundenSearchMsg" style="width: 100%; margin-top: 10px; font-size: 13px; font-weight: 600; display: none;"></div>
    `;

    // 3. Insert the UI at the top
    const explicitTarget = document.querySelector('.kunden-search-target');
    if (explicitTarget) {
        searchContainer.style.margin = '0';
        searchContainer.style.maxWidth = 'none';
        searchContainer.style.border = 'none';
        searchContainer.style.boxShadow = 'none';
        searchContainer.style.backgroundColor = 'transparent';
        searchContainer.style.padding = '0';
        searchContainer.classList.remove('p-3', 'mb-3', 'shadow-sm');
        explicitTarget.appendChild(searchContainer);
    } else {
        const appContainer = document.querySelector('.form-container') || document.querySelector('.container') || document.querySelector('.app-container') || document.body;
        if (appContainer === document.body) {
            document.body.insertBefore(searchContainer, document.body.firstChild);
        } else {
            appContainer.insertBefore(searchContainer, appContainer.firstChild);
        }
    }

    // Include FontAwesome if not present
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
        document.head.appendChild(fa);
    }

    // 4. Attach Event Listeners
    document.getElementById('kundenSearchBtn').addEventListener('click', () => {
        const kundenNr = document.getElementById('kundenSearchInput').value.trim();
        if (kundenNr) {
            searchKunde(kundenNr, pageName);
        } else {
            showMessage('Lütfen bir KundenNr girin.', 'red');
        }
    });

    document.getElementById('kundenSearchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('kundenSearchBtn').click();
        }
    });

    document.getElementById('kundenMappingBtn').addEventListener('click', () => {
        openMappingPanel(pageName);
    });

    function showMessage(msg, color) {
        const msgDiv = document.getElementById('kundenSearchMsg');
        msgDiv.textContent = msg;
        msgDiv.style.color = color;
        msgDiv.style.display = 'block';
        setTimeout(() => { msgDiv.style.display = 'none'; }, 5000);
    }

    async function searchKunde(kundenNr, formId) {
        showMessage('Aranıyor...', 'orange');
        try {
            // 1. Fetch Kunde Data
            const resKunde = await fetch(`/api/kunde/${kundenNr}?_=${new Date().getTime()}`);
            if (!resKunde.ok) {
                showMessage('Kunde bulunamadı!', 'red');
                return;
            }
            const kundeData = await resKunde.json();

            // 2. Fetch Mappings
            const resMapping = await fetch(`/api/mappings/${formId}?_=${new Date().getTime()}`);
            const mappingData = await resMapping.json();

            if (Object.keys(mappingData).length === 0) {
                showMessage('Kayıt bulundu ancak bu sayfa için eşleşme (mapping) ayarı yapılmamış. Lütfen Eşleşme Panelinden ayarları yapın.', 'orange');
                return;
            }

            // 3. Fill the form
            let filledCount = 0;
            for (const [fieldId, dbColumn] of Object.entries(mappingData)) {
                if (dbColumn && kundeData[dbColumn] !== undefined && kundeData[dbColumn] !== null) {
                    const el = document.getElementById(fieldId);
                    if (el) {
                        // Special handling for some elements if needed, like Anrede
                        if (el.tagName === 'SELECT') {
                            // Try exact match
                            let valueSet = false;
                            for (let i = 0; i < el.options.length; i++) {
                                if (el.options[i].value == kundeData[dbColumn] || el.options[i].text == kundeData[dbColumn]) {
                                    el.selectedIndex = i;
                                    valueSet = true;
                                    break;
                                }
                            }
                            // Specific hack for Anrede if needed (1=Herrn, 2=Frau)
                            if (!valueSet && dbColumn === 'Anrede') {
                                const val = kundeData[dbColumn].toLowerCase();
                                if (val.includes('herr')) el.value = "1";
                                else if (val.includes('frau')) el.value = "2";
                                // Check beyond-form style (Herr, Frau)
                                else if (val.includes('herr')) el.value = "Herr";
                                else if (val.includes('frau')) el.value = "Frau";
                            }
                        } else {
                            // Date fields might need formatting
                            if (el.type === 'date' && typeof kundeData[dbColumn] === 'string') {
                                let dateStr = kundeData[dbColumn];
                                const parts = dateStr.split('.');
                                if (parts.length === 3) {
                                    el.value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                } else if (dateStr.includes('T')) {
                                    el.value = dateStr.split('T')[0];
                                } else {
                                    el.value = dateStr;
                                }
                            } else {
                                el.value = kundeData[dbColumn];
                            }
                        }
                        
                        // Trigger input/change events so other scripts (like fetchCity) can react
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        filledCount++;
                    }
                }
            }

            showMessage(`Başarılı! ${filledCount} alan dolduruldu.`, 'green');

        } catch (error) {
            console.error(error);
            showMessage('Bir hata oluştu.', 'red');
        }
    }

    function openMappingPanel(formId) {
        // Collect all relevant input IDs
        const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
        const fieldList = [];

        inputs.forEach(el => {
            if (el.id && el.id !== 'kundenSearchInput' && el.type !== 'hidden' && el.type !== 'file') {
                // Try to find a label for context
                let labelText = '';
                const label = document.querySelector(`label[for="${el.id}"]`);
                if (label) {
                    labelText = label.textContent.trim();
                } else {
                    const parentLabel = el.closest('label');
                    if (parentLabel) labelText = parentLabel.textContent.trim();
                    else labelText = el.placeholder || '';
                }
                
                fieldList.push({
                    id: el.id,
                    label: labelText,
                    type: el.tagName + (el.type ? ` (${el.type})` : '')
                });
            }
        });

        // Save to localStorage so the new tab can read it
        localStorage.setItem(`mapping_fields_${formId}`, JSON.stringify(fieldList));

        // Open mapping panel in a new tab
        window.open(`mapping-panel.html?form=${formId}`, '_blank');
    }
});
