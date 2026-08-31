(function () {
  "use strict";

  var nodocManifestHref = "../workshops/nodoc/manifest.json";

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

  function hydrateNoDocVideoContracts(root) {
    var contracts = {
      "Lab 1 walkthrough": ["nodoc-lab-1", "Preview: NoDoc Lab 1 walkthrough", "Capture slot for access, role check, Focus Area, and No Doc Repo navigation.", "Access and navigation|Role check|NoDoc Repo", "00:00::Open the approved environment and confirm the assigned role.||00:12::Select the practice Focus Area and open No Doc Repo.||00:24::Use Open All and Close All to inspect the table of contents.||00:36::Return to the authoring path with the required permissions confirmed."],
      "Lab 2 walkthrough": ["nodoc-lab-2", "Preview: NoDoc Lab 2 walkthrough", "Capture slot for article creation, page structure, and metadata.", "Article shell|Page structure|Metadata", "00:00::Create the article shell and version in the selected Focus Area.||00:12::Add the Prepare, Author, and Review pages in order.||00:24::Apply the required metadata and structured content.||00:36::Save the page and confirm the table of contents remains aligned."],
      "Lab 3 walkthrough": ["nodoc-lab-3", "Preview: NoDoc Lab 3 walkthrough", "Capture slot for comments, drafts, difference review, and owner approval.", "Comments|Drafts|Review decisions", "00:00::Add a specific anchored comment to the practice page.||00:12::Create a draft and improve the selected content.||00:24::Open the difference view and inspect each change.||00:36::Approve only the changes that the content owner accepts."],
      "Lab 4 walkthrough": ["nodoc-lab-4", "Preview: NoDoc Lab 4 walkthrough", "Capture slot for AI correction, human difference review, and information maps.", "AI correction|Difference review|Information maps", "00:00::Open the Author page and choose a supported correction action.||00:12::Inspect the generated difference and reject unsupported changes.||00:24::Keep only human-reviewed improvements that preserve technical meaning.||00:36::Generate the information map after all pages are saved."],
      "Lab 5 walkthrough": ["nodoc-lab-5", "Preview: NoDoc Lab 5 walkthrough", "Capture slot for approved ingestion, focused questions, and source context.", "Ingestion|Focused questions|Source context", "00:00::Confirm the article is approved and choose Ingest.||00:12::Open Ask No Doc and select the correct Focus Area.||00:24::Narrow the context by article and release version.||00:36::Inspect the answer and source context before sharing results."],
      "Lab 6 walkthrough": ["nodoc-lab-6", "Preview: NoDoc Lab 6 walkthrough", "Capture slot for pre-publish checks, preview inspection, and release evidence.", "Pre-publish checks|Preview|Release handoff", "00:00::Run the metadata, link, content, and page-order checks.||00:12::Review comments, drafts, and unresolved decisions.||00:24::Generate and inspect the approved preview package.||00:36::Record ownership, evidence, risks, and the release decision."]
    };

    Array.from(root.querySelectorAll("[data-video-title]")).forEach(function (node) {
      var contract = contracts[node.getAttribute("data-video-title")];

      if (!contract) {
        return;
      }

      node.setAttribute("data-video-id", contract[0]);
      node.setAttribute("data-video-status", "preview");
      node.setAttribute("data-video-title", contract[1]);
      node.setAttribute("data-video-summary", contract[2]);
      node.setAttribute("data-video-source-note", "Preview asset only. Record the approved NoDoc environment and replace this asset before release.");
      node.setAttribute("data-video-features", contract[3]);
      node.setAttribute("data-video-transcript", contract[4]);
      node.setAttribute("data-video-transcript-intro", "Capture script for the approved NoDoc walkthrough. The template MP4 is not product evidence.");
      if (node.getAttribute("data-player-ready") === "true") {
        node.removeAttribute("data-player-ready");
        node.innerHTML = "";
      }
    });

    if (window.RedwoodVideoPlayer && typeof window.RedwoodVideoPlayer.hydrate === "function") {
      window.RedwoodVideoPlayer.hydrate(root);
    }
  }

  function loadNoDocWorkshop() {
    var source = document.querySelector("#nodocMode .nodoc-full-tree");
    var manifestUrl;

    if (!source) {
      return;
    }

    manifestUrl = new URL(nodocManifestHref, window.location.href);
    source.setAttribute("aria-busy", "true");

    fetch(manifestUrl.toString(), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("NoDoc manifest request failed with HTTP " + response.status);
        }
        return response.json();
      })
      .then(function (manifest) {
        if (!manifest || !manifest.content) {
          throw new Error("NoDoc manifest does not define a content file");
        }
        return fetch(new URL(manifest.content, manifestUrl).toString(), { cache: "no-store" });
      })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("NoDoc content request failed with HTTP " + response.status);
        }
        return response.text();
      })
      .then(function (markup) {
        source.innerHTML = markup;
        source.removeAttribute("aria-busy");
        setupNoDocWorkshop();
      })
      .catch(function (error) {
        source.removeAttribute("aria-busy");
        source.innerHTML = "<p class=\"nodoc-load-error\">NoDoc workshop content could not be loaded.</p>";
        console.error(error);
      });
  }

  function setupNoDocWorkshop() {
    // The external fragment keeps the complete workshop readable and source-friendly.
    // This setup turns that static tree into one active reader panel plus a coordinated menu.
    var mode = document.getElementById("nodocMode");
    var reader = document.getElementById("nodocWorkshopReader");
    var guideLayout = mode && mode.querySelector(".nodoc-guide-layout");
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

    hydrateNoDocVideoContracts(source);

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
      heading.tabIndex = -1;
      heading.textContent = panelTitle;

      if (content) {
        Array.from(content.querySelectorAll(":scope > [data-video-card]")).forEach(function (video) {
          video.remove();
        });
        content.insertBefore(heading, content.firstChild);
        article.appendChild(content);
      }
      panel.replaceWith(article);

      tasks = Array.from(article.querySelectorAll("details.nodoc-task"));
      tasks.forEach(function (task, taskIndex) {
        var summary = task.querySelector(":scope > summary");
        var taskTitle = cleanLabel(summary ? summary.textContent : "Task " + (taskIndex + 1));
        var section = document.createElement("details");
        var taskHeading = document.createElement("summary");

        section.className = "nodoc-task-section";
        section.id = "nodoc-panel-" + panelIndex + "-task-" + (taskIndex + 1);
        if (panelIndex === 1 && taskIndex === 0) {
          section.classList.add("nodoc-launch-task-section");
        }
        taskHeading.tabIndex = -1;
        taskHeading.textContent = taskTitle;
        section.appendChild(taskHeading);
        Array.from(task.childNodes).forEach(function (child) {
          if (child !== summary) {
            section.appendChild(child);
          }
        });

        var media = document.createElement("div");
        var video = document.createElement("div");

        media.className = "nodoc-task-media";
        video.setAttribute("data-video-card", "");
        video.setAttribute("data-video-id", "nodoc-lab-" + panelIndex + "-task-" + (taskIndex + 1));
        video.setAttribute("data-video-title", panelTitle + " · " + taskTitle);
        video.setAttribute("data-video-status", "preview");
        video.setAttribute("data-video-source-note", "Preview asset only. Replace it with the approved task walkthrough before release.");
        video.setAttribute("data-video-compact", "true");
        media.append(video);
        section.insertBefore(media, section.firstChild);
        section.addEventListener("toggle", function () {
          syncTaskToggle(article);
        });
        task.replaceWith(section);
      });

      if (tasks.length) {
        var firstTask = article.querySelector(".nodoc-task-section");
        var taskToggle = document.createElement("button");
        taskToggle.type = "button";
        taskToggle.className = "btn btn-outline-primary nodoc-task-toggle";
        taskToggle.dataset.nodocTaskToggle = "true";
        taskToggle.setAttribute("aria-expanded", "false");
        taskToggle.textContent = "Open All Tasks";
        if (firstTask && firstTask.parentNode) {
          firstTask.parentNode.insertBefore(taskToggle, firstTask);
        }
      }

      return article;
    });

    function syncTaskToggle(panel) {
      var taskSections = Array.from(panel.querySelectorAll(":scope > .nodoc-tree-content > .nodoc-task-section"));
      var toggle = panel.querySelector("[data-nodoc-task-toggle]");
      var allOpen;

      if (!toggle || !taskSections.length) {
        return;
      }
      allOpen = taskSections.every(function (taskSection) {
        return taskSection.open;
      });
      toggle.textContent = allOpen ? "Close All Tasks" : "Open All Tasks";
      toggle.setAttribute("aria-expanded", allOpen ? "true" : "false");
    }

    panels.forEach(function (panel, panelIndex) {
      var heading = panel.querySelector(".nodoc-lab-heading");
      var title = heading ? cleanLabel(heading.textContent) : "Workshop section";
      var footer = document.createElement("nav");
      var previous = panels[panelIndex - 1];
      var next = panels[panelIndex + 1];

      footer.className = "nodoc-page-navigation";
      footer.setAttribute("aria-label", title + " page navigation");
      if (previous) {
        var previousHeading = previous.querySelector(".nodoc-lab-heading");
        var previousButton = document.createElement("button");
        previousButton.type = "button";
        previousButton.className = "btn btn-outline-secondary nodoc-page-nav-button";
        previousButton.dataset.nodocNav = String(panelIndex - 1);
        previousButton.textContent = "Back: " + cleanLabel(previousHeading ? previousHeading.textContent : "Previous page");
        footer.appendChild(previousButton);
      }
      if (next) {
        var nextHeading = next.querySelector(".nodoc-lab-heading");
        var nextButton = document.createElement("button");
        nextButton.type = "button";
        nextButton.className = "btn btn-primary nodoc-page-nav-button";
        nextButton.dataset.nodocNav = String(panelIndex + 1);
        nextButton.textContent = "Next: " + cleanLabel(nextHeading ? nextHeading.textContent : "Next page");
        footer.appendChild(nextButton);
      }
      if (footer.children.length) {
        panel.appendChild(footer);
      }
    });

    function activate(panelIndex, taskIndex, options) {
      // Keep panel visibility, active menu state, task expansion, and deep-link
      // scrolling in one place so navigation and search behave identically.
      var config = Object.assign({ scroll: true }, options || {});
      var selectedPanel = panels[panelIndex] || panels[0];
      var selectedIndex = panels.indexOf(selectedPanel);
      var selectedTask = Number(taskIndex || 0);
      var target;
      var focusTarget;

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

      selectedPanel.querySelectorAll(".nodoc-task-section").forEach(function (taskSection) {
        taskSection.open = selectedTask > 0 && taskSection.id === "nodoc-panel-" + selectedIndex + "-task-" + selectedTask;
      });
      syncTaskToggle(selectedPanel);
      target = selectedTask ? selectedPanel.querySelector("#nodoc-panel-" + selectedIndex + "-task-" + selectedTask) : selectedPanel;
      focusTarget = selectedTask ? target.querySelector(":scope > summary") : selectedPanel.querySelector(".nodoc-lab-heading");
      if (config.scroll !== false) {
        window.requestAnimationFrame(function () {
          (target || selectedPanel).scrollIntoView({ behavior: "smooth", block: "start" });
          if (focusTarget && typeof focusTarget.focus === "function") {
            focusTarget.focus({ preventScroll: true });
          }
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
          var taskHeading = section.querySelector(":scope > summary");
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

    function setSearchMode(active) {
      if (!guideLayout) {
        return;
      }
      guideLayout.hidden = active;
      guideLayout.setAttribute("aria-hidden", active ? "true" : "false");
    }

    function clearSearch() {
      latestMatches = [];
      if (searchInput) {
        searchInput.value = "";
      }
      if (searchResults) {
        searchResults.replaceChildren();
        searchResults.hidden = true;
      }
      if (searchStatus) {
        searchStatus.textContent = "";
      }
      setSearchMode(false);
    }

    function renderSearch(queryValue) {
      var query = normalize(queryValue);
      var fragment = document.createDocumentFragment();

      searchResults.replaceChildren();
      if (query.length < 2) {
        latestMatches = [];
        searchResults.hidden = true;
        searchStatus.textContent = query ? "Enter at least two characters." : "";
        setSearchMode(false);
        return;
      }

      setSearchMode(true);

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

    mode.addEventListener("click", function (event) {
      var taskToggle = event.target.closest("[data-nodoc-task-toggle]");
      var button = event.target.closest("[data-nodoc-nav]");

      if (taskToggle) {
        var panel = taskToggle.closest(".nodoc-lab-panel");
        var taskSections = panel ? Array.from(panel.querySelectorAll(":scope > .nodoc-tree-content > .nodoc-task-section")) : [];
        var shouldOpen = taskSections.some(function (taskSection) {
          return !taskSection.open;
        });

        taskSections.forEach(function (taskSection) {
          taskSection.open = shouldOpen;
        });
        syncTaskToggle(panel);
        return;
      }
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
        clearSearch();
        activate(Number(result.dataset.nodocResultPanel), Number(result.dataset.nodocResultTask || 0));
      });
    }

    if (searchForm) {
      searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        renderSearch(searchInput ? searchInput.value : "");
      });
    }

    if (searchInput) {
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && searchInput.value) {
          event.preventDefault();
          clearSearch();
          searchInput.focus();
        }
      });
    }

    activate(0, 0, { scroll: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadNoDocWorkshop, { once: true });
  } else {
    loadNoDocWorkshop();
  }
}());
