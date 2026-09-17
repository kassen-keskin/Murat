/* ================================================
   KassenKeskin – Main JavaScript
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- Sticky Header ---
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // --- Mobile Nav Toggle ---
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });
        // Close menu when link clicked
        navMenu.querySelectorAll('.nav__link').forEach(link => {
            link.addEventListener('click', () => navMenu.classList.remove('open'));
        });
    }

    // --- Feature Tabs ---
    const featureTabs = document.querySelectorAll('.feature-tab');
    const featurePanels = document.querySelectorAll('.feature-panel');
    if (featureTabs.length > 0) {
        featureTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                featureTabs.forEach(t => t.classList.remove('active'));
                featurePanels.forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panel = document.querySelector(`.feature-panel[data-panel="${target}"]`);
                if (panel) panel.classList.add('active');
            });
        });
    }

    // --- Billing Toggle (Pricing Page) ---
    const billingBtns = document.querySelectorAll('.toggle-btn');
    const priceAmounts = document.querySelectorAll('.price-amount');
    if (billingBtns.length > 0) {
        billingBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                billingBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const billing = btn.dataset.billing;
                priceAmounts.forEach(el => {
                    const val = billing === 'yearly' ? el.dataset.yearly : el.dataset.monthly;
                    if (val !== undefined) {
                        animateNumber(el, parseFloat(el.textContent) || 0, parseFloat(val) || 0);
                    }
                });

                // Update annual note
                const proAnnual = document.getElementById('proAnnual');
                const entAnnual = document.getElementById('entAnnual');
                if (billing === 'yearly') {
                    if (proAnnual) proAnnual.innerHTML = 'Oder <strong>€ 310,80/Jahr</strong> – Sie sparen <strong style="color:var(--accent)">168 €</strong>';
                    if (entAnnual) entAnnual.innerHTML = 'Oder <strong>€ 718,80/Jahr</strong> – Sie sparen <strong style="color:var(--accent)">240 €</strong>';
                } else {
                    if (proAnnual) proAnnual.innerHTML = 'Oder <strong>€ 430,80/Jahr</strong> – Sie sparen 132 €';
                    if (entAnnual) entAnnual.innerHTML = 'Oder <strong>€ 718,80/Jahr</strong> – Sie sparen 240 €';
                }
            });
        });
    }

    function animateNumber(el, from, to) {
        const duration = 400;
        const start = performance.now();
        const update = (time) => {
            const progress = Math.min((time - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = from + (to - from) * ease;
            el.textContent = current === 0 ? '0' : current.toFixed(2).replace('.', ',');
            if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }

    // --- FAQ Accordion ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        if (question && answer) {
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                // Close all
                faqItems.forEach(i => {
                    i.classList.remove('open');
                    const a = i.querySelector('.faq-answer');
                    if (a) a.style.maxHeight = '0';
                });
                // Toggle clicked
                if (!isOpen) {
                    item.classList.add('open');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        }
    });

    // --- Particles (Hero) ---
    const particlesContainer = document.getElementById('particles');
    if (particlesContainer) {
        const colors = ['rgba(108,71,255,0.7)', 'rgba(0,212,170,0.7)', 'rgba(155,125,255,0.5)'];
        for (let i = 0; i < 40; i++) {
            const p = document.createElement('div');
            p.classList.add('particle');
            p.style.left = Math.random() * 100 + '%';
            p.style.width = p.style.height = (1 + Math.random() * 3) + 'px';
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.animationDuration = (8 + Math.random() * 20) + 's';
            p.style.animationDelay = (Math.random() * 15) + 's';
            particlesContainer.appendChild(p);
        }
    }

    // --- Build dashboard placeholder if no image ---
    const dashImg = document.getElementById('dashboardImg');
    if (dashImg) {
        dashImg.onerror = function () {
            const wrapper = dashImg.parentElement;
            const placeholder = document.createElement('div');
            placeholder.className = 'dashboard-placeholder';
            placeholder.innerHTML = `
        <div class="dp-bar">
          <span class="dp-dot red"></span>
          <span class="dp-dot yellow"></span>
          <span class="dp-dot green"></span>
          <span style="margin-left:12px; font-size:0.75rem; color:var(--text-muted)">KassenKeskin Dashboard</span>
        </div>
        <div class="dp-body">
          <div class="dp-stat">
            <span class="dp-stat-label">Tagesumsatz</span>
            <span class="dp-stat-value">€ 2.847</span>
            <span class="dp-stat-change">▲ +12.4%</span>
          </div>
          <div class="dp-stat">
            <span class="dp-stat-label">Transaktionen</span>
            <span class="dp-stat-value">143</span>
            <span class="dp-stat-change">▲ +8.1%</span>
          </div>
          <div class="dp-stat">
            <span class="dp-stat-label">Ø Bon-Wert</span>
            <span class="dp-stat-value">€ 19,90</span>
            <span class="dp-stat-change">▲ +3.2%</span>
          </div>
          <div class="dp-chart">
            <div class="dp-bar-chart" style="height:55%"></div>
            <div class="dp-bar-chart" style="height:70%"></div>
            <div class="dp-bar-chart" style="height:48%"></div>
            <div class="dp-bar-chart" style="height:85%"></div>
            <div class="dp-bar-chart" style="height:62%"></div>
            <div class="dp-bar-chart" style="height:95%; background: linear-gradient(to top, var(--accent), transparent)"></div>
            <div class="dp-bar-chart" style="height:40%"></div>
          </div>
        </div>
      `;
            wrapper.replaceChild(placeholder, dashImg);
        };
        // Trigger if already broken or no src
        if (!dashImg.src || dashImg.naturalWidth === 0) {
            dashImg.dispatchEvent(new Event('error'));
        }
    }

    // --- Scroll Reveal ---
    const revealEls = document.querySelectorAll(
        '.industry-card, .hw-card, .testimonial-card, .addon-card, .hw-pricing-card, .pricing-card'
    );
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, i * 60);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    revealEls.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });

    // --- Animated counters ---
    const statNumbers = document.querySelectorAll('.stat-number');
    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const text = el.textContent;
                const num = parseFloat(text.replace(/[^0-9.]/g, ''));
                if (!isNaN(num) && num > 0) {
                    let start = 0;
                    const duration = 1500;
                    const step = performance.now();
                    const suffix = text.replace(/[\d.,]/g, '');
                    const update = (time) => {
                        const progress = Math.min((time - step) / duration, 1);
                        const ease = 1 - Math.pow(1 - progress, 4);
                        const current = num * ease;
                        if (num >= 1000) {
                            el.textContent = Math.round(current).toLocaleString('de-DE') + suffix;
                        } else if (Number.isInteger(num)) {
                            el.textContent = Math.round(current) + suffix;
                        } else {
                            el.textContent = current.toFixed(1) + suffix;
                        }
                        if (progress < 1) requestAnimationFrame(update);
                    };
                    requestAnimationFrame(update);
                }
                statObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });
    statNumbers.forEach(el => statObserver.observe(el));

    // --- Smooth active nav link on scroll ---
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav__link');
    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            if (window.scrollY >= section.offsetTop - 150) {
                current = section.id;
            }
        });
        navLinks.forEach(link => {
            link.style.color = '';
            if (link.getAttribute('href').includes(current) && current) {
                link.style.color = 'var(--primary-light)';
            }
        });
    });

});
