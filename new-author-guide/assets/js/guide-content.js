// Structured source content for the redesigned guide.
// Keep Guided Path and Toolkit content here; the Full Guide now comes from the flat author-guide manifest.
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
    secureDesktopDocs: "https://oracle-livelabs.github.io/common/support/securedesktops/index.html#BeforeyougetStarted",
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
        title: "WMS Platform",
        guideTarget: "1-labs-wms",
        summary: "Start in WMS, fill the reviewer-facing request fields with real detail, and understand the approval to Quality Assurance status flow before development begins.",
        keywords: ["wms", "workshop request", "stakeholder", "council", "tags", "approved", "self Quality Assurance", "quarterly Quality Assurance"]
      },
      {
        id: "step-2",
        title: "Setup environment + Create Workshop",
        guideTarget: "2-labs-github",
        summary: "Set up GitHub Desktop and Visual Studio Code, fork and clone the right repos, copy the sample workshop, and validate preview early.",
        keywords: ["github", "fork", "clone", "upstream", "git config", "github pages", "preview", "manifest"]
      },
      {
        id: "step-3",
        title: "Review & Publish",
        guideTarget: "5-labs-qa-checks",
        summary: "Complete Self Quality Assurance in the right order, fix pull request check failures by class, create the pull request with the WMS ID, and request publishing with production URLs.",
        keywords: ["self Quality Assurance", "quarterly Quality Assurance", "validator", "pull request", "publish", "production", "wms id"]
      }
    ],

    explorerItems: [
      {
        id: "wms-request",
        title: "WMS Request",
        short: "VPN, request form, tags, council review, status flow, social planning, and the WMS gates that control authoring.",
        accent: "red",
        tags: ["workflow", "beginner"],
        description: "Use this card when you need the real WMS process from the source guide: how to submit, what metadata reviewers need, which status comes next, when GitHub work should start, and how the same WMS record carries the workshop through publishing and later Quarterly Quality Assurance.",
        steps: [
          "Connect to Corporate VPN, open Oracle Workshop Management System, and click Submit a New Workshop Request.",
          "Fill Workshop Basic Information completely, including Stakeholder, Workshop Council, Workshop Owner Group, Workshop Abstract, Workshop Outline, and Workshop Prerequisites. Use the field help when you are unsure what a reviewer expects.",
          "Open the Tags tab and set the required Level, Role, Focus Area, and Product tags before you create the record. Tags are discovery and routing metadata, not late cleanup.",
          "Wait for council review after submission. Council review normally takes 2 to 3 business days; if nothing changes after 3 business days, use Message the Team or find council contacts under People & Role Reports > Workshop Council Members.",
          "After approval, move to In Development when real GitHub authoring starts, then Self Quality Assurance when the workshop is stable enough for end-to-end testing.",
          "Complete and save the Self Quality Assurance Checklist before changing to Self Quality Assurance Complete. Stakeholders verify from that state and move the workshop to Completed when it is ready for publishing.",
          "Use Go to Market - Social while the workshop is still early if blog, social, video script, or marketing image details will be needed for publishing.",
          "Return to the same WMS record for Quarterly Quality Assurance after publication. Missed Quarterly Quality Assurance can disable the production entry."
        ],
        checkpoints: [
          "The title, abstract, outline, prerequisites, owner group, stakeholder, and council tell reviewers what the learner will build and who owns the handoff.",
          "Required tags are complete before the record is created: Level, Role, Focus Area, and Product.",
          "The request already calls out unusual build elements such as embedded HTML, special media, Marketplace images, secure desktop, or sandbox dependencies.",
          "The WMS status matches the real work state, not just the next status the author wants."
        ],
        watchFor: [
          "Starting heavy repository work before council review has approved the request.",
          "Leaving abstract, outline, or prerequisites too vague and forcing council follow-up.",
          "Changing status before the checklist is saved.",
          "Forgetting that Self Quality Assurance, stakeholder review, publishing, and Quarterly Quality Assurance all depend on this same WMS record."
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
          src: "./content/author-guide/1-labs-wms/images/submit_workshop.png",
          alt: "Submit new workshop request page in WMS",
          caption: "The reviewer-facing request page is where the workshop scope and ownership are established."
        },
        sourceHref: labLink("1-labs-wms"),
        sourceLabel: "Open Full Guide",
        guideTarget: "start-here"
      },
      {
        id: "github-setup",
        title: "GitHub Setup",
        short: "Oracle email account, GitHub Desktop, Visual Studio Code, Live Server, and authoring-ready settings.",
        accent: "ocean",
        tags: ["workflow", "beginner"],
        description: "Use this card when the blocker is workstation setup. It focuses on the exact tools and UI steps the workshop uses for first-time authoring.",
        steps: [
          "Create or confirm one GitHub account tied to your Oracle email, then finish GitHub Settings with your real name, profile photo, and username before you request repository access.",
          "Enable two-factor authentication in GitHub Security and make sure you are not using a secondary personal account for LiveLabs work.",
          "Install GitHub Desktop, open File > Options > Sign in, and confirm the client is authenticated against the same account you will fork and clone with.",
          "Install Visual Studio Code, then install Live Server from the Extensions view so local preview exists before you start rewriting markdown.",
          "Set Markdown indentation to tabs with size 4, then add the helper extensions you will actually use: markdownlint, Code Spell Checker, Delete Trailing Spaces, and Path Intellisense."
        ],
        checkpoints: [
          "GitHub profile, username, and 2FA are complete on the Oracle-linked account.",
          "GitHub Desktop is signed in and ready to clone or open repositories.",
          "Visual Studio Code has Live Server and Markdown indentation set to 4 before you start nesting steps, images, or code blocks."
        ],
        watchFor: [
          "Creating or using a second GitHub account instead of the Oracle-linked one.",
          "Skipping GitHub Desktop sign-in and discovering the problem at fork, clone, or push time.",
          "Leaving editor setup until after you already created broken nested lists or code blocks."
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
          src: "./content/author-guide/2-labs-github/images/git-hub-desktop-login-screen.png",
          alt: "GitHub Desktop sign-in screen",
          caption: "GitHub Desktop is the main fork, clone, commit, and pull request surface used throughout the guide."
        },
        sourceHref: labLink("2-labs-github"),
        sourceLabel: "Open Full Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "sync-preview",
        title: "Sync & Preview",
        short: "Fork, clone, merge upstream, sample structure, GitHub Pages, and preview URL patterns.",
        accent: "ocean",
        tags: ["workflow", "advanced"],
        description: "Use this when the question is really about repository hygiene: where to fork, how to stay synced, what the folder structure should look like, and how preview URLs are derived.",
        steps: [
          "After approval, fork the target oracle-livelabs repository and the common repository from the GitHub web UI so you have both the product repository and the shared sample assets.",
          "Clone your fork in GitHub Desktop, pick a real local path, and when prompted choose To contribute to the parent project so upstream/oracle-livelabs remains connected.",
          "Before you edit each day, switch to the repository you are using, click Fetch origin, then Branch > Merge into Current Branch and merge upstream/main into main.",
          "After a successful merge, click Push origin so your local clone and your fork both stay aligned with production before you start new work.",
          "Copy the sample-workshop structure from common, keep folder and file names lowercase, and commit only after manifest.json points to real labs and the repository structure is clean.",
          "Enable GitHub Pages on your fork under Settings > Pages, save the main branch, wait for publication, and verify the preview URL before a long authoring session."
        ],
        checkpoints: [
          "Your local clone tracks your fork and still knows upstream/main.",
          "Both the target repository and common are available locally when you need sample templates or shared assets.",
          "GitHub Pages publishes the exact workshop variant path you plan to share."
        ],
        watchFor: [
          "Skipping the daily upstream merge and opening a pull request from stale content.",
          "Working directly in the production repository or forgetting to fork common as well.",
          "Waiting until late review to discover path, case, or Pages publication problems."
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
          src: "./content/author-guide/3-labs-sync-github/images/sample-workshop-structure.png",
          alt: "Sample workshop structure in Visual Studio Code",
          caption: "The sample structure is the cleanest baseline for new authoring work."
        },
        sourceHref: labLink("3-labs-sync-github"),
        sourceLabel: "Open Full Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "markdown-structure",
        title: "Markdown Structure",
        short: "Sample lab folders, required sections, common labs, variables, and LintChecker.",
        accent: "pine",
        tags: ["markdown"],
        description: "Use this card when you need the core authoring rules that make a workshop render, validate, and survive review without structural rework.",
        steps: [
          "Create the workshop folder inside the cloned product repository, then copy sample lab folders plus the workshops folder from common/sample-livelabs-templates/sample-workshop.",
          "Rename the copied lab folder and its markdown file together, delete the copied files folder when you do not need it, and add images only inside that lab's images folder.",
          "Copy the introduction folder when the workshop needs a dedicated landing lab, then add a README only when that variant actually needs one.",
          "Edit manifest.json in workshops/tenancy, workshops/sandbox, and/or workshops/desktop so workshoptitle, help, tutorial order, and any variant settings match the real workshop.",
          "Remove include or variables entries when they do not apply, and use absolute URLs for common labs or common images instead of duplicating shared content.",
          "Keep every lab inside the validator contract: one H1, Introduction, Objectives, Estimated Time, Task headers, Acknowledgements, lowercase filenames, and ?qa=true preview as you work."
        ],
        checkpoints: [
          "Copied sample folders were renamed cleanly and no stale sample files remain in manifest.json.",
          "Each lab has its own images folder and any unused files folder was removed.",
          "Preview with ?qa=true shows the workshop order, structure, and help email exactly the way review will see them."
        ],
        watchFor: [
          "Copying an old workshop instead of the canonical sample-workshop template.",
          "Leaving unused include or variables entries that stop the workshop from rendering.",
          "Using relative links for shared common labs or carrying mixed-case filenames into GitHub Pages."
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
          src: "./content/author-guide/4-labs-markdown-develop-content/images/lintchecker.png",
          alt: "LintChecker enabled in preview with qa=true",
          caption: "Add ?qa=true while previewing so structural issues surface before pull request review."
        },
        sourceHref: labLink("4-labs-markdown-develop-content"),
        sourceLabel: "Open Full Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "links-paths",
        title: "Links and Paths",
        short: "Case-correct paths, markdown links, and shared URLs that keep preview and GitHub Pages aligned.",
        accent: "sienna",
        tags: ["markdown"],
        description: "Use this card when links work locally but break in preview or production because the path, filename case, or link style is wrong.",
        steps: [
          "Keep every workshop file and folder lowercase and make the markdown path match the exact case used on disk.",
          "Use standard Markdown links instead of raw HTML links unless the canonical guide explicitly requires an embed or special markup.",
          "Use approved absolute URLs when you reference shared labs or shared assets from oracle-livelabs/common instead of copying them locally.",
          "Preview on local Live Server and on personal github.io so you catch path errors before review."
        ],
        checkpoints: [
          "Links resolve the same way locally and on GitHub Pages.",
          "Shared references point to the canonical common location instead of duplicated copies.",
          "No raw HTML links were used where normal Markdown would work."
        ],
        watchFor: [
          "Case-only renames on Windows or macOS that fail later on GitHub Pages.",
          "Hard-coding a local relative path for content that really lives in common.",
          "Treating a successful local preview as proof that the production path is correct."
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
          src: "./content/author-guide/4-labs-markdown-develop-content/images/case-sensitive.png",
          alt: "Case-sensitive image and path reminder",
          caption: "GitHub Pages is case-sensitive even when a local machine is not."
        },
        sourceHref: labLink("4-labs-markdown-develop-content"),
        sourceLabel: "Open Full Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "image-references",
        title: "Image References",
        short: "Images folder rules, shared image URLs, and alt text that survive preview and review.",
        accent: "ocean",
        tags: ["media", "markdown"],
        description: "Use this card when the issue is how images are referenced inside markdown rather than how screenshots are captured.",
        steps: [
          "Keep workshop images inside the current lab's images folder unless the asset is intentionally shared from oracle-livelabs/common.",
          "Use descriptive alt text on every image so the step still makes sense if the image fails to load or is read by assistive technology.",
          "Use the approved absolute image path pattern when referencing shared images from common.",
          "Open the GitHub Pages preview and confirm the same image loads there before you ask anyone to review it."
        ],
        checkpoints: [
          "Every image has descriptive alt text.",
          "The preview shows the same image on personal github.io that you saw locally.",
          "Shared images point to a canonical common URL instead of an improvised local copy."
        ],
        watchFor: [
          "Placing screenshots outside the images folder and losing track of them later.",
          "Using vague alt text such as image1 or screenshot.",
          "Breaking image paths with mixed case or partial folder names."
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
        sourceLabel: "Open Full Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "copy-sql",
        title: "Copy Tags and SQL Blocks",
        short: "Copy-ready commands, SQL or PL/SQL blocks, and the patterns that make the LiveLabs copy button work.",
        accent: "pine",
        tags: ["markdown"],
        description: "Use this card when the learner needs to copy commands or SQL directly from the guide and the code block has to behave correctly in preview.",
        steps: [
          "Wrap copyable commands in <copy> tags so the LiveLabs copy button appears in preview.",
          "Use sql or plsql fenced code blocks inside <copy> tags when the learner needs trailing newlines or multiple statements to execute cleanly.",
          "Keep the copy block directly beside the step that uses it instead of pushing the command into a detached appendix.",
          "Preview the page and test the copy button before you rely on it in review."
        ],
        checkpoints: [
          "Copy buttons appear where learners need commands, scripts, or SQL.",
          "The SQL block keeps the intended line breaks and execution order.",
          "The command block sits next to the step it supports."
        ],
        watchFor: [
          "Plain fenced code blocks with no copy tag when the learner is expected to paste the content.",
          "Putting too many unrelated commands into one copy block.",
          "Leaving the copy behavior untested until stakeholder review."
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
        sourceLabel: "Open Full Guide",
        guideTarget: "core-workflow"
      },
      {
        id: "reuse-variables",
        title: "Reuse & Variables",
        short: "Common labs, manifest variables, and conditional content without duplicating pages.",
        accent: "pine",
        tags: ["advanced", "workflow"],
        description: "Use this when a workshop needs shared content or variant-aware sections, and you need a real pattern instead of a vague reminder that reuse exists.",
        steps: [
          "Reference stable common labs through absolute manifest URLs instead of copying them into the workshop.",
          "Declare variables files near the top of manifest.json only when the workshop actually has reusable values across variants.",
          "Use conditional formatting blocks when the workshop serves multiple delivery types such as livelabs and freetier from one markdown file.",
          "Preview every branch of the conditional content, not only the first one that renders."
        ],
        checkpoints: [
          "The manifest only carries variables when reuse is real.",
          "Conditional branches are obvious to the next author reading the file.",
          "The tutorial order still makes sense when one branch is hidden."
        ],
        watchFor: [
          "Copying shared content that should stay central and canonical.",
          "Hiding too much logic in conditionals and making the lab unreadable.",
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
          src: "./content/author-guide/4-labs-markdown-develop-content/images/conditional-vsc1.png",
          alt: "Conditional formatting example in Visual Studio Code",
          caption: "Conditional content should stay obvious enough that another author can follow it."
        },
        sourceHref: labLink("4-labs-markdown-develop-content"),
        sourceLabel: "Open Full Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "quiz-blocks",
        title: "LiveLabs Quizzes",
        short: "Single-topic quizzes, scored quiz variants, and badge configuration that stay close to the step they reinforce.",
        accent: "sienna",
        tags: ["interactivity"],
        description: "Use this card when the learner should stop and verify understanding of the task that just happened, not when you only want decorative interactivity.",
        steps: [
          "Add a quiz block in the task where the learner should stop and verify understanding of the step that just finished.",
          "Use `Q:` for the question, `*` for correct answers, `-` for wrong answers, and `>` for the explanation shown after submit.",
          "Use `quiz score` and a top-level `quiz-config` block only when the workshop truly benefits from scoring or a badge.",
          "Preview the page and confirm that the answer states, scoring behavior, and any badge path all render correctly."
        ],
        checkpoints: [
          "The quiz is tied to the instructions immediately around it.",
          "Scoring or badges are enabled only when they add real learner value.",
          "Preview confirms that the quiz marks answers correctly."
        ],
        watchFor: [
          "Adding quizzes that slow the flow instead of helping the learner confirm understanding.",
          "Forgetting the explanation line on questions that need teaching value.",
          "Leaving badge assets or quiz-config paths outside the images folder."
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
          src: "./content/author-guide/quiz/images/quizconfig.png",
          alt: "Quiz configuration example",
          caption: "Use quiz-config only when scoring or badges are really part of the learning flow."
        },
        sourceHref: labLink("quiz"),
        sourceLabel: "Open Full Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "freesql-embed",
        title: "FreeSQL Embed",
        short: "Generate the FreeSQL embed, place it in the right task, and validate the rendered editor before review.",
        accent: "pine",
        tags: ["interactivity", "advanced"],
        description: "Use this card when running SQL inline inside the lab materially improves the task flow for the learner.",
        steps: [
          "Prepare the SQL or PL/SQL the learner should run and generate the embed snippet from FreeSQL.",
          "Paste the generated embed directly into the task where the learner needs SQL execution, and keep the surrounding instructions immediately beside it.",
          "Render the lab and verify that the editor loads correctly, fits the available width, and still matches the surrounding steps.",
          "Remove the embed if a normal copy block would explain the task more clearly."
        ],
        checkpoints: [
          "The embed is scoped to one task or concept instead of taking over the whole page.",
          "Preview confirms the runtime loads the editor where the learner expects it.",
          "The task instructions still make sense without sending the learner somewhere else."
        ],
        watchFor: [
          "Adding an embed when a normal code block or copy tag would be clearer.",
          "Separating the embed from the instructions it supports.",
          "Modifying iframe behavior without validating the current renderer first."
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
        sourceLabel: "Open Full Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "freesql-tutorial-publishing",
        title: "FreeSQL Tutorial Publishing",
        short: "Create a FreeSQL tutorial, map modules to lab tasks, share the tutorial link, and enable the orange Run on FreeSQL option in WMS.",
        accent: "pine",
        tags: ["interactivity", "workflow"],
        updatedAt: "2026-01-01",
        description: "Use this card when SQL or PL/SQL learners should run content in FreeSQL instead of a sandbox or their own tenancy.",
        steps: [
          "Open FreeSQL, choose the right database experience, sign in, and create a tutorial or script from My Content.",
          "Match the tutorial name, description, and tags to the WMS workshop details so the FreeSQL content and LiveLabs entry tell the same story.",
          "Add one tutorial module for the introduction and one module for each task that learners must run or read.",
          "Open the tutorial in the FreeSQL worksheet, review the instructions, edit modules, and reorder modules until the flow matches the workshop.",
          "Use Share to copy the tutorial link, then paste it into WMS Publishing > Run on FreeSQL URL and enable Run on FreeSQL.",
          "Remember that orange-button instructions live in FreeSQL. Brown and green button instructions still come from GitHub markdown."
        ],
        checkpoints: [
          "The FreeSQL tutorial content matches the WMS title, description, and learner outcome.",
          "Each task has a module, and the module order matches the learner flow.",
          "The WMS Publishing tab has the FreeSQL URL and the Run on FreeSQL slider enabled."
        ],
        watchFor: [
          "Updating GitHub markdown and expecting an orange-button FreeSQL tutorial to change.",
          "Using a script when the content needs module navigation.",
          "Publishing the LiveLabs entry before the tutorial share link opens and runs correctly."
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
          src: "./content/author-guide/11-labs-create-freesql/images/add-livesql-url.png",
          alt: "Run on FreeSQL URL field in WMS",
          caption: "WMS turns the FreeSQL share link into the orange Run on FreeSQL entry."
        },
        sourceHref: labLink("11-create-freesql"),
        sourceLabel: "Open Full Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "freesql-button-integration",
        title: "FreeSQL Button Integration",
        short: "Add the FreeSQL button tag, wrap SQL in FreeSQL blocks, test the button locally, and use a tutorial link when code exceeds URL limits.",
        accent: "pine",
        tags: ["interactivity", "markdown", "advanced"],
        updatedAt: "2026-01-01",
        description: "Use this card when the markdown itself should create a FreeSQL worksheet or tutorial launch button for SQL-heavy workshops or sprints.",
        steps: [
          "Place the <freesql-button> tag immediately after the lab title.",
          "Wrap each runnable SQL block in <freesql> and </freesql> tags so FreeSQL can populate the worksheet.",
          "Tell learners to sign in when the code modifies the database.",
          "If the worksheet URL would exceed 2048 characters, create a FreeSQL tutorial and use <freesql-button src=\"{tutorial-url}\"> instead.",
          "Open the workshop with Live Server, click Try It Now with FreeSQL, and run the worksheet or tutorial end to end."
        ],
        checkpoints: [
          "The button appears immediately after the lab title.",
          "Every runnable SQL block that belongs in the worksheet is inside FreeSQL tags.",
          "The generated worksheet or tutorial opens in FreeSQL and contains the expected code."
        ],
        watchFor: [
          "Trying to fit long setup scripts into a worksheet URL instead of creating a tutorial.",
          "Forgetting to test the button after local preview renders.",
          "Leaving database-changing code without a learner sign-in note."
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
        sourceLabel: "Open Full Guide",
        guideTarget: "reuse-enhancements"
      },
      {
        id: "screenshots",
        title: "Screenshot Standards",
        short: "Crop to the action, redact correctly, keep files <= 1280px, and remove unused images.",
        accent: "ocean",
        tags: ["media"],
        description: "Use this card when screenshots are the real problem: capture quality, redaction, image size, or extra files that will fail review later.",
        steps: [
          "Capture only the part of the UI that supports the step instead of full-screen monitor shots.",
          "Resize screenshots to 1280 pixels or less in width or height and prefer PNG for UI or text-heavy images.",
          "Redact sensitive values by deleting the underlying pixels, filling with an opaque shape, and flattening the image before save.",
          "Run the Check Unused Images tool before pull request time so each lab images folder contains only the screenshots the markdown actually references."
        ],
        checkpoints: [
          "The learner can tell exactly which UI control to click next.",
          "The screenshot does not expose usernames, IP addresses, intranet URLs, passwords, or OCIDs.",
          "Every image is in an images folder and referenced by markdown with alt text."
        ],
        watchFor: [
          "Oversized screenshots that pass local review but fail pull request validation.",
          "Pseudo-redaction tricks such as translucent shapes or unflattened layers.",
          "Leaving five or ten stale screenshots in a lab folder after rewriting the steps."
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
          src: "./content/author-guide/13-labs-capture-screens-best-practices/images/screen-captures-general-guidelines.png",
          alt: "General screenshot guidelines reference",
          caption: "The screenshot standards page is the authoritative checklist for capture quality and privacy."
        },
        sourceHref: labLink("13-labs-capture-screens-best-practices"),
        sourceLabel: "Open Full Guide",
        guideTarget: "tools-productivity"
      },
      {
        id: "optishot",
        title: "OptiShot",
        short: "Install, pick the folder, keep max size at 1280, and read the summary before you rerun checks.",
        accent: "ocean",
        tags: ["media", "Quality Assurance"],
        description: "Use this card when the pull request is blocked on image size or when you want a fast cleanup pass across a screenshot-heavy workshop.",
        steps: [
          "Install OptiShot for your platform and launch it so the folder picker opens immediately.",
          "Select the workshop or images folder you want to process and let OptiShot recurse through subfolders while skipping .git.",
          "Use the default 1280px maximum unless you have a smaller target in mind, and use dry-run first when you want to inspect what would change.",
          "Read the summary at the end so you know what was resized, skipped, or optimized before you re-open the pull request checks."
        ],
        checkpoints: [
          "The folder you selected is the one that actually contains the images under review.",
          "The max dimension stays at the LiveLabs limit of 1280 pixels.",
          "You rerun preview or pull request checks after the tool finishes."
        ],
        watchFor: [
          "Running it against the wrong directory and thinking your screenshots were fixed.",
          "Changing max size away from 1280 and reintroducing review failures.",
          "Treating OptiShot as a replacement for basic capture quality."
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
          src: "./content/author-guide/optishot/images/summary.png",
          alt: "OptiShot summary output",
          caption: "The summary tells you which images were resized, skipped, or optimized."
        },
        sourceHref: labLink("optishot"),
        sourceLabel: "Open Full Guide",
        guideTarget: "tools-productivity"
      },
      {
        id: "fixomat",
        title: "Fixomat",
        short: "Select the workshop root, choose the mode, and review FIXED versus MANUAL output carefully.",
        accent: "pine",
        tags: ["advanced", "Quality Assurance"],
        description: "Use this card late in the workflow when the workshop already exists and you want help cleaning markdown or images before review.",
        steps: [
          "Launch LiveLabs Fixomat 2000 and select the workshop root directory, not an arbitrary nested lab folder.",
          "Choose Fix Markdown only, Optimize images only, or the combined mode depending on what the review actually found.",
          "Run the scan and read both the summary and the console output instead of assuming every issue was auto-fixed.",
          "Follow up on MANUAL findings, then rerun Fixomat or preview again before you open or update the pull request."
        ],
        checkpoints: [
          "The mode you chose matches the actual problem.",
          "You reviewed the log and know which changes were applied automatically.",
          "You still validate the workshop after the tool finishes."
        ],
        watchFor: [
          "Running Fixomat too early and losing time on cleanup before the content is stable.",
          "Ignoring MANUAL findings and assuming the app handled them.",
          "Skipping preview after a bulk markdown or image pass."
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
        sourceLabel: "Open Full Guide",
        guideTarget: "tools-productivity"
      },
      {
        id: "Quality Assurance-checklist",
        title: "Quality Assurance Checklist",
        short: "Share the preview, set status correctly, save the checklist, and certify Self Quality Assurance in WMS.",
        accent: "red",
        tags: ["Quality Assurance", "workflow"],
        description: "Use this card when the workshop is ready for review and you need the exact order for Self Quality Assurance or Quarterly Quality Assurance without guessing.",
        steps: [
          "Open the personal GitHub Pages workshop URL and share that preview for review before you touch the Quality Assurance status in WMS.",
          "Set Workshop Status to In Development while build work is still active, or Self Quality Assurance when the workshop is stable enough to test end to end.",
          "On Workshop Details, update title, short description, long description, outline, prerequisites, and tags so WMS matches the real workshop that reviewers will open.",
          "Update Development GitHub/GitLab URL to your personal github.io preview, and after merge replace your username with oracle-livelabs in Production GitHub/GitLab URL.",
          "Open Self Quality Assurance Checklist, check every box, upload the requested evidence, add both the pull request link and the personal github.io workshop link, then click Save.",
          "Only after the checklist save succeeds should you set Self Quality Assurance Complete or Quarterly Quality Assurance Complete, certify the submission, and wait for stakeholder verification."
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
          src: "./content/author-guide/5-labs-qa-checks/images/self-qa-checklist-1.png",
          alt: "Self Quality Assurance checklist in WMS",
          caption: "The checklist must be fully saved before Self Quality Assurance Complete can succeed."
        },
        sourceHref: labLink("5-labs-qa-checks"),
        sourceLabel: "Open Full Guide",
        guideTarget: "validation-publish"
      },
      {
        id: "pull request-checks",
        title: "Pull Request Checks",
        short: "Know the 1280px image limit, markdown validator rules, and how to run the scripts locally.",
        accent: "ocean",
        tags: ["Quality Assurance", "advanced"],
        description: "Use this card when GitHub Actions is blocking the pull request and you need the exact failure class instead of guessing from the red X.",
        steps: [
          "Open the Checks area on the pull request and name the exact failing workflow before you edit anything: LiveLabs Image Validation or LiveLabs Markdown Validation.",
          "If the pull request fails LiveLabs Image Validation, use OptiShot to resize any PNG, JPG, or JPEG that exceeds 1280px in width or height, then rerun the pull request checks.",
          "Use the markdown error log to fix the exact file and rule: missing required sections, bad task header format, missing alt text, inline HTML, unbalanced copy tags, or uppercase filenames.",
          "Run the validator locally on the workshop root when you want faster repair loops than waiting for GitHub Actions after each commit.",
          "On Windows, use the PowerShell script if Bash is not your normal workflow, and temporarily bypass execution policy only for the current session when needed."
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
          src: "./content/author-guide/prcheck/images/prerror.png",
          alt: "Failed pull request checks on GitHub",
          caption: "Start with the failing workflow name so you fix the real blocker."
        },
        sourceHref: labLink("prcheck"),
        sourceLabel: "Open Full Guide",
        guideTarget: "validation-publish"
      },
      {
        id: "publish-request",
        title: "Publish Request",
        short: "Create the pull request with the WMS ID, fill the Publishing tab correctly, and supply the final URLs.",
        accent: "red",
        tags: ["Quality Assurance", "workflow"],
        description: "Use this card when the workshop and checklist are ready and you need the final production handoff sequence for the pull request and WMS publishing request.",
        steps: [
          "Create the pull request from GitHub Desktop after Quality Assurance fixes are pushed, and include the WMS ID in the pull request title because review will not start without it.",
          "On the GitHub pull request page, fill the general requirements and checklist text from Self Quality Assurance so reviewers can see the workshop is ready for merge.",
          "Confirm the branch has no merge conflicts and is up to date with main before you ask for approval or publishing.",
          "Open WMS > Publishing, click Publish to LiveLabs, set Publish Type and Workshop Time, and provide the oracle-livelabs production URL that replaces your personal preview URL.",
          "Enable Brown Button or LiveLabs Sprint only when the workshop really supports those delivery modes, then fill the corresponding URL pattern correctly.",
          "Save the publishing entry, track Publish Requested and Publish Approved, then verify the production workshop after merge and rollout."
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
          src: "./content/author-guide/6-labs-publish/images/publishing-tab.png",
          alt: "Publishing tab in WMS",
          caption: "The Publishing tab is where the final production metadata is created and approved."
        },
        sourceHref: labLink("6-labs-publish"),
        sourceLabel: "Open Full Guide",
        guideTarget: "validation-publish"
      },
      {
        id: "review-sla",
        title: "Review SLA",
        short: "Use the expected review and publishing windows before you escalate, and include the real deadline when timing matters.",
        accent: "pine",
        tags: ["workflow", "Quality Assurance"],
        description: "Use this card when the blocker is timing rather than content quality and you need the normal review windows for PRs, council review, Quality Assurance, or publishing.",
        steps: [
          "Plan around 1 business day for pull request review, 2 to 3 business days for workshop submission review, 2 business days for stakeholder Quality Assurance verification, and 1 business day for publishing after approval.",
          "Wait for the normal response window before escalating routine review work.",
          "If the workshop is tied to an event or hard deadline, state that explicitly instead of assuming the urgency is obvious."
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
        sourceLabel: "Open Full Guide",
        guideTarget: "validation-publish"
      },
      {
        id: "livelabs-sprints",
        title: "LiveLabs Sprints",
        short: "Build a short sprint in the sprints repository, keep it under 10 to 15 minutes, open a pull request, and request sprint publishing in WMS.",
        accent: "ocean",
        tags: ["workflow", "advanced"],
        updatedAt: "2026-01-01",
        description: "Use this card when the deliverable is a quick answer to one technical question rather than a full workshop.",
        steps: [
          "Before creating a sprint, check WMS for an existing sprint with the same content.",
          "Fork and clone oracle-livelabs/sprints, then copy the sample sprint structure into the correct domain folder.",
          "Rename the sprint folder and markdown file together, update manifest.json, and keep the help address set to livelabs-help-sprints_us@oracle.com.",
          "Write a focused sprint that answers one question and should take less than 10 to 15 minutes.",
          "Preview with Live Server, commit, push, create the pull request, and set up GitHub Pages for review.",
          "Submit the sprint publishing request in WMS, add the production URL pattern, and update the pull request with the WMS ID and LiveLabs ID."
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
          src: "./content/author-guide/10-labs-create-sprints-workflow/images/sprints-workflow.png",
          alt: "LiveLabs sprint workflow diagram",
          caption: "Sprints use a separate repository and publish request path from full workshops."
        },
        sourceHref: labLink("10-create-sprints-workflow"),
        sourceLabel: "Open Full Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "graphical-remote-desktop",
        title: "Graphical Remote Desktop",
        short: "Configure static hostname, deploy noVNC, preload workshop URLs, and validate the desktop before image capture.",
        accent: "sienna",
        tags: ["advanced"],
        description: "Use this card when a workshop needs a prepared noVNC graphical desktop image instead of ordinary browser or cloud-shell steps.",
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
        sourceLabel: "Open Full Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "custom-image-capture",
        title: "Custom Image Capture",
        short: "Clean the instance, check the OL9 and NoVNC warning, create the custom OCI image, test it with ORM, and verify desktop launch before Marketplace work.",
        accent: "sienna",
        tags: ["advanced", "marketplace"],
        updatedAt: "2026-01-01",
        description: "Use this card when a workshop requires a reusable OCI compute image that will later be published or attached to a sandbox environment.",
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
        sourceLabel: "Open Full Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "marketplace-image-publish",
        title: "Marketplace Image Publishing",
        short: "Prepare Marketplace listing assets, publish the custom image, and keep LiveLabs support details visible.",
        accent: "sienna",
        tags: ["advanced", "marketplace", "workflow"],
        updatedAt: "2026-01-01",
        description: "Use this card when the custom image has passed testing and needs to become a Marketplace-backed image for LiveLabs delivery.",
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
        sourceLabel: "Open Full Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "wms-custom-image-update",
        title: "WMS Custom Image Update",
        short: "Register a Marketplace listing in WMS, add the image version, and update an existing sandbox environment.",
        accent: "red",
        tags: ["workflow", "advanced", "marketplace"],
        updatedAt: "2026-01-01",
        description: "Use this card after a Marketplace image is published and you need to attach it to a pre-existing LiveLabs sandbox environment through WMS.",
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
        sourceLabel: "Open Full Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "livestack-create",
        title: "LiveStack Creation",
        short: "Create a LiveStack in WMS, add LiveLab entries and assets, manage visibility, and request publishing.",
        accent: "ocean",
        tags: ["workflow", "advanced", "livestack", "assets"],
        updatedAt: "2026-06-01",
        description: "Use this card when a solution needs a LiveStack landing page that joins demos, LiveLabs, deployment assets, and supporting materials around one business outcome.",
        steps: [
          "Open WMS, choose Create a LiveStack, read the landing page, and create the initial LiveStack record.",
          "Use the LiveStack details page as the working surface for entries, assets, ordering, visibility, and publishing status.",
          "Add LiveLab entries by name or ID, then decide whether Run on Sandbox and Run on Your Tenancy should appear from the LiveStack.",
          "Set each entry title and position deliberately. The source LiveLab title is only the default, not a requirement.",
          "Add assets that you created or that someone shared with you, then set position and internal or external visibility.",
          "When the LiveStack is ready, change status to Publish Requested and save. Council review usually returns a status update in 2 to 3 business days."
        ],
        checkpoints: [
          "The LiveStack has a clear Envision, Try, Embed, and Scale story instead of a loose list of links.",
          "Every LiveLab entry has the intended title, launch options, and order.",
          "Every asset has the right visibility before the LiveStack is published.",
          "The author knows that published LiveStack changes appear in LiveLabs immediately."
        ],
        watchFor: [
          "Adding assets before WMS can list them for you. Only assets created by you or shared with you appear.",
          "Leaving internal briefing material visible to external audiences.",
          "Reordering or editing a published LiveStack without realizing the change is immediate."
        ],
        snippetMeta: "LiveStack build path",
        snippetTitle: "Create, fill, and publish the LiveStack",
        snippet: [
          "1. WMS > Create a LiveStack",
          "2. Complete the initialization form",
          "3. Add LiveLab entries by name or ID",
          "4. Choose launch options, title, and position",
          "5. Add shared or owned assets",
          "6. Set internal or external visibility",
          "7. Change status to Publish Requested"
        ].join("\n"),
        image: {
          src: "./content/author-guide/15-livestack/images/ls-details.png",
          alt: "LiveStack details page in WMS",
          caption: "The details page is where authors add LiveLabs, assets, order, visibility, and publish status."
        },
        sourceHref: labLink("create-a-livestack"),
        sourceLabel: "Open Full Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "wms-assets",
        title: "WMS Asset Manager",
        short: "Upload reusable files or links, share editor access, copy PAR links, and keep LiveStack or sandbox assets maintainable.",
        accent: "pine",
        tags: ["workflow", "assets", "livestack"],
        updatedAt: "2026-06-01",
        description: "Use this card when a workshop, sandbox, tenancy flow, or LiveStack needs reusable files or links managed through WMS Self Services instead of ad hoc support requests.",
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
          src: "./content/author-guide/17-assets/images/2-new-asset-dialog.png",
          alt: "WMS Asset Details dialog for file or link assets",
          caption: "WMS assets turn reusable files and links into shared, maintainable authoring objects."
        },
        sourceHref: labLink("17-assets"),
        sourceLabel: "Open Full Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "secure-desktop-when",
        title: "Secure Desktop: When to Use It",
        short: "Test normal access first, use secure desktop only for real restrictions, and validate with sample users before the event.",
        accent: "sienna",
        tags: ["workflow", "advanced"],
        description: "Use this card when the workshop audience may be on restricted corporate laptops and you need to decide whether OCI Secure Desktops are actually required.",
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
          resourceLink("OCI Secure Desktop docs", officialLinks.secureDesktopDocs, "Use this when you need the broader platform prerequisites and setup context.")
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
        sourceLabel: "Open Full Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "secure-desktop-request",
        title: "Secure Desktop: Request and Access",
        short: "Post the request with full event details, plan earlier for large events, and make participants use the supported browser flow.",
        accent: "sienna",
        tags: ["workflow", "advanced"],
        description: "Use this card when secure desktops are justified and you need the exact request details plus the participant-side launch prerequisites.",
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
          resourceLink("OCI Secure Desktop docs", officialLinks.secureDesktopDocs, "Use this when participants or reviewers need more setup detail.")
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
        sourceLabel: "Open Full Guide",
        guideTarget: "specialized-workflows"
      },
      {
        id: "ai-developer-hub",
        title: "AI Developer Hub",
        short: "Use the AI Developer Hub guide, repository, and skill bundles to speed up authoring work without replacing the canonical workflow.",
        accent: "pine",
        tags: ["workflow", "advanced"],
        description: "Use this card when you want AI-assisted help for drafting, restructuring, or automating LiveLabs authoring tasks, but still need the output anchored to the canonical guide and validator rules.",
        steps: [
          "Open the LiveLabs AI Developer Hub how-to guide first so you understand the intended workflow and starting points.",
          "Review the repository and the LiveLabs AI Developer skill bundle folder to see what authoring helpers already exist before you invent a new prompt flow.",
          "Use the hub for narrow, real tasks such as drafting task steps, tightening prose, extracting prerequisites, or producing a first pass that you will verify manually.",
          "Review every AI-assisted output against the canonical guide, preview the workshop again, and run the validator before you trust the result."
        ],
        checkpoints: [
          "The AI workflow starts from the published guide and skill bundle instead of freeform prompting alone.",
          "Generated steps, commands, and screenshots still match the real workshop flow.",
          "Human review happens before any AI-assisted content is committed."
        ],
        watchFor: [
          "Using AI to replace the canonical guide instead of accelerating work around it.",
          "Keeping vague generated summaries that never become real steps, commands, or evidence.",
          "Committing AI-generated content without preview or validator checks."
        ],
        resourcesTitle: "Hub entry points",
        resourcesIntro: "Start with the guide, then use the repository and skill bundle as the reusable working set.",
        resourceLinks: [
          resourceLink("AI Developer Hub guide", officialLinks.aiHubGuide, "Open the how-to workflow first."),
          resourceLink("AI Developer Hub repository", officialLinks.aiHubRepo, "Use the repository when you want the source materials locally."),
          resourceLink("LiveLabs AI Developer skills", officialLinks.aiHubSkills, "Review the authoring skill bundle before you create a new flow.")
        ],
        snippetMeta: "Quick start",
        snippetTitle: "Start with these hub assets",
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
        sourceLabel: "Open Full Guide",
        guideTarget: "help-faq"
      }
    ]
  };
}());
