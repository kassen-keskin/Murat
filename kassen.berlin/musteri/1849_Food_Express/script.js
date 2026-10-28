// Food Express Berlin - Main Interactive Script

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const menuToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // DSGVO 2-Click Google Maps Loader
  const loadMapBtn = document.getElementById('loadMapBtn');
  const mapPlaceholder = document.getElementById('mapPlaceholder');
  const mapIframeContainer = document.getElementById('mapIframeContainer');

  if (loadMapBtn && mapPlaceholder && mapIframeContainer) {
    loadMapBtn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src =
        'https://maps.google.com/maps?q=Food+Express,+Sonntagstra%C3%9Fe+3,+10245+Berlin&t=&z=16&ie=UTF8&iwloc=&output=embed';
      iframe.title = 'Standort von Food Express in der Sonntagstr. 3, 10245 Berlin';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.allowFullscreen = true;

      mapPlaceholder.style.display = 'none';
      mapIframeContainer.appendChild(iframe);
      mapIframeContainer.classList.add('active');
    });
  }
});
