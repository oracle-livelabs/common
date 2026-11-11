(function () {
  var lightbox = document.getElementById("imageLightbox");
  var lightboxImage = document.getElementById("imageLightboxImage");
  var lightboxCaption = document.getElementById("imageLightboxCaption");
  var lightboxClose = document.getElementById("imageLightboxClose");
  var lastExpandedFigure = null;

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
    document.body.classList.add("image-lightbox-open");
    lightboxClose.focus();
  }

  function closeImage() {
    if (lightbox.hasAttribute("hidden")) {
      return;
    }

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
