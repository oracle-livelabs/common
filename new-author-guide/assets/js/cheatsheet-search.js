// Keep the Cheatsheet filter responsive even when the shared app re-renders
// cards after a route or catalog update.
(function () {
  "use strict";

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function bindCheatsheetSearch() {
    var input = document.getElementById("bubbleSearch");
    var grid = document.getElementById("bubbleGrid");
    var count = document.getElementById("resultCount");
    var summary = document.getElementById("filterSummary");
    var empty = document.getElementById("emptyState");
    var applying = false;

    if (!input || !grid || !count || !summary || !empty) {
      return;
    }

    function applyFilter() {
      var query = normalize(input.value);
      var cards = Array.from(grid.querySelectorAll(".bubble-item"));
      var visible = 0;

      if (applying) {
        return;
      }

      applying = true;
      cards.forEach(function (card) {
        var matches = !query || normalize(card.textContent).indexOf(query) !== -1;
        card.hidden = !matches;
        if (matches) {
          visible += 1;
        }
      });
      applying = false;

      count.textContent = "Showing " + visible + " cheatsheet card" + (visible === 1 ? "" : "s");
      summary.textContent = query ? 'Cheatsheet search. Query: "' + input.value.trim() + '"' : "Alphabetical sort. All tags.";
      empty.classList.toggle("d-none", visible !== 0);
    }

    input.addEventListener("input", applyFilter, true);
    input.addEventListener("search", applyFilter, true);
    document.getElementById("clearSearch").addEventListener("click", function () {
      window.setTimeout(applyFilter, 0);
    }, true);

    new MutationObserver(function () {
      if (input.value) {
        applyFilter();
      }
    }).observe(grid, { childList: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindCheatsheetSearch, { once: true });
  } else {
    bindCheatsheetSearch();
  }
}());
