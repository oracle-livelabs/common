(() => {
  'use strict';
  // Pin relative assets and links before client-side navigation changes the URL.
  const appRoot = new URL('../../', document.currentScript.src);
  if (location.pathname !== '/admin-panel-login') {
    let base = document.querySelector('base');
    if (!base) { base = document.createElement('base'); document.head.prepend(base); }
    base.href = appRoot.href;
  }
  window.LiveLabsAppRoot = appRoot.href;
  if (location.protocol !== 'file:') {
    const url = new URL(location.href);
    const dashboard = new URL('dashboard/', appRoot);
    const inventoryPaths = ['inventory', 'inventory/', 'inventory/index.html'].map(path => new URL(path, appRoot).pathname);
    const entryPaths = [appRoot.pathname, new URL('index.html', appRoot).pathname,
      ...['dashboard', 'dashboard/', 'dashboard/index.html', 'search', 'search/', 'search/index.html'].map(path => new URL(path, appRoot).pathname), ...inventoryPaths];
    if (entryPaths.includes(url.pathname)) {
      const hasValue = key => Boolean(url.searchParams.get(key)?.trim());
      const inventoryList = inventoryPaths.includes(url.pathname) || url.searchParams.get('view') === 'inventory';
      const recordRequested = hasValue('livelabs_id') || hasValue('content_key') || (hasValue('wms_id') && !inventoryList);
      if (recordRequested || (hasValue('q') && !inventoryList)) {
        url.pathname = new URL('search/', appRoot).pathname;
        url.searchParams.delete('view');
        url.hash = '';
      } else if (inventoryList) {
        // Preserve directory/index URLs on static hosts; the service canonicalizes them.
        if (!inventoryPaths.includes(url.pathname)) url.pathname = new URL('inventory', appRoot).pathname;
        url.searchParams.delete('view');
      } else {
        url.pathname = dashboard.pathname;
        if (!url.hash && !['q', 'livelabs_id', 'wms_id', 'content_key'].some(key => url.searchParams.has(key))) url.hash = '#overview';
      }
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }
  const root = document.documentElement;
  root.classList.add('page-loading');
  let pending = 1, revision = 0, failed = false, overlay, timer, previousFocus, failureMessage;
  const layouts = new Map();
  function mount() {
    if (!document.body) return;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'page-loading-overlay';
      overlay.innerHTML = '<div class="page-loading-card" role="status" aria-live="polite"><span class="page-loading-spinner" aria-hidden="true"></span><h2>Loading LiveLabs Analytics</h2><p data-loading-message>Preparing your page…</p><div class="page-loading-actions" hidden><button type="button">Try again</button><a>Back to dashboard</a></div></div>';
      overlay.querySelector('button').addEventListener('click', () => location.reload());
      overlay.querySelector('a').href = new URL(location.protocol === 'file:' ? 'index.html#overview' : 'dashboard/#overview', appRoot).href;
      document.body.append(overlay);
    }
    if (failed) {
      overlay.querySelector('h2').textContent = 'Unable to load this page';
      overlay.querySelector('[data-loading-message]').textContent = failureMessage;
      overlay.querySelector('.page-loading-actions').hidden = false;
    }
    if (pending || failed) {
      overlay.hidden = false;
      document.querySelectorAll('.layout, .skip-link').forEach(node => {
        if (!layouts.has(node)) layouts.set(node, { inert: node.inert, busy: node.getAttribute('aria-busy') });
        node.inert = true;
        node.setAttribute('aria-busy', 'true');
      });
    }
  }
  function fail(message = 'The page could not finish loading. Please try again.') {
    failed = true;
    failureMessage = message;
    clearTimeout(timer);
    root.classList.add('page-loading', 'page-loading-failed');
    mount();
    if (!overlay) return;
    overlay.querySelector('h2').textContent = 'Unable to load this page';
    overlay.querySelector('[data-loading-message]').textContent = message;
    overlay.querySelector('.page-loading-actions').hidden = false;
    overlay.querySelector('button').focus({ preventScroll: true });
  }
  function armTimeout() {
    clearTimeout(timer);
    timer = setTimeout(() => fail('Loading is taking longer than expected. Check your connection and try again.'), 45000);
  }
  async function settle() {
    const current = ++revision;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (pending || failed || revision !== current) return;
    clearTimeout(timer);
    root.classList.remove('page-loading');
    if (overlay) overlay.hidden = true;
    for (const [node, state] of layouts) {
      node.inert = state.inert;
      if (state.busy === null) node.removeAttribute('aria-busy');
      else node.setAttribute('aria-busy', state.busy);
    }
    layouts.clear();
    if (previousFocus?.isConnected && document.activeElement === document.body) previousFocus.focus({ preventScroll: true });
  }
  function begin(message = 'Preparing your page…') {
    if (!pending) { previousFocus = document.activeElement; armTimeout(); }
    pending++; revision++;
    root.classList.add('page-loading');
    mount();
    if (overlay && !failed) overlay.querySelector('[data-loading-message]').textContent = message;
    let finished = false;
    return () => { if (!finished) { finished = true; pending--; void settle(); } };
  }
  function track(promise, message) {
    const end = begin(message);
    Promise.resolve(promise).then(end, () => { fail(); end(); });
    return promise;
  }
  let ready = false;
  window.LiveLabsLoading = { begin, track, fail, ready() {
    if (ready) return;
    ready = true;
    const assets = document.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
    Promise.all([assets, document.fonts?.ready]).then(() => { pending--; void settle(); });
  } };
  document.addEventListener('DOMContentLoaded', mount, { once: true });
  // A missing entry script must offer recovery instead of leaving an endless spinner.
  window.addEventListener('error', event => {
    if (event.target instanceof HTMLScriptElement || event.target instanceof HTMLLinkElement) fail();
  }, true);
  armTimeout();
})();
