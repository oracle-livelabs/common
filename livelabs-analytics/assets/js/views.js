(() => {
  "use strict";

  const viewPeriods = globalThis.LiveLabsViews;
  const WINDOWS = viewPeriods.periods;
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
  const formatNumber = viewPeriods.format;
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

  function prepareRecords(records, contactPayload) {
    const contactById = new Map(Object.entries(contactPayload?.items || {}));
    const prepared = records.filter(publicRecord).map((record) => {
      const values = pairsToMap(record.values);
      const details = pairsToMap(record.details);
      const council = String(record.category || details.get("Council Area") || values.get("Council Area")
        || details.get("Category") || values.get("Category") || "").trim() || "Not reported";
      return {
        title: String(record.title || "Untitled record"),
        id: String(record.livelabsId || "").trim(),
        wmsId: String(record.wmsId || "").trim(),
        type: String(record.type || ""),
        council,
        values,
        details,
        authorEmail: "",
        additionalContactEmail: "",
        additionalContactType: "",
      };
    });
    return prepared.map((record) => ({
      ...record,
      authorEmail: emailValue(record, ["Author Email", "Workshop Owner Email", "Owner Email"], ["authorEmail", "workshopOwnerEmail", "ownerEmail", "owner"]),
      additionalContactEmail: String(contactById.get(record.id)?.email || "").trim(),
      additionalContactType: String(contactById.get(record.id)?.type || "").trim(),
    }));
  }

  function render(records, snapshotDate) {
    const search = byId("views-search");
    const authorEmailFilter = byId("views-author-email");
    const additionalContactFilter = byId("views-additional-contact-email");
    const typeFilter = byId("views-type");
    const councilFilter = byId("views-council");
    const periodFilter = byId("views-period");
    const body = byId("views-table-body");
    const table = body.closest("table");
    const pageSizeFilters = Array.from(document.querySelectorAll("[data-views-page-size]"));
    const clearFiltersButton = byId("views-clear-filters");
    const previousButtons = Array.from(document.querySelectorAll("[data-views-previous]"));
    const nextButtons = Array.from(document.querySelectorAll("[data-views-next]"));
    const count = byId("views-table-count");
    const exportStatus = byId("views-export-status");
    const pageLabels = Array.from(document.querySelectorAll("[data-views-page-label]"));
    const countHeading = byId("views-count-heading");

    const statusOf = (record) => String(record.details.get("Dashboard Metric Status") || "");
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    Array.from(new Set(records.map((record) => record.council))).sort(collator.compare).forEach((council) => {
      const option = document.createElement("option");
      option.value = council;
      option.textContent = council;
      councilFilter.append(option);
    });
    let currentPage = 1;
    let sortKey = "views";
    let sortDirection = "desc";
    let exportRecords = [];
    let exportMetadata = {};

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
      countHeading.querySelector("[data-views-sort='views']").textContent = `Views · ${window.label}`;
      const query = search.value.trim().toLocaleLowerCase();
      const authorQuery = authorEmailFilter.value.trim().toLocaleLowerCase();
      const additionalContactQuery = additionalContactFilter.value.trim().toLocaleLowerCase();
      const selectedType = typeFilter.value;
      const selectedCouncil = councilFilter.value;
      const filtered = records.filter((record) => (!selectedType || record.type === selectedType)
        && (!selectedCouncil || record.council === selectedCouncil)
        && (!query || `${record.title} ${record.id} ${record.wmsId} ${record.authorEmail} ${record.additionalContactEmail}`.toLocaleLowerCase().includes(query))
        && (!authorQuery || record.authorEmail.toLocaleLowerCase().includes(authorQuery))
        && (!additionalContactQuery || record.additionalContactEmail.toLocaleLowerCase().includes(additionalContactQuery)));
      const rows = filtered.map((record) => {
        const status = statusOf(record);
        const uniqueTitle = status === "available_unique_title_scope";
        const metric = viewPeriods.metric(record, window.key);
        const rank = uniqueTitle ? countValue(record.details.get(`${window.key} Rank`)) : null;
        return { record, metric, rank };
      });
      const key = sortKey;
      const direction = sortDirection;
      const numericSort = key === "views" || key === "rank" || key === "livelabsId";
      rows.sort((left, right) => {
        let comparison = 0;
        if (numericSort) {
          const leftValue = key === "views" ? left.metric : key === "rank" ? left.rank : left.record.id ? Number(left.record.id) : null;
          const rightValue = key === "views" ? right.metric : key === "rank" ? right.rank : right.record.id ? Number(right.record.id) : null;
          if (leftValue === null && rightValue !== null) return 1;
          if (leftValue !== null && rightValue === null) return -1;
          if (leftValue !== null && rightValue !== null) comparison = leftValue - rightValue;
        } else {
          const valueFor = (item) => key === "title" ? item.record.title
            : key === "livelabsId" ? item.record.id
              : key === "author" ? item.record.authorEmail
            : key === "contact" ? item.record.additionalContactEmail
              : key === "council" ? item.record.council : item.record.type;
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
      const columns = ["#", "Title", "LiveLabs ID", "Type", "Council", "Author / owner email", "Additional contact email", `Views · ${window.label}`];
      exportRecords = pageRows.map(({ record, metric, rank }) => ({
        [columns[0]]: rank,
        [columns[1]]: record.title,
        [columns[2]]: record.id || "Not assigned",
        [columns[3]]: record.type,
        [columns[4]]: record.council,
        [columns[5]]: record.authorEmail || null,
        [columns[6]]: record.additionalContactEmail ? `${record.additionalContactType}: ${record.additionalContactEmail}` : null,
        [columns[7]]: metric,
      }));
      exportMetadata = {
        source: "LiveLabs Analytics views table",
        snapshotDate: snapshotDate || null,
        appliedFilters: {
          search: search.value.trim() || null,
          authorEmail: authorEmailFilter.value.trim() || null,
          additionalContactEmail: additionalContactFilter.value.trim() || null,
          contentType: selectedType || "All types",
          council: selectedCouncil || "All councils",
          viewPeriod: window.label,
        },
        sort: { by: table?.querySelector(`th[data-views-sort-key="${key}"] button`)?.textContent?.trim() || "Views", direction },
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
      table?.querySelectorAll("[data-views-sort]").forEach((button) => {
        const header = button.closest("th");
        const isActive = button.dataset.viewsSort === sortKey;
        header?.setAttribute("aria-sort", isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none");
      });

      body.replaceChildren();
      if (!pageRows.length) {
        const row = document.createElement("tr");
        const cell = makeCell("No public workshops or sprints match these filters.", "views-empty");
        cell.colSpan = 8;
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
          makeCell(item.record.council),
          makeCell(item.record.authorEmail || "—"),
          makeContactCell(item.record.additionalContactEmail, item.record.additionalContactType),
          makeCell(formatNumber(item.metric), "views-number"),
        );
        body.append(row);
      }
    };

    const resetPageAndUpdate = () => { currentPage = 1; update(); };
    search.addEventListener("input", resetPageAndUpdate);
    authorEmailFilter.addEventListener("input", resetPageAndUpdate);
    additionalContactFilter.addEventListener("input", resetPageAndUpdate);
    typeFilter.addEventListener("change", resetPageAndUpdate);
    councilFilter.addEventListener("change", resetPageAndUpdate);
    periodFilter.addEventListener("change", resetPageAndUpdate);
    pageSizeFilters.forEach((select) => select.addEventListener("change", () => {
      pageSizeFilters.forEach((peer) => { peer.value = select.value; });
      resetPageAndUpdate();
    }));
    table?.querySelector("thead")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-views-sort]");
      if (!button) return;
      const nextKey = button.dataset.viewsSort;
      sortDirection = sortKey === nextKey ? (sortDirection === "desc" ? "asc" : "desc") : "asc";
      sortKey = nextKey;
      resetPageAndUpdate();
    });
    clearFiltersButton.addEventListener("click", () => {
      search.value = "";
      authorEmailFilter.value = "";
      additionalContactFilter.value = "";
      typeFilter.value = "";
      councilFilter.value = "";
      periodFilter.value = WINDOWS[WINDOWS.length - 1].key;
      sortKey = "views";
      sortDirection = "desc";
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

  function makeContactCell(email, type) {
    const cell = document.createElement("td");
    if (!email) {
      cell.textContent = "—";
      return cell;
    }
    const content = document.createElement("span");
    content.className = "views-contact-cell";
    const badge = document.createElement("span");
    badge.className = "views-contact-type";
    badge.textContent = type || "Contact";
    const address = document.createElement("span");
    address.className = "views-contact-email";
    address.textContent = email;
    content.append(badge, address);
    cell.append(content);
    return cell;
  }

  function loadContactPayload() {
    return fetch(new URL('./api/dashboard-contacts', document.baseURI), {cache:'no-store'})
      .then(response => response.ok ? response.json() : {items:{}})
      .catch(() => ({items:{}}));
  }

  async function initialize() {
    try {
      const [payload, contactPayload] = await Promise.all([loadPayload(), loadContactPayload()]);
      const records = prepareRecords(payload.records || [], contactPayload);
      const snapshotDate = payload.metadata?.data_freshness?.dashboard_views_snapshot_date
        || payload.metadata?.snapshot_date || "";
      render(records, snapshotDate);
    } catch (error) {
      byId("views-table-count").textContent = "Views are unavailable.";
      const body = byId("views-table-body");
      const row = document.createElement("tr");
      const cell = makeCell("Views are unavailable until the public snapshot loads.", "views-empty");
      cell.colSpan = 8;
      row.append(cell);
      body.replaceChildren(row);
    } finally {
      window.LiveLabsLoading?.ready();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else void initialize();
})();
