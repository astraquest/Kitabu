const navShell = document.querySelector('.nav-shell');
const menuToggle = document.querySelector('.menu-toggle');

if (navShell && menuToggle) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navShell.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navShell.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navShell.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}
