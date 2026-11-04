(function () {
  var sharedScriptUrl = document.currentScript && document.currentScript.src;

  function resolveElement(value) {
    if (!value) {
      return null;
    }

    if (typeof value === "string") {
      return document.getElementById(value) || document.querySelector(value);
    }

    return value;
  }

  function guideRootUrl() {
    if (window.AuthorGuidePaths && typeof window.AuthorGuidePaths.root === "function") {
      return window.AuthorGuidePaths.root();
    }

    if (sharedScriptUrl) {
      return new URL("../../", sharedScriptUrl);
    }

    return new URL("../", window.location.href);
  }

  function renderSharedSideNav() {
    var mount = document.querySelector("[data-shared-side-nav]");
    var rootUrl;
    var markup;
    var page;
    var activeTarget;
    var currentPath;
    var currentSubRoute;

    if (!mount || document.getElementById("modeNav")) {
      return;
    }

    rootUrl = guideRootUrl();
    markup = [
      '<button class="author-global-nav-toggle" type="button" id="authorGlobalNavToggle" aria-expanded="true" aria-controls="modeNav" aria-label="Close navigation" hidden>',
      '  <svg class="toggle-icon-open" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>',
      '  <svg class="toggle-icon-close" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
      '</button>',
      '<header class="mode-nav" id="modeNav">',
      '  <div class="container">',
      '    <nav class="navbar nav-shell" aria-label="Primary navigation">',
      '      <div class="container-fluid px-0 gap-3 align-items-center">',
      '        <a class="brand-token border-0 bg-transparent" data-mode-target="hub" data-shared-nav-route="" href="#" aria-label="Return to the author guide home">',
      '          <span class="brand-mark" aria-hidden="true">',
      '            <svg viewBox="0 0 109.36 22.96" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><path d="M47.9122 13.4234 54.459 13.4234 51 7.84135 44.6505 17.9233 41.75 17.9233 49.4805 5.82375C49.8106 5.33355 50.377 5.03665 50.9962 5.03665 51.6017 5.03665 52.1582 5.32375 52.4883 5.80225L60.2422 17.9233 57.3497 17.9233 55.9867 15.6694 49.3574 15.6694 47.9122 13.4234M77.9512 15.6692 77.9512 5.1597 75.4922 5.1597 75.4922 16.7027C75.4922 17.0172 75.6251 17.3258 75.8556 17.5483 76.09 17.7906 76.4121 17.9233 76.75 17.9233L87.9317 17.9233 89.3887 15.6694 77.9512 15.6692M37.3512 13.7906C39.7407 13.7906 41.6622 11.8569 41.6622 9.47415 41.6622 7.09135 39.7407 5.15975 37.3512 5.15975L26.6129 5.15975 26.6129 17.9233 29.0669 17.9233 29.0669 7.41555 37.188 7.41555C38.3278 7.41555 39.2515 8.33555 39.2515 9.47415 39.2515 10.6109 38.3278 11.5464 37.188 11.5464L30.2672 11.5406 37.5973 17.9233 41.1582 17.9233 36.235 13.7906 37.3512 13.7906M11.5142 17.9233 18.9331 17.9233C22.4625 17.9233 25.3043 15.0718 25.3043 11.5464 25.3043 8.01715 22.4625 5.15975 18.9331 5.15975L11.5142 5.15975C7.98886 5.15975 5.12945 8.01715 5.12945 11.5464 5.12945 15.0718 7.98886 17.9233 11.5142 17.9233M18.7633 15.6772 11.6774 15.6772C9.39705 15.6772 7.54935 13.8237 7.54935 11.5464 7.54935 9.25935 9.39705 7.41555 11.6774 7.41555L18.7633 7.41555C21.0513 7.41555 22.8971 9.25935 22.8971 11.5464 22.8971 13.8237 21.0513 15.6772 18.7633 15.6772M65.3672 17.9233 72.9415 17.9233 74.375 15.6772 65.5352 15.6772C63.2442 15.6772 61.3985 13.8237 61.3985 11.5464 61.3985 9.25935 63.2442 7.41555 65.5352 7.41555L72.7305 7.41555 74.1817 5.15975 65.3672 5.15975C61.8399 5.15975 58.9746 8.01715 58.9746 11.5464 58.9747 15.0718 61.84 17.9233 65.3672 17.9233M95.381 15.6772C93.4903 15.6772 91.8965 14.4078 91.4044 12.6714L101.893 12.6714 103.338 10.4214 91.4044 10.4214C91.8947 8.68125 93.4903 7.41555 95.381 7.41555L102.582 7.41555 104.022 5.15975 95.2169 5.15975C91.6953 5.15975 88.8379 8.01715 88.8379 11.5464 88.8379 15.0718 91.6953 17.9233 95.2169 17.9233L102.791 17.9233 104.231 15.6772 95.381 15.6772" fill="#C74634"/></svg>',
      '          </span>',
      '          <span><span class="brand-label">LiveLabs</span><small>Author guide</small></span>',
      '        </a>',
      '        <div class="nav-main-grid">',
      '          <div class="nav-group nav-group-all" role="group" aria-label="Primary navigation">',
      '            <a class="btn nav-control" data-mode-target="hub" data-shared-nav-route="" href="#" aria-label="Open the author guide home"><span class="nav-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.2v-6.1H8.7V21H3.5a.5.5 0 0 1-.5-.5v-9.7Z"/></svg></span><span class="nav-control-text">Home</span></a>',
      '            <a class="btn nav-control" data-mode-target="beginner" data-shared-nav-route="quickstart/" href="#" aria-label="Open quickstart"><span class="nav-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg></span><span class="nav-control-text">Quickstart</span></a>',
      '            <a class="btn nav-control" data-shared-nav-route="markdown/event-code/" href="#" aria-label="Open Event Code guide"><span class="nav-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M6 4.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Zm2 4h8m-8 4h8m-8 4h5"/></svg></span><span class="nav-control-text">Event Code</span></a>',
      '            <details class="nav-menu-group" id="cheatsheetMenu">',
      '              <summary class="nav-menu-summary" aria-controls="cheatsheetMenuItems"><a class="btn nav-control nav-menu-parent" data-mode-target="explorer" data-shared-nav-route="cheatsheet/" href="#" aria-label="Open Cheatsheet"><span class="nav-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M8 4h8l1.5 2H20v14H4V6h2.5L8 4Zm0 7h8M8 15h6"/></svg></span><span class="nav-control-text">Cheatsheet</span></a></summary>',
      '              <div class="nav-menu-items" id="cheatsheetMenuItems" aria-label="Related Cheatsheet pages">',
      '                <a class="nav-menu-link" data-shared-nav-route="markdown/" href="#" aria-label="Open Markdown reference"><span class="nav-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16"/></svg></span><span>Markdown</span></a>',
      '              </div>',
      '            </details>',
      '            <details class="nav-menu-group" id="nodocMenu">',
      '              <summary class="nav-menu-summary" aria-controls="nodocMenuItems"><a class="btn nav-control nav-menu-parent" data-mode-target="nodoc" data-shared-nav-route="nodoc/" href="#" aria-label="Open NoDoc guide"><span class="nav-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M6 3.5h9l3 3V20H6V3.5Z"/><path d="M15 3.5V7h3M9 11h6M9 14h6M9 17h4"/></svg></span><span class="nav-control-text">NoDoc</span></a></summary>',
      '              <div class="nav-menu-items" id="nodocMenuItems" aria-label="Related NoDoc pages">',
      '              </div>',
      '            </details>',
      '            <a class="btn nav-control" data-full-guide-link href="#" target="_blank" rel="noreferrer" aria-label="Open Step by Step Guide"><span class="nav-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M6.5 4.5h9.2a1.8 1.8 0 0 1 1.8 1.8v13.2H8.3a1.8 1.8 0 0 1-1.8-1.8V4.5Z"/><path d="M9.2 4.5v15M10.8 8h4M10.8 11h4M10.8 14h3"/><path d="M4.5 6.5h2M4.5 9h2M4.5 11.5h2M4.5 14h2M4.5 16.5h2"/></svg></span><span class="nav-control-text">Step by Step Guide</span></a>',
      '            <a class="btn nav-control" data-workshop-example-link href="#" target="_blank" rel="noreferrer" aria-label="Open a real LiveLabs workshop example"><span class="nav-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M9 3h6M10 3v5l-5.6 9.8A2.1 2.1 0 0 0 6.2 21h11.6a2.1 2.1 0 0 0 1.8-3.2L14 8V3M8 15h8"/></svg></span><span class="nav-control-text">Workshop Example</span></a>',
      '          </div>',
      '        </div>',
      '      </div>',
      '    </nav>',
      '  </div>',
      '</header>'
    ].join("");

    mount.insertAdjacentHTML("beforebegin", markup);
    mount.remove();

    document.querySelectorAll("[data-shared-nav-route]").forEach(function (link) {
      var route = link.getAttribute("data-shared-nav-route");
      link.href = new URL(route, rootUrl).toString();
    });

    document.querySelectorAll("[data-full-guide-link]").forEach(function (link) {
      link.href = window.authorGuideFullGuideHref || "https://oracle-livelabs.github.io/common/sample-livelabs-templates/create-labs/labs/workshops/livelabs/";
    });
    document.querySelectorAll("[data-workshop-example-link]").forEach(function (link) {
      link.href = window.authorGuideWorkshopExampleHref || "https://oracle-livelabs.github.io/developer/dev-ai-app-dev-finance/workshops/sandbox/";
    });

    page = document.body.getAttribute("data-author-guide-page");
    currentPath = window.location.pathname.replace(/index\.html$/i, "").replace(/\/+$/, "");
    currentSubRoute = /\/markdown\/event-code$/i.test(currentPath) ? "markdown/event-code/" : (/\/markdown$/i.test(currentPath) ? "markdown/" : "");
    activeTarget = {
      hub: "hub",
      beginner: "beginner",
      explorer: "explorer",
      markdown: "explorer",
      nodoc: "nodoc"
    }[page];
    if (currentSubRoute === "markdown/event-code/") {
      activeTarget = null;
    }
    if (activeTarget) {
      document.querySelectorAll(".nav-control[data-mode-target]").forEach(function (link) {
        if (link.getAttribute("data-mode-target") === activeTarget) {
          link.classList.add("is-active");
          link.setAttribute("aria-current", "page");
          if (link.closest(".nav-menu-summary")) {
            link.closest(".nav-menu-summary").classList.add("is-active");
          }
        }
      });
    }

    if (currentSubRoute) {
      var currentLink = document.querySelector('[data-shared-nav-route="' + currentSubRoute + '"]');
      var menu = document.getElementById("cheatsheetMenu");
      if (currentLink) {
        currentLink.classList.add("is-active");
        currentLink.setAttribute("aria-current", "page");
      }
      if (menu && currentSubRoute !== "markdown/event-code/") menu.open = true;
    }
  }

  function bindSideNavToggle(options) {
    var config = Object.assign({
      bodyClass: "",
      button: null,
      canToggle: function () {
        return true;
      },
      hiddenWhenDisabled: false,
      onSync: null,
      onToggle: null
    }, options || {});
    var button = resolveElement(config.button);
    var bodyClass = config.bodyClass;

    if (!button || !bodyClass) {
      return null;
    }

    if (button.__liveLabsSideNavController) {
      return button.__liveLabsSideNavController;
    }

    function canToggle() {
      return config.canToggle ? config.canToggle() !== false : true;
    }

    function sync() {
      var enabled = canToggle();
      var expanded;

      if (!enabled) {
        document.body.classList.remove(bodyClass);
      }

      expanded = !document.body.classList.contains(bodyClass);
      if (config.hiddenWhenDisabled) {
        button.hidden = !enabled;
      }

      button.setAttribute("aria-hidden", enabled ? "false" : "true");
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
      button.setAttribute("aria-label", expanded ? "Close navigation" : "Open navigation");

      if (typeof config.onSync === "function") {
        config.onSync({
          enabled: enabled,
          expanded: expanded,
          button: button
        });
      }
    }

    button.setAttribute("data-shared-side-nav-bound", "true");
    button.addEventListener("click", function (event) {
      event.preventDefault();

      if (!canToggle()) {
        sync();
        return;
      }

      document.body.classList.toggle(bodyClass);
      sync();

      if (typeof config.onToggle === "function") {
        config.onToggle({
          expanded: !document.body.classList.contains(bodyClass),
          button: button
        });
      }
    });

    sync();

    button.__liveLabsSideNavController = {
      button: button,
      sync: sync
    };

    return button.__liveLabsSideNavController;
  }

  renderSharedSideNav();

  window.LiveLabsSideNav = Object.assign({}, window.LiveLabsSideNav, {
    bindSideNavToggle: bindSideNavToggle
  });
}());
