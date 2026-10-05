(function () {
  "use strict";

  var page = document.querySelector("[data-livestack-page]");
  if (!page) return;

  // Keep bookmarks from the first, single-page draft useful.
  if (page.dataset.livestackPage === "overview") {
    var legacy = {
      "#create-livestack": "create/", "#create-event": "events/",
      "#publish": "create/#publish", "#bundle": "use/#bundle",
      "#use-on-livelabs": "use/"
    };
    if (legacy[location.hash]) {
      location.replace(new URL(legacy[location.hash], location.href));
      return;
    }
  }

  if (window.matchMedia("(max-width: 940px)").matches) {
    document.body.classList.add("author-nav-closed");
  }
  if (window.LiveLabsSideNav) {
    window.LiveLabsSideNav.bindSideNavToggle({
      button: "authorGlobalNavToggle",
      bodyClass: "author-nav-closed",
      hiddenWhenDisabled: true,
      onSync: function (state) {
        document.getElementById("modeNav").inert = !state.expanded;
      }
    });
  }

  var dialog = document.getElementById("lsImageDialog");
  var opener;
  if (dialog && typeof dialog.showModal === "function") {
    document.querySelectorAll("[data-ls-image]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        var source = link.querySelector("img");
        opener = link;
        dialog.querySelector("img").src = link.href;
        dialog.querySelector("img").alt = source.alt;
        dialog.querySelector("h2").textContent = link.dataset.lsImage;
        var caption = link.closest("figure").querySelector("figcaption");
        dialog.querySelector("[data-image-caption]").textContent =
          caption && caption.firstChild ? caption.firstChild.textContent : "";
        dialog.querySelector("[data-image-original]").href = link.href;
        dialog.showModal();
        document.body.classList.add("ls-image-open");
      });
    });
    dialog.querySelector("button").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (event) {
      var bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener("close", function () {
      document.body.classList.remove("ls-image-open");
      dialog.querySelector("img").removeAttribute("src");
      if (opener) opener.focus({ preventScroll: true });
    });
  }

  var searchNavigating = false;
  var searchPanel = page.querySelector(".ls-search-panel");
  if (searchPanel && window.LiveStackSearch) {
    var search = window.LiveStackSearch;
    var form = document.getElementById("lsSearchForm");
    var input = document.getElementById("lsSearchInput");
    var clear = document.getElementById("lsSearchClear");
    var status = document.getElementById("lsSearchStatus");
    var results = document.getElementById("lsSearchResults");
    var base = new URL(window.AuthorGuidePaths.resolve("livestack/"));
    var indexPromise;
    var searchRevision = 0;
    function getIndex() {
      if (!indexPromise) {
        indexPromise = search.loadIndex(base, function (url) {
          return fetch(url, { cache: "no-cache" }).then(function (response) {
            if (!response.ok) throw new Error("LiveStack search page unavailable");
            return response.text();
          });
        }, function (html) {
          return search.readSections(new DOMParser().parseFromString(html, "text/html"));
        }).catch(function (error) {
          indexPromise = null; // A subsequent Search retries the complete corpus.
          throw error;
        });
      }
      return indexPromise;
    }
    function syncQuery() {
      var query = input.value.trim();
      var current = new URL(location.href);
      if (query) current.searchParams.set("q", query);
      else current.searchParams.delete("q");
      if (current.href !== location.href) history.replaceState(history.state, "", current);
      page.querySelectorAll("a[href]").forEach(function (link) {
        if (link.getAttribute("href").startsWith("#")) return;
        var url = new URL(link.href);
        if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
        if (query) url.searchParams.set("q", query);
        else url.searchParams.delete("q");
        link.href = url.href;
      });
    }
    function revealTarget(id, query) {
      var section = document.getElementById(id);
      if (!section) return null;
      section.querySelectorAll("details").forEach(function (detail) {
        var text = search.normalize(detail.textContent);
        if (search.tokens(query).some(function (term) { return text.includes(term); })) detail.open = true;
      });
      section.setAttribute("tabindex", "-1");
      return section;
    }
    async function renderSearch(options) {
      options = options || {};
      var revision = ++searchRevision;
      var query = input.value.trim();
      results.replaceChildren();
      results.hidden = true;
      searchPanel.removeAttribute("aria-busy");
      if (!query) {
        searchNavigating = false;
        status.textContent = "Search the introduction, LiveLabs guide, and WMS guides.";
        return;
      }
      status.textContent = "Searching all LiveStack guides…";
      searchPanel.setAttribute("aria-busy", "true");
      var entries;
      try { entries = await getIndex(); }
      catch (error) {
        if (revision !== searchRevision) return;
        searchPanel.removeAttribute("aria-busy");
        searchNavigating = false;
        status.textContent = "Could not load all LiveStack guides. Select Search to try again.";
        return;
      }
      if (revision !== searchRevision) return;
      searchPanel.removeAttribute("aria-busy");
      var matches = search.find(entries, query);
      status.textContent = matches.length ? matches.length + " matching section" +
        (matches.length === 1 ? "" : "s") + " across LiveStack guides." :
        "No matching sections in the LiveStack guides. Try another term or clear the search.";
      matches.forEach(function (entry) {
        var item = document.createElement("li");
        var source = document.createElement("span");
        source.className = "ls-search-page";
        source.textContent = entry.pageTitle;
        var link = document.createElement("a");
        var destination = new URL(entry.href);
        destination.searchParams.set("q", query);
        link.href = destination.href;
        link.textContent = entry.title;
        link.addEventListener("click", function (event) {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          if (destination.pathname === location.pathname.replace(/index\.html$/, "")) revealTarget(entry.id, query);
        });
        var preview = document.createElement("p");
        preview.textContent = search.excerpt(entry.text, query);
        item.append(source, link, preview);
        results.append(item);
      });
      results.hidden = !matches.length;
      if (options.target) {
        // Results inserted above the article must not displace a cross-page destination.
        var target = revealTarget(options.target, query);
        if (target) {
          history.replaceState(history.state, "", location.pathname + location.search + "#" + target.id);
          target.scrollIntoView({ behavior: "instant", block: "start" });
          target.focus({ preventScroll: true });
        }
      }
      searchNavigating = false;
      if (options.focusFirst && results.firstElementChild) results.querySelector("a").focus();
    }
    function clearSearch() {
      input.value = "";
      syncQuery();
      renderSearch();
      input.focus();
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      syncQuery();
      renderSearch({ focusFirst: true });
    });
    input.addEventListener("input", function () { syncQuery(); renderSearch(); });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { event.preventDefault(); clearSearch(); }
    });
    clear.addEventListener("click", clearSearch);
    searchPanel.hidden = false;
    function restoreSearch() {
      input.value = (new URL(location.href).searchParams.get("q") || "").slice(0, 200);
      var target = input.value ? location.hash.slice(1) : "";
      searchNavigating = Boolean(target);
      syncQuery();
      renderSearch({ target: target });
    }
    window.addEventListener("popstate", restoreSearch);
    restoreSearch();
  }

  var links = Array.from(document.querySelectorAll(".ls-toc a[href^='#']"));
  var sections = links.map(function (link) { return document.getElementById(link.hash.slice(1)); }).filter(Boolean);
  function markCurrent() {
    var current = sections[0];
    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= 140) current = section;
    });
    // A short final chapter cannot always reach the top of the viewport.
    if (sections.length && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1];
    }
    if (!current) return null;
    links.forEach(function (link) {
      if (link.hash === "#" + current.id) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    return current;
  }
  var scheduled = false;
  window.addEventListener("scroll", function () {
    if (scheduled || searchNavigating || document.body.classList.contains("ls-image-open")) return;
    scheduled = true;
    requestAnimationFrame(function () {
      var current = markCurrent();
      if (current && window.scrollY > 100 && location.hash !== "#" + current.id) {
        history.replaceState(history.state, "", location.pathname + location.search + "#" + current.id);
      }
      scheduled = false;
    });
  }, { passive: true });
  window.addEventListener("hashchange", markCurrent);
  markCurrent();
}());
