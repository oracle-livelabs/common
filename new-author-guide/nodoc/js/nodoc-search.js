(function (root) {
  "use strict";

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function tokens(value) {
    var variants = { drafts: "draft", pages: "page", articles: "article", versions: "version", images: "image", tokens: "token", permissions: "permission", screenshots: "screenshot", tasks: "task", labs: "lab", approval: "approve", approved: "approve" };
    return Array.from(new Set((clean(value).toLowerCase().replace(/\b(lab|task)(\d+)\b/g, '$1 $2').match(/[a-z0-9]+/g) || []).map(function (word) {
      return variants[word] || word;
    })));
  }

  function readerText(node, overview) {
    var copy = node.cloneNode(true);
    copy.querySelectorAll('[data-video-card], .nodoc-task-media, .figure-expand-pill, [data-nodoc-search-exclude], button, script, style, [hidden]').forEach(function (item) { item.remove(); });
    var heading = copy.querySelector(':scope > summary');
    if (heading) heading.remove();
    if (overview) {
      copy.querySelectorAll('details.nodoc-task').forEach(function (item) { item.remove(); });
    }
    return clean(copy.textContent);
  }

  function build(source) {
    var entries = [];
    Array.from(source.querySelectorAll('details.nodoc-tree-group')).forEach(function (panel, panelIndex) {
      var heading = panel.querySelector(':scope > summary > span') || panel.querySelector(':scope > summary');
      var title = clean(heading.textContent);
      var content = panel.querySelector(':scope > .nodoc-tree-content');
      function add(node, task, taskTitle, body) {
        var introduction = node.querySelector(':scope > p');
        var description = clean(node.getAttribute('data-search-summary') || (introduction && introduction.textContent) || body);
        entries.push({
          panel: panelIndex,
          task: task,
          kind: task ? title : (panelIndex ? "Lab" : "Introduction"),
          title: taskTitle,
          summary: description.length > 240 ? description.slice(0, 237).replace(/\s+\S*$/, '') + '…' : description,
          keywords: clean(node.getAttribute('data-search-keywords')),
          text: body,
          path: title + (task ? " / " + taskTitle : "")
        });
      }
      add(panel, 0, title, readerText(content || panel, true));
      Array.from(panel.querySelectorAll('details.nodoc-task')).filter(function (task) {
        return task.getAttribute('data-nodoc-hidden') !== 'true';
      }).forEach(function (task, taskIndex) {
        add(task, taskIndex + 1, clean(task.querySelector(':scope > summary').textContent), readerText(task, false));
      });
    });
    return entries;
  }

  function score(entry, query) {
    var terms = tokens(query);
    var title = tokens(entry.title);
    var summary = tokens(entry.summary);
    var keywords = tokens(entry.keywords);
    var path = tokens(entry.path);
    var all = tokens([entry.path, entry.title, entry.summary, entry.keywords, entry.text].join(' '));
    if (!terms.length || !terms.every(function (term) { return all.indexOf(term) !== -1; })) return 0;
    var rank = entry.task ? 2 : 1;
    terms.forEach(function (term) {
      rank += title.indexOf(term) !== -1 ? 12 : keywords.indexOf(term) !== -1 ? 9 : summary.indexOf(term) !== -1 ? 6 : path.indexOf(term) !== -1 ? 3 : 1;
    });
    if (clean(entry.title).toLowerCase().indexOf(clean(query).toLowerCase()) !== -1) rank += 30;
    return rank;
  }

  function find(entries, query) {
    var lab = clean(query).match(/\blab\s*(\d+)\b/i);
    var task = clean(query).match(/\btask\s*(\d+)\b/i);
    return entries.filter(function (entry) {
      return (!lab || entry.panel === Number(lab[1])) && (!task || entry.task === Number(task[1]));
    }).map(function (entry) { return { entry: entry, score: score(entry, query) }; })
      .filter(function (match) { return match.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.entry.panel - b.entry.panel || a.entry.task - b.entry.task; })
      .map(function (match) { return match.entry; });
  }

  var api = { build: build, find: find, tokens: tokens };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NoDocSearch = api;
}(typeof window !== 'undefined' ? window : this));
