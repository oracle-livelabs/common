(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const PREVIEW_LIMIT = 5;
  const LABELS = {
    matchStatus: 'Match', livelabsId: 'LiveLabs ID', wmsId: 'WMS ID', analyticsRecordKey: 'Analytics key',
    analyticsTitle: 'Analytics title', analyticsPublishStatus: 'Publish status', qaRunId: 'QA run',
    qaRunStatus: 'Run status', qaStartedAt: 'Run started', qaItemTitle: 'QA catalog item',
    qaItemStatus: 'Item status', qaTestTitle: 'Test', qaTestStatus: 'Test status', qaExpectedStatus: 'Expected',
    qaSection: 'Section', qaClassification: 'Classification', qaIssueCodes: 'Issue codes', candidateCount: 'Candidates',
    qaPrioritySummary: 'Issue priority', qaIssueCount: 'Issue rows', qaIssueOccurrences: 'Reported occurrences',
    qaIssueSummary: 'Issue summary', qaReportPairing: 'Report pairing',
    qaJenkinsErrorScore: 'Jenkins Error Score', qaJenkinsScoreState: 'Score state',
    qaPriorityCounts: 'Priority counts', qaPriorityP1: 'P1 findings', qaPriorityP2Occurrences: 'P2 occurrences',
    qaPriorityP3Occurrences: 'P3 occurrences',
    title: 'Title', wmsId: 'WMS ID', livelabsId: 'LiveLabs ID', type: 'Type', publishStatus: 'Publish status',
    status: 'Status', owner: 'Owner', update: 'Update', itemTitle: 'Catalog item', testTitle: 'Test',
    testStatus: 'Test status', expectedStatus: 'Expected', classification: 'Classification', issueCodes: 'Issue codes',
    section: 'Section', runType: 'Run type', startedAt: 'Started', endedAt: 'Ended', recordType: 'Row type', itemStatus: 'Item status'
  };

  const ISSUE_TAXONOMY = Object.freeze({
    STALE_PAR_LINK: { priority: 'P1', label: 'P1 · learner blocker' },
    BROKEN_VISIBLE_LINK: { priority: 'P1', label: 'P1 · learner blocker' },
    BROKEN_VISIBLE_IMAGE: { priority: 'P1', label: 'P1 · learner blocker' },
    SOURCE_SCAN_INCOMPLETE: { priority: 'P1', label: 'P1 candidate · verify first', verificationRequired: true },
    INSTRUCTIONS_FLOW: { priority: 'P1', label: 'P1 · learner blocker' },
    CONTENT_TEXT_DEFECT: { priority: 'P2', label: 'P2 · content review' },
    MARKDOWN_FORMATTING: { priority: 'P2', label: 'P2 · content review' },
    WRITING_GRAMMAR: { priority: 'P2', label: 'P2 · content review' },
    POSSIBLE_TYPO: { priority: 'P2', label: 'P2 · content review' },
    WORKSHOP_NOT_AVAILABLE: { priority: '', label: 'Internal QA only' },
    PAR_SCAN_INCOMPLETE: { priority: '', label: 'Internal QA only' },
    AUTHENTICATION_REQUIRED: { priority: '', label: 'Internal QA only' }
  });

  let csrf = '';
  let sessionTimer;
  let previewRequest = 0;
  let snapshots = [];
  let qaSnapshots = [];
  let archiveRuns = [];
  let mergeHistory = [];
  let editing = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function setStatus(message) { $('status').textContent = message; }

  function scheduleExpiry(expires) {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => location.replace('/admin'), Math.max(0, expires * 1000 - Date.now()));
  }

  async function api(path, { method = 'GET', body, responseType = 'json' } = {}) {
    const options = { method, cache: 'no-store' };
    if (body) {
      options.headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf };
      options.body = JSON.stringify(body);
    }
    const response = await fetch('/api/admin/' + path, options);
    const expiry = Number(response.headers.get('X-Session-Expires'));
    if (Number.isFinite(expiry) && expiry > 0) scheduleExpiry(expiry);
    if (response.status === 401) {
      location.replace('/admin?next=' + encodeURIComponent(location.pathname));
      throw new Error('Your admin session expired.');
    }
    if (!response.ok) {
      let message = 'Request failed.';
      try { message = (await response.json()).error || message; } catch { /* keep the fallback */ }
      throw new Error(message);
    }
    return responseType === 'blob' ? response.blob() : responseType === 'text' ? response.text() : response.json();
  }

  async function post(path, body) { return api(path, { method: 'POST', body }); }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadJson(payload, filename) {
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), filename);
  }

  function selectOptions(select, items, labelFn, valueFn, emptyLabel) {
    const selected = select.value;
    select.innerHTML = items.length
      ? items.map((item) => `<option value="${esc(valueFn(item))}">${esc(labelFn(item))}</option>`).join('')
      : `<option value="">${esc(emptyLabel)}</option>`;
    select.disabled = items.length === 0;
    if (items.some((item) => String(valueFn(item)) === selected)) select.value = selected;
    else if (items.length) select.value = String(valueFn(items[0]));
  }

  function displayValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.join('; ') || '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function renderTable(target, rows, columns, limit = PREVIEW_LIMIT, label = 'Data preview') {
    if (!rows.length || !columns.length) {
      target.innerHTML = '<p class="admin-empty preview-empty">No preview rows are available for this version.</p>';
      return 0;
    }
    const sample = rows.slice(0, limit);
    const heads = columns.map((key) => `<th scope="col">${esc(LABELS[key] || key)}</th>`).join('');
    const body = sample.map((row) => `<tr>${columns.map((key) => {
      const value = displayValue(row[key]);
      return `<td title="${esc(value)}">${esc(value)}</td>`;
    }).join('')}</tr>`).join('');
    target.innerHTML = `<p class="preview-caption">Showing ${sample.length} of ${rows.length.toLocaleString()} rows</p><div class="preview-table-scroll"><table class="preview-table" aria-label="${esc(label)}"><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></div>`;
    return sample.length;
  }

  function analyticsRows(snapshot) {
    return (snapshot.records || []).map((record) => ({
      livelabsId: record.livelabsId || '', wmsId: record.wmsId || '', title: record.title || '',
      type: record.type || '', publishStatus: record.publishStatus || '', status: record.status || record.lifecycleState || '',
      owner: record.owner || '', update: record.update || ''
    }));
  }

  function qaRows(summary) {
    const base = { runId: summary.runId || '', runType: summary.runType || 'regression', runStatus: summary.status || '' };
    const rows = [];
    for (const item of Array.isArray(summary.catalogItems) ? summary.catalogItems : []) {
      if (!item || typeof item !== 'object') continue;
      const catalog = item.catalogItem || {};
      const tests = Array.isArray(item.tests) ? item.tests : [];
      const issues = Array.isArray(item.issues) ? item.issues : [];
      const issueSummary = summarizeIssues(issues);
      const shared = {
        ...base, itemTitle: catalog.title || '', livelabsId: catalog.livelabsId || '', wmsId: catalog.wmsId || '',
        itemStatus: item.status || '', qaIssueCount: issueSummary.rows, qaIssueOccurrences: issueSummary.occurrences,
        qaPrioritySummary: issueSummary.prioritySummary, qaIssueSummary: issueSummary.preview,
        qaReportPairing: item.reportPairingStatus || '', qaTestCounts: item.counts || {}
      };
      if (!tests.length) rows.push({ ...shared, recordType: 'catalog-item', testTitle: '', testStatus: '', expectedStatus: '', section: '', classification: issueSummary.prioritySummary, issueCodes: issueSummary.codes });
      for (const test of tests) {
        const related = issues.filter((issue) => issue?.testTitle === test.title).map((issue) => issue?.code).filter(Boolean);
        rows.push({ ...shared, recordType: 'test', testTitle: test.title || '', testStatus: test.status || '', expectedStatus: test.expectedStatus || '', section: test.section || '', classification: test.classification || '', issueCodes: related.join('; ') });
      }
    }
    if (!rows.length && Array.isArray(summary.failures)) {
      for (const failure of summary.failures) {
        if (!failure || typeof failure !== 'object') continue;
        const catalog = failure.catalogItem || {};
        rows.push({ ...base, recordType: 'failure', itemTitle: catalog.title || '', livelabsId: catalog.livelabsId || '', wmsId: catalog.wmsId || '', testTitle: failure.title || '', testStatus: failure.status || '', expectedStatus: failure.expectedStatus || '', section: failure.section || '', classification: failure.classification || '' });
      }
    }
    if (!rows.length && Array.isArray(summary.tests)) {
      for (const test of summary.tests) {
        const catalog = test.catalogItem || {};
        rows.push({ ...base, recordType: 'test', itemTitle: catalog.title || test.itemTitle || '', livelabsId: catalog.livelabsId || test.livelabsId || '', wmsId: catalog.wmsId || test.wmsId || '', testTitle: test.title || '', testStatus: test.status || '', expectedStatus: test.expectedStatus || '', section: test.section || '', classification: test.classification || '' });
      }
    }
    if (!rows.length) {
      const counts = summary.counts || {};
      rows.push({ ...base, recordType: 'run-summary', itemStatus: summary.status || '', testTitle: `${counts.total || 0} total · ${counts.passed || 0} passed · ${counts.unexpected ?? counts.failed ?? 0} failed · ${counts.skipped || 0} skipped` });
    }
    return rows;
  }

  function summarizeIssues(issues) {
    const counts = { p1: 0, p1Verify: 0, p2: 0, internal: 0, unmapped: 0 };
    let occurrences = 0;
    const codes = [];
    const previews = [];
    for (const issue of issues) {
      if (!issue || typeof issue !== 'object') continue;
      const code = String(issue.code || '').trim().toUpperCase();
      const taxonomy = ISSUE_TAXONOMY[code];
      const count = Number(issue.count ?? issue.findingCount ?? 1);
      occurrences += Number.isFinite(count) && count > 0 ? count : 1;
      if (taxonomy?.verificationRequired) counts.p1Verify += 1;
      else if (taxonomy?.priority === 'P1') counts.p1 += 1;
      else if (taxonomy?.priority === 'P2') counts.p2 += 1;
      else if (taxonomy && !taxonomy.priority) counts.internal += 1;
      else counts.unmapped += 1;
      if (code && !codes.includes(code)) codes.push(code);
      if (previews.length < 3) previews.push(`${taxonomy?.label || 'Unmapped · review'} — ${issue.label || code || 'Unclassified'}${issue.message || issue.summary ? `: ${issue.message || issue.summary}` : ''}`);
    }
    const labels = [];
    if (counts.p1) labels.push(`P1 ${counts.p1}`);
    if (counts.p1Verify) labels.push(`P1 verify ${counts.p1Verify}`);
    if (counts.p2) labels.push(`P2 ${counts.p2}`);
    if (counts.internal) labels.push(`Internal QA ${counts.internal}`);
    if (counts.unmapped) labels.push(`Unmapped ${counts.unmapped}`);
    return { rows: issues.length, occurrences, codes: codes.join('; '), prioritySummary: labels.join(' · ') || 'No categorized findings', preview: previews.join(' | ') };
  }

  function qaSourceFootnote(summary) {
    const report = summary?.sourceReport;
    if (!report) return 'Showing catalog and test rows from the selected report.';
    const warnings = Array.isArray(report.warnings) ? report.warnings : [];
    const checks = `${Number(report.catalogItemsInMerged || 0).toLocaleString()} catalog items · ${Number(report.findingsCsvIssueRows || 0).toLocaleString()} issue rows · ${report.categoryRowsMatch ? 'issue-category totals match' : 'issue-category totals need review'}`;
    return warnings.length ? `${checks}. Reconciliation: ${warnings.join(' ')}` : checks;
  }

  function setSourceButtons() {
    const hasAnalytics = Boolean($('snapshot-select').value);
    const hasQa = Boolean($('jenkins-select').value);
    $('map-reports').disabled = !hasAnalytics || !hasQa;
    ['download-snapshot', 'edit-snapshot', 'delete-snapshot', 'export-analytics-csv'].forEach((id) => { $(id).disabled = !hasAnalytics; });
    ['download-jenkins', 'edit-jenkins', 'delete-jenkins', 'export-jenkins-csv'].forEach((id) => { $(id).disabled = !hasQa; });
    $('capture-snapshot').disabled = false;
    $('copy-archive-run').disabled = !$('archive-run-select').value;
  }

  function renderHistory(target, items, kind) {
    if (!items.length) {
      target.innerHTML = '<p class="admin-empty">No saved versions yet. Upload a source file or capture the current Analytics inventory.</p>';
      return;
    }
    const rows = items.map((item) => `<tr>
      <td><strong>${esc(item.label || item.runId || item.id.slice(0, 8))}</strong><small>${esc(item.date || item.runId || '—')} · ${esc(item.source || 'upload')}</small></td>
      <td>${new Date(item.created).toLocaleString()}${item.parent_id || item.parentId ? `<small>Version of ${esc((item.parent_id || item.parentId).slice(0, 8))}</small>` : '<small>Original source</small>'}</td>
      <td class="history-actions"><button type="button" data-history-select="${esc(item.id)}" data-kind="${kind}">Select</button><button type="button" data-history-edit="${esc(item.id)}" data-kind="${kind}">Edit</button><button type="button" class="danger-button" data-history-delete="${esc(item.id)}" data-kind="${kind}">Delete</button></td>
    </tr>`).join('');
    target.innerHTML = `<div class="history-table-scroll"><table class="history-table"><thead><tr><th>Snapshot</th><th>Saved</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderMergeHistory() {
    if (!mergeHistory.length) {
      $('merge-history').innerHTML = '<p class="admin-empty">No merge has been applied to the dashboard yet.</p>';
      return;
    }
    const rows = mergeHistory.map((entry) => `<tr><td><strong>${entry.active ? 'Active dashboard merge' : 'Previous merge'}</strong><small>${esc(entry.id.slice(0, 8))}</small></td><td>${new Date(entry.created).toLocaleString()}</td><td>${esc(entry.mapping.analyticsField)} ↔ ${esc(entry.mapping.qaField)}<small>${Number(entry.summary.matchedDashboardItems || 0).toLocaleString()} dashboard items</small></td><td class="history-actions"><button type="button" class="danger-button" data-merge-delete="${esc(entry.id)}">${entry.active ? 'Remove from dashboard' : 'Delete history'}</button></td></tr>`).join('');
    $('merge-history').innerHTML = `<div class="history-table-scroll"><table class="history-table"><thead><tr><th>Dashboard integration</th><th>Applied</th><th>Field mapping</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderSelections() {
    const snapshot = snapshots.find((item) => item.id === $('snapshot-select').value);
    const qa = qaSnapshots.find((item) => item.id === $('jenkins-select').value);
    const archive = archiveRuns.find((item) => item.runId === $('archive-run-select').value);
    $('snapshot-info').textContent = snapshot ? `Inventory date ${snapshot.date} · saved ${new Date(snapshot.created).toLocaleString()} · ${snapshot.label}` : 'Upload or capture an Analytics snapshot to start.';
    $('jenkins-info').textContent = qa ? `Run ${qa.runId} · saved ${new Date(qa.created).toLocaleString()} · ${qa.source === 'local-archive' ? 'copied from local archive' : qa.source}` : 'Upload a Jenkins QA summary or copy a local archived report.';
    $('selection-summary').textContent = `Analytics: ${snapshot ? `${snapshot.date} / ${snapshot.id.slice(0, 8)}` : 'none'} · QA: ${qa ? `${qa.runId} / ${qa.id.slice(0, 8)}` : 'none'}${archive ? ` · archive available: ${archive.runId}` : ''}`;
    $('analytics-history-count').textContent = `${snapshots.length} version${snapshots.length === 1 ? '' : 's'}`;
    $('jenkins-history-count').textContent = `${qaSnapshots.length} version${qaSnapshots.length === 1 ? '' : 's'}`;
    renderHistory($('analytics-history'), snapshots, 'analytics');
    renderHistory($('jenkins-history'), qaSnapshots, 'qa');
    setSourceButtons();
  }

  function queryForMerge() {
    const params = new URLSearchParams({
      analytics_id: $('snapshot-select').value,
      qa_id: $('jenkins-select').value,
      analytics_field: $('analytics-match-field').value,
      qa_field: $('qa-match-field').value
    });
    return params.toString();
  }

  function resetMergePreview(message) {
    $('merge-status-title').textContent = message;
    $('merge-status-detail').textContent = 'Choose one saved version from each source to calculate a preview.';
    $('merge-counts').innerHTML = '<li>Waiting for sources</li>';
    $('merge-preview-count').textContent = 'Waiting';
    $('merge-preview-meta').textContent = 'Select both sources to calculate the mapped preview.';
    $('merge-preview-content').innerHTML = '<p class="admin-empty">The combined preview will update when you select source versions or change the mapping.</p>';
    $('merge-csv').disabled = true;
    $('apply-merge').disabled = true;
  }

  async function refreshPreviews(mapSelected = false) {
    const request = ++previewRequest;
    const analyticsId = $('snapshot-select').value;
    const qaId = $('jenkins-select').value;
    setSourceButtons();
    if (!analyticsId) {
      $('analytics-preview-count').textContent = 'No snapshot selected';
      $('analytics-preview-meta').textContent = 'Upload or capture an Analytics snapshot to preview inventory records.';
      $('analytics-preview-content').innerHTML = '<p class="admin-empty preview-empty">No Analytics snapshot selected.</p>';
      $('analytics-preview-fields').textContent = '';
      $('analytics-preview-card').setAttribute('aria-busy', 'false');
    }
    if (!qaId) {
      $('jenkins-preview-count').textContent = 'No report selected';
      $('jenkins-preview-meta').textContent = 'Upload a Jenkins QA summary or copy a local archived run.';
      $('jenkins-preview-content').innerHTML = '<p class="admin-empty preview-empty">No QA report snapshot selected.</p>';
      $('jenkins-preview-fields').textContent = '';
      $('jenkins-preview-card').setAttribute('aria-busy', 'false');
    }
    if (!analyticsId || !qaId) {
      resetMergePreview('Select both source versions');
      if (analyticsId) {
        const snapshot = await api('snapshot?snapshot=' + encodeURIComponent(analyticsId));
        if (request !== previewRequest) return;
        const rows = analyticsRows(snapshot);
        renderTable($('analytics-preview-content'), rows, ['livelabsId', 'wmsId', 'title', 'type', 'publishStatus', 'status', 'owner']);
        $('analytics-preview-count').textContent = `${rows.length.toLocaleString()} records`;
        $('analytics-preview-meta').textContent = `Inventory date ${snapshot.metadata?.snapshot_date || snapshot.metadata?.snapshotDate || 'N/A'} · ${analyticsId.slice(0, 8)}`;
        $('analytics-preview-fields').textContent = 'Showing a sample of the selected snapshot.';
        $('analytics-preview-card').setAttribute('aria-busy', 'false');
      }
      if (qaId) {
        const summary = await api('qa-snapshot?snapshot=' + encodeURIComponent(qaId));
        if (request !== previewRequest) return;
        const rows = qaRows(summary);
        renderTable($('jenkins-preview-content'), rows, ['recordType', 'itemTitle', 'livelabsId', 'wmsId', 'itemStatus', 'qaPrioritySummary', 'qaIssueCount', 'qaIssueOccurrences', 'qaIssueSummary', 'qaReportPairing']);
        $('jenkins-preview-count').textContent = `${rows.length.toLocaleString()} report rows`;
        $('jenkins-preview-meta').textContent = `Run ${summary.runId} · ${summary.status || 'status unavailable'} · ${summary.startedAt || 'start time unavailable'}`;
        $('jenkins-preview-fields').textContent = qaSourceFootnote(summary);
        $('jenkins-preview-card').setAttribute('aria-busy', 'false');
      }
      return;
    }

    $('analytics-preview-card').setAttribute('aria-busy', 'true');
    $('jenkins-preview-card').setAttribute('aria-busy', 'true');
    $('merge-preview-content').innerHTML = '<p class="admin-empty">Calculating source matches…</p>';
    try {
      const [snapshot, summary] = await Promise.all([
        api('snapshot?snapshot=' + encodeURIComponent(analyticsId)),
        api('qa-snapshot?snapshot=' + encodeURIComponent(qaId))
      ]);
      if (request !== previewRequest) return;
      const inventoryRows = analyticsRows(snapshot);
      const reportRows = qaRows(summary);
      renderTable($('analytics-preview-content'), inventoryRows, ['livelabsId', 'wmsId', 'title', 'type', 'publishStatus', 'status', 'owner']);
      renderTable($('jenkins-preview-content'), reportRows, ['recordType', 'itemTitle', 'livelabsId', 'wmsId', 'itemStatus', 'qaPrioritySummary', 'qaIssueCount', 'qaIssueOccurrences', 'qaIssueSummary', 'qaReportPairing']);
      $('analytics-preview-count').textContent = `${inventoryRows.length.toLocaleString()} records`;
      $('analytics-preview-meta').textContent = `Inventory date ${snapshot.metadata?.snapshot_date || snapshot.metadata?.snapshotDate || 'N/A'} · ${analyticsId.slice(0, 8)}`;
      $('analytics-preview-fields').textContent = 'Showing a sample of the selected snapshot.';
      $('jenkins-preview-count').textContent = `${reportRows.length.toLocaleString()} report rows`;
      $('jenkins-preview-meta').textContent = `Run ${summary.runId} · ${summary.status || 'status unavailable'} · ${summary.startedAt || 'start time unavailable'}`;
      $('jenkins-preview-fields').textContent = qaSourceFootnote(summary);
      $('analytics-preview-card').setAttribute('aria-busy', 'false');
      $('jenkins-preview-card').setAttribute('aria-busy', 'false');
      if (!mapSelected) {
        resetMergePreview('Sources ready to map');
        $('merge-status-detail').textContent = 'Review the selected source snapshots, then map their item identifiers.';
        return;
      }
      $('merge-preview-content').innerHTML = '<p class="admin-empty">Mapping selected records…</p>';
      const merged = await api('merge-preview?' + queryForMerge());
      if (request !== previewRequest) return;
      renderMergePreview(merged);
    } catch (error) {
      if (request !== previewRequest) return;
      $('merge-status-title').textContent = 'Preview could not be calculated';
      $('merge-status-detail').textContent = error.message;
      $('merge-preview-count').textContent = 'Unavailable';
      $('merge-preview-content').innerHTML = '<p class="admin-empty preview-error">Check the selected versions and field mapping, then try again.</p>';
      $('merge-csv').disabled = true;
      $('apply-merge').disabled = true;
    }
  }

  function renderMergePreview(data) {
    const counts = data.counts;
    const summaryItems = [
      ['Matched QA rows', counts.matchedRows], ['Matched dashboard items', counts.matchedAnalyticsRecords],
      ['Analytics only', counts.unmatchedAnalyticsRecords], ['QA only', counts.unmatchedQaRows], ['Ambiguous QA rows', counts.ambiguousQaRows],
      ['P1 findings', counts.p1Findings], ['Average Jenkins Error Score', counts.averageJenkinsErrorScore == null ? 'N/A' : Number(counts.averageJenkinsErrorScore).toFixed(2)]
    ];
    $('merge-status-title').textContent = data.applyable ? 'Mapped preview is ready' : 'No unique dashboard matches yet';
    const reportWarnings = Array.isArray(data.reportSummary?.warnings) ? data.reportSummary.warnings : [];
    $('merge-status-detail').textContent = data.applyable
      ? `Review the counts and sample rows. Only uniquely matched records with LiveLabs IDs can be applied.${reportWarnings.length ? ` Source reconciliation: ${reportWarnings.join(' ')}` : ''}`
      : 'Change the field mapping or upload a QA report with item identifiers before applying.';
    $('merge-counts').innerHTML = summaryItems.map(([label, value]) => `<li><strong>${esc(label)}</strong><span>${typeof value === 'number' ? value.toLocaleString() : esc(value)}</span></li>`).join('');
    $('merge-preview-count').textContent = `${counts.totalRows.toLocaleString()} rows`;
    $('merge-preview-meta').textContent = `Trimmed, case-insensitive exact match · ${LABELS[data.mapping.analyticsField]} ↔ ${LABELS[data.mapping.qaField]} · sample of the full merged CSV`;
    renderTable($('merge-preview-content'), data.rows || [], ['matchStatus', 'livelabsId', 'analyticsTitle', 'qaItemTitle', 'qaPrioritySummary', 'qaJenkinsErrorScore', 'qaPriorityP1', 'qaPriorityP2Occurrences', 'qaPriorityP3Occurrences', 'qaIssueSummary'], 8, 'Merged Analytics and Jenkins preview');
    $('merge-csv').disabled = false;
    $('apply-merge').disabled = !data.applyable;
  }

  async function loadSources(prefer = {}) {
    const analyticsSelection = $('snapshot-select').value;
    const qaSelection = $('jenkins-select').value;
    [snapshots, qaSnapshots, archiveRuns, mergeHistory] = await Promise.all([
      api('snapshots'), api('qa-snapshots'), api('jenkins/runs').then((data) => data.runs || []), api('merges')
    ]);
    selectOptions($('snapshot-select'), snapshots, (item) => `${item.date} · ${item.label} · ${item.id.slice(0, 8)}`, (item) => item.id, 'No Analytics snapshots saved');
    selectOptions($('jenkins-select'), qaSnapshots, (item) => `${item.runId} · ${item.label} · ${item.id.slice(0, 8)}`, (item) => item.id, 'No QA report snapshots saved');
    selectOptions($('archive-run-select'), archiveRuns, (item) => `${item.startedAt || item.runId} · ${item.status} · ${item.total} tests`, (item) => item.runId, 'No local archive runs found');
    if (prefer.analyticsId && snapshots.some((item) => item.id === prefer.analyticsId)) $('snapshot-select').value = prefer.analyticsId;
    if (prefer.qaId && qaSnapshots.some((item) => item.id === prefer.qaId)) $('jenkins-select').value = prefer.qaId;
    if (snapshots.some((item) => item.id === analyticsSelection)) $('snapshot-select').value = analyticsSelection;
    if (qaSnapshots.some((item) => item.id === qaSelection)) $('jenkins-select').value = qaSelection;
    renderSelections();
    renderMergeHistory();
    await refreshPreviews();
  }

  async function readJsonFile(file, maxMb = 30) {
    if (!file) return null;
    if (file.size > maxMb * 1024 * 1024) throw new Error(`JSON files must be ${maxMb} MB or smaller.`);
    try { return JSON.parse(await file.text()); }
    catch { throw new Error('This file is not valid JSON.'); }
  }

  function fileExtension(file) { return String(file?.name || '').split('.').pop().toLowerCase(); }

  async function readImportedFile(file, maxMb = 20) {
    if (!file || file.size > maxMb * 1024 * 1024) throw new Error(`Each imported file must be ${maxMb} MB or smaller.`);
    const extension = fileExtension(file);
    if (extension === 'json') return readJsonFile(file, maxMb);
    if (extension === 'csv') return { kind: 'table', rows: parseCsv(await file.text()), headers: [] };
    if (extension === 'xlsx' || extension === 'xlsm') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
      }
      const parsed = await post('parse-xlsx', { filename: file.name, contentBase64: btoa(binary) });
      return { kind: 'table', ...parsed };
    }
    throw new Error('Choose a JSON, CSV, or .xlsx file.');
  }

  function headerToken(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function rowValue(row, aliases) {
    const values = new Map(Object.entries(row || {}).map(([key, value]) => [headerToken(key), value]));
    for (const alias of aliases) {
      const value = values.get(headerToken(alias));
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  }

  function scalarValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
  }

  function normalizeAnalyticsRows(rows, filename, sourceMetadata = {}) {
    const usable = (rows || []).filter((row) => row && typeof row === 'object' && !Array.isArray(row));
    if (!usable.length) throw new Error('The Analytics file has no data rows.');
    const seenIds = new Set();
    const records = usable.map((row, index) => {
      const livelabsId = String(rowValue(row, ['livelabsId', 'LiveLabs ID', 'LiveLabs Id', 'Workshop ID']) || '').trim();
      const wmsId = String(rowValue(row, ['wmsId', 'WMS ID', 'WMS Id']) || '').trim();
      const title = String(rowValue(row, ['title', 'Workshop Title', 'LiveLabs Title', 'Catalog Item Title', 'Name']) || '').trim();
      if (!title) throw new Error(`Analytics row ${index + 2} has no title. Include a Title column.`);
      if (livelabsId && seenIds.has(livelabsId)) throw new Error(`The Analytics file repeats LiveLabs ID ${livelabsId}.`);
      if (livelabsId) seenIds.add(livelabsId);
      const category = String(rowValue(row, ['category', 'Council Area', 'Focus Area']) || '');
      const type = String(rowValue(row, ['type', 'Content Type', 'Workshop Type']) || '');
      const publishStatus = String(rowValue(row, ['publishStatus', 'Publish Status']) || '');
      const publishType = String(rowValue(row, ['publishType', 'Publish Type']) || '');
      const status = String(rowValue(row, ['status', 'Workshop Status', 'Lifecycle State']) || '');
      const update = String(rowValue(row, ['update', 'Last Meaningful Update', 'Last Update', 'WMS Last Update']) || '');
      const owner = String(rowValue(row, ['owner', 'Owner', 'Owner Email', 'Author Email']) || '');
      const pairs = Object.entries(row).map(([key, value]) => [String(key), scalarValue(value)]);
      const key = String(rowValue(row, ['key', 'recordKey']) || (livelabsId ? `livelabs:${livelabsId}` : wmsId ? `import:${wmsId}:${index}` : `import:${index}`));
      return {
        key, title, rawTitle: title, titleMissing: false,
        wmsId, wmsIdMissing: !wmsId, livelabsId, livelabsIdMissing: !livelabsId,
        category, categoryMissing: !category, owner, ownerMissing: !owner, type,
        publishStatus, publishType, status, lifecycleState: status, update,
        contactCoverage: {}, source: filename, sourceFlags: {}, searchable: pairs.map((pair) => String(pair[1] || '')).join(' '),
        values: pairs, details: [], fileUpdates: [], family: {},
      };
    });
    const snapshotDate = String(sourceMetadata.snapshot_date || sourceMetadata.snapshotDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    return { metadata: { ...sourceMetadata, snapshot_date: snapshotDate, generated_at: sourceMetadata.generated_at || new Date().toISOString(), source: filename }, records, rankings: {} };
  }

  function normalizeAnalyticsImport(parsed, filename) {
    if (parsed?.kind === 'table') return normalizeAnalyticsRows(parsed.rows, filename);
    if (Array.isArray(parsed)) return normalizeAnalyticsRows(parsed, filename);
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.records) && parsed.records.every((record) => record && typeof record.title === 'string')) {
        const metadata = parsed.metadata && typeof parsed.metadata === 'object' ? parsed.metadata : {};
        return { ...parsed, metadata: { ...metadata, snapshot_date: metadata.snapshot_date || metadata.snapshotDate || new Date().toISOString().slice(0, 10) } };
      }
      const rows = Array.isArray(parsed.rows) ? parsed.rows : Array.isArray(parsed.data) ? parsed.data : null;
      if (rows) return normalizeAnalyticsRows(rows, filename, parsed.metadata || {});
    }
    throw new Error('Use canonical Analytics JSON or a CSV/Excel table with item IDs and titles.');
  }

  function normalizeJenkinsRows(rows, filename) {
    const usable = (rows || []).filter((row) => row && typeof row === 'object' && !Array.isArray(row));
    if (!usable.length) throw new Error('The Jenkins file has no report rows.');
    const first = usable[0];
    const explicitRunIds = new Set(usable.map((row) => String(rowValue(row, ['run_id', 'runId', 'build_id', 'buildId']) || '').trim()).filter(Boolean));
    if (explicitRunIds.size > 1) throw new Error('The Jenkins file contains more than one run. Import one run at a time.');
    const slug = String(filename || 'report').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 70);
    const runId = [...explicitRunIds][0] || `upload-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${slug}`;
    const startedAt = String(rowValue(first, ['started_at', 'startedAt', 'run_started', 'started']) || new Date().toISOString());
    const runStatus = String(rowValue(first, ['run_status', 'runStatus', 'build_status', 'buildStatus']) || '');
    const grouped = new Map();
    const count = (value) => { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 1; };
    for (const [index, row] of usable.entries()) {
      const livelabsId = String(rowValue(row, ['item_id', 'livelabs_id', 'livelabsId', 'workshop_id']) || '').trim();
      const wmsId = String(rowValue(row, ['wms_id', 'wmsId']) || '').trim();
      const title = String(rowValue(row, ['item_title', 'catalog_item_title', 'title', 'workshop_title', 'name']) || '').trim();
      const type = String(rowValue(row, ['item_type', 'content_type', 'type']) || 'workshop').trim();
      const identity = livelabsId || wmsId || title;
      if (!identity) throw new Error(`Jenkins row ${index + 2} has no LiveLabs ID, WMS ID, or item title.`);
      const key = `${type}:${identity}`;
      if (!grouped.has(key)) grouped.set(key, { key, type, status: '', counts: { total: 0, passed: 0, failed: 0, skipped: 0 }, catalogItem: { livelabsId, wmsId, title, type }, tests: [], issues: [] });
      const item = grouped.get(key);
      const itemStatus = String(rowValue(row, ['item_status', 'itemStatus']) || '');
      if (itemStatus) item.status = itemStatus;
      const testTitle = String(rowValue(row, ['test_title', 'test_name', 'test', 'case_name']) || '').trim();
      const testStatus = String(rowValue(row, ['test_status', 'result', 'outcome', 'status']) || '').trim();
      if (testTitle || testStatus) {
        item.tests.push({ title: testTitle, section: String(rowValue(row, ['test_section', 'section']) || ''), status: testStatus, expectedStatus: String(rowValue(row, ['expected_status', 'expectedStatus']) || ''), classification: String(rowValue(row, ['classification']) || '') });
        item.counts.total += 1;
        const result = testStatus.toLowerCase();
        if (['passed', 'pass', 'success'].includes(result)) item.counts.passed += 1;
        else if (['skipped', 'skip'].includes(result)) item.counts.skipped += 1;
        else if (['failed', 'fail', 'error', 'timedout', 'timed out'].includes(result)) item.counts.failed += 1;
      }
      const code = String(rowValue(row, ['issue_code', 'finding_code', 'error_code', 'code']) || '').trim().toUpperCase();
      const message = String(rowValue(row, ['issue_summary', 'finding', 'summary', 'message', 'description', 'error']) || '').trim();
      if (code || message) item.issues.push({
        code: code || 'UNCLASSIFIED', label: String(rowValue(row, ['issue_label', 'label']) || code || 'Unclassified'),
        priority: String(rowValue(row, ['issue_priority', 'priority', 'taxonomy_priority']) || '').toUpperCase(),
        severity: String(rowValue(row, ['severity', 'qa_severity']) || ''),
        count: count(rowValue(row, ['issue_count', 'occurrences', 'finding_count', 'count'])),
        message, section: String(rowValue(row, ['test_section', 'section']) || ''),
        testTitle, file: String(rowValue(row, ['test_file', 'file', 'source_file']) || ''),
        line: String(rowValue(row, ['test_line', 'line']) || ''),
        catalogUrl: String(rowValue(row, ['catalog_url', 'catalogUrl']) || ''),
        finalUrl: String(rowValue(row, ['final_url', 'finalUrl']) || ''),
      });
    }
    if (!grouped.size) throw new Error('No Jenkins catalog items could be identified.');
    const items = [...grouped.values()];
    return {
      runId, runType: 'imported report', status: runStatus, startedAt,
      counts: { total: items.reduce((sum, item) => sum + item.counts.total, 0), passed: items.reduce((sum, item) => sum + item.counts.passed, 0), failed: items.reduce((sum, item) => sum + item.counts.failed, 0), skipped: items.reduce((sum, item) => sum + item.counts.skipped, 0) },
      catalogItems: items,
      sourceReport: { format: 'tabular import', sourceFiles: { report: filename }, warnings: ['This table supplies finding summaries. Import the matching Complete JSON as well to retain exact lab locations, source text, and link diagnostics. Check the mapping before applying.'], findingsCsvIssueRows: items.reduce((sum, item) => sum + item.issues.length, 0) },
    };
  }

  function normalizeJenkinsSingle(parsed, filename) {
    if (parsed?.kind === 'table') return normalizeJenkinsRows(parsed.rows, filename);
    if (Array.isArray(parsed)) return normalizeJenkinsRows(parsed, filename);
    if (parsed && typeof parsed === 'object' && parsed.runId && Array.isArray(parsed.catalogItems)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows)) return normalizeJenkinsRows(parsed.rows, filename);
    if (parsed?.schemaVersion === 2 && parsed.run && Array.isArray(parsed.items)) {
      const run = parsed.run;
      if (parsed.items.some(item => new Set([String(item.livelabsId || item.catalog?.id || ''), ...(item.catalog?.ids || []).map(String), ...(item.catalog?.duplicate_ids || []).map(String)]).size > 1)) {
        throw new Error('This export groups multiple LiveLabs IDs. Import a per-ID summary or the reconciled JSON/CSV pair; grouped findings cannot be assigned to each ID.');
      }
      return {
        ...run,
        runId: String(run.id || ''), runType: String(run.type || 'regression'), status: String(run.status || ''),
        startedAt: String(run.startedAt || ''), endedAt: String(run.endedAt || ''), counts: run.counts || {},
        failures: parsed.items.flatMap(item => (Array.isArray(item.evidence) ? item.evidence : []).map(evidence => ({
          ...evidence, attachments: [], catalogItem: {...item.catalog, id: String(item.livelabsId ?? item.catalog?.id ?? ''),
            livelabsId: String(item.livelabsId ?? item.catalog?.id ?? ''), type: String(item.type || item.catalog?.type || 'workshop')},
        }))),
        catalogItems: parsed.items.map((item, index) => ({
          key: `${item.type || 'workshop'}:${item.livelabsId || item.catalog?.id || item.title || index}`,
          type: String(item.type || 'workshop'), status: String(item.status || ''), counts: item.counts || {},
          catalogItem: { ...item.catalog, livelabsId: String(item.livelabsId ?? item.catalog?.id ?? ''), wmsId: String(item.wmsId || ''), title: String(item.title || item.catalog?.title || ''), type: String(item.type || 'workshop') },
          tests: Array.isArray(item.checks) ? item.checks : Array.isArray(item.tests) ? item.tests : [], issues: Array.isArray(item.issues) ? item.issues : [],
        })),
        sourceReport: { format: 'catalog-results-v2', sourceFiles: { catalogJson: filename }, warnings: ['Imported Complete JSON with checks and detailed issue evidence.'] },
      };
    }
    throw new Error('Use a Jenkins summary JSON, catalog-results JSON, or a CSV/Excel report table.');
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const source = String(text || '').replace(/^\uFEFF/, '');
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (quoted) {
        if (char === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"' && cell === '') quoted = true;
      else if (char === ',') { row.push(cell); cell = ''; }
      else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += char;
    }
    if (quoted) throw new Error('The findings CSV has an unterminated quoted field.');
    if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    if (rows.length < 2) throw new Error('The findings CSV has no report rows.');
    const headers = rows.shift().map((value) => value.trim());
    return rows.filter((values) => values.some((value) => value !== '')).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }

  async function normalizeJenkinsReportPair(files, parsedFiles = new Map()) {
    const jsonFile = files.find((file) => file.name.toLowerCase().endsWith('.json'));
    const findingsFile = files.find((file) => ['csv', 'xlsx', 'xlsm'].includes(fileExtension(file)));
    if (files.length !== 2 || !jsonFile || !findingsFile) throw new Error('Choose one catalog-results JSON and one findings CSV/Excel file from the same Jenkins run.');
    if (jsonFile.size > 90 * 1024 * 1024 || findingsFile.size > 20 * 1024 * 1024) throw new Error('Jenkins JSON must be 90 MB or smaller; the findings table must be 20 MB or smaller.');
    const report = parsedFiles.get(jsonFile) || await readImportedFile(jsonFile, 90);
    if (!report || report.schemaVersion !== 2 || !report.run || !Array.isArray(report.items)) throw new Error('Expected a Jenkins catalog-results JSON report with schemaVersion 2, run metadata, and items.');
    const run = report.run;
    const runId = String(run.id || '').trim();
    if (!runId) throw new Error('The catalog-results JSON has no run ID.');
    const table = parsedFiles.get(findingsFile) || await readImportedFile(findingsFile);
    const rows = table?.kind === 'table' ? table.rows : [];
    if (!rows.length) throw new Error('The Jenkins findings file contains no tabular rows.');
    const requiredHeaders = ['run_id', 'started_at', 'item_type', 'item_id', 'item_title', 'item_status', 'item_priority', 'issue_count', 'issue_code', 'issue_label', 'severity', 'issue_summary', 'catalog_url', 'final_url', 'test_section', 'test_file', 'test_line'];
    if (requiredHeaders.some((header) => !Object.prototype.hasOwnProperty.call(rows[0], header))) throw new Error('The findings CSV is missing required report columns.');
    if (rows.some((row) => row.run_id !== runId)) throw new Error('The JSON and CSV contain different Jenkins run IDs.');
    if (run.startedAt && rows.some((row) => row.started_at && row.started_at !== run.startedAt)) throw new Error('The JSON and CSV start times do not match.');

    // CSV determines per-ID findings/counts; exact JSON checks supply rich evidence.
    // Never use title, family membership, or catalog aliases to transfer locations.
    const evidenceKey = (type,id,issue) => JSON.stringify([type,id,String(issue.code||'').trim().toUpperCase(),
      String(issue.section||''),String(issue.file||''),String(issue.line??'')]);
    const evidenceByCheck = new Map();
    for (const source of report.items) {
      const type=String(source?.type||'').trim(), id=String(source?.livelabsId??source?.catalog?.id??'').trim();
      for (const issue of Array.isArray(source.issues)?source.issues:[]) {
        const key=evidenceKey(type,id,issue);
        if(!evidenceByCheck.has(key))evidenceByCheck.set(key,[]);
        evidenceByCheck.get(key).push(issue);
      }
    }
    let detailedEvidenceRows=0;
    const items = new Map();
    for (const source of report.items) {
      const type = String(source?.type || '').trim();
      const id = String(source?.livelabsId ?? source?.catalog?.id ?? '').trim();
      if (!type || !id) continue;
      const key = `${type}:${id}`;
      if (items.has(key)) throw new Error(`The catalog-results JSON repeats catalog item ${key}.`);
      items.set(key, {
        key, type, status: String(source.status || ''), counts: source.counts && typeof source.counts === 'object' ? source.counts : {},
        catalogItem: { livelabsId: id, title: String(source.title || source.catalog?.title || ''), type },
        issues: [], reportPairingStatus: 'Catalog JSON and findings CSV'
      });
    }
    const jsonItemKeys = new Set(items.keys());
    const csvItemKeys = new Set();
    const csvStatusMismatchKeys = new Set();
    const findingRows = rows.filter((row) => String(row.issue_code || '').trim());
    const csvCategoryCounts = {};
    const jsonCategoryCounts = Object.fromEntries((Array.isArray(run.failureCategories) ? run.failureCategories : []).map((item) => [String(item.code || ''), Number(item.count || 0)]));
    let csvFindingOccurrences = 0;
    for (const row of rows) {
      const type = String(row.item_type || '').trim();
      const id = String(row.item_id || '').trim();
      if (!type || !id) throw new Error('A findings CSV row is missing its item type or ID.');
      const key = `${type}:${id}`;
      csvItemKeys.add(key);
      if (!items.has(key)) {
        items.set(key, {
          key, type, status: String(row.item_status || ''), counts: {},
          catalogItem: { livelabsId: id, title: String(row.item_title || ''), type },
          issues: [], reportPairingStatus: 'Findings CSV only; catalog JSON item missing'
        });
      } else {
        const jsonStatus = String(items.get(key).status || '');
        if (jsonStatus && row.item_status && jsonStatus !== row.item_status) csvStatusMismatchKeys.add(key);
      }
    }
    for (const row of findingRows) {
      const code = String(row.issue_code || '').trim().toUpperCase();
      const count = Number(row.issue_count);
      if (!Number.isInteger(count) || count < 0) throw new Error(`Finding ${code} has an invalid occurrence count.`);
      csvCategoryCounts[code] = (csvCategoryCounts[code] || 0) + 1;
      csvFindingOccurrences += count;
      const item = items.get(`${String(row.item_type).trim()}:${String(row.item_id).trim()}`);
      const candidates=evidenceByCheck.get(evidenceKey(String(row.item_type).trim(),String(row.item_id).trim(),
        {code,section:row.test_section,file:row.test_file,line:row.test_line}))||[];
      const rich=candidates.length===1?candidates[0]:null;
      const evidence={};
      if(rich && Number(rich.count??rich.findingCount??count)===count) {
        for(const field of ['problem','reproduction','action','location','affectedItems','details','authorEvidence']) {
          if(rich[field]!=null)evidence[field]=rich[field];
        }
        if(Object.keys(evidence).length)detailedEvidenceRows++;
      }
      item.issues.push({
        ...evidence,
        code, label: String(row.issue_label || code), priority: String(row.issue_priority || row.priority || ''), severity: String(row.severity || ''), count,
        message: String(row.issue_summary || ''), section: String(row.test_section || ''),
        file: String(row.test_file || ''), line: String(row.test_line || ''),
        sourceItemPriority: String(row.item_priority || ''), sourceItemStatus: String(row.item_status || ''),
        catalogUrl: String(row.catalog_url || ''), finalUrl: String(row.final_url || '')
      });
    }
    const categoryCodes = new Set([...Object.keys(csvCategoryCounts), ...Object.keys(jsonCategoryCounts)]);
    const categoryRowsMatch = [...categoryCodes].every((code) => (csvCategoryCounts[code] || 0) === (jsonCategoryCounts[code] || 0));
    if (!categoryRowsMatch) throw new Error('The report pair does not reconcile: issue-category row totals differ between the JSON and CSV.');

    const jsonFindingOccurrences = report.items.reduce((total, item) => total + Number(item?.findingCount || 0), 0);
    const itemTestCounts = report.items.reduce((total, item) => total + Number(item?.counts?.total || 0), 0);
    const runTestCount = Number(run.counts?.total || 0);
    const csvOnlyItemCount = [...csvItemKeys].filter((key) => !jsonItemKeys.has(key)).length;
    const warnings = [];
    if(detailedEvidenceRows<findingRows.length)warnings.push(`${findingRows.length-detailedEvidenceRows} findings have summary evidence only; no unique matching JSON check with the same ID and occurrence count was available.`);
    if (jsonFindingOccurrences !== csvFindingOccurrences) warnings.push(`CSV issue_count sums to ${csvFindingOccurrences.toLocaleString()}, while catalog JSON findingCount sums to ${jsonFindingOccurrences.toLocaleString()}. Keep both values for reconciliation.`);
    if (itemTestCounts !== runTestCount) warnings.push(`Per-item test totals sum to ${itemTestCounts.toLocaleString()}, while the run total is ${runTestCount.toLocaleString()}.`);
    if (csvOnlyItemCount) warnings.push(`${csvOnlyItemCount} catalog IDs with findings appear only in the CSV; their rows are retained and matched by LiveLabs ID.`);
    if (csvStatusMismatchKeys.size) warnings.push(`${csvStatusMismatchKeys.size} catalog item statuses differ between the JSON and CSV; the catalog JSON status is kept, and the CSV status remains on each finding.`);

    const categoryRows = Object.entries(jsonCategoryCounts).map(([code, count]) => ({
      code, count, label: String((run.failureCategories || []).find((item) => item.code === code)?.label || code)
    }));
    return {
      runId, runType: String(run.type || 'regression'), status: String(run.status || ''),
      startedAt: String(run.startedAt || rows[0].started_at || ''), endedAt: String(run.endedAt || ''),
      counts: run.counts && typeof run.counts === 'object' ? run.counts : {},
      catalogItems: [...items.values()],
      sourceReport: {
        format: `catalog-results-v2 + findings-${fileExtension(findingsFile)}`,
        sourceFiles: { catalogJson: jsonFile.name, findingsCsv: findingsFile.name },
        catalogItemsInJson: report.items.length, catalogItemsInMerged: items.size,
        findingsCsvRows: rows.length, findingsCsvIssueRows: findingRows.length,
        detailedEvidenceRows, summaryOnlyRows: findingRows.length-detailedEvidenceRows,
        csvFindingOccurrences, jsonFindingOccurrences, categoryRowsMatch,
        itemTestCounts, runTestCount, csvOnlyItemCount, csvStatusMismatchCount: csvStatusMismatchKeys.size,
        categories: categoryRows, warnings
      }
    };
  }

  async function downloadSelected(kind) {
    const isAnalytics = kind === 'analytics';
    const id = $(isAnalytics ? 'snapshot-select' : 'jenkins-select').value;
    if (!id) throw new Error(`Select a ${isAnalytics ? 'LiveLabs Analytics' : 'Jenkins QA'} snapshot first.`);
    const payload = await api(`${isAnalytics ? 'snapshot' : 'qa-snapshot'}?snapshot=${encodeURIComponent(id)}`);
    const date = payload.metadata?.snapshot_date || payload.metadata?.snapshotDate || payload.startedAt || payload.runId || 'snapshot';
    downloadJson(payload, `${isAnalytics ? 'livelabs-analytics' : 'jenkins-qa'}-${date}-${id.slice(0, 8)}.json`);
  }

  async function beginEdit(kind, item) {
    const analytics = kind === 'analytics';
    const payload = await api(`${analytics ? 'snapshot' : 'qa-snapshot'}?snapshot=${encodeURIComponent(item.id)}`);
    editing = { kind, id: item.id };
    $('json-editor-title').textContent = analytics ? 'Edit Analytics snapshot' : 'Edit Jenkins QA report';
    $('json-editor-help').textContent = `Saving creates a new ${analytics ? 'Analytics' : 'QA'} version linked to the selected version. The original remains unchanged.`;
    $('json-editor-label').value = `${item.label || item.runId || 'Snapshot'} (edited)`;
    $('json-editor-content').value = JSON.stringify(payload, null, 2);
    $('json-editor-error').textContent = '';
    $('json-editor').showModal();
  }

  async function saveEditedVersion(event) {
    event.preventDefault();
    try {
      const payload = JSON.parse($('json-editor-content').value);
      const label = $('json-editor-label').value.trim();
      if (!label) throw new Error('Enter a version label.');
      let saved;
      if (editing.kind === 'analytics') {
        saved = await post('snapshots', { action: 'version', parentId: editing.id, label, snapshot: payload });
      } else {
        saved = await post('qa-snapshots', { action: 'version', parentId: editing.id, label, summary: payload });
      }
      $('json-editor').close();
      setStatus('Saved as a new version; the previous snapshot remains in history.');
      await loadSources(editing.kind === 'analytics' ? { analyticsId: saved.snapshotId } : { qaId: saved.id });
    } catch (error) {
      $('json-editor-error').textContent = error.message;
    }
  }

  async function deleteVersion(kind, item) {
    const analytics = kind === 'analytics';
    const label = item.label || item.runId || item.id.slice(0, 8);
    if (!window.confirm(`Delete “${label}”? This removes the saved source snapshot from history.`)) return;
    await post(analytics ? 'snapshots' : 'qa-snapshots', { action: 'delete', snapshotId: item.id });
    setStatus('Snapshot deleted from source history.');
    await loadSources();
  }

  async function handleHistoryClick(event, kind) {
    const button = event.target.closest('button');
    if (!button) return;
    const list = kind === 'analytics' ? snapshots : qaSnapshots;
    const item = list.find((entry) => entry.id === button.dataset.historySelect || entry.id === button.dataset.historyEdit || entry.id === button.dataset.historyDelete);
    if (!item) return;
    try {
      if (button.dataset.historySelect) {
        $(kind === 'analytics' ? 'snapshot-select' : 'jenkins-select').value = item.id;
        renderSelections();
        await refreshPreviews();
      } else if (button.dataset.historyEdit) await beginEdit(kind, item);
      else if (button.dataset.historyDelete) await deleteVersion(kind, item);
    } catch (error) { setStatus(error.message); }
  }

  async function removeMerge(id) {
    const item = mergeHistory.find((entry) => entry.id === id);
    if (!item) return;
    const action = item.active ? 'remove this CI overlay from dashboard item details' : 'delete this merge history entry';
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    await post('merges', { action: 'delete', id });
    if (item.active) window.localStorage.setItem('livelabsQaReportMergeRefresh', `${id}:removed:${Date.now()}`);
    setStatus(item.active ? 'CI report overlay removed from the dashboard.' : 'Merge history entry deleted.');
    await loadSources();
  }

  function wireEvents() {
    $('snapshot-select').addEventListener('change', () => { renderSelections(); resetMergePreview('Sources changed; map again'); void refreshPreviews(); });
    $('jenkins-select').addEventListener('change', () => { renderSelections(); resetMergePreview('Sources changed; map again'); void refreshPreviews(); });
    $('analytics-match-field').addEventListener('change', () => resetMergePreview('Mapping changed; map again'));
    $('qa-match-field').addEventListener('change', () => resetMergePreview('Mapping changed; map again'));
    $('map-reports').addEventListener('click', () => void refreshPreviews(true));
    $('analytics-history').addEventListener('click', (event) => void handleHistoryClick(event, 'analytics'));
    $('jenkins-history').addEventListener('click', (event) => void handleHistoryClick(event, 'qa'));
    $('merge-history').addEventListener('click', (event) => {
      const button = event.target.closest('[data-merge-delete]');
      if (button) void removeMerge(button.dataset.mergeDelete).catch((error) => setStatus(error.message));
    });

    $('capture-snapshot').addEventListener('click', async () => {
      try { setStatus('Capturing the current canonical Analytics inventory…'); const saved = await post('snapshots', { captureCurrent: true }); await loadSources({ analyticsId: saved.snapshotId }); setStatus('Current Analytics inventory saved as a snapshot.'); }
      catch (error) { setStatus(error.message); }
    });
    $('import-snapshot').addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        setStatus('Reading Analytics file…');
        const imported = normalizeAnalyticsImport(await readImportedFile(file), file.name);
        const saved = await post('snapshots', { action: 'upload', label: file.name, snapshot: imported });
        await loadSources({ analyticsId: saved.snapshotId });
        setStatus(`Analytics source saved: ${imported.records.length.toLocaleString()} records.`);
      }
      catch (error) { setStatus(error.message); }
      finally { event.target.value = ''; }
    });
    $('import-jenkins-pair').addEventListener('change', async (event) => {
      const files = [...event.target.files];
      if (!files.length) return;
      try {
        setStatus('Reading Jenkins report file(s)…');
        const parsed = await Promise.all(files.map(file => readImportedFile(file, fileExtension(file) === 'json' ? 90 : 20)));
        const parsedFiles = new Map(files.map((file, index) => [file, parsed[index]]));
        const summary = files.length === 1
          ? normalizeJenkinsSingle(parsed[0], files[0].name)
          : await normalizeJenkinsReportPair(files, parsedFiles);
        const issueRows = Number(summary.sourceReport?.findingsCsvIssueRows)
          || summary.catalogItems.reduce((total, item) => total + (Array.isArray(item.issues) ? item.issues.length : 0), 0);
        const label = `${summary.runId} · ${issueRows.toLocaleString()} findings`;
        const saved = await post('qa-snapshots', { action: 'upload', label, summary });
        await loadSources({ qaId: saved.id });
        const warningCount = Array.isArray(summary.sourceReport?.warnings) ? summary.sourceReport.warnings.length : 0;
        setStatus(`Jenkins report saved: ${summary.catalogItems.length.toLocaleString()} items and ${issueRows.toLocaleString()} findings${warningCount ? ` · ${warningCount} source notes` : ''}.`);
      } catch (error) { setStatus(error.message); }
      finally { event.target.value = ''; }
    });
    $('copy-archive-run').addEventListener('click', async () => {
      const runId = $('archive-run-select').value;
      if (!runId) return;
      try {
        setStatus('Copying the selected local archive run into managed history…');
        const summary = await api('jenkins/run?run_id=' + encodeURIComponent(runId));
        const saved = await post('qa-snapshots', { action: 'archive-copy', label: `Archive ${runId}`, summary });
        await loadSources({ qaId: saved.id });
        setStatus('Archived Jenkins report copied into editable QA snapshot history.');
      } catch (error) { setStatus(error.message); }
    });

    $('download-snapshot').addEventListener('click', () => void downloadSelected('analytics').catch((error) => setStatus(error.message)));
    $('download-jenkins').addEventListener('click', () => void downloadSelected('qa').catch((error) => setStatus(error.message)));
    $('edit-snapshot').addEventListener('click', () => {
      const item = snapshots.find((entry) => entry.id === $('snapshot-select').value);
      if (item) void beginEdit('analytics', item).catch((error) => setStatus(error.message));
    });
    $('edit-jenkins').addEventListener('click', () => {
      const item = qaSnapshots.find((entry) => entry.id === $('jenkins-select').value);
      if (item) void beginEdit('qa', item).catch((error) => setStatus(error.message));
    });
    $('delete-snapshot').addEventListener('click', () => {
      const item = snapshots.find((entry) => entry.id === $('snapshot-select').value);
      if (item) void deleteVersion('analytics', item).catch((error) => setStatus(error.message));
    });
    $('delete-jenkins').addEventListener('click', () => {
      const item = qaSnapshots.find((entry) => entry.id === $('jenkins-select').value);
      if (item) void deleteVersion('qa', item).catch((error) => setStatus(error.message));
    });
    $('export-analytics-csv').addEventListener('click', async () => {
      try {
        const id = $('snapshot-select').value;
        const snapshot = await api('snapshot?snapshot=' + encodeURIComponent(id));
        window.LiveLabsExport.csv(analyticsCsvRows(snapshot), `livelabs-analytics-${id.slice(0, 8)}.csv`);
      } catch (error) { setStatus(error.message); }
    });
    $('export-jenkins-csv').addEventListener('click', async () => {
      try {
        const id = $('jenkins-select').value;
        const summary = await api('qa-snapshot?snapshot=' + encodeURIComponent(id));
        const csvRows = qaCsvRows(summary);
        window.LiveLabsExport.csv(csvRows, `jenkins-qa-${summary.runId}.csv`);
      } catch (error) { setStatus(error.message); }
    });
    $('merge-csv').addEventListener('click', async () => {
      try {
        const blob = await api('merge.csv?' + queryForMerge(), { responseType: 'blob' });
        downloadBlob(blob, 'livelabs-analytics-jenkins-merged.csv');
        setStatus('Merged CSV downloaded with matched, unmatched, and ambiguous rows preserved.');
      } catch (error) { setStatus(error.message); }
    });
    $('apply-merge').addEventListener('click', async () => {
      if (!window.confirm('Apply the mapped Jenkins findings to the matched LiveLabs records and update dashboard scores, tables, inventory, and search?')) return;
      try {
        const result = await post('merges', {
          action: 'apply', analyticsId: $('snapshot-select').value, qaId: $('jenkins-select').value,
          analyticsField: $('analytics-match-field').value, qaField: $('qa-match-field').value
        });
        window.localStorage.setItem('livelabsQaReportMergeRefresh', `${result.id}:${Date.now()}`);
        setStatus(`Integrated Jenkins findings for ${result.summary.matchedDashboardItems.toLocaleString()} dashboard items. Dashboard, inventory, and search will show the updated scores and records.`);
        await loadSources();
      } catch (error) { setStatus(error.message); }
    });

    $('json-editor-form').addEventListener('submit', (event) => void saveEditedVersion(event));
    ['close-editor', 'cancel-editor'].forEach((id) => $(id).addEventListener('click', () => $('json-editor').close()));
  }

  function analyticsCsvRows(snapshot) {
    const records = snapshot.records || [];
    const fixed = ['snapshotId', 'snapshotDate', 'recordKey', 'title', 'wmsId', 'livelabsId', 'category', 'type', 'publishStatus', 'publishType', 'status', 'update', 'owner'];
    const extra = new Set();
    records.forEach((record) => (record.values || []).forEach((pair) => { if (Array.isArray(pair) && pair[0]) extra.add(String(pair[0])); }));
    const headers = [...fixed, ...Array.from(extra).filter((key) => !fixed.includes(key)).sort()];
    return [headers, ...records.map((record) => {
      const values = Object.fromEntries((record.values || []).filter((pair) => Array.isArray(pair) && pair.length > 1));
      const row = { snapshotId: snapshot.metadata?.snapshotId || '', snapshotDate: snapshot.metadata?.snapshot_date || snapshot.metadata?.snapshotDate || '', recordKey: record.key || '', ...record };
      return headers.map((key) => row[key] ?? values[key] ?? '');
    })];
  }

  function qaCsvRows(summary) {
    const rows = qaRows(summary);
    const headers = ['runId', 'runType', 'runStatus', 'recordType', 'itemTitle', 'livelabsId', 'wmsId', 'itemStatus', 'testTitle', 'testStatus', 'expectedStatus', 'section', 'classification', 'issueCodes'];
    return [headers, ...rows.map((row) => headers.map((key) => row[key] ?? ''))];
  }

  async function start() {
    try {
      const session = await api('session');
      csrf = session.csrf;
      if (session.idleExpires) scheduleExpiry(session.idleExpires);
      $('identity').textContent = `Signed in as ${session.username}`;
      wireEvents();
      await loadSources();
    } catch (error) {
      const detail = error.message || 'Could not load source history.';
      const oldApi = /snapshot not found|unknown endpoint/i.test(detail);
      setStatus(oldApi
        ? 'This page has loaded, but the running admin server has an older API. Restart dev/scripts/admin-server.py from this checkout, then reload Data merge.'
        : detail);
    } finally {
      window.LiveLabsLoading?.ready();
    }
  }

  start();
})();
