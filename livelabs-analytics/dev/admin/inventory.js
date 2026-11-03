(() => {
  const pageSize = 50;
  let records = [];
  let filtered = [];
  let page = 1;
  let scope = "all";
  let jenkinsOverlay = {};
  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const text = (value) => String(value ?? "").trim();
  const normalized = (value) => text(value).toLocaleLowerCase();
  const publicPublished = (record) => normalized(record.publishType) === "public" && normalized(record.publishStatus) === "published";
  const disabledOrArchived = (record) => normalized(record.publishType) === "disabled"
    || normalized(record.publishStatus) === "delete requested"
    || normalized(record.lifecycleState).includes("archiv");
  const detailsText = (record) => (Array.isArray(record.details) ? record.details : []).map((pair) => Array.isArray(pair) ? pair.join(" ") : "").join(" ");
  const jenkinsFor = (record) => publicPublished(record) ? jenkinsOverlay[text(record.livelabsId)] || null : null;
  const jenkinsState = (record) => {
    if (!publicPublished(record)) return "Not scanned";
    const overlay = jenkinsFor(record);
    if (!overlay) return "No report";
    const counts = overlay.priorityCounts || {};
    if (Number(counts.p1 || 0)) return "P1";
    if (Number(counts.p2 || 0)) return "P2";
    if (Number(counts.p3 || 0)) return "P3";
    if (Number(counts.unmapped || 0)) return "Unmapped";
    return "No prioritized findings";
  };
  const jenkinsSummary = (record) => {
    const overlay = jenkinsFor(record);
    if (!publicPublished(record)) return "Outside Jenkins public scan scope";
    if (!overlay) return "No report attached";
    const counts = overlay.priorityCounts || {};
    const priorities = ["p1", "p2", "p3"].filter((key) => Number(counts[key] || 0)).map((key) => `${key.toUpperCase()} ${Number(counts[key]).toLocaleString()}`);
    const issues = [...new Set((overlay.findings || []).map((item) => text(item.label || item.code)).filter(Boolean))].slice(0, 4);
    return [...priorities, ...issues].join(" · ") || (Number(counts.unmapped || 0) ? "Unmapped findings" : "No prioritized findings");
  };
  const jenkinsScore = (record) => {
    const overlay = jenkinsFor(record);
    if (!publicPublished(record)) return "Not scanned";
    if (!overlay) return "No report";
    return overlay.jenkinsErrorScore == null ? "N/A" : Number(overlay.jenkinsErrorScore).toFixed(2);
  };
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
  const applyFilters = () => {
    const query = normalized(byId("inventory-search")?.value);
    const type = byId("inventory-type")?.value || "";
    const publishType = byId("inventory-publish-type")?.value || "";
    const publishStatus = byId("inventory-publish-status")?.value || "";
    const workflow = byId("inventory-workflow")?.value || "";
    const jenkinsPriority = byId("inventory-jenkins-priority")?.value || "";
    filtered = records.filter((record) => {
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
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(Math.max(1, page), pages);
    const start = (page - 1) * pageSize;
    const visible = filtered.slice(start, start + pageSize);
    byId("inventory-rows").innerHTML = visible.length ? visible.map((record) => `<tr>
      <td>${escapeHtml(text(record.title) || "Untitled item")}</td><td>${escapeHtml(record.type)}</td>
      <td>${escapeHtml(record.publishType || "Unclassified")}</td><td>${escapeHtml(record.publishStatus || "Not set")}</td>
      <td>${escapeHtml(record.status || "Not set")}</td><td>${escapeHtml(record.livelabsId || "—")}</td>
      <td>${escapeHtml(record.wmsId || "—")}</td><td>${escapeHtml(ownerFor(record))}</td>
      <td>${escapeHtml(jenkinsScore(record))}</td><td>${escapeHtml(jenkinsSummary(record))}</td></tr>`).join("")
      : '<tr><td colspan="10" class="empty">No records match these filters.</td></tr>';
    byId("inventory-count").textContent = `${filtered.length.toLocaleString()} records`;
    byId("inventory-page-status").textContent = filtered.length ? `Showing ${start + 1}–${start + visible.length} of ${filtered.length.toLocaleString()}` : "No records to show";
    byId("inventory-previous").disabled = page <= 1;
    byId("inventory-next").disabled = page >= pages;
  };
  const load = async () => {
    try {
      const [response, qaResponse] = await Promise.all([
        fetch("/api/admin/inventory", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/dashboard-admin-state", { credentials: "same-origin", cache: "no-store" }).catch(() => null),
      ]);
      if (response.status === 401) { location.replace("/admin"); return; }
      if (!response.ok) throw new Error(`Inventory request failed (${response.status}).`);
      const payload = await response.json();
      const qaPayload = qaResponse?.ok ? await qaResponse.json() : null;
      jenkinsOverlay = qaPayload?.qaReportMerge?.overlay || {};
      records = Array.isArray(payload.records) ? payload.records : [];
      byId("count-all").textContent = records.length.toLocaleString();
      byId("count-public").textContent = records.filter(publicPublished).length.toLocaleString();
      byId("count-disabled").textContent = records.filter(disabledOrArchived).length.toLocaleString();
      byId("inventory-status").textContent = `Full Analytics inventory · snapshot ${payload.metadata?.snapshot_date || "date unavailable"}. The author dashboard uses only records marked Public and Published.`;
      setSelectOptions("inventory-type", records.map((record) => record.type), "All types");
      setSelectOptions("inventory-publish-type", records.map((record) => record.publishType), "All publish types");
      setSelectOptions("inventory-publish-status", records.map((record) => record.publishStatus), "All publish statuses");
      setSelectOptions("inventory-workflow", records.map((record) => record.status), "All workflow statuses");
      applyFilters();
    } catch (error) {
      byId("inventory-status").textContent = error?.message || "The inventory could not be loaded.";
      byId("inventory-rows").innerHTML = '<tr><td colspan="8" class="empty">Inventory is unavailable. Refresh the page or contact an administrator.</td></tr>';
    }
  };
  document.addEventListener("DOMContentLoaded", () => {
    ["inventory-search", "inventory-type", "inventory-publish-type", "inventory-publish-status", "inventory-workflow", "inventory-jenkins-priority"].forEach((id) => {
      const element = byId(id);
      element?.addEventListener(element.tagName === "SELECT" ? "change" : "input", applyFilters);
    });
    document.querySelectorAll("[data-inventory-scope]").forEach((button) => button.addEventListener("click", () => {
      scope = button.dataset.inventoryScope || "all";
      document.querySelectorAll("[data-inventory-scope]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      applyFilters();
    }));
    byId("inventory-previous")?.addEventListener("click", () => { page -= 1; renderRows(); });
    byId("inventory-next")?.addEventListener("click", () => { page += 1; renderRows(); });
    load();
  });
})();
