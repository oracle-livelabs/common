(() => {
  "use strict";

  // Use the same navigation controller and shell states as the other guide pages.
  window.LiveLabsSideNav.bindSideNavToggle({
    button: "authorGlobalNavToggle",
    bodyClass: "author-nav-closed",
    hiddenWhenDisabled: true,
    onSync: ({ expanded }) => {
      document.getElementById("modeNav").inert = !expanded;
    }
  });

  const sections = window.LiveLabsMarkdownSections;
  const container = document.getElementById("reference-sections");
  const navigation = document.getElementById("section-links");
  const search = document.getElementById("pattern-search");
  const scope = document.getElementById("pattern-scope");
  const status = document.getElementById("filter-status");
  const empty = document.getElementById("empty-state");
  const copyStatus = document.getElementById("copy-status");
  const cards = [];
  const sectionEntries = [];
  const kindNames = { core: "Core Markdown", livelabs: "LiveLabs feature", caution: "Use with care" };

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = String(content);
    return node;
  }

  if (!Array.isArray(sections) || !sections.length) {
    status.textContent = "The examples could not load. Reload the page to try again.";
    container.append(element("p", "empty-state", "The Markdown reference is temporarily unavailable. Use the author Quickstart while the examples are unavailable."));
    search.disabled = true;
    scope.disabled = true;
    return;
  }

  function announceCopy(message) {
    copyStatus.textContent = "";
    window.setTimeout(() => { copyStatus.textContent = message; }, 30);
  }

  async function copySnippet(button, textarea, editor, feedback, title) {
    button.disabled = true;
    feedback.hidden = true;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(textarea.value);
      button.textContent = "Copied";
      announceCopy(`${title}: snippet copied.`);
      window.setTimeout(() => { button.textContent = textarea.dataset.changed === "true" ? "Copy edited snippet" : "Copy snippet"; }, 1800);
    } catch (_error) {
      editor.open = true;
      textarea.focus();
      textarea.select();
      feedback.textContent = "Automatic copy was unavailable. The snippet is selected below. Press Ctrl+C (Windows) or Command+C (Mac), or use your device’s Copy command.";
      feedback.hidden = false;
      announceCopy(`${title}: automatic copy was unavailable. Copy the selected text manually.`);
    } finally {
      button.disabled = false;
    }
  }

  function createSnippet(pattern) {
    const source = String(pattern.source);
    const box = element("div", "snippet-box");
    const toolbar = element("div", "snippet-toolbar");
    toolbar.append(element("span", "snippet-language", pattern.language || "Markdown"));
    const copy = element("button", "btn btn-secondary btn-sm copy-button", "Copy snippet");
    copy.type = "button";
    copy.setAttribute("aria-label", `Copy snippet: ${pattern.title}`);
    toolbar.append(copy);
    const pre = element("pre", "source-code");
    pre.tabIndex = 0;
    pre.setAttribute("aria-label", `Source example: ${pattern.title}`);
    const code = element("code", "", source);
    pre.append(code);
    const feedback = element("p", "copy-feedback");
    feedback.hidden = true;
    const editor = element("details", "snippet-editor");
    editor.append(element("summary", "", "Edit a copy"));
    const content = element("div", "editor-content");
    const label = element("label", "", `Editable snippet: ${pattern.title}`);
    const textarea = element("textarea");
    textarea.id = `${pattern.id}-editable`;
    textarea.value = source;
    textarea.spellcheck = false;
    textarea.rows = Math.min(16, Math.max(5, source.split("\n").length + 1));
    label.htmlFor = textarea.id;
    const hint = element("p", "editor-hint", "Edits are not rendered here. Preview in your LiveLabs workshop. Changes last until you reload this page.");
    hint.id = `${pattern.id}-edit-help`;
    textarea.setAttribute("aria-describedby", hint.id);
    const reset = element("button", "btn btn-outline-secondary btn-sm reset-button", "Reset snippet");
    reset.type = "button";
    reset.setAttribute("aria-label", `Reset snippet: ${pattern.title}`);
    content.append(label, textarea, hint, reset);
    editor.append(content);
    editor.addEventListener("toggle", () => { pre.hidden = editor.open; });
    textarea.addEventListener("input", () => {
      code.textContent = textarea.value;
      textarea.dataset.changed = String(textarea.value !== source);
      copy.textContent = textarea.value !== source ? "Copy edited snippet" : "Copy snippet";
      feedback.hidden = true;
    });
    reset.addEventListener("click", () => {
      textarea.value = source;
      textarea.dataset.changed = "false";
      code.textContent = source;
      copy.textContent = "Copy snippet";
      feedback.hidden = true;
      textarea.focus();
      announceCopy(`${pattern.title}: original snippet restored.`);
    });
    copy.addEventListener("click", () => copySnippet(copy, textarea, editor, feedback, pattern.title));
    box.append(toolbar, pre, feedback, editor);
    return box;
  }

  function createCard(pattern, section) {
    const card = element("article", "pattern-card");
    card.id = pattern.id;
    card.tabIndex = -1;
    const top = element("div", "card-topline");
    const heading = element("h3");
    heading.id = `${pattern.id}-title`;
    card.setAttribute("aria-labelledby", heading.id);
    const permalink = element("a", "card-title-link", pattern.title);
    permalink.href = `#${pattern.id}`;
    heading.append(permalink);
    top.append(heading, element("span", `pattern-kind kind-${pattern.kind}`, kindNames[pattern.kind] || "Core Markdown"));
    card.append(top, element("p", "card-description", pattern.description));
    const example = element("div", pattern.source !== undefined ? "pattern-example" : "pattern-explanation");
    if (pattern.source !== undefined) example.append(createSnippet(pattern));
    const result = element("div", "expected-result");
    result.append(element("h4", "", "What to expect"), element("p", "", pattern.result));
    example.append(result);
    card.append(example);
    if (Array.isArray(pattern.notes) && pattern.notes.length) {
      const notes = element("ul", "pattern-notes");
      pattern.notes.forEach(note => notes.append(element("li", "", note)));
      card.append(notes);
    }
    if (Array.isArray(pattern.links) && pattern.links.length) {
      const links = element("div", "pattern-links");
      pattern.links.forEach(link => {
        try {
          const url = new URL(link.href, window.location.href);
          if (!["https:", "http:"].includes(url.protocol)) return;
          const anchor = element("a", "", link.label);
          anchor.href = link.href;
          links.append(anchor);
        } catch (_error) { /* Ignore invalid reference URLs. */ }
      });
      if (links.childElementCount) card.append(links);
    }
    cards.push({ node: card, kind: pattern.kind, section, searchText: [section.title, pattern.title, pattern.description, pattern.source, pattern.result, ...(pattern.notes || []), pattern.keywords || "", ...(pattern.links || []).map(link => link.label)].filter(Boolean).join(" ").toLocaleLowerCase() });
    return card;
  }

  const fragment = document.createDocumentFragment();
  sections.forEach((section, index) => {
    const number = String(index + 1).padStart(2, "0");
    const item = element("li");
    const anchor = element("a");
    anchor.href = `#${section.id}`;
    anchor.append(element("span", "section-number", number), element("span", "", section.title));
    item.append(anchor);
    navigation.append(item);
    const node = element("section", "reference-section");
    node.id = section.id;
    node.tabIndex = -1;
    node.setAttribute("aria-labelledby", `${section.id}-heading`);
    const headingRow = element("div", "section-heading");
    const numberNode = element("span", "section-number", number);
    numberNode.setAttribute("aria-hidden", "true");
    const headingText = element("div");
    const heading = element("h2", "", section.title);
    heading.id = `${section.id}-heading`;
    headingText.append(heading, element("p", "", section.description));
    headingRow.append(numberNode, headingText);
    node.append(headingRow);
    section.patterns.forEach(pattern => node.append(createCard(pattern, section)));
    sectionEntries.push({ id: section.id, node, anchor, item });
    fragment.append(node);
  });
  container.append(fragment);

  function updateCurrentSection() {
    const visible = sectionEntries.filter(entry => !entry.node.hidden);
    let current = visible[0];
    visible.forEach(entry => {
      if (entry.node.getBoundingClientRect().top <= 150) current = entry;
    });
    sectionEntries.forEach(entry => {
      if (entry === current) entry.anchor.setAttribute("aria-current", "location");
      else entry.anchor.removeAttribute("aria-current");
    });
  }

  function applyFilters() {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const matches = (scope.value === "all" || card.kind === scope.value) && terms.every(term => card.searchText.includes(term));
      card.node.hidden = !matches;
      if (matches) count += 1;
    });
    sectionEntries.forEach(entry => {
      entry.node.hidden = !cards.some(card => card.section.id === entry.id && !card.node.hidden);
      entry.anchor.setAttribute("data-filtered-out", String(entry.node.hidden));
    });
    status.textContent = `${count} of ${cards.length} patterns${scope.value === "all" ? "" : ` · ${scope.options[scope.selectedIndex].text}`}${terms.length ? ` matching “${search.value.trim()}”` : ""}.`;
    empty.hidden = count > 0;
    updateCurrentSection();
  }

  function clearFilters(focusSearch = false) {
    search.value = "";
    scope.value = "all";
    applyFilters();
    if (focusSearch) search.focus();
  }

  function revealHash(focus = false) {
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (_error) { return; }
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    if (target.hidden || target.closest("[hidden]")) clearFilters();
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start" });
      if (focus && target.matches("article, section")) target.focus({ preventScroll: true });
      updateCurrentSection();
    });
  }

  document.getElementById("reference-filter").addEventListener("submit", event => event.preventDefault());
  search.addEventListener("input", applyFilters);
  scope.addEventListener("change", applyFilters);
  document.getElementById("clear-filters").addEventListener("click", () => clearFilters(true));
  document.getElementById("empty-clear").addEventListener("click", () => clearFilters(true));
  document.addEventListener("keydown", event => {
    const target = event.target;
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.isComposing || target.isContentEditable || target.closest("input, textarea, select")) return;
    event.preventDefault();
    search.focus();
  });
  document.addEventListener("click", event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    let id;
    try { id = decodeURIComponent(link.hash.slice(1)); } catch (_error) { return; }
    const target = document.getElementById(id);
    if (!target) return;
    if (target.hidden || target.closest("[hidden]")) clearFilters();
    if (window.location.hash === link.hash) {
      event.preventDefault();
      revealHash(true);
    }
  });
  window.addEventListener("hashchange", () => revealHash(true));
  let scrollPending = false;
  window.addEventListener("scroll", () => {
    if (scrollPending) return;
    scrollPending = true;
    window.requestAnimationFrame(() => { updateCurrentSection(); scrollPending = false; });
  }, { passive: true });
  window.addEventListener("resize", updateCurrentSection);
  applyFilters();
  if (window.location.hash) revealHash();
})();
