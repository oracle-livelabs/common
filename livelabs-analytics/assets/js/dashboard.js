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
    const rankedTop100TableIds = new Set(['top-performers-table', 'at-risk-table', 'retirement-review-table', 'jenkins-p1-action-table']);
    const tenRowDefaultTableIds = new Set([
      ...rankedTop100TableIds
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
        if (wrapper.dataset.reviewPriority === "true" && dashboardTableHeaderLabel(headerCell) === "score") {
          const bandDifference = Number(rowA.dataset.reviewOrder || 0) - Number(rowB.dataset.reviewOrder || 0);
          if (bandDifference) return bandDifference;
        }
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
      if (control.type === "checkbox") return control.checked;
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
      const selectedFocus = filters.filter(control => control.dataset.filterMode === 'review-focus' && control.checked).map(control => control.value);
      const rowFocus = JSON.parse(row.dataset.reviewFocus || '[]');
      if (selectedFocus.length && !selectedFocus.some(focus => rowFocus.includes(focus))) return false;
      const cells = row.querySelectorAll("td[data-filter-value]");
      return filters.every((control) => {
        if (control.dataset.filterMode === 'review-focus') return true;
        if (control.dataset.filterMode === 'content-type') return !control.value || control.value === row.dataset.contentType;
        if (control.dataset.filterMode === "review-tier") return !control.value || row.dataset.reviewTier === control.value;
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
    function enhanceCategoryFilters(root = document) {
      root.querySelectorAll?.('[data-table-filter]').forEach((control) => {
        if (control.tagName.toLowerCase() === "select") return;
        if (!["category", "council"].includes(normalizeFilterText(filterLabelFor(control)))) return;
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
        allOption.textContent = normalizeFilterText(filterLabelFor(control)) === "council" ? "All councils" : "All categories";
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
      return Array.from(wrapper.querySelectorAll("th[data-sort-column-index]"))
        .filter((headerCell) => !headerCell.hidden && headerCell.getAttribute("aria-hidden") !== "true")
        .map((headerCell) => ({
        label: (headerCell.querySelector("button")?.textContent || headerCell.textContent || `Column ${Number(headerCell.dataset.sortColumnIndex || 0) + 1}`).trim(),
        value: headerCell.dataset.sortColumnIndex || ""
        }))
        .filter((option) => option.label && option.value !== "" && option.label !== "#");
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
      const endLoading = window.LiveLabsLoading.begin('Preparing dashboard tables…');
      const setup = () => { try { initializeTablesIn(document); } finally { endLoading(); } };
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
        .filter(([label, value]) => label && value && normalizeFilterText(label) !== "source" && !label.startsWith("QA ") && !/jenkins error score|analytics qa error score/i.test(label))
        .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(displayDetailValue(label, value))}</td></tr>`);
      return rows.length ? rows.join("") : `<tr><td colspan="2">No dashboard row fields available.</td></tr>`;
    }
    function summaryItemsFor(record) {
      const ids = [record.wmsId ? `WMS ${record.wmsId}` : "", record.livelabsId ? `LiveLabs ${record.livelabsId}` : ""].filter(Boolean).join(" | ");
      const score = labeledValue(record, ["Score", "Retire Score"]);
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
        record.details.get("Ownership Status") ? ["Ownership Status", record.details.get("Ownership Status")] : null,
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
      const record = {
        category: raw?.category || "",
        details,
        family: raw?.family || null,
        fileUpdates,
        livelabsId: String(raw?.livelabsId || ""),
        owner: cleanContactEnumeration(raw?.owner || ""),
        ownership: raw?.ownership || null,
        qa: raw?.qa || null,
        review: raw?.review || null,
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
      return applyJenkinsMergeToRecord(record);
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
          qa: record.qa || existing.qa || null,
          fileUpdates: existing.fileUpdates?.length ? existing.fileUpdates : record.fileUpdates,
          owner: existing.ownership?.status === "disputed" ? "" : existing.owner || record.owner,
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
    function loadFilePortfolioPayload() {
      const existing = globalThis.__livelabsPortfolioInventoryPayload;
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.async = true;
        script.src = new URL("./inventory/data/portfolio_inventory.file.js", document.baseURI).href;
        script.onload = () => globalThis.__livelabsPortfolioInventoryPayload
          ? resolve(globalThis.__livelabsPortfolioInventoryPayload)
          : reject(new Error("The file-safe Inventory payload did not register."));
        script.onerror = () => reject(new Error("The file-safe Inventory payload could not be loaded."));
        document.head.append(script);
      });
    }
    const dashboardPageConfig = {
      performance: { sections: ["top-performers"] },
      urgent: { sections: [] },
      "at-risk": { sections: ["at-risk-content"] },
      retirement: { sections: ["retire-now-content"] }
    };
    const dashboardSectionPage = {
      "top-performers": "performance",
      "jenkins-p1-slot": "urgent",
      "at-risk-content": "at-risk",
      "retire-now-content": "retirement",
      "portfolio-stats": "performance"
    };
    const dashboardSectionMembership = {
      "top-performers": "performance",
      "at-risk-content": "at-risk",
      "retire-now-content": "retirement"
    };
    function normalizeDashboardPage(value) {
      const normalized = String(value || "overview").trim().toLowerCase();
      if (normalized === "inventory") return "inventory";
      const aliases = {
        overview: "performance", dashboard: "performance", stats: "performance", tops: "performance",
        errors: "at-risk", "at-risk-content": "at-risk", p1: "urgent", "p1-urgent-action": "urgent",
        "immediate-retirement": "retirement"
      };
      const page = aliases[normalized] || normalized;
      return dashboardPageConfig[page] ? page : "performance";
    }
    function applyDashboardPageView(value) {
      const page = normalizeDashboardPage(value);
      document.body.dataset.dashboardPage = page;
      const sectionSettings = { "top-performers": "topPerformers", "at-risk-content": "atRiskContent", "retire-now-content": "retireNowContent", "portfolio-stats": "portfolioStats" };
      document.querySelectorAll("[data-dashboard-page]").forEach((element) => {
        const pages = String(element.dataset.dashboardPage || "").split(/\s+/);
        const settingKey = sectionSettings[element.id];
        const adminVisible = !settingKey || dashboardAdminState.sectionVisibility?.[settingKey] !== false;
        element.hidden = (!pages.includes("all") && !pages.includes(page)) || !adminVisible;
      });
      document.querySelectorAll("[data-dashboard-tab]").forEach((tab) => {
        const selected = tab.dataset.dashboardTab === page;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
      });
      return page;
    }
    const lazySectionLoads = new Map();
    function lazySectionPlaceholder(sectionId) {
      return document.querySelector(`[data-lazy-section="${sectionId}"]`);
    }
    function lazySectionError(section, message) {
      section.dataset.lazyError = "true";
      section.setAttribute("aria-busy", "false");
      const panel = section.querySelector(".lazy-section-panel");
      if (panel) panel.innerHTML = `<p class="lazy-section-status" role="alert">${escapeHtml(message)}</p>`;
    }
    async function loadLazySection(sectionId) {
      const placeholder = lazySectionPlaceholder(sectionId);
      if (!placeholder) return document.getElementById(sectionId);
      if (location.protocol === "file:") {
        lazySectionError(placeholder, "This review queue needs an HTTP(S) server or the OCI tenancy URL. Inventory remains available from this local file.");
        return placeholder;
      }
      if (lazySectionLoads.has(sectionId)) return lazySectionLoads.get(sectionId);
      placeholder.setAttribute("aria-busy", "true");
      const panel = placeholder.querySelector(".lazy-section-panel");
      if (panel) panel.innerHTML = "<p>Loading review queue…</p>";
      const request = fetch(placeholder.dataset.lazySrc, { credentials: "same-origin" })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        })
        .then((markup) => {
          const template = document.createElement("template");
          template.innerHTML = markup.trim();
          const section = template.content.firstElementChild;
          if (!(section instanceof HTMLElement) || section.tagName !== "SECTION" || section.id !== sectionId) {
            throw new Error("fragment has an invalid section root");
          }
          section.dataset.dashboardPage = dashboardSectionMembership[sectionId] || dashboardSectionPage[sectionId] || "overview";
          const tabLabels = {
            "top-performers": "dashboard-tab-performance",
            "at-risk-content": "dashboard-tab-at-risk",
            "retire-now-content": "dashboard-tab-retirement"
          };
          if (tabLabels[sectionId]) {
            section.classList.add("dashboard-tab-panel");
            section.setAttribute("role", "tabpanel");
            section.setAttribute("aria-labelledby", tabLabels[sectionId]);
            section.tabIndex = 0;
          }
          placeholder.replaceWith(section);
          normalizeRankedTablePresentation(section);
          updateJenkinsScoreExplanations(section);
          applyDashboardPageView(document.body.dataset.dashboardPage || "overview");
          normalizeSectionLinks(section);
          applyRankedTableDisclosures();
          applyQaExceptionPrototype();
          applyAdminRowOverrides();
          applyNoAuthorGovernanceFlags();
          applyDemandProtectedGovernanceFlags();
          decorateDashboardCopyTargets(section);
          applySectionVisibilitySettings();
          enhanceCategoryFilters(section);
          initializeTablesIn(section);
          applyJenkinsMergeToRankedTables();
          tableSearchRecordsCache = null;
          refreshDashboardSearch();
          return section;
        })
        .catch((error) => {
          lazySectionLoads.delete(sectionId);
          const current = lazySectionPlaceholder(sectionId);
          if (current) lazySectionError(current, `Could not load this review queue (${error.message}).`);
          window.LiveLabsLoading.fail('A review queue could not be loaded. Please try again.');
          return current;
        });
      lazySectionLoads.set(sectionId, request);
      return window.LiveLabsLoading.track(request, 'Loading review queues…');
    }
    function normalizeSectionLinks(container = document) {
      container.querySelectorAll('a[href^="#"]').forEach(link => {
        const hash = link.getAttribute('href');
        link.dataset.sectionHash = hash;
        const target = link.classList.contains('skip-link') ? new URL(location.href)
          : new URL(location.protocol === 'file:' ? 'index.html' : 'dashboard/', document.baseURI);
        target.hash = hash;
        link.href = target.href;
      });
    }
    function configureLazySections() {
      document.addEventListener("click", (event) => {
        const anchor = event.target.closest('a[data-section-hash], a[href^="#"]');
        const sectionId = anchor?.hash?.slice(1);
        if (!sectionId || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const targetPage = dashboardSectionPage[sectionId];
        if (targetPage && targetPage !== normalizeDashboardPage(document.body.dataset.dashboardPage)) {
          event.preventDefault();
          window.setDashboardPage?.(targetPage, { targetHash: anchor.hash, updateUrl: true });
          return;
        }
        event.preventDefault();
        if (anchor.classList.contains('skip-link')) {
          document.getElementById(sectionId)?.scrollIntoView({ block: 'start' });
          return;
        }
        if (!lazySectionPlaceholder(sectionId)) {
          history.pushState(null, '', anchor.href);
          document.getElementById(sectionId)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
          return;
        }
        loadLazySection(sectionId).then((section) => {
          history.pushState(null, "", anchor.href);
          section?.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      });
      const route = readSearchUrlState();
      const isInventory = document.body.classList.contains('dashboard-inventory-active');
      const needsDashboard = !isInventory && !hasSearchIdentity(route) && !route.query;
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          void loadLazySection(entry.target.dataset.lazySection);
        });
      });
      document.querySelectorAll('[data-lazy-section]').forEach(section => observer.observe(section));
      if (needsDashboard) {
        const page = normalizeDashboardPage(document.body.dataset.dashboardPage);
        (dashboardPageConfig[page]?.sections || []).forEach((sectionId) => void loadLazySection(sectionId));
      }
      const initialSectionId = location.hash.slice(1);
      if (initialSectionId && lazySectionPlaceholder(initialSectionId)) {
        const targetPage = dashboardSectionPage[initialSectionId];
        if (targetPage && targetPage !== normalizeDashboardPage(document.body.dataset.dashboardPage)) {
          window.setDashboardPage?.(targetPage, { targetHash: location.hash, updateUrl: false });
        } else {
          loadLazySection(initialSectionId).then((section) => section?.scrollIntoView({ block: "start" }));
        }
      }
    }
    function dashboardRecordValue(record, label) {
      const pair = (record?.values || []).find((item) => Array.isArray(item) && item[0] === label);
      const value = Number(String(pair?.[1] ?? "").replace(/,/g, ""));
      return Number.isFinite(value) ? value : null;
    }
    function dashboardRecordDate(record) {
      const details = new Map((record?.details || []).filter((item) => Array.isArray(item) && item.length >= 2));
      const candidates = [
        details.get("Last Meaningful Workshop Update"),
        details.get("Latest Workshop Commit Date"),
        details.get("Latest GitHub Update"),
        details.get("Latest Repository Update Proxy"),
        details.get("WMS Last Update"),
        record?.update
      ];
      for (const candidate of candidates) {
        const text = String(candidate || "").trim();
        const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      return null;
    }
    const portfolioMetricTooltips = {
      "public-count": "Counts workshops and sprints that are both Published and Public. These items are available in author search and dashboard rankings.",
      "error-items-count": "Public items with at least one P2 or P3 finding. Each item counts once; P1-only items are covered by the separate P1 findings card. Unclassified findings remain in record details.",
      "jenkins-p1-count": "P1 means an issue may stop a learner—for example, a required link or image is broken, or a step cannot be completed. From the Dashboard, open P1 urgent action, check the evidence, and fix confirmed issues. If you cannot reproduce one, ask a reviewer to verify it.",
      "jenkins-match-count": "Counts public, published items matched to a row in the applied Jenkins report. A match means evidence is available; it does not mean errors were found."
    };
    function addPortfolioMetricTooltips(root = document) {
      root.querySelectorAll?.(".metric-card [data-overview-metric]").forEach((metric) => {
        const copy = portfolioMetricTooltips[metric.dataset.overviewMetric];
        const card = metric.closest(".metric-card");
        const title = card?.querySelector(":scope > span");
        if (!copy || !card || !title || card.dataset.metricTooltip === "true") return;
        const titleText = title.textContent.trim();
        const tooltipId = `metric-tooltip-${metric.dataset.overviewMetric}`;
        const heading = document.createElement("div");
        heading.className = "metric-card-heading";
        const helpWrap = document.createElement("span");
        helpWrap.className = "metric-help-wrap";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "metric-help-button";
        button.setAttribute("aria-label", `About ${titleText}`);
        button.setAttribute("aria-describedby", tooltipId);
        button.textContent = "i";
        const tooltip = document.createElement("span");
        tooltip.id = tooltipId;
        tooltip.className = "metric-tooltip";
        tooltip.setAttribute("role", "tooltip");
        tooltip.textContent = copy;
        card.insertBefore(heading, title);
        heading.append(title, helpWrap);
        helpWrap.append(button, tooltip);
        card.dataset.metricTooltip = "true";
      });
    }
    function updatePortfolioStatsFromPayload(payload) {
      const records = Array.isArray(payload?.records) ? payload.records : [];
      if (!records.length) return;
      const active = records.filter((record) => record.publishType === "Public" && record.publishStatus === "Published");
      const byType = (type) => active.filter((record) => record.type === type);
      const disabled = [];
      const events = [];
      const notPublished = [];
      const infoRows = Array.from(document.querySelectorAll("#portfolio-stats .info-table tr"));
      const setInfo = (label, value) => {
        const row = infoRows.find((item) => item.querySelector("th")?.textContent.trim() === label);
        const cell = row?.querySelector("td");
        if (cell) cell.textContent = String(value);
      };
      setInfo("Active workshops", byType("Workshop").length);
      setInfo("Active sprints", byType("Sprint").length);
      setInfo("Disabled workshops", disabled.filter((record) => record.type === "Workshop").length);
      setInfo("Disabled sprints", disabled.filter((record) => record.type === "Sprint").length);
      setInfo("Events excluded", events.length);
      setInfo("Not published", notPublished.length);
      const matchedTwelveMonth = active.filter((record) => dashboardRecordValue(record, "Views - Last 12 Months") !== null).length;
      setInfo("Dashboard rows matched to WMS (12m)", active.length ? `${((matchedTwelveMonth / active.length) * 100).toFixed(2)}%` : "N/A");
      const snapshotDate = new Date(`${payload.metadata?.snapshot_date || "2026-09-28"}T00:00:00Z`);
      const ageDays = (record) => {
        const updated = dashboardRecordDate(record);
        return updated ? Math.max(0, Math.floor((snapshotDate - updated) / 86400000)) : null;
      };
      const updatedInYear = active.filter((record) => ageDays(record) !== null && ageDays(record) <= 365);
      const aged18to24 = active.filter((record) => ageDays(record) !== null && ageDays(record) > 548 && ageDays(record) <= 730);
      const thousandPlus = active.filter((record) => (dashboardRecordValue(record, "Views - Last 12 Months") || 0) >= 1000);
      const glance = document.querySelector('[data-portfolio-glance="true"]');
      if (glance) {
        const strongValues = glance.querySelectorAll(".portfolio-glance-card strong");
        const smallValues = glance.querySelectorAll(".portfolio-glance-card small");
        const workshopCount = byType("Workshop").length;
        const sprintCount = byType("Sprint").length;
        if (strongValues[0]) strongValues[0].textContent = String(active.length);
        if (strongValues[1]) strongValues[1].textContent = String(updatedInYear.length);
        if (strongValues[2]) strongValues[2].textContent = String(aged18to24.length);
        if (strongValues[3]) strongValues[3].textContent = String(thousandPlus.length);
        if (smallValues[0]) smallValues[0].textContent = `${workshopCount} workshops · ${sprintCount} sprints`;
        if (smallValues[1]) smallValues[1].textContent = `${updatedInYear.filter((record) => record.type === "Workshop").length} workshops · ${updatedInYear.filter((record) => record.type === "Sprint").length} sprints`;
        if (smallValues[2]) smallValues[2].textContent = `${aged18to24.filter((record) => record.type === "Workshop").length} workshops · ${aged18to24.filter((record) => record.type === "Sprint").length} sprints`;
        if (smallValues[3]) smallValues[3].textContent = `${thousandPlus.filter((record) => record.type === "Workshop").length} workshops · ${thousandPlus.filter((record) => record.type === "Sprint").length} sprints`;
        const glanceNote = glance.querySelector(".note");
        if (glanceNote) glanceNote.textContent = `A quick read across four portfolio metrics. The active portfolio contains ${active.length} items: ${workshopCount} workshops and ${sprintCount} sprints.`;
      }
      const demandBands = [
        ["5,000+ views", (value) => value >= 5000],
        ["1,000-4,999 views", (value) => value >= 1000 && value < 5000],
        ["250-999 views", (value) => value >= 250 && value < 1000],
        ["50-249 views", (value) => value >= 50 && value < 250],
        ["Under 50 views", (value) => value < 50]
      ];
      const stalenessBands = [
        ["Updated in last 12 months", (days) => days <= 365],
        ["Stale: 12-18 months", (days) => days > 365 && days <= 548],
        ["Stale: 18-24 months", (days) => days > 548 && days <= 730],
        ["Stale: 24+ months", (days) => days > 730]
      ];
      const updateChart = (heading, type, classifier, values, note) => {
        const panel = Array.from(document.querySelectorAll("#portfolio-stats .chart-card")).find((item) => item.querySelector("h3")?.textContent.trim() === heading);
        if (!panel) return;
        const rows = Array.from(panel.querySelectorAll(".chart-row"));
        const counts = new Map(classifier.map(([label]) => [label, 0]));
        values.forEach((value) => {
          const bucket = classifier.find(([, predicate]) => predicate(value));
          if (bucket) counts.set(bucket[0], counts.get(bucket[0]) + 1);
        });
        const maximum = Math.max(...counts.values(), 1);
        rows.forEach((row) => {
          const label = row.querySelector("strong")?.textContent.trim();
          if (!counts.has(label)) return;
          const count = counts.get(label);
          const countNode = row.querySelector(".chart-head span");
          const noteNode = row.querySelector(".chart-note");
          const fill = row.querySelector(".bar-fill");
          if (countNode) countNode.textContent = `${count} ${type}`;
          if (noteNode) noteNode.textContent = `${count} ${type} are in this band.`;
          if (fill) fill.style.setProperty("--bar-width", `${((count / maximum) * 100).toFixed(1)}%`);
        });
        const noteNode = panel.querySelector(".note");
        if (noteNode) noteNode.textContent = note;
      };
      for (const type of ["Workshop", "Sprint"]) {
        const current = byType(type);
        const demandValues = current.map((record) => dashboardRecordValue(record, "Views - Last 12 Months")).filter((value) => value !== null);
        updateChart(`${type} Demand Bands`, `${type.toLowerCase()}s`, demandBands, demandValues, `Count of active ${type.toLowerCase()}s by 12-month demand band. Rows without a matched 12-month view are excluded from these five bands.`);
        const ageValues = current.map((record) => dashboardRecordDate(record)).filter(Boolean).map((value) => Math.max(0, Math.floor((snapshotDate - value) / 86400000)));
        updateChart(`${type} Staleness Bands`, `${type.toLowerCase()}s`, stalenessBands, ageValues, `Count of ${type.toLowerCase()}s by update age using available WMS/GitHub evidence; GitHub evidence is dated 14-15 August 2026.`);
      }
    }
    function normalizePortfolioPayload(payload) {
      portfolioInventoryMetadata = payload?.metadata || null;
      const normalized = {
        metadata: portfolioInventoryMetadata,
        records: Array.isArray(payload?.records) ? payload.records : []
      };
      updatePortfolioStatsFromPayload(normalized);
      return normalized;
    }
    function loadCanonicalPortfolioPayload() {
      if (portfolioPayloadPromise) return portfolioPayloadPromise;
      if (typeof fetch !== "function") {
        portfolioPayloadPromise = Promise.resolve({ metadata: null, records: [] });
        return portfolioPayloadPromise;
      }
      if (location.protocol === "file:") {
        portfolioPayloadPromise = loadFilePortfolioPayload().then(normalizePortfolioPayload);
        return portfolioPayloadPromise;
      }
      portfolioPayloadPromise = fetch("./inventory/data/public_portfolio_inventory.json", { cache: "no-cache" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
        .then(normalizePortfolioPayload);
      return portfolioPayloadPromise;
    }
    let authorScoreBaselines = {};
    function recordScore(record, context = scoreContext()) {
      const baseline = authorScoreBaselines[String(record.livelabsId)]?.[context];
      return baseline == null ? null : mergeScoreForTable({mode: context}, baseline, jenkinsOverlayForId(record.livelabsId));
    }
    function scoreContext() { return new URLSearchParams(location.search).get('score_context') === 'risk' ? 'risk' : 'performance'; }
    function recordLink(record, context = 'performance') {
      return `/search/?livelabs_id=${encodeURIComponent(record.livelabsId)}&score_context=${context}`;
    }
    function loadFullSearchRecords() {
      if (fullSearchRecordsPromise) return fullSearchRecordsPromise;
      fullSearchRecordsPromise = Promise.all([loadCanonicalPortfolioPayload(), fetch('./assets/data/score-baselines.json', {cache:'no-cache'}).then(response => response.ok ? response.json() : {}).catch(() => ({}))])
        .then(([payload, scores]) => {
          authorScoreBaselines = scores.records || {};
          portfolioInventoryMetadata = payload.metadata || null;
          publicRawRecords = Array.isArray(payload.records) ? payload.records : [];
          publicLivelabsIds = new Set(publicRawRecords.map((record) => String(record.livelabsId || "").trim()).filter(Boolean));
          loadedFullSearchRecords = publicRawRecords.map(fullIndexRecordToSearchRecord);
          return loadedFullSearchRecords;
        })
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
          window.LiveLabsLoading.fail('Portfolio data could not be loaded. Please try again.');
          return [];
        });
      return portfolioInventoryRecordsPromise;
    }
    const adminStorageKey = "livelabsAnalyticsAdminState";
    const qaMergeRefreshKey = "livelabsQaReportMergeRefresh";
    const sessionKey = "livelabsAnalyticsSession";
    const adminSessionDurationMs = 12 * 60 * 60 * 1000;
    const adminStateSchemaVersion = 3;
    const criteriaRuleAutomationPaused = true;
    const authorFacingGovernanceTagsHidden = true;
    let fullSearchRecordsPromise = null;
    let portfolioPayloadPromise = null;
    let portfolioInventoryRecordsPromise = null;
    let loadedFullSearchRecords = [];
    let publicRawRecords = [];
    let publicLivelabsIds = new Set();
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
      jenkinsData: "",
      jenkinsPriority: "",
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
      { key: "contact", label: "Contact", type: "text" },
      { key: "qaError", label: "Analytics QA Error Score", type: "number" },
      { key: "jenkinsError", label: "Jenkins Error Score", type: "number" },
      { key: "jenkinsPriority", label: "Jenkins Priority", type: "text" },
      { key: "qaState", label: "QA Evidence", type: "text" }
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
      { key: "no-author", label: "No Author", description: "Use this tag when an item does not identify an author or contact.", className: "governance-group-no-author" },
      { key: "stale-high-demand", label: "Stale, High Demand", description: "Use this tag when content may be outdated but demand remains high.", className: "governance-group-stale-high-demand" },
      { key: "retirement-review", label: "Retirement Review", description: "Use this tag when an item needs review for possible retirement.", className: "governance-group-retire-review" },
      { key: "refresh", label: "Refresh", description: "Use this tag when an item should be refreshed or updated.", className: "governance-group-stale-high-demand" },
      { key: "keep", label: "Keep", description: "Use this tag when an item should remain available.", className: "" },
      { key: "inactive", label: "Inactive/Event", description: "Use this tag when an item is inactive or tied to a time-bound event.", className: "governance-group-inactive" },
      { key: "missing", label: "Missing Data", description: "Use this tag when key item information is missing.", className: "governance-group-missing" },
      { key: "manager-review", label: "Manager Review", description: "Use this tag when a manager needs to review an item or decision.", className: "" }
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
      score: { details: ["Score", "Best Performer Score", "Retire Score"], headers: ["Score", "Risk Score", "Retire Score"] },
      title: { details: ["Title"], headers: ["Title", "Current Item", "Candidate Title"] },
      views12m: { details: ["Views 12m", "Recent Views 12m", "Page Views 12m"], headers: ["Views 12m", "Recent Views 12m", "Page Views 12m"] },
      views90d: { details: ["Views 90d", "Recent Views 90d", "Page Views 90d"], headers: ["Views 90d", "Recent Views 90d", "Page Views 90d"] },
      wmsId: { details: ["WMS ID", "Current WMS ID", "Candidate WMS ID"], headers: ["WMS ID", "Current WMS ID", "Candidate WMS ID"] }
    };
    let dashboardAdminState = readDashboardAdminState();
    let dashboardQaReportMerge = null;
    let refreshDashboardSearch = () => {};
    function jenkinsOverlayForId(livelabsId) {
      const overlay = dashboardQaReportMerge?.overlay?.[String(livelabsId || "")];
      if (!overlay) return null;
      const findings = Array.isArray(overlay.findings) ? overlay.findings : [];
      const originalCounts = overlay.priorityCounts || {};
      const occurrenceCount = (priority) => findings.filter((issue) => issue.priority === priority)
        .reduce((sum, issue) => sum + Math.max(0, Number(issue.count || 0)), 0);
      const priorityCounts = {
        ...originalCounts,
        unmapped: Number(originalCounts.unmapped ?? findings.filter((issue) => !["P1", "P2", "P3"].includes(issue.priority) && issue.group !== "internal-qa").length),
        p3: Number(originalCounts.p3 || findings.filter((issue) => issue.priority === "P3").length),
        p2Occurrences: Number(originalCounts.p2Occurrences ?? occurrenceCount("P2")),
        p3Occurrences: Number(originalCounts.p3Occurrences ?? occurrenceCount("P3"))
      };
      const policy = overlay.scorePolicy || dashboardQaReportMerge.summary?.scorePolicy || {};
      const weights = policy.weights || { P2: 2, P3: 1 };
      const referenceBurden = Number(policy.referenceBurden || 20);
      const validity = window.LiveLabsAuthor.qaValidity(overlay);
      const score = validity !== 'scored' ? null : overlay.jenkinsErrorScore !== undefined
        ? overlay.jenkinsErrorScore
        : Number(priorityCounts.unmapped || 0) > 0
          ? null
          : (() => {
            const burden = Number(weights.P2 || 2) * priorityCounts.p2Occurrences + Number(weights.P3 || 1) * priorityCounts.p3Occurrences;
            return Math.round((10000 * burden / (burden + referenceBurden)) || 0) / 100;
          })();
      return { ...overlay, priorityCounts, jenkinsErrorScore: score, scoreState: validity === 'scored' && score === null ? 'unmapped-priority' : validity };
    }
    function jenkinsPrioritySummary(overlay) {
      if (!overlay) return "No Jenkins report";
      const counts = overlay.priorityCounts || {};
      const parts = [];
      ["p1", "p2", "p3"].forEach((key) => {
        if (Number(counts[key] || 0)) parts.push(`${key.toUpperCase()} ${Number(counts[key]).toLocaleString()}`);
      });
      if (Number(counts.unmapped || 0)) parts.push(`Unmapped ${Number(counts.unmapped).toLocaleString()}`);
      if (overlay.scoreState !== "scored") parts.push("QA incomplete");
      return parts.join(" · ") || "No prioritized findings";
    }
    function applyJenkinsMergeToRecord(record) {
      if (!record) return record;
      const overlay = jenkinsOverlayForId(record.livelabsId);
      record.jenkins = overlay;
      record.jenkinsErrorScore = overlay?.jenkinsErrorScore ?? null;
      record.jenkinsPrioritySummary = jenkinsPrioritySummary(overlay);
      const findings = Array.isArray(overlay?.findings) ? overlay.findings : [];
      record.jenkinsIssueCodes = Array.from(new Set(findings.map((issue) => String(issue.code || "").trim()).filter(Boolean))).join(" ");
      record.jenkinsIssueSearch = findings.map((issue) => [issue.priority, issue.code, issue.label, issue.message, issue.file, issue.section].filter(Boolean).join(" ")).join(" ");
      if (record.searchableBase === undefined) record.searchableBase = record.searchable || "";
      record.searchable = normalizeFilterText([record.searchableBase, record.jenkinsPrioritySummary, record.jenkinsIssueCodes, record.jenkinsIssueSearch, overlay?.runId].filter(Boolean).join(" "));
      ["Jenkins Error Score", "Jenkins Priority", "Jenkins Issue Codes", "Jenkins Issue Summary", "Jenkins Run ID"].forEach((key) => {
        record.details?.delete?.(key);
        record.values?.delete?.(key);
      });
      if (overlay) {
        const details = record.details instanceof Map ? record.details : (record.details = new Map());
        const values = record.values instanceof Map ? record.values : (record.values = new Map());
        const fields = [
          ["Jenkins Error Score", overlay.jenkinsErrorScore ?? "N/A"],
          ["Jenkins Priority", record.jenkinsPrioritySummary],
          ["Jenkins Issue Codes", record.jenkinsIssueCodes || "None reported"],
          ["Jenkins Issue Summary", record.jenkinsIssueSearch || "No issue details reported"],
          ["Jenkins Run ID", overlay.runId || "Not reported"]
        ];
        fields.forEach(([key, value]) => { details.set(key, String(value)); values.set(key, String(value)); });
      }
      return record;
    }
    function applyJenkinsMergeToLoadedRecords() {
      const seen = new Set();
      loadedFullSearchRecords.forEach((record) => {
        if (!record || seen.has(record)) return;
        seen.add(record);
        applyJenkinsMergeToRecord(record);
      });
      searchRecordByKey.forEach(applyJenkinsMergeToRecord);
      inventoryRecordByKey.forEach(applyJenkinsMergeToRecord);
    }
    const jenkinsRankedTableConfigs = [
      { id: 'top-performers-table', mode: 'performance', scoreHeader: 'Score', idHeader: 'LiveLabs ID' },
      { id: 'at-risk-table', mode: 'risk', scoreHeader: 'Score', idHeader: 'LiveLabs ID' },
      { id: 'retirement-review-table', mode: 'risk', scoreHeader: 'Score', idHeader: 'LiveLabs ID' }
    ];    function updateJenkinsScoreExplanations(root = document) {
      const policy = dashboardQaReportMerge?.summary?.scorePolicy || {};
      const configuredShare = Number(policy.tableShare ?? 0.25);
      const jenkinsShare = Math.min(0.45, Math.max(0.05, Number.isFinite(configuredShare) ? configuredShare : 0.25));
      const shares = { analytics: `${Math.round((1 - jenkinsShare) * 100)}%`, jenkins: `${Math.round(jenkinsShare * 100)}%` };
      root.querySelectorAll("[data-score-share]").forEach((node) => {
        const label = shares[node.dataset.scoreShare];
        if (label) node.textContent = label;
      });
    }
    function dashboardTableHeaderLabel(cell) {
      return normalizeFilterText(cell?.querySelector("button")?.textContent || cell?.textContent || "");
    }
    function dashboardTableColumnIndex(wrapper, label) {
      const wanted = normalizeFilterText(label);
      return Array.from(wrapper?.querySelectorAll("thead tr:first-child th") || []).findIndex((cell) => {
        const header = dashboardTableHeaderLabel(cell);
        return header === wanted || (!header.startsWith("jenkins ") && header.endsWith(` ${wanted}`));
      });
    }
    function dashboardTableCellForHeader(row, label) {
      const index = dashboardTableColumnIndex(row?.closest("[data-filter-table]"), label);
      return index < 0 ? null : row.querySelectorAll("td[data-filter-value]")[index] || null;
    }
    // Follow WMS identity/content/contact order, then retain Analytics-only fields.
    // Missing WMS fields are skipped; presentation never adds or removes columns.
    const rankedTableColumnOrder = ['LiveLabs ID', 'WMS ID', 'Title', 'Council', 'Production URL', 'Completion Date', 'Last Update', 'Author', 'Author Email', 'Author / owner', 'Support Contact Email', '#', 'Type', 'Review status', 'Views 12m', 'Views 90d', 'Score', 'Errors Found'];
    function rankedTableDisplayLabel(label) {
      const normalized = normalizeFilterText(label);
      if (["category", "council area"].includes(normalized)) return "Council";
      if (normalized === "last meaningful update") return "Last Update";
      if (["score", "review score", "retire score"].includes(normalized)) return "Score";
      if (normalized === "jenkins priority") return "Errors Found";
      return label;
    }
    function normalizeRankedTablePresentation(root = document) {
      if (!root?.querySelector) return;
      [...jenkinsRankedTableConfigs, {id:'jenkins-p1-action-table', mode:'urgent'}].forEach((config) => {
        const selector = `[data-filter-table="${config.id}"]`;
        const wrapper = root.matches?.(selector) ? root : root.querySelector(selector);
        const table = wrapper?.querySelector("table");
        const headerRow = table?.querySelector("thead tr:first-child");
        if (!wrapper || !table || !headerRow) return;
        const entries = Array.from(headerRow.children).map((cell, currentIndex) => {
          if (cell.dataset.rankedSourceColumnIndex === undefined) cell.dataset.rankedSourceColumnIndex = String(currentIndex);
          const originalLabel = (cell.querySelector(".sort-button")?.textContent || cell.textContent || "").trim();
          const label = rankedTableDisplayLabel(originalLabel);
          const button = cell.querySelector(".sort-button");
          if (button && label !== originalLabel) {
            button.textContent = label;
            button.title = `Sort by ${label}`;
          }
          const orderIndex = rankedTableColumnOrder.findIndex((candidate) => normalizeFilterText(candidate) === normalizeFilterText(label));
          return { cell, currentIndex, label, sourceIndex: Number(cell.dataset.rankedSourceColumnIndex), orderIndex: orderIndex < 0 ? rankedTableColumnOrder.length : orderIndex };
        }).sort((left, right) => left.orderIndex - right.orderIndex || left.currentIndex - right.currentIndex);
        const newIndexByCurrentIndex = new Map();
        entries.forEach((entry, newIndex) => {
          newIndexByCurrentIndex.set(entry.currentIndex, newIndex);
          entry.cell.dataset.sortColumnIndex = String(newIndex);
          entry.cell.dataset.columnLabel = entry.label;
          const button = entry.cell.querySelector(".sort-button");
          if (button) button.dataset.columnIndex = String(newIndex);
          headerRow.appendChild(entry.cell);
        });
        const targetColumnOrder = entries.map((entry) => entry.sourceIndex);
        table.querySelectorAll('tbody tr[data-filter-row="true"]').forEach((row) => {
          const rowCells = Array.from(row.children).filter((cell) => cell.tagName === "TD");
          if (rowCells.length !== entries.length) return;
          let currentColumnOrder = row.dataset.rankedColumnOrder
            ? row.dataset.rankedColumnOrder.split(",").map(Number)
            : Array.from({ length: rowCells.length }, (_, index) => index);
          const currentSet = new Set(currentColumnOrder);
          entries.forEach((entry) => {
            if (!currentSet.has(entry.sourceIndex)) currentColumnOrder.push(entry.sourceIndex);
          });
          if (currentColumnOrder.length !== rowCells.length) return;
          const orderedCells = targetColumnOrder.map((sourceIndex) => rowCells[currentColumnOrder.indexOf(sourceIndex)]);
          if (orderedCells.some((cell) => !cell)) return;
          orderedCells.forEach((cell, index) => { cell.dataset.columnLabel = entries[index].label; row.appendChild(cell); });
          row.dataset.rankedColumnOrder = targetColumnOrder.join(",");
        });
        wrapper.closest(".toggle-body")?.querySelectorAll(`[data-table-filter="${config.id}"]`).forEach((control) => {
          if (control.dataset.columnIndex === undefined) return;
          const oldIndex = Number(control.dataset.columnIndex);
          const newIndex = newIndexByCurrentIndex.get(oldIndex);
          if (newIndex === undefined) return;
          control.dataset.columnIndex = String(newIndex);
          const label = entries[newIndex]?.label;
          const fieldLabel = control.closest(".filter-field")?.querySelector("span");
          if (label && fieldLabel) {
            fieldLabel.textContent = label;
            if (control.tagName.toLowerCase() !== "select") control.placeholder = `Filter ${label}`;
            else if (normalizeFilterText(label) === "council" && control.options[0]) control.options[0].textContent = "All councils";
          }
        });
        const body = wrapper.closest('.toggle-body');
        const grid = body?.querySelector('.filter-grid');
        if (grid) {
          [...grid.children].sort((a,b) => Number(a.querySelector('[data-column-index]')?.dataset.columnIndex ?? 999) - Number(b.querySelector('[data-column-index]')?.dataset.columnIndex ?? 999)).forEach(field => grid.append(field));
        }
        const typeSelect = body?.querySelector(`[data-table-filter="${config.id}"][data-filter-mode="content-type"]`);
        if (typeSelect) {
          typeSelect.setAttribute('aria-label', 'Content type');
          const labels = {'':'All items', Workshop:'Workshops only', Sprint:'Sprints only'};
          [...typeSelect.options].forEach(option => {
            const value = option.value;
            option.value = value;
            option.textContent = labels[value] || option.textContent;
          });
          const label = typeSelect.closest('label');
          label.classList.add('table-type-filter');
          let typeBar = body.querySelector('.table-content-type-controls');
          if (!typeBar) {
            typeBar = document.createElement('div');
            typeBar.className = 'table-content-type-controls';
            body.insertBefore(typeBar, body.querySelector('.filter-disclosure') || wrapper);
          }
          typeBar.append(label);
        }
        table.querySelectorAll('tbody tr[data-filter-row="true"]').forEach(row => {
          if (config.mode === 'urgent') return;
          const detail = detailRowFor(row);
          if (!detail) return;
          let link = detail.querySelector('a[href*="/search/"]');
          if (!link && row.dataset.livelabsId) { link = document.createElement('a'); detail.querySelector('.detail-shell')?.append(link); }
          if (link && row.dataset.livelabsId) {
            link.href = recordLink({livelabsId:row.dataset.livelabsId}, config.mode);
            link.className = 'author-button author-button-primary'; link.textContent = 'Open record';
          }
        });
        const existingSortIndex = Number(wrapper.dataset.sortColumnIndex);
        if (newIndexByCurrentIndex.has(existingSortIndex)) wrapper.dataset.sortColumnIndex = String(newIndexByCurrentIndex.get(existingSortIndex));
      });
    }
    function ensureJenkinsTableColumns(wrapper) {
      const table = wrapper?.querySelector('table');
      const header = table?.querySelector('thead tr');
      if (!header) return null;
      if (wrapper.dataset.analyticsColumnCount === undefined) {
        wrapper.dataset.analyticsColumnCount = String(header.children.length);
        wrapper.dataset.analyticsSortColumnIndex = wrapper.dataset.sortColumnIndex || '';
        wrapper.dataset.analyticsSortDirection = wrapper.dataset.sortDirection || 'none';
      }
      if (!header.querySelector('[data-jenkins-column="priority"]')) {
        const index = header.children.length;
        const cell = document.createElement('th');
        cell.dataset.jenkinsColumn = 'priority';
        cell.dataset.rankedSourceColumnIndex = String(index);
        cell.dataset.sortType = 'text';
        cell.innerHTML = `<button class="sort-button" type="button" data-sort-table="${wrapper.dataset.filterTable}" data-column-index="${index}" data-default-direction="asc">Errors Found</button>`;
        header.append(cell);
        const grid = wrapper.closest('.toggle-body')?.querySelector('.filter-grid');
        if (grid) grid.insertAdjacentHTML('beforeend', `<label class="filter-field" data-jenkins-filter="priority"><span>Errors Found</span><input type="search" placeholder="Filter P1, P2, or P3" data-table-filter="${wrapper.dataset.filterTable}" data-column-index="${index}"></label>`);
      }
      table.querySelectorAll('tbody tr[data-filter-row="true"]').forEach(row => {
        if (row.dataset.analyticsOriginalIndex === undefined) row.dataset.analyticsOriginalIndex = row.dataset.originalIndex || '0';
        if (!row.querySelector('[data-jenkins-column="priority"]')) {
          const cell = document.createElement('td');
          cell.dataset.jenkinsColumn = 'priority'; cell.dataset.filterValue = ''; cell.dataset.sortValue = ''; row.append(cell);
        }
      });
      normalizeRankedTablePresentation(wrapper);
      table.querySelectorAll('tbody tr.detail-row td[colspan]').forEach(cell => { cell.colSpan = header.children.length; });
      return {table, scoreIndex: dashboardTableColumnIndex(wrapper, 'Score'), priorityIndex: dashboardTableColumnIndex(wrapper, 'Errors Found')};
    }
    function tableRecordId(row, columnIndex) {
      return String(row?.querySelectorAll('td[data-filter-value]')?.[columnIndex]?.dataset?.filterValue || "").trim();
    }
    function mergeScoreForTable(config, baseline, sourceOverlay) {
      if (!Number.isFinite(baseline)) return null;
      const configuredShare = Number(dashboardQaReportMerge?.summary?.scorePolicy?.tableShare ?? 0.25);
      const jenkinsShare = Math.min(0.45, Math.max(0.05, Number.isFinite(configuredShare) ? configuredShare : 0.25));
      if (config.mode === "performance") {
        const error = sourceOverlay?.jenkinsErrorScore == null ? null : Number(sourceOverlay.jenkinsErrorScore);
        return error != null && Number.isFinite(error) ? baseline * (1 - jenkinsShare) + (100 - error) * jenkinsShare : baseline;
      }
      if (config.mode === "risk") {
        const error = sourceOverlay?.jenkinsErrorScore == null ? null : Number(sourceOverlay.jenkinsErrorScore);
        return error != null && Number.isFinite(error) ? baseline * (1 - jenkinsShare) + error * jenkinsShare : baseline;
      }
      return null;
    }
    const reviewFocusLabels = ['Lifecycle', 'Low demand', 'Older updates', 'Needs evidence', 'QA issues', 'Missing contact', 'Keep active', 'New content'];
    function focusBadges(tags) {
      return `<span class="review-focus-tags">${tags.map(tag => `<span class="review-focus-tag">${escapeHtml(tag)}</span>`).join('') || '<span class="muted">—</span>'}</span>`;
    }
    function reviewFocusForRecord(record) {
      const tags = [...(record?.review?.focusTags || [])];
      const qa = dashboardQaReportMerge?.overlay?.[String(record?.livelabsId || '')];
      if (qa?.findings?.length) tags.push('QA issues');
      return [...new Set(tags)];
    }
    function updateRowReviewFocus(row, overlay) {
      if (!row.dataset.baseReviewFocus) row.dataset.baseReviewFocus = row.dataset.reviewFocus || '[]';
      const tags = JSON.parse(row.dataset.baseReviewFocus);
      if (overlay?.findings?.length) tags.push('QA issues');
      row.dataset.reviewFocus = JSON.stringify([...new Set(tags)]);
      const cell = row.querySelector('[data-review-focus-cell]');
      if (cell) {
        cell.innerHTML = focusBadges([...new Set(tags)]);
        cell.dataset.filterValue = cell.dataset.sortValue = tags.join(' | ').toLowerCase();
      }
    }
    function combinedTableControls(tableId) {
      return `<div class="review-table-controls"><label>Type <select aria-label="Type" data-table-filter="${tableId}" data-filter-mode="content-type"><option value="">All types</option><option>Workshop</option><option>Sprint</option></select></label><fieldset class="review-focus-filter"><legend>Review focus <small>choose any</small></legend>${reviewFocusLabels.map(tag => `<label class="focus-choice"><input type="checkbox" value="${tag}" data-table-filter="${tableId}" data-filter-mode="review-focus">${tag}</label>`).join('')}</fieldset></div>`;
    }
    function humanReadableJenkinsFinding(issue) {
      const label = String(issue?.label || issue?.code || "").trim();
      if (!label || issue?.label) return label;
      return label.replace(/[_-]+/g, " ").toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
    }
    function jenkinsColumnValue(overlay, withScore = false) {
      if (!overlay) return withScore ? "" : "No Jenkins report";
      const score = overlay.jenkinsErrorScore;
      if (withScore) return score == null ? "N/A" : Number(score).toFixed(2);
      const counts = overlay.priorityCounts || {};
      const findings = Array.isArray(overlay.findings) ? overlay.findings : [];
      const priorityLabels = [
        ["p1", "P1", "urgent"],
        ["p2", "P2", "review needed"],
        ["p3", "P3", "minor"]
      ];
      const parts = priorityLabels.flatMap(([key, priority, meaning]) => {
        const findingCount = findings.filter((issue) => issue.priority === priority).length;
        const count = Math.max(Number(counts[key] || 0), findingCount);
        return count ? [`${priority}: ${count} ${meaning}`] : [];
      });
      const unmapped = Number(counts.unmapped || 0);
      if (unmapped) parts.push(`Unclassified: ${unmapped} · review with QA`);
      const issues = Array.from(new Set(findings.map(humanReadableJenkinsFinding).filter(Boolean))).slice(0, 2);
      const summary = parts.join(" · ") || "No P1/P2/P3 findings reported";
      return issues.length ? `${summary} — ${issues.join(", ")}` : summary;
    }
    function rankedTableSourceScoreCell(row, config) {
      if (!config.scoreHeader) return null;
      const index = dashboardTableColumnIndex(row.closest("[data-filter-table]"), config.scoreHeader);
      const cell = index < 0 ? null : row.querySelectorAll('td[data-filter-value]')[index];
      if (!cell) return null;
      if (cell.dataset.analyticsBaseline === undefined) cell.dataset.analyticsBaseline = cell.dataset.sortValue || cell.textContent.trim();
      return cell;
    }
    function applyJenkinsMergeToRankedTables() {
      if (!dashboardQaReportMerge) return;
      const mergeId = String(dashboardQaReportMerge.id || dashboardQaReportMerge.appliedAt || "active");
      let anyUpdated = false;
      jenkinsRankedTableConfigs.forEach((config) => {
        const wrapper = document.querySelector(`[data-filter-table="${config.id}"]`);
        if (!wrapper || wrapper.dataset.jenkinsMergeId === mergeId) return;
        const columns = ensureJenkinsTableColumns(wrapper);
        if (!columns) return;
        anyUpdated = true;
        const idIndex = dashboardTableColumnIndex(wrapper, config.idHeader);
        const originalIndex = config.scoreHeader ? dashboardTableColumnIndex(wrapper, config.scoreHeader) : -1;
        const rows = Array.from(columns.table.querySelectorAll('tbody tr[data-filter-row="true"]'));
        rows.forEach((row) => {
          const sourceId = tableRecordId(row, idIndex);
          const sourceOverlay = jenkinsOverlayForId(sourceId);
          updateRowReviewFocus(row, sourceOverlay);
          const priorityLabel = jenkinsColumnValue(sourceOverlay);
          const priorityCell = row.querySelector('[data-jenkins-column="priority"]');
          if (!priorityCell) return;
          priorityCell.dataset.filterValue = normalizeFilterText(priorityLabel);
          priorityCell.dataset.sortValue = normalizeFilterText(priorityLabel);
          priorityCell.textContent = priorityLabel;
          if (config.scoreHeader) {
            const baseCell = row.querySelectorAll('td[data-filter-value]')[originalIndex];
            if (baseCell.dataset.analyticsBaseline === undefined) {
              baseCell.dataset.analyticsBaseline = baseCell.dataset.sortValue || baseCell.textContent.trim();
              baseCell.dataset.analyticsFilterValue = baseCell.dataset.filterValue || "";
              baseCell.dataset.analyticsSortValue = baseCell.dataset.sortValue || "";
            }
            const baseline = Number.parseFloat(baseCell.dataset.analyticsBaseline);
          const blended = mergeScoreForTable(config, baseline, sourceOverlay);
            if (blended != null) {
              baseCell.textContent = blended.toFixed(2);
              baseCell.dataset.filterValue = normalizeFilterText(blended.toFixed(2));
              baseCell.dataset.sortValue = blended.toFixed(4);
            }
          }
        });
        const scoreSortIndex = config.scoreHeader ? dashboardTableColumnIndex(wrapper, config.scoreHeader) : columns.scoreIndex;
        wrapper.dataset.sortColumnIndex = String(scoreSortIndex >= 0 ? scoreSortIndex : columns.scoreIndex);
        wrapper.dataset.sortDirection = "desc";
        const sortedRows = rows.slice().sort((left, right) => {
          if (wrapper.dataset.reviewPriority === "true") {
            const bandDifference = Number(left.dataset.reviewOrder || 0) - Number(right.dataset.reviewOrder || 0);
            if (bandDifference) return bandDifference;
          }
          const a = Number.parseFloat(left.querySelectorAll('td[data-sort-value]')[scoreSortIndex >= 0 ? scoreSortIndex : columns.scoreIndex]?.dataset.sortValue || "");
          const b = Number.parseFloat(right.querySelectorAll('td[data-sort-value]')[scoreSortIndex >= 0 ? scoreSortIndex : columns.scoreIndex]?.dataset.sortValue || "");
          if (!Number.isFinite(a) && !Number.isFinite(b)) return Number(left.dataset.originalIndex || 0) - Number(right.dataset.originalIndex || 0);
          if (!Number.isFinite(a)) return 1;
          if (!Number.isFinite(b)) return -1;
          return b - a;
        });
        sortedRows.forEach((row, index) => {
          row.dataset.originalIndex = String(index);
          const rankCell = row.querySelector('td[data-column-label="#"]');
          if (rankCell) {
            rankCell.textContent = String(index + 1);
            rankCell.dataset.filterValue = String(index + 1);
            rankCell.dataset.sortValue = String(index + 1);
          }
          columns.table.querySelector("tbody")?.appendChild(row);
          const detailRow = detailRowFor(row);
          if (detailRow) columns.table.querySelector("tbody")?.appendChild(detailRow);
        });
        wrapper.dataset.jenkinsMergeId = mergeId;
      });
      if (!anyUpdated) return;
      refreshInitializedTableStates({ resetPage: true });
    }
    function clearJenkinsRankedTableMerge() {
      let cleared = false;
      jenkinsRankedTableConfigs.forEach((config) => {
        const wrapper = document.querySelector(`[data-filter-table="${config.id}"][data-jenkins-merge-id]`);
        const table = wrapper?.querySelector("table");
        const headerRow = table?.querySelector("thead tr:first-child");
        if (!wrapper || !table || !headerRow) return;
        cleared = true;
        const scoreIndex = config.scoreHeader ? dashboardTableColumnIndex(wrapper, config.scoreHeader) : -1;
        table.querySelectorAll('tbody tr[data-filter-row="true"]').forEach((row) => {
          if (config.scoreHeader && scoreIndex >= 0) {
            const scoreCell = row.querySelectorAll('td[data-filter-value]')[scoreIndex];
            if (scoreCell?.dataset.analyticsBaseline !== undefined) {
              scoreCell.textContent = scoreCell.dataset.analyticsBaseline;
              scoreCell.dataset.filterValue = scoreCell.dataset.analyticsFilterValue || "";
              scoreCell.dataset.sortValue = scoreCell.dataset.analyticsSortValue || "";
              delete scoreCell.dataset.analyticsBaseline;
              delete scoreCell.dataset.analyticsFilterValue;
              delete scoreCell.dataset.analyticsSortValue;
            }
          }
          const rankCell = row.querySelector('td[data-column-label="#"]');
          if (rankCell?.dataset.analyticsRank !== undefined) {
            rankCell.textContent = rankCell.dataset.analyticsRank;
            rankCell.dataset.filterValue = rankCell.dataset.analyticsRankFilter || rankCell.dataset.analyticsRank;
            rankCell.dataset.sortValue = rankCell.dataset.analyticsRankSort || rankCell.dataset.analyticsRank;
            delete rankCell.dataset.analyticsRank;
            delete rankCell.dataset.analyticsRankFilter;
            delete rankCell.dataset.analyticsRankSort;
          }
          row.dataset.originalIndex = row.dataset.analyticsOriginalIndex || "0";
          delete row.dataset.analyticsOriginalIndex;
          updateRowReviewFocus(row, null);
          row.querySelectorAll('[data-jenkins-column]').forEach((cell) => cell.remove());
        });
        headerRow.querySelectorAll('[data-jenkins-column]').forEach((cell) => cell.remove());
        const staticColumnOrder = Array.from(headerRow.children, (cell) => cell.dataset.rankedSourceColumnIndex).join(",");
        table.querySelectorAll('tbody tr[data-filter-row="true"]').forEach((row) => { row.dataset.rankedColumnOrder = staticColumnOrder; });
        wrapper.closest(".toggle-body")?.querySelectorAll("[data-jenkins-filter]").forEach((field) => field.remove());
        table.querySelectorAll("tbody tr.detail-row").forEach((row) => {
          const colspan = row.querySelector("td[colspan]");
          if (colspan) colspan.colSpan = Number(wrapper.dataset.analyticsColumnCount || headerRow.children.length);
        });
        if (wrapper.dataset.analyticsSortColumnIndex) wrapper.dataset.sortColumnIndex = wrapper.dataset.analyticsSortColumnIndex;
        else delete wrapper.dataset.sortColumnIndex;
        wrapper.dataset.sortDirection = wrapper.dataset.analyticsSortDirection || "none";
        ["analyticsColumnCount", "analyticsSortColumnIndex", "analyticsSortDirection", "jenkinsMergeId"].forEach((key) => { delete wrapper.dataset[key]; });
      });
      if (cleared) refreshInitializedTableStates({ resetPage: true });
    }
    function ownersForJenkinsQueue() {
      const owners = new Map();
      [inventoryRecordByKey, searchRecordByKey].forEach((records) => records.forEach((record) => {
        const id = String(record?.livelabsId || "").trim();
        if (id && record?.owner && !owners.has(id)) owners.set(id, record.owner);
      }));
      document.querySelectorAll('tr[data-filter-row="true"]').forEach((row) => {
        const values = rowValuesByHeader(row);
        const id = String(values.get("LiveLabs ID") || "").trim();
        const owner = values.get("Author Email") || values.get("Owner Email") || values.get("Owner");
        if (id && owner && !owners.has(id)) owners.set(id, owner);
      });
      return owners;
    }
    function jenkinsPriorityGuideMarkup() {
      return `<details class="panel toggle-panel jenkins-priority-guide"><summary class="panel-head"><h3>What P1 priority means</h3></summary><div class="toggle-body"><p>P1 findings may stop learners. <strong>Author fix</strong> means check the evidence and fix the issue. <strong>Verify report</strong> means confirm the finding first.</p><p>One row represents one item. Open it for individual findings. P1 does not change the score or approve retirement.</p></div></details>`;
    }
    function renderJenkinsP1ActionQueue() {
      const anchor = document.getElementById('jenkins-p1-slot');
      if (!anchor) return;
      let section = document.getElementById('jenkins-p1-action-queue');
      if (!section) {
        section = document.createElement('section'); section.id = 'jenkins-p1-action-queue';
        section.className = 'section jenkins-p1-section'; section.dataset.dashboardPage = 'urgent'; anchor.append(section);
      }
      const mergeId = String(dashboardQaReportMerge?.id || dashboardQaReportMerge?.appliedAt || 'no-report');
      if (section.dataset.mergeId === mergeId) return;
      const tableId = 'jenkins-p1-action-table';
      const records = new Map(loadedFullSearchRecords.map(record => [String(record.livelabsId), record]));
      const items = Object.entries(dashboardQaReportMerge?.overlay || {}).filter(([id]) => publicLivelabsIds.has(id))
        .map(([id, overlay]) => ({id, overlay, record:records.get(id), findings:(overlay.findings || []).filter(issue => issue.priority === 'P1')})).filter(item => item.findings.length);
      const needsFix = issue => !(issue.group === 'verification-required' || /verify/i.test(issue.priorityLabel || ''));
      items.sort((a,b) => Number(b.findings.some(needsFix)) - Number(a.findings.some(needsFix)) || b.findings.length-a.findings.length || a.id.localeCompare(b.id));
      const columns = ['Title', 'Type', 'Action', 'P1 findings', 'Occurrences', 'Author / owner', 'LiveLabs ID', 'Record'];
      const headers = columns.map((label,index) => `<th data-column-label="${label}" data-sort-column-index="${index}" data-sort-type="${[3,4,6].includes(index) ? 'number':'text'}"><button class="sort-button" type="button" data-sort-table="${tableId}" data-column-index="${index}" data-default-direction="${[3,4].includes(index)?'desc':'asc'}">${label}</button></th>`).join('');
      const filters = columns.map((label,index) => `<label class="filter-field"><span>${label}</span><input aria-label="Filter ${label}" type="search" data-table-filter="${tableId}" data-column-index="${index}"></label>`).join('');
      const rows = items.map((item,index) => {
        const {id,overlay,record,findings} = item;
        const tags = reviewFocusForRecord(record); if (!tags.includes('QA issues')) tags.push('QA issues');
        const actions = [...new Set(findings.map(issue => needsFix(issue) ? 'Author fix' : 'Verify report'))];
        const occurrences = findings.reduce((sum,issue) => sum + Math.max(0,Number(issue.count || 0)),0);
        const values = [record?.title || overlay.itemTitle || 'LiveLabs item',record?.type || 'Unknown',actions.join(' · '),findings.length,occurrences,record?.owner || 'Reviewer assignment needed',id,'Open record'];
        const cells = values.map((value,i) => `<td data-column-label="${columns[i]}" data-filter-value="${escapeHtml(String(value).toLowerCase())}" data-sort-value="${escapeHtml(value)}">${i===7 ? `<a class="author-button author-button-primary" href="/search/?livelabs_id=${encodeURIComponent(id)}">Open record</a>` : escapeHtml(value)}</td>`).join('');
        const details = findings.map(issue => `<li><strong>${escapeHtml(humanReadableJenkinsFinding(issue))}</strong> · ${needsFix(issue)?'Author fix':'Verify report'} · ${Math.max(0,Number(issue.count||0))} occurrences<p>${escapeHtml(issue.message || 'Open the record for source evidence.')}</p></li>`).join('');
        return `<tr class="expandable-row" data-filter-row="true" data-livelabs-id="${id}" data-content-type="${escapeHtml(record?.type || '')}" data-review-focus="${escapeHtml(JSON.stringify(tags))}" data-original-index="${index}" data-detail-row-id="p1-${id}" data-expanded="false" tabindex="0" aria-expanded="false">${cells}</tr><tr class="detail-row" data-detail-for="p1-${id}" hidden><td colspan="8"><div class="detail-shell"><h4>P1 findings for ${escapeHtml(values[0])}</h4><ul>${details}</ul><a class="author-button author-button-primary" href="/search/?livelabs_id=${encodeURIComponent(id)}">Open full record and evidence</a></div></td></tr>`;
      }).join('');
      const findingCount = items.reduce((sum,item)=>sum+item.findings.length,0);
      section.innerHTML = `<div class="section-head"><h2>P1 urgent action</h2><p>Review findings that may stop learners.</p></div>${jenkinsPriorityGuideMarkup()}<section class="panel ranked-table-panel"><div class="panel-head"><h3>P1 urgent action</h3><span>${items.length} rows · ${findingCount} findings</span></div><div class="toggle-body"><div class="table-tools"><span class="table-count" data-table-count-for="${tableId}">${items.length} rows</span><button class="filter-reset" data-clear-filters-for="${tableId}">Clear filters</button></div><details class="filter-disclosure"><summary>Apply filters</summary>${combinedTableControls(tableId)}<div class="filter-grid">${filters}</div></details><div class="table-wrap" data-filter-table="${tableId}"><table class="data-table" id="${tableId}"><thead><tr>${headers}</tr></thead><tbody>${rows || `<tr><td colspan="8">${dashboardQaReportMerge ? 'No P1 findings in the applied report.' : 'Add a Jenkins report in Admin to see P1 findings.'}</td></tr>`}</tbody></table></div></div></section>`;
      section.dataset.mergeId = mergeId;
      normalizeRankedTablePresentation(section);
      applyRankedTableDisclosures(); decorateDashboardCopyTargets(section);
      applyDashboardPageView(document.body.dataset.dashboardPage || 'performance');
      initializeTablesIn(section, {force:true});
    }
    function applyJenkinsDashboardMerge() {
      applyJenkinsMergeToLoadedRecords();
      updateJenkinsScoreExplanations();
      if (!dashboardQaReportMerge) clearJenkinsRankedTableMerge();
      renderJenkinsP1ActionQueue();
      applyJenkinsMergeToRankedTables();
      applyPortfolioStatsSummary();
      tableSearchRecordsCache = null;
      refreshDashboardSearch();
      if (loadedFullSearchRecords.length) renderAllDataTable();
      if (dashboardQaReportMerge) refreshRenderedSearchDetail();
    }
    async function fetchDashboardState() {
      try {
        const response = await fetch('/api/dashboard-admin-state', {cache:'no-store'});
        if (response.ok) return await response.json();
      } catch { /* A static release has no API. */ }
      try {
        const response = await fetch(new URL('./assets/data/dashboard-state.json', document.baseURI), {cache:'no-store'});
        return response.ok ? await response.json() : null;
      } catch { return null; }
    }
    function ensureDashboardQaMergeLoaded() {
      if (dashboardQaReportMerge) return Promise.resolve(dashboardQaReportMerge);
      return fetchDashboardState()
        .then((payload) => {
          dashboardQaReportMerge = payload?.qaReportMerge || null;
          if (dashboardQaReportMerge) applyJenkinsMergeToLoadedRecords();
          return dashboardQaReportMerge;
        })
        .catch(() => dashboardQaReportMerge);
    }
    function refreshRenderedSearchDetail() {
      const view = document.querySelector(".search-workshop-view");
      const identity = readSearchUrlState();
      if (!view || !view.querySelector(".search-view-header") || !hasSearchIdentity(identity)) return;
      const record = resolveSearchRecordIdentity(Array.from(searchRecordByKey.values()), identity).record;
      if (record) renderSearchDetail(record, { updateUrl: false });
    }
    function reloadDashboardJenkinsMerge() {
      fetchDashboardState()
        .then((payload) => {
          dashboardQaReportMerge = payload?.qaReportMerge || null;
          applyJenkinsDashboardMerge();
        })
        .catch(() => {});
    }
    function observeJenkinsDashboardTables() {
      if (window.__jenkinsDashboardMergeObserver || !document.body) return;
      window.__jenkinsDashboardMergeObserver = new MutationObserver(() => {
        if (!dashboardQaReportMerge) return;
        renderJenkinsP1ActionQueue();
        applyJenkinsMergeToRankedTables();
      });
      window.__jenkinsDashboardMergeObserver.observe(document.body, { childList: true, subtree: true });
    }
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
      const allowedColors = new Set(["teal", "blue", "purple", "green", "amber", "red", "slate"]);
      return (Array.isArray(tags) ? tags : [])
        .map((tag) => {
          const label = String(tag?.label || formatOverrideStatus(tag?.key || "")).trim();
          const requestedKey = tagKeyFor(tag?.key || label);
          if (!label || !requestedKey || tagKeyBlocklist.has(requestedKey)) return null;
          const key = uniqueTagKey(requestedKey, seen);
          seen.add(key);
          const requestedColor = String(tag?.color || "teal").toLowerCase();
          return {
            key,
            label,
            description: String(tag?.description || tag?.note || ""),
            className: String(tag?.className || defaultTagClassByKey.get(key) || ""),
            color: allowedColors.has(requestedColor) ? requestedColor : "teal"
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
      return tagDefinitionsForState(dashboardAdminState).find((tag) => tag.key === key) || { key, label: formatOverrideStatus(key), description: "", className: "", color: "teal" };
    }
    function tagPillsHtml(tags = []) {
      const cleaned = sanitizeAssignedTags(tags, tagDefinitionsForState(dashboardAdminState));
      if (!cleaned.length) return "";
      return `<span class="governance-group-list">${cleaned.map((tagKey) => {
        const tag = tagDefinitionFor(tagKey);
        return `<span class="governance-group-pill ${escapeHtml(tag.className || "")} tag-tone-${escapeHtml(tag.color || "teal")}" data-admin-tag="${escapeHtml(tag.key)}"${tag.description ? ` title="${escapeHtml(tag.description)}"` : ""}>${escapeHtml(tag.label)}</span>`;
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
        tagsOnly: override?.tagsOnly === true,
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
      link.href = "/admin";
      link.title = session
        ? `Open admin panel as ${session.email || session.name || "admin"}`
        : "Sign in to open the admin panel";
      link.setAttribute("aria-label", link.title);
      link.addEventListener("click", (event) => {
        const cachedSession = refreshCachedAdminSession(readDashboardSession());
        if (!cachedSession) return;
        event.preventDefault();
        window.location.href = "/admin";
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
      const titleCell = dashboardTableCellForHeader(row, "Title");
      if (!titleCell || titleCell.querySelector(".qa-exception-badge")) return;
      const badge = document.createElement("span");
      badge.className = `qa-exception-badge ${extraClass}`.trim();
      badge.textContent = label;
      titleCell.appendChild(document.createTextNode(" "));
      titleCell.appendChild(badge);
    }
    const noAuthorRetirementTableIds = new Set(['at-risk-table', 'retirement-review-table']);
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
      if (row) {
        const headers = element.closest("table")?.querySelectorAll("thead th");
        return headers?.[element.cellIndex]?.textContent?.trim() || "value";
      }
      const definition = element.closest("div");
      return definition?.querySelector("dt")?.textContent?.trim() || "";
    }
    function detailReportText(element) {
      if (!element) return "";
      const clone = element.cloneNode(true);
      clone.querySelectorAll("[data-copy-value]").forEach((button) => button.remove());
      clone.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
      clone.querySelectorAll(".subtle").forEach((node) => node.prepend("\n"));
      return (clone.textContent || "").trim();
    }
    function decorateDetailCopyTargets(root = document) {
      root.querySelectorAll?.(".search-result-card dd, .search-meta-list dd, .search-detail-panel td").forEach((element) => {
        if (element.querySelector("[data-copy-value]")) return;
        const text = detailReportText(element);
        if (!text) return;
        const label = element.matches("h2") ? "Workshop/Sprint Title"
          : element.matches(".search-kicker") ? "Content Type"
          : element.matches(".search-view-subtitle") ? "Page context"
          : detailFieldLabelForElement(element) || "Section information";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "copy-value-button";
        button.dataset.copyValue = text;
        button.setAttribute("aria-label", `Copy ${label}`);
        button.title = `Copy ${label}`;
        button.textContent = "Copy";
        element.classList.add("search-copy-target");
        element.append(button);
      });
    }
    // A rectangular report preserves the page's section order and table row groups.
    function searchDetailReportRows(view) {
      const rows = [["Section", "Row", "Field", "Value"]];
      const add = (section, row, field, value) => rows.push([section, row, field, value]);
      add("Page Overview", "", "Content Type", detailReportText(view.querySelector(".search-kicker")));
      add("Page Overview", "", "Title", detailReportText(view.querySelector("h2")));
      const context = detailReportText(view.querySelector(".search-view-subtitle"));
      if (context) add("Page Overview", "", "Context", context);
      view.querySelectorAll(".search-result-card").forEach((card) => {
        add("Summary", "", detailReportText(card.querySelector("dt")), detailReportText(card.querySelector("dd")));
      });
      view.querySelectorAll(".search-detail-panel, [data-report-section]").forEach((panel) => {
        const belongsToSection = (element) => element.closest(".search-detail-panel, [data-report-section]") === panel && !element.closest(".author-check");
        const section = detailReportText(panel.querySelector("h3"));
        Array.from(panel.querySelectorAll(".panel-head > span, .note")).filter(belongsToSection).forEach((element) => {
          add(section, "", element.matches(".note") ? "Note" : "Count", detailReportText(element));
        });
        Array.from(panel.querySelectorAll("dl > div")).filter(belongsToSection).forEach((item) => {
          add(section, "", detailReportText(item.querySelector("dt")), detailReportText(item.querySelector("dd")));
        });
        Array.from(panel.querySelectorAll("table")).filter(belongsToSection).forEach((table) => {
          const headers = Array.from(table.querySelectorAll("thead th"), detailReportText);
          table.querySelectorAll("tbody tr").forEach((row, index) => {
            const cells = Array.from(row.querySelectorAll("td"));
            const label = row.querySelector("th");
            if (label && cells.length > 1) {
              cells.forEach((cell, column) => add(section, String(index + 1), `${detailReportText(label)} / ${headers[column + 1] || `Column ${column + 1}`}`, detailReportText(cell)));
            } else if (label) {
              add(section, "", detailReportText(label), detailReportText(cells[0]));
            } else if (cells.length === 1 && cells[0].colSpan > 1) {
              add(section, "", "Note", detailReportText(cells[0]));
            } else {
              cells.forEach((cell, column) => add(section, String(index + 1), headers[column] || `Column ${column + 1}`, detailReportText(cell)));
            }
          });
        });
      });
      view.querySelectorAll('.author-check').forEach((check, index) => {
        const section = detailReportText(check.closest('.author-finding-group')?.querySelector('summary'));
        check.querySelectorAll('dt').forEach(dt => add(section, String(index + 1), detailReportText(dt), detailReportText(dt.nextElementSibling)));
        check.querySelectorAll('.author-target').forEach((target, targetIndex) => add(section, `${index + 1}.${targetIndex + 1}`, 'Affected content', detailReportText(target)));
        check.querySelectorAll('a[href]').forEach(link => add(section, String(index + 1), detailReportText(link), link.href));
      });
      return rows;
    }
    function reportCsvCell(value) {
      let text = value == null || String(value).trim() === "" ? "N/A" : String(value);
      // Keep spreadsheet applications from interpreting source text as a formula.
      if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    }
    function exportSearchDetailCsv(record, view) {
      const csv = "\uFEFF" + searchDetailReportRows(view)
        .map((row) => row.map(reportCsvCell).join(","))
        .join("\r\n") + "\r\n";
      const slug = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const identity = record.livelabsId ? `livelabs-${record.livelabsId}` : record.wmsId ? `wms-${record.wmsId}` : record.title;
      const filename = `${slug(record.type) || "content"}-${slug(identity).slice(0, 100) || "result"}-report.csv`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      const statusNode = document.getElementById("copy-status");
      if (statusNode) statusNode.textContent = `CSV report downloaded for ${record.title}`;
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
      const titleCell = dashboardTableCellForHeader(row, "Title");
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
      const titleCell = dashboardTableCellForHeader(row, "Title");
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
      const months = status.staleMonths === null ? "N/A (update date unavailable)" : `${status.staleMonths} months since update`;
      const reasonText = status.reasons.length ? status.reasons.join("; ") : "no demand-protection threshold met";
      return `Stale threshold match: ${months}. Demand protection: ${reasonText}. Review for refresh or keep-active handling before treating this as a clean retirement candidate.`;
    }
    function addDemandProtectedBadge(row) {
      if (authorFacingGovernanceTagsHidden) return;
      const titleCell = dashboardTableCellForHeader(row, "Title");
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
      if (override.target === "title") return override.tagsOnly
        ? normalizeFilterText(record.title || "") === needle
        : normalizeFilterText(record.title || "").includes(needle);
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
      const titleCell = dashboardTableCellForHeader(row, "Title");
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
      const titleCell = dashboardTableCellForHeader(row, "Title");
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
        const override = activeRowOverrides().find((item) => item.tagsOnly && item.target === "title"
          ? normalizeFilterText(adminMatchContextFor(row).title) === normalizeFilterText(item.value)
          : adminTargetMatches(row, item.target || "wms_id", item.value));
        if (!override) return;
        applyAdminFieldEdits(row, override);
        row.dataset.adminOverride = "true";
        if (!override.tagsOnly) row.dataset.adminStatus = override.status || "pending";
        const tags = sanitizeAssignedTags(override.tags, tagDefinitionsForState(dashboardAdminState));
        addAdminTagBadges(row, tags);
        const detailBody = detailRowFor(row)?.querySelector(".detail-table tbody");
        if (!detailBody) return;
        if (!override.tagsOnly) {
          const detail = document.createElement("tr");
          detail.dataset.adminOverrideDetail = "true";
          const status = override.status || "pending";
          const note = override.note || "No note provided.";
          detail.innerHTML = `<th>Admin Override</th><td>${escapeHtml(`${formatOverrideStatus(status)}. ${note}`)}</td>`;
          detailBody.prepend(detail);
        }
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
        ["portfolio-stats", "portfolioStats"]
      ];
      mappings.forEach(([sectionId, settingKey]) => {
        const visible = dashboardAdminState.sectionVisibility?.[settingKey] !== false;
        const section = document.getElementById(sectionId);
        if (section) {
          const pages = String(section.dataset.dashboardPage || "all").split(/\s+/);
          const pageVisible = pages.includes("all") || pages.includes(normalizeDashboardPage(document.body.dataset.dashboardPage));
          section.hidden = !visible || !pageVisible;
        }
        document.querySelectorAll(`a[href="#${sectionId}"], a[data-section-hash="#${sectionId}"]`).forEach((link) => {
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
        "Why This Rule Matched",
        "Why It Is Included Or Excluded",
        "Sprint Signal Reason",
        "Repo Slug",
        "Workshop Path",
        "Manifest Path",
        "Owner Group",
        "Manager Email",
        "Support Contact Email",
        "Tech Contact Email",
        "Ownership Status",
        "WMS Reported Owner Email (disputed)",
        "Ownership Review Evidence",
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
        <section class="search-detail-panel search-detail-panel-wide search-file-update-panel">
          <div class="panel-head">
            <h3>GitHub file updates</h3>
            <span>${record.fileUpdates.length} files</span>
          </div>
          <p class="note">Review Git update dates, acknowledgement dates, and the date check for each file.</p>
          <details class="search-disclosure"><summary><span>View file update details</span><span class="search-disclosure-count">${record.fileUpdates.length} files</span></summary><div class="search-disclosure-body"><div class="search-files-table-wrap">
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
          </div></div></details>
        </section>`;
    }
    function familyHtml(record) {
      const count = record.family?.siblings?.length || 0;
      return count ? `<details class="search-detail-panel search-detail-panel-wide search-family-panel" data-family-disclosure><summary><h3>Related records</h3><span>${count} with WMS ${escapeHtml(record.wmsId)}</span></summary><div class="search-family-records"></div></details>` : '';
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
    function writeSearchUrl({ query = "", record = null, identity = null, replace = true, route = "current", clearHash = null, scoreMode = null } = {}) {
      const url = new URL(location.href);
      const selectedIdentity = record ? canonicalRecordIdentity(record) : normalizeSearchIdentity(identity || {});
      const onInventory = /\/inventory(?:\/index\.html)?\/?$/i.test(url.pathname) || url.searchParams.get('view') === 'inventory';
      const inventoryFamilyFilter = onInventory && selectedIdentity.wmsId && !selectedIdentity.livelabsId && !selectedIdentity.contentKey;
      let destination = route;
      if (route === 'current') {
        if (hasSearchIdentity(selectedIdentity) && !inventoryFamilyFilter) destination = 'search';
        else if (!hasSearchIdentity(selectedIdentity) && /\/search(?:\/index\.html)?\/?$/i.test(url.pathname)) destination = 'dashboard';
      }
      if (destination === 'dashboard' || destination === 'search') {
        url.pathname = new URL(location.protocol === 'file:' ? 'index.html' : destination + '/', document.baseURI).pathname;
        url.searchParams.delete("view");
      }
      if (selectedIdentity.livelabsId) url.searchParams.set('score_context', scoreMode || scoreContext());
      else url.searchParams.delete('score_context');
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      ["livelabs_id", "wms_id", "content_key"].forEach((parameter) => url.searchParams.delete(parameter));
      if (selectedIdentity.livelabsId) url.searchParams.set("livelabs_id", selectedIdentity.livelabsId);
      if (selectedIdentity.wmsId) url.searchParams.set("wms_id", selectedIdentity.wmsId);
      if (selectedIdentity.contentKey) url.searchParams.set("content_key", selectedIdentity.contentKey);
      const shouldClearHash = clearHash ?? Boolean(query || hasSearchIdentity(selectedIdentity));
      if (shouldClearHash) url.hash = "";
      else if (!query && !hasSearchIdentity(selectedIdentity) && url.pathname === new URL('dashboard/', document.baseURI).pathname) {
        if (!url.searchParams.has("view")) url.searchParams.set("view", "performance");
        if (url.hash === "#overview") url.hash = "";
      }
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
    function qaEvidenceState(record) {
      const qa = record.qa;
      return qa ? (qa.match_status === "matched" ? qa.state : qa.match_status) : "not_observed";
    }
    function qaEvidenceHtml(record) {
      if (!record.qa) return "";
      const qa = record.qa;
      const rows = Array.from(record.details.entries()).filter(([label]) => label.startsWith("QA "));
      const warnings = qa.freshness_warnings?.length ? ` Source checks: ${qa.freshness_warnings.join("; ")}.` : "";
      return `<section class="search-detail-panel search-detail-panel-wide qa-evidence" data-qa-evidence>
        <div class="panel-head"><h3>QA source evidence</h3></div>
        <p class="note">${qa.mode === "pilot" ? "Local pilot. " : ""}The Jenkins Error Score reflects reported issue severity and counts, not the percentage of failed tests. Evidence without a confirmed QA status needs review.${escapeHtml(warnings)}</p>
        ${rows.length ? `<details class="search-disclosure"><summary><span>View QA evidence fields</span><span class="search-disclosure-count">${rows.length} fields</span></summary><div class="search-disclosure-body"><table class="search-detail-table"><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
      </section>`;
    }
    function qaReportOverlayHtml(record) {
      return window.LiveLabsAuthor.evidenceHtml(jenkinsOverlayForId(record.livelabsId));
    }
    function renderSearchDetail(record, { updateUrl = true, scoreMode = null } = {}) {
      if (updateUrl) {
        writeSearchUrl({ query: "", record, replace: false, route: "search", scoreMode });
        clearGlobalSearchUi();
        document.body.classList.remove("dashboard-inventory-active", "dashboard-tops-active");
      }
      const view = ensureSearchView();
      const score = recordScore(record);
      const summaryItems = [['Score', score == null ? 'N/A' : score.toFixed(2)], ['LiveLabs ID', record.livelabsId || 'N/A'], ['WMS ID', record.wmsId || 'N/A'], ['Last update', record.update || 'Unknown']];
      const scoreNote = scoreContext() === 'risk' ? 'Higher score means higher review priority.' : 'Higher score means stronger performance.';
      const governanceItems = governanceItemsFor(record);
      const updateLabels = new Set(["Update Evidence", "Latest GitHub Update", "Suggested Action", "Recommended Action", "Lifecycle State", "Workshop Path"]);
      const profileItems = governanceItems.filter(([label]) => !["WMS ID", "LiveLabs ID"].includes(label) && !updateLabels.has(label));
      const qaReportHtml = qaReportOverlayHtml(record);
      const scoreEvidenceHtml = window.LiveLabsAuthor.scoreHtml(authorScoreBaselines[String(record.livelabsId)], jenkinsOverlayForId(record.livelabsId), scoreContext());
      const metaListHtml = (items) => items.length ? `<dl class="search-meta-list">${items.map(([label, value]) => {
        const wide = ["Latest GitHub Update", "Workshop Path"].includes(label) || String(value).length > 48;
        return `<div${wide ? ` class="wide"` : ""}><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
      }).join("")}</dl>` : `<p class="note">No details were reported in this group.</p>`;
      const subtitle = [record.status || "", record.ownership?.status === "disputed" ? "Ownership needs review" : record.owner ? `WMS reported owner: ${record.owner}` : ""].filter(Boolean).join(" | ");
      view.innerHTML = `
        <div class="search-view-header">
          <div>
            <span class="search-kicker">${escapeHtml(record.type || "Portfolio result")}</span>
            <h2>${escapeHtml(record.title)}</h2>
            ${subtitle ? `<p class="search-view-subtitle">${escapeHtml(subtitle)}</p>` : ""}
          </div>
          <span class="search-view-actions">${window.LiveLabsAuthor.liveButton(record, jenkinsOverlayForId(record.livelabsId))}<button class="nav-link" type="button" data-copy-search-link>Copy link</button><details class="report-export-dropdown"><summary class="nav-link">Export report <span aria-hidden="true">▾</span></summary><div class="report-export-options"><button type="button" data-export-search-xlsx>Excel (.xlsx)</button><button type="button" data-export-search-csv>CSV (.csv)</button></div></details><button class="nav-link" type="button" data-back-dashboard>Back to Dashboard</button></span>
        </div>
        <details open class="search-detail-panel search-detail-panel-wide search-ownership-panel"><summary><h3>Ownership &amp; publishing</h3></summary>${metaListHtml(profileItems)}</details>
        <section class="search-summary-section" aria-label="Record summary"><p class="author-score-note">${scoreNote}${score == null ? " Required score inputs are unavailable." : ""} P1 remains a separate priority.</p><dl class="search-result-summary">
          ${summaryItems.map(([label, value]) => `<div class="search-result-card"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl></section>

        <div class="search-detail-grid${qaReportHtml ? " search-qa-source-grid" : ""}">
          ${qaReportHtml}
          ${scoreEvidenceHtml}
          <details class="search-detail-panel search-detail-panel-wide search-source-panel" data-report-section><summary><h3>Source details</h3></summary>
            <details class="search-disclosure"><summary><span>Dashboard row</span><span class="search-disclosure-count">${record.values.size} fields</span></summary><div class="search-disclosure-body"><table class="search-detail-table"><tbody>${sourceRowsHtml(record)}</tbody></table></div></details>
            <details class="search-disclosure"><summary><span>Additional source fields</span><span class="search-disclosure-count">${record.details.size} fields</span></summary><div class="search-disclosure-body"><table class="search-detail-table"><tbody>${fieldRowsHtml(record)}</tbody></table></div></details>
          </details>
        </div>
        <div class="search-detail-grid">
          ${fileUpdatesHtml(record)}
          ${familyHtml(record)}
        </div>`;
      view.querySelectorAll("[data-back-dashboard]").forEach((button) => {
        button.addEventListener("click", () => showDashboardView({ clearUrl: true }));
      });
      view.querySelectorAll("[data-copy-search-link]").forEach((button) => {
        button.addEventListener("click", () => copySearchLink(button));
      });
      const exportDropdown = view.querySelector(".report-export-dropdown");
      const closeExportDropdown = () => {
        exportDropdown.open = false;
        exportDropdown.querySelector("summary").focus();
      };
      view.exportMenuController?.abort();
      view.exportMenuController = new AbortController();
      document.addEventListener("click", (event) => {
        if (!exportDropdown.contains(event.target)) exportDropdown.open = false;
      }, { signal: view.exportMenuController.signal });
      exportDropdown.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { event.preventDefault(); closeExportDropdown(); }
      });
      exportDropdown.addEventListener("focusout", () => {
        window.setTimeout(() => {
          if (!exportDropdown.contains(document.activeElement)) exportDropdown.open = false;
        }, 0);
      });
      view.querySelector("[data-export-search-csv]").addEventListener("click", () => {
        closeExportDropdown();
        exportSearchDetailCsv(record, view);
      });
      view.querySelector("[data-export-search-xlsx]").addEventListener("click", () => {
        closeExportDropdown();
        const identity = record.livelabsId ? `livelabs-${record.livelabsId}` : `wms-${record.wmsId || "result"}`;
        window.LiveLabsExport.xlsx(searchDetailReportRows(view), `${String(record.type || "content").toLowerCase()}-${identity}-report.xlsx`);
      });
      view.querySelector('[data-family-disclosure]')?.addEventListener('toggle', event => {
        const disclosure = event.currentTarget;
        if (!disclosure.open || disclosure.dataset.loaded) return;
        disclosure.dataset.loaded = 'true';
        disclosure.querySelector('.search-family-records').innerHTML = (record.family.siblings || []).map(item => `<a class="family-record" href="${recordLink(item, scoreContext())}"><strong>${escapeHtml(item.title || 'Related record')}</strong><span>LiveLabs ${escapeHtml(item.livelabsId)}</span></a>`).join('');
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
    function clearGlobalSearchUi() {
      const searchInput = document.querySelector("#global-workshop-search");
      const resultsNode = document.querySelector("[data-search-results]");
      const statusNode = document.querySelector("[data-search-status]");
      const clearButton = document.querySelector("[data-search-clear]");
      if (searchInput) searchInput.value = "";
      if (resultsNode) resultsNode.innerHTML = "";
      if (statusNode) {
        statusNode.textContent = "";
        statusNode.hidden = true;
      }
      if (clearButton) clearButton.hidden = true;
    }
    function showDashboardView({ clearUrl = true } = {}) {
      const view = document.querySelector("#search-workshop-view");
      if (view) view.hidden = true;
      document.body.classList.remove("dashboard-search-active");
      clearGlobalSearchUi();
      document.querySelectorAll("[data-back-dashboard]").forEach((button) => {
        button.hidden = true;
      });
      if (clearUrl) writeSearchUrl();
    }
    function mountPrimarySearch() {
      const existing = document.querySelector(".primary-search-panel");
      const search = document.querySelector(".rail .sidebar-search");
      const header = document.querySelector("#overview");
      if (existing || !search || !header) return;
      const panel = document.createElement("section");
      panel.className = "primary-search-panel";
      panel.setAttribute("aria-label", "Search public workshops and sprints");
      panel.innerHTML = '<div class="primary-search-copy"><div class="primary-search-heading"><h2>Find a workshop or sprint</h2></div></div><div class="primary-search-control"></div>';
      panel.querySelector(".primary-search-control").append(search);
      header.append(panel);
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
        const result = document.createElement('article');
        result.className = 'author-search-result';
        const overlay = jenkinsOverlayForId(record.livelabsId);
        const findings = overlay?.findings || [];
        const score = recordScore(record, 'performance');
        const priorities = ['P1','P2','P3'].map(priority => { const count = findings.filter(item => item.priority === priority).length; return count ? `${count} ${priority}` : ''; }).filter(Boolean).join(' · ');
        result.innerHTML = `<div class="author-search-copy"><strong>${escapeHtml(record.title)}</strong><span>${escapeHtml(record.type)} · LiveLabs ${escapeHtml(record.livelabsId)}</span><span class="author-email" title="${escapeHtml(record.owner)}">${escapeHtml(record.owner)}</span><span>${escapeHtml(priorities || (overlay ? (findings.length ? 'Unclassified findings · review with QA' : 'No findings reported') : 'No QA report'))}</span></div><div class="author-search-score"><span>Score</span><strong>${score == null ? 'N/A' : score.toFixed(2)}</strong></div><div class="author-search-actions"><a class="author-button author-button-primary" href="${recordLink(record)}">Open record</a>${window.LiveLabsAuthor.liveButton(record, overlay)}</div>`;
        resultsNode.append(result);
      });
    }
    function applyRankedTableDisclosures() {
      document.querySelectorAll("section.panel.ranked-table-panel").forEach((panel) => {
        const panelHead = Array.from(panel.children).find((child) => child.classList?.contains("panel-head"));
        if (!panelHead) return;
        const disclosure = document.createElement("details");
        disclosure.className = "panel toggle-panel ranked-table-panel ranked-table-disclosure";
        disclosure.dataset.generatedDisclosure = "true";
        disclosure.open = false;
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
      document.querySelectorAll("[data-inventory-link], [data-dashboard-view='inventory']").forEach((item) => item.remove());
      document.getElementById("all-data-browser")?.remove();
      return;
      const navListForInventory = document.querySelector(".nav-list");
      if (navListForInventory && !navListForInventory.querySelector("[data-inventory-link]")) {
        const inventoryItem = document.createElement("a");
        inventoryItem.href = new URL(location.protocol === 'file:' ? 'inventory/index.html' : 'inventory', document.baseURI).href;
        inventoryItem.dataset.inventoryLink = "true";
        inventoryItem.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"></path><path d="M5 9h14"></path><path d="M5 14h14"></path><path d="M10 4v16"></path></svg><span>Portfolio Inventory</span>`;
        const topPerformers = navListForInventory.querySelector('a[href="#top-performers"]');
        navListForInventory.insertBefore(inventoryItem, topPerformers || navListForInventory.firstChild);
      }
      const navList = document.querySelector(".nav-list");
      if (navList) {
        navList.querySelectorAll('[data-dashboard-view="tops"]').forEach((item) => item.remove());
        const dashboardLink = navList.querySelector('[data-dashboard-view="performance"]') || navList.querySelector('[data-dashboard-view="overview"]') || navList.querySelector('a[href="#overview"]');
        if (dashboardLink) {
          dashboardLink.dataset.dashboardView = "performance";
          const label = dashboardLink.querySelector("span");
          if (label) label.textContent = "Dashboard";
        }
        if (!navList.querySelector('[data-inventory-link]')) {
          const inventoryItem = document.createElement("a");
          inventoryItem.href = new URL(location.protocol === 'file:' ? 'inventory/index.html' : 'inventory', document.baseURI).href;
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
        section.dataset.dashboardPage = "inventory";
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
                  <label class="filter-field" for="all-data-jenkins-data"><span>Jenkins data</span><select id="all-data-jenkins-data"><option value="">All records</option><option value="reported">Report applied</option><option value="issues">Has findings</option><option value="no-report">No report</option></select></label>
                  <label class="filter-field" for="all-data-jenkins-priority"><span>Jenkins priority</span><select id="all-data-jenkins-priority"><option value="">All priorities</option><option value="P1">P1 · urgent</option><option value="P2">P2 · review</option><option value="P3">P3 · minor</option><option value="unmapped">Unmapped</option></select></label>
                </div>
                ${allDataControlsHtml("top")}
                <div class="table-wrap">
                  <table id="all-content-data-table" class="all-data-table">
                    <thead><tr><th class="all-data-row-number">#</th><th>Title</th><th>Type</th><th>Publish Status</th><th>Publish Type</th><th>WMS ID</th><th>LiveLabs ID</th><th>Category</th><th>Contact</th><th>Analytics QA Error Score</th><th>Jenkins Error Score</th><th>Jenkins Priority</th><th>QA Evidence</th></tr></thead>
                    <tbody data-all-data-rows><tr><td colspan="13" class="empty">Open Portfolio Inventory to load records</td></tr></tbody>
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
      [["all-data-type", "type"], ["all-data-publish-status", "publishStatus"], ["all-data-publish-type", "publishType"], ["all-data-review-state", "reviewState"], ["all-data-coverage", "coverage"], ["all-data-jenkins-data", "jenkinsData"], ["all-data-jenkins-priority", "jenkinsPriority"]].forEach(([id, key]) => {
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
        const fallbackContact = cleanContactEnumeration(record.owner || allDataExactValue(record, ["Tech Contact Email", "Support Contact Email", "Workshop Team", "Manager Email", "Acknowledgement Updater", "Owner Group"]));
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
        jenkinsError: record.jenkinsErrorScore == null ? "" : String(record.jenkinsErrorScore),
        jenkinsPriority: record.jenkinsPrioritySummary || "",
        livelabsId: record.livelabsId,
        publishStatus: allDataPublishStatus(record),
        publishType: allDataPublishType(record),
        source: record.source,
        title: record.title,
        type: allDataType(record),
        qaError: record.qa?.observed_error_score == null ? "" : String(record.qa.observed_error_score),
        qaState: qaEvidenceState(record),
        wmsId: record.wmsId
      };
      return values[key] ?? "";
    }
    function sortAllDataRecords(records) {
      const sortField = allDataSortFields.find((field) => field.key === allDataState.sortKey);
      if (!sortField) {
        return records.slice().sort((left, right) => (left.inventoryIndex ?? 0) - (right.inventoryIndex ?? 0));
      }
      const direction = allDataState.sortDirection === "desc" ? "desc" : "asc";
      return records.slice().sort((left, right) => {
        if (sortField.key === "qaError" || sortField.key === "jenkinsError") {
          const scoreFor = (record) => sortField.key === "jenkinsError" ? record.jenkinsErrorScore : record.qa?.observed_error_score;
          const missingLeft = scoreFor(left) == null;
          const missingRight = scoreFor(right) == null;
          if (missingLeft !== missingRight) return missingLeft ? 1 : -1;
        }
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
      allDataState.jenkinsData = "";
      allDataState.jenkinsPriority = "";
      allDataState.page = 1;
      allDataState.pageRange = "";
      allDataState.publishStatus = "";
      allDataState.publishType = "";
      allDataState.query = "";
      allDataState.reviewState = "";
      allDataState.sortDirection = "asc";
      allDataState.sortKey = "";
      allDataState.type = "";
      ["all-data-search", "all-data-type", "all-data-publish-status", "all-data-publish-type", "all-data-review-state", "all-data-coverage", "all-data-jenkins-data", "all-data-jenkins-priority"].forEach((id) => {
        const control = document.getElementById(id);
        if (control) control.value = "";
      });
    }
    function setInventoryLoadingState(message = "Loading inventory") {
      document.querySelectorAll("[data-all-data-count]").forEach((node) => { node.textContent = message; });
      const rowsNode = document.querySelector("[data-all-data-rows]");
      if (rowsNode) rowsNode.innerHTML = `<tr><td colspan="13" class="empty">${escapeHtml(message)}</td></tr>`;
      const totalNode = document.querySelector("[data-all-data-total]");
      if (totalNode) totalNode.textContent = message;
    }
    function ensurePortfolioInventoryLoaded({ render = true } = {}) {
      if (loadedFullSearchRecords.length) {
        if (render) {
          if (window.__portfolioInventoryError) setInventoryLoadingState(window.__portfolioInventoryError);
          else renderAllDataTable();
        }
        return Promise.resolve(loadedFullSearchRecords);
      }
      if (portfolioInventoryLoadComplete) {
        if (render) {
          if (window.__portfolioInventoryError) setInventoryLoadingState(window.__portfolioInventoryError);
          else renderAllDataTable();
        }
        return Promise.resolve(loadedFullSearchRecords);
      }
      setInventoryLoadingState("Loading inventory");
      const inventoryRequest = loadPortfolioInventoryRecords().then((fullRecords) => {
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
        if (render) {
          if (window.__portfolioInventoryError) setInventoryLoadingState(window.__portfolioInventoryError);
          else renderAllDataTable();
        }
        return loadedFullSearchRecords;
      });
      return window.LiveLabsLoading.track(inventoryRequest, 'Loading portfolio records…');
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
    function jenkinsPriorityMatches(record, priority) {
      if (!priority) return true;
      const overlay = record.jenkins || jenkinsOverlayForId(record.livelabsId);
      if (!overlay) return false;
      return priority === "unmapped"
        ? Number(overlay.priorityCounts?.unmapped || 0) > 0
        : Number(overlay.priorityCounts?.[priority.toLowerCase()] || 0) > 0;
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
        const jenkins = record.jenkins || jenkinsOverlayForId(record.livelabsId);
        if (allDataState.jenkinsData === "reported" && !jenkins) return false;
        if (allDataState.jenkinsData === "issues" && !(Number(jenkins?.findingRows || 0) > 0)) return false;
        if (allDataState.jenkinsData === "no-report" && jenkins) return false;
        if (!jenkinsPriorityMatches(record, allDataState.jenkinsPriority)) return false;
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
        <td>${escapeHtml(record.qa?.observed_error_score ?? "N/A")}</td>
        <td>${escapeHtml(record.jenkinsErrorScore ?? "N/A")}</td>
        <td>${escapeHtml(record.jenkinsPrioritySummary || "No Jenkins report")}</td>
        <td>${escapeHtml(qaEvidenceState(record).replaceAll("_", " "))}</td>
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
    function applyPortfolioStatsSummary() {
      const section = document.querySelector("#portfolio-stats");
      if (!section) return;
      const records = publicRawRecords;
      const overlay = dashboardQaReportMerge?.overlay || {};
      const matched = Object.entries(overlay).filter(([id]) => publicLivelabsIds.has(String(id).trim()));
      const scored = matched.filter(([, item]) => item?.findings?.some(finding => ["P2", "P3"].includes(finding.priority)));
      const p1Count = matched.reduce((total, [, item]) => total + (Array.isArray(item?.findings) ? item.findings.filter((finding) => finding.priority === "P1").length : 0), 0);
      const countByType = (type) => records.filter((record) => record.type === type).length;
      const values = {
        "public-count": records.length,
        "jenkins-p1-count": p1Count,
        "workshop-count": countByType("Workshop"),
        "sprint-count": countByType("Sprint"),
        "error-items-count": scored.length,
        "p1-count": p1Count
      };
      Object.entries(values).forEach(([key, value]) => {
        document.querySelectorAll(`[data-overview-metric="${key}"], [data-public-stat="${key}"]`).forEach((node) => {
          node.textContent = ((key === "public-count" && !records.length) || (["jenkins-p1-count", "error-items-count"].includes(key) && !dashboardQaReportMerge)) ? "—" : Number(value).toLocaleString();
        });
      });
      const cohortNote = section.querySelector('[data-overview-note="public-breakdown"]');
      if (cohortNote) cohortNote.textContent = `${countByType("Workshop").toLocaleString()} workshops · ${countByType("Sprint").toLocaleString()} sprints`;
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
        const qa = portfolioInventoryMetadata?.qa_governance;
        warningNode.hidden = !qa;
        warningNode.textContent = qa ? `QA ${qa.mode}: Jenkins ${qa.started_at}; Analytics ${qa.snapshot_date}. Error score 0–100; lower is better. Missing QA evidence does not count as a pass. ${qa.promotion_gaps.join("; ")}.` : "";
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
        rowsNode.innerHTML = `<tr><td colspan="13" class="empty">Open Portfolio Inventory to load records</td></tr>`;
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
        : `<tr><td colspan="13" class="empty">No matching rows</td></tr>`;
      if (panel) panel.dataset.totalPages = String(totalPages);
      syncAllDataControls(records.length, totalPages, first, last, selectedRange);
    }
    document.addEventListener("DOMContentLoaded", () => {
      mountPrimarySearch();
      ensureAllDataDashboardUi();
      applyRankedTableDisclosures();
      observeJenkinsDashboardTables();
      addPortfolioMetricTooltips(document);
      const navLinks = Array.from(document.querySelectorAll(".nav-list a"));
      const setNavCurrent = (mode) => {
        navLinks.forEach((item) => item.removeAttribute("aria-current"));
        const normalizedMode = normalizeDashboardPage(mode);
        const current = normalizedMode === "inventory"
          ? navLinks.find((item) => item.hasAttribute("data-inventory-link"))
          : navLinks.find((item) => item.dataset.dashboardView === normalizedMode);
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
      const dashboardEntryUrl = () => {
        return new URL(location.protocol === 'file:' ? 'index.html' : 'dashboard/', document.baseURI);
      };
      const setDashboardMode = (mode = "overview", options = {}) => {
        if (typeof options === "string") options = { targetHash: options };
        const targetHash = options.targetHash || "";
        showDashboardView({ clearUrl: false });
        const normalizedMode = normalizeDashboardPage(mode);
        document.body.classList.toggle("dashboard-inventory-active", normalizedMode === "inventory");
        document.body.classList.remove("dashboard-tops-active");
        applyDashboardPageView(normalizedMode);
        setNavCurrent(normalizedMode);
        if (options.updateUrl) {
          const target = normalizedMode === "inventory"
            ? new URL(location.protocol === "file:" ? "inventory/index.html" : "inventory/", document.baseURI)
            : dashboardEntryUrl();
          target.search = "";
          if (normalizedMode !== "inventory") target.searchParams.set("view", normalizedMode);
          target.hash = targetHash;
          history.pushState(null, "", `${target.pathname}${target.search}${target.hash}`);
        }
        if (normalizedMode === "inventory") {
          ensurePortfolioInventoryLoaded({ render: true }).finally(() => scrollDashboardTarget(targetHash || "#all-data-browser"));
          return;
        }
        const sections = dashboardPageConfig[normalizedMode]?.sections || [];
        const sectionLoads = sections.map((sectionId) => loadLazySection(sectionId));
        if (targetHash) Promise.all(sectionLoads).then(() => scrollDashboardTarget(targetHash));
        else if (options.updateUrl && !options.preserveScroll) scrollDashboardTarget("#dashboard-top");
      };
      window.setDashboardPage = setDashboardMode;
      const dashboardTabs = Array.from(document.querySelectorAll("[data-dashboard-tab]"));
      dashboardTabs.forEach((tab, index) => {
        tab.addEventListener("click", () => setDashboardMode(tab.dataset.dashboardTab, { updateUrl: true, preserveScroll: true }));
        tab.addEventListener("keydown", (event) => {
          const nextIndex = event.key === "ArrowRight" ? (index + 1) % dashboardTabs.length
            : event.key === "ArrowLeft" ? (index - 1 + dashboardTabs.length) % dashboardTabs.length
              : event.key === "Home" ? 0 : event.key === "End" ? dashboardTabs.length - 1 : -1;
          if (nextIndex < 0) return;
          event.preventDefault();
          dashboardTabs[nextIndex].focus();
          dashboardTabs[nextIndex].click();
        });
      });
      document.querySelectorAll("[data-dashboard-view]").forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          setDashboardMode(link.dataset.dashboardView || "overview", { targetHash: link.hash || "", updateUrl: true });
        });
      });
      navLinks.filter((link) => !link.dataset.dashboardView && !link.dataset.inventoryLink).forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          const targetPage = dashboardSectionPage[link.hash.slice(1)] || "overview";
          setDashboardMode(targetPage, { targetHash: link.hash || "", updateUrl: true });
        });
      });
      window.addEventListener("hashchange", () => {
        if (inventoryRouteRequested()) {
          setDashboardMode("inventory", { updateUrl: false });
          return;
        }
        const targetHash = location.hash === "#overview" ? "" : location.hash;
        const requestedPage = new URLSearchParams(location.search).get("view") || dashboardSectionPage[targetHash.slice(1)] || "performance";
        setDashboardMode(requestedPage, { targetHash, updateUrl: false });
        if (location.hash === "#overview") {
          const canonical = new URL(location.href);
          canonical.searchParams.set("view", normalizeDashboardPage(requestedPage));
          canonical.hash = "";
          history.replaceState(null, "", `${canonical.pathname}${canonical.search}`);
        }
      });
      document.querySelectorAll("[data-dashboard-home]").forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          setDashboardMode("performance", { updateUrl: true });
        });
      });
      const normalizedPath = location.pathname.replace(/\/+$/, "").toLowerCase();
      const onInventoryPage = normalizedPath.endsWith("/inventory") || normalizedPath.endsWith("/inventory/index.html");
      const initialParams = new URLSearchParams(location.search);
      const legacyInventoryRequested = !onInventoryPage && location.hash === "#all-data-browser";
      if (legacyInventoryRequested) {
        const target = new URL(location.protocol === 'file:' ? 'inventory/index.html' : 'inventory', document.baseURI);
        target.search = initialParams.toString();
        target.hash = "";
        window.location.replace(`${target.pathname}${target.search}`);
        return;
      }
      if (onInventoryPage && location.hash) {
        history.replaceState(null, "", `${location.pathname}${location.search}`);
      }
      if (inventoryRouteRequested()) {
        setDashboardMode("inventory", { updateUrl: false });
      } else {
        const normalizedPathForRoute = location.pathname.replace(/\/+$/, "").toLowerCase();
        const isDashboardRoute = normalizedPathForRoute.endsWith("/dashboard") || normalizedPathForRoute.endsWith("/dashboard/index.html") || normalizedPathForRoute === "";
        const requestedPage = initialParams.get("view") || dashboardSectionPage[location.hash.slice(1)] || "performance";
        const normalizedRequestedPage = normalizeDashboardPage(requestedPage);
        const targetHash = location.hash === "#overview" ? "" : location.hash;
        setDashboardMode(requestedPage, { targetHash, updateUrl: false });
        if (isDashboardRoute && normalizedRequestedPage !== "inventory") {
          const canonical = new URL(location.href);
          canonical.searchParams.set("view", normalizedRequestedPage);
          if (location.hash === "#overview") canonical.hash = "";
          history.replaceState(null, "", `${canonical.pathname}${canonical.search}${canonical.hash}`);
        }
      }
      syncAdminEntryLink();
      applyQaExceptionPrototype();
      applyAdminRowOverrides();
      applyNoAuthorGovernanceFlags();
      applyDemandProtectedGovernanceFlags();
      decorateDashboardCopyTargets();
      applySectionVisibilitySettings();
      applyPortfolioStatsSummary();
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
        if (!loadedFullSearchRecords.length) {
          const requestId = ++searchLoadRequest;
          setSearchStatus("Loading public portfolio search");
          syncSearchClear();
          loadFullSearchRecords().then((records) => {
            if (requestId !== searchLoadRequest) return;
            searchRecords = buildActiveSearchIndex();
            if (!records.length) setSearchStatus("Public portfolio search is unavailable");
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
            route: identityRequested && !inventoryWmsFilterOnly ? "search" : "current"
          });
        }
        if (inventoryRouteRequested()) return;
        document.body.classList.remove('dashboard-inventory-active', 'dashboard-tops-active');
        if (identityRequested) {
          document.body.classList.remove("dashboard-inventory-active", "dashboard-tops-active");
          setSearchStatus(`Loading record for ${searchIdentityLabel(state)}`);
          loadFullSearchRecords().then(async (records) => {
            searchRecords = buildSearchIndex(records, { includeTableRecords: false });
            const resolution = resolveSearchRecordIdentity(searchRecords, state);
            if (resolution.record) {
              await ensureDashboardQaMergeLoaded();
              if (dashboardQaReportMerge) applyJenkinsMergeToRecord(resolution.record);
              writeSearchUrl({ query: state.query, record: resolution.record, replace: true, route: "search" });
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
        else {
          const requestedPage = new URLSearchParams(location.search).get("view") || dashboardSectionPage[location.hash.slice(1)] || "overview";
          setDashboardMode(requestedPage, { targetHash: location.hash, updateUrl: false });
        }
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
          else setNavCurrent("performance");
        });
      });
      document.addEventListener("click", (event) => {
        const sortButton = event.target.closest("[data-sort-table]");
        if (sortButton) {
          const tableId = sortButton.dataset.sortTable;
          const wrapper = document.querySelector(`[data-filter-table="${tableId}"]`);
          if (!wrapper) return;
          const columnIndex = sortButton.dataset.columnIndex;
          const defaultDirection = sortButton.dataset.defaultDirection || "asc";
          const currentDirection = wrapper.dataset.sortColumnIndex === columnIndex ? (wrapper.dataset.sortDirection || "none") : "none";
          wrapper.dataset.sortColumnIndex = columnIndex;
          wrapper.dataset.sortDirection = currentDirection === "asc" ? "desc" : defaultDirection;
          preserveViewportDuringTableUpdate(tableId, () => applyTableState(tableId, { resetPage: true }));
          return;
        }
        const clearButton = event.target.closest("[data-clear-filters-for]");
        if (clearButton) {
          const tableId = clearButton.dataset.clearFiltersFor;
          preserveViewportDuringTableUpdate(tableId, () => {
            document.querySelectorAll(`[data-table-filter="${tableId}"]`).forEach((control) => {
              if (control.type === "checkbox") control.checked = false;
              else control.value = "";
            });
            applyTableState(tableId, { resetPage: true });
          });
          return;
        }
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
      const updateTableForFilter = (event) => {
        const control = event.target.closest?.("[data-table-filter]");
        if (!control) return;
        const usesChange = control.tagName.toLowerCase() === "select" || control.type === "checkbox";
        if ((event.type === "change") !== usesChange) return;
        preserveViewportDuringTableUpdate(control.dataset.tableFilter, () => {
          applyTableState(control.dataset.tableFilter, { resetPage: true });
        });
      };
      document.addEventListener("input", updateTableForFilter);
      document.addEventListener("change", updateTableForFilter);
      document.addEventListener("toggle", (event) => {
        const disclosure = event.target;
        if (disclosure instanceof HTMLDetailsElement && disclosure.open) {
          initializeTablesIn(disclosure, { force: true });
        }
      }, true);
      normalizeSectionLinks();
      configureLazySections();
      scheduleInitialTableSetup();
      window.LiveLabsLoading.ready();
      window.addEventListener("storage", (event) => {
        if (event.key === adminStorageKey) reloadDashboardAdminState();
        if (event.key === qaMergeRefreshKey) reloadDashboardJenkinsMerge();
      });
      loadFullSearchRecords().then(() => {
        applyPortfolioStatsSummary();
        return fetchDashboardState();
      })
        .then((payload) => {
          dashboardQaReportMerge = payload?.qaReportMerge || null;
          applyJenkinsDashboardMerge();
          if (!payload?.configured || !payload.state) return;
          const tagDefinitions = Array.isArray(payload.state.tagDefinitions) ? payload.state.tagDefinitions : [];
          const remoteAssignments = Array.isArray(payload.state.rowOverrides) ? payload.state.rowOverrides : [];
          const rowOverrides = dashboardAdminState.rowOverrides.map((override) => ({ ...override, tags: [], tagsOnly: false }));
          remoteAssignments.forEach((remote) => {
            const existing = rowOverrides.find((item) => item.target === remote.target
              && normalizeFilterText(item.value) === normalizeFilterText(remote.value));
            if (existing) existing.tags = remote.tags || [];
            else rowOverrides.push({ ...remote, fieldEdits: {}, note: "", tagsOnly: true });
          });
          dashboardAdminState = sanitizeDashboardAdminState({ ...dashboardAdminState, tagDefinitions, rowOverrides });
          window.localStorage.setItem(adminStorageKey, JSON.stringify(dashboardAdminState));
          reloadDashboardAdminState();
        })
        .catch(() => {});
    });
