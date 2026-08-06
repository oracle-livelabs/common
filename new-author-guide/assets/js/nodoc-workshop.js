(function () {
  "use strict";

  function cleanLabel(value) {
    return String(value || "").replace(/\u00c2/g, "").replace(/\s+/g, " ").trim();
  }

  function normalize(value) {
    return cleanLabel(value).toLowerCase();
  }

  function excerpt(value, query) {
    var text = cleanLabel(value);
    var lower = text.toLowerCase();
    var index = lower.indexOf(query);
    var start = Math.max(0, index < 0 ? 0 : index - 55);
    var end = Math.min(text.length, start + 170);
    return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  }

  function setupNoDocWorkshop() {
    // The HTML keeps the complete workshop readable and source-friendly. This setup
    // turns that static tree into one active reader panel plus a coordinated menu.
    var mode = document.getElementById("nodocMode");
    var reader = document.getElementById("nodocWorkshopReader");
    var source = mode && mode.querySelector(".nodoc-full-tree");
    var nav = mode && mode.querySelector(".nodoc-side-nav");
    var searchForm = document.getElementById("nodocSearchForm");
    var searchInput = document.getElementById("nodocSearchInput");
    var searchStatus = document.getElementById("nodocSearchStatus");
    var searchResults = document.getElementById("nodocSearchResults");
    var searchTimer = 0;
    var latestMatches = [];
    var searchIndex = [];
    var panels;

    if (!mode || !reader || !source || !nav) {
      return;
    }

    // Convert each top-level <details> block into an article so only one lab is
    // rendered at a time while its task content remains easy to search and scan.
    panels = Array.from(source.children).filter(function (node) {
      return node.matches("details.nodoc-tree-group");
    }).map(function (panel, panelIndex) {
      var panelSummary = panel.querySelector(":scope > summary");
      var content = panel.querySelector(":scope > .nodoc-tree-content");
      var panelTitleNode = panelSummary && panelSummary.querySelector("span");
      var panelTitle = cleanLabel(panelTitleNode ? panelTitleNode.textContent : "Workshop section");
      var article = document.createElement("article");
      var heading = document.createElement("h3");
      var tasks;

      article.className = "nodoc-lab-panel";
      article.dataset.nodocPanel = String(panelIndex);
      article.hidden = panelIndex !== 0;
      heading.className = "nodoc-lab-heading";
      heading.textContent = panelTitle;

      if (content) {
        content.insertBefore(heading, content.firstChild);
        article.appendChild(content);
      }
      panel.replaceWith(article);

      tasks = Array.from(article.querySelectorAll("details.nodoc-task"));
      tasks.forEach(function (task, taskIndex) {
        var summary = task.querySelector(":scope > summary");
        var taskTitle = cleanLabel(summary ? summary.textContent : "Task " + (taskIndex + 1));
        var section = document.createElement("section");
        var taskHeading = document.createElement("h4");

        section.className = "nodoc-task-section";
        section.id = "nodoc-panel-" + panelIndex + "-task-" + (taskIndex + 1);
        taskHeading.textContent = taskTitle;
        section.appendChild(taskHeading);
        Array.from(task.childNodes).forEach(function (child) {
          if (child !== summary) {
            section.appendChild(child);
          }
        });
        task.replaceWith(section);
      });

      return article;
    });

    function activate(panelIndex, taskIndex, options) {
      // Keep panel visibility, active menu state, task expansion, and deep-link
      // scrolling in one place so navigation and search behave identically.
      var config = Object.assign({ scroll: true }, options || {});
      var selectedPanel = panels[panelIndex] || panels[0];
      var selectedIndex = panels.indexOf(selectedPanel);
      var selectedTask = Number(taskIndex || 0);
      var target;

      panels.forEach(function (panel, index) {
        panel.hidden = index !== selectedIndex;
      });

      nav.querySelectorAll("[data-nodoc-nav]").forEach(function (button) {
        var buttonPanel = Number(button.dataset.nodocNav);
        var buttonTask = Number(button.dataset.nodocTask || 0);
        var titleButton = !button.dataset.nodocTask;
        var active = buttonPanel === selectedIndex && (titleButton || buttonTask === selectedTask);
        var current = buttonPanel === selectedIndex && buttonTask === selectedTask;
        button.classList.toggle("is-active", active);
        if (current) {
          button.setAttribute("aria-current", "page");
        } else {
          button.removeAttribute("aria-current");
        }
      });

      nav.querySelectorAll("[data-nodoc-group]").forEach(function (group) {
        var groupIndex = Number(group.dataset.nodocGroup);
        var expanded = groupIndex === selectedIndex;
        var title = group.querySelector(":scope > .nodoc-nav-title");
        var tasks = group.querySelector(":scope > .nodoc-nav-tasks");
        group.classList.toggle("is-open", expanded);
        if (title) {
          title.setAttribute("aria-expanded", expanded ? "true" : "false");
        }
        if (tasks) {
          tasks.hidden = !expanded;
        }
      });

      target = selectedTask ? selectedPanel.querySelector("#nodoc-panel-" + selectedIndex + "-task-" + selectedTask) : selectedPanel;
      if (config.scroll !== false) {
        window.requestAnimationFrame(function () {
          (target || selectedPanel).scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }

    function buildSearchIndex() {
      // Index the rendered reader text once. Search results point back to the exact
      // lab or task instead of creating a second copy of the workshop content.
      searchIndex = [];
      panels.forEach(function (panel, panelIndex) {
        var heading = panel.querySelector(".nodoc-lab-heading");
        var panelTitle = heading ? cleanLabel(heading.textContent) : "Workshop section";
        var panelText = cleanLabel(panel.textContent);

        searchIndex.push({
          panel: panelIndex,
          task: 0,
          kind: panelIndex === 0 ? "Introduction" : "Lab",
          title: panelTitle,
          text: panelText,
          searchable: normalize(panelTitle + " " + panelText)
        });

        panel.querySelectorAll(".nodoc-task-section").forEach(function (section, taskIndex) {
          var taskHeading = section.querySelector("h4");
          var taskTitle = taskHeading ? cleanLabel(taskHeading.textContent) : "Task " + (taskIndex + 1);
          var taskText = cleanLabel(section.textContent);
          searchIndex.push({
            panel: panelIndex,
            task: taskIndex + 1,
            kind: panelTitle,
            title: taskTitle,
            text: taskText,
            searchable: normalize(panelTitle + " " + taskTitle + " " + taskText)
          });
        });
      });
    }

    function renderSearch(queryValue) {
      var query = normalize(queryValue);
      var fragment = document.createDocumentFragment();

      searchResults.replaceChildren();
      if (query.length < 2) {
        latestMatches = [];
        searchResults.hidden = true;
        searchStatus.textContent = query ? "Enter at least two characters." : "";
        return;
      }

      latestMatches = searchIndex.filter(function (entry) {
        return query.split(/\s+/).every(function (term) {
          return entry.searchable.indexOf(term) !== -1;
        });
      }).sort(function (left, right) {
        var leftTitle = normalize(left.title);
        var rightTitle = normalize(right.title);
        return Number(rightTitle.indexOf(query) !== -1) - Number(leftTitle.indexOf(query) !== -1);
      }).slice(0, 10);

      latestMatches.forEach(function (entry) {
        var button = document.createElement("button");
        var meta = document.createElement("span");
        var title = document.createElement("strong");
        var summary = document.createElement("span");

        button.type = "button";
        button.className = "nodoc-search-result";
        button.dataset.nodocResultPanel = String(entry.panel);
        button.dataset.nodocResultTask = String(entry.task);
        meta.className = "nodoc-search-result-meta";
        meta.textContent = entry.kind;
        title.textContent = entry.title;
        summary.textContent = excerpt(entry.text, query);
        button.append(meta, title, summary);
        fragment.appendChild(button);
      });

      searchResults.appendChild(fragment);
      searchResults.hidden = latestMatches.length === 0;
      searchStatus.textContent = latestMatches.length ? latestMatches.length + " result" + (latestMatches.length === 1 ? "" : "s") + " found." : "No workshop content matches that search.";
    }

    nav.addEventListener("click", function (event) {
      var button = event.target.closest("[data-nodoc-nav]");
      if (!button) {
        return;
      }
      event.preventDefault();
      activate(Number(button.dataset.nodocNav), Number(button.dataset.nodocTask || 0));
    });

    if (searchInput && searchResults && searchStatus) {
      buildSearchIndex();
      searchInput.addEventListener("input", function () {
        // Debounce typing so larger workshop text is not searched on every keystroke.
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(function () {
          renderSearch(searchInput.value);
        }, 120);
      });
      searchResults.addEventListener("click", function (event) {
        var result = event.target.closest("[data-nodoc-result-panel]");
        if (!result) {
          return;
        }
        activate(Number(result.dataset.nodocResultPanel), Number(result.dataset.nodocResultTask || 0));
      });
    }

    if (searchForm) {
      searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        renderSearch(searchInput ? searchInput.value : "");
        if (latestMatches.length) {
          activate(latestMatches[0].panel, latestMatches[0].task);
        }
      });
    }

    activate(0, 0, { scroll: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupNoDocWorkshop, { once: true });
  } else {
    setupNoDocWorkshop();
  }
}());
