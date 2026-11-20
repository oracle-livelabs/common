(function () {
  function eventCodeSectionHash(sectionId) {
    return window.LiveLabsSectionUrl.build(["event-code", sectionId]);
  }

  function eventCodeSectionIdFromHash(hash) {
    var parts = window.LiveLabsSectionUrl.parse(hash);
    if (parts.length === 2 && parts[0] === "event-code") {
      return parts[1];
    }
    return parts.length === 1 ? parts[0] : "";
  }

  var lightbox = document.getElementById("imageLightbox");
  var lightboxImage = document.getElementById("imageLightboxImage");
  var lightboxCaption = document.getElementById("imageLightboxCaption");
  var lightboxClose = document.getElementById("imageLightboxClose");
  var lastExpandedFigure = null;
  var sectionRevealPending = Boolean(window.location.hash);

  function eventCodeSections() {
    return Array.prototype.slice.call(document.querySelectorAll("#markdownMode [data-section-url-anchor]"));
  }

  function scrollToEventCodeSection(target) {
    if (!target) {
      return;
    }
    window.requestAnimationFrame(function () {
      target.scrollIntoView({ block: "start" });
    });
  }

  function revealEventCodeHash() {
    var id = eventCodeSectionIdFromHash(window.location.hash);
    var target = id && document.getElementById(id);
    var canonicalHash;

    if (!target || !target.matches("[data-section-url-anchor]")) {
      sectionRevealPending = false;
      return;
    }

    sectionRevealPending = true;
    window.requestAnimationFrame(function () {
      target.scrollIntoView({ block: "start" });
      canonicalHash = eventCodeSectionHash(target.id);
      if (window.location.hash !== canonicalHash) {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + canonicalHash);
      }
      sectionRevealPending = false;
      syncEventCodeSectionHash();
    });
  }

  function syncEventCodeSectionHash() {
    if (sectionRevealPending) {
      return;
    }
    var sections = eventCodeSections();
    var current = sections[0];
    var nextHash;

    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= 160) {
        current = section;
      }
    });
    if (!current) {
      return;
    }

    nextHash = eventCodeSectionHash(current.id);
    if (window.location.hash !== nextHash) {
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search + nextHash);
    }

    document.querySelectorAll("#section-links a").forEach(function (link) {
      if (eventCodeSectionIdFromHash(link.hash) === current.id) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  var scrollPending = false;
  window.addEventListener("hashchange", revealEventCodeHash);
  window.addEventListener("popstate", revealEventCodeHash);
  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest('a[href^="#"]');
    var id = link && eventCodeSectionIdFromHash(link.hash);
    var target = id && document.getElementById(id);
    var nextHash;

    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !target || !target.matches("[data-section-url-anchor]")) {
      return;
    }

    event.preventDefault();
    nextHash = eventCodeSectionHash(target.id);
    if (window.location.hash !== nextHash) {
      window.history.pushState(window.history.state, "", window.location.pathname + window.location.search + nextHash);
    }
    scrollToEventCodeSection(target);
  });
  window.addEventListener("scroll", function () {
    if (scrollPending) {
      return;
    }
    scrollPending = true;
    window.requestAnimationFrame(function () {
      scrollPending = false;
      syncEventCodeSectionHash();
    });
  }, { passive: true });
  window.addEventListener("resize", syncEventCodeSectionHash);
  revealEventCodeHash();

  if (!lightbox || !lightboxImage || !lightboxCaption || !lightboxClose) {
    return;
  }

  function decorateImages() {
    document.querySelectorAll("#markdownMode .event-code-figure").forEach(function (figure) {
      var image = figure.querySelector("img");
      var caption = figure.querySelector("figcaption");
      var pill;

      if (!image) {
        return;
      }

      figure.setAttribute("data-expandable", "true");
      figure.setAttribute("tabindex", "0");
      figure.setAttribute("role", "button");
      figure.setAttribute("aria-label", caption && caption.textContent.trim()
        ? "Expand image: " + caption.textContent.trim()
        : "Expand image");

      pill = figure.querySelector(".figure-expand-pill");
      if (!pill) {
        pill = document.createElement("span");
        pill.className = "figure-expand-pill";
        pill.setAttribute("aria-hidden", "true");
        pill.textContent = "Click to expand";
        figure.insertBefore(pill, image.closest("picture") || image);
      }
    });
  }

  function openImage(figure) {
    var image = figure && figure.querySelector("img");
    var caption = figure && figure.querySelector("figcaption");
    var captionText = caption ? caption.textContent.trim() : "";

    if (!image) {
      return;
    }

    lastExpandedFigure = figure;
    lightboxImage.setAttribute("src", image.currentSrc || image.getAttribute("src") || "");
    lightboxImage.setAttribute("alt", image.getAttribute("alt") || "");
    lightboxCaption.textContent = captionText;
    lightboxCaption.hidden = !captionText;
    lightbox.removeAttribute("hidden");
    lightbox.setAttribute("aria-hidden", "false");
    window.LiveLabsImageViewer.open(lightbox);
    document.body.classList.add("image-lightbox-open");
    lightboxClose.focus();
  }

  function closeImage() {
    if (lightbox.hasAttribute("hidden")) {
      return;
    }

    window.LiveLabsImageViewer.close(lightbox);
    lightbox.setAttribute("hidden", "");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.removeAttribute("src");
    lightboxImage.setAttribute("alt", "");
    lightboxCaption.textContent = "";
    document.body.classList.remove("image-lightbox-open");

    if (lastExpandedFigure && typeof lastExpandedFigure.focus === "function") {
      lastExpandedFigure.focus();
    }
    lastExpandedFigure = null;
  }

  decorateImages();

  document.addEventListener("click", function (event) {
    var target = event.target && event.target.closest ? event.target : event.target.parentElement;
    var figure;

    if (!target) {
      return;
    }

    if (target === lightboxClose || target.closest("[data-lightbox-close='true']")) {
      closeImage();
      return;
    }

    figure = target.closest("#markdownMode figure[data-expandable='true']");
    if (figure) {
      openImage(figure);
    }
  });

  document.addEventListener("keydown", function (event) {
    var target = event.target;
    var figure;

    if (event.key === "Escape" && !lightbox.hasAttribute("hidden")) {
      closeImage();
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && target && target.closest) {
      figure = target.closest("#markdownMode figure[data-expandable='true']");
      if (figure) {
        event.preventDefault();
        openImage(figure);
      }
    }
  });
}());
