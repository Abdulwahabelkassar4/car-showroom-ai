'use strict';

/**
 * Navbar toggle
 */
const overlay = document.querySelector('[data-overlay]');
const navbar = document.querySelector('[data-navbar]');
const navToggleBtn = document.querySelector('[data-nav-toggle-btn]');
const navbarLinks = document.querySelectorAll('[data-nav-link]');

const navToggleFunc = function () {
  if (navToggleBtn) {
    navToggleBtn.classList.toggle('active');
  }
  if (navbar) {
    navbar.classList.toggle('active');
  }
  if (overlay) {
    overlay.classList.toggle('active');
  }
};

if (navToggleBtn) {
  navToggleBtn.addEventListener('click', navToggleFunc);
}
if (overlay) {
  overlay.addEventListener('click', navToggleFunc);
}

for (let i = 0; i < navbarLinks.length; i++) {
  navbarLinks[i].addEventListener('click', navToggleFunc);
}

/**
 * Header active on scroll
 */
const header = document.querySelector('[data-header]');

window.addEventListener('scroll', function () {
  if (!header) return;
  if (window.scrollY >= 10) {
    header.classList.add('active');
  } else {
    header.classList.remove('active');
  }
});
