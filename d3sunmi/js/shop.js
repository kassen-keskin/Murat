/* ============================================================
   KassenKeskin Shop JavaScript
   Multi-step wizard with live order summary
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── State ────────────────────────────────────────────────
    let currentStep = 1;
    let billingType = 'monthly'; // 'monthly' | 'yearly'
    let selectedPlan = { id: 'pro', name: 'Pro Kassensystem-Abo', price: 35.90 };
    let deviceCount = 1;
    const addonItems = {};  // { value: { label, price, monthly } }
    const hardwareItems = {};  // { label: { price, qty } }
    const ACTIVATION_FEE = 99;

    // ── Step Navigation ──────────────────────────────────────
    function goToStep(step) {
        // Hide all steps
        document.querySelectorAll('.shop-step').forEach(s => s.classList.remove('active'));
        // Activate target step
        const targetEl = document.getElementById('step' + step);
        if (targetEl) targetEl.classList.add('active');

        // Update progress steps
        document.querySelectorAll('.progress-step').forEach((el, i) => {
            el.classList.remove('active', 'completed');
            if (i + 1 < step) el.classList.add('completed');
            if (i + 1 === step) el.classList.add('active');
        });

        currentStep = step;
        updateSidebar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ── Billing Toggle ───────────────────────────────────────
    document.querySelectorAll('.bt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bt-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            billingType = btn.dataset.billing;

            // Update all price amounts in step 1
            document.querySelectorAll('.po-amount').forEach(el => {
                const val = billingType === 'yearly' ? el.dataset.yearly : el.dataset.monthly;
                if (val !== undefined) {
                    const num = parseFloat(val);
                    el.textContent = num === 0 ? '0' : num.toFixed(2).replace('.', ',');
                }
            });

            // Update selected plan price
            const checkedPlan = document.querySelector('input[name="plan"]:checked');
            if (checkedPlan) {
                const priceAttr = billingType === 'yearly' ? checkedPlan.dataset.priceYearly : checkedPlan.dataset.priceMonthly;
                selectedPlan.price = parseFloat(priceAttr) || 0;
            }

            updateSidebar();
        });
    });

    // ── Plan Selection ───────────────────────────────────────
    document.querySelectorAll('input[name="plan"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const priceAttr = billingType === 'yearly' ? radio.dataset.priceYearly : radio.dataset.priceMonthly;
            selectedPlan = {
                id: radio.value,
                name: radio.closest('.plan-option').querySelector('.plan-option__name').textContent + ' Kassensystem-Abo',
                price: parseFloat(priceAttr) || 0
            };
            updateSidebar();
        });
    });

    // ── Device Count ─────────────────────────────────────────
    const deviceInput = document.getElementById('deviceCount');
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const extraDevicePrice = document.getElementById('extraDevicePrice');

    if (qtyMinus) qtyMinus.addEventListener('click', () => { changeDeviceCount(-1); });
    if (qtyPlus) qtyPlus.addEventListener('click', () => { changeDeviceCount(1); });
    if (deviceInput) {
        deviceInput.addEventListener('change', () => {
            deviceCount = Math.max(1, Math.min(20, parseInt(deviceInput.value) || 1));
            deviceInput.value = deviceCount;
            updateExtraDeviceNote();
            updateSidebar();
        });
    }

    function changeDeviceCount(delta) {
        deviceCount = Math.max(1, Math.min(20, deviceCount + delta));
        if (deviceInput) deviceInput.value = deviceCount;
        updateExtraDeviceNote();
        updateSidebar();
    }

    function updateExtraDeviceNote() {
        if (!extraDevicePrice) return;
        if (deviceCount <= 1) {
            extraDevicePrice.textContent = '+ € 9,90/Monat (pro zusätzlichem Gerät)';
        } else {
            const extra = (deviceCount - 1) * 9.90;
            extraDevicePrice.textContent = `${deviceCount - 1} × € 9,90 = € ${extra.toFixed(2).replace('.', ',')} / Monat`;
        }
    }

    // ── Add-on Selection ─────────────────────────────────────
    document.querySelectorAll('input[name="addon"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const val = cb.value;
            if (cb.checked) {
                addonItems[val] = {
                    label: cb.dataset.label,
                    price: parseFloat(cb.dataset.price),
                    onetime: cb.dataset.onetime === 'true'
                };
            } else {
                delete addonItems[val];
            }
            updateSidebar();
        });
    });

    // ── Hardware Quantity ─────────────────────────────────────
    window.changeHwQty = function (btn, delta) {
        const input = btn.parentElement.querySelector('.hw-qty');
        let val = Math.max(0, Math.min(10, parseInt(input.value) + delta));
        input.value = val;
        const label = input.dataset.hwLabel;
        const price = parseFloat(input.dataset.hwPrice);
        if (val === 0) {
            delete hardwareItems[label];
        } else {
            hardwareItems[label] = { price, qty: val };
        }
        updateSidebar();
    };

    // ── Navigation Buttons ────────────────────────────────────
    document.getElementById('nextStep1')?.addEventListener('click', () => goToStep(2));
    document.getElementById('backStep2')?.addEventListener('click', () => goToStep(1));
    document.getElementById('nextStep2')?.addEventListener('click', () => goToStep(3));
    document.getElementById('backStep3')?.addEventListener('click', () => goToStep(2));
    document.getElementById('nextStep3')?.addEventListener('click', () => goToStep(4));
    document.getElementById('backStep4')?.addEventListener('click', () => goToStep(3));

    // ── Form Submit ───────────────────────────────────────────
    document.getElementById('accountForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const requiredFields = document.querySelectorAll('#accountForm [required]');
        let valid = true;
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.style.borderColor = '#ef4444';
                valid = false;
            } else {
                field.style.borderColor = '';
            }
        });
        if (!document.getElementById('agreeTerms').checked) {
            valid = false;
            document.getElementById('agreeTerms').style.outline = '2px solid #ef4444';
        }
        if (valid) {
            goToStep(5);
        }
    });

    // ── Password Strength ─────────────────────────────────────
    document.getElementById('password')?.addEventListener('input', (e) => {
        const pw = e.target.value;
        const fill = document.getElementById('psFill');
        const label = document.getElementById('psLabel');
        if (!fill || !label) return;
        let strength = 0;
        if (pw.length >= 8) strength++;
        if (/[A-Z]/.test(pw)) strength++;
        if (/[0-9]/.test(pw)) strength++;
        if (/[^A-Za-z0-9]/.test(pw)) strength++;

        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#00c896'];
        const labels = ['Schwach', 'Mittel', 'Gut', 'Sehr stark'];
        const widths = ['25%', '50%', '75%', '100%'];
        if (pw.length === 0) {
            fill.style.width = '0';
            label.textContent = 'Bitte Passwort eingeben';
        } else {
            const idx = Math.max(0, strength - 1);
            fill.style.width = widths[idx];
            fill.style.background = colors[idx];
            label.textContent = labels[idx];
            label.style.color = colors[idx];
        }
    });

    // ── Payment Method Toggle ─────────────────────────────────
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const cardFields = document.getElementById('cardFields');
            if (cardFields) {
                cardFields.style.display = radio.value === 'card' ? 'block' : 'none';
            }
        });
    });

    // ── Card Number Formatting ────────────────────────────────
    document.getElementById('cardNumber')?.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 16);
        e.target.value = val.replace(/(.{4})/g, '$1 ').trim();
    });
    document.getElementById('cardExpiry')?.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 2) val = val.substring(0, 2) + ' / ' + val.substring(2, 4);
        e.target.value = val;
    });

    // ── Update Sidebar ────────────────────────────────────────
    function updateSidebar() {
        // Plan
        const sbPlanName = document.getElementById('sbPlanName');
        const sbPlanPrice = document.getElementById('sbPlanPrice');
        const sbBillingNote = document.getElementById('sbBillingNote');

        if (sbPlanName && sbPlanPrice) {
            const planEl = sbPlanName.querySelector('span:first-child');
            if (planEl) planEl.textContent = selectedPlan.name;
            const priceStr = selectedPlan.price === 0
                ? '€ 0,00 / Mo'
                : `€ ${selectedPlan.price.toFixed(2).replace('.', ',')} / Mo`;
            sbPlanPrice.textContent = priceStr;
        }
        if (sbBillingNote) {
            const noteSpan = sbBillingNote.querySelector('.sb-note');
            if (noteSpan) noteSpan.textContent = billingType === 'yearly' ? 'Jährlich abgerechnet' : 'Monatlich abgerechnet';
        }

        // Extra devices
        const extraDeviceMonthly = (deviceCount - 1) * 9.90;

        // Addons
        const sbAddonsSection = document.getElementById('sbAddonsSection');
        const sbAddonsList = document.getElementById('sbAddonsList');
        const addonKeys = Object.keys(addonItems);
        if (sbAddonsList && sbAddonsSection) {
            sbAddonsSection.style.display = addonKeys.length > 0 ? 'block' : 'none';
            sbAddonsList.innerHTML = addonKeys.map(k => {
                const a = addonItems[k];
                const priceStr = a.onetime
                    ? `€ ${a.price.toFixed(0)} einmalig`
                    : `€ ${a.price.toFixed(2).replace('.', ',')} / Mo`;
                return `<div class="sb-item"><span>${a.label}</span><span class="sb-price">${priceStr}</span></div>`;
            }).join('');
        }

        // Hardware
        const sbHardwareSection = document.getElementById('sbHardwareSection');
        const sbHardwareList = document.getElementById('sbHardwareList');
        const hwKeys = Object.keys(hardwareItems);
        if (sbHardwareList && sbHardwareSection) {
            sbHardwareSection.style.display = hwKeys.length > 0 ? 'block' : 'none';
            sbHardwareList.innerHTML = hwKeys.map(k => {
                const h = hardwareItems[k];
                const total = h.price * h.qty;
                return `<div class="sb-item"><span>${k} × ${h.qty}</span><span class="sb-price">€ ${total.toLocaleString('de-DE')}</span></div>`;
            }).join('');
        }

        // Totals
        let monthlyTotal = selectedPlan.price + extraDeviceMonthly;
        Object.values(addonItems).forEach(a => { if (!a.onetime) monthlyTotal += a.price; });

        let oneTimeTotal = ACTIVATION_FEE;
        Object.values(addonItems).forEach(a => { if (a.onetime) oneTimeTotal += a.price; });
        Object.values(hardwareItems).forEach(h => { oneTimeTotal += h.price * h.qty; });

        const sbMonthlyTotal = document.getElementById('sbMonthlyTotal');
        const sbOneTimeTotal = document.getElementById('sbOneTimeTotal');
        if (sbMonthlyTotal) sbMonthlyTotal.textContent = `€ ${monthlyTotal.toFixed(2).replace('.', ',')}`;
        if (sbOneTimeTotal) sbOneTimeTotal.textContent = `€ ${oneTimeTotal.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace('.', ',')}`;
    }

    // ── Init ──────────────────────────────────────────────────
    goToStep(1);
    updateExtraDeviceNote();
});
