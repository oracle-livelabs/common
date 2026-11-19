(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? 'N/A').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const pages = {};
  const pageSizes = {};
  const tableSorts = {};
  const tableExportButtons = {
    changes: [$('changes-csv'), $('changes-xlsx')],
    'quality-results': [$('quality-csv'), $('quality-xlsx')],
    'review-history': [$('reviews-csv'), $('reviews-xlsx')]
  };
  const tableViews = new Map();
  const tableCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const tabs = [...document.querySelectorAll('[role="tab"][data-tab]')];
  let csrf = '';
  let snapshots = [];
  let changes = [];
  let issues = [];
  let reviews = [];
  let comparison;
  let reviewPayload;
  let reviewRecords = [];
  let sessionTimer;

  function scheduleSessionExpiry(expires) {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => location.replace('/admin'), Math.max(0, expires * 1000 - Date.now()));
  }

  const status = message => { $('status').textContent = message; };

  function activateTab(panelId, focus = false) {
    if (!tabs.some(tab => tab.dataset.tab === panelId)) panelId = 'snapshots';
    for (const tab of tabs) {
      const selected = tab.dataset.tab === panelId;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      $(tab.dataset.tab).hidden = !selected;
      if (selected && focus) tab.focus();
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    tab.addEventListener('keydown', event => {
      const keyTargets = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (!Object.prototype.hasOwnProperty.call(keyTargets, event.key)) return;
      event.preventDefault();
      activateTab(tabs[keyTargets[event.key]].dataset.tab, true);
    });
  });

  async function api(path, body) {
    const response = await fetch('/api/admin/' + path, body ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(body)
    } : {});
    const expiry = Number(response.headers.get('X-Session-Expires'));
    if (Number.isFinite(expiry) && expiry > 0) scheduleSessionExpiry(expiry);
    if (response.status === 401 && path !== 'login') {
      location.replace('/admin');
      throw new Error('Session expired.');
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  function task(handler) {
    return async event => {
      const endLoading = window.LiveLabsLoading.begin('Updating administration…');
      const button = event?.currentTarget?.tagName === 'BUTTON' ? event.currentTarget : null;
      if (button) button.disabled = true;
      try {
        await handler(event);
      } catch (error) {
        status(error.message);
      } finally {
        if (button) button.disabled = false;
        endLoading();
      }
    };
  }

  function table(id, headers, rows, options = {}) {
    const pageSize = [10, 25, 50, 100].includes(Number(pageSizes[id])) ? Number(pageSizes[id]) : 10;
    pageSizes[id] = pageSize;
    const state = tableSorts[id] || (tableSorts[id] = { index: -1, direction: 'asc' });
    const valuesFor = options.valuesFor || (row => row);
    const ordered = rows.slice();
    if (state.index >= 0 && state.index < headers.length) {
      ordered.sort((left, right) => {
        const leftText = String(valuesFor(left)[state.index] ?? '').trim();
        const rightText = String(valuesFor(right)[state.index] ?? '').trim();
        const leftMissing = !leftText || leftText === '—';
        const rightMissing = !rightText || rightText === '—';
        if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
        const leftNumber = Number(leftText.replace(/[,%]/g, ''));
        const rightNumber = Number(rightText.replace(/[,%]/g, ''));
        const numeric = leftText && rightText && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
          ? leftNumber - rightNumber
          : tableCollator.compare(leftText, rightText);
        return state.direction === 'desc' ? -numeric : numeric;
      });
    }
    const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
    const page = pages[id] = Math.min(Math.max(0, pages[id] || 0), totalPages - 1);
    const start = ordered.length ? page * pageSize + 1 : 0;
    const visible = ordered.slice(page * pageSize, (page + 1) * pageSize);
    const visibleValues = visible.map(valuesFor);
    tableViews.set(id, { headers, rows: visibleValues, records: visible });
    const pagination = () => `<div class="pagination-controls admin-table-pagination table-controls-toolbar" aria-label="Table controls">
      <span class="pagination-range">${options.summary ? `${escape(options.summary)} · ` : ''}${ordered.length ? `Showing ${start}–${Math.min(start + visible.length - 1, ordered.length)} of ${ordered.length.toLocaleString()} rows` : 'No matching rows'}</span>
      <div class="pagination-actions"><span class="admin-table-export-slot" data-admin-export-slot="${escape(id)}"></span>
      <button class="pagination-button" type="button" data-admin-clear-table="${escape(id)}">Clear filters</button>
      <label>Rows per page<select data-admin-page-size="${escape(id)}" aria-label="Rows per page">${[10, 25, 50, 100].map(size => `<option value="${size}"${size === pageSize ? ' selected' : ''}>${size}</option>`).join('')}</select></label>
      <button class="pagination-button" type="button" data-admin-page-action="previous" data-admin-page-table="${escape(id)}" ${page === 0 ? 'disabled' : ''}>Previous</button>
      <span data-admin-page-label>Page ${page + 1} of ${totalPages}</span>
      <button class="pagination-button" type="button" data-admin-page-action="next" data-admin-page-table="${escape(id)}" ${page + 1 >= totalPages ? 'disabled' : ''}>Next</button></div></div>`;
    const sortStateLabel = index => state.index === index ? (state.direction === 'asc' ? ' ↑' : ' ↓') : '';
    const sortableColumns = options.sortableColumns || headers.map((_, index) => index);
    const head = headers.map((header, index) => `<th aria-sort="${state.index === index ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none'}">${sortableColumns.includes(index)
      ? `<button class="admin-table-sort" type="button" data-admin-sort-table="${escape(id)}" data-admin-sort-column="${index}" aria-label="Sort by ${escape(header)}">${escape(header)}${sortStateLabel(index)}</button>`
      : escape(header)}</th>`).join('');
    const body = visible.map((row, index) => options.renderRow
      ? options.renderRow(row, index)
      : `<tr>${valuesFor(row).map(cell => `<td>${escape(LiveLabsExport.clean(cell))}</td>`).join('')}</tr>`).join('');
    $(id).innerHTML = ordered.length
      ? `${pagination()}<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`
      : '<p class="admin-muted">No matching rows.</p>';
    const exportSlot = $(id).querySelector(`[data-admin-export-slot="${id}"]`);
    tableExportButtons[id]?.forEach(button => { if (exportSlot) exportSlot.append(button); });
  }

  function rerenderTable(id) {
    if (id === 'quality-results') renderQuality();
    else if (id === 'changes') renderChanges();
    else if (id === 'review-history') renderReviews();
  }

  document.addEventListener('change', event => {
    const select = event.target.closest?.('[data-admin-page-size]');
    if (!select) return;
    const id = select.dataset.adminPageSize;
    pageSizes[id] = Number(select.value) || 10;
    pages[id] = 0;
    rerenderTable(id);
  });
  document.addEventListener('click', event => {
    const clearButton = event.target.closest?.('[data-admin-clear-table]');
    if (clearButton) {
      const id = clearButton.dataset.adminClearTable;
      const searchId = id === 'changes' ? 'change-search' : id === 'quality-results' ? 'quality-search' : 'review-search';
      if ($(searchId)) $(searchId).value = '';
      if (id === 'quality-results') $('quality-category').value = '';
      pages[id] = 0;
      rerenderTable(id);
      return;
    }
    const pageButton = event.target.closest?.('[data-admin-page-action]');
    if (pageButton) {
      const id = pageButton.dataset.adminPageTable;
      pages[id] = Math.max(0, (pages[id] || 0) + (pageButton.dataset.adminPageAction === 'next' ? 1 : -1));
      rerenderTable(id);
      return;
    }
    const sortButton = event.target.closest?.('[data-admin-sort-table]');
    if (!sortButton) return;
    const id = sortButton.dataset.adminSortTable;
    const index = Number(sortButton.dataset.adminSortColumn);
    const previous = tableSorts[id] || { index: -1, direction: 'asc' };
    tableSorts[id] = { index, direction: previous.index === index && previous.direction === 'asc' ? 'desc' : 'asc' };
    pages[id] = 0;
    rerenderTable(id);
  });

  function options(select, selected) {
    select.innerHTML = snapshots.map(snapshot => `<option value="${escape(snapshot.id)}">${escape(snapshot.date + ' · ' + snapshot.id.slice(0, 8) + ' — ' + snapshot.label)}</option>`).join('');
    if (snapshots.some(snapshot => snapshot.id === selected)) select.value = selected;
    else if (snapshots.length) select.value = snapshots.at(-1).id;
  }

  function renderSnapshotOverview() {
    $('overview-snapshots').textContent = snapshots.length.toLocaleString();
    const latest = snapshots.at(-1);
    $('overview-latest').textContent = latest ? `Latest: ${latest.date} · ${latest.id.slice(0, 8)} · ${latest.label}` : 'No saved snapshots';
  }

  async function loadSnapshots(preferredSnapshotId) {
    snapshots = await api('snapshots');
    const latest = preferredSnapshotId || snapshots.at(-1)?.id;
    const earlier = snapshots.filter(snapshot => snapshot.id !== latest).at(-1)?.id || latest;
    options($('before'), earlier);
    options($('after'), latest);
    options($('quality-snapshot'), latest);
    options($('review-snapshot'), latest);
    renderSnapshotOverview();
    const empty = snapshots.length === 0;
    for (const id of ['before','after','quality-snapshot','review-snapshot','download-snapshot','compare','changes-csv','changes-xlsx','quality-csv','quality-xlsx']) {
      $(id).disabled = empty;
    }
    $('review-form').querySelectorAll('input,select,textarea,button').forEach(control => { control.disabled = empty; });
    if (empty) {
      issues = []; reviewRecords = []; reviewPayload = null;
      $('overview-issues').textContent = '—';
      $('overview-affected').textContent = 'Awaiting a snapshot';
      $('overview-quality-date').textContent = '—';
      $('overview-freshness').textContent = 'No source selected';
      const message = 'Capture the current inventory or import a snapshot to start reviewing.';
      $('snapshot-info').textContent = message;
      $('quality-info').textContent = message;
      $('quality-summary').replaceChildren();
      $('quality-results').replaceChildren();
      $('review-selection-note').textContent = message;
      renderRecordChoices(''); renderCandidateChoices(''); renderScore();
      return;
    }
    $('review-selection-note').textContent = 'Choose a record from the quality queue, or search this snapshot to start a review.';
    await Promise.all([loadQuality(), loadRecords()]);
  }

  function renderQualitySummary(provenance) {
    const affected = new Set(issues.map(issue => issue.key)).size;
    const refreshNeeded = Boolean(provenance.governanceRefreshRequired);
    $('overview-issues').textContent = issues.length.toLocaleString();
    $('overview-affected').textContent = `${affected.toLocaleString()} affected content items`;
    $('overview-quality-date').textContent = provenance.snapshotDate || 'N/A';
    $('overview-freshness').textContent = refreshNeeded ? 'Governance refresh required' : 'No refresh flag in this snapshot';
    $('quality-summary').innerHTML = [
      ['Issue occurrences', issues.length.toLocaleString()],
      ['Affected content items', affected.toLocaleString()],
      ['Inventory items', Number(provenance.recordCount || 0).toLocaleString()],
      ['Evidence status', refreshNeeded ? 'Refresh required' : 'No refresh flag']
    ].map(([label, value]) => `<div class="quality-stat"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`).join('');
  }

  async function loadQuality() {
    const data = await api('quality?snapshot=' + encodeURIComponent($('quality-snapshot').value));
    issues = data.issues;
    const sourceDates = Object.entries(data.provenance.sources || {})
      .filter(([key]) => key.endsWith('snapshot_date'))
      .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${LiveLabsExport.clean(value)}`);
    const sourceText = sourceDates.length ? sourceDates.join(' · ') : 'Source snapshot dates are not available.';
    $('quality-info').innerHTML = `<strong>Snapshot ${escape(data.provenance.snapshotDate)}</strong> · ${Number(data.provenance.recordCount || 0).toLocaleString()} inventory records · ${issues.length.toLocaleString()} issue occurrences. A content item can have more than one issue.<br><span>Source evidence: ${escape(sourceText)}</span>${data.provenance.governanceRefreshRequired ? '<br><strong class="quality-warning">Governance evidence refresh is required.</strong>' : ''}`;
    renderQualitySummary(data.provenance);

    const selectedCategory = $('quality-category').value;
    const categories = [...new Set(issues.map(issue => issue.category))].sort();
    $('quality-category').innerHTML = '<option value="">All issues</option>' + categories.map(category => `<option value="${escape(category)}">${escape(category)}</option>`).join('');
    if (categories.includes(selectedCategory)) $('quality-category').value = selectedCategory;
    pages['quality-results'] = 0;
    renderQuality();
  }

  const matches = (row, query) => JSON.stringify(row).toLowerCase().includes(query.trim().toLowerCase());
  const qualityMatches = () => issues.filter(issue =>
    (!$('quality-category').value || issue.category === $('quality-category').value) &&
    matches(issue, $('quality-search').value)
  );
  const qualityRows = () => qualityMatches().map(issue => [
    issue.snapshotDate, issue.key, issue.title, issue.livelabsId, issue.wmsId, issue.category, issue.reason
  ]);
  const qualityHeaders = ['Snapshot', 'Record identity', 'Title', 'LiveLabs ID', 'WMS ID', 'Issue', 'Reason'];

  function renderQuality() {
    const matching = qualityMatches();
    const affected = new Set(matching.map(issue => issue.key)).size;
    const headers = [...qualityHeaders, 'Action'];
    table('quality-results', headers, matching, {
      summary: `${matching.length.toLocaleString()} issues · ${affected.toLocaleString()} content items`,
      valuesFor: issue => [issue.snapshotDate, issue.key, issue.title, issue.livelabsId, issue.wmsId, issue.category, issue.reason, 'Review'],
      sortableColumns: qualityHeaders.map((_, index) => index),
      renderRow: (issue, index) => {
      const cells = [issue.snapshotDate, issue.key, issue.title, issue.livelabsId, issue.wmsId, issue.category, issue.reason]
        .map(value => `<td>${escape(LiveLabsExport.clean(value))}</td>`).join('');
        return `<tr>${cells}<td><button type="button" class="admin-review-issue" data-quality-review="${index}">Review</button></td></tr>`;
      }
    });
  }

  const changeRows = () => changes.filter(change => matches(change, $('change-search').value)).map(change => [
    change.key, change.title, change.field, change.before, change.after, change.explanation
  ]);
  const changeHeaders = ['Record identity', 'Title', 'Changed field', 'Earlier', 'Later', 'Explanation'];
  function renderChanges() { table('changes', changeHeaders, changeRows()); }

  const reviewRows = () => reviews.filter(review => matches(review, $('review-search').value)).map(review => [
    review.record_key, review.candidate_key, review.decision, review.reason, review.reviewer,
    review.created, review.snapshot_id, review.id
  ]);
  const reviewHeaders = ['Record identity', 'Candidate identity', 'Decision', 'Reason', 'Reviewer', 'Recorded at (UTC)', 'Snapshot ID', 'Review ID'];
  function renderReviews() { table('review-history', reviewHeaders, reviewRows()); }

  async function loadReviews() {
    reviews = await api('reviews');
    $('overview-reviews').textContent = reviews.length.toLocaleString();
    renderReviews();
  }

  const recordKey = record => record.livelabsId ? 'livelabs:' + record.livelabsId : record.key;
  const recordLabel = record => `${record.title} [${record.livelabsId ? 'LiveLabs ' + record.livelabsId : record.key}]`;
  const recordMatches = (record, query) => !query || [record.title, record.key, record.livelabsId, record.wmsId]
    .some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()));

  function filteredReviewRecords(searchId, excludedKey = '') {
    const query = $(searchId).value;
    const found = reviewRecords.filter(record => recordKey(record) !== excludedKey && recordMatches(record, query));
    const visible = query.trim() ? found.slice(0, 100) : [];
    const previousValue = searchId === 'review-record-search' ? $('review-record').value : $('review-candidate').value;
    if (previousValue && !visible.some(record => recordKey(record) === previousValue)) {
      const selected = found.find(record => recordKey(record) === previousValue);
      if (selected) visible.unshift(selected);
      if (visible.length > 100) visible.pop();
    }
    return { found, visible };
  }

  function renderRecordChoices(preferredKey = $('review-record').value) {
    const { found, visible } = filteredReviewRecords('review-record-search');
    const select = $('review-record');
    const options = visible.map(record => `<option value="${escape(recordKey(record))}">${escape(recordLabel(record))}</option>`).join('');
    const searchActive = Boolean($('review-record-search').value.trim());
    select.innerHTML = `<option value="">${searchActive ? 'Choose a matching content record' : 'Search for a content record'}</option>${options}`;
    if (visible.some(record => recordKey(record) === preferredKey)) select.value = preferredKey;
    $('review-record-count').textContent = searchActive
      ? `${found.length.toLocaleString()} matching records${found.length > visible.length ? ` · showing the first ${visible.length}` : ''}.`
      : `Search across ${reviewRecords.length.toLocaleString()} records in this snapshot.`;
  }

  function renderCandidateChoices(preferredKey = $('review-candidate').value) {
    const currentKey = $('review-record').value;
    const { found, visible } = filteredReviewRecords('review-candidate-search', currentKey);
    const select = $('review-candidate');
    const options = visible.map(record => `<option value="${escape(recordKey(record))}">${escape(recordLabel(record))}</option>`).join('');
    const searchActive = Boolean($('review-candidate-search').value.trim());
    select.innerHTML = `<option value="">No candidate</option>${options}`;
    if (visible.some(record => recordKey(record) === preferredKey)) select.value = preferredKey;
    $('review-candidate-count').textContent = searchActive
      ? `${found.length.toLocaleString()} matching candidates${found.length > visible.length ? ` · showing the first ${visible.length}` : ''}.`
      : 'Search only if this decision needs a replacement candidate.';
  }

  async function loadRecords() {
    reviewPayload = await api('snapshot?snapshot=' + encodeURIComponent($('review-snapshot').value));
    reviewRecords = reviewPayload.records;
    $('review-record-search').value = '';
    $('review-candidate-search').value = '';
    renderRecordChoices('');
    renderCandidateChoices('');
    renderScore();
  }

  function renderScore() {
    const key = $('review-record').value;
    if (!key) {
      $('score-explanation').textContent = 'Select a content record to see its calculated score.';
      return;
    }
    let match;
    let queue;
    for (const [name, data] of Object.entries(reviewPayload?.rankings || {})) {
      const found = data.rows.find(row => row.key === key);
      if (found) { match = found; queue = name; break; }
    }
    if (!match) {
      $('score-explanation').textContent = 'No calculated rank is available in this snapshot. The record may be ineligible (publication state, unresolved publish type, or missing 12-month/90-day metrics), or this imported JSON may not include ranking history.';
      return;
    }
    const rows = [
      ['Queue', queue], ['Rank / eligible cohort', match.rank + ' / ' + match.eligibleCount], ['Score', match.score],
      ['12-month views', match.views12m], ['12-month percentile / 45% contribution', LiveLabsExport.clean(match.percentile12m) + ' / ' + LiveLabsExport.clean(match.weighted12m)],
      ['90-day views', match.views90d], ['90-day percentile / 35% contribution', LiveLabsExport.clean(match.percentile90d) + ' / ' + LiveLabsExport.clean(match.weighted90d)],
      ['Freshness / 20% contribution', match.freshness + ' / ' + LiveLabsExport.clean(match.weightedFreshness)],
      ['Freshness source', match.updateSource],
      ['Interpretation', 'Demand and update evidence score; not a measure of instructional quality. WMS timestamps may reflect metadata edits.']
    ];
    $('score-explanation').innerHTML = '<div class="table-wrap"><table><tbody>' + rows.map(row => '<tr>' + row.map(cell => '<td>' + escape(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }

  function syncCandidateRequirement() {
    const required = ['Replacement approved', 'Replacement rejected'].includes($('review-decision').value);
    $('review-candidate').required = required;
    $('review-candidate-required-note').textContent = required
      ? 'A different candidate is required for replacement decisions.'
      : 'A candidate is optional for this decision.';
  }

  async function openReviewForIssue(issue) {
    activateTab('reviews');
    const snapshotId = $('quality-snapshot').value;
    $('review-snapshot').value = snapshotId;
    await loadRecords();
    const targetKey = issue.key;
    $('review-record-search').value = issue.livelabsId ? String(issue.livelabsId) : String(issue.key);
    renderRecordChoices(targetKey);
    if ($('review-record').value !== targetKey) {
      $('review-record-search').value = issue.title;
      renderRecordChoices(targetKey);
    }
    if ($('review-record').value !== targetKey) throw new Error('This queue item could not be matched to a record in its snapshot.');
    $('review-candidate-search').value = '';
    renderCandidateChoices('');
    renderScore();
    $('review-selection-note').textContent = `From the ${issue.category} queue · ${issue.title} · ${issue.snapshotDate}. Record a decision with the evidence and rationale.`;
    $('reviews').scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '/admin/governance#reviews');
    $('review-decision').focus({ preventScroll: true });
    status(`Selected “${issue.title}” from the quality queue. Complete the decision and reason below.`);
  }

  $('capture').onclick = task(async () => {
    status('Capturing current inventory and demand rankings…');
    await api('snapshots', { captureCurrent: true });
    await loadSnapshots();
    status('Current snapshot captured. Historical governance queues are retained separately.');
  });

  $('import-snapshot').onchange = task(async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) throw new Error('Snapshot file must be at most 30 MB.');
    const snapshot = JSON.parse(await file.text());
    status('Validating and storing snapshot…');
    const imported = await api('snapshots', { label: file.name, snapshot });
    await loadSnapshots(imported.snapshotId);
    $('after').value = imported.snapshotId;
    event.target.value = '';
    status('Snapshot stored for comparison. Dashboard data was not replaced.');
  });

  $('compare').onclick = task(async () => {
    if ($('before').value === $('after').value) throw new Error('Choose two different snapshots.');
    comparison = await api('compare?before=' + encodeURIComponent($('before').value) + '&after=' + encodeURIComponent($('after').value));
    changes = comparison.changes;
    $('snapshot-info').textContent = `${comparison.before.snapshotDate} (${comparison.before.recordCount.toLocaleString()} records) → ${comparison.after.snapshotDate} (${comparison.after.recordCount.toLocaleString()} records)`;
    $('rank-notice').textContent = comparison.rankNotice;
    $('comparison-summary').innerHTML = Object.entries(comparison.summary).map(([field, count]) => `<span>${escape(field)}: <strong>${escape(count)}</strong></span>`).join('') || '<span>No changes detected.</span>';
    renderChanges();
    status('Comparison complete.');
  });

  $('download-snapshot').onclick = task(async () => {
    const snapshotId = $('after').value;
    const payload = await api('snapshot?snapshot=' + encodeURIComponent(snapshotId));
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `snapshot-${payload.metadata.snapshot_date}-${snapshotId.slice(0, 8)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('quality-snapshot').onchange = task(loadQuality);
  $('review-snapshot').onchange = task(loadRecords);
  $('review-record-search').oninput = () => {
    renderRecordChoices();
    if (!$('review-record').value) {
      renderCandidateChoices('');
      renderScore();
    }
  };
  $('review-candidate-search').oninput = () => renderCandidateChoices();
  $('review-record').onchange = () => {
    renderCandidateChoices('');
    renderScore();
  };
  $('review-candidate').onchange = () => {};
  $('review-decision').onchange = syncCandidateRequirement;

  $('quality-results').addEventListener('click', event => {
    const button = event.target.closest('[data-quality-review]');
    if (!button) return;
    const issue = tableViews.get('quality-results')?.records[Number(button.dataset.qualityReview)];
    if (issue) task(() => openReviewForIssue(issue))(event);
  });

  $('quality-category').onchange = () => { pages['quality-results'] = 0; renderQuality(); };
  $('quality-search').oninput = () => { pages['quality-results'] = 0; renderQuality(); };
  $('change-search').oninput = () => { pages.changes = 0; renderChanges(); };
  $('review-search').oninput = () => { pages['review-history'] = 0; renderReviews(); };

  for (const [prefix, tableId, rows] of [
    ['quality', 'quality-results', qualityRows], ['changes', 'changes', changeRows], ['reviews', 'review-history', reviewRows]
  ]) {
    for (const extension of ['csv', 'xlsx']) {
      $(prefix + '-' + extension).onclick = () => {
        const view = tableViews.get(tableId);
        if (!view?.rows.length) return;
        const page = (pages[tableId] || 0) + 1;
        LiveLabsExport[extension]([view.headers, ...view.rows], `livelabs-${prefix}-page-${page}-${new Date().toISOString().slice(0, 10)}.${extension}`);
      };
    }
  }

  $('review-form').onsubmit = task(async event => {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.target));
    await api('reviews', body);
    event.target.elements.reason.value = '';
    $('review-selection-note').textContent = 'Decision saved. You can record another decision for this or another item.';
    await loadReviews();
    status('Decision recorded with your login identity and UTC timestamp.');
  });

  activateTab(location.hash.slice(1));
  syncCandidateRequirement();
  (async () => {
    try {
      const session = await api('session');
      csrf = session.csrf;
      $('identity').textContent = `Signed in as ${session.username} · session expires ${new Date(session.idleExpires * 1000).toLocaleString()}`;
      await Promise.all([loadSnapshots(), loadReviews()]);
      window.LiveLabsLoading.ready();
    } catch (error) {
      status(error.message);
      window.LiveLabsLoading.fail('Administration could not be loaded. Please try again.');
    }
  })();
})();
