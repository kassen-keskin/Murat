let currentLang = 'de';

function setLanguage(lang) {
    if(!translations[lang]) return;
    currentLang = lang;
    
    document.getElementById('btn-lang-de').style.color = lang === 'de' ? 'var(--text-primary)' : 'var(--text-secondary)';
    document.getElementById('btn-lang-tr').style.color = lang === 'tr' ? 'var(--text-primary)' : 'var(--text-secondary)';
    
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if(translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    updateSummary(); // Refresh wizard names if state already loaded
    renderSummaryOutput();
}

const wizardState = {
    planName: 'Tarife 2',
    monthlyPrice: 59,
    setupPrice: 1438,
    packageName: 'Tarife 2',
    hardwareMonthly: [],
    hardwareSetup: [],
    totalMonthly: 59,
    totalSetup: 1438,
    isOneTime: false
};

function openWizard(e, selectedPlan = null) {
    if (e) e.preventDefault();
    
    if (selectedPlan) {
        const radios = document.getElementsByName('plan');
        for (let radio of radios) {
            if (radio.value === selectedPlan) {
                radio.checked = true;
                break;
            }
        }
    }
    
    if (selectedPlan === 'basis') {
        const hardwareJasswayInput = document.getElementById('extra_hardware_jassway');
        if (hardwareJasswayInput) hardwareJasswayInput.checked = true;
    }

    if (selectedPlan === 'jassway') {
        const hardwareJasswayIncludedInput = document.getElementById('extra_hardware_jassway_included');
        if (hardwareJasswayIncludedInput) hardwareJasswayIncludedInput.checked = true;
    }

    if (selectedPlan === 'proxj500') {
        const hardwareProxInput = document.getElementById('extra_hardware_prox');
        if (hardwareProxInput) hardwareProxInput.checked = true;
    }

    updateSummary();
    nextWizardStep(2);
    document.getElementById('wizardOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeWizard() {
    document.getElementById('wizardOverlay').classList.remove('show');
    document.body.style.overflow = 'auto';
    setTimeout(() => {
        nextWizardStep(1);
        document.getElementById('checkoutForm').reset();
    }, 400);
}

function nextWizardStep(stepNum) {
    document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
    document.querySelectorAll('.wizard-step-indicator').forEach(ind => ind.classList.remove('active'));
    
    const nextStep = document.getElementById(`wizardStep${stepNum}`);
    if(nextStep) nextStep.classList.add('active');
    
    if (stepNum <= 3) {
        document.getElementById(`stepIndicator${stepNum}`).classList.add('active');
    }
    if (stepNum === 3) {
        renderSummaryOutput();
    }
}

function setVisible(elementId, visible) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.style.display = visible ? 'block' : 'none';
}

function toggleDisplayOption(otherId) {
    const other = document.getElementById(otherId);
    if (other) other.checked = false;
}

function configurePlanExtras(selectedPlanValue) {
    const isPlan1 = selectedPlanValue === 'basis';
    const isPlan2 = selectedPlanValue === 'jassway';

    const resetField = (fieldId) => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        const input = field.querySelector('input');
        if (input) {
            input.checked = false;
        }
    };

    setVisible('field_fullservice_included', true);
    setVisible('field_hardware_jassway_monthly', isPlan1);
    setVisible('field_hardware_prox_included', isPlan2);
    setVisible('field_barcodescanner_monthly', false);
    setVisible('field_barcodescanner_once', true);
    setVisible('field_vfd_once', isPlan2);
    setVisible('field_kunden_touch_once', isPlan2);
    setVisible('field_training_included', true);

    if (isPlan1) {
        const hwInput = document.getElementById('extra_hardware_jassway');
        if (hwInput) hwInput.checked = true;
    }
    if (isPlan2) {
        const hwInputProx = document.getElementById('extra_hardware_prox');
        if (hwInputProx) hwInputProx.checked = true;
    }

    if (!isPlan1) resetField('field_hardware_jassway_monthly');
    if (!isPlan2) resetField('field_hardware_prox_included');
    resetField('field_barcodescanner_monthly');
    if (!isPlan2) {
        resetField('field_vfd_once');
        resetField('field_kunden_touch_once');
    }

    const trainingInput = document.getElementById('extra_training_included');
    const trainingPriceEl = document.getElementById('trainingIncludedPrice');
    if (trainingInput && trainingPriceEl) {
        trainingInput.setAttribute('data-display-price', '0');
        trainingPriceEl.innerHTML = '0,00 € <span data-i18n="included_tag">(inklusive)</span>';
    }
}

function updateSummary() {
    const selectedPlanElement = document.querySelector('input[name="plan"]:checked');
    if (selectedPlanElement) {
        if(selectedPlanElement.value === 'basis') {
            wizardState.planName = 'Jassway Olimpia';
            wizardState.monthlyPrice = 59;
            wizardState.setupPrice = 1200;
            wizardState.packageName = 'Jassway Olimpia';
            wizardState.isOneTime = true;
        } else if(selectedPlanElement.value === 'jassway') {
            wizardState.planName = 'Prox J500';
            wizardState.monthlyPrice = 59;
            wizardState.setupPrice = 1400;
            wizardState.packageName = 'Prox J500';
            wizardState.isOneTime = true;
        }
        configurePlanExtras(selectedPlanElement.value);
    }

    wizardState.hardwareMonthly = [];
    wizardState.hardwareSetup = [];
    let hwMonthlyTotal = 0;
    let hwSetupTotal = 0;

    const extraSelection = document.querySelectorAll('input[name="extra"]:checked');
    extraSelection.forEach(el => {
        const price = parseFloat(el.getAttribute('data-price')) || 0;
        const displayPrice = parseFloat(el.getAttribute('data-display-price')) || price;
        const type = el.getAttribute('data-type');
        const key = el.getAttribute('data-key');
        const name = translations[currentLang][key] || el.nextElementSibling?.querySelector('h4')?.innerText || el.value;

        const item = { name, key, price, displayPrice };
        if (type === 'monthly') {
            wizardState.hardwareMonthly.push(item);
            hwMonthlyTotal += price;
        } else {
            wizardState.hardwareSetup.push(item);
            hwSetupTotal += price;
        }
    });

    wizardState.totalMonthly = wizardState.monthlyPrice + hwMonthlyTotal;
    wizardState.totalSetup = wizardState.setupPrice + hwSetupTotal;

    renderSummaryOutput();
}

function renderSummaryOutput() {
    const summaryBox = document.getElementById('summaryContent');
    if (!summaryBox) return;
    
    const fmt = num => num.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    let html = `
        <div class="summary-item" style="align-items:flex-start;">
            <span style="flex:1">${translations[currentLang].sum_plan}: <strong>${wizardState.planName}</strong></span>
            <div style="text-align:right">
                ${wizardState.isOneTime
                    ? `<div style="font-weight:600; font-size:1.1rem; color:var(--text-primary);">€${fmt(wizardState.setupPrice)} <span style="font-size:0.8rem; font-weight:400; color:var(--text-secondary);">${translations[currentLang].plan_setup} (${currentLang === 'tr' ? 'net' : 'netto'})</span></div>
                       <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">+ €${fmt(wizardState.monthlyPrice)} <span style="font-size:0.75rem">${translations[currentLang].plan_month}</span></div>`
                    : `<div style="font-weight:600; font-size:1.1rem; color:var(--text-primary);">€${fmt(wizardState.monthlyPrice)} <span style="font-size:0.8rem; font-weight:400; color:var(--text-secondary);">${translations[currentLang].plan_month}</span></div>
                       <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">+ €${fmt(wizardState.setupPrice)} <span style="font-size:0.75rem">${translations[currentLang].plan_setup}</span></div>`
                }
            </div>
        </div>
        <div class="summary-item" style="align-items:flex-start; margin-top:8px;">
            <span style="flex:1">Paketwahl: <strong>${wizardState.packageName || 'Standard'}</strong></span>
        </div>
    `;
    
    if (wizardState.hardwareMonthly.length > 0 || wizardState.hardwareSetup.length > 0) {
        html += `<div class="summary-item" style="color:var(--text-primary); font-size:0.9rem; margin-top:16px;"><strong>${translations[currentLang].sum_extra_hw}:</strong></div>`;
        
        wizardState.hardwareMonthly.forEach(hw => {
            const translatedHwName = hw.key ? translations[currentLang][hw.key] : hw.name;
            const displayPrice = hw.displayPrice || hw.price;
            html += `
                <div class="summary-item" style="font-size:0.9rem; align-items:flex-start;">
                    <span>+ ${translatedHwName}</span>
                    <span style="font-weight:500;">€${fmt(displayPrice)} <span style="font-size:0.75rem; color:var(--text-secondary);">${translations[currentLang].plan_month}</span></span>
                </div>
            `;
        });
        
        wizardState.hardwareSetup.forEach(hw => {
            const translatedHwName = hw.key ? translations[currentLang][hw.key] : hw.name;
            const displayPrice = hw.displayPrice || hw.price;
            html += `
                <div class="summary-item" style="font-size:0.9rem; align-items:flex-start;">
                    <span>+ ${translatedHwName}</span>
                    <span style="font-weight:500; color:var(--text-secondary);">€${fmt(displayPrice)} <span style="font-size:0.75rem;">${translations[currentLang].plan_setup}</span></span>
                </div>
            `;
        });
    }
    
    const vatMonthly = wizardState.totalMonthly * 0.19;
    const grossMonthly = wizardState.totalMonthly * 1.19;
    const vatSetup = wizardState.totalSetup * 0.19;
    const grossSetup = wizardState.totalSetup * 1.19;

    html += `
        <div class="summary-total" style="align-items:flex-start; border-bottom: none; padding-bottom: 8px;">
            <span>${translations[currentLang].sum_total_monthly} (${translations[currentLang].netto_label}):</span>
            <span>€${fmt(wizardState.totalMonthly)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-secondary); margin-top:4px;">
            <span>${translations[currentLang].sum_vat}</span>
            <span>€${fmt(vatMonthly)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.05rem; margin-top:8px; margin-bottom: 16px; color:var(--text-primary);">
            <span>${translations[currentLang].sum_gross}:</span>
            <span>€${fmt(grossMonthly)}</span>
        </div>

        <div class="summary-total" style="font-size: 1rem; color:var(--text-secondary); margin-top:8px; align-items:flex-start; border-bottom: none; padding-bottom: 8px;">
            <span style="font-weight:normal">${translations[currentLang].sum_total_setup} (${translations[currentLang].netto_label}):</span>
            <span style="font-weight:normal">€${fmt(wizardState.totalSetup)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:var(--text-secondary); margin-top:4px;">
            <span>${translations[currentLang].sum_vat}</span>
            <span>€${fmt(vatSetup)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.05rem; margin-top:8px; color:var(--text-primary);">
            <span>${translations[currentLang].sum_gross}:</span>
            <span>€${fmt(grossSetup)}</span>
        </div>
    `;
    
    summaryBox.innerHTML = html;
}

function submitForm(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerText;
    
    // Changing button text conditionally based on language
    btn.innerText = currentLang === 'de' ? "Wird verarbeitet..." : "İşleniyor...";
    btn.disabled = true;
    
    // Combine all hardware logic
    const allHardware = [...wizardState.hardwareMonthly, ...wizardState.hardwareSetup];
    
    const orderData = {
        plan: wizardState.planName,
        totalMonthly: wizardState.totalMonthly,
        totalSetup: wizardState.totalSetup,
        hardware: allHardware,
        customer: {
            company: document.getElementById('company').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
        }
    };
    
    // Send to PHP Backend using Fetch API
    fetch('mail.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Success
        btn.innerText = originalText;
        btn.disabled = false;
        nextWizardStep(4);
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
        btn.innerText = originalText;
        btn.disabled = false;
        // Proceeding to step 4 anyway since many local environments don't support mail servers
        // In a real production environment, you might want to show an error message instead.
        alert(currentLang === 'de' ? "Es gab ein Problem beim Senden der E-Mail. Stellen Sie sicher, dass die Website auf einem PHP-Server läuft." : "E-posta gönderilirken bir sorun oluştu. Sitenin bir PHP sunucusunda çalıştığından emin olun.");
    });
}

const carouselStates = {};

function setCarouselSlide(carouselId, slideIndex) {
    const state = carouselStates[carouselId];
    if (!state) return;
    const { slides, dots } = state;
    slides.forEach((slide, index) => {
        slide.classList.toggle('active', index === slideIndex);
    });
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === slideIndex);
    });
    state.currentIndex = slideIndex;
    resetCarouselTimer(carouselId);
}

function resetCarouselTimer(carouselId) {
    const state = carouselStates[carouselId];
    if (!state) return;
    clearInterval(state.timer);
    state.timer = setInterval(() => {
        const nextIndex = (state.currentIndex + 1) % state.slides.length;
        setCarouselSlide(carouselId, nextIndex);
    }, 5000);
}

function initPlanCarousels() {
    document.querySelectorAll('.plan-gallery').forEach(carousel => {
        const carouselId = carousel.dataset.carouselId;
        const slides = Array.from(carousel.querySelectorAll('.gallery-slide'));
        const dots = Array.from(carousel.querySelectorAll('.gallery-dot'));
        const touchArea = carousel.querySelector('.gallery-slides');
        if (!carouselId || slides.length === 0 || dots.length === 0 || !touchArea) return;

        carouselStates[carouselId] = {
            currentIndex: 0,
            slides,
            dots,
            timer: null,
            startX: 0,
            startY: 0,
            isDragging: false
        };

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.dataset.index, 10);
                setCarouselSlide(carouselId, index);
            });
        });

        touchArea.addEventListener('pointerdown', event => {
            const state = carouselStates[carouselId];
            state.startX = event.clientX;
            state.startY = event.clientY;
            state.isDragging = true;
            touchArea.setPointerCapture(event.pointerId);
        });

        touchArea.addEventListener('pointermove', event => {
            const state = carouselStates[carouselId];
            if (!state.isDragging) return;
            const dx = event.clientX - state.startX;
            const dy = event.clientY - state.startY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                event.preventDefault();
            }
        });

        const finishSwipe = event => {
            const state = carouselStates[carouselId];
            if (!state.isDragging) return;
            state.isDragging = false;
            const dx = event.clientX - state.startX;
            const dy = event.clientY - state.startY;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
                const nextIndex = dx < 0
                    ? (state.currentIndex + 1) % state.slides.length
                    : (state.currentIndex - 1 + state.slides.length) % state.slides.length;
                setCarouselSlide(carouselId, nextIndex);
            }
        };

        touchArea.addEventListener('pointerup', finishSwipe);
        touchArea.addEventListener('pointercancel', () => {
            const state = carouselStates[carouselId];
            if (state) state.isDragging = false;
        });
        touchArea.addEventListener('lostpointercapture', () => {
            const state = carouselStates[carouselId];
            if (state) state.isDragging = false;
        });

        setCarouselSlide(carouselId, 0);
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('wizardOverlay').classList.contains('show')) {
        closeWizard();
    }
});

document.getElementById('wizardOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'wizardOverlay') {
        closeWizard();
    }
});

function showImpressum(e) {
    if (e) e.preventDefault();
    
    // Hide main sections
    const mainSections = document.querySelectorAll('header, .features, .plans, .contact, #wizardOverlay, #datenschutz');
    mainSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show impressum
    document.getElementById('impressum').style.display = 'block';
    document.body.style.overflow = 'auto';
    window.scrollTo(0, 0);
}

function hideImpressum() {
    // Show main sections again
    const mainSections = document.querySelectorAll('header, .features, .plans, .contact, #wizardOverlay');
    mainSections.forEach(section => {
        section.style.display = '';
    });
    
    // Hide impressum
    document.getElementById('impressum').style.display = 'none';
    window.scrollTo(0, 0);
}

function showDatenschutz(e) {
    if (e) e.preventDefault();
    
    // Hide main sections
    const mainSections = document.querySelectorAll('header, .features, .plans, .contact, #wizardOverlay, #impressum, #agb');
    mainSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show datenschutz
    document.getElementById('datenschutz').style.display = 'block';
    document.body.style.overflow = 'auto';
    window.scrollTo(0, 0);
}

function hideDatenschutz() {
    // Show main sections again
    const mainSections = document.querySelectorAll('header, .features, .plans, .contact, #wizardOverlay');
    mainSections.forEach(section => {
        section.style.display = '';
    });
    
    // Hide datenschutz
    document.getElementById('datenschutz').style.display = 'none';
    window.scrollTo(0, 0);
}

function showAGB(e) {
    if (e) e.preventDefault();
    
    // Hide main sections
    const mainSections = document.querySelectorAll('header, .features, .plans, .contact, #wizardOverlay, #impressum, #datenschutz');
    mainSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show AGB
    document.getElementById('agb').style.display = 'block';
    document.body.style.overflow = 'auto';
    window.scrollTo(0, 0);
}

function hideAGB() {
    // Show main sections again
    const mainSections = document.querySelectorAll('header, .features, .plans, .contact, #wizardOverlay');
    mainSections.forEach(section => {
        section.style.display = '';
    });
    
    // Hide AGB
    document.getElementById('agb').style.display = 'none';
    window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    setLanguage('de');
    initPlanCarousels();
});
