(function () {
  "use strict";

  var groups = [
    { id: "importing", label: "Importing articles", entries: [1, 12, 22, 23, 34, 35, 37, 44] },
    { id: "generation", label: "Article generation", entries: [15, 16, 17, 18, 19, 45, 50] },
    { id: "comments", label: "Comments", entries: [2, 4, 8, 9, 24, 25, 26, 27, 28, 29] },
    { id: "editing", label: "Editing and saving", entries: [3, 6, 11, 20, 30, 31, 43, 49, 52] },
    { id: "articles", label: "Articles and pages", entries: [5, 7, 13, 14, 36, 39, 40, 46] },
    { id: "versions", label: "Versions", entries: [10, 41, 42, 48] },
    { id: "images", label: "Images", entries: [21, 38, 51] },
    { id: "notifications", label: "Notifications", entries: [32, 33] },
    { id: "orahub", label: "OraHub", entries: [47] }
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function groupForEntry(id) {
    return groups.find(function (group) { return group.entries.indexOf(id) >= 0; });
  }

  function renderVisual(item) {
    if (!item.visual) return "";
    return [
      '    <figure class="nodoc-error-visual">',
      '      <a href="', escapeHtml(item.visual.src), '" target="_blank" rel="noopener">',
      '        <img src="', escapeHtml(item.visual.src), '" alt="', escapeHtml(item.visual.alt), '" loading="lazy" decoding="async">',
      '      </a>',
      '      <figcaption>', escapeHtml(item.visual.caption), '</figcaption>',
      '    </figure>',
    ].join("");
  }

  function renderCard(result, group) {
    var entry = result.entry;
    var item = result.item;
    var steps = (item.steps || []).map(function (step) { return "<li>" + escapeHtml(step) + "</li>"; }).join("");
    var notes = (entry.notes || []).map(function (note) {
      return '<p class="troubleshooting-source-note"><strong>Source note:</strong> ' + escapeHtml(note) + "</p>";
    }).join("");
    var guide = item.guide && item.guide[0].indexOf("#nodoc:") === 0
      ? '<p class="nodoc-error-related"><a href="../nodoc/' + escapeHtml(item.guide[0]) + '">' + escapeHtml(item.guide[1]) + "</a></p>"
      : "";

    return [
      '<div class="col"><article class="card nodoc-troubleshooting-result">',
      '  <div class="card-body">',
      '    <div class="nodoc-error-result-topline"><span>Entry ', String(entry.id).padStart(2, "0"), '</span>',
      item.kind === "status" ? '<span class="nodoc-error-kind">Status message</span>' : '<span class="troubleshooting-topic-chip">', escapeHtml(group.label), '</span>',
      '    </div>',
      '    <h3>', escapeHtml(item.title || entry.area), '</h3>',
      '    <p class="nodoc-error-area">', escapeHtml(entry.area), '</p>',
      '    <p class="nodoc-error-summary">', escapeHtml(item.summary || "No additional details are available."), '</p>',
      '    <h4>Steps to try</h4>',
      '    <ol>', steps, '</ol>',
      renderVisual(item),
      guide,
      notes,
      '  </div>',
      '</article></div>'
    ].join("");
  }

  function init() {
    var catalog = window.NoDocErrorCatalog;
    var troubleshooting = window.NoDocTroubleshooting;
    var search = document.getElementById("troubleshootingSearch");
    var clear = document.getElementById("troubleshootingClearSearch");
    var pills = document.getElementById("troubleshootingTagPills");
    var groupsMount = document.getElementById("troubleshootingGroups");
    var emptyState = document.getElementById("troubleshootingEmptyState");
    var resultCount = document.getElementById("troubleshootingResultCount");
    var filterSummary = document.getElementById("troubleshootingFilterSummary");
    var activeTag = "all";

    if (!catalog || !Array.isArray(catalog.entries) || !troubleshooting || !search || !pills || !groupsMount) {
      if (resultCount) resultCount.textContent = "Error guidance could not be loaded.";
      return;
    }

    pills.innerHTML = '<button type="button" class="tag-pill is-active" data-troubleshooting-tag="all" aria-pressed="true">All errors <span class="tag-pill-count">' + catalog.entries.length + '</span></button>' + groups.map(function (group) {
      return '<button type="button" class="tag-pill" data-troubleshooting-tag="' + group.id + '" aria-pressed="false">' + escapeHtml(group.label) + ' <span class="tag-pill-count">' + group.entries.length + '</span></button>';
    }).join("");

    function update() {
      var query = search.value.trim();
      var matches = query
        ? troubleshooting.searchEntries(catalog.entries, query)
        : catalog.entries.map(function (entry) { return { entry: entry, item: troubleshooting.guidance[entry.id], score: 0 }; });
      var matchingIds = new Set(matches.map(function (match) { return match.entry.id; }));
      var visibleGroups = groups.filter(function (group) {
        return (activeTag === "all" || group.id === activeTag) && group.entries.some(function (id) { return matchingIds.has(id); });
      });
      var visibleCount = visibleGroups.reduce(function (count, group) {
        return count + group.entries.filter(function (id) { return matchingIds.has(id); }).length;
      }, 0);

      groupsMount.innerHTML = visibleGroups.map(function (group) {
        var groupCards = group.entries.map(function (id) {
          return matches.find(function (match) { return match.entry.id === id; });
        }).filter(Boolean).map(function (result) { return renderCard(result, group); }).join("");

        return '<section class="cheatsheet-topic-group troubleshooting-topic-group" aria-labelledby="troubleshootingGroup-' + group.id + '">' +
          '<div class="cheatsheet-topic-heading"><h3 id="troubleshootingGroup-' + group.id + '">' + escapeHtml(group.label) + '</h3><span>' + group.entries.filter(function (id) { return matchingIds.has(id); }).length + ' errors</span></div>' +
          '<div class="bubble-grid row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">' + groupCards + '</div></section>';
      }).join("");

      if (emptyState) emptyState.classList.toggle("d-none", visibleCount > 0);
      resultCount.textContent = query
        ? visibleCount + (visibleCount === 1 ? " matching error" : " matching errors")
        : visibleCount + " of " + catalog.entries.length + " errors";
      filterSummary.textContent = activeTag === "all" ? "Grouped by topic" : groups.find(function (group) { return group.id === activeTag; }).label;
    }

    pills.addEventListener("click", function (event) {
      var button = event.target.closest("[data-troubleshooting-tag]");
      if (!button) return;
      activeTag = button.getAttribute("data-troubleshooting-tag");
      pills.querySelectorAll("[data-troubleshooting-tag]").forEach(function (pill) {
        var isActive = pill === button;
        pill.classList.toggle("is-active", isActive);
        pill.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      update();
    });
    search.addEventListener("input", update);
    if (clear) clear.addEventListener("click", function () {
      search.value = "";
      activeTag = "all";
      pills.querySelectorAll("[data-troubleshooting-tag]").forEach(function (pill) {
        var isActive = pill.getAttribute("data-troubleshooting-tag") === "all";
        pill.classList.toggle("is-active", isActive);
        pill.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
      update();
      search.focus();
    });
    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}());
