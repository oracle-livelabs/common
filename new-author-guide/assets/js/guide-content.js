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
        title: "Create Workshop + Add to GitHub",
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
        short: "VPN, request form, tags, and the approval statuses that gate authoring.",
        accent: "red",
        tags: ["workflow", "beginner"],
        description: "Use this card when you need the real WMS actions from the source guide: what to fill in, what status comes next, and what reviewers expect before GitHub work starts.",
        steps: [
          "Connect to Corporate VPN, open Oracle Workshop Management System, and click Submit a New Workshop Request.",
          "Fill Workshop Basic Information completely, including Stakeholder, Workshop Council, Workshop Owner Group, Workshop Abstract, Workshop Outline, and Workshop Prerequisites.",
          "Open the Tags tab and set the required Level, Role, Focus Area, and Product tags before you create the record.",
          "Track the request through Submitted, More Info Needed, Approved, In Development, Self Quality Assurance, and Self Quality Assurance Complete so your WMS record stays aligned with the real build status."
        ],
        checkpoints: [
          "The title says what the learner will build or achieve, not only the product name.",
          "Owner, council, and contact fields are populated before review starts.",
          "The request already calls out unusual build elements such as embedded HTML, special media, Marketplace images, or remote desktop."
        ],
        watchFor: [
          "Starting repository work before the council record is aligned.",
          "Leaving abstract, outline, or prerequisites too vague and forcing council follow-up.",
          "Forgetting that later Self Quality Assurance and publishing steps depend on the same WMS record."
        ],
        exampleTitle: "Example completion",
        exampleIntro: "These are the kinds of answers reviewers should see. The exact stakeholder or council name changes, but the level of detail should not.",
        exampleFields: [
          exampleField("Workshop Title", "Build and publish an Oracle LiveLabs workshop from WMS to GitHub Pages", "Lead with the learner outcome, not only the product name."),
          exampleField("Workshop Abstract", "Authors learn how to request a workshop in WMS, prepare GitHub Desktop and Visual Studio Code, build from the LiveLabs sample structure, complete Self Quality Assurance, and request publishing.", "A reviewer should understand the end-to-end goal after two or three sentences."),
          exampleField("Workshop Outline", "Outline the build flow in order.\nSubmit and track the WMS request.\nSet up GitHub and preview tooling.\nBuild the workshop structure and labs.\nRun Self Quality Assurance, fix pull request issues, and publish.", "Keep the outline in the same order the work will really happen."),
          exampleField("Workshop Prerequisites", "Oracle VPN access, GitHub account tied to @oracle.com, GitHub Desktop, Visual Studio Code, Live Server, and permission to work in the target oracle-livelabs repository.", "If a prerequisite can block setup or review later, surface it here."),
          exampleField("Stakeholder / Council / Owner Group", "Choose the named stakeholder who will verify the workshop, the council aligned to the production repository, and the team that will maintain the workshop after publish.", "Do not leave these on temporary contributors or generic defaults."),
          exampleField("Required Tags", "Use the actual WMS tags for the workshop.\nLevel = Beginner\nRole = Developer\nFocus Area = the main solution area\nProduct = the Oracle service being taught.", "Tags are required routing and discovery metadata.")
        ],
        milestonesTitle: "Status flow",
        milestonesIntro: "The same WMS record stays with the workshop all the way through approval, Quality Assurance, publishing, and later maintenance.",
        milestones: [
          milestone("Submitted", "Council review starts here."),
          milestone("More Info Needed or Approved", "Answer follow-up questions or wait for approval before heavy build work."),
          milestone("In Development", "Move here when real GitHub authoring starts."),
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
          src: "./04-workshop-components-reuse/sections/02-add-quizzes/images/quizconfig.png",
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
          src: "./05-tools/sections/01-capture-screens-best-practices/images/screen-captures-general-guidelines.png",
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
          src: "./05-tools/sections/02-optishot/images/summary.png",
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
        title: "pull request Checks",
        short: "Know the 1280px image limit, markdown validator rules, and how to run the scripts locally.",
        accent: "ocean",
        tags: ["Quality Assurance", "advanced"],
        description: "Use this card when GitHub Actions is blocking the pull request and you need the exact failure class instead of guessing from the red X.",
        steps: [
          "Open the Checks area on the pull request and name the exact failing workflow before you edit anything: LiveLabs Image Validation or LiveLabs Markdown Validation.",
          "Resize any PNG, JPG, or JPEG that exceeds 1280px in width or height, then rerun the pull request checks instead of assuming the next push will be clean.",
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
          "https://oracle-livelabs.github.io/<repository-name>/<path>/workshops/<variant>/",
          "",
          "Brown Button URL",
          "https://oracle-livelabs.github.io/<repository-name>/<path>/workshops/tenancy/",
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
        id: "need-help",
        title: "Need Help?",
        short: "Choose the right support channel and bring enough context that someone can actually unblock you.",
        accent: "pine",
        tags: ["workflow"],
        description: "Use this card when the blocker is ownership, tooling, or workflow support and you need to route the question to the right place.",
        steps: [
          "Check the workflow lab or FAQ first so you do not escalate something the guide already answers clearly.",
          "Use WMS Message the Team for workshop-specific approval, stakeholder, or publishing questions tied to one workshop record.",
          "Use the shared mailbox or #workshop-authors-help Slack channel for tooling, documentation, or shared platform blockers.",
          "Bring the WMS ID, preview URL, repository or pull request, exact blocker, and what you already tried."
        ],
        checkpoints: [
          "The support request goes to the channel that actually owns the blocker.",
          "The request includes enough context to reproduce or route the issue.",
          "You are not sending the same vague request to multiple channels."
        ],
        watchFor: [
          "Asking for help with no WMS ID, preview URL, or error context.",
          "Direct messaging people to bypass the queue for normal review work.",
          "Treating the support channel as the first stop instead of the guide or FAQ."
        ],
        snippetMeta: "Support context",
        snippetTitle: "Bring this context when you ask for help",
        snippet: [
          "WMS ID:",
          "Preview URL:",
          "Repository / branch or pull request:",
          "Current workflow status:",
          "Exact blocker:",
          "What you already tried:"
        ].join("\n"),
        sourceHref: labLink("need-help"),
        sourceLabel: "Open Full Guide",
        guideTarget: "help-faq"
      },
      {
        id: "livelabs-faq",
        title: "LiveLabs FAQ",
        short: "Use the FAQ for repeat author questions such as VPN, preview versus production links, and Quarterly Quality Assurance.",
        accent: "pine",
        tags: ["workflow"],
        description: "Use this card when the question is common and you need a fast answer before diving back into the deeper workflow lab.",
        steps: [
          "Use FAQ first for repeat questions such as VPN access, who can submit a workshop, and where the Self Quality Assurance checklist appears.",
          "Use it again for maintenance questions such as which link to share during development, which link to share after publish, and how to handle minor or major updates.",
          "Return to the workflow lab when you need execution detail instead of a short answer."
        ],
        checkpoints: [
          "You know whether a short FAQ answer is enough or whether the full workflow lab is needed.",
          "The FAQ answer resolves the immediate question without replacing the real step-by-step instructions.",
          "You are using FAQ to reduce noise, not to skip the process."
        ],
        watchFor: [
          "Using FAQ answers as a shortcut around the actual author flow.",
          "Escalating a question that the FAQ already answers.",
          "Treating FAQ as the main execution guide."
        ],
        snippetMeta: "Typical FAQ topics",
        snippetTitle: "Use FAQ for these repeat questions",
        snippet: [
          "Need VPN for WMS?",
          "Which link should I share in development?",
          "Which link should I share after publish?",
          "What happens if Quarterly Quality Assurance is missed?"
        ].join("\n"),
        sourceHref: labLink("livelabs-faq"),
        sourceLabel: "Open Full Guide",
        guideTarget: "help-faq"
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
