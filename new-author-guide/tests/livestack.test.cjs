const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const routes = ["livestack", "livestack/use", "livestack/create", "livestack/events"];
const config = fs.readFileSync(path.join(root, "assets/js/author-guide-config.js"), "utf8");

for (const route of routes) {
  test(route + ": static content, assets, links, and development boundary", () => {
    const html = fs.readFileSync(path.join(root, route, "index.html"), "utf8");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size, "IDs must be unique");
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /content="noindex,nofollow"/);
    assert.doesNotMatch(html, /ls-draft|In development/);
    assert.match(html, /class="ls-decoration-strip" aria-hidden="true"/);
    assert.ok(html.indexOf('<header class="ls-hero') < html.indexOf('<nav class="ls-page-nav"'), "Banner starts the page");
    assert.match(html, /<form id="lsSearchForm" role="search"/);
    assert.match(html, /for="lsSearchInput"/);
    assert.match(html, /id="lsSearchStatus" role="status" aria-live="polite"/);
    assert.ok(html.indexOf('assets/js/livestack-search.js') < html.indexOf('assets/js/livestack-reference.js'));
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
    const mainNav = html.slice(html.indexOf('<header class="mode-nav"'), html.indexOf('<main'));
    assert.doesNotMatch(mainNav, /href="[^"]*livestack/);
    assert.doesNotMatch(mainNav, /<details[^>]*\bopen\b/);
    assert.doesNotMatch(html, /session=|@ASSETS@|@LS@/);
    const pageNav = html.match(/<nav class="ls-page-nav"[\s\S]*?<\/nav>/)[0];
    assert.match(pageNav, />LiveStacks on LiveLabs<\/a>/);
    assert.match(pageNav, />Create a LiveStack<\/a>/);
    assert.doesNotMatch(html, /Use a LiveStack|Use on LiveLabs|Create in WMS/);
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|data:)/.test(ref)) continue;
      const url = new URL(ref.replaceAll("&amp;", "&"), "http://localhost/" + route + "/");
      let target = path.join(root, decodeURIComponent(url.pathname));
      if (url.pathname.endsWith("/")) target = path.join(target, "index.html");
      assert.ok(fs.existsSync(target), ref + " resolves to a file");
      if (url.hash && url.pathname.startsWith("/livestack/")) {
        assert.ok(fs.readFileSync(target, "utf8").includes('id="' + url.hash.slice(1) + '"'), ref + " anchor exists");
      }
    }
    for (const [image] of html.matchAll(/<img\s+src=[^>]+>/g)) {
      assert.match(image, /alt="[^"]+"/);
      assert.match(image, /width="\d+" height="\d+"/, "Images reserve layout space");
    }
  });
}

test("overview banner: shared Redwood asset and no artwork caption", () => {
  const html = fs.readFileSync(path.join(root, "livestack/index.html"), "utf8");
  const hero = html.match(/<header class="ls-hero[\s\S]*?<\/header>/)[0];
  assert.doesNotMatch(hero, /figcaption|Select image to enlarge|LiveStack overview artwork/);
  assert.match(hero, /data-ls-image="LiveLabs LiveStack"/);
  const css = fs.readFileSync(path.join(root, "assets/css/livestack-reference.css"), "utf8");
  assert.match(css, /url\("\.\.\/images\/color-strip.png"\)/);
  assert.ok(fs.existsSync(path.join(root, "assets/images/color-strip.png")));
});

const search = require("../assets/js/livestack-search.js");
const searchEntries = [
  {id: "intro", title: "Meet LiveStack", text: "Explore the demo, workshops, and supporting assets."},
  {id: "subscribe", title: "Subscribe", text: "Use My LiveStacks to find subscriptions and return later."},
  {id: "assets", title: "Supporting assets", text: "Read the Terraform deployment guide and its prerequisites."}
];
test("guide search: title relevance and case-insensitive matching", () => {
  assert.deepEqual(search.find(searchEntries, "ASSETS").map(e => e.id), ["assets", "intro"]);
  assert.deepEqual(search.find(searchEntries, "my LIVESTACKS").map(e => e.id), ["subscribe"]);
});
test("guide search: all terms required, whitespace and empty states", () => {
  assert.deepEqual(search.find(searchEntries, "  terraform   guide ").map(e => e.id), ["assets"]);
  assert.deepEqual(search.find(searchEntries, "terraform subscriptions"), []);
  assert.deepEqual(search.find(searchEntries, "   "), []);
  assert.deepEqual(search.find(searchEntries, "nonexistent"), []);
});
test("guide search: punctuation is literal, never a regex or markup", () => {
  for (const query of ["[.*]", "<img onerror=alert(1)>", "'\"&"]) assert.deepEqual(search.find(searchEntries, query), []);
  assert.equal(search.normalize("Café take-it-home"), "cafe take it home");
  assert.deepEqual(search.tokens("Sandbox sandbox"), ["sandbox"]);
});
test("guide search: excerpts include a late match and stay compact", () => {
  const text = "Introduction text. ".repeat(40) + "Terraform setup is documented here. ";
  const excerpt = search.excerpt(text, "terraform");
  assert.ok(excerpt.includes("Terraform"));
  assert.ok(excerpt.length <= 222);
});

// Static fixtures exercise the shared loader against the real four source files.
// Browser checks separately exercise readSections with the browser's DOMParser.
function staticSections(html) {
  const plain = value => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return [...html.matchAll(/<(header|section) class="ls-(?:hero|section|step)\b[^\"]*" id="([^\"]+)"[^>]*>([\s\S]*?)<\/\1>/g)]
    .map(([, , id, body]) => ({id, title: plain(body.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/)[1]), text: plain(body)}));
}
function localIndex(base = "http://localhost/livestack/") {
  return search.loadIndex(base, url => {
    const route = new URL(url).pathname.slice(new URL(base).pathname.length);
    return fs.readFileSync(path.join(root, "livestack", route, "index.html"), "utf8");
  }, staticSections);
}
test("shared search: every page contributes labelled, uniquely addressed sections", async () => {
  const entries = await localIndex();
  assert.deepEqual([...new Set(entries.map(e => e.pagePath))], ["", "use/", "create/", "events/"]);
  assert.equal(entries.length, new Set(entries.map(e => e.href)).size);
  assert.equal(entries.filter(e => e.id === "page-overview").length, 4);
  for (const entry of entries) {
    assert.ok(entry.pageTitle && entry.title && entry.text);
    assert.equal(new URL(entry.href).hash, "#" + entry.id);
  }
});
test("shared search: finds concepts in each guide from the same corpus", async () => {
  const entries = await localIndex();
  for (const [query, pagePath, id] of [
    ["container based", "", "how-it-works"],
    ["Mark as Completed", "use/", "progress"],
    ["Publish Requested", "create/", "publish"],
    ["capacity", "events/", "configure"]
  ]) assert.ok(search.find(entries, query).some(e => e.pagePath === pagePath && e.id === id), query);
});
test("shared search: matches source page names without adding undefined text", async () => {
  const entries = await localIndex();
  assert.ok(search.find(entries, "Introduction").some(e => e.pagePath === ""));
  assert.deepEqual(search.find(searchEntries, "undefined"), []);
});
test("shared search: result URLs preserve nested deployment prefixes", async () => {
  const base = "https://example.test/common/new-author-guide/livestack/";
  const entries = await localIndex(base);
  for (const entry of entries) assert.equal(entry.href, base + entry.pagePath + "#" + entry.id);
});
test("shared search: one failed page rejects the whole corpus", async () => {
  const requested = [];
  await assert.rejects(search.loadIndex("http://localhost/livestack/", url => {
    requested.push(url);
    if (url.includes("events/")) throw new Error("Unavailable");
    return [{id: "page-overview", title: "Overview", text: "Content"}];
  }, value => value), /Unavailable/);
  assert.equal(requested.length, 4);
});
test("shared search: an empty page cannot silently become a partial index", async () => {
  await assert.rejects(search.loadIndex("http://localhost/livestack/", () => "", () => []), /no sections/);
});
test("shared search: browser module exposes the same shared API", () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets/js/livestack-search.js"), "utf8"), {window, URL});
  assert.equal(window.LiveStackSearch.pages.length, 4);
  assert.equal(typeof window.LiveStackSearch.loadIndex, "function");
  assert.equal(typeof window.LiveStackSearch.readSections, "function");
});
test("shared search: extraction separates blocks without duplicating nested text", () => {
  const text = textContent => ({nodeType: 3, textContent});
  const element = (tagName, childNodes) => ({nodeType: 1, tagName, childNodes});
  const heading = element("H3", [text("Make it your own")]);
  const paragraph = element("P", [text("Read "), element("STRONG", [text("Assets")]), text(".")]);
  const item = element("LI", [heading, paragraph]);
  item.parentElement = {closest: () => null};
  heading.parentElement = paragraph.parentElement = {closest: () => item};
  const entries = search.readSections({querySelectorAll: () => [{
    id: "journey", querySelector: () => ({textContent: "Journey"}),
    querySelectorAll: () => [item, heading, paragraph]
  }]});
  assert.deepEqual(entries, [{id: "journey", title: "Journey", text: "Make it your own Read Assets."}]);
});
test("shared search: consistent controls and scope across all routes", () => {
  for (const route of routes) {
    const html = fs.readFileSync(path.join(root, route, "index.html"), "utf8");
    const panel = html.match(/<section class="ls-search-panel"[\s\S]*?<\/section>/)[0];
    assert.match(panel, /aria-label="Search all LiveStack guides"/);
    assert.match(panel, />Search LiveStack guides<\/label>/);
    assert.match(panel, /placeholder="Search demos, subscriptions, WMS, or events"/);
    assert.match(panel, /Search the introduction, LiveLabs guide, and WMS guides\./);
    assert.doesNotMatch(panel, /Search this page|on this page/i);
  }
});

test("platform guide: complete learner journey and retained bookmarks", () => {
  const html = fs.readFileSync(path.join(root, "livestack/use/index.html"), "utf8");
  assert.match(html, /<h1 id="page-title">LiveStacks on LiveLabs<\/h1>/);
  for (const id of ["find", "bundle", "subscribe", "start", "workshop", "assets", "progress", "share"]) {
    assert.match(html, new RegExp('<section class="ls-step" id="' + id + '">'));
    assert.match(html, new RegExp('<a href="#' + id + '">'));
  }
  assert.equal((html.match(/data-ls-image=/g) || []).length, 7, "Seven actual platform/guide screenshots");
  for (const label of ["My LiveStacks", "Subscribed", "Unsubscribe", "Preview Sandbox Instructions",
    "Run on LiveLabs Sandbox", "Run on Your Environment", "My Reservations", "Mark as Completed",
    "Reset Progress", "Take It Home", "Event Code"]) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /objectstorage\.[^"\s]+\/p\//, "No expiring asset access URLs");
});

test("platform screenshots: correct encoding and source record", () => {
  const dir = path.join(root, "assets/media/livestack/platform");
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  assert.equal(manifest.captures.length, 7);
  for (const capture of manifest.captures) {
    const bytes = fs.readFileSync(path.join(dir, capture.file));
    assert.equal(bytes.readUInt16BE(0), 0xffd8, capture.file + " is JPEG");
    assert.ok(capture.width > 0 && capture.height > 0);
    assert.ok(capture.source.startsWith("https://"));
    assert.ok(!capture.source.includes("session="));
  }
});

for (const prefix of ["/", "/common/new-author-guide/", "/objects/docs/livestack/"]) {
  for (const route of ["", "markdown/", "quickstart/", "livestack/", "livestack/use/", "livestack/create/", "livestack/events/"]) {
    for (const index of ["", "index.html"]) {
      test("guide root: " + prefix + route + index, () => {
        const window = { location: { href: "http://localhost" + prefix + route + index + "?test=1#section" } };
        vm.runInNewContext(config, { window, URL, document: {
          currentScript: { src: "http://localhost" + prefix + "assets/js/author-guide-config.js?v=test" },
          addEventListener() {}
        } });
        assert.equal(window.AuthorGuidePaths.root().href, "http://localhost" + prefix);
        assert.equal(window.AuthorGuidePaths.resolve("assets/test.png"), "http://localhost" + prefix + "assets/test.png");
      });
    }
  }
}

for (const route of routes) {
  test("fallback root without currentScript: " + route, () => {
    const window = { location: { href: "http://localhost/common/new-author-guide/" + route + "/index.html#test" } };
    vm.runInNewContext(config, { window, URL, document: { addEventListener() {} } });
    assert.equal(window.AuthorGuidePaths.root().href, "http://localhost/common/new-author-guide/");
  });
}
