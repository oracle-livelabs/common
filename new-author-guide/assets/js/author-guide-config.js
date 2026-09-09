(function () {
      var routeNames = ["home", "quickstart", "cheatsheet", "nodoc"];

      function canonicalizeCurrentRoute() {
        var current = new URL(window.location.href);
        var segments = current.pathname.split("/").filter(Boolean);
        var lastSegment = (segments[segments.length - 1] || "").toLowerCase();
        var changed = false;

        // GitHub Pages serves a directory's index.html automatically. Keep
        // the directory URL visible, while retaining old direct links as
        // compatible entry points.
        if (lastSegment === "index.html") {
          segments.pop();
          changed = true;
        }

        // Home is the guide root, not a second public route.
        if ((segments[segments.length - 1] || "").toLowerCase() === "home") {
          segments.pop();
          changed = true;
        }

        if (!changed) {
          return;
        }

        current.pathname = "/" + (segments.length ? segments.join("/") + "/" : "");
        window.history.replaceState(window.history.state, document.title, current.pathname + current.search + current.hash);
      }

      var url = new URL(window.location.href);
      var experience = url.searchParams.get("experience");
      var lab = url.searchParams.get("lab");
      var fullGuideHref = "https://" + "oracle-livelabs" + ".github.io/common/sample-livelabs-templates/create-labs/labs/workshops/livelabs/";
      var workshopExampleHref = "https://oracle-livelabs.github.io/developer/dev-ai-app-dev-finance/workshops/sandbox/";
      var wmsHref = "https://apex.oraclecorp.com/pls/apex/f?p=LIVELABS";
      var guideRoutes = {
        hub: "home",
        beginner: "quickstart",
        explorer: "cheatsheet",
        nodoc: "nodoc"
      };
      var markdownLabMap = {
        "start-here": "introduction",
        "core-workflow": "1-labs-wms",
        "core-workshop-flow": "1-labs-wms",
        "validation-publish": "5-labs-qa-checks",
        "reuse-enhancements": "11-create-freesql",
        "tools-productivity": "13-labs-capture-screens-best-practices",
        "specialized-workflows": "10-create-sprints-workflow",
        "help-faq": "introduction"
      };
      var target;

      function guideRootUrl() {
        var current = new URL(window.location.href);
        var segments = current.pathname.split("/").filter(Boolean);
        var lastSegment = segments[segments.length - 1] || "";
        var previousSegment = segments[segments.length - 2] || "";

        if (lastSegment.toLowerCase() === "index.html" && routeNames.indexOf(previousSegment) !== -1) {
          segments.splice(-2, 2);
        } else if (lastSegment.toLowerCase() === "index.html") {
          segments.pop();
        } else if (routeNames.indexOf(lastSegment) !== -1) {
          segments.pop();
        } else if (segments.length > 1 && segments[segments.length - 2] === "pages") {
          segments.splice(-2, 2);
        }

        // Preserve the current protocol and host. This also keeps a guide
        // deployed below an Object Storage path prefix self-contained.
        current.pathname = "/" + (segments.length ? segments.join("/") + "/" : "");
        current.search = "";
        current.hash = "";
        return current;
      }

      function assetUrl(path, baseUrl) {
        var logicalPath;

        if (!path || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(path)) {
          return path || "";
        }

        logicalPath = path.replace(/^(?:\.\.\/)+/, "");
        return new URL(logicalPath, baseUrl || guideRootUrl()).toString();
      }

      function hydrateRouteLinks(root) {
        (root || document).querySelectorAll("[data-mode-target][href]").forEach(function (link) {
          var route = guideRoutes[link.getAttribute("data-mode-target")];

          if (route) {
            link.href = route === "home"
              ? guideRootUrl().toString()
              : new URL(route + "/", guideRootUrl()).toString();
          }
        });
      }

      function hydrateAssets(root) {
        (root || document).querySelectorAll("img[data-guide-asset], img[src]").forEach(function (image) {
          var source = image.getAttribute("data-guide-asset") || image.getAttribute("src");

          if (/^(?:\.\.\/)+content\//.test(source || "") || image.hasAttribute("data-guide-asset")) {
            image.setAttribute("src", assetUrl(source));
          }
        });
      }

      window.authorGuideFullGuideHref = fullGuideHref;
      window.authorGuideWorkshopExampleHref = workshopExampleHref;
      window.authorGuideWmsHref = wmsHref;
      window.AuthorGuideAssets = {
        resolve: assetUrl,
        hydrate: hydrateAssets
      };
      window.AuthorGuidePaths = {
        root: guideRootUrl,
        resolve: assetUrl
      };
      document.addEventListener("DOMContentLoaded", function () {
        canonicalizeCurrentRoute();
        hydrateAssets();
        hydrateRouteLinks();
        document.querySelectorAll("[data-full-guide-link]").forEach(function (link) {
          link.href = fullGuideHref;
        });
        document.querySelectorAll("[data-workshop-example-link]").forEach(function (link) {
          link.href = workshopExampleHref;
        });
        document.querySelectorAll("[data-wms-link]").forEach(function (link) {
          link.href = wmsHref;
        });
      });

      if (experience === "classic" || experience === "markdown") {
        target = new URL(fullGuideHref);
        window.location.replace(target.toString());
        return;
      }

      if (!lab) {
        return;
      }

      if (markdownLabMap[lab]) {
        url.searchParams.set("lab", markdownLabMap[lab]);
      }

      target = new URL(fullGuideHref);
      target.search = url.search;
      window.location.replace(target.toString());
    }());
