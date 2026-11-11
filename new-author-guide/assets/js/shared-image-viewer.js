// Native modal isolation plus predictable keyboard cycling for every image viewer.
(function () {
  var bound = new WeakSet();
  window.LiveLabsImageViewer = {
    open: function (dialog) {
      if (!bound.has(dialog)) {
        dialog.addEventListener("cancel", function (event) {
          event.preventDefault();
          dialog.querySelector(".image-lightbox-close").click();
        });
        dialog.addEventListener("keydown", function (event) {
          if (event.key !== "Tab") return;
          var controls = Array.from(dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
            .filter(function (node) { return !node.disabled && node.getClientRects().length; });
          var first = controls[0];
          var last = controls[controls.length - 1];
          if (first && ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last))) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
          }
        });
        bound.add(dialog);
      }
      if (!dialog.open) dialog.showModal();
    },
    close: function (dialog) {
      if (dialog.open) dialog.close();
    }
  };
}());
