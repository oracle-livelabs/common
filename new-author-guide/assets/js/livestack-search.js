/* One search corpus for the LiveStack overview and all three task guides. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LiveStackSearch = factory();
}(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  var pages = [
    { path: "", title: "Introduction" },
    { path: "use/", title: "LiveStacks on LiveLabs" },
    { path: "create/", title: "Create a LiveStack" },
    { path: "events/", title: "Create an event" }
  ];
  function readSections(doc) {
    var contentSelector = "h3, p, li, dt, dd, summary";
    function readableText(node) {
      if (node.nodeType === 3) return node.textContent;
      var text = Array.from(node.childNodes).map(readableText).join("");
      return /^(H[1-6]|P|LI|DT|DD|DIV|UL|OL|DL|BR)$/.test(node.tagName) ? " " + text + " " : text;
    }
    return Array.from(doc.querySelectorAll(".ls-hero[id], .ls-section[id], .ls-step[id]"))
      .map(function (section) {
        return { id: section.id, title: section.querySelector("h1, h2").textContent,
          text: Array.from(section.querySelectorAll(contentSelector))
            .filter(function (element) { return !element.parentElement.closest(contentSelector); })
            .map(readableText).join(" ").replace(/\s+/g, " ").trim() };
      });
  }
  // Read the same source pages regardless of where the search was started.
  // An incomplete corpus rejects rather than silently becoming page-local search.
  function loadIndex(base, readPage, parseSections) {
    return Promise.all(pages.map(function (page) {
      var url = new URL(page.path, base);
      return Promise.resolve().then(function () { return readPage(url.href); })
        .then(function (html) {
          var sections = parseSections(html);
          if (!sections.length) throw new Error("LiveStack search page has no sections");
          return sections.map(function (section) {
            return Object.assign({}, section, { pageTitle: page.title, pagePath: page.path,
              href: new URL("#" + section.id, url).href });
          });
        });
    })).then(function (groups) { return groups.flat(); });
  }
  function normalize(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[‐‑–—-]/g, " ").replace(/\s+/g, " ").trim();
  }
  function tokens(query) {
    return Array.from(new Set(normalize(String(query || "").slice(0, 200)).split(" ").filter(Boolean)));
  }
  function find(entries, query) {
    var terms = tokens(query);
    if (!terms.length) return [];
    return entries.map(function (entry, order) {
      var title = normalize(entry.title);
      var content = normalize((entry.pageTitle || "") + " " + entry.title + " " + entry.text);
      return { entry: entry, order: order,
        matches: terms.every(function (term) { return content.includes(term); }),
        score: terms.filter(function (term) { return title.includes(term); }).length };
    }).filter(function (result) { return result.matches; })
      .sort(function (a, b) { return b.score - a.score || a.order - b.order; })
      .map(function (result) { return result.entry; });
  }
  function excerpt(text, query) {
    var source = String(text || "").replace(/\s+/g, " ").trim();
    var normalized = normalize(source);
    var positions = tokens(query).map(function (term) { return normalized.indexOf(term); })
      .filter(function (position) { return position >= 0; });
    var start = positions.length ? Math.max(0, Math.min.apply(null, positions) - 60) : 0;
    if (start) {
      var boundary = source.indexOf(" ", start);
      if (boundary >= 0 && boundary < start + 30) start = boundary + 1;
    }
    return (start ? "…" : "") + source.slice(start, start + 220) +
      (source.length > start + 220 ? "…" : "");
  }
  return { pages: pages, readSections: readSections, loadIndex: loadIndex,
    normalize: normalize, tokens: tokens, find: find, excerpt: excerpt };
}));
