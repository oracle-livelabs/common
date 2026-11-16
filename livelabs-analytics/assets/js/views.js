(() => {
  "use strict";

  const WINDOWS = [
    { label: "Last 7 Days", key: "Views - Last 7 Days" },
    { label: "Last 14 Days", key: "Views - Last 14 Days" },
    { label: "Last 30 Days", key: "Views - Last 30 Days" },
    { label: "Last 90 Days", key: "Views - Last 90 Days" },
    { label: "Last 180 Days", key: "Views - Last 180 Days" },
    { label: "Last 12 Months", key: "Views - Last 12 Months" },
  ];
  const byId = (id) => document.getElementById(id);
  const pairsToMap = (pairs) => new Map(Array.isArray(pairs)
    ? pairs.filter((pair) => Array.isArray(pair) && pair.length > 1).map(([key, value]) => [String(key), value])
    : []);
  const countValue = (value) => {
    const normalized = String(value ?? "").replaceAll(",", "").trim();
    if (!/^\d+$/.test(normalized)) return null;
    const number = Number(normalized);
    return Number.isSafeInteger(number) ? number : null;
  };
  const formatNumber = (value) => value === null ? "—" : value.toLocaleString();
  const emailValue = (record, labels, directKeys = []) => {
    const sources = [record.details, record.values];
    for (const label of labels) {
      for (const source of sources) {
        const value = String(source.get(label) || "").trim();
        if (value.includes("@")) return value;
      }
    }
    for (const key of directKeys) {
      const value = String(record[key] || "").trim();
      if (value.includes("@")) return value;
    }
    return "";
  };
  const publicRecord = (record) => String(record.publishStatus || "").trim().toLowerCase() === "published"
    && String(record.publishType || "").trim().toLowerCase() === "public"
    && ["workshop", "sprint"].includes(String(record.type || "").trim().toLowerCase());

  function loadFilePayload() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("./inventory/data/portfolio_inventory.file.js", document.baseURI).href;
      script.onload = () => globalThis.__livelabsPortfolioInventoryPayload
        ? resolve(globalThis.__livelabsPortfolioInventoryPayload)
        : reject(new Error("The public fallback data was empty."));
      script.onerror = () => reject(new Error("The public views snapshot could not be loaded."));
      document.head.append(script);
    });
  }

  async function loadPayload() {
    if (location.protocol === "file:") return loadFilePayload();
    const response = await fetch("./inventory/data/public_portfolio_inventory.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function makeCell(text, className = "") {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function prepareRecords(records) {
    const prepared = records.filter(publicRecord).map((record) => ({
      title: String(record.title || "Untitled record"),
      id: String(record.livelabsId || "").trim(),
      wmsId: String(record.wmsId || "").trim(),
      type: String(record.type || ""),
      values: pairsToMap(record.values),
      details: pairsToMap(record.details),
    }));
    return prepared.map((record) => ({
      ...record,
      authorEmail: emailValue(record, ["Author Email", "Workshop Owner Email", "Owner Email"], ["authorEmail", "workshopOwnerEmail", "ownerEmail", "owner"]),
    }));
  }

  function render(records, snapshotDate) {
    const search = byId("views-search");
    const authorEmailFilter = byId("views-author-email");
    const typeFilter = byId("views-type");
    const periodFilter = byId("views-period");
    const sortFilter = byId("views-sort");
    const sortDirection = byId("views-sort-direction");
    const pageSizeFilters = Array.from(document.querySelectorAll("[data-views-page-size]"));
    const clearFiltersButton = byId("views-clear-filters");
    const previousButtons = Array.from(document.querySelectorAll("[data-views-previous]"));
    const nextButtons = Array.from(document.querySelectorAll("[data-views-next]"));
    const body = byId("views-table-body");
    const count = byId("views-table-count");
    const exportStatus = byId("views-export-status");
    const pageLabels = Array.from(document.querySelectorAll("[data-views-page-label]"));
    const countHeading = byId("views-count-heading");
    const snapshotNote = byId("views-snapshot-note");

    const statusOf = (record) => String(record.details.get("Dashboard Metric Status") || "");
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    let currentPage = 1;
    let exportRecords = [];
    let exportMetadata = {};
    snapshotNote.textContent = `Snapshot: ${snapshotDate || "date unavailable"} · shared-title counts omitted; source periods unconfirmed.`;

    const activeWindow = () => WINDOWS.find((window) => window.key === periodFilter.value) || WINDOWS[WINDOWS.length - 1];
    const detailHref = (record) => {
      if (!record.id) return "";
      const url = new URL("search/", document.baseURI);
      url.searchParams.set("livelabs_id", record.id);
      if (record.wmsId) url.searchParams.set("wms_id", record.wmsId);
      return url.href;
    };
    const linkedCell = (label, record, accessibleName) => {
      const cell = document.createElement("td");
      if (!record.id) {
        cell.textContent = label;
        return cell;
      }
      const link = document.createElement("a");
      link.href = detailHref(record);
      link.textContent = label;
      link.setAttribute("aria-label", `${accessibleName}: ${record.title}`);
      cell.append(link);
      return cell;
    };
    const update = () => {
      exportStatus.textContent = "";
      const window = activeWindow();
      countHeading.textContent = `Views · ${window.label}`;
      const query = search.value.trim().toLocaleLowerCase();
      const authorQuery = authorEmailFilter.value.trim().toLocaleLowerCase();
      const selectedType = typeFilter.value;
      const filtered = records.filter((record) => (!selectedType || record.type === selectedType)
        && (!query || `${record.title} ${record.id} ${record.wmsId} ${record.authorEmail}`.toLocaleLowerCase().includes(query))
        && (!authorQuery || record.authorEmail.toLocaleLowerCase().includes(authorQuery)));
      const rows = filtered.map((record) => {
        const status = statusOf(record);
        const uniqueTitle = status === "available_unique_title_scope";
        const metric = uniqueTitle ? countValue(record.values.get(window.key) ?? record.details.get(window.key)) : null;
        const rank = uniqueTitle ? countValue(record.details.get(`${window.key} Rank`)) : null;
        return { record, metric, rank };
      });
      const key = sortFilter.value;
      const direction = sortDirection.dataset.direction === "asc" ? "asc" : "desc";
      const numericSort = key === "views" || key === "rank";
      rows.sort((left, right) => {
        let comparison = 0;
        if (numericSort) {
          const leftValue = key === "views" ? left.metric : left.rank;
          const rightValue = key === "views" ? right.metric : right.rank;
          if (leftValue === null && rightValue !== null) return 1;
          if (leftValue !== null && rightValue === null) return -1;
          if (leftValue !== null && rightValue !== null) comparison = leftValue - rightValue;
        } else {
          const valueFor = (item) => key === "title" ? item.record.title
            : key === "livelabsId" ? item.record.id
              : key === "author" ? item.record.authorEmail
                : item.record.type;
          comparison = collator.compare(valueFor(left), valueFor(right));
        }
        if (comparison !== 0) return direction === "asc" ? comparison : -comparison;
        return collator.compare(left.record.title, right.record.title) || collator.compare(left.record.id, right.record.id);
      });

      const pageSize = Math.max(1, Number(pageSizeFilters[0]?.value) || 10);
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      currentPage = Math.min(Math.max(1, currentPage), totalPages);
      const start = (currentPage - 1) * pageSize;
      const pageRows = rows.slice(start, start + pageSize);
      const end = start + pageRows.length;
      const columns = ["#", "Title", "LiveLabs ID", "Type", "Author / owner email", `Views · ${window.label}`];
      exportRecords = pageRows.map(({ record, metric, rank }) => ({
        [columns[0]]: rank,
        [columns[1]]: record.title,
        [columns[2]]: record.id || "Not assigned",
        [columns[3]]: record.type,
        [columns[4]]: record.authorEmail || null,
        [columns[5]]: metric,
      }));
      exportMetadata = {
        source: "LiveLabs Analytics views table",
        snapshotDate: snapshotDate || null,
        appliedFilters: {
          search: search.value.trim() || null,
          authorEmail: authorEmailFilter.value.trim() || null,
          contentType: selectedType || "All types",
          viewPeriod: window.label,
        },
        sort: { by: sortFilter.options[sortFilter.selectedIndex]?.textContent || "Views", direction },
        pagination: { page: currentPage, totalPages, pageSize, filteredRows: rows.length, exportedRows: pageRows.length },
        exportedAt: new Date().toISOString(),
        columns,
      };
      document.querySelectorAll("[data-views-export-format]").forEach((button) => { button.disabled = pageRows.length === 0; });
      count.textContent = rows.length
        ? `Showing ${start + 1}–${end} of ${rows.length.toLocaleString()} records`
        : "No records match these filters.";
      pageLabels.forEach((label) => { label.textContent = `Page ${currentPage} of ${totalPages}`; });
      previousButtons.forEach((button) => { button.disabled = currentPage <= 1; });
      nextButtons.forEach((button) => { button.disabled = currentPage >= totalPages; });
      pageSizeFilters.forEach((select) => { select.value = String(pageSize); });
      sortDirection.textContent = direction === "desc" ? "Desc" : "Asc";
      sortDirection.setAttribute("aria-label", direction === "desc" ? "Sort descending" : "Sort ascending");

      body.replaceChildren();
      if (!pageRows.length) {
        const row = document.createElement("tr");
        const cell = makeCell("No public workshops or sprints match these filters.", "views-empty");
        cell.colSpan = 6;
        row.append(cell);
        body.append(row);
        return;
      }
      for (const item of pageRows) {
        const row = document.createElement("tr");
        row.dataset.detailsUrl = detailHref(item.record);
        row.className = "views-record-row";
        row.tabIndex = 0;
        row.setAttribute("aria-label", `Open details for ${item.record.title}`);
        const idCell = linkedCell(item.record.id || "Not assigned", item.record, "Open LiveLabs record");
        if (!item.record.id) idCell.textContent = "Not assigned";
        row.append(
          makeCell(formatNumber(item.rank), "views-number"),
          linkedCell(item.record.title, item.record, "Open item details"),
          idCell,
          makeCell(item.record.type),
          makeCell(item.record.authorEmail || "—"),
          makeCell(formatNumber(item.metric), "views-number"),
        );
        body.append(row);
      }
    };

    const resetPageAndUpdate = () => { currentPage = 1; update(); };
    search.addEventListener("input", resetPageAndUpdate);
    authorEmailFilter.addEventListener("input", resetPageAndUpdate);
    typeFilter.addEventListener("change", resetPageAndUpdate);
    periodFilter.addEventListener("change", resetPageAndUpdate);
    sortFilter.addEventListener("change", resetPageAndUpdate);
    pageSizeFilters.forEach((select) => select.addEventListener("change", () => {
      pageSizeFilters.forEach((peer) => { peer.value = select.value; });
      resetPageAndUpdate();
    }));
    sortDirection.dataset.direction = "desc";
    sortDirection.addEventListener("click", () => {
      sortDirection.dataset.direction = sortDirection.dataset.direction === "desc" ? "asc" : "desc";
      resetPageAndUpdate();
    });
    clearFiltersButton.addEventListener("click", () => {
      search.value = "";
      authorEmailFilter.value = "";
      typeFilter.value = "";
      periodFilter.value = WINDOWS[WINDOWS.length - 1].key;
      sortFilter.value = "views";
      sortDirection.dataset.direction = "desc";
      pageSizeFilters.forEach((select) => { select.value = "10"; });
      resetPageAndUpdate();
      search.focus();
    });
    previousButtons.forEach((button) => button.addEventListener("click", () => { currentPage -= 1; update(); }));
    nextButtons.forEach((button) => button.addEventListener("click", () => { currentPage += 1; update(); }));
    body.addEventListener("click", (event) => {
      const row = event.target.closest("tr[data-details-url]");
      if (!row || event.target.closest("a, button, input, select, label, summary")) return;
      window.location.href = row.dataset.detailsUrl;
    });
    body.addEventListener("keydown", (event) => {
      const row = event.target.closest("tr[data-details-url]");
      if (!row || event.target.closest("a, button, input, select, label, summary") || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      window.location.href = row.dataset.detailsUrl;
    });
    document.querySelectorAll("[data-views-export-format]").forEach((button) => {
      button.addEventListener("click", () => {
        const format = button.dataset.viewsExportFormat;
        try {
          if (!exportRecords.length) throw new Error("There are no visible rows to export.");
          if (!window.LiveLabsExport) throw new Error("Export tools have not loaded yet.");
          const matrix = [exportMetadata.columns, ...exportRecords.map((record) => exportMetadata.columns.map((column) => record[column]))];
          const period = activeWindow().label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const filename = `livelabs-views-${period}-page-${currentPage}-of-${exportMetadata.pagination.totalPages}`;
          if (format === "csv") window.LiveLabsExport.csv(matrix, `${filename}.csv`);
          else if (format === "xlsx") window.LiveLabsExport.xlsx(matrix, `${filename}.xlsx`);
          else if (format === "json") window.LiveLabsExport.json({ ...exportMetadata, rowCount: exportRecords.length, rows: exportRecords }, `${filename}.json`);
          else throw new Error("Choose CSV, Excel or JSON.");
          exportStatus.textContent = `Exported ${exportRecords.length.toLocaleString()} rows from page ${exportMetadata.pagination.page} of ${exportMetadata.pagination.totalPages}.`;
        } catch (error) {
          exportStatus.textContent = error?.message || "The visible rows could not be exported.";
        }
        button.closest(".table-export-dropdown")?.removeAttribute("open");
      });
    });
    update();
  }

  async function initialize() {
    try {
      const payload = await loadPayload();
      const records = prepareRecords(payload.records || []);
      const snapshotDate = payload.metadata?.data_freshness?.dashboard_views_snapshot_date
        || payload.metadata?.snapshot_date || "";
      render(records, snapshotDate);
    } catch (error) {
      byId("views-snapshot-note").textContent = "The public views snapshot could not be loaded. Refresh the page or check the local data file.";
      byId("views-table-count").textContent = "Views are unavailable.";
      const body = byId("views-table-body");
      const row = document.createElement("tr");
      const cell = makeCell("Views are unavailable until the public snapshot loads.", "views-empty");
      cell.colSpan = 6;
      row.append(cell);
      body.replaceChildren(row);
    } finally {
      window.LiveLabsLoading?.ready();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else void initialize();
})();
