// Behavior layer for the redesigned guide.
// Handles mode switching, sticky navigation, search ranking, toolkit detail views, and image expansion.
(function () {
  var content = window.authorGuideContent || {};
  var stepMeta = content.stepMeta || [];
  var explorerItems = content.explorerItems || [];
  var guideSections = [];
  var guideSectionMap = {};
  var guideManifestHref = "./workshops/author-guide/manifest.json";
  var fullGuideHref = "https://oracle-livelabs.github.io/common/sample-livelabs-templates/create-labs/labs/workshops/livelabs/";
  var guideHomeHref = fullGuideHref;
  var guideCatalogPromise = null;
  var guideCatalogLoaded = false;
  var guideSectionSurfaceCache = {};
  var guideSectionMetaCache = {};
  var guideSectionSurfaceRequestToken = 0;
  var guideLegacyTargetMap = {
    "start-here": "introduction",
    "core-workflow": "1-labs-wms",
    "core-workshop-flow": "1-labs-wms",
    "validation-publish": "5-labs-qa-checks",
    "reuse-enhancements": "11-create-freesql",
    "tools-productivity": "13-labs-capture-screens-best-practices",
    "specialized-workflows": "10-create-sprints-workflow",
    "help-faq": "introduction"
  };
  var guideCurrentAdditionIds = {};
  var stopWords = {
    a: true,
    an: true,
    and: true,
    are: true,
    as: true,
    at: true,
    can: true,
    do: true,
    for: true,
    from: true,
    how: true,
    i: true,
    if: true,
    in: true,
    is: true,
    it: true,
    my: true,
    of: true,
    on: true,
    or: true,
    should: true,
    that: true,
    the: true,
    this: true,
    to: true,
    what: true,
    when: true,
    where: true,
    with: true
  };
  var synonymGroups = [
    ["wms", "workshop management system", "workshop request", "stakeholder", "council", "owner group"],
    ["qa", "self qa", "quarterly qa", "checklist", "quality assurance", "certify"],
    ["github", "git hub", "fork", "clone", "merge", "branch", "origin", "upstream", "pull request", "pr", "pages", "preview", "github io"],
    ["publish", "publishing", "production", "completed", "publish requested", "publish approved"],
    ["validator", "markdown validation", "pr checks", "lintchecker", "checks", "validation"],
    ["images", "image", "screenshot", "screenshots", "optishot", "media"],
    ["markdown", "manifest", "copy tags", "task header", "acknowledgements"],
    ["sql", "plsql", "free sql", "freesql", "sql developer"],
    ["help", "support", "faq", "message the team", "slack", "mailbox"],
    ["sla", "timeline", "timelines", "review window", "publishing window"],
    ["secure desktop", "secure desktops", "restricted laptop", "restricted corporate laptop", "novnc", "chrome", "popups"],
    ["ai", "ai developer hub", "agentic", "automation first", "skill bundle", "how to guide"]
  ];

  var state = {
    mode: "hub",
    currentStep: 0,
    fastTrack: "guided",
    activeTag: "all",
    toolkitQuery: "",
    searchQuery: "",
    guideSection: guideSections.length ? guideSections[0].id : "",
    guideFocusLab: ""
  };
  var previousView = {
    mode: "hub",
    currentStep: 0,
    guideSection: state.guideSection,
    guideFocusLab: ""
  };
  var searchIndex = [];
  var searchEntryMap = {};
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var suppressObserver = false;
  var isRestoringHistory = false;

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  var appRoot = document.getElementById("app");
  var modeNav = document.getElementById("modeNav");
  var breadcrumbTrail = document.getElementById("breadcrumbTrail");
  var hub = document.getElementById("hub");
  var beginnerMode = document.getElementById("beginnerMode");
  var explorerMode = document.getElementById("explorerMode");
  var guideMode = document.getElementById("guideMode");
  var searchMode = document.getElementById("searchMode");
  var rabbitFlow = document.getElementById("rabbitFlow");
  var stepSections = Array.from(document.querySelectorAll(".rabbit-step"));
  var progressButtons = Array.from(document.querySelectorAll(".progress-button"));
  var progressShell = document.getElementById("progressShell");
  var progressCaption = document.getElementById("progressCaption");
  var fastTrackToggle = document.getElementById("fastTrackToggle");
  var fastTrackStatus = document.getElementById("fastTrackStatus");
  var liveRegion = document.getElementById("liveRegion");
  var bubbleGrid = document.getElementById("bubbleGrid");
  var emptyState = document.getElementById("emptyState");
  var resultCount = document.getElementById("resultCount");
  var bubbleSearch = document.getElementById("bubbleSearch");
  var clearSearch = document.getElementById("clearSearch");
  var tagPills = Array.from(document.querySelectorAll(".tag-pill"));
  var guideLayout = document.querySelector(".guide-layout");
  var guideSidebar = document.querySelector(".guide-sidebar");
  var guideSidebarCard = document.querySelector(".guide-sidebar-card");
  var guideSectionNav = document.getElementById("guideSectionNav");
  var guideQuickNav = document.getElementById("guideQuickNav");
  var guideSectionMount = document.getElementById("guideSectionMount");
  var homeRouteMap = document.getElementById("homeRouteMap");
  var searchResultsMount = document.getElementById("searchResults");
  var searchEmptyState = document.getElementById("searchEmptyState");
  var searchSummary = document.getElementById("searchSummary");
  var searchQueryChip = document.getElementById("searchQueryChip");
  var searchCountChip = document.getElementById("searchCountChip");
  var searchBackButton = document.getElementById("searchBackButton");
  var navSearchForm = document.getElementById("navSearchForm");
  var navSearchInput = document.getElementById("navSearchInput");
  var navSearchClear = document.getElementById("navSearchClear");
  var bubbleModalElement = document.getElementById("bubbleModal");
  var bubbleModal = bootstrap.Modal.getOrCreateInstance(bubbleModalElement);
  var imageLightbox = document.getElementById("imageLightbox");
  var imageLightboxImage = document.getElementById("imageLightboxImage");
  var imageLightboxCaption = document.getElementById("imageLightboxCaption");
  var imageLightboxClose = document.getElementById("imageLightboxClose");
  var backToTopButton = document.getElementById("backToTopButton");
  var lastExpandedFigure = null;
  var layoutSyncFrame = 0;

  bubbleModalElement.addEventListener("hidden.bs.modal", function () {
    closeImageLightbox({ announce: false, restoreFocus: false });
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("padding-right");
    document.querySelectorAll(".modal-backdrop").forEach(function (backdrop) {
      backdrop.remove();
    });
  });

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function compactText(value, maxLength) {
    var text = String(value || "").trim();
    var bounded = Math.max(24, maxLength || 120);

    if (!text || text.length <= bounded) {
      return text;
    }

    return text.slice(0, bounded).replace(/\s+\S*$/, "").trim() + "...";
  }

  function rootCssPx(name, fallback) {
    var styles;
    var value;

    if (!appRoot) {
      return fallback;
    }

    styles = window.getComputedStyle(appRoot);
    value = parseFloat(styles.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function isViewportAnchored(element) {
    var position;

    if (!element) {
      return false;
    }

    position = window.getComputedStyle(element).position;
    return position === "sticky" || position === "fixed";
  }

  function firstDirectContainer(parent) {
    var match = null;

    if (!parent) {
      return null;
    }

    Array.prototype.some.call(parent.children, function (child) {
      if (child.classList && child.classList.contains("container")) {
        match = child;
        return true;
      }
      return false;
    });

    return match;
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  synonymGroups = synonymGroups.map(function (group) {
    return group.map(function (term) {
      return normalizeText(term);
    });
  });

  function tokenize(value) {
    return normalizeText(value)
      .split(" ")
      .filter(function (token) {
        return token && !stopWords[token];
      });
  }

  function tokenSet(text) {
    return new Set(Array.from(new Set(tokenize(text))));
  }

  function expandSearchText(value) {
    var normalized = normalizeText(value);
    var expanded = normalized ? [normalized] : [];

    synonymGroups.forEach(function (group) {
      if (group.some(function (term) { return normalized.indexOf(term) !== -1; })) {
        expanded = expanded.concat(group);
      }
    });

    return expanded.join(" ");
  }

  function flattenList(items) {
    return (items || []).join(" ");
  }

  function flattenFields(items) {
    return (items || []).map(function (item) {
      return [item.label, item.value, item.guidance || item.note || ""].join(" ");
    }).join(" ");
  }

  function flattenResources(items) {
    return (items || []).map(function (item) {
      return [item.label, item.note || "", item.href || ""].join(" ");
    }).join(" ");
  }

  function flattenMilestones(items) {
    return (items || []).map(function (item) {
      return [item.label, item.detail].join(" ");
    }).join(" ");
  }

  function smoothBehavior() {
    return prefersReducedMotion ? "auto" : "smooth";
  }

  function setLiveMessage(message) {
    liveRegion.textContent = "";
    window.setTimeout(function () {
      liveRegion.textContent = message;
    }, 20);
  }

  function currentRoutePayload(hash, scrollY) {
    return {
      __authorGuideRoute: true,
      mode: state.mode,
      currentStep: state.currentStep,
      fastTrack: state.fastTrack,
      activeTag: state.activeTag,
      toolkitQuery: state.toolkitQuery,
      searchQuery: state.searchQuery,
      guideSection: state.guideSection,
      guideFocusLab: state.guideFocusLab,
      hash: hash,
      scrollY: Number.isFinite(scrollY) ? scrollY : window.pageYOffset
    };
  }

  function persistCurrentHistoryScroll() {
    var current = history.state;

    if (!current || !current.__authorGuideRoute) {
      return;
    }

    current.scrollY = window.pageYOffset;
    history.replaceState(current, "", window.location.href);
  }

  function refreshCurrentHistoryScrollSoon() {
    window.setTimeout(function () {
      var current = history.state;

      if (!current || !current.__authorGuideRoute || isRestoringHistory) {
        return;
      }

      current.scrollY = window.pageYOffset;
      history.replaceState(current, "", window.location.href);
    }, prefersReducedMotion ? 80 : 480);
  }

  function setHash(hash, options) {
    var config = Object.assign({
      replace: false,
      scrollY: window.pageYOffset
    }, options || {});
    var payload = currentRoutePayload(hash, config.scrollY);

    if (window.location.hash === hash) {
      history.replaceState(payload, "", hash);
      return;
    }

    if (config.replace || isRestoringHistory) {
      history.replaceState(payload, "", hash);
      return;
    }

    persistCurrentHistoryScroll();
    history.pushState(payload, "", hash);
  }

  function updateHashFromState(options) {
    if (state.mode === "beginner") {
      setHash(state.currentStep === 0 ? "#quickstart" : "#step-" + (state.currentStep + 1), options);
      return;
    }

    if (state.mode === "explorer") {
      setHash("#quick-reference", options);
      return;
    }

    if (state.mode === "guide") {
      setHash("#guide-" + state.guideSection, options);
      return;
    }

    if (state.mode === "search") {
      setHash(state.searchQuery ? "#search:" + encodeURIComponent(state.searchQuery) : "#search", options);
      return;
    }

    setHash("#home", options);
  }

  function stickyOffset(target) {
    var offset = 16;
    var navHeight = (
      modeNav &&
      !modeNav.classList.contains("d-none") &&
      isViewportAnchored(modeNav)
    ) ? modeNav.getBoundingClientRect().height : 0;
    var progressHeight = 0;

    if (
      state.mode === "beginner" &&
      progressShell &&
      window.innerWidth <= 1199 &&
      !beginnerMode.classList.contains("d-none") &&
      target &&
      target !== beginnerMode
    ) {
      progressHeight = progressShell.getBoundingClientRect().height;
    }

    return Math.ceil(navHeight + progressHeight + offset);
  }

  function scrollToTarget(target) {
    var top;

    if (!target) {
      return;
    }

    top = window.pageYOffset + target.getBoundingClientRect().top - stickyOffset(target);
    window.scrollTo({
      top: Math.max(0, top),
      behavior: smoothBehavior()
    });
  }

  function resetProgressDock() {
    if (!progressShell) {
      return;
    }

    progressShell.style.position = "";
    progressShell.style.top = "";
    progressShell.style.left = "";
    progressShell.style.width = "";
  }

  function syncProgressDockPosition() {
    var topOffset;
    var railWidth;
    var hero;
    var sectionRect;
    var heroRect;
    var heroTop;
    var heroContainer;
    var containerRect;
    var absoluteLeft;
    var fixedLeft;

    if (!progressShell || window.innerWidth <= 1199 || state.mode !== "beginner" || !beginnerMode || beginnerMode.classList.contains("d-none")) {
      resetProgressDock();
      return;
    }

    hero = beginnerMode.querySelector(".mode-hero");
    heroContainer = firstDirectContainer(beginnerMode);

    if (!hero || !heroContainer) {
      resetProgressDock();
      return;
    }

    topOffset = 14;
    railWidth = rootCssPx("--progress-rail-width", 150);
    sectionRect = beginnerMode.getBoundingClientRect();
    heroRect = hero.getBoundingClientRect();
    heroTop = Math.max(0, Math.round(heroRect.top - sectionRect.top));
    containerRect = heroContainer.getBoundingClientRect();
    absoluteLeft = Math.round(containerRect.left - sectionRect.left);
    fixedLeft = Math.round(containerRect.left);

    progressShell.style.width = railWidth + "px";

    if (heroRect.top > topOffset) {
      progressShell.style.position = "absolute";
      progressShell.style.top = heroTop + "px";
      progressShell.style.left = absoluteLeft + "px";
      return;
    }

    progressShell.style.position = "fixed";
    progressShell.style.top = topOffset + "px";
    progressShell.style.left = fixedLeft + "px";
  }

  function resetGuideSidebar() {
    if (!guideSidebar || !guideSidebarCard) {
      return;
    }

    guideSidebar.style.position = "";
    guideSidebar.style.minHeight = "";
    guideSidebarCard.style.position = "";
    guideSidebarCard.style.top = "";
    guideSidebarCard.style.left = "";
    guideSidebarCard.style.width = "";
  }

  function syncGuideSidebar() {
    var topOffset;
    var sidebarRect;
    var layoutRect;
    var sidebarHeight;
    var sidebarColumnHeight;
    var fixedLeft;
    var fixedWidth;
    var absoluteTop;

    if (
      !guideLayout ||
      !guideSidebar ||
      !guideSidebarCard ||
      window.innerWidth <= 1199 ||
      state.mode !== "guide" ||
      !guideMode ||
      guideMode.classList.contains("d-none")
    ) {
      resetGuideSidebar();
      return;
    }

    topOffset = stickyOffset(guideLayout);
    sidebarRect = guideSidebar.getBoundingClientRect();
    layoutRect = guideLayout.getBoundingClientRect();
    sidebarHeight = guideSidebarCard.offsetHeight;
    sidebarColumnHeight = guideSidebar.offsetHeight;
    fixedLeft = Math.round(sidebarRect.left);
    fixedWidth = Math.round(sidebarRect.width);
    absoluteTop = Math.max(0, sidebarColumnHeight - sidebarHeight);

    guideSidebar.style.position = "relative";
    guideSidebar.style.minHeight = sidebarHeight + "px";

    if (sidebarRect.top > topOffset) {
      guideSidebarCard.style.position = "relative";
      guideSidebarCard.style.top = "0";
      guideSidebarCard.style.left = "0";
      guideSidebarCard.style.width = "100%";
      return;
    }

    if (layoutRect.bottom <= topOffset + sidebarHeight) {
      guideSidebarCard.style.position = "absolute";
      guideSidebarCard.style.top = absoluteTop + "px";
      guideSidebarCard.style.left = "0";
      guideSidebarCard.style.width = "100%";
      return;
    }

    guideSidebarCard.style.position = "fixed";
    guideSidebarCard.style.top = topOffset + "px";
    guideSidebarCard.style.left = fixedLeft + "px";
    guideSidebarCard.style.width = fixedWidth + "px";
  }

  function syncBackToTopButton() {
    var showButton;

    if (!backToTopButton) {
      return;
    }

    showButton = window.pageYOffset > 320;

    backToTopButton.classList.toggle("is-visible", showButton);
    backToTopButton.setAttribute("aria-hidden", showButton ? "false" : "true");
    backToTopButton.tabIndex = showButton ? 0 : -1;
  }

  function scheduleLayoutSync() {
    if (layoutSyncFrame) {
      return;
    }

    layoutSyncFrame = window.requestAnimationFrame(function () {
      layoutSyncFrame = 0;
      syncProgressDockPosition();
      syncGuideSidebar();
      syncBackToTopButton();
    });
  }

  function titleCaseTag(tag) {
    if (tag === "qa") {
      return "Quality Assurance";
    }

    return tag
      .split("-")
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  function queryLabIdFromHref(href) {
    try {
      return new URL(href, window.location.href).searchParams.get("lab") || "";
    } catch (error) {
      return "";
    }
  }

  function uniqueList(items) {
    return Array.from(new Set((items || []).filter(Boolean)));
  }

  function resolveGuideTarget(target, sourceHref) {
    var requested = String(target || "").trim();
    var sourceLab = queryLabIdFromHref(sourceHref);
    var candidates = [requested, sourceLab];
    var resolved = "";

    candidates.some(function (candidate) {
      if (!candidate) {
        return false;
      }

      if (guideSectionMap[candidate]) {
        resolved = candidate;
        return true;
      }

      if (guideLegacyTargetMap[candidate] && guideSectionMap[guideLegacyTargetMap[candidate]]) {
        resolved = guideLegacyTargetMap[candidate];
        return true;
      }

      return false;
    });

    if (resolved) {
      return resolved;
    }

    return guideSections.length ? guideSections[0].id : "";
  }

  function guideAccentForEntry(title, description) {
    var text = normalizeText([title, description].join(" "));

    if (text.indexOf("help") !== -1 || text.indexOf("faq") !== -1 || text.indexOf("sla") !== -1) {
      return "pine";
    }

    if (text.indexOf("github") !== -1 || text.indexOf("sql") !== -1) {
      return "ocean";
    }

    if (
      text.indexOf("desktop") !== -1 ||
      text.indexOf("marketplace") !== -1 ||
      text.indexOf("screen") !== -1 ||
      text.indexOf("optishot") !== -1 ||
      text.indexOf("fixomat") !== -1 ||
      text.indexOf("sprint") !== -1
    ) {
      return "sienna";
    }

    return "red";
  }

  function guideHighlightsForEntry(id, title, description) {
    var text = normalizeText([id, title, description].join(" "));
    var highlights = [];

    if (text.indexOf("wms") !== -1) {
      highlights.push("WMS");
    }
    if (text.indexOf("github") !== -1) {
      highlights.push("GitHub");
    }
    if (text.indexOf("qa") !== -1 || text.indexOf("pull request") !== -1 || text.indexOf("publish") !== -1) {
      highlights.push("Quality Assurance / Publish");
    }
    if (text.indexOf("sql") !== -1 || text.indexOf("freesql") !== -1) {
      highlights.push("FreeSQL");
    }
    if (text.indexOf("quiz") !== -1) {
      highlights.push("Quizzes");
    }
    if (text.indexOf("screen") !== -1 || text.indexOf("optishot") !== -1 || text.indexOf("fixomat") !== -1) {
      highlights.push("Tools");
    }
    if (text.indexOf("desktop") !== -1) {
      highlights.push("Desktop");
    }
    if (text.indexOf("marketplace") !== -1) {
      highlights.push("Marketplace");
    }
    if (text.indexOf("help") !== -1 || text.indexOf("faq") !== -1) {
      highlights.push("Support");
    }
    if (text.indexOf("ai") !== -1) {
      highlights.push("AI");
    }
    if (text.indexOf("sprint") !== -1) {
      highlights.push("Sprints");
    }

    if (!highlights.length) {
      highlights.push("Author guide");
    }

    highlights.push("Original order");
    highlights.push("Markdown fallback");
    return uniqueList(highlights).slice(0, 3);
  }

  function guideTaskSectionLabel(count) {
    if (count <= 0) {
      return "No task sections";
    }

    return count + " task section" + (count === 1 ? "" : "s");
  }

  function guideSectionCountLabel(count) {
    if (count <= 0) {
      return "No sections";
    }

    return count + " section" + (count === 1 ? "" : "s");
  }

  function guideNavStateLabel(taskCount, sectionCount) {
    if (taskCount > 0) {
      return guideTaskSectionLabel(taskCount);
    }

    return guideSectionCountLabel(sectionCount);
  }

  function guideTaskStateLabel(section) {
    if (section && typeof section.taskCount === "number") {
      return guideTaskSectionLabel(section.taskCount);
    }

    return "Loading task sections";
  }

  function analyzeGuideSourceMarkdown(markdown) {
    var headings = String(markdown || "").match(/^##\s+.+$/gm) || [];
    var taskCount = headings.filter(function (line) {
      return /^\s*##\s+(?:\([^)]+\)\s*)?Task\b/i.test(line);
    }).length;

    return {
      taskCount: taskCount,
      panelCount: headings.length
    };
  }

  function applyGuideSourceMeta(section, meta) {
    if (!section || !meta) {
      return;
    }

    section.taskCount = meta.taskCount;
    section.panelCount = meta.panelCount;
    section.navState = guideNavStateLabel(meta.taskCount, meta.panelCount);
  }

  function loadGuideSourceMeta(section) {
    if (!section || !section.id || !section.sourcePath) {
      return Promise.resolve(null);
    }

    if (guideSectionMetaCache[section.id]) {
      return guideSectionMetaCache[section.id];
    }

    guideSectionMetaCache[section.id] = fetch(section.sourcePath, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Guide source markdown request failed with status " + response.status + ".");
        }

        return response.text();
      })
      .then(function (markdown) {
        var meta = analyzeGuideSourceMarkdown(markdown);

        applyGuideSourceMeta(section, meta);

        if (guideSectionNav) {
          renderGuideNav();
        }

        if (state.mode === "guide" && currentGuideSection() && currentGuideSection().id === section.id) {
          renderGuideSection();
        }

        return meta;
      })
      .catch(function () {
        var fallbackMeta = {
          taskCount: 0,
          panelCount: 0
        };

        applyGuideSourceMeta(section, fallbackMeta);

        if (guideSectionNav) {
          renderGuideNav();
        }

        return fallbackMeta;
      });

    return guideSectionMetaCache[section.id];
  }

  function buildGuideEntry(tutorial, index) {
    var filename = String((tutorial && tutorial.filename) || "");
    var title = String((tutorial && tutorial.title) || "Guide Page");
    var summary = String((tutorial && tutorial.description) || "").trim();
    var basename = filename.split("/").pop() || "";
    var id = basename.replace(/\.md$/i, "");

    return {
      id: id,
      label: "Section " + String(index + 1).padStart(2, "0"),
      title: title,
      summary: summary,
      purpose: "Original author-guide content indexed for search with direct access to the original guide.",
      accent: guideAccentForEntry(title, summary),
      highlights: guideHighlightsForEntry(id, title, summary),
      navState: "Loading sections",
      labs: [],
      sourcePath: filename,
      sectionHref: fullGuideHref,
      sectionLabel: "Open Full Guide",
      embedHref: guideHomeHref + "?lab=" + encodeURIComponent(id) + "&embed=1"
    };
  }

  function loadGuideCatalog() {
    if (guideCatalogPromise) {
      return guideCatalogPromise;
    }

    guideCatalogPromise = fetch(guideManifestHref, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Guide manifest request failed with status " + response.status + ".");
        }

        return response.json();
      })
      .then(function (manifest) {
        guideSections = (manifest.tutorials || []).map(buildGuideEntry).filter(function (entry) {
          return entry.id;
        });
        guideSectionMap = guideSections.reduce(function (accumulator, entry) {
          accumulator[entry.id] = entry;
          return accumulator;
        }, {});
        guideCatalogLoaded = true;
        state.guideSection = resolveGuideTarget(state.guideSection);
        previousView.guideSection = resolveGuideTarget(previousView.guideSection);
        guideSections.forEach(function (section) {
          loadGuideSourceMeta(section);
        });
        return guideSections;
      })
      .catch(function (error) {
        guideCatalogLoaded = false;
        console.error(error);
        return guideSections;
      });

    return guideCatalogPromise.then(function (entries) {
      renderHomeRouteMap();
      renderGuideNav();
      buildSearchIndex();

      if (state.mode === "guide") {
        renderGuideSection();
      } else if (state.mode === "search") {
        renderSearchResults();
      }

      return entries;
    });
  }

  function currentGuideTarget() {
    var preferred = "";

    if (state.mode === "guide" && state.guideSection) {
      preferred = state.guideSection;
    } else if (state.mode === "beginner" && stepMeta[state.currentStep]) {
      preferred = stepMeta[state.currentStep].guideTarget;
    }

    return resolveGuideTarget(preferred) || (guideSections[0] && guideSections[0].id) || "introduction";
  }

  function currentGuideSection() {
    return guideSectionMap[state.guideSection] || guideSections[0];
  }

  function openFullGuide(url) {
    var target = url || fullGuideHref;
    if (!target) {
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  }

  function currentGuideLab() {
    var section = currentGuideSection();

    if (!section || !state.guideFocusLab) {
      return null;
    }

    return (section.labs || []).find(function (lab) {
      return lab.id === state.guideFocusLab;
    }) || null;
  }

  function pickHomeToolkitMapItems() {
    var preferredIds = ["wms-request", "github-setup", "markdown-structure", "qa-checklist"];
    var preferredItems = preferredIds.map(function (id) {
      return explorerItems.find(function (item) {
        return item.id === id;
      });
    }).filter(Boolean);

    return preferredItems.length === preferredIds.length ? preferredItems : explorerItems.slice(0, 4);
  }

  function rememberViewForSearch() {
    if (state.mode === "search") {
      return;
    }

    previousView = {
      mode: state.mode,
      currentStep: state.currentStep,
      guideSection: state.guideSection,
      guideFocusLab: state.guideFocusLab
    };
  }

  function previousViewLabel() {
    if (previousView.mode === "beginner") {
      return "Back to Quickstart";
    }

    if (previousView.mode === "explorer") {
      return "Back to Cheatsheet";
    }

    if (previousView.mode === "guide") {
      return "Back to Full Guide";
    }

    return "Back to Home";
  }

  function updateNavSearch() {
    if (!navSearchInput) {
      return;
    }

    navSearchInput.value = state.searchQuery;
  }

  function updateNav() {
    modeNav.classList.remove("d-none");

    document.querySelectorAll(".nav-control").forEach(function (button) {
      var targetMode = button.getAttribute("data-mode-target");
      var isActive = targetMode === state.mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function updateBreadcrumb() {
    if (!breadcrumbTrail) {
      return;
    }

    breadcrumbTrail.innerHTML = "";
  }

  function updateProgressCaption() {
    if (!progressCaption) {
      return;
    }

    if (state.mode !== "beginner") {
      progressCaption.textContent = "Step 1 of 3 is active.";
      return;
    }

    progressCaption.textContent = "Step " + (state.currentStep + 1) + " of 3: " +
      stepMeta[state.currentStep].title + " (" + (state.fastTrack === "minimal" ? "Fast Track" : "Guided") + ").";
  }

  function updateBeginnerUI() {
    rabbitFlow.classList.toggle("track-minimal", state.fastTrack === "minimal");
    fastTrackToggle.checked = state.fastTrack === "minimal";
    fastTrackStatus.textContent = state.fastTrack === "minimal"
      ? "Fast Track hides the longer notes and common mistakes."
      : "Guided mode keeps notes, common mistakes, and extra context visible.";

    progressButtons.forEach(function (button, index) {
      var isActive = index === state.currentStep;
      var isComplete = index < state.currentStep;
      var mark = button.querySelector(".progress-mark");

      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-complete", isComplete);
      button.classList.remove("is-locked");
      button.setAttribute("aria-current", isActive ? "step" : "false");
      mark.innerHTML = isComplete ? "&#10003;" : String(index + 1);
    });

    stepSections.forEach(function (section, index) {
      section.classList.toggle("is-active", index === state.currentStep);
      section.classList.toggle("is-complete", index < state.currentStep);
      section.classList.remove("is-locked");
    });

    updateProgressCaption();
    updateBreadcrumb();
  }

  function renderExplorer() {
    var query = state.toolkitQuery.trim().toLowerCase();
    var visibleItems = explorerItems.filter(function (item) {
      var haystack = [
        item.title,
        item.short,
        item.description,
        flattenList(item.steps),
        flattenList(item.checkpoints),
        flattenList(item.watchFor),
        item.snippet || "",
        flattenFields(item.exampleFields),
        flattenResources(item.resourceLinks),
        flattenMilestones(item.milestones)
      ].concat(item.tags).join(" ").toLowerCase();
      var matchesQuery = !query || haystack.indexOf(query) !== -1;
      var matchesTag = state.activeTag === "all" || item.tags.indexOf(state.activeTag) !== -1;
      return matchesQuery && matchesTag;
    });

    bubbleGrid.innerHTML = visibleItems.map(function (item) {
      return [
        '<div class="col bubble-item" data-bubble-id="', item.id, '">',
        '  <button type="button" class="bubble-button" data-open-bubble="', item.id, '" data-accent="red" aria-label="Open ', escapeHtml(item.title), ' details">',
        '    <span class="bubble-badge">', escapeHtml(titleCaseTag(item.tags[0])), "</span>",
        '    <span class="bubble-title">', escapeHtml(item.title), "</span>",
        '    <span class="bubble-text">', escapeHtml(item.short), "</span>",
        "  </button>",
        "</div>"
      ].join("");
    }).join("");

    resultCount.textContent = "Showing " + visibleItems.length + " cheatsheet card" + (visibleItems.length === 1 ? "" : "s");
    emptyState.classList.toggle("d-none", visibleItems.length !== 0);
  }

  function renderHomeRouteMap() {
    var toolkitItems = pickHomeToolkitMapItems();

    if (!homeRouteMap) {
      return;
    }

    homeRouteMap.innerHTML = [
      '<div class="route-map-board">',
      '  <section class="route-map-entry">',
      '    <div>',
      '      <div class="panel-kicker">Start here</div>',
      '      <h3>Pick a route and move.</h3>',
      '      <p>Choose sequence, one answer, the full map, or the applied workshop demo.</p>',
      "    </div>",
      '    <div class="route-map-entry-actions">',
      '      <button type="button" class="btn btn-primary rounded-pill px-4" data-mode-target="beginner">Open Quickstart</button>',
      '      <button type="button" class="btn btn-outline-primary rounded-pill px-4" data-mode-target="explorer">Open Cheatsheet</button>',
      '      <a class="btn btn-outline-secondary rounded-pill px-4" href="', fullGuideHref, '" target="_blank" rel="noreferrer">Open Full Guide</a>',
      "    </div>",
      "  </section>",
      '  <div class="route-map-grid">',
      '    <article class="route-map-branch" data-accent="red">',
      '      <div class="route-map-branch-head">',
      '        <div>',
      '          <small>Ordered route</small>',
      '          <h4>Quickstart</h4>',
      "        </div>",
      '        <button type="button" class="btn btn-outline-primary rounded-pill px-3" data-mode-target="beginner">Open</button>',
      "      </div>",
      '      <p>Use when you want the shortest start-to-publish path.</p>',
      '      <ol class="route-map-list is-ordered">',
      stepMeta.map(function (step) {
        return "<li><strong>" + escapeHtml(step.title) + "</strong><span>" + escapeHtml(compactText(step.summary, 74)) + "</span></li>";
      }).join(""),
      "      </ol>",
      '      <div class="route-map-branch-foot">Leads to the same sections in Full Guide.</div>',
      "    </article>",
      '    <article class="route-map-branch" data-accent="ocean">',
      '      <div class="route-map-branch-head">',
      '        <div>',
      '          <small>Answer-first route</small>',
      '          <h4>Cheatsheet</h4>',
      "        </div>",
      '        <button type="button" class="btn btn-outline-primary rounded-pill px-3" data-mode-target="explorer">Open</button>',
      "      </div>",
      '      <p>Use when you already know the blocker.</p>',
      '      <ul class="route-map-list">',
      toolkitItems.map(function (item) {
        return "<li><strong>" + escapeHtml(item.title) + "</strong><span>" + escapeHtml(compactText(item.short || item.description || "", 72)) + "</span></li>";
      }).join(""),
      "      </ul>",
      '      <div class="route-map-branch-foot">Leads to focused cards, snippets, and source links.</div>',
      "    </article>",
      '    <article class="route-map-branch" data-accent="pine">',
      '      <div class="route-map-branch-head">',
      '        <div>',
      '          <small>Section map</small>',
      '          <h4>Full Guide</h4>',
      "        </div>",
      '        <a class="btn btn-outline-primary rounded-pill px-3" href="', fullGuideHref, '" target="_blank" rel="noreferrer">Open</a>',
      "      </div>",
      '      <p>Use when you want the whole section map in one place.</p>',
      '      <ul class="route-map-list">',
      guideSections.map(function (section) {
        var count = (section.labs || []).length;
        return "<li><strong>" + escapeHtml(section.label + " - " + section.title) + "</strong><span>" + escapeHtml(count + " item" + (count === 1 ? "" : "s")) + "</span></li>";
      }).join(""),
      "      </ul>",
      '      <div class="route-map-branch-foot">Leads to detailed section cards and source links.</div>',
      "    </article>",
      '    <article class="route-map-branch" data-accent="sienna">',
      '      <div class="route-map-branch-head">',
      '        <div>',
      '          <small>Applied reference</small>',
      '          <h4>Sample Workshop Demo</h4>',
      "        </div>",
      '        <a class="btn btn-outline-primary rounded-pill px-3" href="./sample-workshops/clinical-first-responder-rag/index.html">Open</a>',
      "      </div>",
      '      <p>Use when you want to inspect the design on a workshop surface.</p>',
      '      <ul class="route-map-list">',
      [
        "Provision the platform foundation",
        "Model grounded clinical knowledge",
        "Build prompts, guardrails, and patient chat",
        "Validate escalation and doctor handoff"
      ].map(function (item) {
        return "<li><strong>" + escapeHtml(item) + "</strong><span>Shows the pattern on a real workshop-style page.</span></li>";
      }).join(""),
      "      </ul>",
      '      <div class="route-map-branch-foot">Leads to an applied workshop example.</div>',
      "    </article>",
      "  </div>",
      '  <div class="route-map-ribbon">',
      '    <div>',
      '      <strong>Search crosses every route.</strong>',
      '      <span>One search surface crosses Quickstart, Cheatsheet, and Full Guide.</span>',
      "    </div>",
      '    <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-mode-target="search">Open Search</button>',
      "  </div>",
      "</div>"
    ].join("");
  }

  function setActiveTag(tag) {
    state.activeTag = tag;
    tagPills.forEach(function (pill) {
      pill.classList.toggle("is-active", pill.getAttribute("data-tag") === tag);
    });
    renderExplorer();
  }

  function fillList(id, items) {
    document.getElementById(id).innerHTML = (items || []).map(function (entry) {
      return "<li>" + escapeHtml(entry) + "</li>";
    }).join("");
  }

  function decorateExpandableMedia(root) {
    if (!root) {
      return;
    }

    root.querySelectorAll(".step-figure, .guide-figure, .modal-media-figure, .evidence-figure, .guide-source-panel-prose figure, .guide-source-prose figure").forEach(function (figure) {
      var image = figure.querySelector("img");
      var caption = figure.querySelector("figcaption");
      var captionText;
      var pill;

      if (!image) {
        return;
      }

      captionText = caption ? caption.textContent.trim() : "";
      figure.setAttribute("data-expandable", "true");
      figure.setAttribute("tabindex", "0");
      figure.setAttribute("role", "button");
      figure.setAttribute("aria-label", captionText ? "Expand image: " + captionText : "Expand image");

      pill = figure.querySelector(".figure-expand-pill");
      if (!pill) {
        pill = document.createElement("span");
        pill.className = "figure-expand-pill";
        pill.setAttribute("aria-hidden", "true");
        pill.textContent = "Click to expand";
        figure.insertBefore(pill, image);
      }
    });
  }

  function openImageLightbox(figure) {
    var image;
    var caption;
    var captionText;

    if (!figure || !imageLightbox) {
      return;
    }

    image = figure.querySelector("img");
    caption = figure.querySelector("figcaption");

    if (!image) {
      return;
    }

    captionText = caption ? caption.textContent.trim() : (image.getAttribute("alt") || "");
    lastExpandedFigure = figure;
    imageLightboxImage.setAttribute("src", image.currentSrc || image.getAttribute("src") || "");
    imageLightboxImage.setAttribute("alt", image.getAttribute("alt") || "");
    imageLightboxCaption.textContent = captionText;
    imageLightbox.removeAttribute("hidden");
    imageLightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-lightbox-open");
    imageLightboxClose.focus();
    setLiveMessage("Expanded image opened.");
  }

  function closeImageLightbox(options) {
    var config = Object.assign({
      announce: true,
      restoreFocus: true
    }, options || {});

    if (!imageLightbox || imageLightbox.hasAttribute("hidden")) {
      return;
    }

    imageLightbox.setAttribute("hidden", "");
    imageLightbox.setAttribute("aria-hidden", "true");
    imageLightboxImage.setAttribute("src", "");
    imageLightboxImage.setAttribute("alt", "");
    imageLightboxCaption.textContent = "";
    document.body.classList.remove("image-lightbox-open");

    if (config.restoreFocus && lastExpandedFigure && typeof lastExpandedFigure.focus === "function") {
      lastExpandedFigure.focus();
    }

    lastExpandedFigure = null;

    if (config.announce) {
      setLiveMessage("Expanded image closed.");
    }
  }

  function buildSupportBlockHtml(title, intro, innerHtml, kicker) {
    if (!innerHtml) {
      return "";
    }

    return [
      '<section class="detail-support-block">',
      '  <div class="detail-block-header">',
      kicker ? '    <div class="panel-kicker">' + escapeHtml(kicker) + "</div>" : "",
      title ? '    <h3>' + escapeHtml(title) + "</h3>" : "",
      intro ? '    <p>' + escapeHtml(intro) + "</p>" : "",
      "  </div>",
      innerHtml,
      "</section>"
    ].join("");
  }

  function renderFieldValueHtml(value) {
    var lines = String(value || "")
      .split(/\n+/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    if (lines.length <= 1) {
      return '  <p class="detail-field-value">' + escapeHtml(value) + "</p>";
    }

    return [
      '  <p class="detail-field-value">', escapeHtml(lines[0]), "</p>",
      '  <ul class="detail-inline-list">',
      lines.slice(1).map(function (line) {
        return "<li>" + escapeHtml(line) + "</li>";
      }).join(""),
      "  </ul>"
    ].join("");
  }

  function buildFieldCardsHtml(title, intro, fields, kicker) {
    if (!fields || !fields.length) {
      return "";
    }

    return buildSupportBlockHtml(title, intro, [
      '<div class="detail-field-grid">',
      fields.map(function (field) {
        return [
          '<article class="detail-field-card">',
          '  <span class="detail-field-label">', escapeHtml(field.label), "</span>",
          renderFieldValueHtml(field.value),
          field.guidance || field.note ? '  <p class="detail-field-note">' + escapeHtml(field.guidance || field.note) + "</p>" : "",
          "</article>"
        ].join("");
      }).join(""),
      "</div>"
    ].join(""), kicker || "Worked example");
  }

  function buildMilestoneCardsHtml(title, intro, items, kicker) {
    if (!items || !items.length) {
      return "";
    }

    return buildSupportBlockHtml(title, intro, [
      '<div class="detail-milestone-grid">',
      items.map(function (item) {
        return [
          '<article class="detail-milestone-card">',
          '  <strong>', escapeHtml(item.label), "</strong>",
          '  <p>', escapeHtml(item.detail), "</p>",
          "</article>"
        ].join("");
      }).join(""),
      "</div>"
    ].join(""), kicker || "Status flow");
  }

  function buildResourceLinksHtml(title, intro, items, kicker) {
    if (!items || !items.length) {
      return "";
    }

    return buildSupportBlockHtml(title, intro, [
      '<div class="detail-resource-grid">',
      items.map(function (item, index) {
        return [
          '<article class="detail-resource-link detail-resource-card">',
          '  <div class="detail-resource-main">',
          '    <span class="detail-resource-number">', index + 1, "</span>",
          '    <span>',
          '      <strong>', escapeHtml(item.label), "</strong>",
          item.note ? '      <span>' + escapeHtml(item.note) + "</span>" : "",
          "    </span>",
          "  </div>",
          '  <div class="detail-resource-actions">',
          '    <a class="btn btn-outline-primary rounded-pill px-3" href="', escapeHtml(item.href), '" target="_blank" rel="noreferrer">Open</a>',
          '    <button class="copy-snippet copy-link-button" type="button" data-copy-text="', escapeAttribute(item.href), '">Copy link</button>',
          "  </div>",
          "</article>"
        ].join("");
      }).join(""),
      "</div>"
    ].join(""), kicker || "Resources");
  }

  function setSupportMount(id, html) {
    var mount = document.getElementById(id);

    if (!mount) {
      return;
    }

    mount.innerHTML = html || "";
    mount.classList.toggle("d-none", !html);
  }

  function hydrateVideoCards(root) {
    if (window.RedwoodVideoPlayer && typeof window.RedwoodVideoPlayer.hydrate === "function") {
      window.RedwoodVideoPlayer.hydrate(root || document);
    }
  }

  function renderVideoCardMount(config) {
    if (!window.RedwoodVideoPlayer || typeof window.RedwoodVideoPlayer.createMountMarkup !== "function") {
      return "";
    }

    return window.RedwoodVideoPlayer.createMountMarkup(Object.assign({
      src: "./assets/media/guide/author-guide-template.mp4",
      captions: "./assets/media/guide/author-guide-template.vtt",
      autoplay: true,
      loop: true
    }, config || {}));
  }

  function openBubble(id) {
    var item = explorerItems.find(function (candidate) {
      return candidate.id === id;
    });
    var mediaCard;
    var sourceLink;
    var guideButton;
    var snippetCard;

    if (!item) {
      return;
    }

    document.getElementById("bubbleModalKicker").textContent = item.tags.map(titleCaseTag).join(" / ");
    document.getElementById("bubbleModalLabel").textContent = item.title;
    document.getElementById("bubbleModalDescription").textContent = item.description;
    document.getElementById("bubbleModalTags").innerHTML = item.tags.map(function (tag) {
      return '<span class="detail-tag">' + escapeHtml(titleCaseTag(tag)) + "</span>";
    }).join("");
    fillList("bubbleModalSteps", item.steps);
    fillList("bubbleModalCheckpoints", item.checkpoints);
    fillList("bubbleModalWatchFor", item.watchFor);

    mediaCard = document.getElementById("bubbleModalMediaCard");
    if (item.image) {
      document.getElementById("bubbleModalImage").setAttribute("src", item.image.src);
      document.getElementById("bubbleModalImage").setAttribute("alt", item.image.alt || item.title);
      document.getElementById("bubbleModalImageCaption").textContent = item.image.caption || "";
      mediaCard.classList.remove("d-none");
      decorateExpandableMedia(mediaCard);
    } else {
      mediaCard.classList.add("d-none");
    }

    setSupportMount(
      "bubbleModalMilestonesMount",
      buildMilestoneCardsHtml(item.milestonesTitle || "Status flow", item.milestonesIntro || "", item.milestones, "Status flow")
    );
    setSupportMount(
      "bubbleModalExampleMount",
      buildFieldCardsHtml(item.exampleTitle || "Worked example", item.exampleIntro || "", item.exampleFields, "Worked example")
    );
    setSupportMount(
      "bubbleModalResourcesMount",
      buildResourceLinksHtml(item.resourcesTitle || "Useful links", item.resourcesIntro || "", item.resourceLinks, "Resources")
    );
    setSupportMount(
      "bubbleModalVideoMount",
      renderVideoPlaceholderCard(
        "Recorded walkthrough for " + item.title,
        "Watch the quick topic pass first, then use the panel details, snippets, and source links underneath.",
        [
          "Topic walkthrough",
          "Audio controls",
          "Autoplay ready"
        ]
      )
    );

    snippetCard = document.getElementById("bubbleModalSnippetCard");
    if (item.snippet) {
      document.getElementById("bubbleModalSnippetMeta").textContent = item.snippetMeta || "Reference snippet";
      document.getElementById("bubbleModalSnippetTitle").textContent = item.snippetTitle || "Snippet";
      document.getElementById("bubbleModalSnippet").textContent = item.snippet;
      snippetCard.classList.remove("d-none");
    } else {
      document.getElementById("bubbleModalSnippet").textContent = "";
      snippetCard.classList.add("d-none");
    }

    sourceLink = document.getElementById("bubbleModalSourceLink");
    if (item.sourceHref) {
      sourceLink.setAttribute("href", fullGuideHref);
      sourceLink.textContent = "Open Full Guide";
      sourceLink.classList.remove("d-none");
    } else {
      sourceLink.classList.add("d-none");
    }

    guideButton = document.getElementById("bubbleModalGuideButton");
    if (guideButton) {
      guideButton.classList.add("d-none");
    }

    hydrateVideoCards(bubbleModalElement);
    bubbleModal.show();
    setLiveMessage(item.title + " opened.");
  }

  function renderGuideNav() {
    if (!guideSectionNav) {
      return;
    }

    guideSectionNav.innerHTML = guideSections.map(function (section) {
      return [
        '<button type="button" class="guide-nav-link',
        section.id === state.guideSection ? " is-active" : "",
        '" data-guide-section="', section.id, '" data-accent="', section.accent, '">',
        '  <small>', escapeHtml(section.label), "</small>",
        '  <strong>', escapeHtml(section.title), "</strong>",
        '  <span class="guide-nav-meta">', escapeHtml(section.navState || "Loading sections"), "</span>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderGuideQuickNav() {
    if (!guideQuickNav) {
      return;
    }

    guideQuickNav.innerHTML = guideSections.map(function (section) {
      return [
        '<button type="button" class="guide-quick-link',
        section.id === state.guideSection ? " is-active" : "",
        '" data-guide-section="', section.id, '">',
        '  <span>', escapeHtml(section.label), "</span>",
        '  <strong>', escapeHtml(section.title), "</strong>",
        "</button>"
      ].join("");
    }).join("");
  }

  function buildGuideBreadcrumb(section, lab) {
    return [
      '<div class="guide-inline-breadcrumb" aria-label="Current guide section">',
      "  <span>Full Guide</span>",
      "  <span>/</span>",
      "  <span>", escapeHtml(section.label), "</span>",
      "  <span>/</span>",
      "  <strong>", escapeHtml(section.title), "</strong>",
      lab ? "  <span>/</span>" : "",
      lab ? "  <strong>" + escapeHtml(lab.title) + "</strong>" : "",
      "</div>"
    ].join("");
  }

  function renderGuidePanel(title, items, options) {
    var config = Object.assign({
      ordered: false
    }, options || {});
    var listTag = config.ordered ? "ol" : "ul";
    var listClass = config.ordered ? "guide-list is-ordered" : "guide-list";

    if (!items || !items.length) {
      return "";
    }

    return [
      '<div class="guide-lab-panel">',
      '  <h4>', escapeHtml(title), "</h4>",
      "  <", listTag, ' class="', listClass, '">',
      items.map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      }).join(""),
      "  </", listTag, ">",
      "</div>"
    ].join("");
  }

  function renderGuideSnippetCard(id, snippet, title, meta) {
    if (!snippet) {
      return "";
    }

    return [
      '<div class="card snippet-card mt-4">',
      '  <div class="card-body">',
      '    <div class="snippet-header">',
      "      <div>",
      '        <div class="snippet-meta">', escapeHtml(meta || "Copy-ready detail"), "</div>",
      '        <h4 class="mb-0">', escapeHtml(title || "Snippet"), "</h4>",
      "      </div>",
      '      <button class="copy-snippet" type="button" data-copy-target="', id, '">Copy</button>',
      "    </div>",
      '    <pre><code id="', id, '">', escapeHtml(snippet), "</code></pre>",
      "  </div>",
      "</div>"
    ].join("");
  }

  function renderVideoPlaceholderCard(title, summary, featureLabels) {
    return renderVideoCardMount({
      title: title,
      summary: summary,
      features: featureLabels || [
        "Controls ready",
        "Audio controls",
        "Autoplay ready"
      ]
    });
  }

  function guideSectionVideoFeatures(section) {
    var features = [
      section && typeof section.taskCount === "number"
        ? guideTaskStateLabel(section)
        : "Redesigned controls"
    ].concat(section.highlights || []);

    if (!features.length) {
      return ["Redesigned controls", "Audio controls", "Markdown fallback"];
    }

    return uniqueList(features).slice(0, 3);
  }

  function renderGuideLab(section, lab) {
    var snippetId = "guide-snippet-" + section.id + "-" + lab.id;
    var targetedClass = state.guideFocusLab === lab.id ? " is-targeted" : "";
    var stepsBlock = renderGuidePanel("What You Do", lab.steps || [], { ordered: true });
    var mediaBlock = lab.image ? [
      '<figure class="guide-figure">',
      '  <figcaption>', escapeHtml(lab.image.caption || ""), "</figcaption>",
      '  <img src="', escapeHtml(lab.image.src), '" alt="', escapeHtml(lab.image.alt || lab.title), '">',
      "</figure>"
    ].join("") : "";
    var flowBlock = mediaBlock ? '<div class="guide-lab-flow">' + stepsBlock + mediaBlock + "</div>" : stepsBlock;
    var supportBlocks = [
      buildFieldCardsHtml(lab.exampleTitle || "Worked example", lab.exampleIntro || "", lab.exampleFields, "Worked example"),
      buildMilestoneCardsHtml(lab.milestonesTitle || "Status flow", lab.milestonesIntro || "", lab.milestones, "Status flow"),
      renderGuidePanel(lab.checkpointsTitle || "Before You Move On", lab.checkpoints || []),
      buildResourceLinksHtml(lab.resourcesTitle || "Useful links", lab.resourcesIntro || "", lab.resourceLinks, "Resources"),
      renderGuidePanel("Watch For", lab.watchFor || [])
    ].filter(Boolean).join("");

    return [
      '<article class="guide-lab-card', targetedClass, '" id="guide-lab-', section.id, "-", lab.id, '">',
      '  <div class="guide-lab-top">',
      '    <div class="guide-lab-label">', escapeHtml(lab.label || "Lab"), "</div>",
      '    <h3 class="guide-lab-title">', escapeHtml(lab.title), "</h3>",
      '    <p class="guide-lab-summary">', escapeHtml(lab.summary), "</p>",
      "  </div>",
      flowBlock,
      supportBlocks ? '<div class="guide-lab-panels">' + supportBlocks + "</div>" : "",
      renderGuideSnippetCard(snippetId, lab.snippet, lab.snippetTitle || "Snippet", lab.snippetMeta || "Copy-ready detail"),
      '  <div class="guide-lab-actions">',
      lab.sourceHref ? '<a class="btn btn-outline-secondary rounded-pill px-4" href="' + escapeHtml(fullGuideHref) + '" target="_blank" rel="noreferrer">Open Full Guide</a>' : "",
      "  </div>",
      "</article>"
    ].join("");
  }

  function renderGuideSection() {
    var section = currentGuideSection();
    var lab = currentGuideLab();

    if (!section || !guideSectionMount) {
      return;
    }

    guideSectionMount.innerHTML = [
      '<article class="guide-section-card" data-accent="', section.accent, '">',
      '  <div class="guide-section-hero">',
      '    <div class="guide-section-copy">',
      buildGuideBreadcrumb(section, lab),
      '      <div class="panel-kicker">', escapeHtml(section.label), "</div>",
      '      <h2 class="guide-section-title">', escapeHtml(section.title), "</h2>",
      '      <p class="guide-section-summary">', escapeHtml(section.summary), "</p>",
      '      <p class="guide-section-purpose">', escapeHtml(section.purpose), "</p>",
      renderVideoPlaceholderCard(
        section.title + " walkthrough",
        section.summary || section.purpose || "Use the recorded walkthrough first, then move through the section cards underneath.",
        guideSectionVideoFeatures(section)
      ),
      '      <div class="guide-highlight-row">',
      section.highlights.map(function (item) {
        return '<span class="guide-highlight-chip">' + escapeHtml(item) + "</span>";
      }).join(""),
      "      </div>",
      '      <div class="guide-section-actions">',
      '        <button type="button" class="btn btn-outline-primary rounded-pill px-4" data-mode-target="explorer">Open Cheatsheet</button>',
      section.sectionHref ? '<a class="btn btn-outline-secondary rounded-pill px-4" href="' + escapeHtml(fullGuideHref) + '" target="_blank" rel="noreferrer">Open Full Guide</a>' : "",
      "      </div>",
      "    </div>",
      "  </div>",
      '  <div class="guide-lab-grid">',
      section.labs.map(function (lab) {
        return renderGuideLab(section, lab);
      }).join(""),
      "  </div>",
      "</article>"
    ].join("");

    renderGuideNav();
    renderGuideQuickNav();
    hydrateVideoCards(guideSectionMount);
    decorateExpandableMedia(guideSectionMount);
    scheduleLayoutSync();
    updateBreadcrumb();
  }

  function createSearchEntry(config) {
    var titleText = config.title || "";
    var summaryText = config.summary || "";
    var pathText = config.path || "";
    var bodyText = [
      config.body || "",
      flattenList(config.steps),
      flattenList(config.checkpoints),
      flattenList(config.watchFor),
      config.snippet || "",
      flattenFields(config.exampleFields),
      flattenResources(config.resourceLinks),
      flattenMilestones(config.milestones),
      flattenList(config.tags),
      flattenList(config.keywords)
    ].join(" ");
    var titleNorm = expandSearchText(titleText);
    var summaryNorm = expandSearchText(summaryText);
    var pathNorm = expandSearchText(pathText);
    var bodyNorm = expandSearchText(bodyText);

    return {
      id: config.id,
      typeLabel: config.typeLabel,
      title: titleText,
      summary: summaryText,
      path: pathText,
      sourceHref: config.sourceHref || "",
      sourceLabel: config.sourceLabel || "",
      open: config.open,
      titleNorm: titleNorm,
      summaryNorm: summaryNorm,
      pathNorm: pathNorm,
      bodyNorm: bodyNorm,
      combinedNorm: [titleNorm, summaryNorm, pathNorm, bodyNorm].join(" "),
      titleTokens: tokenSet(titleNorm),
      summaryTokens: tokenSet(summaryNorm),
      pathTokens: tokenSet(pathNorm),
      combinedTokens: tokenSet([titleNorm, summaryNorm, pathNorm, bodyNorm].join(" "))
    };
  }

  function buildSearchIndex() {
    searchIndex = [];
    searchEntryMap = {};

    stepMeta.forEach(function (meta, index) {
      var entry = createSearchEntry({
        id: "guided-" + meta.id,
        typeLabel: "Quickstart",
        title: meta.title,
        summary: meta.summary || "",
        path: "Quickstart / Step " + (index + 1),
        body: stepSections[index] ? stepSections[index].textContent : "",
        keywords: meta.keywords || [],
        open: {
          kind: "guided",
          step: index
        }
      });

      searchIndex.push(entry);
      searchEntryMap[entry.id] = entry;
    });

    explorerItems.forEach(function (item) {
      var entry = createSearchEntry({
        id: "toolkit-" + item.id,
        typeLabel: "Cheatsheet",
        title: item.title,
        summary: item.description || item.short || "",
        path: "Cheatsheet / " + item.title,
        steps: item.steps,
        checkpoints: item.checkpoints,
        watchFor: item.watchFor,
        snippet: item.snippet,
        exampleFields: item.exampleFields,
        resourceLinks: item.resourceLinks,
        milestones: item.milestones,
        tags: item.tags,
        sourceHref: item.sourceHref,
        sourceLabel: item.sourceLabel,
        open: {
          kind: "toolkit",
          itemId: item.id
        }
      });

      searchIndex.push(entry);
      searchEntryMap[entry.id] = entry;
    });

    guideSections.forEach(function (section) {
      var sectionEntry = createSearchEntry({
        id: "guide-section-" + section.id,
        typeLabel: "Full Guide",
        title: section.title,
        summary: section.summary || section.purpose || "",
        path: "Full Guide / " + section.label + " / " + section.title,
        body: [section.purpose || "", flattenList(section.highlights)].join(" "),
        sourceHref: section.sectionHref,
        sourceLabel: section.sectionLabel,
        open: {
          kind: "guide-section",
          sectionId: section.id
        }
      });

      searchIndex.push(sectionEntry);
      searchEntryMap[sectionEntry.id] = sectionEntry;

      (section.labs || []).forEach(function (lab) {
        var labEntry = createSearchEntry({
          id: "guide-lab-" + section.id + "-" + lab.id,
          typeLabel: "Full Guide",
          title: lab.title,
          summary: lab.summary || "",
          path: "Full Guide / " + section.label + " / " + (lab.label || "Lab") + " / " + lab.title,
          steps: lab.steps,
          checkpoints: lab.checkpoints,
          watchFor: lab.watchFor,
          snippet: lab.snippet,
          exampleFields: lab.exampleFields,
          resourceLinks: lab.resourceLinks,
          milestones: lab.milestones,
          sourceHref: lab.sourceHref,
          sourceLabel: lab.sourceLabel,
          open: {
            kind: "guide-lab",
            sectionId: section.id,
            labId: lab.id
          }
        });

        searchIndex.push(labEntry);
        searchEntryMap[labEntry.id] = labEntry;
      });
    });
  }

  function scoreSearchEntry(entry, query) {
    var normalizedQuery = normalizeText(query);
    var queryTokens = Array.from(new Set(tokenize(expandSearchText(query))));
    var matchedTokens = 0;
    var score = 0;

    if (!normalizedQuery && !queryTokens.length) {
      return 0;
    }

    if (normalizedQuery && entry.titleNorm.indexOf(normalizedQuery) !== -1) {
      score += 80;
    }

    if (normalizedQuery && normalizedQuery.indexOf(" ") !== -1 && entry.summaryNorm.indexOf(normalizedQuery) !== -1) {
      score += 38;
    }

    if (normalizedQuery && entry.pathNorm.indexOf(normalizedQuery) !== -1) {
      score += 24;
    }

    if (normalizedQuery && entry.bodyNorm.indexOf(normalizedQuery) !== -1) {
      score += 18;
    }

    queryTokens.forEach(function (token) {
      if (entry.titleTokens.has(token)) {
        matchedTokens += 1;
        score += 14;
        return;
      }

      if (entry.pathTokens.has(token)) {
        matchedTokens += 1;
        score += 10;
        return;
      }

      if (entry.summaryTokens.has(token)) {
        matchedTokens += 1;
        score += 8;
        return;
      }

      if (entry.combinedTokens.has(token)) {
        matchedTokens += 1;
        score += 4;
      }
    });

    if (queryTokens.length && matchedTokens === queryTokens.length) {
      score += 22;
    } else if (queryTokens.length > 1 && matchedTokens >= 2) {
      score += 8;
    }

    return score;
  }

  function renderSearchResultCard(result) {
    return [
      '<article class="search-result-card">',
      '  <div class="search-result-top">',
      '    <span class="search-result-kicker">', escapeHtml(result.typeLabel), "</span>",
      "  </div>",
      '  <div class="search-result-path">', escapeHtml(result.path), "</div>",
      '  <h3 class="search-result-title">', escapeHtml(result.title), "</h3>",
      '  <p class="search-result-summary">', escapeHtml(result.summary), "</p>",
      '  <div class="search-result-actions">',
      '    <button type="button" class="btn btn-primary rounded-pill px-4" data-search-open="', result.id, '">Open Result</button>',
      result.sourceHref ? '<a class="btn btn-outline-secondary rounded-pill px-4" href="' + escapeHtml(result.sourceHref) + '" target="_blank" rel="noreferrer">Open Full Guide</a>' : "",
      "  </div>",
      "</article>"
    ].join("");
  }

  function renderSearchResults() {
    var query = state.searchQuery.trim();
    var results;

    if (!searchResultsMount || !searchEmptyState) {
      return;
    }

    if (searchBackButton) {
      searchBackButton.textContent = previousViewLabel();
    }

    if (searchQueryChip) {
      searchQueryChip.textContent = query ? 'Query: "' + query + '"' : "No query yet";
    }

    if (!query) {
      searchSummary.textContent = "Enter keywords or a short question in the menu search. Results link back into the exact Quickstart step, Cheatsheet card, or full-guide section that best matches the query.";
      searchCountChip.textContent = "0 results";
      searchResultsMount.innerHTML = "";
      searchEmptyState.innerHTML = "Use the search field in the menu to search by keywords such as <strong>WMS</strong>, <strong>Self Quality Assurance</strong>, <strong>GitHub Pages</strong>, <strong>validator</strong>, or a short question such as <strong>how do I publish</strong>.";
      searchEmptyState.classList.remove("d-none");
      updateBreadcrumb();
      return;
    }

    results = searchIndex
      .map(function (entry) {
        return {
          entry: entry,
          score: scoreSearchEntry(entry, query)
        };
      })
      .filter(function (item) {
        return item.score >= 14;
      })
      .sort(function (left, right) {
        return right.score - left.score;
      })
      .slice(0, 14)
      .map(function (item) {
        return item.entry;
      });

    searchResultsMount.innerHTML = results.map(renderSearchResultCard).join("");
    searchCountChip.textContent = results.length + " result" + (results.length === 1 ? "" : "s");

    if (results.length) {
      searchSummary.textContent = "Results are ranked by title match, keyword overlap, path relevance, and deeper body matches across Quickstart, Cheatsheet, and Full Guide.";
      searchEmptyState.classList.add("d-none");
    } else {
      searchSummary.textContent = "The guide did not find a strong match for that query yet.";
      searchEmptyState.innerHTML = 'No strong matches for <strong>"' + escapeHtml(query) + '</strong>. Try shorter keywords such as <strong>publish</strong>, <strong>validator</strong>, <strong>Quarterly Quality Assurance</strong>, <strong>GitHub Pages</strong>, or <strong>manifest</strong>.';
      searchEmptyState.classList.remove("d-none");
    }

    updateBreadcrumb();
  }

  function renderHomeRouteMap() {
    var firstGuideId = guideSections.length ? guideSections[0].id : "introduction";
    var guidePreviewItems = guideSections.slice(0, 4);
    var guideSummary = guideSections.length
      ? guideSections.length + " guide sections in the active manifest order"
      : "Loading guide pages...";
    var toolkitItems = pickHomeToolkitMapItems();

    if (!homeRouteMap) {
      return;
    }

    homeRouteMap.innerHTML = [
      '<div class="route-map-board">',
      '  <section class="route-map-entry">',
      '    <div>',
      '      <div class="panel-kicker">Start here</div>',
      '      <h3>Pick the route that matches the job.</h3>',
      '      <p>Choose sequence, one answer, the original full guide, or the applied workshop demo.</p>',
      "    </div>",
      '    <div class="route-map-entry-actions">',
      '      <button type="button" class="btn btn-primary rounded-pill px-4" data-mode-target="beginner">Open Quickstart</button>',
      '      <button type="button" class="btn btn-outline-primary rounded-pill px-4" data-mode-target="explorer">Open Cheatsheet</button>',
      '      <a class="btn btn-outline-secondary rounded-pill px-4" href="', fullGuideHref, '" target="_blank" rel="noreferrer">Open Full Guide</a>',
      "    </div>",
      "  </section>",
      '  <div class="route-map-grid">',
      '    <article class="route-map-branch" data-accent="red">',
      '      <div class="route-map-branch-head">',
      '        <div>',
      '          <small>Ordered route</small>',
      '          <h4>Quickstart</h4>',
      "        </div>",
      '        <button type="button" class="btn btn-outline-primary rounded-pill px-3" data-mode-target="beginner">Open</button>',
      "      </div>",
      '      <p>Use when you want the shortest start-to-publish path.</p>',
      '      <ol class="route-map-list is-ordered">',
      stepMeta.map(function (step) {
        return "<li><strong>" + escapeHtml(step.title) + "</strong><span>" + escapeHtml(compactText(step.summary, 74)) + "</span></li>";
      }).join(""),
      "      </ol>",
      '      <div class="route-map-branch-foot">Leads into the same Full Guide pages when you need more detail.</div>',
      "    </article>",
      '    <article class="route-map-branch" data-accent="ocean">',
      '      <div class="route-map-branch-head">',
      '        <div>',
      '          <small>Answer-first route</small>',
      '          <h4>Cheatsheet</h4>',
      "        </div>",
      '        <button type="button" class="btn btn-outline-primary rounded-pill px-3" data-mode-target="explorer">Open</button>',
      "      </div>",
      '      <p>Use when you already know the blocker.</p>',
      '      <ul class="route-map-list">',
      toolkitItems.map(function (item) {
        return "<li><strong>" + escapeHtml(item.title) + "</strong><span>" + escapeHtml(compactText(item.short || item.description || "", 72)) + "</span></li>";
      }).join(""),
      "      </ul>",
      '      <div class="route-map-branch-foot">Leads to focused cards, snippets, and source links.</div>',
      "    </article>",
      '    <article class="route-map-branch" data-accent="pine">',
      '      <div class="route-map-branch-head">',
      '        <div>',
      '          <small>Original guide</small>',
      '          <h4>Full Guide</h4>',
      "        </div>",
      '        <a class="btn btn-outline-primary rounded-pill px-3" href="', fullGuideHref, '" target="_blank" rel="noreferrer">Open</a>',
      "      </div>",
      '      <p>Use when you want the original author guide outside this quick guide.</p>',
      '      <ul class="route-map-list">',
      guidePreviewItems.map(function (entry) {
        return "<li><strong>" + escapeHtml(entry.title) + "</strong><span>" + escapeHtml(compactText(entry.summary || entry.navState, 72)) + "</span></li>";
      }).join(""),
      "      </ul>",
      '      <div class="route-map-branch-foot">', escapeHtml(guideSummary), ".</div>",
      "    </article>",
      '    <article class="route-map-branch" data-accent="sienna">',
      '      <div class="route-map-branch-head">',
      '        <div>',
      '          <small>Applied reference</small>',
      '          <h4>Sample Workshop Demo</h4>',
      "        </div>",
      '        <a class="btn btn-outline-primary rounded-pill px-3" href="./sample-workshops/clinical-first-responder-rag/index.html">Open</a>',
      "      </div>",
      '      <p>Use when you want to inspect the design on a workshop surface.</p>',
      '      <ul class="route-map-list">',
      [
        "Provision the platform foundation",
        "Model grounded clinical knowledge",
        "Build prompts, guardrails, and patient chat",
        "Validate escalation and doctor handoff"
      ].map(function (item) {
        return "<li><strong>" + escapeHtml(item) + "</strong><span>Shows the pattern on a real workshop-style page.</span></li>";
      }).join(""),
      "      </ul>",
      '      <div class="route-map-branch-foot">Leads to an applied workshop example.</div>',
      "    </article>",
      "  </div>",
      '  <div class="route-map-ribbon">',
      '    <div>',
      '      <strong>Search crosses every redesigned route.</strong>',
      '      <span>One search surface crosses Quickstart, Cheatsheet, and the indexed source guide.</span>',
      "    </div>",
      '    <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-mode-target="search">Open Search</button>',
      "  </div>",
      "</div>"
    ].join("");
  }

  function renderGuideNav() {
    if (!guideSectionNav) {
      return;
    }

    if (!guideSections.length) {
      guideSectionNav.innerHTML = '<div class="guide-empty-state">Loading guide sections...</div>';
      return;
    }

    guideSectionNav.innerHTML = guideSections.map(function (section) {
      return [
        '<button type="button" class="guide-nav-link',
        section.id === state.guideSection ? " is-active" : "",
        '" data-guide-section="', section.id, '" data-accent="', section.accent, '">',
        '  <small>', escapeHtml(section.label), "</small>",
        '  <strong>', escapeHtml(section.title), "</strong>",
        '  <span class="guide-nav-meta">', escapeHtml(section.navState || "Loading sections"), "</span>",
        "</button>"
      ].join("");
    }).join("");
  }

  function renderGuideQuickNav() {
    if (!guideQuickNav) {
      return;
    }

    guideQuickNav.innerHTML = guideSections.map(function (section) {
      return [
        '<button type="button" class="guide-quick-link',
        section.id === state.guideSection ? " is-active" : "",
        '" data-guide-section="', section.id, '">',
        '  <span>', escapeHtml(section.label), "</span>",
        '  <strong>', escapeHtml(section.title), "</strong>",
        "</button>"
      ].join("");
    }).join("");
  }

  function createGuideSourceLoader(section) {
    var frame = document.createElement("iframe");

    frame.className = "guide-source-loader";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.src = section.embedHref || section.sectionHref || "";
    return frame;
  }

  function waitForGuideModuleContent(frame, remainingChecks) {
    return new Promise(function (resolve, reject) {
      function check() {
        var moduleContent;
        var textLength;

        try {
          moduleContent = frame.contentDocument && frame.contentDocument.getElementById("module-content");
          textLength = moduleContent ? moduleContent.textContent.replace(/\s+/g, " ").trim().length : 0;
        } catch (error) {
          moduleContent = null;
          textLength = 0;
        }

        if (moduleContent && textLength > 80) {
          resolve(moduleContent);
          return;
        }

        if (remainingChecks <= 0) {
          reject(new Error("Guide source content did not finish rendering in time."));
          return;
        }

        remainingChecks -= 1;
        window.setTimeout(check, 250);
      }

      check();
    });
  }

  function guideSourceSlug(value) {
    var slug = normalizeText(value || "").replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").replace(/\-+/g, "-");
    return slug || "section";
  }

  function stripGuideSourceDisplay(node) {
    var styleValue;

    if (!node || !node.getAttribute) {
      return;
    }

    styleValue = node.getAttribute("style");

    if (!styleValue || !/display\s*:\s*none/i.test(styleValue)) {
      return;
    }

    styleValue = styleValue
      .replace(/\bdisplay\s*:\s*none;?/ig, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (styleValue) {
      node.setAttribute("style", styleValue);
      return;
    }

    node.removeAttribute("style");
  }

  function pruneGuideSourceArtifacts(root) {
    if (!root) {
      return;
    }

    Array.prototype.forEach.call(root.querySelectorAll(".hol-ToggleRegions, #btn_toggle, #modalWindow, #modalCaption, #modalClose, #modalImg, #markdownMediaLightbox, .md-lightbox, .md-expand-pill"), function (node) {
      node.remove();
    });

    Array.prototype.forEach.call(root.querySelectorAll("[data-md-expandable]"), function (node) {
      node.removeAttribute("data-md-expandable");
      node.removeAttribute("role");
      node.removeAttribute("tabindex");
      node.removeAttribute("aria-label");
    });

    Array.prototype.forEach.call(root.querySelectorAll("[style]"), function (node) {
      stripGuideSourceDisplay(node);
    });

    Array.prototype.forEach.call(root.querySelectorAll("p"), function (paragraph) {
      var contentLength = paragraph.textContent.replace(/\s+/g, "").trim().length;
      var keep = paragraph.querySelector("img, video, iframe, figure, table, pre, code, details, button");

      if (!contentLength && !keep) {
        paragraph.remove();
      }
    });
  }

  function guideSourceSectionKind(title) {
    var text = String(title || "").trim();

    if (/^(?:\([^)]+\)\s*)?Task\b/i.test(text)) {
      return "task";
    }

    if (/^Acknowledgements?$/i.test(text)) {
      return "acknowledgements";
    }

    if (/^Learn More$/i.test(text)) {
      return "learn-more";
    }

    if (/^Introduction$/i.test(text)) {
      return "introduction";
    }

    if (/^Summary$/i.test(text)) {
      return "summary";
    }

    if (/^FAQ$/i.test(text)) {
      return "faq";
    }

    if (/^Appendix\b/i.test(text)) {
      return "appendix";
    }

    return "section";
  }

  function guideSourceSectionLabel(kind) {
    switch (kind) {
      case "task":
        return "Task section";
      case "acknowledgements":
        return "Acknowledgements";
      case "learn-more":
        return "Reference";
      case "introduction":
        return "Overview";
      case "summary":
        return "Summary";
      case "faq":
        return "FAQ";
      case "appendix":
        return "Appendix";
      default:
        return "Section";
    }
  }

  function guideSourceSectionMeta(kind, stepCount) {
    if (kind === "task" && stepCount > 0) {
      return stepCount + " step" + (stepCount === 1 ? "" : "s");
    }

    switch (kind) {
      case "acknowledgements":
        return "Owner and update note";
      case "learn-more":
        return "Additional links";
      case "introduction":
        return "Start here";
      case "summary":
        return "Wrap-up";
      case "faq":
        return "Support answers";
      case "appendix":
        return "Reference";
      default:
        return "Expandable section";
    }
  }

  function guideSourceSectionDefaultOpen(kind, index, hasTaskPanels) {
    if (kind === "introduction") {
      return true;
    }

    return !hasTaskPanels && index === 0;
  }

  function countGuideSourceListItems(node, tagName) {
    var list = null;

    if (!node) {
      return 0;
    }

    Array.prototype.some.call(node.children || [], function (child) {
      if (child.tagName === tagName) {
        list = child;
        return true;
      }

      return false;
    });

    if (!list) {
      return 0;
    }

    return Array.prototype.filter.call(list.children || [], function (child) {
      return child.tagName === "LI";
    }).length;
  }

  function guideSourceSectionStepCount(node) {
    return countGuideSourceListItems(node, "OL") || countGuideSourceListItems(node, "UL");
  }

  function guideSourceHeadingAlias(node) {
    var aliasNode;

    if (!node) {
      return "";
    }

    aliasNode = node.querySelector("div[name], [data-unique]");

    if (!aliasNode) {
      return "";
    }

    return aliasNode.getAttribute("name") || aliasNode.getAttribute("data-unique") || "";
  }

  function buildGuideSourcePanel(sectionNode, index, hasTaskPanels) {
    var heading = sectionNode.querySelector("h2, h3, h4");
    var title = heading ? heading.textContent.trim() : "Section " + String(index + 1).padStart(2, "0");
    var clonedSection = sectionNode.cloneNode(true);
    var clonedHeading = clonedSection.querySelector("h2, h3, h4");
    var kind = guideSourceSectionKind(title);
    var panelId = heading && heading.id ? heading.id : guideSourceSlug(title) + "-" + (index + 1);
    var aliasId = guideSourceHeadingAlias(sectionNode);
    var stepCount = guideSourceSectionStepCount(sectionNode);
    var bodyHtml;

    pruneGuideSourceArtifacts(clonedSection);

    Array.prototype.forEach.call(clonedSection.querySelectorAll("div[name], [data-unique]"), function (node) {
      if (!node.textContent.replace(/\s+/g, "").trim().length && !node.children.length) {
        node.remove();
      }
    });

    if (clonedHeading) {
      clonedHeading.remove();
    }

    bodyHtml = clonedSection.innerHTML.trim();

    return {
      id: panelId,
      aliasId: aliasId && aliasId !== panelId ? aliasId : "",
      title: title,
      kind: kind,
      label: guideSourceSectionLabel(kind),
      meta: guideSourceSectionMeta(kind, stepCount),
      stepCount: stepCount,
      open: guideSourceSectionDefaultOpen(kind, index, hasTaskPanels),
      bodyHtml: bodyHtml || "<p>No additional content in this section.</p>"
    };
  }

  function collectGuideSourcePanels(root) {
    var article = root.querySelector("article") || root;
    var sectionNodes = Array.prototype.filter.call(article.children || [], function (child) {
      return child.tagName === "SECTION";
    });
    var hasTaskPanels = sectionNodes.some(function (sectionNode) {
      var heading = sectionNode.querySelector("h2, h3, h4");
      return guideSourceSectionKind(heading ? heading.textContent.trim() : "") === "task";
    });

    return sectionNodes.map(function (sectionNode, index) {
      return buildGuideSourcePanel(sectionNode, index, hasTaskPanels);
    }).filter(Boolean);
  }

  function normalizeGuideSourceNodes(root, baseHref) {
    var baseUrl = new URL(baseHref, window.location.href);
    var firstHeading = root.querySelector("article > h1");
    var seenIds = {};

    if (firstHeading) {
      firstHeading.remove();
    }

    Array.prototype.forEach.call(root.querySelectorAll("script, style"), function (node) {
      node.remove();
    });

    Array.prototype.forEach.call(root.querySelectorAll("h2, h3"), function (heading) {
      var nextId = heading.id || guideSourceSlug(heading.textContent);

      while (seenIds[nextId]) {
        seenIds[nextId] += 1;
        nextId = nextId + "-" + seenIds[nextId];
      }

      seenIds[nextId] = 1;
      heading.id = nextId;
    });

    Array.prototype.forEach.call(root.querySelectorAll("img[src], iframe[src], source[src], video[src]"), function (node) {
      var currentSrc = node.getAttribute("src");

      if (!currentSrc) {
        return;
      }

      node.setAttribute("src", new URL(currentSrc, baseUrl).toString());
    });

    Array.prototype.forEach.call(root.querySelectorAll("img[srcset], source[srcset]"), function (node) {
      if (node.srcset) {
        node.setAttribute("srcset", node.srcset);
      }
    });

    Array.prototype.forEach.call(root.querySelectorAll("a[href]"), function (link) {
      var rawHref = link.getAttribute("href");
      var resolvedHref;

      if (!rawHref || rawHref.indexOf("javascript:") === 0) {
        return;
      }

      if (rawHref.charAt(0) === "#") {
        return;
      }

      resolvedHref = new URL(rawHref, baseUrl);

      if (
        resolvedHref.origin === baseUrl.origin &&
        resolvedHref.pathname === baseUrl.pathname &&
        resolvedHref.search === baseUrl.search &&
        resolvedHref.hash
      ) {
        link.setAttribute("href", resolvedHref.hash);
        return;
      }

      link.setAttribute("href", resolvedHref.toString());

      if (resolvedHref.origin !== window.location.origin) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noreferrer");
      }
    });

    Array.prototype.forEach.call(root.querySelectorAll("table"), function (table) {
      table.classList.add("guide-source-table");
    });

    Array.prototype.forEach.call(root.querySelectorAll("pre"), function (block) {
      block.classList.add("guide-source-pre");
    });
  }

  function collectGuideSourceOutline(items) {
    return (items || []).map(function (item) {
      return {
        id: item.id,
        title: item.title
      };
    }).filter(function (item) {
      return item.id && item.title;
    });
  }

  function renderGuideSourceToolbar(taskCount, panelCount) {
    var sectionSummary = guideSectionCountLabel(panelCount).toLowerCase();
    var detailCopy = taskCount > 0
      ? guideTaskSectionLabel(taskCount) + " available below, with the remaining reference sections still preserved."
      : "Open the original guide sections below inside the redesigned Full Guide surface.";

    return [
      '<div class="guide-source-toolbar">',
      '  <div class="guide-source-toolbar-copy">',
      '    <div class="panel-kicker">Section content</div>',
      '    <h3>Open ', escapeHtml(sectionSummary), ' in the original guide order.</h3>',
      '    <p>', escapeHtml(detailCopy), "</p>",
      "  </div>",
      '  <div class="guide-source-toolbar-actions">',
      taskCount > 0 ? '    <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-guide-source-expand-all="tasks">Expand all tasks</button>' : "",
      "  </div>",
      "</div>"
    ].join("");
  }

  function renderGuideSourcePanels(items) {
    if (!items.length) {
      return "";
    }

    return [
      '<div class="guide-source-panels">',
      items.map(function (item) {
        return [
          '<section class="guide-source-panel-card',
          item.open ? " is-open" : "",
          '" data-guide-source-card="', escapeHtml(item.id), '" data-guide-source-kind="', escapeHtml(item.kind), '" id="', escapeHtml(item.id), '">',
          item.aliasId ? '<span class="guide-source-anchor" id="' + escapeHtml(item.aliasId) + '" aria-hidden="true"></span>' : "",
          '  <button type="button" class="guide-source-panel-toggle" data-guide-source-toggle="', escapeHtml(item.id), '" aria-expanded="', item.open ? "true" : "false", '">',
          '    <span class="guide-source-panel-head">',
          '      <span class="guide-source-panel-label">', escapeHtml(item.label), "</span>",
          '      <span class="guide-source-panel-title">', escapeHtml(item.title), "</span>",
          "    </span>",
          '    <span class="guide-source-panel-side">',
          '      <span class="guide-source-panel-meta">', escapeHtml(item.meta), "</span>",
          '      <span class="guide-source-panel-icon" aria-hidden="true">+</span>',
          "    </span>",
          "  </button>",
          '  <div class="guide-source-panel-body"', item.open ? "" : ' hidden', ">",
          '    <div class="guide-source-prose guide-source-panel-prose">',
          item.bodyHtml,
          "    </div>",
          "  </div>",
          "</section>"
        ].join("");
      }).join(""),
      "</div>"
    ].join("");
  }

  function renderGuideSourceOutline(items) {
    if (!items.length) {
      return "";
    }

    return [
      '<nav class="guide-source-outline" aria-label="Section outline">',
      items.map(function (item) {
        return '<button type="button" class="guide-source-outline-link" data-guide-source-jump="' + escapeHtml(item.id) + '">' + escapeHtml(item.title) + "</button>";
      }).join(""),
      "</nav>"
    ].join("");
  }

  function loadGuideRenderedSection(section) {
    if (!section || !section.id) {
      return Promise.reject(new Error("Guide section is missing."));
    }

    if (guideSectionSurfaceCache[section.id]) {
      return guideSectionSurfaceCache[section.id];
    }

    guideSectionSurfaceCache[section.id] = new Promise(function (resolve, reject) {
      var frame = createGuideSourceLoader(section);
      var settled = false;

      function finish(error, payload) {
        if (settled) {
          return;
        }

        settled = true;

        if (frame.parentNode) {
          frame.parentNode.removeChild(frame);
        }

        if (error) {
          reject(error);
          return;
        }

        resolve(payload);
      }

      frame.addEventListener("error", function () {
        finish(new Error("Guide source page could not be loaded."));
      }, { once: true });

      frame.addEventListener("load", function () {
        waitForGuideModuleContent(frame, 48).then(function (moduleContent) {
          var clonedContent = moduleContent.cloneNode(true);
          var panels;
          var taskCount;

          clonedContent.removeAttribute("id");
          clonedContent.removeAttribute("title");
          clonedContent.className = "";
          normalizeGuideSourceNodes(clonedContent, frame.contentWindow.location.href);
          panels = collectGuideSourcePanels(clonedContent);
          taskCount = panels.filter(function (panel) {
            return panel.kind === "task";
          }).length;

          finish(null, {
            html: panels.length
              ? renderGuideSourcePanels(panels)
              : '<div class="guide-source-prose">' + clonedContent.innerHTML + "</div>",
            outline: collectGuideSourceOutline(panels),
            taskCount: taskCount,
            panelCount: panels.length
          });
        }).catch(function (error) {
          finish(error);
        });
      }, { once: true });

      document.body.appendChild(frame);
    }).catch(function (error) {
      delete guideSectionSurfaceCache[section.id];
      throw error;
    });

    return guideSectionSurfaceCache[section.id];
  }

  function buildGuideBreadcrumb(section) {
    return [
      '<div class="guide-inline-breadcrumb" aria-label="Current guide section">',
      "  <span>Full Guide</span>",
      "  <span>/</span>",
      "  <span>", escapeHtml(section.label), "</span>",
      "  <span>/</span>",
      "  <strong>", escapeHtml(section.title), "</strong>",
      "</div>"
    ].join("");
  }

  function syncGuideSectionStateBadges(section) {
    var taskBadge;
    var panelBadge;

    if (!guideSectionMount || !section || !currentGuideSection() || currentGuideSection().id !== section.id) {
      return;
    }

    taskBadge = guideSectionMount.querySelector("[data-guide-section-task-state]");
    panelBadge = guideSectionMount.querySelector("[data-guide-section-panel-state]");

    if (taskBadge) {
      taskBadge.textContent = guideTaskStateLabel(section);
    }

    if (panelBadge) {
      panelBadge.textContent = section.panelCount > 0
        ? guideSectionCountLabel(section.panelCount)
        : "Loading sections";
    }
  }

  function renderGuideSection() {
    var section = currentGuideSection();
    var currentRequestToken;

    if (!guideSectionMount) {
      return;
    }

    if (!section) {
      guideSectionMount.innerHTML = '<article class="guide-section-card"><p class="guide-section-summary">The full guide is still loading.</p></article>';
      renderGuideNav();
      updateBreadcrumb();
      return;
    }

    loadGuideSourceMeta(section);

    guideSectionMount.innerHTML = [
      '<article class="guide-section-card" data-accent="', escapeHtml(section.accent), '">',
      '  <div class="guide-section-hero">',
      '    <div class="guide-section-copy">',
      buildGuideBreadcrumb(section),
      '      <div class="panel-kicker">', escapeHtml(section.label), "</div>",
      '      <h2 class="guide-section-title">', escapeHtml(section.title), "</h2>",
      section.summary ? '      <p class="guide-section-summary">' + escapeHtml(section.summary) + "</p>" : "",
      '      <p class="guide-section-purpose">', escapeHtml(section.purpose || ""), "</p>",
      '      <div class="guide-highlight-row">',
      '        <span class="guide-highlight-chip" data-guide-section-task-state>', escapeHtml(guideTaskStateLabel(section)), "</span>",
      '        <span class="guide-highlight-chip" data-guide-section-panel-state>', escapeHtml(section.panelCount > 0 ? guideSectionCountLabel(section.panelCount) : "Loading sections"), "</span>",
      (section.highlights || []).map(function (item) {
        return '<span class="guide-highlight-chip">' + escapeHtml(item) + "</span>";
      }).join(""),
      "      </div>",
      renderVideoPlaceholderCard(
        section.title + " walkthrough",
        section.summary || section.purpose || "Use the section player first, then open the redesigned source sections underneath.",
        guideSectionVideoFeatures(section)
      ),
      '      <div class="guide-section-actions">',
      '        <button type="button" class="btn btn-outline-primary rounded-pill px-4" data-mode-target="explorer">Open Cheatsheet</button>',
      section.sectionHref ? '<a class="btn btn-outline-secondary rounded-pill px-4" href="' + escapeHtml(fullGuideHref) + '" target="_blank" rel="noreferrer">Open Full Guide</a>' : "",
      "      </div>",
      "    </div>",
      "  </div>",
      '  <section class="guide-source-shell">',
      '    <div class="guide-source-loading">Loading the redesigned section surface for this guide entry...</div>',
      "  </section>",
      "</article>"
    ].join("");

    renderGuideNav();
    renderGuideQuickNav();
    hydrateVideoCards(guideSectionMount);
    scheduleLayoutSync();
    updateBreadcrumb();

    currentRequestToken = ++guideSectionSurfaceRequestToken;

    loadGuideRenderedSection(section).then(function (payload) {
      var sourceShell;

      if (
        currentRequestToken !== guideSectionSurfaceRequestToken ||
        !currentGuideSection() ||
        currentGuideSection().id !== section.id
      ) {
        return;
      }

      sourceShell = guideSectionMount.querySelector(".guide-source-shell");

      if (!sourceShell) {
        return;
      }

      applyGuideSourceMeta(section, {
        taskCount: payload.taskCount,
        panelCount: payload.panelCount
      });
      renderGuideNav();
      syncGuideSectionStateBadges(section);

      sourceShell.innerHTML = [
        renderGuideSourceOutline(payload.outline),
        '<div class="guide-source-body">',
        renderGuideSourceToolbar(payload.taskCount, payload.panelCount),
        payload.html,
        "</div>"
      ].join("");

      Array.from(sourceShell.querySelectorAll("[data-guide-source-card]")).forEach(function (card) {
        setGuideSourcePanelState(card, card.classList.contains("is-open"));
      });
      syncGuideSourceExpandButton(sourceShell.querySelector(".guide-source-body"));
      hydrateVideoCards(sourceShell);
      decorateExpandableMedia(sourceShell);
      scheduleLayoutSync();
    }).catch(function () {
      var sourceShell = guideSectionMount.querySelector(".guide-source-shell");

      if (!sourceShell || currentRequestToken !== guideSectionSurfaceRequestToken) {
        return;
      }

      sourceShell.innerHTML = [
        '<div class="guide-source-error">',
        "  <strong>Source content could not be rendered in the redesigned guide right now.</strong>",
        "  <p>Open the markdown version for this page while the redesigned surface is refreshed.</p>",
        section.sectionHref ? '  <a class="btn btn-outline-secondary rounded-pill px-4" href="' + escapeHtml(fullGuideHref) + '" target="_blank" rel="noreferrer">Open Full Guide</a>' : "",
        "</div>"
      ].join("");
      scheduleLayoutSync();
    });
  }

  function guideSourceCardById(cardId) {
    if (!guideSectionMount || !cardId) {
      return null;
    }

    return guideSectionMount.querySelector('[data-guide-source-card="' + cardId + '"]');
  }

  function syncGuideSourceExpandButton(root) {
    var expandButton;
    var taskCards;
    var allOpen;

    if (!root) {
      return;
    }

    expandButton = root.querySelector("[data-guide-source-expand-all]");

    if (!expandButton) {
      return;
    }

    taskCards = Array.from(root.querySelectorAll('[data-guide-source-kind="task"]'));

    if (!taskCards.length) {
      expandButton.remove();
      return;
    }

    allOpen = taskCards.every(function (card) {
      return card.classList.contains("is-open");
    });

    expandButton.textContent = allOpen ? "Collapse all tasks" : "Expand all tasks";
    expandButton.setAttribute("aria-label", allOpen ? "Collapse all task sections" : "Expand all task sections");
  }

  function setGuideSourcePanelState(card, openState) {
    var toggle;
    var body;
    var icon;

    if (!card) {
      return;
    }

    toggle = card.querySelector("[data-guide-source-toggle]");
    body = card.querySelector(".guide-source-panel-body");
    icon = card.querySelector(".guide-source-panel-icon");

    card.classList.toggle("is-open", openState);

    if (toggle) {
      toggle.setAttribute("aria-expanded", openState ? "true" : "false");
    }

    if (body) {
      if (openState) {
        body.removeAttribute("hidden");
      } else {
        body.setAttribute("hidden", "");
      }
    }

    if (icon) {
      icon.textContent = openState ? "−" : "+";
    }
  }

  function toggleGuideSourcePanel(cardId, forceOpen, scrollIntoView) {
    var card = guideSourceCardById(cardId);
    var sourceBody;
    var nextOpenState;

    if (!card) {
      return;
    }

    nextOpenState = typeof forceOpen === "boolean" ? forceOpen : !card.classList.contains("is-open");
    setGuideSourcePanelState(card, nextOpenState);

    if (scrollIntoView) {
      scrollToTarget(card);
    }

    sourceBody = card.closest(".guide-source-body");

    if (sourceBody) {
      syncGuideSourceExpandButton(sourceBody);
    }
  }

  function toggleGuideSourceTaskPanels(button) {
    var sourceBody = button && button.closest(".guide-source-body");
    var taskCards;
    var shouldOpen;

    if (!sourceBody) {
      return;
    }

    taskCards = Array.from(sourceBody.querySelectorAll('[data-guide-source-kind="task"]'));

    if (!taskCards.length) {
      return;
    }

    shouldOpen = taskCards.some(function (card) {
      return !card.classList.contains("is-open");
    });

    taskCards.forEach(function (card) {
      setGuideSourcePanelState(card, shouldOpen);
    });

    syncGuideSourceExpandButton(sourceBody);

    if (taskCards[0]) {
      scrollToTarget(taskCards[0]);
    }
  }

  function copyGuideSourceCode(button) {
    var block = button && button.closest("pre");
    var target = block ? block.querySelector(".copy-code") : null;
    var fallbackTarget = block ? block.querySelector("code") : null;
    var text = target ? target.textContent : (fallbackTarget ? fallbackTarget.textContent : "");

    if (!text.trim()) {
      return;
    }

    copyWithFallback(text).then(function () {
      var original = button.textContent;

      button.textContent = "Copied";
      button.classList.add("is-copied");
      setLiveMessage("Code snippet copied to clipboard.");
      window.setTimeout(function () {
        button.textContent = original;
        button.classList.remove("is-copied");
      }, 1400);
    }).catch(function () {
      setLiveMessage("Copy failed. Select the code manually.");
    });
  }

  function buildSearchIndex() {
    searchIndex = [];
    searchEntryMap = {};

    stepMeta.forEach(function (meta, index) {
      var entry = createSearchEntry({
        id: "guided-" + meta.id,
        typeLabel: "Quickstart",
        title: meta.title,
        summary: meta.summary || "",
        path: "Quickstart / Step " + (index + 1),
        body: stepSections[index] ? stepSections[index].textContent : "",
        keywords: meta.keywords || [],
        open: {
          kind: "guided",
          step: index
        }
      });

      searchIndex.push(entry);
      searchEntryMap[entry.id] = entry;
    });

    explorerItems.forEach(function (item) {
      var entry = createSearchEntry({
        id: "toolkit-" + item.id,
        typeLabel: "Cheatsheet",
        title: item.title,
        summary: item.description || item.short || "",
        path: "Cheatsheet / " + item.title,
        steps: item.steps,
        checkpoints: item.checkpoints,
        watchFor: item.watchFor,
        snippet: item.snippet,
        exampleFields: item.exampleFields,
        resourceLinks: item.resourceLinks,
        milestones: item.milestones,
        tags: item.tags,
        sourceHref: item.sourceHref,
        sourceLabel: item.sourceLabel,
        open: {
          kind: "toolkit",
          itemId: item.id
        }
      });

      searchIndex.push(entry);
      searchEntryMap[entry.id] = entry;
    });

    guideSections.forEach(function (section) {
      var sectionEntry = createSearchEntry({
        id: "guide-section-" + section.id,
        typeLabel: "Full Guide",
        title: section.title,
        summary: section.summary || section.purpose || "",
        path: "Full Guide / " + section.label + " / " + section.title,
        body: [section.purpose || "", flattenList(section.highlights)].join(" "),
        sourceHref: section.sectionHref,
        sourceLabel: section.sectionLabel,
        open: {
          kind: "guide-section",
          sectionId: section.id
        }
      });

      searchIndex.push(sectionEntry);
      searchEntryMap[sectionEntry.id] = sectionEntry;

      (section.labs || []).forEach(function (lab) {
        var labEntry = createSearchEntry({
          id: "guide-lab-" + section.id + "-" + lab.id,
          typeLabel: "Full Guide",
          title: lab.title,
          summary: lab.summary || "",
          path: "Full Guide / " + section.label + " / " + (lab.label || "Lab") + " / " + lab.title,
          steps: lab.steps,
          checkpoints: lab.checkpoints,
          watchFor: lab.watchFor,
          snippet: lab.snippet,
          exampleFields: lab.exampleFields,
          resourceLinks: lab.resourceLinks,
          milestones: lab.milestones,
          sourceHref: lab.sourceHref,
          sourceLabel: lab.sourceLabel,
          open: {
            kind: "guide-lab",
            sectionId: section.id,
            labId: lab.id
          }
        });

        searchIndex.push(labEntry);
        searchEntryMap[labEntry.id] = labEntry;
      });
    });
  }

  function runGlobalSearch(rawQuery) {
    state.searchQuery = String(rawQuery || "").trim();
    rememberViewForSearch();
    switchMode("search");
  }

  function returnFromSearch() {
    if (previousView.mode === "beginner") {
      state.currentStep = previousView.currentStep || 0;
      switchMode("beginner");
      goToStep(state.currentStep, { scroll: true, hash: true, announce: false });
      return;
    }

    if (previousView.mode === "explorer") {
      switchMode("explorer");
      return;
    }

    if (previousView.mode === "guide") {
      switchMode("guide", {
        guideSection: previousView.guideSection || (guideSections[0] && guideSections[0].id),
        guideFocusLab: previousView.guideFocusLab || ""
      });
      return;
    }

    switchMode("hub");
  }

  function openSearchResult(entryId) {
    var entry = searchEntryMap[entryId];

    if (!entry) {
      return;
    }

    if (entry.open.kind === "guided") {
      goToStep(entry.open.step);
      return;
    }

    if (entry.open.kind === "toolkit") {
      state.toolkitQuery = "";
      bubbleSearch.value = "";
      setActiveTag("all");
      switchMode("explorer", { openBubble: entry.open.itemId });
      return;
    }

    if (entry.open.kind === "guide-section") {
      redirectToOriginalGuide(entry.open.sectionId);
      return;
    }

    if (entry.open.kind === "guide-lab") {
      redirectToOriginalGuide(entry.open.sectionId);
    }
  }

  function redirectToOriginalGuide(sectionId) {
    var resolved = resolveGuideTarget(sectionId || state.guideSection);
    var section = resolved ? guideSectionMap[resolved] : null;
    var href = section && section.sectionHref ? section.sectionHref : fullGuideHref;

    persistCurrentHistoryScroll();
    window.location.href = href;
  }

  function switchMode(mode, options) {
    var config = Object.assign({
      scroll: true,
      hash: true,
      announce: true,
      openBubble: null,
      guideSection: state.guideSection,
      guideFocusLab: null,
      resetStep: false,
      forceTop: false
    }, options || {});
    var guideTarget;

    if (mode === "guide") {
      redirectToOriginalGuide(config.guideSection || state.guideSection);
      return;
    }

    if (mode === "guide") {
      persistCurrentHistoryScroll();
      window.location.href = fullGuideHref;
      return;
    }

    if ((mode === "guide" || mode === "search") && !guideCatalogLoaded) {
      loadGuideCatalog().then(function () {
        switchMode(mode, options);
      });
      return;
    }

    closeImageLightbox({ announce: false, restoreFocus: false });

    if (mode === "guide" || config.guideSection) {
      state.guideSection = resolveGuideTarget(config.guideSection || state.guideSection);
    }

    if (mode !== "guide") {
      state.guideFocusLab = "";
    }

    if (config.guideFocusLab !== null) {
      state.guideFocusLab = config.guideFocusLab || "";
    }

    if (mode === "beginner" && config.resetStep) {
      state.currentStep = 0;
    }

    state.mode = mode;
    hub.classList.toggle("d-none", mode !== "hub");
    beginnerMode.classList.toggle("d-none", mode !== "beginner");
    explorerMode.classList.toggle("d-none", mode !== "explorer");
    guideMode.classList.toggle("d-none", mode !== "guide");
    searchMode.classList.toggle("d-none", mode !== "search");

    if (mode !== "explorer") {
      bubbleModal.hide();
    }

    updateNav();
    updateNavSearch();

    if (mode === "beginner") {
      updateBeginnerUI();
      if (config.scroll !== false) {
        if (config.forceTop) {
          window.scrollTo({ top: 0, behavior: smoothBehavior() });
        } else {
          goToStep(state.currentStep, { scroll: true, hash: false, announce: false });
        }
      }
    } else if (mode === "explorer") {
      renderExplorer();
      updateBreadcrumb();
      if (config.scroll !== false) {
        if (config.forceTop) {
          window.scrollTo({ top: 0, behavior: smoothBehavior() });
        } else {
          scrollToTarget(explorerMode);
        }
      }
    } else if (mode === "guide") {
      renderGuideSection();
      if (config.scroll !== false) {
        if (config.forceTop) {
          window.scrollTo({ top: 0, behavior: smoothBehavior() });
        } else {
          guideTarget = state.guideFocusLab ? document.getElementById("guide-lab-" + state.guideSection + "-" + state.guideFocusLab) : null;
          scrollToTarget(guideTarget || guideMode);
        }
      }
    } else if (mode === "search") {
      renderSearchResults();
      if (config.scroll !== false) {
        if (config.forceTop) {
          window.scrollTo({ top: 0, behavior: smoothBehavior() });
        } else {
          scrollToTarget(searchMode);
        }
      }
    } else {
      updateBreadcrumb();
      if (config.scroll !== false) {
        window.scrollTo({ top: 0, behavior: smoothBehavior() });
      }
    }

    if (config.hash !== false) {
      updateHashFromState({ replace: !!config.replaceHistory });
    }

    if (config.scroll !== false) {
      refreshCurrentHistoryScrollSoon();
    }

    if (config.openBubble) {
      window.setTimeout(function () {
        openBubble(config.openBubble);
      }, prefersReducedMotion ? 0 : 220);
    }

    scheduleLayoutSync();

    if (config.announce !== false) {
      if (mode === "hub") {
        setLiveMessage("Returned to the guide home.");
      } else if (mode === "beginner") {
        setLiveMessage("Quickstart opened.");
      } else if (mode === "explorer") {
        setLiveMessage("Cheatsheet opened.");
      } else if (mode === "guide") {
        setLiveMessage("Full Guide opened at " + (currentGuideSection() ? currentGuideSection().title : "Start Guide") + ".");
      } else if (mode === "search") {
        setLiveMessage("Search results opened.");
      }
    }
  }

  function goToStep(index, options) {
    var config = Object.assign({
      scroll: true,
      hash: true,
      announce: true
    }, options || {});
    var boundedIndex = Math.max(0, Math.min(index, stepSections.length - 1));

    state.currentStep = boundedIndex;

    if (state.mode !== "beginner") {
      switchMode("beginner", { scroll: false, hash: false, announce: false });
    }

    updateBeginnerUI();

    if (config.scroll !== false) {
      suppressObserver = true;
      scrollToTarget(stepSections[boundedIndex]);
      window.setTimeout(function () {
        suppressObserver = false;
      }, prefersReducedMotion ? 50 : 420);
    }

    if (config.hash !== false) {
      updateHashFromState({ replace: !!config.replaceHistory });
    }

    if (config.scroll !== false) {
      refreshCurrentHistoryScrollSoon();
    }

    if (config.announce !== false) {
      setLiveMessage("Step " + (boundedIndex + 1) + ". " + stepMeta[boundedIndex].title + ".");
    }
  }

  function nextStep() {
    if (state.currentStep < stepSections.length - 1) {
      goToStep(state.currentStep + 1);
    }
  }

  function prevStep() {
    if (state.currentStep > 0) {
      goToStep(state.currentStep - 1);
    }
  }

  function copyWithFallback(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      var helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(helper);
      }
    });
  }

  function copyTarget(targetId, button) {
    var target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    copyWithFallback(target.textContent).then(function () {
      var original = button.textContent;
      button.textContent = "Copied";
      button.classList.add("is-copied");
      setLiveMessage("Snippet copied to clipboard.");
      window.setTimeout(function () {
        button.textContent = original;
        button.classList.remove("is-copied");
      }, 1400);
    }).catch(function () {
      setLiveMessage("Copy failed. Select the text manually.");
    });
  }

  function copyText(text, button) {
    var value = String(text || "").trim();

    if (!value) {
      return;
    }

    copyWithFallback(value).then(function () {
      var original = button.textContent;
      button.textContent = "Copied";
      button.classList.add("is-copied");
      setLiveMessage("Copied to clipboard.");
      window.setTimeout(function () {
        button.textContent = original;
        button.classList.remove("is-copied");
      }, 1400);
    }).catch(function () {
      setLiveMessage("Copy failed. Select the text manually.");
    });
  }

  function handleShortcutBubble(id) {
    state.toolkitQuery = "";
    bubbleSearch.value = "";
    setActiveTag("all");
    switchMode("explorer", { openBubble: id });
  }

  function applyHash(hash) {
    var cleaned = (hash || "").replace("#", "").trim();
    var index;
    var query;
    var guideHashTarget;

    if (!cleaned || cleaned === "home" || cleaned === "hub") {
      switchMode("hub", { scroll: false, hash: false, announce: false });
      return;
    }

    if (cleaned === "guided" || cleaned === "quickstart") {
      switchMode("beginner", { scroll: false, hash: false, announce: false });
      updateBeginnerUI();
      return;
    }

    if (cleaned === "toolkit" || cleaned === "quick-reference" || cleaned === "cheatsheet" || cleaned === "explorer") {
      switchMode("explorer", { scroll: false, hash: false, announce: false });
      return;
    }

    if (cleaned === "guide" || cleaned === "full-guide") {
      redirectToOriginalGuide(guideSections.length ? guideSections[0].id : "");
      return;
    }

    guideHashTarget = cleaned.indexOf("guide-") === 0 ? resolveGuideTarget(cleaned.replace("guide-", "")) : "";

    if (guideHashTarget) {
      redirectToOriginalGuide(guideHashTarget);
      return;
    }

    if (cleaned === "search" || cleaned.indexOf("search:") === 0) {
      query = cleaned.indexOf("search:") === 0 ? decodeURIComponent(cleaned.slice(7)) : "";
      state.searchQuery = query;
      updateNavSearch();
      switchMode("search", { scroll: false, hash: false, announce: false });
      return;
    }

    if (cleaned.indexOf("step-") === 0) {
      index = Number(cleaned.replace("step-", "")) - 1;
      if (!Number.isNaN(index)) {
        state.currentStep = Math.max(0, Math.min(index, stepSections.length - 1));
        switchMode("beginner", { scroll: false, hash: false, announce: false });
        updateBeginnerUI();
        return;
      }
    }

    switchMode("hub", { scroll: false, hash: false, announce: false });
  }

  function restoreHistoryRoute(route) {
    var restoreY = Number(route && route.scrollY);

    if (!route || !route.__authorGuideRoute) {
      applyHash(window.location.hash);
      return;
    }

    isRestoringHistory = true;
    state.currentStep = Math.max(0, Math.min(Number(route.currentStep || 0), stepSections.length - 1));
    state.fastTrack = route.fastTrack || state.fastTrack;
    state.activeTag = route.activeTag || "all";
    state.toolkitQuery = route.toolkitQuery || "";
    state.searchQuery = route.searchQuery || "";
    state.guideSection = route.guideSection || state.guideSection;
    state.guideFocusLab = route.guideFocusLab || "";

    if (bubbleSearch) {
      bubbleSearch.value = state.toolkitQuery;
    }

    if (navSearchInput) {
      navSearchInput.value = state.searchQuery;
    }

    tagPills.forEach(function (pill) {
      pill.classList.toggle("is-active", pill.getAttribute("data-tag") === state.activeTag);
    });

    switchMode(route.mode || "hub", {
      scroll: false,
      hash: false,
      announce: false,
      guideSection: state.guideSection,
      guideFocusLab: state.guideFocusLab
    });

    window.setTimeout(function () {
      window.scrollTo({
        top: Number.isFinite(restoreY) ? Math.max(0, restoreY) : 0,
        behavior: "auto"
      });
      isRestoringHistory = false;
      scheduleLayoutSync();
    }, 0);
  }

  var observer = new IntersectionObserver(function (entries) {
    var visibleEntry;
    var index;

    if (state.mode !== "beginner" || suppressObserver) {
      return;
    }

    visibleEntry = entries
      .filter(function (entry) {
        return entry.isIntersecting;
      })
      .sort(function (left, right) {
        return right.intersectionRatio - left.intersectionRatio;
      })[0];

    if (!visibleEntry || visibleEntry.intersectionRatio < 0.58) {
      return;
    }

    index = Number(visibleEntry.target.getAttribute("data-step-index") || "0");
    if (index !== state.currentStep) {
      state.currentStep = index;
      updateBeginnerUI();
      updateHashFromState({ replace: true });
    }
  }, {
    threshold: [0.58]
  });

  stepSections.forEach(function (section) {
    observer.observe(section);
  });

  document.addEventListener("click", function (event) {
    var modeButton = event.target.closest("[data-mode-target]");
    var progressButton = event.target.closest("[data-step-target]");
    var actionButton = event.target.closest("[data-action]");
    var guideButton = event.target.closest("[data-guide-target]");
    var guideSectionButton = event.target.closest("[data-guide-section]");
    var guideSourceJumpButton = event.target.closest("[data-guide-source-jump]");
    var guideSourceToggleButton = event.target.closest("[data-guide-source-toggle]");
    var guideSourceExpandButton = event.target.closest("[data-guide-source-expand-all]");
    var guideSourceCopyButton = event.target.closest(".guide-source-panel-prose .copy-button, .guide-source-prose .copy-button");
    var guideSourceHashLink = event.target.closest(".guide-source-shell a[href^=\"#\"]");
    var shortcutBubble = event.target.closest("[data-open-bubble-direct]");
    var bubbleButton = event.target.closest("[data-open-bubble]");
    var copyButton = event.target.closest("[data-copy-target]");
    var copyTextButton = event.target.closest("[data-copy-text]");
    var tagButton = event.target.closest("[data-tag]");
    var searchOpenButton = event.target.closest("[data-search-open]");
    var installCard = event.target.closest("[data-install-card]");
    var isPrimaryNav = modeButton && !!modeButton.closest(".nav-group-all");

    if (installCard && !copyTextButton) {
      installCard.classList.add("is-complete");
      installCard.setAttribute("aria-pressed", "true");
    }

    if (modeButton) {
      if (modeButton.getAttribute("data-mode-target") === "guide" && modeButton.getAttribute("data-guide-target")) {
        switchMode("guide", {
          guideSection: resolveGuideTarget(modeButton.getAttribute("data-guide-target")) || currentGuideTarget(),
          guideFocusLab: "",
          forceTop: isPrimaryNav
        });
      } else if (modeButton.getAttribute("data-mode-target") === "beginner") {
        switchMode("beginner", { resetStep: true, forceTop: isPrimaryNav || !!modeButton.closest(".hero-actions") });
      } else {
        switchMode(modeButton.getAttribute("data-mode-target"), { forceTop: isPrimaryNav });
      }
      return;
    }

    if (guideSourceJumpButton) {
      toggleGuideSourcePanel(guideSourceJumpButton.getAttribute("data-guide-source-jump"), true, true);
      return;
    }

    if (guideSourceToggleButton) {
      toggleGuideSourcePanel(guideSourceToggleButton.getAttribute("data-guide-source-toggle"));
      return;
    }

    if (guideSourceExpandButton) {
      toggleGuideSourceTaskPanels(guideSourceExpandButton);
      return;
    }

    if (guideSourceCopyButton) {
      event.preventDefault();
      copyGuideSourceCode(guideSourceCopyButton);
      return;
    }

    if (guideSourceHashLink) {
      var hashTargetId = guideSourceHashLink.getAttribute("href").replace(/^#/, "");
      var hashTargetNode = hashTargetId ? document.getElementById(hashTargetId) : null;
      var hashTargetCard = hashTargetNode && hashTargetNode.closest ? hashTargetNode.closest("[data-guide-source-card]") : null;

      if (hashTargetCard) {
        event.preventDefault();
        toggleGuideSourcePanel(hashTargetCard.getAttribute("data-guide-source-card"), true);
        scrollToTarget(hashTargetNode);
        return;
      }
    }

    if (event.target === imageLightboxClose || event.target.closest("[data-lightbox-close]")) {
      closeImageLightbox();
      return;
    }

    if (event.target.closest("figure[data-expandable=\"true\"]")) {
      openImageLightbox(event.target.closest("figure[data-expandable=\"true\"]"));
      return;
    }

    if (progressButton) {
      goToStep(Number(progressButton.getAttribute("data-step-target")));
      return;
    }

    if (actionButton) {
      if (actionButton.getAttribute("data-action") === "next") {
        nextStep();
      } else if (actionButton.getAttribute("data-action") === "prev") {
        prevStep();
      } else if (actionButton.getAttribute("data-action") === "surface") {
        switchMode("hub");
      }
      return;
    }

    if (guideButton) {
      persistCurrentHistoryScroll();
      window.location.href = fullGuideHref;
      return;
    }

    if (guideSectionButton) {
      switchMode("guide", { guideSection: guideSectionButton.getAttribute("data-guide-section"), guideFocusLab: "" });
      return;
    }

    if (shortcutBubble) {
      handleShortcutBubble(shortcutBubble.getAttribute("data-open-bubble-direct"));
      return;
    }

    if (bubbleButton) {
      openBubble(bubbleButton.getAttribute("data-open-bubble"));
      return;
    }

    if (copyButton) {
      copyTarget(copyButton.getAttribute("data-copy-target"), copyButton);
      return;
    }

    if (copyTextButton) {
      event.preventDefault();
      copyText(copyTextButton.getAttribute("data-copy-text"), copyTextButton);
      return;
    }

    if (tagButton) {
      setActiveTag(tagButton.getAttribute("data-tag"));
      return;
    }

    if (searchOpenButton) {
      openSearchResult(searchOpenButton.getAttribute("data-search-open"));
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && imageLightbox && !imageLightbox.hasAttribute("hidden")) {
      event.preventDefault();
      event.stopPropagation();
      closeImageLightbox();
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && event.target && event.target.closest && event.target.closest("figure[data-expandable=\"true\"]")) {
      event.preventDefault();
      openImageLightbox(event.target.closest("figure[data-expandable=\"true\"]"));
    }
  }, true);

  fastTrackToggle.addEventListener("change", function (event) {
    state.fastTrack = event.target.checked ? "minimal" : "guided";
    updateBeginnerUI();
    setLiveMessage(state.fastTrack === "minimal" ? "Fast Track enabled." : "Guided mode enabled.");
  });

  bubbleSearch.addEventListener("input", function (event) {
    state.toolkitQuery = event.target.value;
    renderExplorer();
  });

  clearSearch.addEventListener("click", function () {
    state.toolkitQuery = "";
    bubbleSearch.value = "";
    renderExplorer();
    bubbleSearch.focus();
  });

  navSearchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    runGlobalSearch(navSearchInput.value);
  });

  navSearchClear.addEventListener("click", function () {
    state.searchQuery = "";
    navSearchInput.value = "";
    if (state.mode === "search") {
      renderSearchResults();
      updateHashFromState({ replace: true });
    }
  });

  searchBackButton.addEventListener("click", function () {
    returnFromSearch();
  });

  window.addEventListener("hashchange", function () {
    if (isRestoringHistory) {
      return;
    }
    applyHash(window.location.hash);
    updateHashFromState({ replace: true });
  });

  window.addEventListener("popstate", function (event) {
    restoreHistoryRoute(event.state);
  });

  if (backToTopButton) {
    backToTopButton.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: smoothBehavior() });
      setLiveMessage("Returned to the top of the page.");
    });
  }

  window.addEventListener("scroll", scheduleLayoutSync, { passive: true });
  window.addEventListener("resize", function () {
    scheduleLayoutSync();
  });

  hydrateVideoCards(document);
  decorateExpandableMedia(document);
  updateNav();
  updateNavSearch();
  updateBeginnerUI();
  renderExplorer();
  renderHomeRouteMap();
  renderGuideNav();
  loadGuideCatalog().finally(function () {
    applyHash(window.location.hash);
    updateHashFromState({ replace: true });
    scheduleLayoutSync();
  });
}());
