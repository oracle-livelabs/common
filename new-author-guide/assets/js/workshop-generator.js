// Local workshop-generation abstraction for WMS examples, LiveLabs snippets, and outline support.
(function () {
  var fallbackTopic = "Oracle LiveLabs workshop";
  var productCatalog = [
    { label: "Oracle Database", module: "Oracle Database", patterns: ["oracle database", "database", "adb", "autonomous database", "23ai", "select ai", "selectai"] },
    { label: "Autonomous Database", module: "Oracle Database", patterns: ["autonomous database", "adb"] },
    { label: "Select AI", module: "Oracle Database", patterns: ["select ai", "selectai"] },
    { label: "OCI Generative AI", module: "OCI AI Services", patterns: ["oci genai", "oci generative ai", "generative ai", "genai"] },
    { label: "OCI AI Services", module: "OCI AI Services", patterns: ["ai speech", "ai services", "oci ai"] },
    { label: "OCI Object Storage", module: "Oracle Cloud Infrastructure", patterns: ["object storage", "bucket"] },
    { label: "OCI Functions", module: "Oracle Cloud Infrastructure", patterns: ["functions", "serverless"] },
    { label: "OCI Events", module: "Oracle Cloud Infrastructure", patterns: ["events", "event-driven"] },
    { label: "OCI Notifications", module: "Oracle Cloud Infrastructure", patterns: ["notifications"] },
    { label: "Oracle Cloud Infrastructure", module: "Oracle Cloud Infrastructure", patterns: ["oci", "oracle cloud infrastructure"] },
    { label: "APEX", module: "Application Development", patterns: ["apex", "application express"] },
    { label: "FreeSQL", module: "Oracle Database", patterns: ["freesql"] },
    { label: "Kubernetes", module: "Cloud Native", patterns: ["kubernetes", "oke"] },
    { label: "Analytics", module: "Analytics", patterns: ["analytics", "dashboard", "visualization"] },
    { label: "IAM", module: "Security", patterns: ["iam", "identity", "policy", "policies"] },
    { label: "Logging", module: "Observability", patterns: ["logging", "logs", "observability"] }
  ];

  var acronymMap = {
    ai: "AI",
    adb: "ADB",
    api: "API",
    apex: "APEX",
    css: "CSS",
    genai: "GenAI",
    html: "HTML",
    iam: "IAM",
    json: "JSON",
    llm: "LLM",
    oci: "OCI",
    oke: "OKE",
    ospa: "OSPA",
    par: "PAR",
    plsql: "PL/SQL",
    rag: "RAG",
    sql: "SQL",
    ui: "UI",
    wms: "WMS"
  };

  var titleSmallWords = {
    and: true,
    as: true,
    for: true,
    from: true,
    in: true,
    of: true,
    on: true,
    the: true,
    to: true,
    using: true,
    with: true
  };

  var snippetCatalog = [
    {
      id: "livelabs-lab-shell",
      label: "LiveLabs lab shell",
      group: "Workshop structure",
      summary: "Required lab sections, task headers, estimated time, and acknowledgements.",
      source: "LiveLabs author guide",
      body: [
        "# Lab Title",
        "",
        "## Introduction",
        "",
        "Describe the learner problem, the environment, and the outcome. Keep this factual and learner-facing.",
        "",
        "Estimated Time: 30 minutes",
        "",
        "### Objectives",
        "",
        "In this lab, you will:",
        "",
        "* Prepare the required environment.",
        "* Complete the main implementation task.",
        "* Validate the result before moving on.",
        "",
        "### Prerequisites",
        "",
        "* Access to the required Oracle environment.",
        "* Required tools installed locally.",
        "* A WMS workshop request aligned to this content.",
        "",
        "## Task 1: Prepare the environment",
        "",
        "1. Open the required console or tool.",
        "2. Confirm that the required resource exists.",
        "",
        "## Task 2: Build and validate",
        "",
        "1. Complete the implementation step.",
        "2. Validate the expected result.",
        "",
        "## Acknowledgements",
        "",
        "* **Author** - Your Name"
      ].join("\n")
    },
    {
      id: "markdown-text",
      label: "Text formatting",
      group: "Markdown basics",
      summary: "Headings, emphasis, inline code, links, lists, and task lists.",
      source: "Markdown cheat sheets",
      body: [
        "# H1 workshop title",
        "## H2 section title",
        "### H3 task subsection",
        "",
        "Use **bold** for UI labels and *italic* for light emphasis.",
        "Use `inline code` for commands, filenames, variables, and field names.",
        "",
        "[Oracle LiveLabs](https://livelabs.oracle.com)",
        "",
        "1. First ordered step.",
        "2. Second ordered step.",
        "   1. Nested ordered step.",
        "",
        "- Bullet item",
        "- Another bullet item",
        "",
        "- [x] Completed authoring check",
        "- [ ] Remaining authoring check"
      ].join("\n")
    },
    {
      id: "callouts",
      label: "Notes and callouts",
      group: "Text and emphasis",
      summary: "LiveLabs-safe blockquote callouts for notes, warnings, and tips.",
      source: "Markdown cheat sheets and LiveLabs author guide",
      body: [
        "> **Note:** Use notes for helpful context that does not interrupt the task flow.",
        "",
        "> **Warning:** Use warnings when a learner can lose work, spend money, or break the environment.",
        "",
        "> **Tip:** Use tips for shortcuts or optional context that improves the workflow.",
        "",
        "> **Important:** Keep callouts short. If the content is required, make it a numbered step instead."
      ].join("\n")
    },
    {
      id: "code-copy",
      label: "Copy-ready code block",
      group: "Code blocks",
      summary: "LiveLabs copy button pattern with language highlighting.",
      source: "LiveLabs author guide and markdown code-block reference",
      body: [
        "```bash",
        "<copy>",
        "oci os ns get",
        "git status",
        "</copy>",
        "```",
        "",
        "```sql",
        "<copy>",
        "select sysdate from dual;",
        "</copy>",
        "```",
        "",
        "Use `bash`, `sql`, `json`, `yaml`, `python`, `javascript`, `diff`, or `text` as the language identifier."
      ].join("\n")
    },
    {
      id: "code-highlight",
      label: "Highlighted code and diff",
      group: "Code blocks",
      summary: "Syntax highlighting, diff examples, and comments that point readers to changed lines.",
      source: "Markdown code-block reference",
      body: [
        "```diff",
        "- workshoptitle: Old Workshop Title",
        "+ workshoptitle: Build with Oracle Database 23ai",
        "  help: livelabs-help@example.com",
        "```",
        "",
        "```json",
        "{",
        "  \"workshoptitle\": \"Build with Oracle Database 23ai\",",
        "  \"help\": \"livelabs-help@example.com\"",
        "}",
        "```",
        "",
        "If line-highlighting extensions are supported in your renderer, test them in preview before relying on them."
      ].join("\n")
    },
    {
      id: "tables",
      label: "Tables",
      group: "Markdown basics",
      summary: "Basic tables, alignment, and escaped pipes.",
      source: "Markdown cheat sheets",
      body: [
        "| Field | Example | Notes |",
        "| --- | --- | --- |",
        "| Workshop Title | Build with Oracle Database 23ai | Outcome first |",
        "| Level | Beginner | Match WMS tags |",
        "| Duration | 60 minutes | Keep realistic |",
        "",
        "| Left | Center | Right |",
        "|:---|:---:|---:|",
        "| Text | Text | 100 |",
        "",
        "Escape a literal pipe inside a cell as `\\|`."
      ].join("\n")
    },
    {
      id: "images-media",
      label: "Images and media",
      group: "Media",
      summary: "Accessible images, LiveLabs sizing, and linked images.",
      source: "Markdown cheat sheets and LiveLabs author guide",
      body: [
        "![Descriptive alt text for the screenshot](images/example-screen.png \" \")",
        "",
        "![Scaled image at half width](images/example-screen.png =50%x*)",
        "",
        "[![Open full-size screenshot](images/example-thumbnail.png \" \")](images/example-screen.png)",
        "",
        "Use meaningful alt text. Store lab images in that lab's `images` folder unless you intentionally reference a shared absolute URL."
      ].join("\n")
    },
    {
      id: "conditional-content",
      label: "Conditional content",
      group: "LiveLabs components",
      summary: "Variant-specific instructions for tenancy, sandbox, desktop, or language tabs.",
      source: "LiveLabs author guide",
      body: [
        "<if type=\"tenancy\">",
        "",
        "1. Complete these steps when the workshop runs in the learner's tenancy.",
        "",
        "</if>",
        "",
        "<if type=\"sandbox\">",
        "",
        "1. Complete these steps when the workshop runs in a LiveLabs sandbox.",
        "",
        "</if>",
        "",
        "Add matching `type` values to the lab entry in `manifest.json` and preview every variant."
      ].join("\n")
    },
    {
      id: "quiz-single",
      label: "Quiz block",
      group: "LiveLabs components",
      summary: "Single-answer, multi-answer, scoring, and badge configuration.",
      source: "LiveLabs quiz guide",
      body: [
        "```quiz-config",
        "passing: 80",
        "badge: images/badge.png",
        "```",
        "",
        "```quiz score",
        "Q: Which file maps labs into the workshop order?",
        "* manifest.json",
        "- README.md",
        "- package.json",
        "> The manifest controls the workshop title, lab order, help link, and variant metadata.",
        "",
        "Q: Which items belong in a lab images folder? (Select all that apply)",
        "* Screenshots used by the lab markdown",
        "* Diagrams referenced by that lab",
        "- Unused draft screenshots",
        "- Personal screenshots with visible secrets",
        "> Keep only needed, sanitized images in the lab folder.",
        "```"
      ].join("\n")
    },
    {
      id: "freesql",
      label: "FreeSQL embed placeholder",
      group: "LiveLabs components",
      summary: "Authoring placeholder for a runnable SQL experience.",
      source: "LiveLabs author guide",
      body: [
        "<!-- Replace data-freesql-src with the generated FreeSQL share URL. -->",
        "<iframe",
        "  class=\"freesql-embed\"",
        "  data-freesql-src=\"https://freesql.com/...\"",
        "  title=\"Run this SQL in FreeSQL\">",
        "</iframe>",
        "",
        "If an embed adds more friction than value, use a copy-ready `sql` block instead."
      ].join("\n")
    },
    {
      id: "qa-checklist",
      label: "Author QA checklist",
      group: "Workshop structure",
      summary: "Quick checklist before WMS status changes or pull request review.",
      source: "LiveLabs author guide",
      body: [
        "- [ ] Each lab has one H1, Introduction, Objectives, Estimated Time, Tasks, and Acknowledgements.",
        "- [ ] Images have meaningful alt text and no secrets.",
        "- [ ] Code blocks render and copy correctly in preview.",
        "- [ ] Tables render on mobile without unreadable overflow.",
        "- [ ] Quiz answers and explanations render correctly.",
        "- [ ] Links use transparent destinations, not shorteners.",
        "- [ ] `manifest.json` has the correct title, lab order, help value, variables, includes, and variant types.",
        "- [ ] Preview with `?qa=true` before changing WMS status."
      ].join("\n")
    },
    {
      id: "outline-support",
      label: "Workshop outline only",
      group: "Outline support",
      summary: "Outline-only helper shaped by the LiveLabs author skill workflow.",
      source: "LiveLabs author skill",
      requiresPrompt: true,
      body: ""
    }
  ];

  function normalizeWhitespace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function compactPrompt(prompt) {
    var text = normalizeWhitespace(prompt);
    return text || fallbackTopic;
  }

  function sentenceCase(value) {
    var text = normalizeWhitespace(value);
    if (!text) {
      return fallbackTopic;
    }
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function titleCase(value) {
    return normalizeWhitespace(value).split(" ").map(function (word, index) {
      var clean = word.replace(/[^a-z0-9]/gi, "").toLowerCase();
      var mapped = acronymMap[clean];

      if (mapped) {
        return word.replace(new RegExp(clean, "i"), mapped);
      }

      if (index > 0 && titleSmallWords[clean]) {
        return word.toLowerCase();
      }

      if (word.length <= 2) {
        return word.toLowerCase();
      }

      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(" ");
  }

  function uniqueValues(values) {
    var seen = {};
    return values.filter(function (value) {
      var key = String(value || "").toLowerCase();
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function detectProducts(prompt) {
    var lower = prompt.toLowerCase();
    var matches = [];

    productCatalog.forEach(function (product) {
      var found = product.patterns.some(function (pattern) {
        return lower.indexOf(pattern) !== -1;
      });
      if (found) {
        matches.push(product.label);
      }
    });

    if (lower.indexOf("rag") !== -1 || lower.indexOf("agent") !== -1 || lower.indexOf("vector") !== -1 || lower.indexOf("memory") !== -1) {
      matches.push("Oracle Database");
      matches.push("OCI Generative AI");
    }

    if (lower.indexOf("ai") !== -1 && lower.indexOf("chat") !== -1) {
      matches.push("OCI Generative AI");
    }

    return uniqueValues(matches).slice(0, 6);
  }

  function listText(values, fallback) {
    var items = uniqueValues(values || []);
    if (!items.length) {
      return fallback || "Oracle services";
    }
    if (items.length === 1) {
      return items[0];
    }
    if (items.length === 2) {
      return items[0] + " and " + items[1];
    }
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  }

  function primaryProduct(products) {
    var priority = [
      "Oracle Database",
      "Autonomous Database",
      "Select AI",
      "OCI Generative AI",
      "OCI AI Services",
      "APEX",
      "Oracle Cloud Infrastructure"
    ];
    var match = priority.find(function (item) {
      return products.indexOf(item) !== -1;
    });
    return match || products[0] || "Oracle services";
  }

  function moduleSuggestion(products, prompt) {
    var primary = primaryProduct(products);
    var found = productCatalog.find(function (item) {
      return item.label === primary;
    });
    var lower = prompt.toLowerCase();

    if (lower.indexOf("agent") !== -1 || lower.indexOf("rag") !== -1 || lower.indexOf("genai") !== -1) {
      return primary === "Oracle Database" || products.indexOf("Oracle Database") !== -1
        ? "Oracle Database and AI"
        : "OCI AI Services";
    }

    return found ? found.module : "LiveLabs workshop module aligned to " + primary;
  }

  function detectAudience(prompt) {
    var lower = prompt.toLowerCase();
    if (lower.indexOf("admin") !== -1 || lower.indexOf("administrator") !== -1) {
      return "administrators";
    }
    if (lower.indexOf("architect") !== -1) {
      return "solution architects";
    }
    if (lower.indexOf("analyst") !== -1) {
      return "analysts";
    }
    if (lower.indexOf("developer") !== -1 || lower.indexOf("app") !== -1) {
      return "developers";
    }
    return "technical authors and workshop learners";
  }

  function actionVerb(prompt) {
    var lower = prompt.toLowerCase();
    if (lower.indexOf("agent") !== -1 || lower.indexOf("chat") !== -1 || lower.indexOf("app") !== -1) {
      return "build";
    }
    if (lower.indexOf("deploy") !== -1) {
      return "deploy";
    }
    if (lower.indexOf("migrate") !== -1) {
      return "migrate";
    }
    if (lower.indexOf("secure") !== -1) {
      return "secure";
    }
    if (lower.indexOf("analy") !== -1) {
      return "analyze";
    }
    return "build";
  }

  function compactTopic(prompt) {
    var text = compactPrompt(prompt)
      .replace(/\b(workshop|tutorial|lab|livelabs|live labs|topic|about|for)\b/gi, " ")
      .replace(/\b(create|build|deploy|learn|show|teach|using|with|on|secure|analyze|analyse|migrate|implement|configure)\b/gi, " ")
      .replace(/\b(administrator|administrators|architect|architects|analyst|analysts|developer|developers|learner|learners|user|users)\b/gi, " ")
      .replace(/\b(oracle cloud infrastructure|oracle database|autonomous database|oci|adb|selectai|select ai)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      text = compactPrompt(prompt);
    }

    return compactText(text, 92);
  }

  function productAlreadyInTopic(topic, product) {
    var lower = topic.toLowerCase();
    var entry = productCatalog.find(function (item) {
      return item.label === product;
    });

    if (lower.indexOf(product.toLowerCase()) !== -1) {
      return true;
    }

    return entry ? entry.patterns.some(function (pattern) {
      return lower.indexOf(pattern) !== -1;
    }) : false;
  }

  function compactText(value, maxLength) {
    var text = normalizeWhitespace(value);
    var bounded = Math.max(40, maxLength || 120);

    if (!text || text.length <= bounded) {
      return text;
    }

    return text.slice(0, bounded).replace(/\s+\S*$/, "").trim();
  }

  function ensurePeriod(value) {
    var text = normalizeWhitespace(value);
    if (!text) {
      return "";
    }
    return /[.!?]$/.test(text) ? text : text + ".";
  }

  function boundSentence(value, maxLength) {
    var text = ensurePeriod(value);
    if (text.length <= maxLength) {
      return text;
    }
    return ensurePeriod(text.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim());
  }

  function profile(prompt) {
    var topic = compactPrompt(prompt);
    var products = detectProducts(topic);
    var product = primaryProduct(products);
    var audience = detectAudience(topic);
    var verb = actionVerb(topic);
    var topicShort = compactTopic(topic);
    return {
      topic: topic,
      topicShort: topicShort,
      titleTopic: sentenceCase(topic),
      product: product,
      products: products,
      productsText: listText(products, "Oracle services"),
      audience: audience,
      verb: verb,
      module: moduleSuggestion(products, topic)
    };
  }

  function exampleFields(prompt) {
    var data = profile(prompt);
    var topicTitle = titleCase(data.topicShort);
    var title = compactText(titleCase(data.verb + " " + data.topicShort + (productAlreadyInTopic(data.topicShort, data.product) ? "" : " with " + data.product)), 96);
    var shortDescription = boundSentence(
      titleCase(data.verb) + " " + topicTitle + " with " + data.productsText + " through a guided LiveLabs workflow that covers setup, implementation, validation, and handoff.",
      400
    );
    var longDescription = boundSentence(
      "Participants complete a guided implementation for " + topicTitle + " using " + data.productsText + ". The workshop prepares the required environment, walks through the core implementation tasks, validates the result, and captures the WMS-ready details reviewers need. It follows the LiveLabs authoring flow with clear prerequisites, copy-ready steps, concise checks, and a practical completion path.",
      4000
    );
    var trainingObjectives = [
      "Explain the learner problem and the Oracle services used in the solution.",
      titleCase(data.verb) + " the core " + topicTitle + " workflow with guided hands-on steps.",
      "Validate the result and identify the operational checks needed before publishing."
    ].join(" ");

    return [
      {
        label: "Workshop Title",
        value: title
      },
      {
        label: "Short Description (max 400 characters)",
        value: shortDescription
      },
      {
        label: "Long Description (max 4000 characters)",
        value: longDescription
      },
      {
        label: "Workshop Abstract",
        value: [
          "Workshop Elevator Pitch/Messaging: " + topicTitle + " gives " + data.audience + " a practical way to " + data.verb + " a working solution with " + data.product + " instead of stopping at concepts or slides.",
          "",
          "Workshop Description: " + longDescription,
          "",
          "Why is this workshop needed? Teams need a repeatable hands-on path for " + topicTitle + " that connects the business outcome, Oracle service setup, implementation work, and validation checks in one reviewer-ready flow.",
          "",
          "What products/technologies are used? " + data.productsText + ".",
          "",
          "Is there a primary Oracle product/technology being showcased? If so, what is it? " + data.product + ".",
          "",
          "For OSPA Workshops Only:",
          "What are the training objectives? " + trainingObjectives,
          "What module will this exist in? " + data.module + "."
        ].join("\n")
      },
      {
        label: "Workshop Outline",
        value: [
          "Define the scenario and learner outcome: Understand the problem, the target audience, and where " + data.product + " fits.",
          "",
          "Prepare the environment: Confirm required accounts, access, sample data, repositories, and service configuration.",
          "",
          titleCase(data.verb) + " the core workflow: Complete the main " + topicTitle + " implementation with guided, copy-ready steps.",
          "",
          "Validate and troubleshoot: Run checks that prove the solution works and capture common fixes.",
          "",
          "Prepare for WMS review: Record prerequisites, tags, expected results, QA notes, and publishing handoff details."
        ].join("\n")
      },
      {
        label: "Workshop Prerequisites",
        value: [
          "Access to the Oracle environment required for " + data.productsText + ".",
          "",
          "An Oracle Login.",
          "",
          "Basic familiarity with cloud service terminology is helpful.",
          "",
          "Basic command-line, SQL, JSON, or application-development experience may help depending on the final lab steps."
        ].join("\n")
      },
      {
        label: "Notes and Additional Info",
        value: [
          "Estimated duration: 60 to 90 minutes unless the final lab plan requires more setup time.",
          "",
          "Recommended level: Beginner to intermediate, adjusted after the lab tasks are finalized.",
          "",
          "Reviewer note: Confirm access, product tags, owner group, and screenshots after the workshop markdown is drafted."
        ].join("\n"),
        optional: true
      }
    ];
  }

  function outlineOnly(prompt) {
    var data = profile(prompt);
    return [
      "# " + data.titleTopic,
      "",
      "## Workshop intent",
      "",
      "- **Learner outcome:** " + sentenceCase(data.audience + " can " + data.verb + " the target solution with " + data.product + "."),
      "- **Audience:** " + sentenceCase(data.audience) + ".",
      "- **Estimated workshop time:** 60 to 90 minutes.",
      "- **Suggested lab count:** 3 to 4 labs.",
      "",
      "## Proposed lab outline",
      "",
      "1. **Introduction and setup**",
      "   - Explain the scenario, prerequisites, and expected result.",
      "   - Confirm account, repository, and tool access.",
      "2. **Build the core workflow**",
      "   - Implement the main " + data.product + " task in small validated steps.",
      "   - Add copy-ready commands, screenshots, and checks close to the actions.",
      "3. **Add workshop polish**",
      "   - Add tables, callouts, images, quizzes, or FreeSQL blocks only where they help learning.",
      "   - Verify accessibility, links, image paths, and code-copy behavior.",
      "4. **Validate and hand off**",
      "   - Run preview with `?qa=true`.",
      "   - Update WMS fields and prepare Self Quality Assurance notes.",
      "",
      "## WMS fields to draft next",
      "",
      "- Workshop title",
      "- Short and long description",
      "- Workshop outline",
      "- Prerequisites",
      "- Required tags",
      "- Owner group, stakeholder, and council"
    ].join("\n");
  }

  function generateSnippet(id, prompt) {
    var entry = snippetCatalog.find(function (item) {
      return item.id === id;
    }) || snippetCatalog[0];
    var body = entry.id === "outline-support" ? outlineOnly(prompt) : entry.body;
    return {
      id: entry.id,
      label: entry.label,
      group: entry.group,
      summary: entry.summary,
      source: entry.source,
      requiresPrompt: !!entry.requiresPrompt,
      body: body
    };
  }

  function generateMarkdown(prompt, type) {
    return generateSnippet(type || "livelabs-lab-shell", prompt).body;
  }

  function generateExamples(prompt) {
    return {
      fields: exampleFields(prompt)
    };
  }

  window.AuthorGuideWorkshopGenerator = {
    getSnippetCatalog: function () {
      return snippetCatalog.slice();
    },
    generateExamples: generateExamples,
    generateMarkdown: generateMarkdown,
    generateSnippet: generateSnippet
  };
}());
