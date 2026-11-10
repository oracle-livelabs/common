/* Bounded, shared content requests for the reader and search index. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else root.AuthorGuideLoader = factory({
    resolve: root.AuthorGuidePaths.resolve,
    fetch: root.fetch.bind(root), AbortController: root.AbortController,
    setTimeout: root.setTimeout.bind(root), clearTimeout: root.clearTimeout.bind(root)
  });
}(typeof window !== "undefined" ? window : this, function (options) {
  "use strict";
  var noDocPromise;
  var catalogPromise;

  function boundedRequest(work) {
    var controller = new options.AbortController();
    var timer = options.setTimeout(function () { controller.abort(); }, options.timeoutMs || 30000);
    return Promise.resolve().then(function () { return work(controller.signal); })
      .finally(function () { options.clearTimeout(timer); });
  }

  function read(url, type, signal) {
    return options.fetch(url, { cache: "no-cache", signal: signal }).then(function (response) {
      if (!response.ok) throw new Error("Guide content returned HTTP " + response.status);
      return response[type]();
    });
  }

  return {
    loadNoDoc: function () {
      if (!noDocPromise) {
        noDocPromise = boundedRequest(function (signal) {
          var manifestUrl = options.resolve("workshops/nodoc/manifest.json");
          return read(manifestUrl, "json", signal).then(function (manifest) {
            if (!manifest || !manifest.content) throw new Error("NoDoc content is not configured");
            var contentUrl = new URL(manifest.content, manifestUrl).toString();
            return read(contentUrl, "text", signal).then(function (markup) {
              if (!markup.trim()) throw new Error("NoDoc content is empty");
              return { markup: markup, contentUrl: contentUrl };
            });
          });
        }).catch(function (error) { noDocPromise = null; throw error; });
      }
      return noDocPromise;
    },
    loadCatalog: function () {
      if (!catalogPromise) {
        catalogPromise = boundedRequest(function (signal) {
          return read(options.resolve("assets/data/author-guide-catalog.json"), "json", signal);
        }).catch(function (error) { catalogPromise = null; throw error; });
      }
      return catalogPromise;
    }
  };
}));
