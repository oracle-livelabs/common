/* Navigation is server-rendered; this only adapts it to small screens and signs out. */
(() => {
  const navigation = document.querySelector('.analytics-navigation');
  const smallScreen = matchMedia('(max-width: 950px)');
  const resize = () => { if (navigation) navigation.open = !smallScreen.matches; };
  resize();
  smallScreen.addEventListener('change', resize);
  document.querySelector('.analytics-signout')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const session = await fetch('/api/admin/session', {cache: 'no-store'});
      if (session.status === 401) { location.replace('/admin'); return; }
      if (!session.ok) throw new Error('Sign out is unavailable. Try again.');
      const {csrf} = await session.json();
      const response = await fetch('/api/admin/logout', {
        method: 'POST', headers: {'Content-Type':'application/json', 'X-CSRF-Token':csrf}, body:'{}'
      });
      if (!response.ok && response.status !== 401) throw new Error('Sign out failed. Try again.');
      location.replace('/admin');
    } catch (error) {
      document.querySelector('.analytics-nav-status').textContent = error.message;
      button.disabled = false;
    }
  });
})();
