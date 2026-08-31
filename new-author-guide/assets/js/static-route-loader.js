(function () {
  "use strict";

  var path = window.location.pathname.replace(/\/+$/, "");
  var route = path.split("/").pop().toLowerCase();
  var supportedRoutes = ["home", "quickstart", "cheatsheet", "nodoc"];
  var sourcePath;

  if (supportedRoutes.indexOf(route) === -1) {
    return;
  }

  // GitHub Pages can serve each route directory but has no clean-URL rewrite
  // rule. Keep the editable page source in pages/ and load it at that route.
  sourcePath = "../pages/" + route + ".html";

  fetch(sourcePath, { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Unable to load " + sourcePath + ": HTTP " + response.status);
      }
      return response.text();
    })
    .then(function (source) {
      document.open();
      document.write(source);
      document.close();
    })
    .catch(function (error) {
      var message = document.getElementById("route-load-error");
      if (message) {
        message.hidden = false;
        message.textContent = "The Author Guide page could not be loaded. " + error.message;
      }
      console.error(error);
    });
}());
