// Structured source content for the redesigned guide.
// Keep Guided Path and Toolkit content here; the Step by Step Guide now comes from the flat author-guide manifest.
window.authorGuideContent = (function () {
  var canonicalRoot = "https://oracle-livelabs.github.io/common/sample-livelabs-templates/create-labs/labs/workshops/livelabs/?lab=";
  var officialLinks = {
    github: "https://github.com/",
    githubDesktop: "https://desktop.github.com/",
    vscode: "https://code.visualstudio.com/download",
    liveServer: "https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer",
    oracleRepos: "https://github.com/orgs/oracle-livelabs/repositories",
    sampleWorkshop: "https://github.com/oracle-livelabs/common/tree/main/sample-livelabs-templates/sample-workshop",
    validatorBash: "https://raw.githubusercontent.com/oracle-livelabs/common/main/md-validator/.github/scripts/validate-livelabs-markdown.sh",
    validatorPowerShell: "https://raw.githubusercontent.com/oracle-livelabs/common/main/md-validator/.github/scripts/validate-livelabs-markdown.ps1",
    secureDesktopAccess: "https://oracle-livelabs.github.io/common/labs/testing-access/workshops/desktop/index.html?lab=livelabs-sandbox",
    secureDesktopDocs: "https://oracle-livelabs.github.io/common/support/securedesktops/index.html",
    secureDesktopStart: "https://oracle-livelabs.github.io/common/support/securedesktops/index.html?lab=securedesktops",
    liveLabsAuthorsSlack: "https://oracle.enterprise.slack.com/archives/CTUPZQ5HA",
    freesql: "https://freesql.com/",
    sprintsRepo: "https://github.com/oracle-livelabs/sprints",
    sampleSprints: "https://github.com/oracle-livelabs/common/tree/main/sample-livelabs-templates/sample-sprints",
    aiHubGuide: "https://lfoinding.github.io/livelabs-ai-playground/skills/how-to/workshops/sandbox/index.html",
    aiHubRepo: "https://github.com/lfoinding/livelabs-ai-playground",
    aiHubSkills: "https://github.com/lfoinding/livelabs-ai-playground/tree/main/LiveLabs-AI-Developer"
  };

  function labLink(labId) {
    return canonicalRoot + labId;
  }

  function exampleField(label, value, guidance) {
    return {
      label: label,
      value: value,
      guidance: guidance
    };
  }

  function resourceLink(label, href, note) {
    return {
      label: label,
      href: href,
      note: note
    };
  }

  function milestone(label, detail) {
    return {
      label: label,
      detail: detail
    };
  }

  return {
    stepMeta: [
      {
        id: "step-1",
        title: "Submit Workshop Request",
        guideTarget: "1-labs-wms",
        summary: "Start in WMS, fill the reviewer-facing request fields with real detail, and understand the approval to Quality Assurance status flow before development begins.",
        keywords: ["wms", "workshop request", "stakeholder", "council", "tags", "approved", "self Quality Assurance", "quarterly Quality Assurance"]
      },
      {
        id: "step-2",
        title: "Create Workshop",
        guideTarget: "2-labs-github",
        summary: "Choose NoDoc as the recommended default authoring path or use the existing GitHub process when direct source control is needed.",
        keywords: ["nodoc", "no doc", "authoring path", "source workflow", "github process", "preview", "manifest"]
      },
      {
        id: "step-3",
        title: "Review and Publish",
        guideTarget: "5-labs-qa-checks",
        summary: "Complete Self Quality Assurance in the right order, fix pull request check failures by class, create the pull request with the WMS ID, and request publishing with production URLs.",
        keywords: ["self Quality Assurance", "quarterly Quality Assurance", "validator", "pull request", "publish", "production", "wms id"]
      }
    ],

    explorerItems: [
      {
        id: "wms-request",
        title: "WMS Request",
        short: "Submit the WMS request, set tags, pass council review, and manage the workshop through publishing.",
        accent: "red",
        tags: ["wms"],
        description: "Use this card to submit and manage a WMS request from review through publishing and Quarterly Quality Assurance.",
        steps: [
          "Connect to Corporate VPN, open WMS, and select Submit a New Workshop Request.",
          "Complete the basic information: stakeholder, council, owner group, abstract, outline, and prerequisites.",
          "Set the Level, Role, Focus Area, and Product tags before creating the request.",
          "Wait for council review after submission. Council review normally takes 2 to 3 business days; if nothing changes after 3 business days, use Message the Team or find council contacts under People & Role Reports > Workshop Council Members.",
          "After approval, move to In Development when GitHub authoring begins, then to Self Quality Assurance when testing is ready.",
          "Save the Self Quality Assurance Checklist before moving to Self Quality Assurance Complete. Stakeholders then verify the workshop for publishing.",
          "Add Go to Market - Social details early when publishing needs blog, social, video, or image assets.",
          "Use the same record for Quarterly Quality Assurance after publishing. Missing it can disable the production entry."
        ],
        checkpoints: [
          "The request clearly states the learner outcome and ownership.",
          "Level, Role, Focus Area, and Product tags are complete.",
          "Special requirements, such as media, Marketplace images, secure desktop, or sandboxes, are listed.",
          "The WMS status reflects the actual work stage."
        ],
        watchFor: [
          "Starting major repository work before council approval.",
          "Submitting vague abstracts, outlines, or prerequisites.",
          "Changing status before the checklist is saved.",
          "Treating Self Quality Assurance, publishing, and Quarterly Quality Assurance as separate records."
        ],
        exampleTitle: "Prompt-ready WMS examples",
        exampleIntro: "Use these fields as a baseline, or generate prompt-driven examples from the Quickstart WMS Platform panel.",
        exampleFields: [
          exampleField("Workshop Title", "Build and publish an Oracle LiveLabs workshop from WMS to GitHub Pages", "Lead with the learner outcome, not only the product name."),
          exampleField("Workshop Abstract", "Authors learn how to request a workshop in WMS, prepare GitHub Desktop and Visual Studio Code, build from the LiveLabs sample structure, complete Self Quality Assurance, and request publishing.", "A reviewer should understand the end-to-end goal after two or three sentences."),
          exampleField("Workshop Outline", "Outline the build flow in order.\nSubmit and track the WMS request.\nSet up GitHub and preview tooling.\nBuild the workshop structure and labs.\nRun Self Quality Assurance, fix pull request issues, and publish.", "Keep the outline in the same order the work will really happen."),
          exampleField("Workshop Prerequisites", "Oracle VPN access, GitHub account tied to @oracle.com, GitHub Desktop, Visual Studio Code, Live Server, and permission to work in the target oracle-livelabs repository.", "If a prerequisite can block setup or review later, surface it here."),
          exampleField("Stakeholder / Council / Owner Group", "Choose the named stakeholder who will verify the workshop, the council aligned to the production repository, and the team that will maintain the workshop after publish.", "Do not leave these on temporary contributors or generic defaults."),
          exampleField("Required Tags", "Use the actual WMS tags for the workshop.\nLevel = Beginner\nRole = Developer\nFocus Area = the main solution area\nProduct = the Oracle service being taught.", "Tags are required routing and discovery metadata.")
        ],
        milestonesTitle: "Status flow",
        milestonesIntro: "Use this status flow as the process map. The same WMS record stays with the workshop from initial submission through development, Quality Assurance, publishing, and later maintenance.",
        milestones: [
          milestone("Submitted", "Council review starts here."),
          milestone("More Info Needed", "Answer council questions in WMS and improve the request until the use case is clear."),
          milestone("Approved", "Begin heavier GitHub work only after the initial review gate clears."),
          milestone("In Development", "Move here when real GitHub authoring starts and the preview path exists."),
          milestone("Self Quality Assurance to Self Quality Assurance Complete", "Run the checklist, save it, and certify the handoff only after the workshop is stable."),
          milestone("Completed", "Stakeholders have verified the workshop and it is ready for publish handling."),
          milestone("Quarterly Quality Assurance", "Published workshops cycle back into Quality Assurance later, and missed Quality Assurance can disable the entry.")
        ],
        image: {
          src: "../content/author-guide/1-labs-wms/images/submit_workshop.png",
          alt: "Submit new workshop request page in WMS",
          caption: "The reviewer-facing request page is where the workshop scope and ownership are established."
        },
        sourceHref: labLink("1-labs-wms"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "start-here"
      },
      {
        id: "github-setup",
        title: "GitHub Setup",
        short: "Set up your Oracle-linked GitHub account, GitHub Desktop, VS Code, and Live Server.",
        accent: "ocean",
        tags: ["github"],
        description: "Use this card to set up the tools required for first-time authoring.",
        steps: [
          "Create or confirm one GitHub account linked to your Oracle email. Add your name, photo, and username before requesting access.",
          "Enable two-factor authentication in GitHub Security and make sure you are not using a secondary personal account for LiveLabs work.",
          "Install GitHub Desktop and sign in with the same account you will use to fork and clone.",
          "Install VS Code and Live Server before editing markdown.",
          "Set Markdown indentation to tabs, size 4. Install markdownlint, Code Spell Checker, Delete Trailing Spaces, and Path Intellisense."
        ],
        checkpoints: [
          "GitHub profile, username, and 2FA are complete on the Oracle-linked account.",
          "GitHub Desktop is signed in and ready to clone or open repositories.",
          "VS Code has Live Server and Markdown indentation set to 4."
        ],
        watchFor: [
          "Creating or using a second GitHub account instead of the Oracle-linked one.",
          "Discovering a GitHub Desktop sign-in issue when you fork, clone, or push.",
          "Setting up the editor after creating malformed lists or code blocks."
        ],
        resourcesTitle: "Official downloads",
        resourcesIntro: "Use the official tool pages so the setup matches what the guide expects.",
        resourceLinks: [
          resourceLink("GitHub account", officialLinks.github, "Create or confirm the account that uses your @oracle.com email."),
          resourceLink("GitHub Desktop", officialLinks.githubDesktop, "Install the desktop client before you try to clone or push."),
          resourceLink("Visual Studio Code", officialLinks.vscode, "Use Visual Studio Code for markdown, manifests, and file structure work."),
          resourceLink("Live Server", officialLinks.liveServer, "Install the extension before you start authoring so local preview is available.")
        ],
        snippetMeta: "Minimum toolchain",
        snippetTitle: "Install and configure these before authoring",
        snippet: [
          "GitHub account",
          "- Use your @oracle.com email",
          "- Set Name, username, and profile photo",
          "- Enable two-factor authentication",
          "",
          "Desktop tools",
          "- GitHub Desktop",
          "- Visual Studio Code",
          "- Live Server",
          "",
          "Visual Studio Code setup",
          "- Markdown indentation -> tabs, size 4",
          "- markdownlint",
          "- Code Spell Checker",
          "- Delete Trailing Spaces",
          "- Path Intellisense"
        ].join("\n"),
        image: {
          src: "../content/author-guide/2-labs-github/images/git-hub-desktop-login-screen.png",
          alt: "GitHub Desktop sign-in screen",
          caption: "GitHub Desktop is the main fork, clone, commit, and pull request surface used throughout the guide."
        },
        sourceHref: labLink("2-labs-github"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "sync-preview",
        title: "Sync & Preview",
        short: "Fork, clone, sync upstream, copy the sample structure, and publish a preview.",
        accent: "ocean",
        tags: ["github"],
        description: "Use this card to keep your repositories synced and create a working GitHub Pages preview.",
        steps: [
          "After approval, fork the target and common repositories.",
          "Clone your fork in GitHub Desktop and connect it to upstream/oracle-livelabs.",
          "Before editing, fetch origin and merge upstream/main into main.",
          "Push after merging to keep your fork aligned.",
          "Copy the sample-workshop structure, use lowercase names, and verify manifest.json before committing.",
          "Enable GitHub Pages from main and verify the preview URL."
        ],
        checkpoints: [
          "Your clone tracks your fork and upstream/main.",
          "Both the target repository and common are available locally when you need sample templates or shared assets.",
          "GitHub Pages publishes the workshop path you will share."
        ],
        watchFor: [
          "Opening a pull request from stale content.",
          "Working in production or forgetting to fork common.",
          "Finding path, case, or Pages issues late in review."
        ],
        resourcesTitle: "Core references",
        resourcesIntro: "These are the two references most authors need before they fork, clone, and copy the sample structure.",
        resourceLinks: [
          resourceLink("Oracle LiveLabs repositories", officialLinks.oracleRepos, "Choose the product repository that will own the workshop in production."),
          resourceLink("Sample workshop template", officialLinks.sampleWorkshop, "Copy the canonical sample structure instead of improvising a new one.")
        ],
        snippetMeta: "repository sync",
        snippetTitle: "Daily sync commands and preview pattern",
        snippet: [
          "git config --global core.longpaths true",
          "git config --global core.ignorecase false",
          "",
          "git remote -v",
          "git fetch upstream",
          "git merge upstream/main -m \"Sync with main\"",
          "git push origin main",
          "",
          "Preview URL",
          "https://<user>.github.io/<repository>/<path>/workshops/<variant>/index.html"
        ].join("\n"),
        image: {
          src: "../content/author-guide/3-labs-sync-github/images/sample-workshop-structure.png",
          alt: "Sample workshop structure in Visual Studio Code",
          caption: "The sample structure is the cleanest baseline for new authoring work."
        },
        sourceHref: labLink("3-labs-sync-github"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "markdown-structure",
        title: "Markdown Structure",
        short: "Build a valid workshop structure with sample labs, manifests, shared content, and LintChecker.",
        accent: "pine",
        tags: ["markdown"],
        description: "Use this card to create a workshop structure that renders and validates cleanly.",
        steps: [
          "Create the workshop folder and copy the sample labs and workshops folder.",
          "Rename each lab folder and markdown file together. Remove unused files folders and keep images in each lab's images folder.",
          "Copy the introduction folder when needed. Add a README only when the variant requires one.",
          "Update each manifest with the correct title, help address, tutorial order, and variant settings.",
          "Remove unused include or variables entries. Link shared labs and images with absolute URLs.",
          "Meet the validator rules: one H1, required sections, task headers, acknowledgements, lowercase names, and ?qa=true preview."
        ],
        checkpoints: [
          "Sample folders are renamed and manifest.json has no stale entries.",
          "Each lab has an images folder; unused files folders are removed.",
          "?qa=true preview shows the correct order, structure, and help address."
        ],
        watchFor: [
          "Using an old workshop instead of the canonical template.",
          "Leaving unused include or variables entries.",
          "Using relative common links or mixed-case filenames."
        ],
        snippetMeta: "Standard lab contract",
        snippetTitle: "Workshop skeleton and manifest baseline",
        snippet: [
          "sample-workshop/",
          "  introduction/",
          "  my-lab/",
          "    images/",
          "    my-lab.md",
          "  workshops/",
          "    tenancy/",
          "      index.html",
          "      manifest.json",
          "",
          "manifest.json essentials",
          "\"workshoptitle\": \"My Workshop Title\",",
          "\"help\": \"my-team@oracle.com\",",
          "\"tutorials\": [ ... ]",
          "\"variables\": [\"../../variables/variables.json\"]  // only if needed",
          "",
          "Preview",
          "index.html?qa=true"
        ].join("\n"),
        image: {
          src: "../content/author-guide/4-labs-markdown-develop-content/images/lintchecker.png",
          alt: "LintChecker enabled in preview with qa=true",
          caption: "Add ?qa=true while previewing so structural issues surface before pull request review."
        },
        sourceHref: labLink("4-labs-markdown-develop-content"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "links-paths",
        title: "Links and Paths",
        short: "Use case-correct paths, Markdown links, and shared URLs that work locally and on GitHub Pages.",
        accent: "sienna",
        tags: ["markdown"],
        description: "Use this card when links work locally but fail in preview or production.",
        steps: [
          "Use lowercase file and folder names, and match their exact case in links.",
          "Use Markdown links unless the guide requires special markup.",
          "Link shared labs and assets with approved absolute common URLs.",
          "Check links in Live Server and your github.io preview."
        ],
        checkpoints: [
          "Links work locally and on GitHub Pages.",
          "Shared content uses canonical common URLs.",
          "Standard links use Markdown."
        ],
        watchFor: [
          "Case-only renames that fail on GitHub Pages.",
          "Local paths for shared common content.",
          "Assuming local preview proves the production path."
        ],
        snippetMeta: "Path-safe examples",
        snippetTitle: "Use Markdown links and case-correct paths",
        snippet: [
          "[Open the next lab](./../../my-lab/my-lab.md)",
          "[Open GitHub Desktop](https://desktop.github.com/)",
          "",
          "Rule:",
          "The path and filename case must match what is on disk exactly."
        ].join("\n"),
        image: {
          src: "../content/author-guide/4-labs-markdown-develop-content/images/case-sensitive.png",
          alt: "Case-sensitive image and path reminder",
          caption: "GitHub Pages is case-sensitive even when a local machine is not."
        },
        sourceHref: labLink("4-labs-markdown-develop-content"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "image-references",
        title: "Image References",
        short: "Store images correctly, use shared URLs when needed, and write useful alt text.",
        accent: "ocean",
        tags: ["media", "markdown"],
        description: "Use this card to reference images correctly in Markdown.",
        steps: [
          "Store workshop images in the current lab's images folder unless they are shared from common.",
          "Write alt text that explains what the image shows or proves.",
          "Use approved absolute URLs for shared common images.",
          "Confirm images load in your GitHub Pages preview."
        ],
        checkpoints: [
          "Every image has descriptive alt text.",
          "The same images load locally and on github.io.",
          "Shared images use canonical common URLs."
        ],
        watchFor: [
          "Storing screenshots outside the images folder.",
          "Vague alt text, such as image1 or screenshot.",
          "Mixed-case or incomplete image paths."
        ],
        snippetMeta: "Image example",
        snippetTitle: "Shared image plus alt text pattern",
        snippet: [
          "![Console home page](https://oracle-livelabs.github.io/common/images/console/home-page.png \" \")",
          "",
          "Rule:",
          "Use alt text that tells the learner what the image proves or what UI they should recognize."
        ].join("\n"),
        sourceHref: labLink("4-labs-markdown-develop-content"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "copy-sql",
        title: "Copy Tags and SQL Blocks",
        short: "Make commands and SQL easy to copy with the LiveLabs copy button.",
        accent: "pine",
        tags: ["markdown"],
        description: "Use this card when learners must copy commands or SQL from the guide.",
        steps: [
          "Wrap copyable commands in <copy> tags.",
          "Use sql or plsql fenced blocks inside <copy> tags for multiline SQL.",
          "Place each copy block beside its step.",
          "Preview and test the copy button."
        ],
        checkpoints: [
          "Copy buttons appear where needed.",
          "SQL preserves line breaks and execution order.",
          "Each copy block supports its nearby step."
        ],
        watchFor: [
          "Plain blocks where learners must paste content.",
          "Unrelated commands in one copy block.",
          "Untested copy behavior."
        ],
        snippetMeta: "Copy-ready SQL",
        snippetTitle: "Wrap SQL inside copy tags",
        snippet: [
          "```sql",
          "<copy>",
          "SELECT * FROM employees;",
          "SELECT * FROM departments;",
          "</copy>",
          "```"
        ].join("\n"),
        sourceHref: labLink("4-labs-markdown-develop-content"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "reuse-variables",
        title: "Reuse & Variables",
        short: "Reuse common labs, variables, and conditional content without duplicating pages.",
        accent: "pine",
        tags: ["markdown"],
        description: "Use this card for shared content or variant-specific sections.",
        steps: [
          "Reference stable common labs with absolute manifest URLs.",
          "Add manifest variables only for values reused across variants.",
          "Use conditional blocks for multiple delivery types.",
          "Preview every conditional branch."
        ],
        checkpoints: [
          "Variables serve a real reuse case.",
          "Conditional branches are easy to follow.",
          "Tutorial order works when a branch is hidden."
        ],
        watchFor: [
          "Copying canonical shared content.",
          "Overly complex conditional logic.",
          "Testing only one delivery type."
        ],
        snippetMeta: "Variant pattern",
        snippetTitle: "Manifest variables plus conditional content",
        snippet: [
          "\"variables\": [",
          "  \"../../variables/variables.json\",",
          "  \"../../variables/variables-in-another-file.json\"",
          "]",
          "",
          "<if type=\"livelabs\">",
          "Use the LiveLabs environment instructions here.",
          "</if>"
        ].join("\n"),
        image: {
          src: "../content/author-guide/4-labs-markdown-develop-content/images/conditional-vsc1.png",
          alt: "Conditional formatting example in Visual Studio Code",
          caption: "Conditional content should stay obvious enough that another author can follow it."
        },
        sourceHref: labLink("4-labs-markdown-develop-content"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "quiz-blocks",
        title: "LiveLabs Quizzes",
        short: "Add focused quizzes, optional scoring, and badges where they reinforce a task.",
        accent: "sienna",
        tags: ["interactive"],
        description: "Use this card when a quiz helps learners confirm a completed task.",
        steps: [
          "Add the quiz immediately after the task it checks.",
          "Use `Q:` for a question, `*` for correct answers, `-` for wrong answers, and `>` for the explanation.",
          "Use `quiz score` and `quiz-config` only when scoring or a badge adds value.",
          "Preview answer states, scoring, and badge paths."
        ],
        checkpoints: [
          "The quiz follows the related instructions.",
          "Scoring or badges add learner value.",
          "Preview shows correct answer marking."
        ],
        watchFor: [
          "Quizzes that slow the flow.",
          "Missing explanations for teaching questions.",
          "Badge assets or config paths outside images."
        ],
        snippetMeta: "Quiz starter",
        snippetTitle: "Quiz block with scoring and badge config",
        snippet: [
          "```quiz score",
          "Q: What is the maximum image width allowed in LiveLabs workshops?",
          "* 1280 pixels",
          "- 1600 pixels",
          "- 1920 pixels",
          "> pull request checks block images over 1280px in either dimension.",
          "```",
          "",
          "```quiz-config",
          "passing: 80",
          "badge: images/badge.png",
          "```"
        ].join("\n"),
        image: {
          src: "../content/author-guide/quiz/images/quizconfig.png",
          alt: "Quiz configuration example",
          caption: "Use quiz-config only when scoring or badges are really part of the learning flow."
        },
        sourceHref: labLink("quiz"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "freesql-embed",
        title: "FreeSQL Embed",
        short: "Generate a FreeSQL embed, place it beside the task, and validate it in preview.",
        accent: "pine",
        tags: ["freesql", "interactive"],
        description: "Use this card when inline SQL improves the learner's task flow.",
        steps: [
          "Prepare the SQL or PL/SQL and generate the FreeSQL embed.",
          "Place the embed in the task that needs it, beside its instructions.",
          "Preview the lab and check that the editor loads, fits, and supports the task.",
          "Use a copy block instead if it is clearer."
        ],
        checkpoints: [
          "The embed serves one task or concept.",
          "Preview shows the editor where learners expect it.",
          "Instructions remain clear."
        ],
        watchFor: [
          "Using an embed when a code block is clearer.",
          "Separating the embed from its instructions.",
          "Changing iframe behavior without validating it."
        ],
        snippetMeta: "Placement rule",
        snippetTitle: "Keep the embed close to the task",
        snippet: [
          "1. Generate the embed snippet in FreeSQL",
          "2. Paste it into the task that needs SQL execution",
          "3. Keep the instructions directly above or below it",
          "4. Preview the rendered lab before review"
        ].join("\n"),
        sourceHref: labLink("freesqlembed"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "freesql-tutorial-publishing",
        title: "FreeSQL Tutorial Publishing",
        short: "Create a FreeSQL tutorial, map modules to tasks, then publish its Run on FreeSQL link in WMS.",
        accent: "pine",
        tags: ["freesql", "publishing"],
        updatedAt: "2026-01-01",
        description: "Use this card when learners should run SQL or PL/SQL in FreeSQL.",
        steps: [
          "Sign in to FreeSQL and create a tutorial or script from My Content.",
          "Match the tutorial title, description, and tags to WMS.",
          "Add an introduction module and one module per task.",
          "Review, edit, and reorder modules to match the workshop flow.",
          "Share the tutorial, add its link to WMS Publishing > Run on FreeSQL URL, and enable Run on FreeSQL.",
          "Orange-button content lives in FreeSQL; brown and green buttons use GitHub Markdown."
        ],
        checkpoints: [
          "Tutorial content matches the WMS outcome.",
          "Modules match task order.",
          "WMS has the FreeSQL URL and Run on FreeSQL enabled."
        ],
        watchFor: [
          "Expecting GitHub Markdown to update the orange-button tutorial.",
          "Using a script when learners need modules.",
          "Publishing before the shared tutorial works."
        ],
        resourcesTitle: "FreeSQL entry point",
        resourcesIntro: "Use the FreeSQL site for the tutorial and WMS for the public LiveLabs button.",
        resourceLinks: [
          resourceLink("Oracle FreeSQL", officialLinks.freesql, "Create and edit the tutorial or script."),
          resourceLink("Oracle LiveLabs GitHub repositories", officialLinks.oracleRepos, "Use GitHub for brown and green button instructions.")
        ],
        snippetMeta: "Orange button handoff",
        snippetTitle: "FreeSQL publishing checklist",
        snippet: [
          "1. Create tutorial or script in FreeSQL",
          "2. Add modules for introduction and tasks",
          "3. Test in the FreeSQL worksheet",
          "4. Share and copy the tutorial link",
          "5. Paste into WMS Run on FreeSQL URL",
          "6. Enable Run on FreeSQL",
          "7. Save and verify the orange button"
        ].join("\n"),
        image: {
          src: "../content/author-guide/11-labs-create-freesql/images/add-livesql-url.png",
          alt: "Run on FreeSQL URL field in WMS",
          caption: "WMS turns the FreeSQL share link into the orange Run on FreeSQL entry."
        },
        sourceHref: labLink("11-create-freesql"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "freesql-button-integration",
        title: "FreeSQL Button Integration",
        short: "Add a FreeSQL button, wrap runnable SQL, test locally, and use a tutorial for long code.",
        accent: "pine",
        tags: ["freesql", "markdown"],
        updatedAt: "2026-01-01",
        description: "Use this card to launch a FreeSQL worksheet or tutorial from Markdown.",
        steps: [
          "Place <freesql-button> immediately after the lab title.",
          "Wrap runnable SQL in <freesql> tags.",
          "Tell learners to sign in before running database-changing code.",
          "For URLs over 2048 characters, create a tutorial and use <freesql-button src=\"{tutorial-url}\">.",
          "Preview locally, click Try It Now with FreeSQL, and test end to end."
        ],
        checkpoints: [
          "The button follows the lab title.",
          "Runnable worksheet SQL is inside FreeSQL tags.",
          "The worksheet or tutorial opens with the expected code."
        ],
        watchFor: [
          "Putting long scripts in a worksheet URL.",
          "Failing to test the button locally.",
          "Database-changing code without a sign-in note."
        ],
        snippetMeta: "Markdown pattern",
        snippetTitle: "Worksheet and tutorial button options",
        snippet: [
          "<freesql-button>",
          "",
          "<freesql>",
          "select * from departments;",
          "</freesql>",
          "",
          "<freesql-button src=\"{tutorial-url}\">"
        ].join("\n"),
        sourceHref: labLink("12-freesql-integration"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "screenshots",
        title: "Screenshot Standards",
        short: "Crop to the action, redact safely, keep images at 1280px or less, and remove unused files.",
        accent: "ocean",
        tags: ["media"],
        description: "Use this card for screenshot quality, redaction, size, and cleanup.",
        steps: [
          "Capture only the UI needed for the step.",
          "Keep images at 1280 pixels or less; use PNG for UI and text.",
          "Remove sensitive pixels, cover them with an opaque shape, and flatten before saving.",
          "Run Check Unused Images so each images folder contains only referenced files."
        ],
        checkpoints: [
          "The next UI action is clear.",
          "No usernames, IP addresses, intranet URLs, passwords, or OCIDs are exposed.",
          "Each image is in an images folder and has Markdown alt text."
        ],
        watchFor: [
          "Oversized screenshots that fail pull request validation.",
          "Translucent or unflattened redaction.",
          "Stale screenshots after changing steps."
        ],
        snippetMeta: "Capture checklist",
        snippetTitle: "Use this quality bar before you commit screenshots",
        snippet: [
          "- Crop to the action, not the whole desktop",
          "- Max 1280px in either dimension",
          "- PNG for UI, JPEG only for photos or gradients",
          "- Redact and flatten",
          "- Keep only referenced files in the images folder"
        ].join("\n"),
        image: {
          src: "../content/author-guide/13-labs-capture-screens-best-practices/images/screen-captures-general-guidelines.png",
          alt: "General screenshot guidelines reference",
          caption: "The screenshot standards page is the authoritative checklist for capture quality and privacy."
        },
        sourceHref: labLink("13-labs-capture-screens-best-practices"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "tools-productivity"
      },
      {
        id: "optishot",
        title: "OptiShot",
        short: "Select the right folder, keep the 1280px limit, and review the summary before rerunning checks.",
        accent: "ocean",
        tags: ["media", "tools"],
        description: "Use this card to resize images or clean up a screenshot-heavy workshop.",
        steps: [
          "Install and launch OptiShot.",
          "Select the workshop or images folder; OptiShot scans subfolders and skips .git.",
          "Use the 1280px default. Run dry-run first to inspect changes.",
          "Review resized, skipped, and optimized files before rerunning checks."
        ],
        checkpoints: [
          "The selected folder contains the images under review.",
          "The maximum dimension is 1280 pixels.",
          "Preview or pull request checks run after processing."
        ],
        watchFor: [
          "Processing the wrong directory.",
          "Changing the 1280px maximum.",
          "Using OptiShot instead of good capture practices."
        ],
        snippetMeta: "Command-line option",
        snippetTitle: "Dry-run the image pass before you overwrite files",
        snippet: [
          "OptiShot.exe C:\\path\\to\\images --dry-run",
          "./OptiShot.app/Contents/MacOS/OptiShot /path/to/images --dry-run",
          "",
          "Useful flag:",
          "-m 1280"
        ].join("\n"),
        image: {
          src: "../content/author-guide/optishot/images/summary.png",
          alt: "OptiShot summary output",
          caption: "The summary tells you which images were resized, skipped, or optimized."
        },
        sourceHref: labLink("optishot"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "tools-productivity"
      },
      {
        id: "fixomat",
        title: "Fixomat",
        short: "Select the workshop root, choose a mode, and review FIXED and MANUAL results.",
        accent: "pine",
        tags: ["tools", "validation"],
        description: "Use this card to clean up Markdown or images before review.",
        steps: [
          "Launch Fixomat and select the workshop root, not a nested lab.",
          "Choose Markdown, images, or combined mode for the reported issue.",
          "Run the scan and read the summary and console output.",
          "Resolve MANUAL findings, then rerun Fixomat or preview before updating the pull request."
        ],
        checkpoints: [
          "The selected mode matches the problem.",
          "You know which changes were automatic.",
          "The workshop is validated after processing."
        ],
        watchFor: [
          "Running Fixomat before content is stable.",
          "Ignoring MANUAL findings.",
          "Skipping preview after bulk changes."
        ],
        snippetMeta: "Output reading",
        snippetTitle: "Interpret the result before you move on",
        snippet: [
          "FIXED  -> change was applied automatically",
          "MANUAL -> human review or edit still required",
          "",
          "Recommended order:",
          "1. Run Fixomat",
          "2. Review MANUAL items",
          "3. Preview again",
          "4. Re-open pull request checks"
        ].join("\n"),
        sourceHref: labLink("fixomat"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "tools-productivity"
      },
      {
        id: "Quality Assurance-checklist",
        title: "Quality Assurance Checklist",
        short: "Share the preview, set WMS status, save the checklist, and certify Self Quality Assurance.",
        accent: "red",
        tags: ["validation", "wms"],
        description: "Use this card to complete Self Quality Assurance or Quarterly Quality Assurance in the correct order.",
        steps: [
          "Share your GitHub Pages preview before changing Quality Assurance status in WMS.",
          "Use In Development while building and Self Quality Assurance when end-to-end testing is ready.",
          "Update WMS title, descriptions, outline, prerequisites, and tags to match the workshop.",
          "Use your github.io preview as the Development URL; use oracle-livelabs as Production URL after merge.",
          "Complete and save the checklist with evidence, pull request, and preview links.",
          "After saving, set and certify Self Quality Assurance Complete or Quarterly Quality Assurance Complete, then wait for verification."
        ],
        checkpoints: [
          "Development URL points to your fork preview and Production URL points to oracle-livelabs only after merge.",
          "Every checklist field, evidence image, pull request link, and github.io link was saved before the status changed.",
          "Stakeholders can review a consistent WMS record, preview URL, and pull request."
        ],
        watchFor: [
          "Changing status before checklist save and triggering the blocking warning.",
          "Leaving outdated descriptions or tags in WMS while the GitHub content has already changed.",
          "Skipping Quarterly Quality Assurance because the workshop is already published."
        ],
        exampleTitle: "Bring this into Self Quality Assurance",
        exampleIntro: "The checklist is easiest to save when these fields are already collected and consistent across WMS, the preview, and the pull request.",
        exampleFields: [
          exampleField("Preview URL", "Your personal github.io workshop link with ?qa=true", "This is the review surface before production exists."),
          exampleField("Pull Request link", "The open pull request that contains the latest workshop changes", "Add it once the pull request exists so reviewers can move between WMS and GitHub easily."),
          exampleField("Development URL", "The personal github.io preview path for the workshop", "Do not replace this with oracle-livelabs until after merge."),
          exampleField("Production URL", "The oracle-livelabs production path after merge", "This is filled or corrected once the workshop is actually in production."),
          exampleField("Metadata", "Updated title, descriptions, outline, prerequisites, and tags in WMS", "The WMS record should match the workshop the stakeholder will open."),
          exampleField("Evidence", "Checklist boxes checked, images uploaded, and certification ready", "Save the checklist before you try to move to Self Quality Assurance Complete or Quarterly Quality Assurance Complete.")
        ],
        milestonesTitle: "Quality Assurance status flow",
        milestonesIntro: "Publishing starts only after the workshop moves through the Quality Assurance and stakeholder handoff states cleanly.",
        milestones: [
          milestone("Self Quality Assurance", "The workshop is stable enough to test end to end."),
          milestone("Self Quality Assurance Complete", "The checklist is saved and certified, and stakeholders are notified."),
          milestone("Completed", "Stakeholders have verified the workshop and it is ready for publishing action."),
          milestone("Quarterly Quality Assurance", "Published workshops cycle back into Quality Assurance later to stay current.")
        ],
        image: {
          src: "../content/author-guide/5-labs-qa-checks/images/self-qa-checklist-1.png",
          alt: "Self Quality Assurance checklist in WMS",
          caption: "The checklist must be fully saved before Self Quality Assurance Complete can succeed."
        },
        sourceHref: labLink("5-labs-qa-checks"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "validation-publish"
      },
      {
        id: "pull request-checks",
        title: "Pull Request Checks",
        short: "Fix image and Markdown validation failures, then run checks locally.",
        accent: "ocean",
        tags: ["validation", "github"],
        description: "Use this card when GitHub Actions blocks a pull request.",
        steps: [
          "Identify the failing workflow: Image Validation or Markdown Validation.",
          "For image failures, use OptiShot to resize PNG, JPG, or JPEG files over 1280px, then rerun checks.",
          "Use the Markdown log to fix the exact file and rule.",
          "Run the validator on the workshop root for faster repair cycles.",
          "On Windows, use the PowerShell validator when Bash is unavailable."
        ],
        checkpoints: [
          "Each failure was fixed by class instead of mixing image cleanup with markdown repair.",
          "Local validator output matches the files and errors shown in the pull request.",
          "Image dimensions, alt text, task headers, and acknowledgements are clean before the next push."
        ],
        watchFor: [
          "Treating any red X as the same problem and editing the wrong files.",
          "Assuming a locally rendered page means the markdown validator will pass.",
          "Leaving the PowerShell validator half-configured because execution policy blocked the script."
        ],
        resourcesTitle: "Validator scripts",
        resourcesIntro: "Use the official validator scripts when you want to test locally before pushing again.",
        resourceLinks: [
          resourceLink("Bash validator script", officialLinks.validatorBash, "Use this on Linux or macOS."),
          resourceLink("PowerShell validator script", officialLinks.validatorPowerShell, "Use this on Windows when Bash is not your normal path.")
        ],
        snippetMeta: "Local validator",
        snippetTitle: "Run the validator locally before the next push",
        snippet: [
          "Bash",
          "curl -O " + officialLinks.validatorBash,
          "chmod +x validate-livelabs-markdown.sh",
          "./validate-livelabs-markdown.sh /path/to/workshop",
          "",
          "PowerShell",
          "Invoke-WebRequest -Uri \"" + officialLinks.validatorPowerShell + "\" -OutFile \"validate-livelabs-markdown.ps1\"",
          "Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process",
          ".\\validate-livelabs-markdown.ps1 C:\\path\\to\\your\\workshop"
        ].join("\n"),
        image: {
          src: "../content/author-guide/prcheck/images/prerror.png",
          alt: "Failed pull request checks on GitHub",
          caption: "Start with the failing workflow name so you fix the real blocker."
        },
        sourceHref: labLink("prcheck"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "validation-publish"
      },
      {
        id: "publish-request",
        title: "Publish Request",
        short: "Create the pull request with its WMS ID, complete Publishing, and provide final URLs.",
        accent: "red",
        tags: ["publishing", "wms"],
        description: "Use this card for the final pull request and WMS publishing handoff.",
        steps: [
          "Create the pull request after Quality Assurance fixes are pushed. Include the WMS ID in its title.",
          "Complete the pull request requirements and Self Quality Assurance checklist.",
          "Ensure the branch is current and conflict-free.",
          "In WMS Publishing, select Publish to LiveLabs, set type and time, and add the oracle-livelabs production URL.",
          "Enable Brown Button or Sprint only when supported, using the correct URL pattern.",
          "Save, track publishing status, and verify production after rollout."
        ],
        checkpoints: [
          "pull request title includes the WMS ID and the branch is not behind main.",
          "Publishing details use oracle-livelabs production URLs instead of personal preview URLs.",
          "Brown Button, Sprint, and video fields are filled only when they apply and use the right pattern."
        ],
        watchFor: [
          "Opening the pull request while the fork is behind main or still contains conflicts.",
          "Using the personal github.io preview link in a production publishing field.",
          "Skipping the Publishing tab because the pull request was already created."
        ],
        milestonesTitle: "Final release flow",
        milestonesIntro: "Keep the production handoff aligned with the real workshop state instead of mixing preview, review, and production URLs.",
        milestones: [
          milestone("pull request opened", "The title includes the WMS ID and the branch is current."),
          milestone("Publish Requested", "The Publishing tab is filled with production metadata and URL patterns."),
          milestone("Publish Approved", "LiveLabs publishers have approved the production handoff."),
          milestone("Production verified", "The oracle-livelabs workshop matches the preview you already reviewed.")
        ],
        snippetMeta: "Review handoff",
        snippetTitle: "pull request and publishing URL patterns",
        snippet: [
          "pull request title",
          "Publish My Workshop Name (WMS 12345)",
          "",
          "Preview URL",
          "https://<github-username>.github.io/<repository-name>/<path>/workshops/<variant>/index.html?qa=true",
          "",
          "Production URL",
          "https://livelabs.oracle.com/cdn/<repository-name>/<path>/workshops/<variant>/",
          "",
          "Brown Button URL",
          "https://livelabs.oracle.com/cdn/<repository-name>/<path>/workshops/tenancy/",
          "",
          "Sprint URL",
          "https://oracle-livelabs.github.io/sprints/<category-folder>/<sprint-folder>/"
        ].join("\n"),
        image: {
          src: "../content/author-guide/6-labs-publish/images/publishing-tab.png",
          alt: "Publishing tab in WMS",
          caption: "The Publishing tab is where the final production metadata is created and approved."
        },
        sourceHref: labLink("6-labs-publish"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "validation-publish"
      },
      {
        id: "review-sla",
        title: "Review SLA",
        short: "Use expected review windows before escalating, and state real deadlines.",
        accent: "pine",
        tags: ["support", "publishing"],
        description: "Use this card for review, Quality Assurance, and publishing timelines.",
        steps: [
          "Plan for 1 business day for pull request review, 2–3 for submission review, 2 for stakeholder Quality Assurance, and 1 for publishing after approval.",
          "Wait through the normal response window before escalating.",
          "State event dates and hard deadlines explicitly."
        ],
        checkpoints: [
          "You know whether the current wait time is still inside the expected SLA window.",
          "Escalations include the WMS ID, preview URL, pull request, and the real deadline.",
          "Timing expectations are grounded in the published workflow instead of guesswork."
        ],
        watchFor: [
          "Escalating without context or before the expected SLA has passed.",
          "Using Slack direct messages to bypass the normal queue for routine work.",
          "Treating every timing question like an emergency with no stated deadline."
        ],
        snippetMeta: "Core checkpoints",
        snippetTitle: "Use these SLA windows before escalating",
        snippet: [
          "GitHub pull request review            -> 1 business day",
          "Workshop submission review -> 2-3 business days",
          "Stakeholder Quality Assurance             -> 2 business days",
          "Workshop publishing        -> 1 business day"
        ].join("\n"),
        sourceHref: labLink("sla"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "validation-publish"
      },
      {
        id: "livelabs-sprints",
        title: "LiveLabs Sprints",
        short: "Build a focused 10–15 minute sprint, open a pull request, and request publishing in WMS.",
        accent: "ocean",
        tags: ["sprints", "github"],
        updatedAt: "2026-01-01",
        description: "Use this card for a short answer to one technical question, not a full workshop.",
        steps: [
          "Check WMS for an existing sprint on the same topic.",
          "Fork and clone oracle-livelabs/sprints, then copy the sample structure into the correct domain.",
          "Rename the folder and Markdown file together, update manifest.json, and use the sprint help address.",
          "Answer one question in 10–15 minutes or less.",
          "Preview, commit, push, open a pull request, and publish a GitHub Pages review site.",
          "Request publishing in WMS and add WMS and LiveLabs IDs to the pull request."
        ],
        checkpoints: [
          "The sprint belongs in the right domain folder, or the Sprints team has approved a new bucket.",
          "The manifest title, description, filename, help address, and related sprint entries are correct.",
          "The pull request and WMS request carry the same sprint identity and IDs."
        ],
        watchFor: [
          "Turning a full workshop into a sprint instead of narrowing the sprint to one question.",
          "Forgetting to merge upstream before work or before the pull request.",
          "Publishing without the WMS ID and LiveLabs ID in the pull request."
        ],
        resourcesTitle: "Sprint source references",
        resourcesIntro: "Use the sprint repository for production content and the sample sprint folder for structure.",
        resourceLinks: [
          resourceLink("oracle-livelabs/sprints", officialLinks.sprintsRepo, "Fork, clone, and open pull requests here."),
          resourceLink("Sample sprint structure", officialLinks.sampleSprints, "Copy this structure before authoring a new sprint.")
        ],
        snippetMeta: "Sprint production URL",
        snippetTitle: "Use this pattern in WMS",
        snippet: [
          "https://oracle-livelabs.github.io/sprints/<domain-folder>/<sprint-folder>/",
          "",
          "Required handoff",
          "- WMS ID",
          "- LiveLabs ID",
          "- Pull request link",
          "- Production URL"
        ].join("\n"),
        image: {
          src: "../content/author-guide/10-labs-create-sprints-workflow/images/sprints-workflow.png",
          alt: "LiveLabs sprint workflow diagram",
          caption: "Sprints use a separate repository and publish request path from full workshops."
        },
        sourceHref: labLink("10-create-sprints-workflow"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "graphical-remote-desktop",
        title: "Graphical Remote Desktop",
        short: "Set the hostname, deploy noVNC, preload URLs, and validate the desktop before image capture.",
        accent: "sienna",
        tags: ["secure-desktop"],
        description: "Use this card when a workshop needs a prepared noVNC desktop image.",
        steps: [
          "Start from an Oracle Enterprise Linux 8 instance that meets Marketplace image requirements.",
          "Configure and preserve a static hostname before installing products that hardcode hostnames, listeners, or domain names.",
          "Run the noVNC setup scripts, accept or set the intended desktop OS user, and test the generated desktop URLs immediately.",
          "Optimize browser settings and preload the workshop guide or application URLs only after noVNC launches correctly.",
          "Create optional systemd services only for products that must already be running when learners open the desktop."
        ],
        checkpoints: [
          "The noVNC URL launches successfully and auto-connects with the intended resize and quality settings.",
          "The desktop opens the workshop guide and any required app URLs without manual learner setup.",
          "Hostname, firstboot, browser, and service settings are validated before custom image capture."
        ],
        watchFor: [
          "Capturing the image before hostname and firstboot behavior are stable.",
          "Adding desktop apps or startup services without testing a fresh provisioned instance.",
          "Using deprecated Oracle Linux versions for new marketplace-ready images."
        ],
        snippetMeta: "Desktop validation",
        snippetTitle: "Minimum noVNC readiness checks",
        snippet: [
          "- Static hostname is preserved on first boot",
          "- noVNC URL launches and reconnects",
          "- Workshop guide URL opens inside the desktop",
          "- Required apps or services start automatically",
          "- Browser settings are optimized before image capture"
        ].join("\n"),
        sourceHref: labLink("6-labs-setup-graphical-remote-desktop"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "custom-image-capture",
        title: "Custom Image Capture",
        short: "Clean and capture the OCI image, test it with ORM, and verify desktop launch before Marketplace work.",
        accent: "sienna",
        tags: ["marketplace", "media"],
        updatedAt: "2026-01-01",
        description: "Use this card to create a reusable OCI image for a sandbox or publication.",
        steps: [
          "If the image needs NoVNC access, check the source warning before you choose OL9. The current guide asks authors to avoid OL9 images for NoVNC while the LiveLabs team investigates compatibility issues.",
          "SSH to the instance outside the remote desktop session and run the LiveLabs cleanup script before capture.",
          "Create the custom image from the OCI Compute instance and set image compatibility details carefully.",
          "Copy the new image OCID and update the sample ORM stack variables with image ID, desktop guide URL, and optional app URLs.",
          "Provision a test instance from the new image and validate the remote desktop URL, browser preload behavior, and workshop guide launch.",
          "Only move toward Marketplace or WMS image registration after the fresh test instance behaves correctly."
        ],
        checkpoints: [
          "The operating system and NoVNC decision match the current LiveLabs guidance before capture starts.",
          "Cleanup ran successfully before image capture.",
          "The new image OCID is recorded and used in a fresh test stack.",
          "The test instance proves the image works after provisioning, not only on the source instance."
        ],
        watchFor: [
          "Using an OL9 image with NoVNC after the warning without LiveLabs team review.",
          "Creating the image before cleanup or browser/noVNC validation.",
          "Testing only the source instance and never testing an instance created from the captured image.",
          "Forgetting to update desktop guide and app URL variables before packaging the ORM stack."
        ],
        snippetMeta: "Image handoff fields",
        snippetTitle: "Record these before moving on",
        snippet: [
          "Image OCID",
          "OEL version",
          "NoVNC decision",
          "desktop_guide_url",
          "desktop_app1_url",
          "desktop_app2_url",
          "novnc_delay_sec",
          "Test stack result",
          "Validated remote desktop URL"
        ].join("\n"),
        sourceHref: labLink("7-labs-create-custom-image-for-marketplace"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "marketplace-image-publish",
        title: "Marketplace Image Publishing",
        short: "Prepare the Marketplace listing, publish the image, and include LiveLabs support details.",
        accent: "sienna",
        tags: ["marketplace", "publishing"],
        updatedAt: "2026-01-01",
        description: "Use this card to publish a tested custom image to Marketplace for LiveLabs.",
        steps: [
          "Confirm the custom image has been tested from a fresh provisioned instance before starting Marketplace publishing.",
          "Prepare required Marketplace listing details, terms of use, support information, and artifact metadata.",
          "Create or update the Marketplace listing with LiveLabs as a visible support link where required.",
          "Publish the listing and wait for the Marketplace flow to complete before registering it in LiveLabs.",
          "Keep listing name, listing OCID, app catalog OCID, image OCID, and version together for the WMS registration step."
        ],
        checkpoints: [
          "The listing points to the correct image and support information.",
          "Listing and app catalog identifiers are captured for the next WMS step.",
          "The image version matches the image that was tested."
        ],
        watchFor: [
          "Publishing an untested image because the source desktop looked correct.",
          "Losing the listing OCID or app catalog OCID before WMS registration.",
          "Treating Marketplace publishing and LiveLabs sandbox image update as the same step."
        ],
        snippetMeta: "Marketplace values",
        snippetTitle: "Capture these values after publish",
        snippet: [
          "Listing Name",
          "Listing OCID",
          "App Catalog OCID",
          "Image OCID",
          "Version",
          "Support contacts"
        ].join("\n"),
        sourceHref: labLink("8-labs-publish-custom-image-to-marketplace"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "wms-custom-image-update",
        title: "WMS Custom Image Update",
        short: "Register a Marketplace listing in WMS, add its image version, and update a sandbox.",
        accent: "red",
        tags: ["marketplace", "wms"],
        updatedAt: "2026-01-01",
        description: "Use this card to attach a published Marketplace image to an existing WMS sandbox.",
        steps: [
          "Open WMS and register the Marketplace listing under Custom Images with listing name, listing OCID, and app catalog OCID.",
          "Add support contacts so the right people can view or edit the image entry later.",
          "Add the image to the registered listing with image OCID, version, database software version when relevant, and the noVNC flag when the image uses remote desktop.",
          "Open the workshop Publishing tab, edit the LiveLab sandbox environment, and select the new image under the Sandbox Environment image list.",
          "Save the update and test the LiveLab again. Self-service updates apply to pre-existing sandbox environments; new sandbox requests still use the publishing request flow."
        ],
        checkpoints: [
          "Listing OCID, app catalog OCID, image OCID, version, and support contacts are all correct.",
          "The noVNC checkbox matches the image behavior.",
          "The updated sandbox launches and uses the intended image after save."
        ],
        watchFor: [
          "Trying to use self-service update for a sandbox environment that does not already exist.",
          "Selecting an image version you have not tested.",
          "Forgetting to retest the LiveLab after saving the image update."
        ],
        snippetMeta: "WMS image update checklist",
        snippetTitle: "Register then attach the image",
        snippet: [
          "1. Register Listing",
          "2. Add support contacts",
          "3. Add Image OCID and Version",
          "4. Mark NoVNC if remote desktop is included",
          "5. Edit Publishing > Sandbox Environment",
          "6. Select the new image",
          "7. Save and retest the LiveLab"
        ].join("\n"),
        sourceHref: labLink("12-add-custom-image-to-workshop"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "livestack-create",
        title: "LiveStack Creation",
        short: "Create an industry-focused LiveStack package, add LiveLabs and assets, then request publishing.",
        accent: "ocean",
        tags: ["livestack", "assets"],
        updatedAt: "2026-07-01",
        description: "Use this card to package a LiveStack Demo, LiveLabs workshops, assets, and supporting material around one outcome.",
        steps: [
          "Open WMS, choose Create a LiveStack, review the landing-page overview, and create the initial LiveStack record.",
          "Use the LiveStack Details page as the working surface for LiveLab entries, assets, ordering, visibility, and publishing status.",
          "Add LiveLab entries by name or ID, then configure Run on Sandbox, Run on Your Tenancy, title, and position when those override fields appear.",
          "Add assets from WMS > Self Services > Assets. Only assets created by you or shared with you appear in the asset picker.",
          "Set asset position and internal or external visibility. Internal assets are visible only to Oracle employees; external assets are visible to all audiences.",
          "When the LiveStack is ready, change status to Publish Requested and save. The LiveStack council provides an update within 2 to 3 business days by email."
        ],
        checkpoints: [
          "The author understands that a LiveStack is the full solution package and a LiveStack Demo is one component inside it.",
          "The LiveStack maps clearly to the Envision, Try, Embed, and Scale journey instead of acting as a loose list of links.",
          "Every LiveLab entry has the intended title, launch options, and order.",
          "Every asset is owned by or shared with the author and has the right internal or external visibility before publication.",
          "The author knows that published LiveStack changes appear in LiveLabs immediately."
        ],
        watchFor: [
          "Confusing a LiveStack Demo with the full LiveStack package.",
          "Trying to add assets before they exist in WMS Self Services > Assets or before they have been shared with you.",
          "Leaving internal briefing material visible to external audiences.",
          "Reordering or editing a published LiveStack without realizing the change is immediate."
        ],
        snippetMeta: "LiveStack build path",
        snippetTitle: "Create, fill, and publish the LiveStack",
        snippet: [
          "LiveStack = full solution package",
          "LiveStack Demo = storytelling component inside the package",
          "",
          "1. WMS > Create a LiveStack",
          "2. Review the overview and complete the initialization form",
          "3. Add LiveLab entries by name or ID",
          "4. Configure launch options, title, and position",
          "5. Add owned or shared assets from Self Services > Assets",
          "6. Set asset order and internal or external visibility",
          "7. Change status to Publish Requested and wait for council email"
        ].join("\n"),
        image: {
          src: "../content/author-guide/15-livestack/images/ls-details.png",
          alt: "LiveStack details page in WMS",
          caption: "The details page is where authors add LiveLabs, assets, order, visibility, and publish status."
        },
        sourceHref: labLink("create-a-livestack"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "wms-assets",
        title: "WMS Asset Manager",
        short: "Upload reusable files or links, share editor access, copy PAR links, and maintain assets.",
        accent: "pine",
        tags: ["assets", "wms"],
        updatedAt: "2026-06-01",
        description: "Use this card to manage reusable workshop, sandbox, tenancy, or LiveStack assets in WMS.",
        steps: [
          "Open WMS, expand Self Services, choose Assets, and click New Asset.",
          "For files, choose Upload a File, pick the file, name it clearly, choose an asset type, and add a description when the name is not enough.",
          "For links, choose Upload a Link, paste the URL, name the asset, choose its type, and describe what the link opens.",
          "Add additional editors as comma-separated email addresses when teammates or stakeholders need the asset in their own asset list.",
          "Use the link icon to open or copy the PAR link that WMS creates for uploaded files.",
          "Overwrite a file asset when the same PAR link should keep working. Create a new asset when you need a new PAR link."
        ],
        checkpoints: [
          "The asset name, type, description, and editor list tell future maintainers what the asset is and who owns it.",
          "Uploaded files have a working PAR link before you use them in a workshop, sandbox, tenancy flow, or LiveStack.",
          "The team knows whether it is overwriting an existing asset or creating a new asset with a new link."
        ],
        watchFor: [
          "Uploading assets with vague names that become unsearchable later.",
          "Creating a new asset when an overwriteable PAR link should stay stable.",
          "Forgetting to add additional editors before handoff."
        ],
        snippetMeta: "Asset manager decisions",
        snippetTitle: "Choose the right asset path",
        snippet: [
          "File asset",
          "- Store in Object Storage",
          "- Use the generated PAR link",
          "- Overwrite to keep the same PAR link",
          "",
          "Link asset",
          "- Store a reusable URL in WMS",
          "- Use a clear name and type",
          "- Add additional editors for handoff",
          "",
          "Common asset types",
          "- Demo",
          "- Link",
          "- Terraform Stack"
        ].join("\n"),
        image: {
          src: "../content/author-guide/17-assets/images/2-new-asset-dialog.png",
          alt: "WMS Asset Details dialog for file or link assets",
          caption: "WMS assets turn reusable files and links into shared, maintainable authoring objects."
        },
        sourceHref: labLink("17-assets"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "secure-desktop-when",
        title: "Secure Desktop: When to Use It",
        short: "Test normal access first; use Secure Desktop only for real restrictions and validate it before the event.",
        accent: "sienna",
        tags: ["secure-desktop"],
        description: "Use this card to decide whether restricted users truly need OCI Secure Desktops.",
        steps: [
          "Assume standard access first, then test with one or two representative participants from the target organization before you request secure desktops.",
          "Ask those participants to open the normal workshop environment from their corporate laptop, then try Secure Desktop only if standard access is blocked.",
          "Run the test at least two days before the event so you still have time to request or adjust the secure desktop flow.",
          "Use secure desktops only when they solve a real access problem such as blocked sites, blocked protocols, or failed noVNC access."
        ],
        checkpoints: [
          "You have evidence that the normal path is blocked before you switch to secure desktops.",
          "A participant can launch the secure desktop and open the LiveLabs workshop from inside it.",
          "Large events are tested early enough that access issues are found before launch day."
        ],
        watchFor: [
          "Turning on secure desktops by default instead of proving the normal path fails first.",
          "Waiting until the event starts to discover corporate browser or firewall restrictions.",
          "Treating one successful test as enough for a 100+ attendee event."
        ],
        resourcesTitle: "Secure desktop references",
        resourcesIntro: "Keep these two pages open during access testing so you do not guess the launch flow.",
        resourceLinks: [
          resourceLink("Test access guide", officialLinks.secureDesktopAccess, "Use this to validate the full end-to-end participant path."),
          resourceLink("OCI Secure Desktop docs", officialLinks.secureDesktopStart, "Use this when you need the participant setup and launch sequence.")
        ],
        snippetMeta: "Decision gate",
        snippetTitle: "Use secure desktop only after this test sequence",
        snippet: [
          "1. Test the normal workshop path first",
          "2. Test with 1-2 representative users",
          "3. Run the test at least 2 days before the event",
          "4. Use secure desktop only if the normal path is blocked",
          "5. For 100+ users, start planning earlier and test more than once"
        ].join("\n"),
        sourceHref: labLink("secure-desktop"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "secure-desktop-request",
        title: "Secure Desktop: Request and Access",
        short: "Request Secure Desktop with complete event details and plan early for large events.",
        accent: "sienna",
        tags: ["secure-desktop", "support"],
        description: "Use this card when Secure Desktop is required and you need request and launch details.",
        steps: [
          "Post the request in the LiveLabs Authors Slack channel and include event name, event date, workshop, participant count, and why standard access is blocked.",
          "If you need 100 or more secure desktops, start coordination 3 to 4 weeks ahead so infrastructure planning is possible.",
          "Tell participants to use Google Chrome, enable pop-ups, and log out of any OCI tenants in that browser before launch.",
          "Send participants the secure desktop access guide and validate the connection end to end before the event starts."
        ],
        checkpoints: [
          "The request includes enough context for the LiveLabs team to provision the right environment.",
          "Participants know the browser, pop-up, and OCI sign-out prerequisites before the session begins.",
          "The secure desktop path is tested before event day."
        ],
        watchFor: [
          "Sending a vague request with no event date, workshop, or participant count.",
          "Assuming Chrome, pop-ups, and OCI sign-out details are optional.",
          "Treating large secure desktop requests like a last-minute setup item."
        ],
        resourcesTitle: "Request and launch references",
        resourcesIntro: "Use the Slack channel for the request, then hand off the documented access steps to participants.",
        resourceLinks: [
          resourceLink("LiveLabs Authors Slack", officialLinks.liveLabsAuthorsSlack, "Post the request here with the full event context."),
          resourceLink("Test access guide", officialLinks.secureDesktopAccess, "Share this with participants for the launch flow."),
          resourceLink("OCI Secure Desktop docs", officialLinks.secureDesktopStart, "Use this when participants or reviewers need the current setup and launch steps.")
        ],
        snippetMeta: "Bring this to the request",
        snippetTitle: "Secure desktop request details",
        snippet: [
          "Event name",
          "Event date",
          "Workshop name",
          "Estimated participant count",
          "Why standard access is blocked",
          "",
          "Participant launch prerequisites",
          "- Google Chrome",
          "- Pop-ups enabled",
          "- Logged out of OCI tenants"
        ].join("\n"),
        sourceHref: labLink("secure-desktop-how-to-request"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "secure-desktop-participant-guide",
        title: "Secure Desktops: Participant Launch Guide",
        short: "Use the participant guide to reserve a workshop, launch Secure Desktop, and resolve common access issues.",
        accent: "sienna",
        tags: ["secure-desktop", "support"],
        updatedAt: "2026-03-01",
        description: "Use this card after Secure Desktop is confirmed. It covers reservation, launch, and first login.",
        steps: [
          "Before starting, use Google Chrome, enable pop-ups, and log out of any OCI tenants in that browser.",
          "Open the assigned LiveLabs workshop, click START, choose Run on LiveLabs Sandbox, and sign in with the Oracle account required by the reservation flow.",
          "In Reserve Workshop, select Start Workshop Now when appropriate, submit the reservation, and check My Reservations. Sandbox provisioning typically takes 10 to 20 minutes.",
          "Launch the workshop and open View Login Info so you have the Secure Desktop tenancy and user details needed for the next step.",
          "Click Launch Secure Desktop. If another OCI session is active, choose Sign in with a different user account, select the Default identity domain when prompted, and set the initial user password.",
          "Choose an available desktop pool, allow the provisioning window to open, and wait for the desktop to become available. If the window does not appear, check the browser pop-up setting and retry the pool.",
          "Inside the desktop, finish the initial Linux setup, open Firefox, and navigate to LiveLabs. Use the Secure Desktop clipboard controls when you need to move text into or out of the remote desktop."
        ],
        checkpoints: [
          "Chrome, pop-ups, and OCI sign-out prerequisites are complete before the reservation starts.",
          "The workshop reservation is visible in My Reservations and reaches an active state before launch.",
          "The participant can open View Login Info, launch the desktop pool, complete first-login password reset, and open LiveLabs from Firefox.",
          "The participant knows how to retry a failed pop-up or desktop-pool launch without creating a second reservation."
        ],
        watchFor: [
          "Starting with a different OCI tenancy still signed in, which can route the launch to the wrong account.",
          "Blocking pop-ups and then treating the missing desktop window as a provisioning failure.",
          "Trying to use the desktop before the sandbox reservation becomes active.",
          "Copying credentials or private workshop data through the clipboard without following the event owner guidance."
        ],
        resourcesTitle: "Participant guide",
        resourcesIntro: "Use the public guide for the complete image-supported launch sequence and troubleshooting notes.",
        resourceLinks: [
          resourceLink("Secure Desktops guide", officialLinks.secureDesktopDocs, "Open the public guide requested for the Cheatsheet."),
          resourceLink("Secure Desktops: Get Started", officialLinks.secureDesktopStart, "Open the current participant steps and task navigation."),
          resourceLink("LiveLabs Secure Desktop access", officialLinks.secureDesktopAccess, "Use the access flow linked from the authoring guide when testing a workshop.")
        ],
        snippetMeta: "Participant launch sequence",
        snippetTitle: "Before you share the launch link",
        snippet: [
          "Browser: Google Chrome",
          "Pop-ups: enabled",
          "OCI tenants: signed out",
          "Reservation: active in My Reservations",
          "Launch: View Login Info -> Launch Secure Desktop",
          "Identity domain: Default when prompted",
          "Desktop: wait for the pool and open LiveLabs in Firefox"
        ].join("\n"),
        sourceHref: officialLinks.secureDesktopStart,
        sourceLabel: "Open Secure Desktops guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "ai-developer-hub",
        title: "AI Developer Hub",
        short: "Use the AI Developer Hub guide, repository, and skills to speed up authoring while following the canonical workflow.",
        accent: "pine",
        tags: ["ai", "tools"],
        description: "Use AI to draft, restructure, or automate authoring tasks. Validate all output against the guide and validator rules.",
        steps: [
          "Start with the AI Developer Hub how-to guide.",
          "Review the repository and skill bundle before creating a new prompt flow.",
          "Use it for focused tasks: draft steps, tighten prose, extract prerequisites, or create a first pass.",
          "Check AI output against the guide, preview the workshop, and run the validator."
        ],
        checkpoints: [
          "Start with the published guide and skill bundle.",
          "Ensure generated steps, commands, and screenshots match the workshop flow.",
          "Review all AI-assisted content before committing."
        ],
        watchFor: [
          "Using AI instead of the canonical guide.",
          "Keeping vague output that does not become usable steps, commands, or evidence.",
          "Committing AI content without previewing or validating it."
        ],
        resourcesTitle: "Hub entry points",
        resourcesIntro: "Start with the guide, then use the repository and skill bundle.",
        resourceLinks: [
          resourceLink("AI Developer Hub guide", officialLinks.aiHubGuide, "Start here."),
          resourceLink("AI Developer Hub repository", officialLinks.aiHubRepo, "Access the source materials."),
          resourceLink("LiveLabs AI Developer skills", officialLinks.aiHubSkills, "Review available skills first.")
        ],
        snippetMeta: "Quick start",
        snippetTitle: "Hub resources",
        snippet: [
          "git clone https://github.com/lfoinding/livelabs-ai-playground.git",
          "",
          "Guide",
          "https://lfoinding.github.io/livelabs-ai-playground/skills/how-to/workshops/sandbox/index.html",
          "",
          "Skill bundle",
          "https://github.com/lfoinding/livelabs-ai-playground/tree/main/LiveLabs-AI-Developer"
        ].join("\n"),
        sourceHref: labLink("15-labs-livelabs-ai-developer-hub"),
        sourceLabel: "Open Step by Step Guide",
        guideTarget: "help-faq"
      }
    ]
  };
}());
