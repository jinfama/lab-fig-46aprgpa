/* ---- Navigation JS ---- */
document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  
  if (navToggle) {
    navToggle.addEventListener('click', function() {
      mainNav.classList.toggle('open');
    });
  }
  
  // Mobile dropdown toggle
  document.querySelectorAll('.has-dropdown > a').forEach(function(link) {
    link.addEventListener('click', function(e) {
      if (window.innerWidth <= 900) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
      }
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.site-header')) {
      mainNav?.classList.remove('open');
    }
  });
  
  // Active nav link
  const currentPath = window.location.pathname.replace(/\/$/, '').split('/').pop() || 'index';
  document.querySelectorAll('.main-nav a').forEach(function(link) {
    const href = link.getAttribute('href');
    if (href) {
      const linkPage = href.replace(/\/$/, '').split('/').pop().replace('.html', '');
      if (linkPage === currentPath || (currentPath === 'index' && linkPage === 'index')) {
        link.classList.add('active');
      }
    }
  });
});

/* ---- Carousel ---- */
function initCarousel(container) {
  if (!container) return;
  
  const track = container.querySelector('.carousel-track');
  const images = track.querySelectorAll('img');
  const dotsContainer = container.querySelector('.carousel-dots');
  let current = 0;
  const total = images.length;
  
  // Create dots
  if (dotsContainer) {
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); goTo(i); });
      dotsContainer.appendChild(dot);
    }
  }
  
  function goTo(index) {
    current = index;
    track.style.transform = `translateX(-${current * 100}%)`;
    const dots = dotsContainer?.querySelectorAll('.dot');
    dots?.forEach((d, i) => d.classList.toggle('active', i === current));
  }
  
  // Buttons
  const prevBtn = container.querySelector('.carousel-btn.prev');
  const nextBtn = container.querySelector('.carousel-btn.next');
  
  if (prevBtn) prevBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); goTo((current - 1 + total) % total); });
  if (nextBtn) nextBtn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); goTo((current + 1) % total); });
  
  // Auto-play
  setInterval(() => goTo((current + 1) % total), 5000);
}

document.addEventListener('DOMContentLoaded', function() {
  const carousel = document.querySelector('.carousel');
  if (carousel) initCarousel(carousel);
});
