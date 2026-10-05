(function () {
  "use strict";

  var ROOT_SELECTOR = "#module-content";
  var LEGACY_EMBED_ID = "live-sql-embedded";
  var FRAME_SELECTOR = 'iframe[data-freesql-src], iframe[src*="freesql.com/embedded"], iframe[id="live-sql-embedded"]';
  var FRAME_SRC_SELECTOR = 'iframe[src*="freesql.com/embedded"]';
  var MAX_PARALLEL_LOADS = 1;
  var LOAD_TIMEOUT_MS = 20000;

  var activeLoads = 0;
  var queue = [];
  var frameCounter = 0;
  var observedFrames = new WeakSet();

  function isFreesqlUrl(value) {
    return typeof value === "string" && value.indexOf("freesql.com/embedded") !== -1;
  }

  function normalizeFrameSource(frame) {
    if (!frame) {
      return null;
    }

    var source = frame.getAttribute("data-freesql-src") || frame.getAttribute("src");
    if (!isFreesqlUrl(source)) {
      return null;
    }

    if (frame.dataset.freesqlSrc !== source) {
      frame.dataset.freesqlSrc = source;
    }

    if (frame.getAttribute("data-freesql-src") !== source) {
      frame.setAttribute("data-freesql-src", source);
    }

    var hasInlineSrc = !!frame.getAttribute("src");
    var isActivelyLoading = frame.classList.contains("freesql-loading");
    var alreadyLoaded = frame.dataset.freesqlLoaded === "1";
    var allowInitialDeferral = frame.dataset.freesqlQueued !== "0" && !isActivelyLoading && !alreadyLoaded;

    if (hasInlineSrc && allowInitialDeferral) {
      // Authors usually paste FreeSQL snippets with src=. Move it to data-freesql-src
      // so this loader can defer and queue actual iframe navigation.
      frame.removeAttribute("src");
    }

    return source;
  }

  function prepareSourceFrames(root) {
    var sourceFrames = root.querySelectorAll(FRAME_SRC_SELECTOR);
    sourceFrames.forEach(function (frame) {
      normalizeFrameSource(frame);
    });
  }

  function ensureFrameIdentity(frame) {
    frameCounter += 1;
    if (!frame.id || frame.id === LEGACY_EMBED_ID) {
      frame.id = "freesql-embed-" + frameCounter;
    }

    if (!frame.classList.contains("freesql-embed")) {
      frame.classList.add("freesql-embed");
    }

    // Avoid duplicate target names used in copied iframe snippets.
    frame.name = "freesql-embed-" + frameCounter;

    if (!frame.title || frame.title === "FreeSQL") {
      frame.title = "FreeSQL Embedded Playground " + frameCounter;
    }
  }

  function isDisplayable(frame) {
    if (!frame || !frame.isConnected) {
      return false;
    }

    var style = window.getComputedStyle(frame);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    return frame.getClientRects().length > 0;
  }

  function isNearViewport(frame) {
    var rect = frame.getBoundingClientRect();
    return rect.top < window.innerHeight * 1.3 && rect.bottom > -300;
  }

  function primeFrame(frame) {
    if (frame.dataset.freesqlReady === "1") {
      return;
    }

    var source = normalizeFrameSource(frame);
    if (!source) {
      return;
    }

    frame.removeAttribute("loading");

    frame.dataset.freesqlReady = "1";
    frame.classList.add("freesql-pending");

    ensureFrameIdentity(frame);
  }

  function markLoaded(frame) {
    frame.dataset.freesqlLoaded = "1";
    frame.classList.remove("freesql-loading");
    frame.classList.remove("freesql-pending");
    frame.classList.add("freesql-loaded");
  }

  function pumpQueue() {
    while (activeLoads < MAX_PARALLEL_LOADS && queue.length > 0) {
      var frame = queue.shift();

      if (!frame || !frame.isConnected || frame.dataset.freesqlLoaded === "1") {
        continue;
      }

      var src = frame.dataset.freesqlSrc;
      if (!isFreesqlUrl(src)) {
        continue;
      }

      activeLoads += 1;
      frame.dataset.freesqlQueued = "0";
      frame.classList.remove("freesql-pending");
      frame.classList.add("freesql-loading");

      (function (targetFrame) {
        var finished = false;
        var timeoutId = null;

        function finish() {
          if (finished) {
            return;
          }

          finished = true;
          if (timeoutId) {
            window.clearTimeout(timeoutId);
          }

          activeLoads = Math.max(0, activeLoads - 1);
          markLoaded(targetFrame);
          pumpQueue();
        }

        targetFrame.addEventListener("load", finish, { once: true });
        targetFrame.addEventListener("error", finish, { once: true });

        timeoutId = window.setTimeout(finish, LOAD_TIMEOUT_MS);
        targetFrame.setAttribute("loading", "eager");
        targetFrame.src = targetFrame.dataset.freesqlSrc;
      })(frame);
    }
  }

  function enqueueFrame(frame, prioritize) {
    if (
      !frame ||
      frame.dataset.freesqlReady !== "1" ||
      frame.dataset.freesqlLoaded === "1" ||
      frame.dataset.freesqlQueued === "1"
    ) {
      return;
    }

    frame.dataset.freesqlQueued = "1";
    if (prioritize) {
      queue.unshift(frame);
    } else {
      queue.push(frame);
    }
    pumpQueue();
  }

  function attachObserver(frame, observer) {
    if (observedFrames.has(frame)) {
      return;
    }

    observedFrames.add(frame);

    if (observer) {
      observer.observe(frame);
    } else {
      // Fallback for older browsers: queue immediately.
      enqueueFrame(frame);
    }
  }

  function scanAndPrepare() {
    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      return;
    }

    // Normalize author-provided iframes that still use src= from FreeSQL copy/paste.
    prepareSourceFrames(root);
    var frames = root.querySelectorAll(FRAME_SELECTOR);

    var observer = null;
    if (window.IntersectionObserver) {
      if (!window.__freesqlIntersectionObserver) {
        window.__freesqlIntersectionObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting) {
                return;
              }

              var frame = entry.target;
              window.__freesqlIntersectionObserver.unobserve(frame);
              enqueueFrame(frame, true);
            });
          },
          {
            root: null,
            rootMargin: "300px 0px 300px 0px",
            threshold: 0.01,
          }
        );
      }
      observer = window.__freesqlIntersectionObserver;
    }

    frames.forEach(function (frame) {
      primeFrame(frame);
      attachObserver(frame, observer);
    });

    // Ensure any visible frame starts loading quickly.
    frames.forEach(function (frame) {
      if (frame.dataset.freesqlReady !== "1" || frame.dataset.freesqlLoaded === "1") {
        return;
      }

      if (isDisplayable(frame) && isNearViewport(frame)) {
        enqueueFrame(frame, true);
      }
    });
  }

  function enqueueDisplayableFrames() {
    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      return;
    }

    root.querySelectorAll(FRAME_SELECTOR).forEach(function (frame) {
      if (frame.dataset.freesqlReady !== "1" || frame.dataset.freesqlLoaded === "1") {
        return;
      }

      if (isDisplayable(frame)) {
        enqueueFrame(frame);
      }
    });
  }

  function boot() {
    scanAndPrepare();

    var root = document.querySelector(ROOT_SELECTOR);
    if (!root) {
      window.setTimeout(boot, 200);
      return;
    }

    var mutationObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function (node) {
            if (!node || node.nodeType !== 1) {
              return;
            }

            if (node.matches && node.matches(FRAME_SRC_SELECTOR)) {
              normalizeFrameSource(node);
            }

            if (node.querySelectorAll) {
              node.querySelectorAll(FRAME_SRC_SELECTOR).forEach(function (frame) {
                normalizeFrameSource(frame);
              });
            }
          });
        } else if (mutation.type === "attributes") {
          normalizeFrameSource(mutation.target);
        }
      });

      scanAndPrepare();
    });

    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "src"],
    });

    document.addEventListener("click", function (event) {
      var target = event.target;
      var hasToggleClass = !!(target && target.classList && target.classList.contains("hol-ToggleRegions"));
      if (!target) {
        return;
      }

      if (
        target.id === "btn_toggle" ||
        hasToggleClass ||
        target.tagName === "H2"
      ) {
        window.setTimeout(function () {
          scanAndPrepare();
          if (target.id === "btn_toggle" || hasToggleClass) {
            enqueueDisplayableFrames();
          }
        }, 150);
      }
    });

    window.addEventListener("hashchange", function () {
      window.setTimeout(scanAndPrepare, 150);
    });

    window.addEventListener("resize", function () {
      window.setTimeout(scanAndPrepare, 120);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
