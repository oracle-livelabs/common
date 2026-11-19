/* Analytics adapter for the pinned QA renderer; no Jenkins execution is configured. */
(() => {
  const key = typeof REVIEW_STORAGE_KEY !== 'undefined' ? REVIEW_STORAGE_KEY : 'livelabs-analytics-admin-qa-review:v1';
  let csrf = '', ready = false, queue = Promise.resolve(), failure;
  const pending = new Map();
  const notice = document.createElement('p'); notice.setAttribute('role', 'status'); notice.className = 'analytics-archive-notice';
  document.querySelector('main')?.prepend(notice);
  const controls = () => document.querySelectorAll('[data-review-action],[data-clear-list],[data-remove-id]');
  const lock = value => controls().forEach(button => {button.disabled = value;});
  const run = document.querySelector('[data-run-list]');
  if (run) {run.disabled = true; run.title = 'A live Jenkins connection has not been configured.';}
  const copy = document.querySelector('[data-copy-payload]'); if (copy) copy.hidden = false;
  const note = document.querySelector('#retest-queue-note');
  if (note) note.textContent = 'Selections are saved in Analytics Admin. Copy or download the payload to run through the QA scripts. Live Jenkins execution is not connected.';
  const download = document.createElement('button'); download.type = 'button'; download.className = 'button'; download.textContent = 'Download payload';
  if (copy) {copy.after(download); download.addEventListener('click', () => {
    if (typeof buildPayload !== 'function') return;
    const payload = buildPayload();
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2) + '\n'], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'retest-list-' + (payload.sourceExecutionId || 'selected') + '.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });}
  async function request(payload) {
    const response = await fetch('/api/admin/jenkins/list', payload === undefined ? {cache:'no-store'} : {method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(payload)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Review list unavailable.');
    return result;
  }
  function apply(state) {
    localStorage.setItem(key, JSON.stringify(state));
    window.dispatchEvent(new StorageEvent('storage', {key}));
    if (typeof updateReviewCounts === 'function') updateReviewCounts();
  }
  window.qaHub = {
    sync(previous, next) {
      if (!ready) return;
      const operations = [];
      for (const id of new Set([...Object.keys(previous.retest || {}), ...Object.keys(next.retest || {})])) {
        if (JSON.stringify(previous.retest?.[id]) === JSON.stringify(next.retest?.[id])) continue;
        operations.push(next.retest?.[id] ? {id,entry:next.retest[id]} : {id,remove:true});
      }
      if (!operations.length) return;
      for (const operation of operations) pending.set(operation.id, operation);
      queue = queue.then(async () => {
        const batch = Array.from(pending.values());
        if (!batch.length) return;
        await request({operations: batch});
        for (const operation of batch) {
          if (pending.get(operation.id) === operation) pending.delete(operation.id);
        }
        failure = undefined; notice.textContent = 'Retest List saved.';
      }).catch(error => {failure = error;notice.textContent = 'List not saved: ' + error.message + ' Your pending changes will be retried with the next edit.';});
    },
    async flush() {await queue;if(failure)throw failure;if(!ready)throw new Error('Review list unavailable.');},
    async start() {throw new Error('Live Jenkins execution is not connected. Download the selected checks instead.');}
  };
  lock(true);
  fetch('/api/admin/session', {cache:'no-store'}).then(async response => {
    if (!response.ok) throw new Error('Sign in to Analytics Admin to use the Retest List.');
    csrf = (await response.json()).csrf; apply(await request());ready = true;lock(false);
  }).catch(error => {notice.textContent = error.message;});
  // The renderer's PAR resolver requires the live QA service; preserve source links and explain this limitation.
  document.querySelectorAll('[data-unified-par-copy],[data-unified-par-toggle]').forEach(button => {button.disabled = true;button.title = 'Protected-resource resolution requires the live QA service.';});

  function enhanceResultTable() {
    const panel = document.querySelector('#tested-items');
    const table = panel?.querySelector('.result-table');
    const header = table?.querySelector('.result-table-head');
    const rowsHost = header?.nextElementSibling;
    const rows = Array.from(rowsHost?.querySelectorAll(':scope > [data-item-row]') || []);
    const search = panel?.querySelector('[data-item-search]');
    const filter = panel?.querySelector('[data-item-filter]');
    const pageSize = panel?.querySelector('[data-item-page-size]');
    const status = panel?.querySelector('[data-filter-status]');
    const previous = panel?.querySelector('[data-item-previous]');
    const next = panel?.querySelector('[data-item-next]');
    const noResults = panel?.querySelector('[data-item-no-results]');
    const toolbar = panel?.querySelector('.pagination');
    if (!header || !rowsHost || !toolbar || toolbar.dataset.compactReady) return;
    toolbar.dataset.compactReady = 'true';

    const downloadMenu = panel.querySelector('.results-heading .download-menu');
    const pageSizeLabel = pageSize?.closest('label');
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'button result-clear-filters';
    clear.textContent = 'Clear filters';
    clear.setAttribute('aria-label', 'Clear report search and filters');

    const navigation = previous?.parentElement;
    const pageLabel = document.createElement('span');
    pageLabel.className = 'result-page-label';
    pageLabel.setAttribute('aria-live', 'polite');
    if (navigation && next) navigation.insertBefore(pageLabel, next);
    if (navigation) navigation.classList.add('result-pagination-actions');

    toolbar.classList.add('result-table-toolbar');
    toolbar.replaceChildren(...[status, downloadMenu, clear, pageSizeLabel, navigation].filter(Boolean));
    table.before(toolbar);

    let sortColumn = -1;
    let sortDirection = 'asc';
    let currentPage = 1;
    const collator = new Intl.Collator(undefined, {numeric:true, sensitivity:'base'});
    const headings = Array.from(header.children);
    headings.forEach((cell, index) => {
      const label = cell.textContent.trim();
      cell.setAttribute('role', 'columnheader');
      cell.setAttribute('aria-sort', 'none');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'result-sort-button';
      button.dataset.resultSortColumn = String(index);
      button.textContent = label;
      button.setAttribute('aria-label', `Sort by ${label}`);
      cell.replaceChildren(button);
    });

    const filterMatches = (row) => {
      const selected = filter?.value || 'all';
      if (selected === 'all') return true;
      const issueCodes = (row.getAttribute('data-issues') || '').split(/\s+/).filter(Boolean);
      if (selected.startsWith('priority:')) return (row.getAttribute('data-priority') || '').split(/\s+/).includes(selected.slice('priority:'.length));
      if (selected.startsWith('audience:')) return (row.getAttribute('data-audience') || '').split(/\s+/).includes(selected.slice('audience:'.length));
      return row.getAttribute('data-status') === selected || row.getAttribute('data-type') === selected || issueCodes.includes(selected);
    };
    const update = () => {
      const query = (search?.value || '').trim().toLocaleLowerCase();
      const ordered = [...rows];
      if (sortColumn >= 0) ordered.sort((left, right) => {
        const leftValue = left.querySelector('.result-summary')?.children[sortColumn]?.textContent.trim() || '';
        const rightValue = right.querySelector('.result-summary')?.children[sortColumn]?.textContent.trim() || '';
        return (sortDirection === 'desc' ? -1 : 1) * collator.compare(leftValue, rightValue);
      });
      ordered.forEach(row => rowsHost.append(row));
      const matched = ordered.filter(row => filterMatches(row) && (!query || (row.getAttribute('data-search') || '').toLocaleLowerCase().includes(query)));
      const size = Math.max(1, Number(pageSize?.value || 25));
      const pageCount = Math.max(1, Math.ceil(matched.length / size));
      currentPage = Math.min(Math.max(1, currentPage), pageCount);
      const start = (currentPage - 1) * size;
      const visible = new Set(matched.slice(start, start + size));
      rows.forEach(row => {
        row.hidden = !visible.has(row);
        if (row.hidden) row.open = false;
      });
      if (status) status.textContent = matched.length ? `Showing ${start + 1}–${Math.min(start + size, matched.length)} of ${matched.length}` : 'Showing 0 results';
      if (pageLabel) pageLabel.textContent = `Page ${currentPage} of ${pageCount}`;
      if (noResults) noResults.hidden = matched.length !== 0;
      if (previous) previous.disabled = currentPage <= 1 || matched.length === 0;
      if (next) next.disabled = currentPage >= pageCount || matched.length === 0;
      headings.forEach((cell, index) => cell.setAttribute('aria-sort', index === sortColumn ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'));
    };

    header.addEventListener('click', event => {
      const button = event.target.closest('[data-result-sort-column]');
      if (!button) return;
      const column = Number(button.dataset.resultSortColumn);
      sortDirection = sortColumn === column ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc';
      sortColumn = column;
      currentPage = 1;
      update();
    });
    search?.addEventListener('input', () => { currentPage = 1; update(); });
    filter?.addEventListener('change', () => { currentPage = 1; update(); });
    pageSize?.addEventListener('change', () => { currentPage = 1; update(); });
    previous?.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); update(); });
    next?.addEventListener('click', () => { currentPage += 1; update(); });
    clear.addEventListener('click', () => {
      if (search) search.value = '';
      if (filter) {
        filter.value = 'all';
        filter.dispatchEvent(new Event('change', {bubbles:true}));
      }
      if (search) search.dispatchEvent(new Event('input', {bubbles:true}));
      currentPage = 1;
      update();
    });
    update();
  }

  enhanceResultTable();
})();
