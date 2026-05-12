// Enhances the markdown-driven guide wrapper with a cleaner shell, workshop-wide search,
// image expansion, and an embed mode used by legacy surfaces.
(function () {
    var stopWords = {
        a: true,
        an: true,
        and: true,
        are: true,
        as: true,
        at: true,
        do: true,
        for: true,
        from: true,
        how: true,
        in: true,
        is: true,
        it: true,
        of: true,
        on: true,
        or: true,
        that: true,
        the: true,
        this: true,
        to: true,
        what: true,
        with: true
    };
    var activeSearchHit = null;
    var lastFocusedMedia = null;
    var workshopSearchPromise = null;
    var fullGuideHref = "https://oracle-livelabs.github.io/common/sample-livelabs-templates/create-labs/labs/workshops/livelabs/";

    function currentUrl() {
        return new URL(window.location.href);
    }

    function isEmbedMode() {
        return currentUrl().searchParams.get("embed") === "1";
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function normalizeText(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function tokenize(value) {
        return normalizeText(value)
            .split(" ")
            .filter(function (token) {
                return token && !stopWords[token];
            });
    }

    function uniqueTokens(value) {
        return Array.from(new Set(tokenize(value)));
    }

    function resolveContext() {
        var path = window.location.pathname.toLowerCase();

        if (path.indexOf("/workshops/variants/compute/") !== -1 || path.indexOf("/workshops/compute/") !== -1) {
            return {
                label: "Compute Variant",
                title: "Read the compute-image workflow in the markdown shell.",
                summary: "This route keeps the focused compute-image workflow in the same polished markdown wrapper while still pointing at the shared canonical author-guide content tree.",
                guideHomeHref: fullGuideHref,
                redesignedHref: fullGuideHref,
                sampleHref: new URL("../../../sample-workshops/clinical-first-responder-rag/index.html", window.location.href).toString()
            };
        }

        if (path.indexOf("/workshops/variants/marketplace/") !== -1 || path.indexOf("/workshops/marketplace/") !== -1) {
            return {
                label: "Marketplace Variant",
                title: "Read the Marketplace-image workflow in the markdown shell.",
                summary: "This route keeps the Marketplace publishing subset in the same markdown wrapper and uses the same canonical content tree as the main author guide.",
                guideHomeHref: fullGuideHref,
                redesignedHref: fullGuideHref,
                sampleHref: new URL("../../../sample-workshops/clinical-first-responder-rag/index.html", window.location.href).toString()
            };
        }

        if (path.indexOf("/workshops/author-guide/") !== -1 || path.indexOf("/workshops/livelabs/") !== -1) {
            return {
                label: "Markdown Version",
                title: "Read the full author guide in the markdown shell.",
                summary: "This fallback route keeps the updated original guide structure intact while adding a cleaner shell, workshop-wide search, and media handling that match the redesigned experience more closely.",
                guideHomeHref: fullGuideHref,
                redesignedHref: fullGuideHref,
                sampleHref: new URL("../../sample-workshops/clinical-first-responder-rag/index.html", window.location.href).toString()
            };
        }

        return {
            label: "Markdown Page",
            title: "Read this guide page in the markdown shell.",
            summary: "This page is being rendered inside the shared markdown wrapper used by the author-guide project.",
            guideHomeHref: fullGuideHref,
            redesignedHref: fullGuideHref,
            sampleHref: new URL("../../sample-workshops/clinical-first-responder-rag/index.html", window.location.href).toString()
        };
    }

    function isAuthorGuideContext() {
        var path = window.location.pathname.toLowerCase();

        return path.indexOf("/workshops/author-guide/") !== -1 || path.indexOf("/workshops/livelabs/") !== -1;
    }

    function ensureTopButton() {
        var button = document.getElementById("markdownTopButton");

        if (button || isEmbedMode()) {
            return button;
        }

        button = document.createElement("button");
        button.className = "markdown-top-button";
        button.id = "markdownTopButton";
        button.type = "button";
        button.textContent = "Back to top";
        document.body.appendChild(button);
        return button;
    }

    function ensureLightbox() {
        var overlay = document.getElementById("markdownMediaLightbox");
        var dialog;

        if (overlay) {
            return overlay;
        }

        overlay = document.createElement("div");
        overlay.className = "md-lightbox";
        overlay.id = "markdownMediaLightbox";
        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = [
            '<div class="md-lightbox-dialog" role="dialog" aria-modal="true" aria-labelledby="mdLightboxCaption">',
            '  <div class="md-lightbox-toolbar">',
            '    <button type="button" class="md-lightbox-close" data-md-lightbox-close="true">Close image</button>',
            "  </div>",
            '  <figure class="md-lightbox-figure">',
            '    <img id="mdLightboxImage" src="" alt="">',
            '    <figcaption id="mdLightboxCaption"></figcaption>',
            "  </figure>",
            "</div>"
        ].join("");
        document.body.appendChild(overlay);
        dialog = overlay.querySelector(".md-lightbox-dialog");
        if (dialog) {
            dialog.addEventListener("click", function (event) {
                event.stopPropagation();
            });
        }
        return overlay;
    }

    function openLightbox(target) {
        var overlay = ensureLightbox();
        var image = target.querySelector("img");
        var caption = target.querySelector("figcaption");
        var overlayImage = document.getElementById("mdLightboxImage");
        var overlayCaption = document.getElementById("mdLightboxCaption");
        var captionText;

        if (!image || !overlayImage || !overlayCaption) {
            return;
        }

        captionText = caption ? caption.textContent.trim() : (image.getAttribute("alt") || "");
        lastFocusedMedia = target;
        overlayImage.setAttribute("src", image.currentSrc || image.getAttribute("src") || "");
        overlayImage.setAttribute("alt", image.getAttribute("alt") || "");
        overlayCaption.textContent = captionText;
        overlay.hidden = false;
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        overlay.querySelector("[data-md-lightbox-close]").focus();
    }

    function closeLightbox() {
        var overlay = document.getElementById("markdownMediaLightbox");
        var overlayImage = document.getElementById("mdLightboxImage");
        var overlayCaption = document.getElementById("mdLightboxCaption");

        if (!overlay || overlay.hidden) {
            return;
        }

        overlay.hidden = true;
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.removeProperty("overflow");

        if (overlayImage) {
            overlayImage.setAttribute("src", "");
            overlayImage.setAttribute("alt", "");
        }

        if (overlayCaption) {
            overlayCaption.textContent = "";
        }

        if (lastFocusedMedia && typeof lastFocusedMedia.focus === "function") {
            lastFocusedMedia.focus();
        }

        lastFocusedMedia = null;
    }

    function createIntroMarkup() {
        return [
            '<section class="markdown-guide-intro markdown-guide-intro--search" id="markdownGuideIntro">',
            '  <section class="markdown-guide-search-panel" aria-labelledby="markdownGuideSearchHeading">',
            '    <h2 id="markdownGuideSearchHeading">Search this workshop</h2>',
            '    <p>Search across the current workshop pages, review the strongest matches, and open the right page without leaving the markdown shell.</p>',
            '    <form class="markdown-search-form" id="markdownWorkshopSearchForm" role="search" aria-label="Search this workshop">',
            '      <div class="markdown-search-row">',
            '        <input class="markdown-search-input" id="markdownWorkshopSearchInput" type="search" placeholder="Self Quality Assurance, GitHub Pages, validator">',
            '        <button class="markdown-guide-button is-primary" type="submit">Find</button>',
            '        <button class="markdown-guide-button" type="button" id="markdownWorkshopSearchClear">Clear</button>',
            "      </div>",
            '      <p class="markdown-search-status" id="markdownWorkshopSearchStatus">Search the current workshop by keyword or short phrase.</p>',
            "    </form>",
            '    <div class="markdown-workshop-results" id="markdownWorkshopSearchResults" hidden></div>',
            "  </section>",
            "</section>"
        ].join("");
    }

    function ensureIntro(context) {
        var contentBox = document.getElementById("contentBox");
        var intro = document.getElementById("markdownGuideIntro");

        if (!contentBox || isEmbedMode()) {
            return;
        }

        if (!intro) {
            contentBox.insertAdjacentHTML("afterbegin", createIntroMarkup());
        }
    }

    function createTopNavMarkup(context) {
        return [
            '<nav class="markdown-guide-topnav" id="markdownGuideTopNav" aria-label="Author guide routes">',
            '  <div class="markdown-guide-topnav-shell">',
            '    <a class="markdown-guide-topnav-link" href="' + escapeHtml(new URL("../../index.html#home", window.location.href).toString()) + '">Guide Home</a>',
            '    <a class="markdown-guide-topnav-link" href="' + escapeHtml(new URL("../../index.html#guided", window.location.href).toString()) + '">Guided Path</a>',
            '    <a class="markdown-guide-topnav-link" href="' + escapeHtml(new URL("../../index.html#toolkit", window.location.href).toString()) + '">Toolkit</a>',
            '    <a class="markdown-guide-topnav-link" href="' + escapeHtml(context.redesignedHref) + '">Full Guide</a>',
            '    <a class="markdown-guide-topnav-link" href="' + escapeHtml(context.sampleHref) + '">Sample Workshop</a>',
            "  </div>",
            "</nav>"
        ].join("");
    }

    function ensureTopNav(context) {
        var header = document.querySelector(".hol-Header");
        var legacyPanel = document.getElementById("markdownGuideRoutePanel");

        if (legacyPanel) {
            legacyPanel.remove();
        }

        if (!header || isEmbedMode() || !isAuthorGuideContext()) {
            return;
        }

        if (!document.getElementById("markdownGuideTopNav")) {
            header.insertAdjacentHTML("afterend", createTopNavMarkup(context));
        }
    }

    function decorateImages(moduleContent) {
        Array.prototype.forEach.call(moduleContent.querySelectorAll("img"), function (image) {
            var target = image.closest("figure") || image.parentElement;
            var pill;
            var label;

            if (!target || target.hasAttribute("data-md-expandable")) {
                return;
            }

            target.setAttribute("data-md-expandable", "true");
            target.setAttribute("tabindex", "0");
            target.setAttribute("role", "button");
            label = image.getAttribute("alt") || "Expand image";
            target.setAttribute("aria-label", "Expand image: " + label);
            pill = document.createElement("span");
            pill.className = "md-expand-pill";
            pill.textContent = "Click to expand";
            target.insertBefore(pill, target.firstChild);
        });
    }

    function updateSearchStatus(message) {
        var status = document.getElementById("markdownWorkshopSearchStatus");

        if (status) {
            status.textContent = message;
        }
    }

    function clearWorkshopSearchResults() {
        var resultsMount = document.getElementById("markdownWorkshopSearchResults");

        if (!resultsMount) {
            return;
        }

        resultsMount.innerHTML = "";
        resultsMount.hidden = true;
    }

    function currentLabId() {
        return currentUrl().searchParams.get("lab") || "";
    }

    function deriveLabId(filename) {
        var basename = String(filename || "").split("/").pop() || "";

        return basename.replace(/\.md$/i, "");
    }

    function stripMarkdown(value) {
        return String(value || "")
            .replace(/```[\s\S]*?```/g, " ")
            .replace(/`([^`]+)`/g, " $1 ")
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
            .replace(/<[^>]+>/g, " ")
            .replace(/[>#*_~\-]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function scoreWorkshopEntry(entry, rawQuery) {
        var normalizedQuery = normalizeText(rawQuery);
        var queryTokens = uniqueTokens(rawQuery);
        var score = 0;
        var matchedTokens = 0;

        if (!normalizedQuery && !queryTokens.length) {
            return 0;
        }

        if (normalizedQuery && entry.titleNorm.indexOf(normalizedQuery) !== -1) {
            score += 80;
        }

        if (normalizedQuery && entry.summaryNorm.indexOf(normalizedQuery) !== -1) {
            score += 34;
        }

        if (normalizedQuery && entry.bodyNorm.indexOf(normalizedQuery) !== -1) {
            score += 18;
        }

        queryTokens.forEach(function (token) {
            if (entry.titleNorm.indexOf(token) !== -1) {
                matchedTokens += 1;
                score += 14;
                return;
            }

            if (entry.summaryNorm.indexOf(token) !== -1) {
                matchedTokens += 1;
                score += 9;
                return;
            }

            if (entry.bodyNorm.indexOf(token) !== -1) {
                matchedTokens += 1;
                score += 4;
            }
        });

        if (queryTokens.length && matchedTokens === queryTokens.length) {
            score += 18;
        }

        return score;
    }

    function loadWorkshopSearchIndex() {
        var manifestUrl = new URL("./manifest.json", window.location.href).toString();

        if (workshopSearchPromise) {
            return workshopSearchPromise;
        }

        workshopSearchPromise = fetch(manifestUrl, { cache: "no-store" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Manifest request failed with status " + response.status + ".");
                }

                return response.json();
            })
            .then(function (manifest) {
                return Promise.all((manifest.tutorials || []).map(function (tutorial) {
                    var filename = tutorial.filename || "";
                    var href = new URL("?lab=" + encodeURIComponent(deriveLabId(filename)), window.location.href).toString();

                    return fetch(new URL(filename, window.location.href).toString(), { cache: "no-store" })
                        .then(function (response) {
                            if (!response.ok) {
                                throw new Error("Markdown request failed with status " + response.status + ".");
                            }

                            return response.text();
                        })
                        .catch(function () {
                            return "";
                        })
                        .then(function (markdown) {
                            return {
                                labId: deriveLabId(filename),
                                title: tutorial.title || "Workshop page",
                                summary: tutorial.description || "",
                                href: href,
                                titleNorm: normalizeText(tutorial.title || ""),
                                summaryNorm: normalizeText(tutorial.description || ""),
                                bodyNorm: normalizeText(stripMarkdown(markdown))
                            };
                        });
                }));
            });

        return workshopSearchPromise;
    }

    function renderWorkshopSearchResults(query, results) {
        var currentLab = currentLabId();

        if (!results.length) {
            return '<div class="markdown-workshop-results-empty">No strong workshop matches for <strong>' + escapeHtml(query) + '</strong>. Try a shorter keyword.</div>';
        }

        return results.map(function (result) {
            return [
                '<article class="markdown-workshop-result">',
                '  <div class="markdown-workshop-result-top">',
                '    <span class="markdown-workshop-result-type">Workshop page</span>',
                result.labId === currentLab ? '    <span class="markdown-workshop-result-chip">Current page</span>' : "",
                "  </div>",
                '  <h3>', escapeHtml(result.title), "</h3>",
                result.summary ? '  <p>' + escapeHtml(result.summary) + "</p>" : "",
                '  <div class="markdown-workshop-result-actions">',
                '    <a class="markdown-guide-button" href="' + escapeHtml(result.href) + '">Open page</a>',
                "  </div>",
                "</article>"
            ].join("");
        }).join("");
    }

    function runWorkshopSearch(rawQuery) {
        var query = String(rawQuery || "").trim();
        var resultsMount = document.getElementById("markdownWorkshopSearchResults");

        if (!resultsMount) {
            return;
        }

        if (!query) {
            clearWorkshopSearchResults();
            updateSearchStatus("Search the current workshop by keyword or short phrase.");
            return;
        }

        updateSearchStatus('Searching the workshop for "' + query + '"...');

        loadWorkshopSearchIndex().then(function (entries) {
            var results = entries
                .map(function (entry) {
                    return {
                        entry: entry,
                        score: scoreWorkshopEntry(entry, query)
                    };
                })
                .filter(function (item) {
                    return item.score >= 14;
                })
                .sort(function (left, right) {
                    return right.score - left.score;
                })
                .slice(0, 8)
                .map(function (item) {
                    return item.entry;
                });

            resultsMount.hidden = false;
            resultsMount.innerHTML = renderWorkshopSearchResults(query, results);
            updateSearchStatus(
                results.length
                    ? 'Found ' + results.length + ' workshop match' + (results.length === 1 ? "" : "es") + ' for "' + query + '".'
                    : 'No strong workshop matches for "' + query + '".'
            );
        }).catch(function () {
            resultsMount.hidden = false;
            resultsMount.innerHTML = '<div class="markdown-workshop-results-empty">Workshop search could not load the current manifest.</div>';
            updateSearchStatus("Workshop search is unavailable right now.");
        });
    }

    function bindSearch() {
        var form = document.getElementById("markdownWorkshopSearchForm");
        var input = document.getElementById("markdownWorkshopSearchInput");
        var clearButton = document.getElementById("markdownWorkshopSearchClear");

        if (!form || form.hasAttribute("data-md-search-bound") || isEmbedMode()) {
            return;
        }

        form.setAttribute("data-md-search-bound", "true");

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            runWorkshopSearch(input.value);
        });

        clearButton.addEventListener("click", function () {
            input.value = "";
            clearWorkshopSearchResults();
            updateSearchStatus("Search the current workshop by keyword or short phrase.");
            input.focus();
        });
    }

    function syncTopButton() {
        var button = ensureTopButton();

        if (!button) {
            return;
        }

        button.classList.toggle("is-visible", window.pageYOffset > 320);
    }

    function enhanceContent() {
        var moduleContent = document.getElementById("module-content");
        var context = resolveContext();
        var appNav = document.querySelector(".markdown-guide-appnav");

        if (appNav) {
            appNav.remove();
        }

        ensureTopNav(context);
        ensureIntro(context);
        bindSearch();

        if (!moduleContent) {
            return;
        }

        moduleContent.classList.add("markdown-guide-prose");
        decorateImages(moduleContent);
        ensureLightbox();
    }

    document.addEventListener("click", function (event) {
        var expandable = event.target.closest("[data-md-expandable='true']");
        var closeButton = event.target.closest("[data-md-lightbox-close='true']");
        var overlay = document.getElementById("markdownMediaLightbox");
        var topButton = event.target.closest("#markdownTopButton");

        if (topButton) {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
            return;
        }

        if (closeButton) {
            closeLightbox();
            return;
        }

        if (overlay && event.target === overlay) {
            closeLightbox();
            return;
        }

        if (expandable) {
            openLightbox(expandable);
        }
    });

    document.addEventListener("keydown", function (event) {
        var expandable = event.target && event.target.closest ? event.target.closest("[data-md-expandable='true']") : null;

        if (event.key === "Escape") {
            closeLightbox();
            return;
        }

        if ((event.key === "Enter" || event.key === " ") && expandable) {
            event.preventDefault();
            openLightbox(expandable);
        }
    }, true);

    window.addEventListener("scroll", syncTopButton, { passive: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            document.body.classList.add("markdown-guide-shell");
            if (isEmbedMode()) {
                document.body.classList.add("markdown-guide-embed");
            }
            enhanceContent();
            syncTopButton();
        });
    } else {
        document.body.classList.add("markdown-guide-shell");
        if (isEmbedMode()) {
            document.body.classList.add("markdown-guide-embed");
        }
        enhanceContent();
        syncTopButton();
    }

    window.setTimeout(enhanceContent, 450);
    window.setTimeout(enhanceContent, 1400);
    window.setTimeout(enhanceContent, 2600);
}());
