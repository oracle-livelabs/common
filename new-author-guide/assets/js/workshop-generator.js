// Local workshop-generation abstraction for WMS examples, LiveLabs snippets, and outline support.
(function () {
  var fallbackTopic = "Oracle LiveLabs workshop";
  var productHints = [
    "Oracle Database",
    "Oracle Database 23ai",
    "OCI",
    "Oracle Cloud Infrastructure",
    "APEX",
    "FreeSQL",
    "AI",
    "Kubernetes",
    "Analytics"
  ];

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

  function detectProduct(prompt) {
    var lower = prompt.toLowerCase();
    var match = productHints.find(function (hint) {
      return lower.indexOf(hint.toLowerCase()) !== -1;
    });
    return match || "Oracle services";
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

  function profile(prompt) {
    var topic = compactPrompt(prompt);
    var product = detectProduct(topic);
    var audience = detectAudience(topic);
    var verb = actionVerb(topic);
    return {
      topic: topic,
      titleTopic: sentenceCase(topic),
      product: product,
      audience: audience,
      verb: verb
    };
  }

  function exampleFields(prompt) {
    var data = profile(prompt);
    return [
      {
        label: "Workshop Title",
        value: sentenceCase(data.verb + " with " + data.product + ": " + data.topic),
        note: "Lead with the learner outcome and product context."
      },
      {
        label: "Workshop Abstract",
        value: "In this workshop, " + data.audience + " learn how to " + data.verb + " a working solution using " + data.product + ". The flow introduces the use case, prepares the required environment, walks through the core implementation steps, and closes with validation checks authors can reuse before WMS review.",
        note: "Keep this reviewer-facing and concrete."
      },
      {
        label: "Workshop Outline",
        value: [
          "Confirm the scenario, WMS request details, and target learner.",
          "Prepare the required tools, repository path, and environment.",
          "Build the main " + data.product + " workflow in small validated steps.",
          "Run preview, Self Quality Assurance, and publishing readiness checks."
        ].join("\n"),
        note: "Match the real order authors or learners will follow."
      },
      {
        label: "Workshop Prerequisites",
        value: "Oracle VPN access for WMS, a GitHub account tied to @oracle.com, GitHub Desktop, Visual Studio Code, Live Server, and access to any " + data.product + " environment required by the workshop.",
        note: "Surface anything that can block setup, review, or delivery."
      },
      {
        label: "Required Tags",
        value: [
          "Level = Beginner or Intermediate based on the final lab depth.",
          "Role = " + (data.audience === "developers" ? "Developer" : "Administrator / Developer as appropriate") + ".",
          "Focus Area = the primary solution category.",
          "Product = " + data.product + "."
        ].join("\n"),
        note: "Tags drive WMS routing and LiveLabs discovery."
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
