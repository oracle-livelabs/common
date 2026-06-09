(function () {
  function resolveElement(value) {
    if (!value) {
      return null;
    }

    if (typeof value === "string") {
      return document.getElementById(value) || document.querySelector(value);
    }

    return value;
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

  window.LiveLabsSideNav = Object.assign({}, window.LiveLabsSideNav, {
    bindSideNavToggle: bindSideNavToggle
  });
}());
