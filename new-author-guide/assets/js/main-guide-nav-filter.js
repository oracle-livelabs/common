// Classic markdown wrapper enhancement.
// Hides child lab links in the left nav so the improved markdown experience stays section-first instead of exposing every lab in the TOC.
(function () {
    var hiddenTitles = [
        "Lab 1: WMS lifecycle, Quality Assurance, and publishing flow",
        "Lab 2: GitHub foundations",
        "Lab 3: Submit new workshop in WMS",
        "Lab 4: Set up GitHub and install tools",
        "Lab 5: Stay in sync with GitHub",
        "Lab 6: Develop Markdown and content",
        "Lab 7: Quality Assurance checks and steps",
        "Lab 8: Review, Quality Assurance, and publishing timelines",
        "Lab 9: Pull Request automated checks",
        "Lab 10: Publish your workshop",
        "Lab 11: Embed SQL Developer with FreeSQL",
        "Lab 12: Add LiveLabs quizzes",
        "Lab 13: Capture effective screens",
        "Lab 14: Optimize screenshots with OptiShot",
        "Lab 15: Clean up content with Fixomat",
        "Lab 16: Develop LiveLabs Sprints",
        "Lab 17: Set up graphical remote desktop",
        "Lab 18: Create custom image for Marketplace",
        "Lab 19: Publish your image to Oracle Marketplace",
        "Lab 20: Update the image on your sandbox environment",
        "Lab 21: Secure Desktop environments in LiveLabs",
        "Lab 22: Request and access Secure Desktop environments",
        "Lab 23: Get started with the LiveLabs AI Developer Hub",
        "Need Help?",
        "LiveLabs FAQ"
    ];
    var hiddenTitleLookup = {};

    hiddenTitles.forEach(function (title) {
        hiddenTitleLookup[title] = true;
    });

    function normalizeText(text) {
        return (text || "").replace(/\s+/g, " ").trim();
    }

    function findNavContainer(node, root) {
        while (node && node !== root) {
            if (node.matches && node.matches("li, details, .hol-Toc-item, .hol-Tree-item, .hol-Tree-row, .hol-Nav-item")) {
                return node;
            }
            node = node.parentElement;
        }

        return null;
    }

    function hideChildLabLinks() {
        var toc = document.getElementById("toc");
        if (!toc) {
            return;
        }

        var candidates = toc.querySelectorAll("a, button, span");
        Array.prototype.forEach.call(candidates, function (candidate) {
            var title = normalizeText(candidate.textContent);
            var container;

            if (!hiddenTitleLookup[title]) {
                return;
            }

            container = findNavContainer(candidate, toc);
            if (container) {
                container.style.display = "none";
                container.setAttribute("data-main-guide-hidden", "true");
            }
        });
    }

    function startFiltering() {
        var toc = document.getElementById("toc");
        var observer;

        hideChildLabLinks();
        if (!toc) {
            return;
        }

        observer = new MutationObserver(function () {
            hideChildLabLinks();
        });
        observer.observe(toc, { childList: true, subtree: true });

        window.setTimeout(hideChildLabLinks, 500);
        window.setTimeout(hideChildLabLinks, 1500);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startFiltering);
    } else {
        startFiltering();
    }
}());
