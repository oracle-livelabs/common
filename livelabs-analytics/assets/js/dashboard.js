    function normalizeFilterText(value) {
      return (value || "")
        .toString()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[._@+\-/\\]+/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
    const textSortCollator = new Intl.Collator(undefined, { numeric: false, sensitivity: "base" });
    function parseNumberSortValue(value) {
      const normalized = (value || "").replace(/,/g, "");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    function parseDateSortValue(value) {
      const parsed = Date.parse(value || "");
      return Number.isNaN(parsed) ? null : parsed;
    }
    function compareSortValues(valueA, valueB, sortType) {
      if (sortType === "number") {
        const numberA = parseNumberSortValue(valueA);
        const numberB = parseNumberSortValue(valueB);
        if (numberA !== null && numberB !== null) return numberA - numberB;
        if (numberA !== null) return -1;
        if (numberB !== null) return 1;
      }
      if (sortType === "date") {
        const dateA = parseDateSortValue(valueA);
        const dateB = parseDateSortValue(valueB);
        if (dateA !== null && dateB !== null) return dateA - dateB;
        if (dateA !== null) return -1;
        if (dateB !== null) return 1;
      }
      return textSortCollator.compare(valueA, valueB);
    }
    function updateSortIndicators(tableId) {
      const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
      if (!wrapper) return;
      const activeColumnIndex = wrapper.dataset.sortColumnIndex || "";
      const activeDirection = wrapper.dataset.sortDirection || "none";
      wrapper.querySelectorAll("th[data-sort-column-index]").forEach((headerCell) => {
        const isActive = headerCell.dataset.sortColumnIndex === activeColumnIndex && activeDirection !== "none";
        headerCell.setAttribute("aria-sort", isActive ? (activeDirection === "asc" ? "ascending" : "descending") : "none");
      });
    }
    function detailRowFor(dataRow) {
      const detailId = dataRow?.dataset?.detailRowId;
      if (!detailId) return null;
      return dataRow.parentElement?.querySelector(`tr[data-detail-for="${detailId}"]`) || null;
    }
    function setRowExpanded(dataRow, expanded) {
      const detailRow = detailRowFor(dataRow);
      if (!detailRow) return;
      if (expanded && dashboardAdminState.detailExpansionEnabled === false) {
        expanded = false;
      }
      dataRow.dataset.expanded = expanded ? "true" : "false";
      dataRow.setAttribute("aria-expanded", expanded ? "true" : "false");
      detailRow.hidden = !expanded || dataRow.hidden;
    }
    function toggleRowExpanded(dataRow) {
      const detailRow = detailRowFor(dataRow);
      if (!detailRow || dataRow.hidden || dashboardAdminState.detailExpansionEnabled === false) return;
      const expanded = dataRow.dataset.expanded === "true";
      setRowExpanded(dataRow, !expanded);
    }
    const defaultPageSize = 20;
    const rankedDefaultPageSize = 10;
    const pageSizeSteps = [10, 20, 40, 60, 80, 100, 120, 140];
    const rankedTop100TableIds = new Set([
      "top-performer-top-100-workshops",
      "top-performer-top-100-sprints",
      "at-risk-top-100-workshops",
      "at-risk-top-100-sprints",
      "retire-now-top-100-workshops",
      "retire-now-top-100-sprints"
    ]);
    const tenRowDefaultTableIds = new Set([
      ...rankedTop100TableIds,
      "replacement-recommendations",
      "disabled-workshops",
      "disabled-sprints"
    ]);
    function defaultPageSizeForWrapper(wrapper) {
      return tenRowDefaultTableIds.has(wrapper?.dataset?.filterTable) ? rankedDefaultPageSize : defaultPageSize;
    }
    function sortTableRows(tableId) {
      const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
      if (!wrapper) return [];
      const tbody = wrapper.querySelector("tbody");
      if (!tbody) return [];
      const rows = Array.from(tbody.querySelectorAll('tr[data-filter-row="true"]'));
      const emptyState = wrapper.querySelector('[data-empty-state="true"]');
      const activeColumnIndex = wrapper.dataset.sortColumnIndex;
      const activeDirection = wrapper.dataset.sortDirection || "none";
      rows.sort((rowA, rowB) => {
        const originalIndexA = Number(rowA.dataset.originalIndex || 0);
        const originalIndexB = Number(rowB.dataset.originalIndex || 0);
        if (!activeColumnIndex || activeDirection === "none") return originalIndexA - originalIndexB;
        const headerCell = wrapper.querySelector(`th[data-sort-column-index="${activeColumnIndex}"]`);
        const sortType = headerCell?.dataset.sortType || "text";
        const cellA = rowA.querySelectorAll("td[data-sort-value]")[Number(activeColumnIndex)];
        const cellB = rowB.querySelectorAll("td[data-sort-value]")[Number(activeColumnIndex)];
        const valueA = (cellA?.dataset.sortValue || "").trim();
        const valueB = (cellB?.dataset.sortValue || "").trim();
        const missingA = valueA === "";
        const missingB = valueB === "";
        if (missingA && missingB) return originalIndexA - originalIndexB;
        if (missingA) return 1;
        if (missingB) return -1;
        const comparison = compareSortValues(valueA, valueB, sortType);
        if (comparison === 0) return originalIndexA - originalIndexB;
        return activeDirection === "desc" ? -comparison : comparison;
      });
      rows.forEach((row) => {
        tbody.appendChild(row);
        const detailRow = detailRowFor(row);
        if (detailRow) tbody.appendChild(detailRow);
      });
      if (emptyState) tbody.appendChild(emptyState);
      updateSortIndicators(tableId);
      return rows;
    }
    function isActiveFilter(control) {
      if (control.dataset.filterMode === "no-author") return control.checked === true;
      if (control.dataset.filterMode === "demand-protected") return control.checked === true;
      return normalizeFilterText(control.value) !== "";
    }
    function categoryValueMatches(cellValue, normalizedQuery) {
      const normalizedCell = normalizeFilterText(cellValue);
      if (normalizedCell === normalizedQuery) return true;
      return (cellValue || "")
        .split(/[;|]+/)
        .some((part) => normalizeFilterText(part) === normalizedQuery);
    }
    function rowMatchesFilters(row, filters) {
      if (row.dataset.qaAnalyticsExcluded === "true") return false;
      const cells = row.querySelectorAll("td[data-filter-value]");
      return filters.every((control) => {
        if (control.dataset.filterMode === "no-author") {
          return control.checked !== true || row.dataset.noAuthor === "true";
        }
        if (control.dataset.filterMode === "demand-protected") {
          return control.checked !== true || row.dataset.demandProtected === "true";
        }
        const query = normalizeFilterText(control.value);
        if (!query) return true;
        const columnIndex = Number(control.dataset.columnIndex);
        const cell = cells[columnIndex];
        if (!cell) return false;
        const cellValue = cell.dataset.filterValue || cell.textContent || "";
        if (control.dataset.filterMode === "category-exact") {
          return categoryValueMatches(cellValue, query);
        }
        return normalizeFilterText(cellValue).includes(query);
      });
    }
    function filterLabelFor(control) {
      return control.closest(".filter-field")?.querySelector("span")?.textContent || "";
    }
    function enhanceCategoryFilters() {
      document.querySelectorAll('[data-table-filter]').forEach((control) => {
        if (control.tagName.toLowerCase() === "select") return;
        if (normalizeFilterText(filterLabelFor(control)) !== "category") return;
        const tableId = control.dataset.tableFilter;
        const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
        if (!wrapper) return;
        const columnIndex = Number(control.dataset.columnIndex);
        const categories = new Map();
        wrapper.querySelectorAll('tbody tr[data-filter-row="true"]').forEach((row) => {
          if (row.dataset.qaAnalyticsExcluded === "true") return;
          const cell = row.querySelectorAll("td[data-filter-value]")[columnIndex];
          const displayValue = (cell?.textContent || "").trim();
          const normalizedValue = normalizeFilterText(cell?.dataset.filterValue || displayValue);
          if (displayValue && normalizedValue && !categories.has(normalizedValue)) {
            categories.set(normalizedValue, displayValue);
          }
        });
        if (!categories.size) return;
        const select = document.createElement("select");
        select.id = control.id;
        select.className = "category-filter-select";
        select.dataset.filterMode = "category-exact";
        Object.entries(control.dataset).forEach(([key, value]) => {
          select.dataset[key] = value;
        });
        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All categories";
        select.appendChild(allOption);
        Array.from(categories.entries())
          .sort((entryA, entryB) => textSortCollator.compare(entryA[1], entryB[1]))
          .forEach(([normalizedValue, displayValue]) => {
            const option = document.createElement("option");
            option.value = normalizedValue;
            option.textContent = displayValue;
            select.appendChild(option);
          });
        control.replaceWith(select);
      });
    }
    function pageSizeOptionsFor(totalRows) {
      const numericOptions = pageSizeSteps.filter((pageSize) => pageSize <= totalRows);
      return [...numericOptions, "all"];
    }
    function normalizePageSizeValue(wrapper, totalRows) {
      const validValues = pageSizeOptionsFor(totalRows).map((pageSize) => String(pageSize));
      const defaultSize = defaultPageSizeForWrapper(wrapper);
      const fallback = totalRows > defaultSize && validValues.includes(String(defaultSize)) ? String(defaultSize) : "all";
      const currentValue = wrapper.dataset.pageSize || fallback;
      const normalizedValue = validValues.includes(currentValue) ? currentValue : fallback;
      wrapper.dataset.pageSize = normalizedValue;
      return normalizedValue;
    }
    function pageSizeForValue(pageSizeValue, totalRows) {
      if (pageSizeValue === "all") return Math.max(totalRows, 1);
      const parsed = Number(pageSizeValue);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPageSize;
    }
    function pageRangeOptionsFor(rowCount, pageSizeValue) {
      if (pageSizeValue === "all") return [];
      const pageSize = Number(pageSizeValue);
      if (!Number.isFinite(pageSize) || pageSize <= 0 || pageSize >= rowCount || rowCount <= pageSize) return [];
      const options = [];
      for (let start = 1; start <= rowCount; start += pageSize) {
        const end = Math.min(start + pageSize - 1, rowCount);
        options.push({
          end,
          label: `${start} - ${end}`,
          start,
          value: `${start}:${end}`
        });
      }
      return options.length > 1 ? options : [];
    }
    function setSelectOptions(select, options, selectedValue, defaultOption = null) {
      select.replaceChildren();
      const validValues = [];
      if (defaultOption) {
        const option = document.createElement("option");
        option.value = defaultOption.value;
        option.textContent = defaultOption.label;
        select.appendChild(option);
      }
      options.forEach((optionData) => {
        const option = document.createElement("option");
        option.value = optionData.value;
        option.textContent = optionData.label;
        select.appendChild(option);
        validValues.push(optionData.value);
      });
      select.value = validValues.includes(selectedValue) ? selectedValue : (defaultOption?.value || "");
      return validValues;
    }
    function syncPageSizeSelect(select, totalRows, pageSizeValue) {
      const options = pageSizeOptionsFor(totalRows).map((pageSize) => ({
        label: pageSize === "all" ? "All" : String(pageSize),
        value: String(pageSize)
      }));
      setSelectOptions(select, options, pageSizeValue);
      select.disabled = options.length <= 1;
    }
    function syncPageRangeSelect(select, rowCount, pageSizeValue, pageRangeValue) {
      const options = pageRangeOptionsFor(rowCount, pageSizeValue);
      setSelectOptions(select, options, pageRangeValue, { label: "Page", value: "" });
      select.disabled = options.length === 0;
    }
    function tableSortOptionsFor(tableId) {
      const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
      if (!wrapper) return [];
      return Array.from(wrapper.querySelectorAll("th[data-sort-column-index]")).map((headerCell) => ({
        label: (headerCell.querySelector("button")?.textContent || headerCell.textContent || `Column ${Number(headerCell.dataset.sortColumnIndex || 0) + 1}`).trim(),
        value: headerCell.dataset.sortColumnIndex || ""
      })).filter((option) => option.label && option.value !== "");
    }
    function syncTableSortSelect(select, tableId, selectedValue) {
      const options = tableSortOptionsFor(tableId);
      setSelectOptions(select, options, selectedValue || "", { label: "As listed", value: "" });
      select.disabled = options.length === 0;
    }
    function defaultSortDirectionFor(tableId, columnIndex) {
      const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
      return wrapper?.querySelector(`[data-sort-table="${tableId}"][data-column-index="${columnIndex}"]`)?.dataset.defaultDirection || "asc";
    }
    function syncSortDirectionButton(button, direction, hasActiveSort) {
      button.disabled = !hasActiveSort;
      button.textContent = direction === "desc" ? "Desc" : "Asc";
      button.setAttribute("aria-label", direction === "desc" ? "Sort descending" : "Sort ascending");
      button.setAttribute("aria-pressed", hasActiveSort ? "true" : "false");
    }
    function focusTableFilters(tableId) {
      const firstFilter = document.querySelector(`[data-table-filter="${tableId}"]`);
      const disclosure = firstFilter?.closest("details.filter-disclosure");
      if (disclosure) disclosure.open = true;
      const target = disclosure || firstFilter || document.querySelector(`[data-filter-table="${tableId}"]`);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(() => firstFilter?.focus?.({ preventScroll: true }), 160);
    }
    function buildPaginationControls(tableId, position = "bottom") {
      const controls = document.createElement("div");
      controls.className = `pagination-controls pagination-controls-${position}`;
      controls.dataset.paginationFor = tableId;
      controls.dataset.paginationPosition = position;

      const range = document.createElement("span");
      range.className = "pagination-range";
      range.dataset.paginationRangeFor = tableId;
      range.setAttribute("aria-live", "polite");
      controls.appendChild(range);

      const actions = document.createElement("div");
      actions.className = "pagination-actions";

      const sizeLabel = document.createElement("label");
      sizeLabel.textContent = "Rows per page";
      const sizeSelect = document.createElement("select");
      sizeSelect.className = "page-size-select";
      sizeSelect.dataset.pageSizeFor = tableId;
      sizeLabel.appendChild(sizeSelect);
      actions.appendChild(sizeLabel);

      const rangeLabel = document.createElement("label");
      rangeLabel.textContent = "Range";
      const rangeSelect = document.createElement("select");
      rangeSelect.className = "page-size-select";
      rangeSelect.dataset.pageRangeFor = tableId;
      rangeLabel.appendChild(rangeSelect);
      actions.appendChild(rangeLabel);

      const sortLabel = document.createElement("label");
      sortLabel.textContent = "Sort";
      const sortSelect = document.createElement("select");
      sortSelect.className = "page-size-select";
      sortSelect.dataset.paginationSortFor = tableId;
      sortLabel.appendChild(sortSelect);
      actions.appendChild(sortLabel);

      const sortDirectionButton = document.createElement("button");
      sortDirectionButton.className = "pagination-button pagination-sort-direction";
      sortDirectionButton.type = "button";
      sortDirectionButton.dataset.paginationSortDirectionFor = tableId;
      sortDirectionButton.textContent = "Asc";
      actions.appendChild(sortDirectionButton);

      const filterButton = document.createElement("button");
      filterButton.className = "pagination-button pagination-filter-button";
      filterButton.type = "button";
      filterButton.dataset.paginationFilterFor = tableId;
      filterButton.textContent = "Filters";
      actions.appendChild(filterButton);

      const previousButton = document.createElement("button");
      previousButton.className = "pagination-button";
      previousButton.type = "button";
      previousButton.dataset.paginationAction = "previous";
      previousButton.textContent = "Previous";
      actions.appendChild(previousButton);

      const pageIndicator = document.createElement("span");
      pageIndicator.dataset.paginationPageFor = tableId;
      actions.appendChild(pageIndicator);

      const nextButton = document.createElement("button");
      nextButton.className = "pagination-button";
      nextButton.type = "button";
      nextButton.dataset.paginationAction = "next";
      nextButton.textContent = "Next";
      actions.appendChild(nextButton);

      controls.appendChild(actions);
      sizeSelect.addEventListener("change", () => {
        preserveViewportDuringTableUpdate(tableId, () => {
          const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
          if (!wrapper) return;
          wrapper.dataset.pageSize = sizeSelect.value;
          wrapper.dataset.currentPage = "1";
          delete wrapper.dataset.pageRange;
          rangeSelect.value = "";
          applyTableState(tableId);
        });
      });
      rangeSelect.addEventListener("change", () => {
        preserveViewportDuringTableUpdate(tableId, () => {
          const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
          if (!wrapper) return;
          if (rangeSelect.value) {
            wrapper.dataset.pageRange = rangeSelect.value;
          } else {
            delete wrapper.dataset.pageRange;
          }
          wrapper.dataset.currentPage = "1";
          applyTableState(tableId);
        });
      });
      sortSelect.addEventListener("change", () => {
        preserveViewportDuringTableUpdate(tableId, () => {
          const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
          if (!wrapper) return;
          if (sortSelect.value) {
            wrapper.dataset.sortColumnIndex = sortSelect.value;
            wrapper.dataset.sortDirection = defaultSortDirectionFor(tableId, sortSelect.value);
          } else {
            delete wrapper.dataset.sortColumnIndex;
            wrapper.dataset.sortDirection = "none";
          }
          wrapper.dataset.currentPage = "1";
          delete wrapper.dataset.pageRange;
          applyTableState(tableId);
        });
      });
      sortDirectionButton.addEventListener("click", () => {
        preserveViewportDuringTableUpdate(tableId, () => {
          const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
          if (!wrapper || !wrapper.dataset.sortColumnIndex) return;
          wrapper.dataset.sortDirection = wrapper.dataset.sortDirection === "desc" ? "asc" : "desc";
          wrapper.dataset.currentPage = "1";
          delete wrapper.dataset.pageRange;
          applyTableState(tableId);
        });
      });
      filterButton.addEventListener("click", () => focusTableFilters(tableId));
      controls.querySelectorAll("[data-pagination-action]").forEach((button) => {
        button.addEventListener("click", () => {
          preserveViewportDuringTableUpdate(tableId, () => {
            const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
            if (!wrapper) return;
            const currentPage = Number(wrapper.dataset.currentPage || 1);
            wrapper.dataset.currentPage = String(button.dataset.paginationAction === "next" ? currentPage + 1 : currentPage - 1);
            delete wrapper.dataset.pageRange;
            rangeSelect.value = "";
            applyTableState(tableId);
          });
        });
      });
      return controls;
    }
    function ensurePaginationControls(tableId, state) {
      const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
      if (!wrapper) return [];
      const totalRows = state.totalRows;
      const controlsByPosition = new Map(Array.from(document.querySelectorAll(`[data-pagination-for="${tableId}"]`)).map((controls) => [controls.dataset.paginationPosition || "bottom", controls]));
      let topControls = controlsByPosition.get("top");
      let bottomControls = controlsByPosition.get("bottom");
      if (!topControls) {
        topControls = buildPaginationControls(tableId, "top");
        wrapper.insertAdjacentElement("beforebegin", topControls);
      }
      if (!bottomControls) {
        bottomControls = buildPaginationControls(tableId, "bottom");
        wrapper.insertAdjacentElement("afterend", bottomControls);
      }
      const controlsList = [topControls, bottomControls].filter(Boolean);
      controlsList.forEach((controls) => { controls.hidden = totalRows === 0; });
      const pageSizeValue = state.pageSizeValue || normalizePageSizeValue(wrapper, totalRows);
      controlsList.forEach((controls) => {
        const pageSizeSelect = controls.querySelector(`[data-page-size-for="${tableId}"]`);
        if (pageSizeSelect) syncPageSizeSelect(pageSizeSelect, totalRows, pageSizeValue);
        const pageRangeSelect = controls.querySelector(`[data-page-range-for="${tableId}"]`);
        if (pageRangeSelect) syncPageRangeSelect(pageRangeSelect, state.matchingRows, pageSizeValue, state.pageRangeValue || "");
        const sortSelect = controls.querySelector(`[data-pagination-sort-for="${tableId}"]`);
        if (sortSelect) syncTableSortSelect(sortSelect, tableId, state.sortColumnIndex || "");
        const sortDirectionButton = controls.querySelector(`[data-pagination-sort-direction-for="${tableId}"]`);
        if (sortDirectionButton) syncSortDirectionButton(sortDirectionButton, state.sortDirection || "asc", Boolean(state.sortColumnIndex && state.sortDirection !== "none"));
      });
      return controlsList;
    }
    function updatePaginationControls(tableId, state) {
      const controlsList = ensurePaginationControls(tableId, state);
      controlsList.forEach((controls) => {
        if (!controls || controls.hidden) return;
        const range = controls.querySelector(`[data-pagination-range-for="${tableId}"]`);
        const pageIndicator = controls.querySelector(`[data-pagination-page-for="${tableId}"]`);
        const previousButton = controls.querySelector('[data-pagination-action="previous"]');
        const nextButton = controls.querySelector('[data-pagination-action="next"]');
        if (range) {
          const suffix = state.hasFilters ? `filtered rows (${state.totalRows} total)` : "rows";
          range.textContent = state.pageRangeLabel
            ? `${state.startRow}-${state.endRow} of ${state.matchingRows} ${suffix}`
            : state.matchingRows > 0
            ? `${state.startRow}-${state.endRow} of ${state.matchingRows} ${suffix}`
            : `0 of ${state.matchingRows} ${suffix}`;
        }
        if (pageIndicator) pageIndicator.textContent = state.pageRangeLabel ? `Rows ${state.pageRangeLabel}` : `Page ${state.currentPage} of ${state.totalPages}`;
        if (previousButton) previousButton.disabled = Boolean(state.pageRangeLabel) || state.currentPage <= 1;
        if (nextButton) nextButton.disabled = Boolean(state.pageRangeLabel) || state.currentPage >= state.totalPages;
      });
    }
    function pageRangeFor(wrapper, rowCount, pageSizeValue) {
      const rawRange = wrapper.dataset.pageRange || "";
      if (!rawRange) return null;
      const option = pageRangeOptionsFor(rowCount, pageSizeValue).find((item) => item.value === rawRange);
      if (!option) {
        delete wrapper.dataset.pageRange;
        return null;
      }
      return option;
    }
    function preserveViewportDuringTableUpdate(tableId, updateCallback) {
      const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
      const activeElement = document.activeElement instanceof Element ? document.activeElement : null;
      const activeElementBelongsToTable = activeElement && (
        activeElement.closest(`[data-pagination-for="${tableId}"]`) ||
        activeElement.closest(`[data-filter-table="${tableId}"]`) ||
        activeElement.matches(`[data-table-filter="${tableId}"], [data-sort-table="${tableId}"], [data-clear-filters-for="${tableId}"]`)
      );
      const anchor = activeElementBelongsToTable
        ? activeElement
        : document.querySelector(`[data-pagination-for="${tableId}"]`) || wrapper;
      if (!anchor || !anchor.isConnected) {
        updateCallback();
        return;
      }

      const targetTop = anchor.getBoundingClientRect().top;
      const restoreAnchor = () => {
        if (!anchor.isConnected) return;
        const delta = anchor.getBoundingClientRect().top - targetTop;
        if (Math.abs(delta) < 1) return;
        const root = document.documentElement;
        const body = document.body;
        const rootScrollBehavior = root.style.scrollBehavior;
        const bodyScrollBehavior = body?.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        if (body) body.style.scrollBehavior = "auto";
        window.scrollBy(0, delta);
        root.style.scrollBehavior = rootScrollBehavior;
        if (body) body.style.scrollBehavior = bodyScrollBehavior;
      };

      try {
        updateCallback();
      } finally {
        restoreAnchor();
        window.requestAnimationFrame(restoreAnchor);
      }
    }
    function applyTableState(tableId, options = {}) {
      const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
      if (!wrapper) return;
      if (options.resetPage) {
        wrapper.dataset.currentPage = "1";
        delete wrapper.dataset.pageRange;
      }
      const filters = Array.from(document.querySelectorAll(`[data-table-filter="${tableId}"]`));
      const rows = sortTableRows(tableId);
      const activeRows = rows.filter((row) => row.dataset.qaAnalyticsExcluded !== "true");
      const totalRows = activeRows.length;
      const emptyState = wrapper.querySelector('[data-empty-state="true"]');
      const matchingRows = activeRows.filter((row) => rowMatchesFilters(row, filters));
      const defaultSize = defaultPageSizeForWrapper(wrapper);
      const pageSizeValue = normalizePageSizeValue(wrapper, totalRows);
      const selectedRange = pageRangeFor(wrapper, matchingRows.length, pageSizeValue);
      const rangedRows = selectedRange ? matchingRows.slice(selectedRange.start - 1, selectedRange.end) : matchingRows;
      const paginationEnabled = totalRows > defaultSize && !selectedRange;
      const pageSize = paginationEnabled ? pageSizeForValue(pageSizeValue, totalRows) : Math.max(totalRows, 1);
      const totalPages = paginationEnabled ? Math.max(1, Math.ceil(rangedRows.length / pageSize)) : 1;
      let currentPage = Number(wrapper.dataset.currentPage || 1);
      if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;
      if (currentPage > totalPages) currentPage = totalPages;
      wrapper.dataset.currentPage = String(currentPage);
      const startIndex = paginationEnabled ? (currentPage - 1) * pageSize : 0;
      const endIndex = paginationEnabled ? startIndex + pageSize : rangedRows.length;
      const pageRows = paginationEnabled ? rangedRows.slice(startIndex, endIndex) : rangedRows;
      const pageRowSet = new Set(pageRows);
      rows.forEach((row) => {
        const visible = row.dataset.qaAnalyticsExcluded !== "true" && pageRowSet.has(row);
        row.hidden = !visible;
        if (!visible) setRowExpanded(row, false);
        else setRowExpanded(row, row.dataset.expanded === "true");
      });
      if (emptyState) emptyState.hidden = pageRows.length !== 0;
      const countNode = document.querySelector(`[data-table-count-for="${tableId}"]`);
      const hasFilters = filters.some(isActiveFilter);
      if (countNode) {
        if (selectedRange) {
          countNode.textContent = pageRows.length > 0
            ? `${selectedRange.start}-${Math.min(selectedRange.end, matchingRows.length)} of ${matchingRows.length} rows`
            : `0 in ${selectedRange.label} of ${matchingRows.length} rows`;
        } else if (paginationEnabled && matchingRows.length > 0) {
          const startRow = startIndex + 1;
          const endRow = Math.min(endIndex, matchingRows.length);
          countNode.textContent = hasFilters
            ? `${startRow}-${endRow} of ${matchingRows.length} filtered rows (${totalRows} total)`
            : `${startRow}-${endRow} of ${totalRows} rows`;
        } else if (hasFilters) {
          countNode.textContent = `${matchingRows.length} of ${totalRows} rows`;
        } else {
          countNode.textContent = `${totalRows} rows`;
        }
      }
      const displayStartRow = selectedRange
        ? (pageRows.length > 0 ? selectedRange.start : 0)
        : (matchingRows.length > 0 ? startIndex + 1 : 0);
      const displayEndRow = selectedRange
        ? (pageRows.length > 0 ? Math.min(selectedRange.end, matchingRows.length) : 0)
        : (matchingRows.length > 0 ? Math.min(endIndex, matchingRows.length) : 0);
      updatePaginationControls(tableId, {
        currentPage,
        defaultPageSize: defaultSize,
        endRow: displayEndRow,
        hasFilters,
        matchingRows: matchingRows.length,
        pageRangeLabel: selectedRange?.label || "",
        pageRangeValue: selectedRange?.value || "",
        pageSizeValue,
        sortColumnIndex: wrapper.dataset.sortColumnIndex || "",
        sortDirection: wrapper.dataset.sortDirection || "none",
        startRow: displayStartRow,
        totalPages,
        totalRows
      });
      decorateDashboardCopyTargets(wrapper);
    }
    function tableIsInsideClosedDisclosure(wrapper) {
      return Boolean(wrapper?.closest("details:not([open])"));
    }
    function initializeTableWrapper(wrapper, options = {}) {
      if (!wrapper?.dataset?.filterTable || wrapper.dataset.tableInitialized === "true") return;
      wrapper.dataset.sortDirection = wrapper.dataset.sortDirection || "none";
      wrapper.dataset.currentPage = wrapper.dataset.currentPage || "1";
      wrapper.dataset.tableInitialized = "true";
      applyTableState(wrapper.dataset.filterTable, options);
    }
    function initializeTablesIn(container = document, { force = false, resetPage = false } = {}) {
      container.querySelectorAll?.("[data-filter-table]").forEach((wrapper) => {
        if (!force && tableIsInsideClosedDisclosure(wrapper)) return;
        initializeTableWrapper(wrapper, resetPage ? { resetPage: true } : {});
      });
    }
    function refreshInitializedTableStates(options = {}) {
      document.querySelectorAll("[data-filter-table][data-table-initialized='true']").forEach((wrapper) => {
        applyTableState(wrapper.dataset.filterTable, options);
      });
    }
    function scheduleInitialTableSetup() {
      const setup = () => initializeTablesIn(document);
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(setup, { timeout: 900 });
      } else {
        window.setTimeout(setup, 0);
      }
    }
    function escapeHtml(value) {
      return (value ?? "")
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
    function headerLabelsFor(row) {
      return Array.from(row.closest("table")?.querySelectorAll("thead th") || [])
        .map((header) => (header.querySelector("button")?.textContent || header.textContent || "").trim());
    }
    function rowValuesByHeader(row) {
      const labels = headerLabelsFor(row);
      const values = new Map();
      Array.from(row.querySelectorAll("td[data-filter-value]")).forEach((cell, index) => {
        const label = labels[index] || `Column ${index + 1}`;
        const cellClone = cell.cloneNode(true);
        cellClone.querySelectorAll(".qa-exception-badge").forEach((badge) => badge.remove());
        values.set(label, (cellClone.textContent || "").trim());
      });
      return values;
    }
    function pickValue(values, labels) {
      for (const label of labels) {
        if (values.has(label) && values.get(label)) return values.get(label);
      }
      for (const [key, value] of values.entries()) {
        if (labels.some((label) => normalizeFilterText(key).includes(normalizeFilterText(label))) && value) return value;
      }
      return "";
    }
    function labeledValue(record, labels) {
      for (const label of labels) {
        if (record.values.has(label) && record.values.get(label)) return { label, value: record.values.get(label) };
        if (record.details.has(label) && record.details.get(label)) return { label, value: record.details.get(label) };
      }
      const normalizedLabels = labels.map((label) => normalizeFilterText(label));
      for (const [key, value] of record.values.entries()) {
        if (value && normalizedLabels.some((label) => normalizeFilterText(key).includes(label))) return { label: key, value };
      }
      for (const [key, value] of record.details.entries()) {
        if (value && normalizedLabels.some((label) => normalizeFilterText(key).includes(label))) return { label: key, value };
      }
      return null;
    }
    function cellParts(cell) {
      const text = (cell?.textContent || "").replace(/\s+/g, " ").trim();
      const strong = (cell?.querySelector("strong")?.textContent || "").trim();
      const subtle = (cell?.querySelector(".subtle")?.textContent || "").trim();
      const pill = (cell?.querySelector(".sync-pill")?.textContent || "").trim();
      const main = strong || pill || (subtle ? text.replace(subtle, "").trim() : text);
      return { main, subtle, text };
    }
    function syncClassFor(value) {
      const normalized = normalizeFilterText(value);
      if (normalized.includes("green")) return "sync-green";
      if (normalized.includes("yellow")) return "sync-yellow";
      if (normalized.includes("red")) return "sync-red";
      if (normalized.includes("missing")) return "sync-missing";
      return "";
    }
    function markdownUpdatesFor(row) {
      const detailRow = detailRowFor(row);
      const table = detailRow?.querySelector(".nested-details .nested-table");
      if (!table) return [];
      return Array.from(table.querySelectorAll("tbody tr")).map((updateRow) => {
        const cells = Array.from(updateRow.querySelectorAll("td"));
        const file = cellParts(cells[0]);
        const git = cellParts(cells[1]);
        const acknowledgement = cellParts(cells[2]);
        const check = cellParts(cells[3]);
        const syncClass = syncClassFor(check.text || updateRow.className);
        return {
          acknowledgement: acknowledgement.text,
          checkLabel: check.main,
          checkNote: check.subtle,
          fileName: file.main,
          filePath: file.subtle,
          gitUpdate: git.text,
          syncClass
        };
      }).filter((item) => item.fileName || item.filePath || item.gitUpdate || item.acknowledgement || item.checkLabel);
    }
    function detailValuesFor(row) {
      const detailRow = detailRowFor(row);
      const values = new Map();
      detailRow?.querySelectorAll(".detail-table tr").forEach((detailLine) => {
        const key = (detailLine.querySelector("th")?.textContent || "").trim();
        const value = (detailLine.querySelector("td")?.textContent || "").trim();
        if (key && value && !values.has(key)) values.set(key, value);
      });
      return values;
    }
    function sourceRowsHtml(record) {
      const rows = Array.from(record.values.entries())
        .filter(([label, value]) => label && value && normalizeFilterText(label) !== "source")
        .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(displayDetailValue(label, value))}</td></tr>`);
      return rows.length ? rows.join("") : `<tr><td colspan="2">No dashboard row fields available.</td></tr>`;
    }
    function summaryItemsFor(record) {
      const ids = [record.wmsId ? `WMS ${record.wmsId}` : "", record.livelabsId ? `LiveLabs ${record.livelabsId}` : ""].filter(Boolean).join(" | ");
      const score = labeledValue(record, ["Score", "Retire Score", "Replacement Score", "Similarity Score"]);
      const views12m = labeledValue(record, ["Views 12m", "Recent Views 12m", "Page Views 12m"]);
      const views90d = labeledValue(record, ["Views 90d", "Recent Views 90d", "Page Views 90d"]);
      return [
        ["Content Type", record.type || "Portfolio result"],
        ["IDs", ids || "N/A"],
        ["Category", record.category || "N/A"],
        ["Latest Update", record.update || "N/A"],
        views12m ? [views12m.label, views12m.value] : null,
        views90d ? [views90d.label, views90d.value] : null,
        score ? [score.label, score.value] : null,
        ["Status", record.status || "N/A"]
      ].filter(Boolean);
    }
    function governanceItemsFor(record) {
      const action = labeledValue(record, ["Suggested Action", "Recommended Action", "Lifecycle State"]);
      return [
        ["WMS ID", record.wmsId || "N/A"],
        ["LiveLabs ID", record.livelabsId || "N/A"],
        ["Owner", record.owner || "N/A"],
        ["Publish Status", record.details.get("Publish Status") || "N/A"],
        ["Publish Type", record.details.get("Publish Type") || "N/A"],
        ["Update Evidence", record.details.get("Update Evidence") || "N/A"],
        ["Latest GitHub Update", record.details.get("Latest GitHub Update") || record.details.get("Latest Live Repo Commit Date") || record.details.get("Latest Workshop Commit Date") || record.details.get("Latest Markdown Commit Date") || "N/A"],
        action ? [action.label, action.value] : null,
        record.details.get("Workshop Path") ? ["Workshop Path", record.details.get("Workshop Path")] : null
      ].filter(Boolean);
    }
    function sectionLabelFor(row) {
      const section = row.closest("section.section");
      const sectionTitle = section?.querySelector(".section-head h2")?.textContent?.trim() || "Dashboard";
      const panel = row.closest(".ranked-table-panel, details.toggle-panel");
      const panelTitle = panel?.querySelector(".panel-head h3, summary h3")?.textContent?.trim() || "";
      return panelTitle ? `${sectionTitle} / ${panelTitle}` : sectionTitle;
    }
    function mapFromPairs(entries) {
      const values = new Map();
      if (!Array.isArray(entries)) return values;
      entries.forEach((entry) => {
        const label = Array.isArray(entry) ? entry[0] : entry?.label;
        const value = Array.isArray(entry) ? entry[1] : entry?.value;
        if (label && value !== undefined && value !== null && String(value).trim() && !values.has(label)) {
          values.set(String(label), String(value).trim());
        }
      });
      return values;
    }
    function searchRecordKeyFor(record) {
      const explicitKey = String(record?.recordKey || record?.key || "").trim();
      if (explicitKey) return explicitKey;
      const livelabsId = String(record?.livelabsId || "").trim();
      const wmsId = String(record?.wmsId || "").trim();
      const normalizedTitle = normalizeFilterText(record?.title || "") || "untitled";
      if (livelabsId) return `livelabs:${livelabsId}`;
      if (wmsId) return `wms:${wmsId}:${normalizedTitle}`;
      const normalizedType = normalizeFilterText(record?.type || "content") || "content";
      return `content:${normalizedType}:${normalizedTitle}`;
    }
    function normalizeSearchIdentity(identity = {}) {
      return {
        livelabsId: String(identity?.livelabsId || identity?.livelabs_id || "").trim(),
        wmsId: String(identity?.wmsId || identity?.wms_id || "").trim(),
        contentKey: String(identity?.contentKey || identity?.content_key || "").trim()
      };
    }
    function canonicalRecordIdentity(record) {
      const identity = normalizeSearchIdentity(record);
      if (!identity.livelabsId && !identity.wmsId) {
        identity.contentKey = searchRecordKeyFor(record);
      } else {
        identity.contentKey = "";
      }
      return identity;
    }
    function hasSearchIdentity(identity) {
      const normalized = normalizeSearchIdentity(identity);
      return Boolean(normalized.livelabsId || normalized.wmsId || normalized.contentKey);
    }
    function searchIdentityLabel(identity) {
      const normalized = normalizeSearchIdentity(identity);
      return [
        normalized.livelabsId ? `LiveLabs ID ${normalized.livelabsId}` : "",
        normalized.wmsId ? `WMS ID ${normalized.wmsId}` : "",
        normalized.contentKey ? `content key ${normalized.contentKey}` : ""
      ].filter(Boolean).join(" and ") || "the supplied identity";
    }
    function resolveSearchRecordIdentity(records, identity) {
      const normalized = normalizeSearchIdentity(identity);
      if (!hasSearchIdentity(normalized)) {
        return { identity: normalized, kind: "missing", matches: [], record: null };
      }
      const matches = records.filter((record) => {
        if (normalized.livelabsId && String(record.livelabsId || "").trim() !== normalized.livelabsId) return false;
        if (normalized.wmsId && String(record.wmsId || "").trim() !== normalized.wmsId) return false;
        if (normalized.contentKey && searchRecordKeyFor(record) !== normalized.contentKey) return false;
        return true;
      });
      if (matches.length === 1) return { identity: normalized, kind: "exact", matches, record: matches[0] };
      return { identity: normalized, kind: matches.length ? "ambiguous" : "not-found", matches, record: null };
    }
    function fullIndexRecordToSearchRecord(raw) {
      const values = mapFromPairs(raw?.values);
      const details = mapFromPairs(raw?.details);
      const fileUpdates = Array.isArray(raw?.fileUpdates) ? raw.fileUpdates : [];
      const siblingSearchText = Array.isArray(raw?.family?.siblings)
        ? raw.family.siblings.map((item) => [item.livelabsId, item.wmsId, item.title, item.publishStatus, item.publishType, item.category].join(" ")).join(" ")
        : "";
      const searchable = normalizeFilterText([
        raw?.searchable,
        raw?.title,
        raw?.wmsId,
        raw?.livelabsId,
        raw?.category,
        raw?.owner,
        raw?.type,
        raw?.status,
        raw?.source,
        Array.from(values.values()).join(" "),
        Array.from(details.values()).join(" "),
        siblingSearchText
      ].filter(Boolean).join(" "));
      return {
        category: raw?.category || "",
        details,
        family: raw?.family || null,
        fileUpdates,
        livelabsId: String(raw?.livelabsId || ""),
        owner: cleanContactEnumeration(raw?.owner || ""),
        recordKey: raw?.key || "",
        row: null,
        searchable,
        source: raw?.source || "Full data layer",
        status: raw?.status || "",
        title: raw?.title || "",
        type: raw?.type || "Portfolio result",
        update: raw?.update || "",
        values,
        wmsId: String(raw?.wmsId || "")
      };
    }
    function mergeSearchRecords(...recordSets) {
      const merged = new Map();
      recordSets.flat().filter(Boolean).forEach((record) => {
        const key = searchRecordKeyFor(record);
        const existing = merged.get(key);
        if (!existing) {
          record.recordKey = key;
          merged.set(key, record);
          return;
        }
        const details = new Map([...record.details.entries(), ...existing.details.entries()]);
        const values = new Map([...record.values.entries(), ...existing.values.entries()]);
        const source = Array.from(new Set([existing.source, record.source].filter(Boolean).flatMap((item) => item.split(" / ")))).join(" / ");
        merged.set(key, {
          ...record,
          ...existing,
          category: existing.category || record.category,
          details,
          family: existing.family || record.family,
          fileUpdates: existing.fileUpdates?.length ? existing.fileUpdates : record.fileUpdates,
          owner: existing.owner || record.owner,
          recordKey: key,
          row: existing.row || record.row,
          searchable: normalizeFilterText([record.searchable, existing.searchable].join(" ")),
          source,
          status: existing.status || record.status,
          type: existing.type || record.type,
          update: existing.update || record.update,
          values
        });
      });
      searchRecordByKey = merged;
      return Array.from(merged.values());
    }
    function loadCanonicalPortfolioPayload() {
      if (portfolioPayloadPromise) return portfolioPayloadPromise;
      if (typeof fetch !== "function") {
        portfolioPayloadPromise = Promise.resolve({ metadata: null, records: [] });
        return portfolioPayloadPromise;
      }
      portfolioPayloadPromise = fetch("./data/portfolio_inventory.json", { cache: "no-cache" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
        .then((payload) => {
          portfolioInventoryMetadata = payload?.metadata || null;
          return {
            metadata: portfolioInventoryMetadata,
            records: Array.isArray(payload?.records) ? payload.records : []
          };
        });
      return portfolioPayloadPromise;
    }
    function loadFullSearchRecords() {
      if (fullSearchRecordsPromise) return fullSearchRecordsPromise;
      fullSearchRecordsPromise = loadCanonicalPortfolioPayload()
        .then((payload) => payload.records.map(fullIndexRecordToSearchRecord))
        .catch(() => []);
      return fullSearchRecordsPromise;
    }
    function portfolioInventoryRecordToSearchRecord(raw) {
      const record = fullIndexRecordToSearchRecord(raw);
      record.inventory = raw || {};
      record.title = raw?.title || record.title;
      record.wmsId = String(raw?.wmsId || record.wmsId || "");
      record.livelabsId = String(raw?.livelabsId || record.livelabsId || "");
      record.category = raw?.category || record.category || "";
      record.owner = cleanContactEnumeration(raw?.owner || record.owner || "");
      record.type = raw?.type || record.type || "";
      record.status = raw?.status || record.status || "";
      record.update = raw?.update || record.update || "";
      record.searchable = normalizeFilterText([record.searchable, raw?.searchable, raw?.publishStatus, raw?.publishType, raw?.contactCoverage?.label, raw?.contactCoverage?.tier].filter(Boolean).join(" "));
      return record;
    }
    function loadPortfolioInventoryRecords() {
      if (portfolioInventoryRecordsPromise) return portfolioInventoryRecordsPromise;
      portfolioInventoryRecordsPromise = loadCanonicalPortfolioPayload()
        .then((payload) => {
          return payload.records.map((raw, index) => {
            const record = portfolioInventoryRecordToSearchRecord(raw);
            record.inventoryIndex = index;
            return record;
          });
        })
        .catch((error) => {
          portfolioInventoryMetadata = null;
          window.__portfolioInventoryError = `Portfolio inventory load failed. ${error?.stack || error?.message || error || ""}`;
          return [];
        });
      return portfolioInventoryRecordsPromise;
    }
    const adminStorageKey = "livelabsAnalyticsAdminState";
    const sessionKey = "livelabsAnalyticsSession";
    const adminSessionDurationMs = 12 * 60 * 60 * 1000;
    const adminStateSchemaVersion = 3;
    const criteriaRuleAutomationPaused = true;
    const authorFacingGovernanceTagsHidden = true;
    let fullSearchRecordsPromise = null;
    let portfolioPayloadPromise = null;
    let portfolioInventoryRecordsPromise = null;
    let loadedFullSearchRecords = [];
    let portfolioInventoryMetadata = null;
    let portfolioInventoryLoadComplete = false;
    let tableSearchRecordsCache = null;
    let allDataRenderTimer = null;
    let allDataFilterOptionsRecordCount = 0;
    let searchRecordByKey = new Map();
    let inventoryRecordByKey = new Map();
    const allDataPageSizeSteps = [25, 50, 100, 250, 500, 1000, 1500, 2500, 5000, 10000];
    const allDataState = {
      coverage: "",
      page: 1,
      pageRange: "",
      pageSize: 100,
      publishStatus: "",
      publishType: "",
      query: "",
      reviewState: "",
      wmsId: "",
      sortDirection: "asc",
      sortKey: "",
      type: ""
    };
    const allDataSortFields = [
      { key: "title", label: "Title", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "publishStatus", label: "Publish Status", type: "text" },
      { key: "publishType", label: "Publish Type", type: "text" },
      { key: "wmsId", label: "WMS ID", type: "number" },
      { key: "livelabsId", label: "LiveLabs ID", type: "number" },
      { key: "category", label: "Category", type: "text" },
      { key: "contact", label: "Contact", type: "text" }
    ];
    const allDataReviewGroupOptions = [
      { key: "no-author", label: "No author/contact gap" },
      { key: "stale-high-demand", label: "Stale but high-demand" },
      { key: "retirement-review", label: "Retirement review" },
      { key: "refresh", label: "Refresh" },
      { key: "keep", label: "Keep" },
      { key: "inactive", label: "Inactive, disabled, or event" },
      { key: "missing", label: "Missing governance data" }
    ];
    const defaultTagDefinitions = [
      { key: "no-author", label: "No Author", className: "governance-group-no-author" },
      { key: "stale-high-demand", label: "Stale, High Demand", className: "governance-group-stale-high-demand" },
      { key: "retirement-review", label: "Retirement Review", className: "governance-group-retire-review" },
      { key: "refresh", label: "Refresh", className: "governance-group-stale-high-demand" },
      { key: "keep", label: "Keep", className: "" },
      { key: "inactive", label: "Inactive/Event", className: "governance-group-inactive" },
      { key: "missing", label: "Missing Data", className: "governance-group-missing" },
      { key: "manager-review", label: "Manager Review", className: "" }
    ];
    const defaultTagClassByKey = new Map(defaultTagDefinitions.map((tag) => [tag.key, tag.className || ""]));
    const tagKeyBlocklist = new Set(["qa-excluded"]);
    function visibleAllDataSortFields() {
      return allDataSortFields.filter((field) => !authorFacingGovernanceTagsHidden || !field.governanceTagOnly);
    }
    const defaultQaExceptionRules = [
      {
        criteria: {
          contentTypes: ["workshop", "sprint"],
          minAgeMonths: 24,
          minScore: 70,
          minStaleMonths: 12,
          minViews12m: 1000,
          minViews90d: 100
        },
        enabled: false,
        id: "qa-high-demand-stale-older-content",
        label: "High-demand stale older content",
        note: "Quantitative review rule for older active content with stale update evidence and strong current demand. Keep pending until manager review.",
        status: "pending",
        type: "criteria",
        value: ""
      }
    ];
    const defaultSectionVisibility = {
      topPerformers: true,
      atRiskContent: true,
      retireNowContent: true,
      replacementSuggestions: true,
      disabledContent: true,
      portfolioStats: true
    };
    const defaultAdminState = {
      schemaVersion: adminStateSchemaVersion,
      contentMode: "analyst",
      detailExpansionEnabled: true,
      qaExceptionExclusionEnabled: false,
      qaExceptionRules: defaultQaExceptionRules,
      qaExceptionTagEnabled: false,
      rowOverrides: [],
      sectionVisibility: defaultSectionVisibility,
      tagDefinitions: defaultTagDefinitions
    };
    const adminFieldMappings = {
      category: { details: ["Category", "Council"], headers: ["Category", "Council"] },
      contentKind: { details: ["Content Type", "Content Kind"], headers: ["Content Type", "Content Kind"] },
      lastUpdate: { details: ["Latest Workshop Commit Date", "Latest Markdown Commit Date", "Latest Live Repo Commit Date", "Last Meaningful Update"], headers: ["Last Meaningful Update", "Last Update", "Disabled Since"] },
      livelabsId: { details: ["LiveLabs ID", "Current LiveLabs ID", "Candidate LiveLabs ID"], headers: ["LiveLabs ID", "Current LiveLabs ID", "Candidate LiveLabs ID"] },
      manager: { details: ["Manager Email", "Owner Group", "Owner Email", "Author Email"], headers: ["Author Email", "Owner Group", "Manager Email", "Owner"] },
      monthsSinceUpdate: { details: ["Months Since Update", "Months Since Last Update"], headers: ["Stale Months", "Months Since Update"] },
      publishDate: { details: ["Publish Date Used", "First Workshop File Commit Date", "Publish Date"], headers: ["Publish Date"] },
      score: { details: ["Score", "Best Performer Score", "Retire Score", "Replacement Similarity Score"], headers: ["Score", "Risk Score", "Retire Score", "Replacement Score"] },
      title: { details: ["Title"], headers: ["Title", "Current Item", "Candidate Title"] },
      views12m: { details: ["Views 12m", "Recent Views 12m", "Page Views 12m"], headers: ["Views 12m", "Recent Views 12m", "Page Views 12m"] },
      views90d: { details: ["Views 90d", "Recent Views 90d", "Page Views 90d"], headers: ["Views 90d", "Recent Views 90d", "Page Views 90d"] },
      wmsId: { details: ["WMS ID", "Current WMS ID", "Candidate WMS ID"], headers: ["WMS ID", "Current WMS ID", "Candidate WMS ID"] }
    };
    let dashboardAdminState = readDashboardAdminState();
    let refreshDashboardSearch = () => {};
    function adminNumberOrNull(value) {
      if (value === null || value === undefined || value === "") return null;
      const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
      if (!match) return null;
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : null;
    }
    function sanitizeCriteria(rawCriteria = {}) {
      const contentTypes = Array.isArray(rawCriteria.contentTypes)
        ? rawCriteria.contentTypes.map((type) => normalizeFilterText(type)).filter((type) => ["workshop", "sprint"].includes(type))
        : [];
      const criteria = { contentTypes: Array.from(new Set(contentTypes)) };
      ["minAgeMonths", "minStaleMonths", "minViews12m", "minViews90d", "minScore"].forEach((key) => {
        const value = adminNumberOrNull(rawCriteria[key]);
        criteria[key] = value === null ? "" : value;
      });
      return criteria;
    }
    function criteriaHasValues(criteria = {}) {
      return Boolean(
        criteria.contentTypes?.length
        || ["minAgeMonths", "minStaleMonths", "minViews12m", "minViews90d", "minScore"].some((key) => criteria[key] !== "" && criteria[key] !== null && criteria[key] !== undefined)
      );
    }
    function isLegacyKeywordExceptionRule(rule) {
      const id = String(rule?.id || "");
      return id === "qa-stable-19c" || id === "qa-stable-23ai";
    }
    function sanitizeRule(rule, index) {
      const fallback = defaultQaExceptionRules[index] || {};
      const legacyKeywordRule = isLegacyKeywordExceptionRule(rule);
      const type = rule?.type === "criteria" || rule?.criteria || fallback.type === "criteria" ? "criteria" : "target";
      const criteria = sanitizeCriteria(rule?.criteria || fallback.criteria || {});
      const value = String(rule?.value ?? fallback.value ?? "").trim();
      return {
        criteria,
        enabled: legacyKeywordRule ? false : Boolean(rule?.enabled ?? fallback.enabled),
        id: String(rule?.id || fallback.id || `qa-rule-${Date.now()}-${index}`),
        label: String(rule?.label || fallback.label || value || "QA exception rule"),
        note: String(rule?.note || fallback.note || ""),
        status: legacyKeywordRule ? "disabled" : (["active", "pending", "disabled"].includes(rule?.status) ? rule.status : (fallback.status || "pending")),
        target: ["keyword", "title", "wms_id", "livelabs_id"].includes(rule?.target) ? rule.target : (fallback.target || "keyword"),
        type,
        value
      };
    }
    function sanitizeFieldEdits(fieldEdits = {}) {
      const allowed = new Set(Object.keys(adminFieldMappings));
      return Object.fromEntries(Object.entries(fieldEdits || {})
        .filter(([key, value]) => allowed.has(key) && String(value ?? "").trim())
        .map(([key, value]) => [key, String(value).trim()]));
    }
    function tagKeyFor(value) {
      return normalizeFilterText(value).replace(/\s+/g, "-");
    }
    function uniqueTagKey(baseKey, existingKeys) {
      const base = tagKeyBlocklist.has(baseKey) ? "tag" : (baseKey || "tag");
      let key = base;
      let index = 2;
      while (existingKeys.has(key) || tagKeyBlocklist.has(key)) {
        key = `${base}-${index}`;
        index += 1;
      }
      return key;
    }
    function sanitizeTagDefinitions(tags = defaultTagDefinitions) {
      const seen = new Set();
      return (Array.isArray(tags) ? tags : [])
        .map((tag) => {
          const label = String(tag?.label || formatOverrideStatus(tag?.key || "")).trim();
          const requestedKey = tagKeyFor(tag?.key || label);
          if (!label || !requestedKey || tagKeyBlocklist.has(requestedKey)) return null;
          const key = uniqueTagKey(requestedKey, seen);
          seen.add(key);
          return {
            key,
            label,
            note: String(tag?.note || ""),
            className: String(tag?.className || defaultTagClassByKey.get(key) || "")
          };
        })
        .filter(Boolean);
    }
    function tagDefinitionsForState(candidate) {
      return Array.isArray(candidate?.tagDefinitions) ? candidate.tagDefinitions : defaultTagDefinitions;
    }
    function sanitizeAssignedTags(tags = [], definitions = defaultTagDefinitions) {
      const allowed = new Set(tagDefinitionsForState({ tagDefinitions: definitions }).map((tag) => tag.key));
      const source = Array.isArray(tags) ? tags : String(tags || "").split(",");
      return Array.from(new Set(source
        .map((tag) => normalizeFilterText(tag).replace(/\s+/g, "-"))
        .filter((tag) => allowed.has(tag))));
    }
    function tagDefinitionFor(key) {
      return tagDefinitionsForState(dashboardAdminState).find((tag) => tag.key === key) || { key, label: formatOverrideStatus(key), className: "" };
    }
    function tagPillsHtml(tags = []) {
      const cleaned = sanitizeAssignedTags(tags, tagDefinitionsForState(dashboardAdminState));
      if (!cleaned.length) return "";
      return `<span class="governance-group-list">${cleaned.map((tagKey) => {
        const tag = tagDefinitionFor(tagKey);
        return `<span class="governance-group-pill ${escapeHtml(tag.className || "")}" data-admin-tag="${escapeHtml(tag.key)}">${escapeHtml(tag.label)}</span>`;
      }).join("")}</span>`;
    }
    function adminTagsForRecord(record) {
      return sanitizeAssignedTags(adminOverrideForRecord(record)?.tags || [], tagDefinitionsForState(dashboardAdminState));
    }
    function sanitizeOverride(override, tagDefinitions = defaultTagDefinitions) {
      const legacyQaStatus = override?.status === "qa_excluded";
      const statusValues = ["pending", "approved", "archived", "manager_review", "keep_active", "retire_candidate", "refresh_candidate"];
      const status = legacyQaStatus ? "manager_review" : (statusValues.includes(override?.status) ? override.status : "pending");
      return {
        enabled: override?.enabled !== false,
        fieldEdits: sanitizeFieldEdits(override?.fieldEdits),
        id: String(override?.id || `override-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
        note: String(override?.note || ""),
        qaExcluded: false,
        status,
        tags: sanitizeAssignedTags(override?.tags, tagDefinitions),
        target: ["title", "wms_id", "livelabs_id"].includes(override?.target) ? override.target : "wms_id",
        value: String(override?.value || "").trim()
      };
    }
    function sanitizeDashboardAdminState(state) {
      const sectionVisibility = { ...defaultSectionVisibility, ...(state?.sectionVisibility || {}) };
      const rawRules = Array.isArray(state?.qaExceptionRules) && state.qaExceptionRules.length ? state.qaExceptionRules : defaultQaExceptionRules;
      const isCurrentSchema = Number(state?.schemaVersion || 0) >= adminStateSchemaVersion;
      const tagDefinitions = Array.isArray(state?.tagDefinitions)
        ? sanitizeTagDefinitions(state.tagDefinitions)
        : sanitizeTagDefinitions(defaultTagDefinitions);
      return {
        schemaVersion: adminStateSchemaVersion,
        contentMode: "analyst",
        detailExpansionEnabled: true,
        qaExceptionExclusionEnabled: criteriaRuleAutomationPaused ? false : (isCurrentSchema ? state?.qaExceptionExclusionEnabled === true : false),
        qaExceptionRules: rawRules.map(sanitizeRule).filter((rule) => rule.type === "criteria" ? criteriaHasValues(rule.criteria) : rule.value),
        qaExceptionTagEnabled: false,
        rowOverrides: Array.isArray(state?.rowOverrides) ? state.rowOverrides.map((override) => sanitizeOverride(override, tagDefinitions)).filter((override) => override.value) : [],
        sectionVisibility,
        tagDefinitions
      };
    }
    function readDashboardAdminState() {
      try {
        return sanitizeDashboardAdminState(JSON.parse(window.localStorage.getItem(adminStorageKey) || "{}"));
      } catch (error) {
        return sanitizeDashboardAdminState(defaultAdminState);
      }
    }
    function readDashboardSession() {
      try {
        return JSON.parse(window.localStorage.getItem(sessionKey) || "{}");
      } catch (error) {
        return {};
      }
    }
    function isCachedAdminSessionActive(candidate) {
      if (candidate?.role !== "admin") return false;
      const expiresAt = Date.parse(candidate.expiresAt || "");
      return !Number.isFinite(expiresAt) || expiresAt > Date.now();
    }
    function refreshCachedAdminSession(candidate) {
      if (!isCachedAdminSessionActive(candidate)) {
        if (candidate?.role === "admin") window.localStorage.removeItem(sessionKey);
        return null;
      }
      const refreshedSession = {
        ...candidate,
        expiresAt: new Date(Date.now() + adminSessionDurationMs).toISOString(),
        lastSeenAt: new Date().toISOString()
      };
      window.localStorage.setItem(sessionKey, JSON.stringify(refreshedSession));
      return refreshedSession;
    }
    function syncAdminEntryLink() {
      const link = document.querySelector("[data-admin-link]");
      if (!link) return;
      const session = refreshCachedAdminSession(readDashboardSession());
      link.href = "./admin/";
      link.title = session
        ? `Open admin panel as ${session.email || session.name || "admin"}`
        : "Sign in to open the admin panel";
      link.setAttribute("aria-label", link.title);
      link.addEventListener("click", (event) => {
        const cachedSession = refreshCachedAdminSession(readDashboardSession());
        if (!cachedSession) return;
        event.preventDefault();
        window.location.href = "./admin/";
      }, { once: true });
    }
    function activeQaExceptionRules() {
      if (criteriaRuleAutomationPaused) return [];
      return dashboardAdminState.qaExceptionRules.filter((rule) => {
        return rule.enabled && rule.status === "active" && (rule.type === "criteria" ? criteriaHasValues(rule.criteria) : rule.value);
      });
    }
    function isDisabledContentRow(row) {
      const tableId = row.closest("[data-filter-table]")?.dataset?.filterTable || "";
      if (tableId.startsWith("disabled-")) return true;
      const details = detailValuesFor(row);
      const publishType = normalizeFilterText(details.get("Publish Type") || "");
      const inclusionState = normalizeFilterText(details.get("Why It Is Included Or Excluded") || "");
      return publishType === "disabled" || inclusionState.includes("disabled");
    }
    function removeQaExceptionMarkers(row) {
      row.classList.remove("qa-exception-row");
      delete row.dataset.qaException;
      delete row.dataset.qaAnalyticsExcluded;
      delete row.dataset.qaExceptionRuleId;
      row.querySelectorAll(".qa-exception-badge").forEach((badge) => {
        const previous = badge.previousSibling;
        badge.remove();
        if (previous && previous.nodeType === 3 && !previous.textContent.trim()) previous.remove();
      });
      detailRowFor(row)?.querySelectorAll("[data-qa-exception-detail]").forEach((detail) => detail.remove());
    }
    function adminMatchContextFor(row) {
      const values = rowValuesByHeader(row);
      const details = detailValuesFor(row);
      const title = pickValue(values, ["Title", "Current Item"]) || details.get("Title") || "";
      const wmsId = pickValue(values, ["WMS ID", "Current WMS ID"]) || details.get("WMS ID") || "";
      const livelabsId = pickValue(values, ["LiveLabs ID", "Current LiveLabs ID"]) || details.get("LiveLabs ID") || "";
      const pathEvidence = [
        details.get("Workshop Path"),
        details.get("Manifest Path"),
        details.get("Acknowledgement Source File")
      ].filter(Boolean).join(" ");
      const fullText = normalizeFilterText(Array.from(new Set([
        title,
        pathEvidence,
        wmsId,
        livelabsId,
        pickValue(values, ["Category"]) || details.get("Category") || "",
        Array.from(details.values()).join(" ")
      ])).join(" "));
      return { details, fullText, livelabsId, pathEvidence, title, values, wmsId };
    }
    function adminTargetMatches(row, target, value) {
      const context = adminMatchContextFor(row);
      const needle = normalizeFilterText(value);
      if (!needle) return false;
      if (target === "wms_id") return normalizeFilterText(context.wmsId) === needle;
      if (target === "livelabs_id") return normalizeFilterText(context.livelabsId) === needle;
      if (target === "title") return normalizeFilterText(context.title).includes(needle);
      if (target === "path") return normalizeFilterText(context.pathEvidence).includes(needle);
      return context.fullText.includes(needle);
    }
    function adminValueFor(context, labels) {
      const fromRow = pickValue(context.values, labels);
      if (fromRow) return fromRow;
      for (const label of labels) {
        const value = context.details.get(label);
        if (value) return value;
      }
      const normalizedLabels = labels.map((label) => normalizeFilterText(label));
      for (const [key, value] of context.details.entries()) {
        if (value && normalizedLabels.some((label) => normalizeFilterText(key).includes(label))) return value;
      }
      return "";
    }
    function monthsSinceDateValue(value) {
      const text = String(value || "");
      const parenthetical = text.match(/\((\d+)\s+months?\)/i);
      if (parenthetical) return Number(parenthetical[1]);
      const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
      if (!dateMatch) return null;
      const date = new Date(`${dateMatch[0]}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return null;
      const now = new Date();
      const months = (now.getUTCFullYear() - date.getUTCFullYear()) * 12 + (now.getUTCMonth() - date.getUTCMonth());
      return Math.max(0, months);
    }
    function qaMetricContextFor(row) {
      const context = adminMatchContextFor(row);
      const contentType = normalizeFilterText(adminValueFor(context, ["Content Type", "Content Kind"]) || "");
      const latestUpdate = adminValueFor(context, ["Last Meaningful Update", "Latest Workshop Commit Date", "Latest Markdown Commit Date", "Latest Live Repo Commit Date"]);
      const publishDate = adminValueFor(context, ["Publish Date Used", "First Workshop File Commit Date"]);
      const score = adminNumberOrNull(adminValueFor(context, ["Score", "Best Performer Score", "Retire Score"]));
      return {
        ...context,
        ageMonths: monthsSinceDateValue(publishDate),
        contentType,
        score,
        staleMonths: monthsSinceDateValue(latestUpdate),
        views12m: adminNumberOrNull(adminValueFor(context, ["Views 12m", "Recent Views 12m", "Page Views 12m"])),
        views90d: adminNumberOrNull(adminValueFor(context, ["Views 90d", "Recent Views 90d", "Page Views 90d"]))
      };
    }
    function numericCriterionPass(actual, requiredMinimum) {
      if (requiredMinimum === "" || requiredMinimum === null || requiredMinimum === undefined) return true;
      if (actual === null || actual === undefined || actual === "") return false;
      return Number(actual) >= Number(requiredMinimum);
    }
    function qaCriteriaRuleMatches(row, rule) {
      const metrics = qaMetricContextFor(row);
      const criteria = rule.criteria || {};
      const contentTypes = Array.isArray(criteria.contentTypes) ? criteria.contentTypes : [];
      if (contentTypes.length && !contentTypes.includes(metrics.contentType)) return false;
      return numericCriterionPass(metrics.ageMonths, criteria.minAgeMonths)
        && numericCriterionPass(metrics.staleMonths, criteria.minStaleMonths)
        && numericCriterionPass(metrics.views12m, criteria.minViews12m)
        && numericCriterionPass(metrics.views90d, criteria.minViews90d)
        && numericCriterionPass(metrics.score, criteria.minScore);
    }
    function qaExceptionRuleFor(row) {
      return activeQaExceptionRules().find((rule) => {
        return rule.type === "criteria" ? qaCriteriaRuleMatches(row, rule) : adminTargetMatches(row, rule.target, rule.value);
      });
    }
    function qaExceptionAppliesToAnalytics(row) {
      const tableId = row.closest("[data-filter-table]")?.dataset?.filterTable || "";
      return !isDisabledContentRow(row) && (tableId.startsWith("at-risk-") || tableId.startsWith("retire-now-"));
    }
    function addQaExceptionDetail(row, rule) {
      if (authorFacingGovernanceTagsHidden) return;
      const detailRow = detailRowFor(row);
      const detailBody = detailRow?.querySelector(".detail-table tbody");
      if (!detailBody || detailBody.querySelector("[data-qa-exception-detail]")) return;
      const note = document.createElement("tr");
      note.dataset.qaExceptionDetail = "true";
      const ruleLabel = rule?.label || "QA review rule";
      const ruleNote = rule?.note ? ` ${rule.note}` : "";
      const detailText = dashboardAdminState.qaExceptionExclusionEnabled
        ? `${ruleLabel}.${ruleNote} Excluded from QA analytics candidate lists in this browser view; still visible where demand matters.`
        : `${ruleLabel}.${ruleNote} QA candidate exclusion is off, so the row remains visible in candidate lists.`;
      note.innerHTML = `<th>QA Review</th><td>${escapeHtml(detailText.trim())}</td>`;
      detailBody.prepend(note);
    }
    function addQaExceptionBadge(row, label = "QA Review", extraClass = "") {
      if (authorFacingGovernanceTagsHidden) return;
      const titleCell = row.querySelectorAll("td[data-filter-value]")[1];
      if (!titleCell || titleCell.querySelector(".qa-exception-badge")) return;
      const badge = document.createElement("span");
      badge.className = `qa-exception-badge ${extraClass}`.trim();
      badge.textContent = label;
      titleCell.appendChild(document.createTextNode(" "));
      titleCell.appendChild(badge);
    }
    const noAuthorRetirementTableIds = new Set([
      "at-risk-top-100-workshops",
      "at-risk-top-100-sprints",
      "retire-now-top-100-workshops",
      "retire-now-top-100-sprints"
    ]);
    const demandProtectedReviewTableIds = new Set(noAuthorRetirementTableIds);
    function cleanDisplayValue(value) {
      const text = String(value || "").trim();
      return /^(n\/a|none|null|undefined|-|--|na)$/i.test(text) ? "" : text;
    }
    function cleanContactEnumeration(value) {
      return String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .join(", ");
    }
    function isContactEnumerationLabel(label) {
      return /email|contact|workshop team/i.test(String(label || ""))
        || /^(author|owner)$/i.test(String(label || "").trim());
    }
    function displayDetailValue(label, value) {
      const text = String(value ?? "").trim();
      return isContactEnumerationLabel(label) ? cleanContactEnumeration(text) : text;
    }
    const copyableTableFields = new Map([
      ["title", "Workshop/Sprint Title"],
      ["current item", "Workshop/Sprint Title"],
      ["author email", "Author Email"],
      ["owner email", "Author Email"],
      ["wms id", "WMS ID"],
      ["current wms id", "WMS ID"],
      ["livelabs id", "LiveLabs ID"],
      ["current livelabs id", "LiveLabs ID"]
    ]);
    const copyableDetailFields = new Set([
      "owner",
      "owner email",
      "author email",
      "wms id",
      "livelabs id",
      "category",
      "status",
      "workshop status",
      "manager email"
    ]);
    function copyableValueHtml(value, label, fallback = "N/A") {
      const text = String(value ?? "").trim() || fallback;
      const safeText = escapeHtml(text);
      const safeLabel = escapeHtml(label);
      return `<span class="copy-value-target"><span class="copy-value-text">${safeText}</span><button class="copy-value-button" type="button" data-copy-value="${safeText}" aria-label="Copy ${safeLabel}" title="Copy ${safeLabel}">Copy</button></span>`;
    }
    function copyValueFromElement(element, label) {
      if (!element || element.querySelector(".copy-value-target")) return;
      const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (!textNode) return;
      const text = textNode.textContent.trim();
      if (!text) return;
      const leading = textNode.textContent.match(/^\s*/)?.[0] || "";
      const trailing = textNode.textContent.match(/\s*$/)?.[0] || "";
      const target = document.createElement("span");
      target.className = "copy-value-target";
      const valueText = document.createElement("span");
      valueText.className = "copy-value-text";
      valueText.textContent = text;
      const button = document.createElement("button");
      button.className = "copy-value-button";
      button.type = "button";
      button.dataset.copyValue = text;
      button.title = `Copy ${label}`;
      button.setAttribute("aria-label", `Copy ${label}`);
      button.textContent = "Copy";
      target.append(valueText, button);
      const replacement = document.createDocumentFragment();
      if (leading) replacement.appendChild(document.createTextNode(leading));
      replacement.appendChild(target);
      if (trailing) replacement.appendChild(document.createTextNode(trailing));
      textNode.replaceWith(replacement);
    }
    function copyableLabelForHeader(header) {
      const normalized = normalizeFilterText(header?.textContent || "");
      return copyableTableFields.get(normalized) || "";
    }
    function decorateDashboardCopyTargets(root = document) {
      root.querySelectorAll?.("table").forEach((table) => {
        if (table.id === "all-content-data-table" || table.closest("#search-workshop-view")) return;
        const headers = Array.from(table.querySelectorAll("thead th"));
        headers.forEach((header, index) => {
          const label = copyableLabelForHeader(header);
          if (!label) return;
          table.querySelectorAll(`tbody tr[data-filter-row="true"]`).forEach((row) => {
            const cell = row.children[index];
            if (cell) copyValueFromElement(cell, label);
          });
        });
      });
    }
    function detailFieldLabelForElement(element) {
      const row = element.closest("tr");
      const tableLabel = row?.querySelector("th")?.textContent || "";
      if (tableLabel) return tableLabel.trim();
      const definition = element.closest("div");
      return definition?.querySelector("dt")?.textContent?.trim() || "";
    }
    function decorateDetailCopyTargets(root = document) {
      root.querySelectorAll?.("#search-workshop-view .search-result-card dd, #search-workshop-view .search-meta-list dd, #search-workshop-view .search-detail-table td").forEach((element) => {
        const label = detailFieldLabelForElement(element);
        if (copyableDetailFields.has(normalizeFilterText(label))) copyValueFromElement(element, label);
      });
    }
    async function copyValueFromButton(button) {
      const text = button?.dataset.copyValue || "";
      if (!text) return;
      const statusNode = document.getElementById("copy-status");
      const label = button.getAttribute("aria-label") || "value";
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
        if (statusNode) statusNode.textContent = `${label} copied`;
      } catch {
        button.textContent = "Copy failed";
        if (statusNode) statusNode.textContent = `${label} could not be copied`;
      }
      window.setTimeout(() => { button.textContent = "Copy"; }, 1400);
    }
    function valueHasEmail(value) {
      return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(String(value || ""));
    }
    function valueLooksLikePerson(value) {
      const text = cleanDisplayValue(value);
      if (!text) return false;
      if (valueHasEmail(text)) return true;
      const groupWords = new Set([
        "adb", "analytics", "apex", "architect", "architecture", "cloud", "council",
        "database", "developer", "development", "engineer", "enterprise", "global",
        "lead", "livelabs", "management", "manager", "oracle", "platform",
        "principal", "product", "program", "se", "strategy", "team", "technology"
      ]);
      const nameWords = text
        .replace(/&[a-z]+;/gi, " ")
        .replace(/[^A-Za-z\s.'-]/g, " ")
        .split(/\s+/)
        .map((word) => word.replace(/^[.'-]+|[.'-]+$/g, ""))
        .filter((word) => /^[A-Z][a-z]{1,}$/.test(word) && !groupWords.has(word.toLowerCase()));
      return nameWords.length >= 2;
    }
    function detailsMapForRow(row) {
      const details = new Map();
      detailRowFor(row)?.querySelectorAll(".detail-table tbody tr").forEach((line) => {
        const key = (line.querySelector("th")?.textContent || "").trim();
        const value = (line.querySelector("td")?.textContent || "").trim();
        if (key) details.set(key, value);
      });
      return details;
    }
    function authorEmailCellForRow(row) {
      const headers = headerLabelsFor(row).map((label) => normalizeFilterText(label));
      const cells = Array.from(row.querySelectorAll("td[data-filter-value]"));
      const index = headers.findIndex((label) => label === "author email");
      return index >= 0 ? cells[index] : null;
    }
    function contactEvidence(label, value, tier, tierLabel, validator) {
      const text = cleanDisplayValue(value);
      if (!text || !validator(text)) return null;
      return { label, tier, tierLabel, value: text };
    }
    function contactCoverageForRow(row) {
      const details = detailsMapForRow(row);
      const evidence = [];
      const authorCell = authorEmailCellForRow(row);
      const authorEmail = contactEvidence("Author Email", authorCell?.textContent, 1, "Author", valueHasEmail);
      if (authorEmail) evidence.push(authorEmail);
      [
        ["Author Email", "Author Email", valueHasEmail],
        ["Workshop Owner Email", "Workshop Owner Email", valueHasEmail],
        ["Owner Email", "Owner Email", valueHasEmail],
        ["Acknowledgement Author", "Acknowledgement Author", valueLooksLikePerson]
      ].forEach(([label, field, validator]) => {
        const item = contactEvidence(label, details.get(field), 1, "Author", validator);
        if (item) evidence.push(item);
      });
      [
        ["Technical Contact", "Technical Contact", valueLooksLikePerson],
        ["Support Contact", "Support Contact", valueLooksLikePerson],
        ["Manager Email", "Manager Email", valueHasEmail],
        ["Acknowledgement Updater", "Acknowledgement Updater", valueLooksLikePerson],
        ["Workshop Team", "Workshop Team", valueLooksLikePerson]
      ].forEach(([label, field, validator]) => {
        const item = contactEvidence(label, details.get(field), 2, "Fallback Contact", validator);
        if (item) evidence.push(item);
      });
      ["Owner Group", "Workshop Owner Group", "Owner", "Stakeholder", "Council"].forEach((field) => {
        const value = details.get(field) || (field === "Owner" ? row.dataset.owner : "");
        const groupItem = contactEvidence(field, value, 3, "Owner/Stakeholder Group", (text) => Boolean(text));
        if (groupItem) evidence.push(groupItem);
      });
      const best = evidence.sort((left, right) => left.tier - right.tier)[0] || null;
      return {
        best,
        evidence,
        satisfiesContactCoverage: Boolean(best && best.tier <= 2)
      };
    }
    function contactCoverageText(coverage) {
      if (coverage.best?.tier === 1) {
        return `Tier 1 author coverage found from ${coverage.best.label}: ${coverage.best.value}.`;
      }
      if (coverage.best?.tier === 2) {
        return `Tier 2 fallback contact found from ${coverage.best.label}: ${coverage.best.value}. This can replace a missing author for dashboard triage.`;
      }
      if (coverage.best?.tier === 3) {
        return `Tier 3 owner/stakeholder group only: ${coverage.best.label}: ${coverage.best.value}. Add an author, technical contact, support contact, or manager contact before treating this as covered.`;
      }
      return "No author, fallback contact, or owner/stakeholder group evidence found.";
    }
    function portfolioInventoryRecordForRow(row) {
      if (!loadedFullSearchRecords.length) return null;
      const values = rowValuesByHeader(row);
      const details = detailsMapForRow(row);
      const livelabsId = cleanDisplayValue(pickValue(values, ["LiveLabs ID", "Current LiveLabs ID"]) || details.get("LiveLabs ID") || "");
      const wmsId = cleanDisplayValue(pickValue(values, ["WMS ID", "Current WMS ID"]) || details.get("WMS ID") || "");
      const title = cleanDisplayValue(pickValue(values, ["Title", "Current Item"]) || details.get("Title") || "");
      if (livelabsId) {
        const match = loadedFullSearchRecords.find((record) => String(record.livelabsId || "") === livelabsId);
        if (match) return match;
      }
      if (wmsId && title) {
        const normalizedTitle = normalizeFilterText(title);
        const match = loadedFullSearchRecords.find((record) => String(record.wmsId || "") === wmsId && normalizeFilterText(record.title || "") === normalizedTitle);
        if (match) return match;
      }
      return null;
    }
    function inventoryCoverageDetailText(record) {
      const coverage = allDataContactCoverage(record);
      const detail = coverage.detail ? ` ${coverage.detail}.` : "";
      if (coverage.rank === "author" || coverage.rank === "fallback") {
        return `Full inventory contact coverage is ${coverage.label}.${detail} This row should not be treated as a no-author/contact-gap item.`;
      }
      if (coverage.rank === "owner") {
        return `Full inventory contact coverage is owner/stakeholder only.${detail} Add an author, technical contact, support contact, or manager contact before treating this as covered.`;
      }
      return `Full inventory contact coverage has no author, fallback contact, or owner/stakeholder evidence.${detail}`;
    }
    function rowHasIndividualAuthor(row) {
      const inventoryRecord = portfolioInventoryRecordForRow(row);
      if (inventoryRecord) return !allDataRecordHasNoAuthor(inventoryRecord);
      return contactCoverageForRow(row).satisfiesContactCoverage;
    }
    function rowNoAuthorDetailText(row) {
      const inventoryRecord = portfolioInventoryRecordForRow(row);
      if (inventoryRecord) return inventoryCoverageDetailText(inventoryRecord);
      const coverage = contactCoverageForRow(row);
      const ladder = [
        "Tier 1: author or author email.",
        "Tier 2: technical, support, manager, updater, or workshop-team contact.",
        "Tier 3: stakeholder, council, or owner group only; this does not satisfy the rule."
      ];
      return `${contactCoverageText(coverage)} ${ladder.join(" ")}`;
    }
    function addNoAuthorBadge(row) {
      if (authorFacingGovernanceTagsHidden) return;
      const titleCell = row.querySelectorAll("td[data-filter-value]")[1];
      if (!titleCell || titleCell.querySelector(".no-author-badge")) return;
      const badge = document.createElement("span");
      badge.className = "no-author-badge";
      badge.textContent = "No Author";
      badge.title = "No author or accepted fallback contact found.";
      titleCell.appendChild(document.createTextNode(" "));
      titleCell.appendChild(badge);
      if (!titleCell.dataset.noAuthorBaseFilterValue) {
        titleCell.dataset.noAuthorBaseFilterValue = titleCell.dataset.filterValue || "";
      }
      titleCell.dataset.filterValue = `${titleCell.dataset.noAuthorBaseFilterValue} no author no individual author`.trim();
    }
    function addNoAuthorDetail(row) {
      if (authorFacingGovernanceTagsHidden) return;
      const detailBody = detailRowFor(row)?.querySelector(".detail-table tbody");
      if (!detailBody || detailBody.querySelector("[data-no-author-detail]")) return;
      const detail = document.createElement("tr");
      detail.dataset.noAuthorDetail = "true";
      detail.innerHTML = `<th>Author Coverage</th><td>${escapeHtml(rowNoAuthorDetailText(row))}</td>`;
      detailBody.prepend(detail);
    }
    function clearNoAuthorMarkers(row) {
      row.classList.remove("no-author-row");
      delete row.dataset.noAuthor;
      const titleCell = row.querySelectorAll("td[data-filter-value]")[1];
      if (titleCell?.dataset.noAuthorBaseFilterValue !== undefined) {
        titleCell.dataset.filterValue = titleCell.dataset.noAuthorBaseFilterValue;
      }
      row.querySelectorAll(".no-author-badge").forEach((badge) => {
        const previous = badge.previousSibling;
        badge.remove();
        if (previous && previous.nodeType === 3 && !previous.textContent.trim()) previous.remove();
      });
      detailRowFor(row)?.querySelectorAll("[data-no-author-detail]").forEach((detail) => detail.remove());
    }
    function addNoAuthorFilter(tableId) {
      if (authorFacingGovernanceTagsHidden) return;
      const firstFilter = document.querySelector(`[data-table-filter="${tableId}"]`);
      const grid = firstFilter?.closest(".filter-grid");
      if (!grid || grid.querySelector(`[data-filter-mode="no-author"][data-table-filter="${tableId}"]`)) return;
      const field = document.createElement("label");
      field.className = "filter-field no-author-filter-field";
      field.setAttribute("for", `${tableId}-filter-no-author`);
      field.innerHTML = `<span>No Author</span><span class="no-author-toggle"><input id="${tableId}-filter-no-author" type="checkbox" value="no-author" data-table-filter="${tableId}" data-filter-mode="no-author">Only rows without author/contact</span>`;
      grid.prepend(field);
    }
    function applyNoAuthorGovernanceFlags() {
      if (authorFacingGovernanceTagsHidden) return;
      noAuthorRetirementTableIds.forEach((tableId) => {
        addNoAuthorFilter(tableId);
        document.querySelectorAll(`#${tableId} tbody tr[data-filter-row="true"][data-detail-row-id]`).forEach((row) => {
          clearNoAuthorMarkers(row);
          if (rowHasIndividualAuthor(row)) return;
          row.dataset.noAuthor = "true";
          row.classList.add("no-author-row");
          addNoAuthorBadge(row);
          addNoAuthorDetail(row);
        });
      });
    }
    function rowDemandProtectionStatus(row) {
      const metrics = qaMetricContextFor(row);
      const lifecycle = normalizeFilterText(metrics.details.get("Lifecycle State") || "");
      const reasons = [];
      if (lifecycle === "refresh") reasons.push("Lifecycle State is Refresh");
      if (metrics.views12m !== null && metrics.views12m >= 1000) reasons.push(`Views 12m ${metrics.views12m.toLocaleString()} >= 1,000`);
      if (metrics.views90d !== null && metrics.views90d >= 100) reasons.push(`Views 90d ${metrics.views90d.toLocaleString()} >= 100`);
      const stale = metrics.staleMonths !== null && metrics.staleMonths > 12;
      return {
        protected: stale && reasons.length > 0 && !isDisabledContentRow(row),
        reasons,
        staleMonths: metrics.staleMonths,
        views12m: metrics.views12m,
        views90d: metrics.views90d
      };
    }
    function rowDemandProtectionDetailText(row) {
      const status = rowDemandProtectionStatus(row);
      const months = status.staleMonths === null ? "unknown age" : `${status.staleMonths} months since update`;
      const reasonText = status.reasons.length ? status.reasons.join("; ") : "no demand-protection threshold met";
      return `Stale threshold match: ${months}. Demand protection: ${reasonText}. Review for refresh or keep-active handling before treating this as a clean retirement candidate.`;
    }
    function addDemandProtectedBadge(row) {
      if (authorFacingGovernanceTagsHidden) return;
      const titleCell = row.querySelectorAll("td[data-filter-value]")[1];
      if (!titleCell || titleCell.querySelector(".demand-protected-badge")) return;
      const badge = document.createElement("span");
      badge.className = "demand-protected-badge";
      badge.textContent = "Stale, High Demand";
      badge.title = "Stale content that still meets demand-protection thresholds.";
      titleCell.appendChild(document.createTextNode(" "));
      titleCell.appendChild(badge);
    }
    function addDemandProtectedDetail(row) {
      if (authorFacingGovernanceTagsHidden) return;
      const detailBody = detailRowFor(row)?.querySelector(".detail-table tbody");
      if (!detailBody || detailBody.querySelector("[data-demand-protected-detail]")) return;
      const detail = document.createElement("tr");
      detail.dataset.demandProtectedDetail = "true";
      detail.innerHTML = `<th>Demand Protection</th><td>${escapeHtml(rowDemandProtectionDetailText(row))}</td>`;
      detailBody.prepend(detail);
    }
    function clearDemandProtectedMarkers(row) {
      row.classList.remove("demand-protected-row");
      delete row.dataset.demandProtected;
      row.querySelectorAll(".demand-protected-badge").forEach((badge) => {
        const previous = badge.previousSibling;
        badge.remove();
        if (previous && previous.nodeType === 3 && !previous.textContent.trim()) previous.remove();
      });
      detailRowFor(row)?.querySelectorAll("[data-demand-protected-detail]").forEach((detail) => detail.remove());
    }
    function addDemandProtectedFilter(tableId) {
      if (authorFacingGovernanceTagsHidden) return;
      const firstFilter = document.querySelector(`[data-table-filter="${tableId}"]`);
      const grid = firstFilter?.closest(".filter-grid");
      if (!grid || grid.querySelector(`[data-filter-mode="demand-protected"][data-table-filter="${tableId}"]`)) return;
      const field = document.createElement("label");
      field.className = "filter-field demand-protected-filter-field";
      field.setAttribute("for", `${tableId}-filter-demand-protected`);
      field.innerHTML = `<span>Demand Protected</span><span class="demand-protected-toggle"><input id="${tableId}-filter-demand-protected" type="checkbox" value="demand-protected" data-table-filter="${tableId}" data-filter-mode="demand-protected">Only stale rows with high demand</span>`;
      const input = field.querySelector("input");
      input?.addEventListener("change", () => applyTableState(tableId, { resetPage: true }));
      grid.prepend(field);
    }
    function applyDemandProtectedGovernanceFlags() {
      if (authorFacingGovernanceTagsHidden) return;
      demandProtectedReviewTableIds.forEach((tableId) => {
        addDemandProtectedFilter(tableId);
        document.querySelectorAll(`#${tableId} tbody tr[data-filter-row="true"][data-detail-row-id]`).forEach((row) => {
          clearDemandProtectedMarkers(row);
          const status = rowDemandProtectionStatus(row);
          if (!status.protected) return;
          row.dataset.demandProtected = "true";
          row.classList.add("demand-protected-row");
          addDemandProtectedBadge(row);
          addDemandProtectedDetail(row);
        });
      });
    }
    function applyQaExceptionPrototype() {
      if (authorFacingGovernanceTagsHidden) return;
      document.querySelectorAll("tr[data-filter-row='true'][data-detail-row-id]").forEach((row) => {
        removeQaExceptionMarkers(row);
        const matchedRule = qaExceptionRuleFor(row);
        if (!dashboardAdminState.qaExceptionExclusionEnabled || !matchedRule || isDisabledContentRow(row)) return;
        row.classList.add("qa-exception-row");
        row.dataset.qaException = "true";
        row.dataset.qaExceptionRuleId = matchedRule.id;
        addQaExceptionDetail(row, matchedRule);
        addQaExceptionBadge(row, "QA Excluded");
        if (qaExceptionAppliesToAnalytics(row)) {
          row.dataset.qaAnalyticsExcluded = "true";
        }
      });
    }
    function activeRowOverrides() {
      return dashboardAdminState.rowOverrides.filter((override) => {
        return override?.enabled !== false && override?.value && override?.status !== "archived";
      });
    }
    function adminTargetMatchesRecord(record, override) {
      const needle = normalizeFilterText(override?.value || "");
      if (!needle || !record) return false;
      if (override.target === "livelabs_id") return normalizeFilterText(record.livelabsId || "") === needle;
      if (override.target === "title") return normalizeFilterText(record.title || "").includes(needle);
      return normalizeFilterText(record.wmsId || "") === needle;
    }
    function adminOverrideForRecord(record) {
      return activeRowOverrides().find((override) => adminTargetMatchesRecord(record, override)) || null;
    }
    function adminSortValueFor(value) {
      const text = String(value || "").trim();
      const number = adminNumberOrNull(text);
      const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) return dateMatch[0];
      return number === null ? text : String(number);
    }
    function updateAdminCell(row, labels, value) {
      const text = String(value || "").trim();
      if (!text) return;
      const normalizedLabels = labels.map((label) => normalizeFilterText(label));
      const headers = headerLabelsFor(row);
      const cells = Array.from(row.querySelectorAll("td[data-filter-value]"));
      const index = headers.findIndex((label) => normalizedLabels.some((target) => normalizeFilterText(label).includes(target)));
      const cell = index >= 0 ? cells[index] : null;
      if (!cell) return;
      cell.textContent = text;
      cell.dataset.filterValue = normalizeFilterText(text);
      cell.dataset.sortValue = adminSortValueFor(text);
    }
    function updateAdminDetail(row, labels, value) {
      const text = String(value || "").trim();
      if (!text) return;
      const detailBody = detailRowFor(row)?.querySelector(".detail-table tbody");
      if (!detailBody) return;
      const normalizedLabels = labels.map((label) => normalizeFilterText(label));
      const existingRow = Array.from(detailBody.querySelectorAll("tr")).find((detailLine) => {
        const key = detailLine.querySelector("th")?.textContent || "";
        return normalizedLabels.some((label) => normalizeFilterText(key).includes(label));
      });
      if (existingRow) {
        existingRow.querySelector("td").textContent = text;
        return;
      }
      const detail = document.createElement("tr");
      detail.innerHTML = `<th>${escapeHtml(labels[0])}</th><td>${escapeHtml(text)}</td>`;
      detailBody.prepend(detail);
    }
    function applyAdminFieldEdits(row, override) {
      const edits = sanitizeFieldEdits(override?.fieldEdits);
      Object.entries(edits).forEach(([key, value]) => {
        const mapping = adminFieldMappings[key];
        if (!mapping) return;
        updateAdminCell(row, mapping.headers || [], value);
        updateAdminDetail(row, mapping.details || mapping.headers || [], value);
      });
      if (edits.title) {
        const detailTitle = detailRowFor(row)?.querySelector(".detail-title");
        if (detailTitle) detailTitle.textContent = `Details for ${edits.title}.`;
      }
    }
    function removeAdminTagBadges(row) {
      const titleCell = row.querySelectorAll("td[data-filter-value]")[1];
      if (titleCell?.dataset.adminTagBaseFilterValue !== undefined) {
        titleCell.dataset.filterValue = titleCell.dataset.adminTagBaseFilterValue;
        delete titleCell.dataset.adminTagBaseFilterValue;
      }
      row.querySelectorAll(".admin-tag-badges").forEach((badgeGroup) => {
        const previous = badgeGroup.previousSibling;
        badgeGroup.remove();
        if (previous && previous.nodeType === 3 && !previous.textContent.trim()) previous.remove();
      });
    }
    function addAdminTagBadges(row, tags = []) {
      const cleaned = sanitizeAssignedTags(tags, tagDefinitionsForState(dashboardAdminState));
      if (!cleaned.length) return;
      const titleCell = row.querySelectorAll("td[data-filter-value]")[1];
      if (!titleCell || titleCell.querySelector(".admin-tag-badges")) return;
      const labels = cleaned.map((tagKey) => tagDefinitionFor(tagKey).label);
      const baseFilterValue = titleCell.dataset.filterValue || "";
      titleCell.dataset.adminTagBaseFilterValue = baseFilterValue;
      titleCell.dataset.filterValue = `${baseFilterValue} ${normalizeFilterText(labels.join(" "))}`.trim();
      const wrapper = document.createElement("span");
      wrapper.className = "admin-tag-badges";
      wrapper.innerHTML = tagPillsHtml(cleaned);
      titleCell.appendChild(document.createTextNode(" "));
      titleCell.appendChild(wrapper);
    }
    function applyAdminRowOverrides() {
      document.querySelectorAll("tr[data-filter-row='true'][data-detail-row-id]").forEach((row) => {
        delete row.dataset.adminOverride;
        delete row.dataset.adminStatus;
        delete row.dataset.adminQaExcluded;
        removeAdminTagBadges(row);
        row.querySelectorAll(".admin-override-badge").forEach((badge) => {
          const previous = badge.previousSibling;
          badge.remove();
          if (previous && previous.nodeType === 3 && !previous.textContent.trim()) previous.remove();
        });
        detailRowFor(row)?.querySelectorAll("[data-admin-override-detail]").forEach((detail) => detail.remove());
        detailRowFor(row)?.querySelectorAll("[data-admin-tags-detail]").forEach((detail) => detail.remove());
        const override = activeRowOverrides().find((item) => adminTargetMatches(row, item.target || "wms_id", item.value));
        if (!override) return;
        applyAdminFieldEdits(row, override);
        row.dataset.adminOverride = "true";
        row.dataset.adminStatus = override.status || "pending";
        const tags = sanitizeAssignedTags(override.tags, tagDefinitionsForState(dashboardAdminState));
        addAdminTagBadges(row, tags);
        const detailBody = detailRowFor(row)?.querySelector(".detail-table tbody");
        if (!detailBody) return;
        const detail = document.createElement("tr");
        detail.dataset.adminOverrideDetail = "true";
        const status = override.status || "pending";
        const note = override.note || "No note provided.";
        detail.innerHTML = `<th>Admin Override</th><td>${escapeHtml(`${formatOverrideStatus(status)}. ${note}`)}</td>`;
        detailBody.prepend(detail);
        if (tags.length) {
          const tagDetail = document.createElement("tr");
          tagDetail.dataset.adminTagsDetail = "true";
          tagDetail.innerHTML = `<th>Tags</th><td>${tagPillsHtml(tags)}</td>`;
          detailBody.prepend(tagDetail);
        }
      });
    }
    function formatOverrideStatus(value) {
      return String(value || "pending")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (match) => match.toUpperCase())
        .replace(/\bQa\b/g, "QA");
    }
    function applySectionVisibilitySettings() {
      const mappings = [
        ["top-performers", "topPerformers"],
        ["at-risk-content", "atRiskContent"],
        ["retire-now-content", "retireNowContent"],
        ["replacement-suggestions", "replacementSuggestions"],
        ["disabled-content", "disabledContent"],
        ["portfolio-stats", "portfolioStats"]
      ];
      mappings.forEach(([sectionId, settingKey]) => {
        const visible = dashboardAdminState.sectionVisibility?.[settingKey] !== false;
        const section = document.getElementById(sectionId);
        if (section) section.hidden = !visible;
        document.querySelectorAll(`a[href="#${sectionId}"]`).forEach((link) => {
          link.hidden = !visible;
          link.setAttribute("aria-hidden", visible ? "false" : "true");
        });
      });
      document.body.dataset.dashboardMode = dashboardAdminState.contentMode || "analyst";
    }
    function reloadDashboardAdminState() {
      dashboardAdminState = readDashboardAdminState();
      tableSearchRecordsCache = null;
      allDataFilterOptionsRecordCount = 0;
      applyQaExceptionPrototype();
      applyAdminRowOverrides();
      applyNoAuthorGovernanceFlags();
      applyDemandProtectedGovernanceFlags();
      decorateDashboardCopyTargets();
      applySectionVisibilitySettings();
      refreshInitializedTableStates({ resetPage: true });
      if (loadedFullSearchRecords.length) renderAllDataTable();
      refreshDashboardSearch();
    }
    function buildTableSearchIndex() {
      const records = new Map();
      document.querySelectorAll("tr[data-filter-row='true'][data-detail-row-id]").forEach((row) => {
        if (row.dataset.qaAnalyticsExcluded === "true") return;
        if (row.closest("section.section")?.hidden) return;
        const values = rowValuesByHeader(row);
        const details = detailValuesFor(row);
        const fileUpdates = markdownUpdatesFor(row);
        const title = pickValue(values, ["Title"]) || details.get("Title") || "";
        if (!title) return;
        const wmsId = pickValue(values, ["WMS ID"]) || details.get("WMS ID") || "";
        const livelabsId = pickValue(values, ["LiveLabs ID"]) || details.get("LiveLabs ID") || "";
        const category = pickValue(values, ["Category"]) || details.get("Category") || "";
        const owner = pickValue(values, ["Author Email", "Owner Group"]) || details.get("Owner Email") || details.get("Owner Group") || details.get("Manager Email") || "";
        const update = pickValue(values, ["Last Meaningful Update", "Disabled Since"]) || details.get("Latest Workshop Commit Date") || details.get("Publish Date Used") || "";
        const type = details.get("Content Type") || "";
        const status = details.get("Workshop Status") || details.get("Lifecycle State") || "";
        const source = sectionLabelFor(row);
        const baseRecord = { category, details, family: null, fileUpdates, livelabsId, owner, row, source, status, title, type, update, values, wmsId };
        const key = searchRecordKeyFor(baseRecord);
        if (records.has(key)) return;
        const searchable = normalizeFilterText([
          title,
          wmsId,
          livelabsId,
          category,
          owner,
          update,
          type,
          status,
          source,
          Array.from(details.values()).join(" "),
          fileUpdates.map((item) => [item.fileName, item.filePath, item.gitUpdate, item.acknowledgement, item.checkLabel, item.checkNote].filter(Boolean).join(" ")).join(" ")
        ].join(" "));
        records.set(key, { ...baseRecord, recordKey: key, searchable });
      });
      return Array.from(records.values());
    }
    function cachedTableSearchRecords() {
      if (!tableSearchRecordsCache) tableSearchRecordsCache = buildTableSearchIndex();
      return tableSearchRecordsCache;
    }
    function buildSearchIndex(fullRecords = [], options = {}) {
      const includeTableRecords = options.includeTableRecords ?? fullRecords.length === 0;
      return mergeSearchRecords(fullRecords, includeTableRecords ? cachedTableSearchRecords() : []);
    }
    function recordAdminTagText(record) {
      return adminTagsForRecord(record).map((tagKey) => tagDefinitionFor(tagKey).label).join(" ");
    }
    function recordSearchableText(record) {
      return normalizeFilterText([record.searchable, recordAdminTagText(record)].filter(Boolean).join(" "));
    }
    function recordMatchesSearch(record, normalizedQuery) {
      const tokens = normalizedQuery.split(" ").filter(Boolean);
      const searchable = recordSearchableText(record);
      return tokens.length > 0 && tokens.every((token) => searchable.includes(token));
    }
    function scoreSearchRecord(record, normalizedQuery) {
      const tokens = normalizedQuery.split(" ").filter(Boolean);
      const title = normalizeFilterText(record.title);
      const wmsId = normalizeFilterText(record.wmsId);
      const livelabsId = normalizeFilterText(record.livelabsId);
      const tagText = normalizeFilterText(recordAdminTagText(record));
      let score = 0;
      if (livelabsId && livelabsId === normalizedQuery) score += 1000;
      if (wmsId && wmsId === normalizedQuery) score += 900;
      if (title === normalizedQuery) score += 500;
      if (title.includes(normalizedQuery)) score += 250;
      if (tagText && tagText.includes(normalizedQuery)) score += 150;
      tokens.forEach((token) => {
        if (title.includes(token)) score += 35;
        if (livelabsId === token || wmsId === token) score += 120;
        if (tagText.includes(token)) score += 20;
      });
      if (normalizeFilterText(record.source).includes("dashboard")) score += 5;
      return score;
    }
    function ensureSearchView() {
      let view = document.querySelector("#search-workshop-view");
      if (view) return view;
      view = document.createElement("section");
      view.id = "search-workshop-view";
      view.className = "search-view";
      view.hidden = true;
      document.querySelector("main")?.prepend(view);
      return view;
    }
    function fieldRowsHtml(record) {
      const preferredFields = [
        "Content Type",
        "Workshop Status",
        "Workshop Level",
        "Publish Status",
        "Publish Type",
        "Update Evidence",
        "Update Confidence",
        "Update Scope",
        "Latest GitHub Update",
        "Last Meaningful Workshop Update",
        "Latest Repository Update Proxy",
        "Latest Workshop Commit Date",
        "Latest Workshop Markdown Commit Date",
        "Latest Markdown Commit Date",
        "Latest Live Repo Commit Date",
        "First Workshop Commit Date",
        "First Workshop File Commit Date",
        "Acknowledgement Date",
        "Acknowledgement Author",
        "Acknowledgement Updater",
        "Acknowledgement Contributors",
        "Latest Acknowledgement Date",
        "Acknowledgement Source File",
        "Acknowledgement vs Git",
        "Acknowledgement vs WMS",
        "Acknowledgement Date vs Latest Git Update",
        "Acknowledgement Vs WMS",
        "Markdown Files In Manifest",
        "Markdown Files Inside Workshop",
        "Publish Date Used",
        "Lifecycle State",
        "Suggested Action",
        "Replacement Title",
        "Replacement Score",
        "Why This Rule Matched",
        "Why It Is Included Or Excluded",
        "Sprint Signal Reason",
        "Repo Slug",
        "Workshop Path",
        "Manifest Path",
        "Owner Group",
        "Manager Email",
        "Author Coverage"
      ];
      const rows = preferredFields
        .filter((field) => record.details.has(field))
        .map((field) => `<tr><th>${escapeHtml(field)}</th><td>${escapeHtml(displayDetailValue(field, record.details.get(field)))}</td></tr>`);
      return rows.length ? rows.join("") : `<tr><td colspan="2">No detail fields available.</td></tr>`;
    }
    function fileUpdatesHtml(record) {
      if (!record.fileUpdates?.length) return "";
      const rows = record.fileUpdates.map((item) => {
        const syncClass = item.syncClass || syncClassFor(item.checkLabel);
        const pillClass = syncClass ? `sync-pill-${syncClass.replace("sync-", "")}` : "";
        return `<tr class="sync-row ${escapeHtml(syncClass)}">
          <td><strong>${escapeHtml(item.fileName || "N/A")}</strong>${item.filePath ? `<div class="subtle">${escapeHtml(item.filePath)}</div>` : ""}</td>
          <td>${escapeHtml(item.gitUpdate || "N/A")}</td>
          <td>${escapeHtml(item.acknowledgement || "N/A")}</td>
          <td><span class="sync-pill ${escapeHtml(pillClass)}">${escapeHtml(item.checkLabel || "N/A")}</span>${item.checkNote ? `<div class="subtle">${escapeHtml(item.checkNote)}</div>` : ""}</td>
        </tr>`;
      }).join("");
      return `
        <section class="search-detail-panel search-detail-panel-wide">
          <div class="panel-head">
            <h3>Files Updated On GitHub</h3>
            <span>${record.fileUpdates.length} files</span>
          </div>
          <p class="note">Pulled from the existing markdown file date check for this dashboard row.</p>
          <div class="search-files-table-wrap">
            <table class="search-files-table">
              <thead>
                <tr>
                  <th>Markdown File</th>
                  <th>Last Git Update</th>
                  <th>Acknowledgement Date</th>
                  <th>Date Check</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>`;
    }
    function familyHtml(record) {
      const family = record.family;
      if (!family || Number(family.total || 0) <= 1) return "";
      const siblings = Array.isArray(family.siblings) ? family.siblings : [];
      const rows = siblings.map((item) => {
        const related = searchRecordByKey.get(item.key);
        const title = item.title || related?.title || "Untitled";
        const livelabsId = item.livelabsId || related?.livelabsId || "";
        const wmsId = item.wmsId || related?.wmsId || family.wmsId || "";
        const status = [item.publishStatus, item.publishType].filter(Boolean).join(" / ") || related?.status || "";
        const category = item.category || related?.category || "";
        const titleHtml = related
          ? `<button class="nav-link" type="button" data-family-search-key="${escapeHtml(item.key)}">${escapeHtml(title)}</button>`
          : escapeHtml(title);
        return `<tr><td>${titleHtml}</td><td>${escapeHtml(livelabsId)}</td><td>${escapeHtml(wmsId)}</td><td>${escapeHtml(status)}</td><td>${escapeHtml(category)}</td></tr>`;
      }).join("");
      return `
        <section class="search-detail-panel search-detail-panel-wide">
          <div class="panel-head">
            <h3>Same WMS Family</h3>
            <span>${escapeHtml(family.total)} rows</span>
          </div>
          <p class="note">These rows share WMS ID ${escapeHtml(family.wmsId || record.wmsId || "")}. Each LiveLabs ID remains a separate searchable result and detail page.</p>
          <div class="search-files-table-wrap">
            <table class="search-files-table">
              <thead><tr><th>Related Content</th><th>LiveLabs ID</th><th>WMS ID</th><th>Status</th><th>Category</th></tr></thead>
              <tbody>${rows || `<tr><td colspan="5">No sibling rows available.</td></tr>`}</tbody>
            </table>
          </div>
        </section>`;
    }
    function adminTagsPanelHtml(record) {
      const tags = adminTagsForRecord(record);
      if (!tags.length) return "";
      return `
        <section class="search-detail-panel">
          <h3>Tags</h3>
          ${tagPillsHtml(tags)}
        </section>`;
    }
    function readSearchUrlState() {
      const params = new URLSearchParams(location.search);
      return {
        query: params.get("q") || "",
        livelabsId: params.get("livelabs_id") || "",
        wmsId: params.get("wms_id") || "",
        contentKey: params.get("content_key") || ""
      };
    }
    function writeSearchUrl({ query = "", record = null, identity = null, replace = true, route = "current", clearHash = null } = {}) {
      const url = new URL(location.href);
      const selectedIdentity = record ? canonicalRecordIdentity(record) : normalizeSearchIdentity(identity || {});
      if (route === "dashboard") {
        const normalizedPath = url.pathname.replace(/\/+$/, "").toLowerCase();
        if (normalizedPath.endsWith("/inventory") || normalizedPath.endsWith("/inventory/index.html")) {
          url.pathname = new URL("../", url).pathname;
        }
      }
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      ["livelabs_id", "wms_id", "content_key"].forEach((parameter) => url.searchParams.delete(parameter));
      if (selectedIdentity.livelabsId) url.searchParams.set("livelabs_id", selectedIdentity.livelabsId);
      if (selectedIdentity.wmsId) url.searchParams.set("wms_id", selectedIdentity.wmsId);
      if (selectedIdentity.contentKey) url.searchParams.set("content_key", selectedIdentity.contentKey);
      const shouldClearHash = clearHash ?? Boolean(query || hasSearchIdentity(selectedIdentity));
      if (shouldClearHash) url.hash = "";
      const method = replace ? "replaceState" : "pushState";
      history[method](null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    function canonicalSearchLink() {
      const url = new URL(location.href);
      url.hash = "";
      return `${url.origin}${url.pathname}${url.search}`;
    }
    async function copySearchLink(button) {
      const link = canonicalSearchLink();
      try {
        await navigator.clipboard.writeText(link);
        button.textContent = "Link copied";
      } catch {
        button.textContent = link;
      }
      window.setTimeout(() => { button.textContent = "Copy link"; }, 1800);
    }
    function renderSearchDetail(record, { updateUrl = true } = {}) {
      if (updateUrl) {
        const searchInput = document.querySelector("#global-workshop-search");
        const currentQuery = searchInput?.value || new URL(location.href).searchParams.get("q") || "";
        writeSearchUrl({ query: currentQuery, record, replace: false, route: "dashboard" });
        document.body.classList.remove("dashboard-inventory-active", "dashboard-tops-active");
      }
      const view = ensureSearchView();
      const summaryItems = summaryItemsFor(record);
      const governanceItems = governanceItemsFor(record);
      const subtitle = [record.source || "Dashboard", record.status || "", record.owner ? `Owner: ${record.owner}` : ""].filter(Boolean).join(" | ");
      view.innerHTML = `
        <div class="search-view-header">
          <div>
            <span class="search-kicker">${escapeHtml(record.type || "Portfolio result")}</span>
            <h2>${escapeHtml(record.title)}</h2>
            ${subtitle ? `<p class="search-view-subtitle">${escapeHtml(subtitle)}</p>` : ""}
          </div>
          <span class="search-view-actions"><button class="nav-link" type="button" data-copy-search-link>Copy link</button><button class="nav-link" type="button" data-back-dashboard>Back to Dashboard</button></span>
        </div>
        <dl class="search-result-summary">
          ${summaryItems.map(([label, value]) => `<div class="search-result-card"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
        <div class="search-detail-grid">
          <section class="search-detail-panel">
            <h3>Governance Summary</h3>
            <dl class="search-meta-list">
              ${governanceItems.map(([label, value]) => {
                const wide = ["Latest GitHub Update", "Workshop Path"].includes(label) || String(value).length > 48;
                return `<div${wide ? ` class="wide"` : ""}><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
              }).join("")}
            </dl>
          </section>
          <section class="search-detail-panel">
            <h3>Dashboard Row</h3>
            <table class="search-detail-table"><tbody>${sourceRowsHtml(record)}</tbody></table>
          </section>
          ${familyHtml(record)}
          ${fileUpdatesHtml(record)}
          <section class="search-detail-panel search-detail-panel-wide">
            <h3>Additional Details</h3>
            <table class="search-detail-table"><tbody>${fieldRowsHtml(record)}</tbody></table>
          </section>
        </div>`;
      view.querySelectorAll("[data-back-dashboard]").forEach((button) => {
        button.addEventListener("click", () => showDashboardView({ clearUrl: true }));
      });
      view.querySelectorAll("[data-copy-search-link]").forEach((button) => {
        button.addEventListener("click", () => copySearchLink(button));
      });
      view.querySelectorAll("[data-family-search-key]").forEach((button) => {
        button.addEventListener("click", () => {
          const related = searchRecordByKey.get(button.dataset.familySearchKey);
          if (related) renderSearchDetail(related);
        });
      });
      view.hidden = false;
      document.body.classList.add("dashboard-search-active");
      decorateDetailCopyTargets(view);
      document.querySelectorAll("[data-back-dashboard]").forEach((button) => {
        button.hidden = false;
      });
      document.querySelectorAll(".nav-list a").forEach((item) => item.removeAttribute("aria-current"));
      view.scrollIntoView({ block: "start" });
    }
    function showDashboardView({ clearUrl = true } = {}) {
      const view = document.querySelector("#search-workshop-view");
      if (view) view.hidden = true;
      document.body.classList.remove("dashboard-search-active");
      document.querySelectorAll("[data-back-dashboard]").forEach((button) => {
        button.hidden = true;
      });
      if (clearUrl) writeSearchUrl();
    }
    function renderSearchResults(records, query) {
      const resultsNode = document.querySelector("[data-search-results]");
      const statusNode = document.querySelector("[data-search-status]");
      if (!resultsNode || !statusNode) return;
      resultsNode.innerHTML = "";
      const normalizedQuery = normalizeFilterText(query);
      if (normalizedQuery.length < 2) {
        statusNode.textContent = "";
        statusNode.hidden = true;
        return;
      }
      const allMatches = records
        .filter((record) => recordMatchesSearch(record, normalizedQuery))
        .sort((left, right) => scoreSearchRecord(right, normalizedQuery) - scoreSearchRecord(left, normalizedQuery));
      const matches = allMatches.slice(0, 50);
      statusNode.hidden = false;
      statusNode.textContent = allMatches.length
        ? allMatches.length > matches.length
          ? `${allMatches.length} matches; showing first ${matches.length}`
          : `${allMatches.length} matches`
        : "No matches";
      matches.forEach((record) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "search-result-button";
        const familyNote = record.family?.total > 1 ? `Family ${record.family.total}` : "";
        const tagNote = recordAdminTagText(record);
        button.innerHTML = `<strong>${escapeHtml(record.title)}</strong><span>${escapeHtml([record.category, record.wmsId ? `WMS ${record.wmsId}` : "", record.livelabsId ? `LiveLabs ${record.livelabsId}` : "", record.owner || "", tagNote ? `Tags: ${tagNote}` : "", familyNote].filter(Boolean).join(" | "))}</span>`;
        button.addEventListener("click", () => renderSearchDetail(record));
        resultsNode.appendChild(button);
      });
    }
    function applyRankedTableDisclosures() {
      document.querySelectorAll("section.panel.ranked-table-panel").forEach((panel) => {
        const panelHead = Array.from(panel.children).find((child) => child.classList?.contains("panel-head"));
        if (!panelHead) return;
        const disclosure = document.createElement("details");
        disclosure.className = "panel toggle-panel ranked-table-panel ranked-table-disclosure";
        disclosure.dataset.generatedDisclosure = "true";
        const summary = document.createElement("summary");
        summary.className = "panel-head";
        while (panelHead.firstChild) summary.appendChild(panelHead.firstChild);
        panelHead.remove();
        disclosure.appendChild(summary);
        while (panel.firstChild) disclosure.appendChild(panel.firstChild);
        panel.replaceWith(disclosure);
      });
    }
    function ensureAllDataDashboardUi() {
      const navListForInventory = document.querySelector(".nav-list");
      if (navListForInventory && !navListForInventory.querySelector("[data-inventory-link]")) {
        const inventoryItem = document.createElement("a");
        inventoryItem.href = "./inventory/";
        inventoryItem.dataset.inventoryLink = "true";
        inventoryItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"></path><path d="M5 9h14"></path><path d="M5 14h14"></path><path d="M10 4v16"></path></svg><span>Portfolio Inventory</span>`;
        const topPerformers = navListForInventory.querySelector('a[href="#top-performers"]');
        navListForInventory.insertBefore(inventoryItem, topPerformers || navListForInventory.firstChild);
      }
      const navList = document.querySelector(".nav-list");
      if (navList) {
        navList.querySelectorAll('[data-dashboard-view="tops"]').forEach((item) => item.remove());
        const overviewLink = navList.querySelector('a[href="#overview"]');
        if (overviewLink) {
          overviewLink.dataset.dashboardView = "overview";
          const label = overviewLink.querySelector("span");
          if (label) label.textContent = "Dashboard Overview";
        }
        if (!navList.querySelector('[data-inventory-link]')) {
          const inventoryItem = document.createElement("a");
          inventoryItem.href = "./inventory/";
          inventoryItem.dataset.inventoryLink = "true";
          inventoryItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"></path><path d="M5 9h14"></path><path d="M5 14h14"></path><path d="M10 4v16"></path></svg><span>Portfolio Inventory</span>`;
          const topPerformers = navList.querySelector('a[href="#top-performers"]');
          navList.insertBefore(inventoryItem, topPerformers || navList.firstChild);
        }
      }
      const tocLinks = document.querySelector("#dashboard-toc .toc-links");
      if (tocLinks) {
        tocLinks.querySelectorAll('[data-dashboard-view="inventory"], a[href="#all-data-browser"]').forEach((item) => item.remove());
      }
      if (!document.getElementById("all-data-browser")) {
        const section = document.createElement("section");
        section.className = "section all-data-section";
        section.id = "all-data-browser";
        section.innerHTML = `
          <header class="page-header inventory-page-header">
            <div>
              <div class="hero-logo" aria-label="LiveLabs"><img src="./assets/images/livelabs-logo-white.svg" alt="LiveLabs"></div>
              <h1>Portfolio Inventory</h1>
              <p class="intro">Search and review the complete LiveLabs portfolio with identifiers, publishing state, ownership, contact coverage, and record-level details in one consistent workspace.</p>
            </div>
          </header>
          <div class="hero-stripe" aria-hidden="true"></div>
          <section class="metric-band" aria-label="Inventory capabilities">
            <strong>Explore the complete LiveLabs portfolio</strong>
            <span>Search</span>
            <span>Filter</span>
            <span>Review</span>
          </section>
          <div class="inventory-content">
            <div class="section-head">
              <div class="section-head-top">
                <h2>Inventory Records</h2>
              </div>
              <p>Complete portfolio inventory with status, identifiers, ownership, and review signals.</p>
            </div>
            <section class="panel data-view-control-panel">
              <div class="panel-head">
                <h3>Filters and Results</h3>
                <span class="inventory-total-pill" data-all-data-total>Loading inventory</span>
              </div>
              <div class="data-view-toolbar">
                <span class="table-hint" data-inventory-source>Inventory data loads when this view opens</span>
              </div>
              <div class="inventory-summary-grid" data-inventory-summary></div>
              <div class="inventory-data-warning" data-inventory-warning hidden></div>
              <div id="all-data-panel" class="all-data-panel" aria-hidden="false">
                <div class="all-data-filter-grid">
                  <label class="filter-field wide-filter" for="all-data-search"><span>Search</span><input id="all-data-search" type="search" autocomplete="off" placeholder="Title, WMS ID, LiveLabs ID, author, keyword"></label>
                  <label class="filter-field" for="all-data-type"><span>Type</span><select id="all-data-type" data-all-data-select="type"><option value="">All types</option></select></label>
                  <label class="filter-field" for="all-data-publish-status"><span>Publish Status</span><select id="all-data-publish-status" data-all-data-select="publishStatus"><option value="">All statuses</option></select></label>
                  <label class="filter-field" for="all-data-publish-type"><span>Publish Type</span><select id="all-data-publish-type" data-all-data-select="publishType"><option value="">All publish types</option></select></label>
                  <label class="filter-field" for="all-data-review-state"><span>Review state</span><select id="all-data-review-state"><option value="">All review states</option><option value="Content to review/remove">Content to review/remove</option><option value="Ready">Ready</option></select></label>
                  <label class="filter-field" for="all-data-coverage"><span>Contact Coverage</span><select id="all-data-coverage"><option value="">All coverage</option><option value="author">Author</option><option value="fallback">Fallback contact</option><option value="author-missing">Author missing</option><option value="contact-gap">No author/fallback contact</option><option value="owner">Owner/stakeholder only</option><option value="missing">No contact evidence</option></select></label>
                </div>
                ${allDataControlsHtml("top")}
                <div class="table-wrap">
                  <table id="all-content-data-table" class="all-data-table">
                    <thead><tr><th class="all-data-row-number">#</th><th>Title</th><th>Type</th><th>Publish Status</th><th>Publish Type</th><th>WMS ID</th><th>LiveLabs ID</th><th>Category</th><th>Contact</th></tr></thead>
                    <tbody data-all-data-rows><tr><td colspan="9" class="empty">Open Portfolio Inventory to load records</td></tr></tbody>
                  </table>
                </div>
                ${allDataControlsHtml("bottom")}
              </div>
            </section>
          </div>`;
        const tocSection = document.getElementById("dashboard-toc");
        tocSection?.after(section);
      }
      const query = document.getElementById("all-data-search");
      if (query) query.addEventListener("input", () => {
        allDataState.wmsId = "";
        allDataState.query = query.value;
        writeSearchUrl({ query: query.value });
        allDataState.page = 1;
        allDataState.pageRange = "";
        scheduleAllDataRender();
      });
      [["all-data-type", "type"], ["all-data-publish-status", "publishStatus"], ["all-data-publish-type", "publishType"], ["all-data-review-state", "reviewState"], ["all-data-coverage", "coverage"]].forEach(([id, key]) => {
        const control = document.getElementById(id);
        if (!control) return;
        control.addEventListener("change", () => {
          allDataState[key] = control.value;
          allDataState.page = 1;
          allDataState.pageRange = "";
          renderAllDataTable();
        });
      });
      document.querySelectorAll("[data-all-data-page-size]").forEach((pageSize) => {
        pageSize.addEventListener("change", () => {
        allDataState.pageSize = pageSize.value === "all" ? "all" : (Number(pageSize.value) || 100);
        allDataState.page = 1;
        allDataState.pageRange = "";
        renderAllDataTable();
        });
      });
      document.querySelectorAll("[data-all-data-range]").forEach((range) => {
        range.addEventListener("change", () => {
          allDataState.pageRange = range.value;
          allDataState.page = 1;
          renderAllDataTable();
        });
      });
      document.querySelectorAll("[data-all-data-sort]").forEach((sort) => {
        sort.addEventListener("change", () => {
          allDataState.sortKey = sort.value;
          allDataState.sortDirection = sort.value ? allDataState.sortDirection || "asc" : "asc";
          allDataState.page = 1;
          allDataState.pageRange = "";
          renderAllDataTable();
        });
      });
      document.querySelectorAll("[data-all-data-sort-direction]").forEach((button) => {
        button.addEventListener("click", () => {
          if (!allDataState.sortKey) return;
          allDataState.sortDirection = allDataState.sortDirection === "desc" ? "asc" : "desc";
          allDataState.page = 1;
          allDataState.pageRange = "";
          renderAllDataTable();
        });
      });
      document.querySelectorAll("[data-all-data-page]").forEach((button) => {
        button.addEventListener("click", () => {
          const totalPages = Number(button.closest(".all-data-panel")?.dataset.totalPages || "1") || 1;
          if (button.dataset.allDataPage === "prev") allDataState.page = Math.max(1, allDataState.page - 1);
          if (button.dataset.allDataPage === "next") allDataState.page = Math.min(totalPages, allDataState.page + 1);
          allDataState.pageRange = "";
          renderAllDataTable();
        });
      });
      document.querySelectorAll("[data-all-data-clear]").forEach((button) => button.addEventListener("click", () => {
        resetAllDataFilters();
        renderAllDataTable();
      }));
      document.querySelectorAll("[data-all-data-focus-filters]").forEach((button) => button.addEventListener("click", focusAllDataFilters));
      const rowsNode = document.querySelector("[data-all-data-rows]");
      if (rowsNode && rowsNode.dataset.allDataRowsBound !== "true") {
        rowsNode.dataset.allDataRowsBound = "true";
        rowsNode.addEventListener("click", (event) => {
          if (event.target.closest("button[data-copy-value]")) return;
          const row = event.target.closest("[data-all-data-key]");
          if (row) openAllDataRecordDetail(row);
        });
        rowsNode.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          if (event.target.closest("button[data-copy-value]")) return;
          const row = event.target.closest("[data-all-data-key]");
          if (!row) return;
          event.preventDefault();
          openAllDataRecordDetail(row);
        });
      }
    }
    function scheduleAllDataRender(delay = 120) {
      if (allDataRenderTimer) window.clearTimeout(allDataRenderTimer);
      allDataRenderTimer = window.setTimeout(() => {
        allDataRenderTimer = null;
        renderAllDataTable();
      }, delay);
    }
    function allDataValue(record, labels, fallback = "") {
      const item = labeledValue(record, labels);
      return item?.value || fallback || "";
    }
    function allDataExactValue(record, labels, fallback = "") {
      for (const label of labels) {
        if (record.values.has(label) && record.values.get(label)) return record.values.get(label);
        if (record.details.has(label) && record.details.get(label)) return record.details.get(label);
      }
      return fallback || "";
    }
    function allDataPublishStatus(record) {
      return record.inventory?.publishStatus || allDataValue(record, ["Publish Status"], "");
    }
    function allDataPublishType(record) {
      return record.inventory?.publishType || allDataValue(record, ["Publish Type"], "");
    }
    function allDataReviewState(record) {
      if (record.contentReviewState) return record.contentReviewState;
      const missing = Boolean(record.titleMissing || record.wmsIdMissing || record.livelabsIdMissing)
        || !String(record.title || "").trim()
        || !String(record.wmsId || "").trim()
        || !String(record.livelabsId || "").trim();
      return missing ? "Content to review/remove" : "Ready";
    }
    function allDataType(record) {
      return record.inventory?.type || record.type || allDataValue(record, ["Content Type"], "Portfolio result");
    }
    function allDataContactCoverage(record) {
      const inventoryCoverage = record.inventory?.contactCoverage;
      if (inventoryCoverage?.rank === "individual") {
        const authorContact = cleanContactEnumeration(record.owner || allDataExactValue(record, ["Author Email", "Owner Email", "Author"]));
        return { authorMissing: false, detail: authorContact || "N/A", label: "Author", rank: "author" };
      }
      if (inventoryCoverage?.rank === "fallback") {
        const fallbackContact = cleanContactEnumeration(record.owner || allDataExactValue(record, ["Workshop Team", "Manager Email", "Acknowledgement Updater", "Owner Group"]));
        return { authorMissing: true, detail: fallbackContact || "Fallback contact present", label: "Fallback contact", rank: "fallback" };
      }
      if (inventoryCoverage?.rank === "covered") {
        const coveredContact = cleanContactEnumeration(allDataExactValue(record, ["Author Email", "Owner Email", "Author", "Workshop Team", "Manager Email", "Acknowledgement Updater"], record.owner || inventoryCoverage.tier || "Author or fallback present"));
        return { authorMissing: false, detail: coveredContact, label: "Author/fallback present", rank: "fallback" };
      }
      if (inventoryCoverage?.rank === "owner") {
        const ownerContact = cleanContactEnumeration(record.owner || allDataExactValue(record, ["Owner Email", "Owner Group", "Stakeholder", "Council", "Owner"], inventoryCoverage.tier));
        return { authorMissing: true, detail: ownerContact || "Owner/stakeholder only", label: "Owner/stakeholder only", rank: "owner" };
      }
      if (inventoryCoverage?.rank === "missing") {
        return { authorMissing: true, detail: inventoryCoverage.tier || "No contact evidence", label: "No contact evidence", rank: "missing" };
      }
      const author = allDataExactValue(record, ["Author Email", "Owner Email", "Author"]);
      const fallback = allDataExactValue(record, ["Technical Contact", "Technical Contact Email", "Support Contact", "Support Contact Email", "Manager Contact", "Manager Email", "Workshop Team", "Acknowledgement Updater"]);
      const owner = record.owner || allDataExactValue(record, ["Owner Group", "Stakeholder", "Council", "Owner"]);
      const tier = allDataValue(record, ["Contact Coverage Tier"]);
      const authorCoverage = allDataValue(record, ["Author Coverage"]);
      const noAuthor = normalizeFilterText(allDataValue(record, ["No Author"])).includes("no author");
      if (author && !noAuthor) return { authorMissing: false, detail: cleanContactEnumeration(author), label: "Author", rank: "author" };
      if (fallback && !normalizeFilterText(tier).includes("owner stakeholder")) return { authorMissing: true, detail: cleanContactEnumeration(fallback), label: "Fallback contact", rank: "fallback" };
      if (owner || normalizeFilterText(tier).includes("owner stakeholder")) return { authorMissing: true, detail: cleanContactEnumeration(owner || tier || authorCoverage), label: "Owner/stakeholder only", rank: "owner" };
      return { authorMissing: true, detail: authorCoverage || "N/A", label: "No contact evidence", rank: "missing" };
    }
    function allDataRecordMatchesCoverage(coverage, filterValue) {
      if (!filterValue) return true;
      if (filterValue === "author-missing") return coverage.authorMissing;
      if (filterValue === "contact-gap") return coverage.rank === "owner" || coverage.rank === "missing";
      return coverage.rank === filterValue;
    }
    function allDataLifecycleState(record) {
      return record.inventory?.lifecycleState || allDataValue(record, ["Lifecycle State"], "");
    }
    function allDataNumberValue(record, labels) {
      return adminNumberOrNull(allDataValue(record, labels, ""));
    }
    function allDataMonthsSinceUpdate(record) {
      const updateValue = allDataValue(record, ["Last Meaningful Update", "Latest Workshop Commit Date", "Latest Markdown Commit Date", "Latest Live Repo Commit Date"], record.update || "");
      return monthsSinceDateValue(updateValue);
    }
    function allDataIsActiveGovernedRecord(record) {
      const status = normalizeFilterText(allDataPublishStatus(record));
      const publishType = normalizeFilterText(allDataPublishType(record));
      const type = normalizeFilterText(allDataType(record));
      return status === "published" && (publishType === "public" || publishType === "private") && (type === "workshop" || type === "sprint");
    }
    function allDataRecordHasNoAuthor(record) {
      const coverage = allDataContactCoverage(record);
      const noAuthorFlag = normalizeFilterText(allDataValue(record, ["No Author"], ""));
      return coverage.rank === "owner" || coverage.rank === "missing" || noAuthorFlag.includes("no author");
    }
    function allDataRecordIsStale(record) {
      const months = allDataMonthsSinceUpdate(record);
      return months !== null && months > 12;
    }
    function allDataRecordIsHighDemand(record) {
      const lifecycle = normalizeFilterText(allDataLifecycleState(record));
      const views12m = allDataNumberValue(record, ["Views 12m", "Recent Views 12m", "Page Views 12m"]);
      const views90d = allDataNumberValue(record, ["Views 90d", "Recent Views 90d", "Page Views 90d"]);
      return lifecycle === "refresh" || (views12m !== null && views12m >= 1000) || (views90d !== null && views90d >= 100);
    }
    function allDataRecordIsStaleHighDemand(record) {
      return allDataIsActiveGovernedRecord(record) && allDataRecordIsStale(record) && allDataRecordIsHighDemand(record);
    }
    function allDataReviewGroups(record) {
      const groups = [];
      const lifecycle = normalizeFilterText(allDataLifecycleState(record));
      const active = allDataIsActiveGovernedRecord(record);
      const coverage = allDataContactCoverage(record);
      const publishStatus = normalizeFilterText(allDataPublishStatus(record));
      const publishType = normalizeFilterText(allDataPublishType(record));
      const workflowStatus = normalizeFilterText(record.status || allDataValue(record, ["Workshop Status"], ""));
      const missingData = Boolean(record.inventory?.titleMissing || record.inventory?.wmsIdMissing || record.inventory?.categoryMissing || record.inventory?.ownerMissing)
        || !String(record.title || "").trim()
        || !String(record.wmsId || "").trim()
        || !String(record.category || "").trim()
        || coverage.rank === "missing";
      if (allDataRecordHasNoAuthor(record)) {
        groups.push({ key: "no-author", label: "No Author", className: "governance-group-no-author" });
      }
      if (coverage.rank === "owner" || missingData || ["publish requested", "publish approved", "changes requested"].includes(publishStatus) || ["more info needed", "in development"].includes(workflowStatus)) {
        groups.push({ key: "manager-review", label: "Manager Review", className: "" });
      }
      if (allDataRecordIsStaleHighDemand(record)) {
        groups.push({ key: "stale-high-demand", label: "Stale, High Demand", className: "governance-group-stale-high-demand" });
      }
      if ((active && lifecycle.includes("at risk")) || publishStatus === "delete requested") {
        groups.push({ key: "retirement-review", label: "Retirement Review", className: "governance-group-retire-review" });
      } else if (active && lifecycle === "refresh" && !groups.some((group) => group.key === "stale-high-demand")) {
        groups.push({ key: "refresh", label: "Refresh", className: "governance-group-stale-high-demand" });
      } else if (active && lifecycle === "keep") {
        groups.push({ key: "keep", label: "Keep", className: "" });
      }
      if (!active && (publishType || publishStatus)) {
        groups.push({ key: "inactive", label: "Inactive/Event", className: "governance-group-inactive" });
      }
      if (missingData) {
        groups.push({ key: "missing", label: "Missing Data", className: "governance-group-missing" });
      }
      if (active && !groups.some((group) => ["stale-high-demand", "retirement-review", "refresh", "keep", "inactive", "missing"].includes(group.key))) {
        groups.push({ key: "keep", label: "Keep", className: "" });
      }
      if (!groups.length) {
        groups.push({ key: "missing", label: "Missing Data", className: "governance-group-missing" });
      }
      const seen = new Set();
      return groups.filter((group) => {
        if (seen.has(group.key)) return false;
        seen.add(group.key);
        return true;
      });
    }
    function allDataRecordMatchesReviewGroup(record, filterValue) {
      if (authorFacingGovernanceTagsHidden) return true;
      if (!filterValue) return true;
      return allDataReviewGroups(record).some((group) => group.key === filterValue);
    }
    function allDataReviewGroupHtml(record) {
      if (authorFacingGovernanceTagsHidden) return "";
      return `<span class="governance-group-list">${allDataReviewGroups(record)
        .map((group) => `<span class="governance-group-pill ${escapeHtml(group.className || "")}" data-review-group="${escapeHtml(group.key)}">${escapeHtml(group.label)}</span>`)
        .join("")}</span>`;
    }
    function allDataPageSizeValue(totalRows) {
      if ((Number(totalRows) || 0) <= 0) return String(allDataState.pageSize || 100);
      const validValues = allDataPageSizeOptionsFor(totalRows).map((pageSize) => String(pageSize));
      const currentValue = String(allDataState.pageSize || "");
      if (validValues.includes(currentValue)) return currentValue;
      const fallback = ["100", "50", "25"].find((value) => validValues.includes(value)) || validValues[0] || "all";
      allDataState.pageSize = fallback === "all" ? "all" : Number(fallback);
      return fallback;
    }
    function allDataPageSizeOptionsFor(totalRows) {
      const rowCount = Number(totalRows) || 0;
      if (rowCount <= 0) return Array.from(new Set([allDataState.pageSize || 100, "all"]));
      const numericOptions = allDataPageSizeSteps.filter((pageSize) => pageSize <= rowCount);
      return [...numericOptions, "all"];
    }
    function allDataSelectedRange(rowCount, pageSizeValue) {
      if (!allDataState.pageRange) return null;
      const option = pageRangeOptionsFor(rowCount, pageSizeValue).find((item) => item.value === allDataState.pageRange);
      if (!option) {
        allDataState.pageRange = "";
        return null;
      }
      return option;
    }
    function allDataSortValue(record, key) {
      const coverage = allDataContactCoverage(record);
      const values = {
        category: record.category,
        contact: coverage.detail || record.owner,
        livelabsId: record.livelabsId,
        publishStatus: allDataPublishStatus(record),
        publishType: allDataPublishType(record),
        source: record.source,
        title: record.title,
        type: allDataType(record),
        wmsId: record.wmsId
      };
      return values[key] || "";
    }
    function sortAllDataRecords(records) {
      const sortField = allDataSortFields.find((field) => field.key === allDataState.sortKey);
      if (!sortField) {
        return records.slice().sort((left, right) => (left.inventoryIndex ?? 0) - (right.inventoryIndex ?? 0));
      }
      const direction = allDataState.sortDirection === "desc" ? "desc" : "asc";
      return records.slice().sort((left, right) => {
        const comparison = compareSortValues(allDataSortValue(left, sortField.key), allDataSortValue(right, sortField.key), sortField.type);
        if (comparison === 0) return (left.inventoryIndex ?? 0) - (right.inventoryIndex ?? 0);
        return direction === "desc" ? -comparison : comparison;
      });
    }
    function allDataControlsHtml(position) {
      return `<div class="all-data-actions all-data-actions-${escapeHtml(position)}" data-all-data-controls="${escapeHtml(position)}">
        <span data-all-data-count>Inventory not loaded</span>
        <button class="filter-reset" type="button" data-all-data-focus-filters>Filters</button>
        <button class="filter-reset" type="button" data-all-data-clear>Clear filters</button>
        <div class="pagination-actions">
          <label>Rows <select class="page-size-select" data-all-data-page-size><option value="25">25</option><option value="50">50</option><option value="100" selected>100</option><option value="250">250</option><option value="all">All</option></select></label>
          <label>Range <select class="page-size-select" data-all-data-range><option value="">Page</option></select></label>
          <label>Sort <select class="page-size-select" data-all-data-sort><option value="">As listed</option></select></label>
          <button class="pagination-button pagination-sort-direction" type="button" data-all-data-sort-direction>Asc</button>
          <button class="pagination-button" type="button" data-all-data-page="prev">Prev</button>
          <span data-all-data-page-label>Page 1 of 1</span>
          <button class="pagination-button" type="button" data-all-data-page="next">Next</button>
        </div>
      </div>`;
    }
    function syncAllDataPageSizeSelect(select, recordsLength, pageSizeValue) {
      const options = allDataPageSizeOptionsFor(recordsLength).map((pageSize) => ({
        label: pageSize === "all" ? "All" : String(pageSize),
        value: String(pageSize)
      }));
      setSelectOptions(select, options, pageSizeValue);
      select.disabled = options.length <= 1;
    }
    function syncAllDataControls(recordsLength, totalPages, first, last, selectedRange) {
      const totalRecords = loadedFullSearchRecords.length;
      const pageSizeValue = allDataPageSizeValue(recordsLength);
      document.querySelectorAll("[data-all-data-count]").forEach((countNode) => {
        countNode.textContent = recordsLength
          ? `${first.toLocaleString()}-${last.toLocaleString()} of ${recordsLength.toLocaleString()} rows`
          : totalRecords ? `0 of ${totalRecords.toLocaleString()} rows` : "Inventory not loaded";
      });
      document.querySelectorAll("[data-all-data-page-label]").forEach((pageNode) => {
        pageNode.textContent = selectedRange ? `Rows ${selectedRange.label}` : `Page ${allDataState.page} of ${totalPages}`;
      });
      document.querySelectorAll("[data-all-data-page-size]").forEach((select) => {
        syncAllDataPageSizeSelect(select, recordsLength, pageSizeValue);
      });
      document.querySelectorAll("[data-all-data-range]").forEach((select) => {
        syncPageRangeSelect(select, recordsLength, pageSizeValue, allDataState.pageRange);
      });
      document.querySelectorAll("[data-all-data-sort]").forEach((select) => {
        const sortFields = visibleAllDataSortFields();
        if (!sortFields.some((field) => field.key === allDataState.sortKey)) allDataState.sortKey = "";
        setSelectOptions(select, sortFields.map((field) => ({ label: field.label, value: field.key })), allDataState.sortKey, { label: "As listed", value: "" });
      });
      document.querySelectorAll("[data-all-data-sort-direction]").forEach((button) => {
        const hasSort = Boolean(allDataState.sortKey);
        button.disabled = !hasSort;
        button.textContent = allDataState.sortDirection === "desc" ? "Desc" : "Asc";
        button.setAttribute("aria-label", allDataState.sortDirection === "desc" ? "Sort descending" : "Sort ascending");
      });
      document.querySelectorAll("[data-all-data-page='prev']").forEach((button) => { button.disabled = Boolean(selectedRange) || allDataState.page <= 1; });
      document.querySelectorAll("[data-all-data-page='next']").forEach((button) => { button.disabled = Boolean(selectedRange) || allDataState.page >= totalPages; });
    }
    function resetAllDataFilters() {
      allDataState.coverage = "";
      allDataState.page = 1;
      allDataState.pageRange = "";
      allDataState.publishStatus = "";
      allDataState.publishType = "";
      allDataState.query = "";
      allDataState.reviewState = "";
      allDataState.sortDirection = "asc";
      allDataState.sortKey = "";
      allDataState.type = "";
      ["all-data-search", "all-data-type", "all-data-publish-status", "all-data-publish-type", "all-data-review-state", "all-data-coverage"].forEach((id) => {
        const control = document.getElementById(id);
        if (control) control.value = "";
      });
    }
    function setInventoryLoadingState(message = "Loading inventory") {
      document.querySelectorAll("[data-all-data-count]").forEach((node) => { node.textContent = message; });
      const rowsNode = document.querySelector("[data-all-data-rows]");
      if (rowsNode) rowsNode.innerHTML = `<tr><td colspan="9" class="empty">${escapeHtml(message)}</td></tr>`;
      const totalNode = document.querySelector("[data-all-data-total]");
      if (totalNode) totalNode.textContent = message;
    }
    function ensurePortfolioInventoryLoaded({ render = true } = {}) {
      if (loadedFullSearchRecords.length) {
        if (render) renderAllDataTable();
        return Promise.resolve(loadedFullSearchRecords);
      }
      if (portfolioInventoryLoadComplete) {
        if (render) renderAllDataTable();
        return Promise.resolve(loadedFullSearchRecords);
      }
      setInventoryLoadingState("Loading inventory");
      return loadPortfolioInventoryRecords().then((fullRecords) => {
        loadedFullSearchRecords = fullRecords.map((record, index) => {
          if (record.inventoryIndex === undefined) record.inventoryIndex = index;
          return record;
        });
        inventoryRecordByKey = new Map();
        const duplicateKeys = [];
        const missingKeys = [];
        loadedFullSearchRecords.forEach((record) => {
          const key = searchRecordKeyFor(record);
          if (!key) {
            missingKeys.push(record.title || "N/A");
            return;
          }
          if (inventoryRecordByKey.has(key)) duplicateKeys.push(key);
          else inventoryRecordByKey.set(key, record);
        });
        window.__inventoryNavigationAudit = {
          records: loadedFullSearchRecords.length,
          uniqueKeys: inventoryRecordByKey.size,
          duplicateKeys,
          missingKeys,
          status: duplicateKeys.length || missingKeys.length ? "failed" : "passed"
        };
        portfolioInventoryLoadComplete = true;
        allDataFilterOptionsRecordCount = 0;
        refreshDashboardSearch();
        applyNoAuthorGovernanceFlags();
        applyDemandProtectedGovernanceFlags();
        refreshInitializedTableStates();
        if (render) renderAllDataTable();
        return loadedFullSearchRecords;
      });
    }
    function focusAllDataFilters() {
      const filters = document.querySelector("#all-data-panel .all-data-filter-grid");
      const firstFilter = document.getElementById("all-data-search");
      filters?.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(() => firstFilter?.focus?.({ preventScroll: true }), 160);
    }
    function allDataSearchText(record) {
      return normalizeFilterText([
        record.searchable,
        record.title,
        record.wmsId,
        record.livelabsId,
        record.category,
        record.owner,
        allDataReviewState(record),
        record.contentReviewReason,
        allDataPublishStatus(record),
        allDataPublishType(record),
        Array.from(record.values?.values?.() || []).join(" "),
        Array.from(record.details?.values?.() || []).join(" ")
      ].filter(Boolean).join(" "));
    }
    function syncAllDataSelect(select, values, allLabel) {
      if (!select) return;
      const current = select.value;
      select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>` + values
        .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
        .join("");
      select.value = values.includes(current) ? current : "";
    }
    function syncAllDataFilterOptions(records) {
      const uniqueValues = (getter) => Array.from(new Set(records.map(getter).filter(Boolean))).sort((left, right) => left.localeCompare(right));
      syncAllDataSelect(document.getElementById("all-data-type"), uniqueValues(allDataType), "All types");
      syncAllDataSelect(document.getElementById("all-data-publish-status"), uniqueValues(allDataPublishStatus), "All statuses");
      syncAllDataSelect(document.getElementById("all-data-publish-type"), uniqueValues(allDataPublishType), "All publish types");
    }
    function allDataTitleIsTemporarilyHidden(record) {
      return normalizeFilterText(record?.title || "").startsWith("missing title");
    }
    function visibleAllDataRecords() {
      return loadedFullSearchRecords.filter((record) => !allDataTitleIsTemporarilyHidden(record));
    }
    function filteredAllDataRecords() {
      const normalizedQuery = normalizeFilterText(allDataState.query);
      return visibleAllDataRecords().filter((record) => {
        if (allDataState.wmsId && String(record.wmsId || "") !== String(allDataState.wmsId)) return false;
        if (allDataState.type && allDataType(record) !== allDataState.type) return false;
        if (allDataState.publishStatus && allDataPublishStatus(record) !== allDataState.publishStatus) return false;
        if (allDataState.publishType && allDataPublishType(record) !== allDataState.publishType) return false;
        if (allDataState.reviewState && allDataReviewState(record) !== allDataState.reviewState) return false;
        const coverage = allDataContactCoverage(record);
        if (!allDataRecordMatchesCoverage(coverage, allDataState.coverage)) return false;
        if (normalizedQuery && !allDataSearchText(record).includes(normalizedQuery)) return false;
        return true;
      });
    }
    function allDataRowHtml(record, rowNumber) {
      const coverage = allDataContactCoverage(record);
      const contact = coverage.detail || record.owner || "N/A";
      return `<tr tabindex="0" data-all-data-key="${escapeHtml(searchRecordKeyFor(record))}" aria-label="${escapeHtml(record.title || "Portfolio row")}">
        <td class="all-data-row-number">${Number(rowNumber || 0).toLocaleString()}</td>
        <td>${copyableValueHtml(record.title, "Workshop/Sprint Title")}</td>
        <td>${escapeHtml(allDataType(record))}</td>
        <td>${escapeHtml(allDataPublishStatus(record) || "N/A")}</td>
        <td>${escapeHtml(allDataPublishType(record) || "N/A")}</td>
        <td>${copyableValueHtml(record.wmsId, "WMS ID")}</td>
        <td>${copyableValueHtml(record.livelabsId, "LiveLabs ID")}</td>
        <td>${escapeHtml(record.category || "N/A")}</td>
        <td>${copyableValueHtml(contact, "Author Email")}</td>
      </tr>`;
    }
    function openAllDataRecordDetail(row) {
      const key = row?.dataset?.allDataKey || "";
      const record = inventoryRecordByKey.get(key) || searchRecordByKey.get(key);
      if (!record) {
        window.__inventoryNavigationError = `No Inventory detail record for ${key || "missing key"}`;
        return false;
      }
      renderSearchDetail(record);
      return true;
    }
    function inventoryCountValue(path, fallback = 0) {
      return path.reduce((value, key) => value?.[key], portfolioInventoryMetadata) ?? fallback;
    }
    function renderInventorySummary(totalRecords) {
      const summaryNode = document.querySelector("[data-inventory-summary]");
      const warningNode = document.querySelector("[data-inventory-warning]");
      const sourceNode = document.querySelector("[data-inventory-source]");
      if (sourceNode) {
        const sourceGeneratedAt = portfolioInventoryMetadata?.source_generated_at || "";
        sourceNode.textContent = sourceGeneratedAt ? `Inventory data from ${sourceGeneratedAt}` : "Inventory data loaded";
      }
      if (summaryNode) {
        const cards = [
          ["All Records", totalRecords],
          ["Workshops", inventoryCountValue(["counts", "type", "Workshop"])],
          ["Sprints", inventoryCountValue(["counts", "type", "Sprint"])],
          ["Public", inventoryCountValue(["counts", "publish_type", "Public"])],
          ["Private", inventoryCountValue(["counts", "publish_type", "Private"])],
          ["Disabled", inventoryCountValue(["counts", "publish_type", "Disabled"])],
          ["Events", inventoryCountValue(["counts", "publish_type", "Event"])],
          ["Contact Gaps", inventoryCountValue(["counts", "contact_coverage", "Owner/stakeholder only"]) + inventoryCountValue(["counts", "contact_coverage", "No contact evidence"])],
          ["Content to review/remove", loadedFullSearchRecords.filter((record) => allDataReviewState(record) === "Content to review/remove").length]
        ];
        summaryNode.innerHTML = cards
          .map(([label, value]) => `<div class="inventory-summary-card"><span>${escapeHtml(label)}</span><strong>${Number(value || 0).toLocaleString()}</strong></div>`)
          .join("");
      }
      if (warningNode) {
        warningNode.hidden = true;
        warningNode.textContent = "";
      }
    }
    function renderAllDataTable() {
      const totalNode = document.querySelector("[data-all-data-total]");
      const rowsNode = document.querySelector("[data-all-data-rows]");
      const panel = document.getElementById("all-data-panel");
      if (!rowsNode) return;
      const totalRecords = loadedFullSearchRecords.length;
      if (totalNode) totalNode.textContent = totalRecords ? `${totalRecords.toLocaleString()} inventory records` : "Loading inventory";
      if (!totalRecords) {
        rowsNode.innerHTML = `<tr><td colspan="9" class="empty">Open Portfolio Inventory to load records</td></tr>`;
        syncAllDataControls(0, 1, 0, 0, null);
        return;
      }
      renderInventorySummary(totalRecords);
      if (allDataFilterOptionsRecordCount !== totalRecords) {
        syncAllDataFilterOptions(visibleAllDataRecords());
        allDataFilterOptionsRecordCount = totalRecords;
      }
      const records = sortAllDataRecords(filteredAllDataRecords());
      const pageSizeValue = allDataPageSizeValue(records.length);
      const selectedRange = allDataSelectedRange(records.length, pageSizeValue);
      const rangedRecords = selectedRange ? records.slice(selectedRange.start - 1, selectedRange.end) : records;
      const pageSize = pageSizeValue === "all" ? Math.max(rangedRecords.length, 1) : (Number(pageSizeValue) || 100);
      const totalPages = selectedRange ? 1 : Math.max(1, Math.ceil(rangedRecords.length / pageSize));
      allDataState.page = Math.min(Math.max(1, allDataState.page), totalPages);
      const start = selectedRange ? 0 : (allDataState.page - 1) * pageSize;
      const pageRecords = selectedRange ? rangedRecords : rangedRecords.slice(start, start + pageSize);
      const first = records.length ? (selectedRange ? selectedRange.start : start + 1) : 0;
      const last = records.length ? (selectedRange ? Math.min(selectedRange.end, records.length) : start + pageRecords.length) : 0;
      rowsNode.innerHTML = pageRecords.length
        ? pageRecords.map((record, index) => allDataRowHtml(record, first + index)).join("")
        : `<tr><td colspan="9" class="empty">No matching rows</td></tr>`;
      if (panel) panel.dataset.totalPages = String(totalPages);
      syncAllDataControls(records.length, totalPages, first, last, selectedRange);
    }
    document.addEventListener("DOMContentLoaded", () => {
      ensureAllDataDashboardUi();
      applyRankedTableDisclosures();
      const navLinks = Array.from(document.querySelectorAll(".nav-list a"));
      const setNavCurrent = (mode, targetHash = "") => {
        navLinks.forEach((item) => item.removeAttribute("aria-current"));
        const defaultHash = mode === "tops" ? "#top-performers" : mode === "inventory" ? "" : "#overview";
        const normalizedHash = targetHash || defaultHash;
        const hashLink = normalizedHash
          ? navLinks.find((item) => item.getAttribute("href") === normalizedHash && !item.dataset.dashboardView)
            || navLinks.find((item) => item.getAttribute("href") === normalizedHash)
          : null;
        const modeLink = navLinks.find((item) => item.dataset.dashboardView === mode);
        const current = mode === "inventory"
          ? (document.querySelector("[data-inventory-link]") || hashLink)
          : mode === "overview"
          ? (hashLink || modeLink)
          : (modeLink || hashLink)
          || document.querySelector('.nav-list a[data-dashboard-view="overview"]')
          || document.querySelector('.nav-list a[href="#overview"]');
        current?.setAttribute("aria-current", "true");
      };
      const scrollDashboardTarget = (targetHash) => {
        const target = document.querySelector(targetHash || "#dashboard-top");
        target?.scrollIntoView({ block: "start", behavior: "smooth" });
      };
      const inventoryRouteRequested = () => {
        const normalizedPath = location.pathname.replace(/\/+$/, "").toLowerCase();
        const params = new URLSearchParams(location.search);
        return params.get("view") === "inventory"
          || normalizedPath.endsWith("/inventory")
          || normalizedPath.endsWith("/inventory/index.html");
      };
      const replaceDashboardUrl = (targetHash) => {
        if (!targetHash) return;
        const normalizedPath = location.pathname.replace(/\/+$/, "").toLowerCase();
        if (normalizedPath.endsWith("/inventory") || normalizedPath.endsWith("/inventory/index.html")) {
          const target = new URL("../", location.href);
          target.search = "";
          target.hash = targetHash;
          history.replaceState(null, "", `${target.pathname}${target.search}${target.hash}`);
          return;
        }
        history.replaceState(null, "", targetHash);
      };
      const setDashboardMode = (mode = "overview", targetHash = "") => {
        showDashboardView({ clearUrl: false });
        const normalizedMode = ["overview", "tops", "inventory"].includes(mode) ? mode : "overview";
        if (normalizedMode !== "inventory") writeSearchUrl();
        document.body.classList.toggle("dashboard-inventory-active", normalizedMode === "inventory");
        document.body.classList.toggle("dashboard-tops-active", normalizedMode === "tops");
        setNavCurrent(normalizedMode, targetHash);
        replaceDashboardUrl(targetHash);
        if (normalizedMode === "inventory") {
          ensurePortfolioInventoryLoaded({ render: true }).finally(() => scrollDashboardTarget(targetHash || "#all-data-browser"));
          return;
        }
        scrollDashboardTarget(targetHash || (normalizedMode === "tops" ? "#top-performers" : "#overview"));
      };
      document.querySelectorAll("[data-dashboard-view]").forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          setDashboardMode(link.dataset.dashboardView || "overview", link.getAttribute("href") || "");
        });
      });
      navLinks.filter((link) => !link.dataset.dashboardView && !link.dataset.inventoryLink).forEach((link) => {
        link.addEventListener("click", (event) => {
          if (inventoryRouteRequested()) {
            event.preventDefault();
            const target = new URL("../", location.href);
            target.search = "";
            target.hash = link.getAttribute("href") || "#overview";
            window.location.assign(`${target.pathname}${target.search}${target.hash}`);
            return;
          }
          showDashboardView();
          document.body.classList.remove("dashboard-inventory-active", "dashboard-tops-active");
          setNavCurrent("overview", link.getAttribute("href") || "");
        });
      });
      window.addEventListener("hashchange", () => {
        if (inventoryRouteRequested()) {
          setDashboardMode("inventory", "");
          return;
        }
        const targetHash = location.hash || "#overview";
        document.body.classList.remove("dashboard-inventory-active", "dashboard-tops-active");
        showDashboardView({ clearUrl: false });
        setNavCurrent("overview", targetHash);
      });
      document.querySelectorAll("[data-dashboard-home]").forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          if (inventoryRouteRequested()) {
            const target = new URL("../", location.href);
            target.search = "";
            target.hash = "#overview";
            window.location.assign(`${target.pathname}${target.search}${target.hash}`);
            return;
          }
          setDashboardMode("overview", "#overview");
        });
      });
      const normalizedPath = location.pathname.replace(/\/+$/, "").toLowerCase();
      const onInventoryPage = normalizedPath.endsWith("/inventory") || normalizedPath.endsWith("/inventory/index.html");
      const initialParams = new URLSearchParams(location.search);
      const legacyInventoryRequested = !onInventoryPage && (location.hash === "#all-data-browser" || initialParams.get("view") === "inventory");
      if (legacyInventoryRequested) {
        const target = new URL("./inventory/", location.href);
        initialParams.delete("view");
        target.search = initialParams.toString();
        target.hash = "";
        window.location.replace(`${target.pathname}${target.search}`);
        return;
      }
      if (onInventoryPage && location.hash) {
        history.replaceState(null, "", `${location.pathname}${location.search}`);
      }
      if (inventoryRouteRequested()) {
        setDashboardMode("inventory", "");
      } else {
        setNavCurrent("overview", location.hash || "#overview");
      }
      syncAdminEntryLink();
      applyQaExceptionPrototype();
      applyAdminRowOverrides();
      applyNoAuthorGovernanceFlags();
      applyDemandProtectedGovernanceFlags();
      decorateDashboardCopyTargets();
      applySectionVisibilitySettings();
      let searchRecords = [];
      let searchUpdateTimer = null;
      let searchLoadRequest = 0;
      const searchInput = document.querySelector("#global-workshop-search");
      const searchClear = document.querySelector("[data-search-clear]");
      const syncSearchClear = () => {
        if (searchClear && searchInput) searchClear.hidden = !searchInput.value;
      };
      const setSearchStatus = (message) => {
        const statusNode = document.querySelector("[data-search-status]");
        if (!statusNode) return;
        statusNode.hidden = !message;
        statusNode.textContent = message || "";
      };
      const buildActiveSearchIndex = () => {
        if (loadedFullSearchRecords.length) {
          return buildSearchIndex(loadedFullSearchRecords, { includeTableRecords: false });
        }
        return buildSearchIndex([], { includeTableRecords: true });
      };
      const updateSearch = () => {
        if (!searchInput) return;
        const normalizedQuery = normalizeFilterText(searchInput.value);
        const detailViewActive = document.body.classList.contains("dashboard-search-active");
        if (normalizedQuery.length < 2) {
          if (!detailViewActive) writeSearchUrl();
          renderSearchResults([], searchInput.value);
          syncSearchClear();
          return;
        }
        if (!detailViewActive) writeSearchUrl({ query: searchInput.value });
        if (!loadedFullSearchRecords.length && !portfolioInventoryLoadComplete) {
          const requestId = ++searchLoadRequest;
          setSearchStatus("Loading full portfolio search");
          syncSearchClear();
          ensurePortfolioInventoryLoaded({ render: document.body.classList.contains("dashboard-inventory-active") }).then(() => {
            if (requestId !== searchLoadRequest) return;
            searchRecords = buildActiveSearchIndex();
            renderSearchResults(searchRecords, searchInput.value);
            syncSearchClear();
          });
          return;
        }
        searchRecords = buildActiveSearchIndex();
        renderSearchResults(searchRecords, searchInput.value);
        syncSearchClear();
      };
      const applyInventoryUrlState = () => {
        if (!inventoryRouteRequested()) return;
        const state = readSearchUrlState();
        if (!state.wmsId || state.livelabsId || state.contentKey) return;
        const inventorySearch = document.querySelector("#all-data-search");
        if (inventorySearch) inventorySearch.value = state.wmsId;
        allDataState.wmsId = state.wmsId;
        ensurePortfolioInventoryLoaded({ render: true });
      };
      const restoreSearchFromUrl = () => {
        const state = readSearchUrlState();
        if (searchInput) searchInput.value = state.query;
        const identityRequested = hasSearchIdentity(state);
        const inventoryWmsFilterOnly = inventoryRouteRequested() && state.wmsId && !state.livelabsId && !state.contentKey;
        if (state.query || identityRequested) {
          writeSearchUrl({
            query: state.query,
            identity: state,
            route: identityRequested && !inventoryWmsFilterOnly ? "dashboard" : "current"
          });
        }
        if (inventoryWmsFilterOnly) {
          setDashboardMode("inventory", "");
          applyInventoryUrlState();
          return;
        }
        if (identityRequested) {
          document.body.classList.remove("dashboard-inventory-active", "dashboard-tops-active");
          setSearchStatus(`Loading record for ${searchIdentityLabel(state)}`);
          ensurePortfolioInventoryLoaded({ render: false }).then((records) => {
            searchRecords = buildSearchIndex(records, { includeTableRecords: false });
            const resolution = resolveSearchRecordIdentity(searchRecords, state);
            if (resolution.record) {
              writeSearchUrl({ query: state.query, record: resolution.record, replace: true, route: "dashboard" });
              renderSearchDetail(resolution.record, { updateUrl: false });
              setSearchStatus("");
            } else {
              showDashboardView({ clearUrl: false });
              if (state.query) renderSearchResults(searchRecords, state.query);
              const prefix = resolution.kind === "ambiguous" ? "Multiple records match" : "No exact record found for";
              setSearchStatus(`${prefix} ${searchIdentityLabel(state)}`);
            }
          });
          return;
        }
        if (state.query) updateSearch();
        else showDashboardView({ clearUrl: false });
      };
      window.addEventListener("popstate", restoreSearchFromUrl);
      const scheduleSearchUpdate = (delay = 120) => {
        if (searchUpdateTimer) window.clearTimeout(searchUpdateTimer);
        searchUpdateTimer = window.setTimeout(() => {
          searchUpdateTimer = null;
          updateSearch();
        }, delay);
      };
      refreshDashboardSearch = () => {
        tableSearchRecordsCache = null;
        searchRecords = [];
        if (searchInput && normalizeFilterText(searchInput.value).length >= 2) updateSearch();
      };
      if (searchInput) {
        searchInput.addEventListener("input", () => scheduleSearchUpdate());
        if (searchClear) {
          searchClear.addEventListener("click", () => {
            if (searchUpdateTimer) window.clearTimeout(searchUpdateTimer);
            searchUpdateTimer = null;
            searchInput.value = "";
            updateSearch();
            searchInput.focus();
          });
        }
        restoreSearchFromUrl();
      }
      applyInventoryUrlState();
      document.querySelectorAll("[data-back-dashboard]").forEach((button) => {
        button.addEventListener("click", () => {
          showDashboardView({ clearUrl: true });
          if (document.body.classList.contains("dashboard-inventory-active")) setNavCurrent("inventory", "");
          else if (document.body.classList.contains("dashboard-tops-active")) setNavCurrent("tops", "#top-performers");
          else setNavCurrent("overview", location.hash || "#overview");
        });
      });
      document.addEventListener("click", (event) => {
        const copyButton = event.target.closest("button[data-copy-value]");
        if (copyButton) {
          event.preventDefault();
          event.stopPropagation();
          copyValueFromButton(copyButton);
          return;
        }
        const row = event.target.closest("tr[data-filter-row='true'][data-detail-row-id]");
        if (!row || event.target.closest("button, a, input, label, select, summary")) return;
        toggleRowExpanded(row);
      });
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const copyButton = event.target.closest("button[data-copy-value]");
        if (copyButton) {
          event.preventDefault();
          event.stopPropagation();
          copyValueFromButton(copyButton);
          return;
        }
        const row = event.target.closest("tr[data-filter-row='true'][data-detail-row-id]");
        if (!row) return;
        event.preventDefault();
        toggleRowExpanded(row);
      });
      enhanceCategoryFilters();
      document.querySelectorAll("[data-table-filter]").forEach((control) => {
        const eventName = control.tagName.toLowerCase() === "select" || control.type === "checkbox" ? "change" : "input";
        control.addEventListener(eventName, () => {
          preserveViewportDuringTableUpdate(control.dataset.tableFilter, () => {
            applyTableState(control.dataset.tableFilter, { resetPage: true });
          });
        });
      });
      document.querySelectorAll("[data-sort-table]").forEach((button) => {
        button.addEventListener("click", () => {
          const tableId = button.dataset.sortTable;
          const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
          if (!wrapper) return;
          const columnIndex = button.dataset.columnIndex;
          const defaultDirection = button.dataset.defaultDirection || "asc";
          const currentDirection = wrapper.dataset.sortColumnIndex === columnIndex ? (wrapper.dataset.sortDirection || "none") : "none";
          let nextDirection = defaultDirection;
          if (currentDirection === "asc") nextDirection = "desc";
          else if (currentDirection === "desc") nextDirection = "asc";
          wrapper.dataset.sortColumnIndex = columnIndex;
          wrapper.dataset.sortDirection = nextDirection;
          preserveViewportDuringTableUpdate(tableId, () => {
            applyTableState(tableId, { resetPage: true });
          });
        });
      });
      document.querySelectorAll("[data-clear-filters-for]").forEach((button) => {
        button.addEventListener("click", () => {
          const tableId = button.dataset.clearFiltersFor;
          preserveViewportDuringTableUpdate(tableId, () => {
            document.querySelectorAll(`[data-table-filter="${tableId}"]`).forEach((control) => {
              if (control.type === "checkbox") control.checked = false;
              else control.value = "";
            });
            applyTableState(tableId, { resetPage: true });
          });
        });
      });
      document.addEventListener("toggle", (event) => {
        const disclosure = event.target;
        if (disclosure instanceof HTMLDetailsElement && disclosure.open) {
          initializeTablesIn(disclosure, { force: true });
        }
      }, true);
      scheduleInitialTableSetup();
      window.addEventListener("storage", (event) => {
        if (event.key === adminStorageKey) reloadDashboardAdminState();
      });
    });
