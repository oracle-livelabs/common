(function (window) {
  function encodePart(value) {
    return encodeURIComponent(String(value));
  }

  function decodePart(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  window.LiveLabsSectionUrl = {
    build: function (parts) {
      var values = Array.isArray(parts) ? parts : [];

      return "#" + values.map(encodePart).join("#");
    },
    parse: function (hash) {
      var value = String(hash || "").replace(/^#/, "");

      return value ? value.split("#").map(decodePart) : [];
    }
  };
}(window));
