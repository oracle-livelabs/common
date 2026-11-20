(() => {
  let pageSize = 10;
  let records = [];
  let filtered = [];
  let visibleInventoryRecords = [];
  let page = 1;
  let sortKey = "";
  let sortDirection = "asc";
  let scope = "all";
  let jenkinsOverlay = {};
  let csrf = '';
  let policyRevision = null;
  let editingKey = null;
  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const text = (value) => String(value ?? "").trim();
  const normalized = (value) => text(value).toLocaleLowerCase();
  const inventoryCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  const publicPublished = (record) => normalized(record.publishType) === "public" && normalized(record.publishStatus) === "published";
  const disabledOrArchived = (record) => normalized(record.publishType) === "disabled"
    || normalized(record.status) === "delete requested"
    || normalized(record.publishStatus) === "delete requested"
    || normalized(record.lifecycleState).includes("archiv");
  const detailsText = (record) => (Array.isArray(record.details) ? record.details : []).map((pair) => Array.isArray(pair) ? pair.join(" ") : "").join(" ");
  const jenkinsFor = (record) => jenkinsOverlay[text(record.livelabsId)] || null;
  const jenkinsState = (record) => {
    const overlay = jenkinsFor(record);
    if (!overlay) return publicPublished(record) ? "No report" : "Not scanned";
    const counts = overlay.priorityCounts || {};
    if (Number(counts.p1 || 0)) return "P1";
    if (Number(counts.p2 || 0)) return "P2";
    if (Number(counts.p3 || 0)) return "P3";
    if (Number(counts.unmapped || 0)) return "Unmapped";
    return "No prioritized findings";
  };
  const jenkinsSummary = (record) => {
    const overlay = jenkinsFor(record);
    if (!overlay) return publicPublished(record) ? "No report attached" : "Outside Jenkins public scan scope";
    const counts = overlay.priorityCounts || {};
    const priorities = ["p1", "p2", "p3"].filter((key) => Number(counts[key] || 0)).map((key) => `${key.toUpperCase()} ${Number(counts[key]).toLocaleString()}`);
    const issues = [...new Set((overlay.findings || []).map((item) => text(item.label || item.code)).filter(Boolean))].slice(0, 4);
    return [...priorities, ...issues].join(" · ") || (Number(counts.unmapped || 0) ? "Unmapped findings" : "No prioritized findings");
  };
  const jenkinsScore = (record) => {
    const overlay = jenkinsFor(record);
    if (!overlay) return publicPublished(record) ? "No report" : "Not scanned";
    return overlay.jenkinsErrorScore == null ? "N/A" : Number(overlay.jenkinsErrorScore).toFixed(2);
  };
  const focusFor = record => [...new Set([...(record.review?.focusTags || []), ...(jenkinsFor(record)?.findings?.length ? ['QA issues'] : [])])];
  const focusHtml = record => `<span class="review-focus-tags">${focusFor(record).map(tag=>`<span class="review-focus-tag">${escapeHtml(tag)}</span>`).join('') || '—'}</span>`;
  const searchable = (record) => normalized([record.title, record.livelabsId, record.wmsId, record.owner, record.category,
    record.type, record.publishType, record.publishStatus, record.status, record.lifecycleState, record.searchable, detailsText(record), jenkinsState(record), jenkinsSummary(record)].join(" "));
  const setSelectOptions = (id, values, firstLabel) => {
    const select = byId(id);
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">${escapeHtml(firstLabel)}</option>`
      + [...new Set(values.map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    select.value = current;
  };
  const ownerFor = (record) => {
    if (text(record.owner)) return text(record.owner);
    const pair = (record.details || []).find((item) => Array.isArray(item) && ["Owner Email", "Author Email", "Manager Email", "Owner Group"].includes(item[0]) && text(item[1]));
    return pair ? text(pair[1]) : "—";
  };
  const sortValueFor = (record, key) => {
    if (key === "title") return text(record.title);
    if (key === "livelabsId") return text(record.livelabsId);
    if (key === "wmsId") return text(record.wmsId);
    if (key === "owner") return ownerFor(record);
    if (key === "type") return text(record.type);
    if (key === "priority") return jenkinsState(record);
    if (key === "review") return text(record.review?.tierLabel);
    if (key === "reviewFocus") return focusFor(record).join(" ");
    if (key === "publishType") return text(record.publishType);
    if (key === "publishStatus") return text(record.publishStatus);
    if (key === "workflow") return text(record.status);
    if (key === "jenkinsScore") return jenkinsScore(record);
    if (key === "jenkinsFindings") return jenkinsSummary(record);
    if (key === "visibility") return `${record.dashboardGovernance?.visible ? "Visible" : "Admin only"} ${record.dashboardGovernance?.classification || "unreviewed"}`;
    return "";
  };
  const sortedInventoryRecords = () => {
    const sourceOrder = new Map(records.map((record, index) => [record, index]));
    return filtered.slice().sort((left, right) => {
      if (!sortKey) return (sourceOrder.get(left) ?? 0) - (sourceOrder.get(right) ?? 0);
      const leftValue = sortValueFor(left, sortKey);
      const rightValue = sortValueFor(right, sortKey);
      const missingLeft = !leftValue || leftValue === "—";
      const missingRight = !rightValue || rightValue === "—";
      if (missingLeft !== missingRight) return missingLeft ? 1 : -1;
      const comparison = inventoryCollator.compare(leftValue, rightValue);
      if (comparison === 0) return (sourceOrder.get(left) ?? 0) - (sourceOrder.get(right) ?? 0);
      return sortDirection === "desc" ? -comparison : comparison;
    });
  };
  const applyFilters = () => {
    const query = normalized(byId("inventory-search")?.value);
    const type = byId("inventory-type")?.value || "";
    const publishType = byId("inventory-publish-type")?.value || "";
    const publishStatus = byId("inventory-publish-status")?.value || "";
    const workflow = byId("inventory-workflow")?.value || "";
    const jenkinsPriority = byId("inventory-jenkins-priority")?.value || "";
    const teamEmail = byId('inventory-team').value;
    const reviewBand = byId('inventory-review-band').value;
    filtered = records.filter((record) => {
      const governance = record.dashboardGovernance || {};
      const cleanupQueue = byId('inventory-cleanup-queue').value;
      if (cleanupQueue && !record.cleanupQueues?.includes(cleanupQueue)) return false;
      if (byId("inventory-review-focus").value && !focusFor(record).includes(byId("inventory-review-focus").value)) return false;
      if (reviewBand && record.review?.tierLabel !== reviewBand) return false;
      if (scope === 'hidden' && !['test_content', 'internal_training'].includes(governance.classification)) return false;
      if (scope === 'team' && !governance.teamEmails?.length) return false;
      if (scope === 'review' && !governance.reviewNeeded) return false;
      if (teamEmail && !governance.teamEmails?.includes(teamEmail)) return false;
      if (scope === "public" && !publicPublished(record)) return false;
      if (scope === "disabled" && !disabledOrArchived(record)) return false;
      if (scope === "private" && normalized(record.publishType) !== "private") return false;
      if (scope === "not-public" && publicPublished(record)) return false;
      if (type && text(record.type) !== type) return false;
      if (publishType && text(record.publishType) !== publishType) return false;
      if (publishStatus && text(record.publishStatus) !== publishStatus) return false;
      if (workflow && text(record.status) !== workflow) return false;
      if (jenkinsPriority && jenkinsState(record) !== jenkinsPriority) return false;
      return !query || searchable(record).includes(query);
    });
    page = 1;
    renderRows();
  };
  const renderRows = () => {
    const ordered = sortedInventoryRecords();
    const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
    page = Math.min(Math.max(1, page), pages);
    const start = (page - 1) * pageSize;
    const visible = ordered.slice(start, start + pageSize);
    visibleInventoryRecords = visible;
    byId("inventory-export-status").textContent = '';
    byId("inventory-rows").innerHTML = visible.length ? visible.map((record, index) => `<tr>
      <td>${start + index + 1}</td>
      <td>${escapeHtml(record.livelabsId || "—")}</td><td>${escapeHtml(record.wmsId || "—")}</td>
      <td>${escapeHtml(text(record.title) || "Untitled item")}</td><td>${escapeHtml(ownerFor(record))}</td><td>${escapeHtml(record.type)}</td><td>${focusHtml(record)}</td>
      <td>${escapeHtml(record.publishType || "Unclassified")}</td><td>${escapeHtml(record.publishStatus || "Not set")}</td>
      <td>${escapeHtml(record.status || "Not set")}</td>
      <td>${escapeHtml(jenkinsScore(record))}</td><td>${escapeHtml(jenkinsSummary(record))}</td>
      <td>${record.dashboardGovernance?.visible ? 'Visible' : 'Admin only'}<br><small>${escapeHtml((record.dashboardGovernance?.classification || 'unreviewed').replaceAll('_', ' '))}</small><br><small>${escapeHtml(record.dashboardGovernance?.reason || '')}</small></td>
      <td>${escapeHtml(record.review?.tierLabel || 'Outside dashboard scope')}<br><small>${escapeHtml(record.review?.readiness?.replaceAll('-', ' ') || '')} · ${escapeHtml(record.review?.confidence || '')}</small><br><button type="button" data-manage-key="${escapeHtml(record.dashboardGovernance?.recordKey)}">Manage</button></td></tr>`).join("")
      : '<tr><td colspan="14" class="empty">No records match these filters.</td></tr>';
    byId("inventory-count").textContent = `${filtered.length.toLocaleString()} records`;
    document.querySelectorAll("[data-inventory-page-label]").forEach((node) => { node.textContent = `Page ${page} of ${pages}`; });
    document.querySelectorAll("[data-inventory-page-size]").forEach((select) => { select.value = String(pageSize); });
    document.querySelectorAll('[data-inventory-page-action="previous"]').forEach((button) => { button.disabled = page <= 1; });
    document.querySelectorAll('[data-inventory-page-action="next"]').forEach((button) => { button.disabled = page >= pages; });
    document.querySelectorAll("[data-inventory-export-format]").forEach((button) => { button.disabled = visible.length === 0; });
    byId("inventory-table").querySelectorAll("[data-inventory-sort]").forEach((button) => {
      const header = button.closest("th");
      header?.setAttribute("aria-sort", sortKey && button.dataset.inventorySort === sortKey
        ? (sortDirection === "asc" ? "ascending" : "descending") : "none");
    });
  };
  const exportColumns = ["#", "LiveLabs ID", "WMS ID", "Title", "Author / owner", "Type", "Review focus", "Publish type", "Publish status", "Workflow status", "Jenkins Error Score", "Jenkins findings", "Dashboard visibility", "Review"];
  const exportRow = (record, index) => {
    const visibility = record.dashboardGovernance?.visible ? "Visible" : "Admin only";
    const classification = (record.dashboardGovernance?.classification || "unreviewed").replaceAll("_", " ");
    const governanceReason = text(record.dashboardGovernance?.reason);
    const review = [record.review?.tierLabel || "Outside dashboard scope", record.review?.readiness?.replaceAll("-", " "), record.review?.confidence].filter(Boolean).join(" · ");
    return {
      "#": (page - 1) * pageSize + index + 1,
      "LiveLabs ID": record.livelabsId || "—",
      "WMS ID": record.wmsId || "—",
      Title: text(record.title) || "Untitled item",
      "Author / owner": ownerFor(record),
      Type: record.type || "—",
      "Review focus": focusFor(record).join("; ") || "—",
      "Publish type": record.publishType || "Unclassified",
      "Publish status": record.publishStatus || "Not set",
      "Workflow status": record.status || "Not set",
      "Jenkins Error Score": jenkinsScore(record),
      "Jenkins findings": jenkinsSummary(record),
      "Dashboard visibility": [visibility, classification, governanceReason].filter(Boolean).join(" · "),
      Review: review || "—",
    };
  };
  const activeExportFilters = () => {
    const labels = {
      "inventory-search": "Search", "inventory-type": "Type", "inventory-jenkins-priority": "Jenkins priority",
      "inventory-scope": "View", "inventory-publish-type": "Publish type", "inventory-publish-status": "Publish status",
      "inventory-workflow": "Workflow status", "inventory-team": "Team member or contact", "inventory-review-focus": "Review focus",
      "inventory-cleanup-queue": "Cleanup queue", "inventory-review-band": "Review band",
    };
    const defaults = { "inventory-scope": "all", "inventory-type": "", "inventory-jenkins-priority": "", "inventory-publish-type": "", "inventory-publish-status": "", "inventory-workflow": "", "inventory-team": "", "inventory-review-focus": "", "inventory-cleanup-queue": "", "inventory-review-band": "" };
    return Object.fromEntries(Object.entries(labels).flatMap(([id, label]) => {
      const control = byId(id);
      const rawValue = control?.tagName === "SELECT" ? control.value : text(control?.value);
      const value = control?.tagName === "SELECT" ? control.selectedOptions?.[0]?.textContent?.trim() : rawValue;
      if (!value || rawValue === defaults[id]) return [];
      return [[label, value]];
    }));
  };
  const exportInventoryPage = (format) => {
    if (!visibleInventoryRecords.length) throw new Error("There are no visible rows to export.");
    if (!window.LiveLabsExport) throw new Error("Export tools have not loaded yet.");
    const rows = visibleInventoryRecords.map(exportRow);
    const matrix = [exportColumns, ...rows.map((record) => exportColumns.map((column) => record[column]))];
    const filename = `livelabs-admin-inventory-page-${page}-${rows.length}-rows`;
    if (format === "csv") window.LiveLabsExport.csv(matrix, `${filename}.csv`);
    else if (format === "xlsx") window.LiveLabsExport.xlsx(matrix, `${filename}.xlsx`);
    else if (format === "json") window.LiveLabsExport.json({
      source: "LiveLabs Analytics Admin inventory",
      exportedAt: new Date().toISOString(),
      appliedFilters: activeExportFilters(),
      appliedSort: { by: sortKey ? byId("inventory-table").querySelector(`[data-inventory-sort="${sortKey}"]`)?.textContent?.trim() : "As listed", direction: sortKey ? sortDirection : "none" },
      pagination: { page, pageSize, filteredRows: filtered.length, firstRow: filtered.length ? (page - 1) * pageSize + 1 : 0, exportedRows: rows.length },
      columns: exportColumns,
      rowCount: rows.length,
      rows,
    }, `${filename}.json`);
    else throw new Error("Choose CSV, Excel or JSON.");
    byId("inventory-export-status").textContent = `${rows.length.toLocaleString()} visible page rows exported.`;
  };
  const load = async () => {
    try {
      const [response, qaResponse] = await Promise.all([
        fetch("/api/admin/inventory", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/admin/qa-overlay", { credentials: "same-origin", cache: "no-store" }).catch(() => null),
      ]);
      if (response.status === 401) { location.replace("/admin"); return; }
      if (!response.ok) throw new Error(`Inventory request failed (${response.status}).`);
      const payload = await response.json();
      const qaPayload = qaResponse?.ok ? await qaResponse.json() : null;
      jenkinsOverlay = qaPayload?.overlay || {};
      records = Array.isArray(payload.records) ? payload.records : [];
      policyRevision = payload.dashboardPolicy?.revision;
      const roster = payload.teamRoster || {};
      const selection = byId('inventory-team').value;
      byId('inventory-team').innerHTML = '<option value="">All team members</option>' + (roster.members || []).map(member => `<option value="${escapeHtml(member.email)}">${escapeHtml(member.name)} · ${records.filter(r => r.dashboardGovernance?.teamEmails?.includes(member.email)).length} associated records</option>`).join('');
      byId('inventory-team').value = selection;
      setSelectOptions("inventory-type", records.map((record) => record.type), "All types");
      [...byId('inventory-type').options].forEach(option => { option.textContent = ({'':'All items', Workshop:'Workshops only', Sprint:'Sprints only'})[option.value] || option.textContent; });
      setSelectOptions("inventory-publish-type", records.map((record) => record.publishType), "All publish types");
      setSelectOptions("inventory-publish-status", records.map((record) => record.publishStatus), "All publish statuses");
      setSelectOptions("inventory-workflow", records.map((record) => record.status), "All workflow statuses");
      setSelectOptions('inventory-review-focus', records.flatMap(focusFor), 'All review focus');
      setSelectOptions('inventory-cleanup-queue', records.flatMap(record => record.cleanupQueues || []), 'All cleanup queues');
      setSelectOptions('inventory-review-band', records.map(record => record.review?.tierLabel), 'All review bands');
      applyFilters();
      window.LiveLabsLoading?.ready();
      return true;
    } catch (error) {
      byId("inventory-rows").innerHTML = `<tr><td colspan="14" class="empty">${escapeHtml(error?.message || "The inventory could not be loaded.")}</td></tr>`;
      window.LiveLabsLoading?.fail('Portfolio inventory could not be loaded.');
      return false;
    }
  };
  const editRecord = (key) => {
    const record = records.find(row => row.dashboardGovernance?.recordKey === key);
    if (!record) return;
    editingKey = key;
    byId('policy-record').textContent = `${record.title} · LiveLabs ${record.livelabsId || 'unassigned'} · WMS ${record.wmsId || 'unassigned'}`;
    byId('policy-classification').value = record.dashboardGovernance.classification === 'unreviewed' ? 'needs_review' : record.dashboardGovernance.classification;
    byId('policy-reason').value = record.dashboardGovernance.reason || '';
    byId('policy-status').textContent = '';
    const decision = record.retirementDecision || {};
    byId('review-current').textContent = record.review ? `${record.review.tierLabel} · ${record.review.readiness.replaceAll('-', ' ')} · ${record.review.confidence}. ${record.review.reasons.join(' ')} ${record.review.readinessReasons.join(' ')} Source retirement confirmed: ${record.review.sourceRetirementConfirmed ? 'yes' : 'no'}.` : 'Outside dashboard scope; decision retained in Admin.';
    byId('review-state').value = decision.state || 'unreviewed';
    byId('review-reason').value = decision.reason || '';
    byId('review-evidence').value = decision.evidence || '';
    ['firstPublishedDate','contentUpdatedDate','keepUntil'].forEach(key => { byId('review-'+key).value = decision[key] || ''; });
    byId('review-status').textContent = decision.updatedAt ? `Last saved ${decision.updatedAt} by ${decision.updatedBy}.` : '';
    byId('policy-editor').hidden = false;
    byId('policy-editor').scrollIntoView({block:'start'});
    byId('policy-classification').focus();
  };
  document.addEventListener("DOMContentLoaded", () => {
    ["inventory-search", "inventory-type", "inventory-publish-type", "inventory-publish-status", "inventory-workflow", "inventory-review-focus", "inventory-jenkins-priority", "inventory-team", "inventory-review-band", "inventory-cleanup-queue"].forEach((id) => {
      const element = byId(id);
      element?.addEventListener(element.tagName === "SELECT" ? "change" : "input", applyFilters);
    });
    byId("inventory-scope")?.addEventListener("change", () => { scope = byId("inventory-scope").value || "all"; applyFilters(); });
    document.querySelectorAll("[data-inventory-page-size]").forEach((select) => select.addEventListener("change", () => {
      pageSize = Math.max(1, Number(select.value) || 10);
      page = 1;
      renderRows();
    }));
    document.querySelectorAll('[data-inventory-page-action="previous"]').forEach((button) => button.addEventListener("click", () => { page -= 1; renderRows(); }));
    document.querySelectorAll('[data-inventory-page-action="next"]').forEach((button) => button.addEventListener("click", () => { page += 1; renderRows(); }));
    byId("inventory-table").querySelector("thead").addEventListener("click", event => {
      const button = event.target.closest("[data-inventory-sort]");
      if (!button) return;
      const key = button.dataset.inventorySort;
      sortDirection = sortKey === key ? (sortDirection === "asc" ? "desc" : "asc") : "asc";
      sortKey = key;
      page = 1;
      renderRows();
    });
    document.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-inventory-export-format]");
      if (!button) return;
      try { exportInventoryPage(button.dataset.inventoryExportFormat); }
      catch (error) { byId("inventory-export-status").textContent = error?.message || "The visible rows could not be exported."; }
      button.closest(".table-export-dropdown")?.removeAttribute("open");
    });
    byId('inventory-rows').addEventListener('click', event => { const button = event.target.closest('[data-manage-key]'); if (button) editRecord(button.dataset.manageKey); });
    byId('inventory-clear').addEventListener('click', () => {
      byId('inventory-search').value = '';
      ['inventory-type','inventory-publish-type','inventory-publish-status','inventory-workflow','inventory-jenkins-priority','inventory-team','inventory-review-band','inventory-cleanup-queue','inventory-review-focus'].forEach(id => { if (byId(id)) byId(id).value = ''; });
      byId('inventory-scope').value = 'all';
      applyFilters();
    });
    byId('policy-cancel').addEventListener('click', () => { byId('policy-editor').hidden = true; });
    byId('policy-form').addEventListener('submit', async event => {
      event.preventDefault();
      byId('policy-save').disabled = true;
      byId('policy-status').textContent = 'Saving and rebuilding dashboard data…';
      try {
        const sessionResponse = await fetch('/api/admin/session', {cache:'no-store'});
        if (sessionResponse.status === 401) { location.replace('/admin'); return; }
        csrf = (await sessionResponse.json()).csrf;
        const response = await fetch('/api/admin/content-visibility', {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf}, body:JSON.stringify({recordKey:editingKey, classification:byId('policy-classification').value, reason:byId('policy-reason').value, revision:policyRevision})});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Visibility could not be saved.');
        if (!await load()) throw new Error('Saved, but read-back failed. Reload the inventory to verify the current state.');
        const saved = records.find(row => row.dashboardGovernance?.recordKey === editingKey);
        byId('policy-status').textContent = `Saved and verified: ${saved?.dashboardGovernance?.visible ? 'visible on the dashboard' : 'Admin only'}. ${result.visibleRecords} dashboard records. Refresh open dashboard tabs to load the change.`;
      } catch (error) { byId('policy-status').textContent = error.message; }
      finally { byId('policy-save').disabled = false; }
    });
    byId('review-form').addEventListener('submit', async event => {
      event.preventDefault();
      byId('review-save').disabled = true;
      byId('review-status').textContent = 'Saving review and rebuilding tables…';
      try {
        const sessionResponse = await fetch('/api/admin/session', {cache:'no-store'});
        if (!sessionResponse.ok) throw new Error('Sign in again before saving.');
        const session = await sessionResponse.json();
        const decision = {recordKey:editingKey, revision:policyRevision, state:byId('review-state').value, reason:byId('review-reason').value, evidence:byId('review-evidence').value};
        ['firstPublishedDate','contentUpdatedDate','keepUntil'].forEach(key => { decision[key]=byId('review-'+key).value; });
        const response = await fetch('/api/admin/retirement-review', {method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify(decision)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Review could not be saved.');
        if (!await load()) throw new Error('Saved, but read-back failed. Reload to verify.');
        const saved = records.find(row=>row.dashboardGovernance?.recordKey===editingKey);
        byId('review-status').textContent = `Saved and verified: ${saved?.review?.tierLabel || 'Admin decision retained'}. Refresh dashboard tabs to load the reviewed result.`;
        byId('review-current').textContent = saved?.review ? `${saved.review.tierLabel} · ${saved.review.confidence}. ${saved.review.reasons.join(' ')}` : 'Outside dashboard scope.';
      } catch(error) { byId('review-status').textContent = error.message; }
      finally { byId('review-save').disabled = false; }
    });
    load();
  });
})();
