(function () {
  var content = window.authorGuideContent;
  var explorerItems;
  var itemMap = {};
  var stepGuideTargets = {
    "step-1": "start-here",
    "step-2": "core-workflow",
    "step-3": "validation-publish"
  };

  if (!content || !Array.isArray(content.explorerItems)) {
    return;
  }

  explorerItems = content.explorerItems;

  function guideLabLink(labId) {
    return "https://oracle-livelabs.github.io/common/sample-livelabs-templates/create-labs/labs/workshops/livelabs/?lab=" + encodeURIComponent(labId);
  }

  function cloneArray(items) {
    return Array.isArray(items) ? items.slice() : [];
  }

  function cloneObjectArray(items) {
    return cloneArray(items).map(function (item) {
      return Object.assign({}, item);
    });
  }

  function cloneImage(image) {
    if (!image) {
      return null;
    }

    return {
      src: image.src,
      alt: image.alt,
      caption: image.caption
    };
  }

  function labFromItem(itemId, label, overrides) {
    var item = itemMap[itemId];

    if (!item) {
      return null;
    }

    return Object.assign({
      id: item.id,
      label: label || "",
      title: item.title,
      summary: item.description || item.short || "",
      steps: cloneArray(item.steps),
      checkpoints: cloneArray(item.checkpoints),
      watchFor: cloneArray(item.watchFor),
      snippetMeta: item.snippetMeta || "",
      snippetTitle: item.snippetTitle || "",
      snippet: item.snippet || "",
      exampleTitle: item.exampleTitle || "",
      exampleIntro: item.exampleIntro || "",
      exampleFields: cloneObjectArray(item.exampleFields),
      milestonesTitle: item.milestonesTitle || "",
      milestonesIntro: item.milestonesIntro || "",
      milestones: cloneObjectArray(item.milestones),
      resourcesTitle: item.resourcesTitle || "",
      resourcesIntro: item.resourcesIntro || "",
      resourceLinks: cloneObjectArray(item.resourceLinks),
      image: cloneImage(item.image),
      sourceHref: item.sourceHref || "",
      sourceLabel: item.sourceLabel || "Open Full Guide"
    }, overrides || {});
  }

  function manualLab(config) {
    return Object.assign({
      label: "",
      steps: [],
      checkpoints: [],
      watchFor: [],
      snippetMeta: "",
      snippetTitle: "",
      snippet: "",
      exampleTitle: "",
      exampleIntro: "",
      exampleFields: [],
      milestonesTitle: "",
      milestonesIntro: "",
      milestones: [],
      resourcesTitle: "",
      resourcesIntro: "",
      resourceLinks: [],
      sourceLabel: "Open Full Guide"
    }, config || {});
  }

  function makeSection(config) {
    return Object.assign({}, config, {
      labs: cloneArray(config.labs).filter(Boolean)
    });
  }

  explorerItems.forEach(function (item) {
    itemMap[item.id] = item;
  });

  content.stepMeta = cloneArray(content.stepMeta).map(function (step) {
    return Object.assign({}, step, {
      guideTarget: stepGuideTargets[step.id] || step.guideTarget
    });
  });

  content.guideSections = [
    makeSection({
      id: "start-here",
      label: "Section 1",
      title: "Start Here",
      accent: "red",
      summary: "Use the redesigned guide home for orientation first, then pull in the WMS lifecycle and GitHub model before you go deep on authoring work.",
      purpose: "This section exists so the first answer is route choice and context, not a blind jump into the middle of the workflow.",
      highlights: [
        "Start on the redesigned home page first.",
        "Use the WMS lifecycle to understand real handoffs.",
        "Keep the GitHub ownership model clear before you build."
      ],
      sectionHref: guideLabLink("introduction"),
      sectionLabel: "Open Full Guide",
      image: {
        src: "./content/author-guide/introduction/images/livelabs-publishing-flow.png",
        alt: "LiveLabs publishing workflow diagram",
        caption: "The first pass is route selection plus workflow context, not immediate page-by-page reading."
      },
      labs: [
        manualLab({
          id: "guide-home",
          label: "Guide home",
          title: "Open the redesigned guide home first",
          summary: "Choose the shortest route before you open the markdown fallback or the deeper section cards.",
          steps: [
            "Open the author guide home and stay on that page long enough to choose the right route.",
            "Use Guided Path when you want the standard request, build, Quality Assurance, and publish sequence.",
            "Use Toolkit when you already know the blocker and need one focused answer.",
            "Use Full Guide when you want the section-by-section map in the redesigned shell."
          ],
          checkpoints: [
            "You can say why you are using Guided Path, Toolkit, or Full Guide before you continue.",
            "You are not treating the markdown fallback as the default front door."
          ],
          watchFor: [
            "Dropping into a random canonical lab before deciding what kind of help is needed.",
            "Using the markdown route as the first stop when the redesigned routes already answer the job."
          ],
          snippetMeta: "Route choice",
          snippetTitle: "Choose one route deliberately",
          snippet: [
            "Guided Path  -> ordered request, build, Quality Assurance, publish flow",
            "Toolkit      -> one blocker, one answer",
            "Full Guide   -> section-by-section reference map",
            "Markdown     -> fallback, not the default front door"
          ].join("\n"),
          sourceHref: "./index.html#home",
          sourceLabel: "Open Guide Home"
        }),
        manualLab({
          id: "guide-wms-lifecycle",
          label: "WMS flow",
          title: "Understand the WMS lifecycle before you build",
          summary: "Know when review, Self Quality Assurance, stakeholder verification, and publishing handoffs actually happen so the rest of the workflow makes sense.",
          steps: [
            "Read the Submitted, More Info Needed, Approved, In Development, Self Quality Assurance, and Completed states before heavy build work starts.",
            "Move into In Development only when active authoring is underway.",
            "Use Self Quality Assurance Complete to signal stakeholder-ready review, not unfinished draft work.",
            "Return later for Quarterly Quality Assurance once the workshop is already published."
          ],
          checkpoints: [
            "You know which status comes next after the current one.",
            "You know which handoff belongs to council, stakeholders, and publishing."
          ],
          watchFor: [
            "Treating status updates like paperwork instead of workflow gates.",
            "Skipping the stakeholder handoff after Self Quality Assurance Complete."
          ],
          snippetMeta: "Status ladder",
          snippetTitle: "The WMS flow to remember",
          snippet: [
            "Submitted",
            "More Info Needed / Approved",
            "In Development",
            "Self Quality Assurance",
            "Self Quality Assurance Complete",
            "Completed",
            "Quarterly Quality Assurance"
          ].join("\n"),
          sourceHref: guideLabLink("wms-workflows")
        }),
        manualLab({
          id: "guide-github-model",
          label: "GitHub model",
          title: "Understand the Oracle LiveLabs GitHub model",
          summary: "Keep the production repository, your fork, the common repository, and the local clone distinct so files and manifests do not land in the wrong place.",
          steps: [
            "Identify the production oracle-livelabs repository that should own the workshop.",
            "Treat oracle-livelabs as production, your fork as the writable remote, and the local clone as the authoring workspace.",
            "Use common for templates, shared labs, and shared assets instead of copying an arbitrary old workshop."
          ],
          checkpoints: [
            "You know which production repository owns the workshop.",
            "You know why a fork is required before normal authoring work starts."
          ],
          watchFor: [
            "Confusing the common repository with the product repository that owns the workshop.",
            "Starting from a random old workshop instead of the supported sample structure."
          ],
          snippetMeta: "Repository roles",
          snippetTitle: "Keep the repository model straight",
          snippet: [
            "oracle-livelabs/<repository> -> production source of truth",
            "<your-user>/<repository>     -> your fork",
            "common                 -> shared templates and assets",
            "local clone            -> edit, preview, validate"
          ].join("\n"),
          sourceHref: guideLabLink("github-introduction")
        })
      ]
    }),
    makeSection({
      id: "core-workflow",
      label: "Section 2",
      title: "Core Workflow",
      accent: "ocean",
      summary: "This is the day-to-day authoring route: request the workshop, prepare the workstation, stay in sync, and build markdown that survives preview and review.",
      purpose: "Use this section for the practical author loop, not only for first-time setup.",
      highlights: [
        "Wait for approval before heavy build work when possible.",
        "Confirm preview early while the workshop is cheap to fix.",
        "Keep structure, paths, and copy patterns clean from day one."
      ],
      sectionHref: guideLabLink("1-labs-wms"),
      sectionLabel: "Open Full Guide",
      image: {
        src: "./content/author-guide/3-labs-sync-github/images/sample-workshop-structure.png",
        alt: "Sample workshop structure in Visual Studio Code",
        caption: "The core workflow starts with the request and stays grounded in a previewable sample structure."
      },
      labs: [
        labFromItem("wms-request", "WMS"),
        labFromItem("github-setup", "Setup"),
        labFromItem("sync-preview", "Sync"),
        labFromItem("markdown-structure", "Markdown"),
        labFromItem("links-paths", "Links"),
        labFromItem("image-references", "Images"),
        labFromItem("copy-sql", "Copy")
      ]
    }),
    makeSection({
      id: "validation-publish",
      label: "Section 3",
      title: "Validation and Publish",
      accent: "red",
      summary: "Turn the working draft into a releasable workshop through Self Quality Assurance, pull request checks, realistic review windows, and the publishing request.",
      purpose: "Use this section once the workshop renders and the work shifts from building to verifying, reviewing, and releasing.",
      highlights: [
        "Save the checklist before touching the status.",
        "Fix pull request issues by class, not by guesswork.",
        "Publish only with production URLs and metadata."
      ],
      sectionHref: guideLabLink("5-labs-qa-checks"),
      sectionLabel: "Open Full Guide",
      image: {
        src: "./content/author-guide/5-labs-qa-checks/images/self-qa-checklist-1.png",
        alt: "Self Quality Assurance checklist in WMS",
        caption: "Validation is a sequence: metadata, checklist, checks, review windows, then publish."
      },
      labs: [
        labFromItem("Quality Assurance-checklist", "Quality Assurance"),
        labFromItem("pull request-checks", "Checks"),
        labFromItem("review-sla", "SLA"),
        labFromItem("publish-request", "Publish")
      ]
    }),
    makeSection({
      id: "reuse-enhancements",
      label: "Section 4",
      title: "Reuse and Enhancements",
      accent: "pine",
      summary: "Use reuse, variables, quizzes, Live SQL, and FreeSQL only when the workshop actually benefits from them and the core flow is already stable.",
      purpose: "These are additive tools for stronger workshops, not substitutes for the standard authoring path.",
      highlights: [
        "Reuse content instead of duplicating it.",
        "Keep enhancements close to the task they support.",
        "Preview every enhanced pattern before review."
      ],
      sectionHref: guideLabLink("12-freesql-integration"),
      sectionLabel: "Open Full Guide",
      image: {
        src: "./content/author-guide/quiz/images/quizconfig.png",
        alt: "Quiz configuration example",
        caption: "Reuse and enhancement work should stay scoped and justified, not ornamental."
      },
      labs: [
        labFromItem("reuse-variables", "Reuse"),
        labFromItem("quiz-blocks", "Quiz", {
          image: {
            src: "./content/author-guide/quiz/images/quizconfig.png",
            alt: "Quiz configuration example",
            caption: "Use scored quizzes and badges only when they materially improve the learning flow."
          }
        }),
        manualLab({
          id: "guide-live-sql-publish",
          label: "Live SQL",
          title: "Publish tutorial content to Live SQL",
          summary: "Create the Live SQL tutorial first when the learner flow depends on published tutorial modules or worksheet content.",
          steps: [
            "Create the tutorial and module structure in Live SQL before you wire anything into the workshop.",
            "Populate the module content so each module matches the workshop task it will support.",
            "Publish the entry, open the tutorial view, and verify the shared URL before you reference it from markdown."
          ],
          checkpoints: [
            "The published tutorial renders the correct worksheet and instructions.",
            "The shared Live SQL URL is stable before you reuse it elsewhere."
          ],
          watchFor: [
            "Trying to integrate unpublished or half-finished Live SQL content.",
            "Letting the Live SQL structure drift away from the workshop task order."
          ],
          snippetMeta: "Live SQL order",
          snippetTitle: "Publish before you integrate",
          snippet: [
            "1. Create tutorial",
            "2. Add modules",
            "3. Publish",
            "4. Verify the shared URL",
            "5. Reuse it in the workshop"
          ].join("\n"),
          image: {
            src: "./content/author-guide/11-labs-create-freesql/images/tutorial-worksheet-view.png",
            alt: "Published Live SQL tutorial worksheet view",
            caption: "Validate the shared tutorial view before you depend on it in the workshop."
          },
          sourceHref: guideLabLink("11-create-freesql")
        }),
        manualLab({
          id: "guide-live-sql-integration",
          label: "Integration",
          title: "Integrate Live SQL into the workshop cleanly",
          summary: "Bring the published Live SQL asset into the workshop only where it supports the task and keeps the flow obvious for the learner.",
          steps: [
            "Identify the exact task where the Live SQL content improves the learner flow.",
            "Add the integration using the canonical Live SQL instructions so the learner does not leave the task context unnecessarily.",
            "Preview the workshop and confirm the link or embedded behavior still matches the surrounding instructions."
          ],
          checkpoints: [
            "The learner can understand the task without chasing a detached Live SQL appendix.",
            "Preview confirms the integration behaves as expected."
          ],
          watchFor: [
            "Adding Live SQL because it is available instead of because it improves the task.",
            "Splitting the instructions and the linked SQL content too far apart."
          ],
          snippetMeta: "Integration rule",
          snippetTitle: "Keep Live SQL next to the task it supports",
          snippet: [
            "Put the Live SQL instruction where the learner needs it.",
            "Validate the handoff in preview before review."
          ].join("\n"),
          image: {
            src: "./content/author-guide/11-labs-create-freesql/images/share-tutorial.png",
            alt: "Share tutorial action in Live SQL",
            caption: "Use the shared tutorial artifact only after the publish and share flow is complete."
          },
          sourceHref: guideLabLink("12-freesql-integration")
        }),
        labFromItem("freesql-embed", "FreeSQL")
      ]
    }),
    makeSection({
      id: "tools-productivity",
      label: "Section 5",
      title: "Tools and Productivity",
      accent: "sienna",
      summary: "Use the tooling layer to keep screens clean and late-stage cleanup manageable, but do not let the tools replace basic authoring discipline.",
      purpose: "These tools help late in the workflow after the structure and content are already real.",
      highlights: [
        "Fix capture quality before the pull request does it for you.",
        "Use OptiShot for image-size cleanup.",
        "Use Fixomat late and still review the output."
      ],
      sectionHref: guideLabLink("13-labs-capture-screens-best-practices"),
      sectionLabel: "Open Full Guide",
      image: {
        src: "./content/author-guide/13-labs-capture-screens-best-practices/images/screen-captures-general-guidelines.png",
        alt: "General screenshot guidelines reference",
        caption: "The tools layer works best once the workshop content and flow are already stable."
      },
      labs: [
        labFromItem("screenshots", "Screens"),
        labFromItem("optishot", "OptiShot"),
        labFromItem("fixomat", "Fixomat")
      ]
    }),
    makeSection({
      id: "specialized-workflows",
      label: "Section 6",
      title: "Specialized Workflows",
      accent: "ocean",
      summary: "Keep specialized delivery models separate from the normal path so sprints, remote desktop, Marketplace images, and secure desktop do not complicate every workshop by default.",
      purpose: "Use only the specialized cards that match the workshop delivery model you are actually building.",
      highlights: [
        "Finish the core path first unless the delivery model changes the structure from day one.",
        "Open only the specialized workflows that apply.",
        "Return to validation after the specialized setup is stable."
      ],
      sectionHref: guideLabLink("10-create-sprints-workflow"),
      sectionLabel: "Open Full Guide",
      image: {
        src: "./content/author-guide/10-labs-create-sprints-workflow/images/sprints-workflow.png",
        alt: "LiveLabs sprint workflow diagram",
        caption: "Specialized workflows are distinct branches with their own repos, runtime assumptions, and publish steps."
      },
      labs: [
        manualLab({
          id: "guide-sprints",
          label: "Sprint",
          title: "Develop LiveLabs Sprints",
          summary: "Use the sprint workflow when the deliverable is a short sprint instead of a full workshop.",
          steps: [
            "Check the sprint inventory first so you are not rebuilding an existing sprint in parallel.",
            "Fork and clone the sprints repository, then copy the sample sprint structure into the correct domain folder.",
            "Update the sprint manifest, preview the sprint, create the pull request, and request sprint publishing in WMS."
          ],
          checkpoints: [
            "The sprint lives in the correct domain folder and uses sprint-specific metadata.",
            "The sprint publish request carries the correct preview and production context."
          ],
          watchFor: [
            "Using a workshop repository or workshop manifest pattern for sprint work.",
            "Forgetting to connect the WMS request and the pull request back to the sprint flow."
          ],
          snippetMeta: "Sprint URL pattern",
          snippetTitle: "Plan around the sprint production path",
          snippet: [
            "https://oracle-livelabs.github.io/sprints/<domain-folder>/<sprint-folder>/"
          ].join("\n"),
          image: {
            src: "./content/author-guide/10-labs-create-sprints-workflow/images/sprints-workflow.png",
            alt: "Sprint workflow overview",
            caption: "Sprints are a separate delivery model with their own repository and publish flow."
          },
          sourceHref: guideLabLink("10-create-sprints-workflow")
        }),
        manualLab({
          id: "guide-remote-desktop",
          label: "Desktop",
          title: "Set up graphical remote desktop",
          summary: "Use the noVNC workflow when the learner needs a browser-accessible desktop or a preloaded app environment.",
          steps: [
            "Run the documented first-boot and noVNC setup sequence on the host.",
            "Test the desktop launch URLs and clear first-run browser or desktop interruptions before the event.",
            "Update desktop guide URLs, app URLs, and startup behavior before you capture or publish the image."
          ],
          checkpoints: [
            "The remote desktop launches cleanly and opens the intended URLs.",
            "The learner does not see first-run setup screens that should have been cleared earlier."
          ],
          watchFor: [
            "Publishing a desktop image before validating the real browser experience.",
            "Forgetting dependent services and getting 404s when the browser opens."
          ],
          snippetMeta: "Validate these variables",
          snippetTitle: "Remote desktop URL essentials",
          snippet: [
            "desktop_guide_url",
            "desktop_app1_url",
            "desktop_app2_url"
          ].join("\n"),
          image: {
            src: "./content/author-guide/6-labs-setup-graphical-remote-desktop/images/novnc-urls.png",
            alt: "noVNC output with desktop URLs",
            caption: "The desktop URLs are part of the workflow contract and must be validated before image capture."
          },
          sourceHref: guideLabLink("6-labs-setup-graphical-remote-desktop")
        }),
        manualLab({
          id: "guide-marketplace-image",
          label: "Image build",
          title: "Create the Marketplace image",
          summary: "Clean the host, capture the image, update the test stack, and validate the remote desktop before Marketplace review begins.",
          steps: [
            "Clean the host using the documented prep steps before image capture.",
            "Create the custom image and update the compatible shapes exactly as documented.",
            "Update the sample ORM stack with the image OCID and validate the deployed remote desktop."
          ],
          checkpoints: [
            "The image OCID and desktop URLs are updated in the test stack before validation.",
            "The test stack proves the image behaves the way the workshop needs."
          ],
          watchFor: [
            "Skipping the cleanup steps before image capture.",
            "Treating image creation as complete before the ORM stack test succeeds."
          ],
          snippetMeta: "Test-stack variables",
          snippetTitle: "Update these before validation",
          snippet: [
            "instance_image_id",
            "desktop_guide_url",
            "desktop_app1_url",
            "desktop_app2_url"
          ].join("\n"),
          image: {
            src: "./content/author-guide/7-labs-create-custom-image-for-marketplace/images/update-image-ocid.png",
            alt: "Updating the custom image OCID in the test stack",
            caption: "The test stack is the proof point before Marketplace review, not an optional follow-up."
          },
          sourceHref: guideLabLink("7-labs-create-custom-image-for-marketplace")
        }),
        manualLab({
          id: "guide-marketplace-publish",
          label: "Marketplace",
          title: "Publish the image to Oracle Marketplace",
          summary: "Attach the right artifact to the listing, submit the revision, and account for Marketplace review time before LiveLabs can consume it.",
          steps: [
            "Confirm publisher access and create the required terms and artifacts.",
            "Attach the correct image artifact and publish the listing revision or new listing.",
            "Plan for Marketplace review and approval before you expect the image to be usable in LiveLabs."
          ],
          checkpoints: [
            "The correct artifact is attached to the listing revision.",
            "The timeline accounts for Marketplace review, not only LiveLabs review."
          ],
          watchFor: [
            "Trying to use an image in LiveLabs before Marketplace approval exists.",
            "Assuming Marketplace review fits the same turnaround as a normal workshop publish."
          ],
          snippetMeta: "Timing reminder",
          snippetTitle: "Marketplace has its own review window",
          snippet: [
            "Listing review can take several business days.",
            "Do not plan same-day LiveLabs use after a new Marketplace submission."
          ].join("\n"),
          image: {
            src: "./content/author-guide/8-labs-publish-custom-image-to-marketplace/images/publish-listing-1.png",
            alt: "Publish listing action in Oracle Marketplace",
            caption: "Marketplace review and publish time is separate from the normal LiveLabs pull request flow."
          },
          sourceHref: guideLabLink("8-labs-publish-custom-image-to-marketplace")
        }),
        manualLab({
          id: "guide-marketplace-update",
          label: "Sandbox image",
          title: "Update the image on the sandbox environment",
          summary: "Register the image in LiveLabs self-service and then attach that registered image to the workshop publishing entry.",
          steps: [
            "Register the Marketplace listing through the LiveLabs custom image flow with the correct listing name and support contacts.",
            "Add the image metadata such as OCID, version data, and noVNC flags where applicable.",
            "Edit the workshop Sandbox Environment entry and swap the registered image into the right row."
          ],
          checkpoints: [
            "The image is registered before you try to attach it to the workshop.",
            "Support contacts and metadata are set so the right team can maintain the image later."
          ],
          watchFor: [
            "Trying to attach an image that was never registered in LiveLabs self-service.",
            "Leaving support ownership vague and making future maintenance harder."
          ],
          snippetMeta: "Registration essentials",
          snippetTitle: "Bring these fields to image registration",
          snippet: [
            "Listing name",
            "Support contact emails",
            "Image OCID",
            "Version details if relevant",
            "NoVNC enabled?"
          ].join("\n"),
          image: {
            src: "./content/author-guide/12-add-custom-image-to-workshop/images/update-image-4.png",
            alt: "Editing the sandbox image row in WMS",
            caption: "The sandbox image row is where the workshop picks up the registered Marketplace image."
          },
          sourceHref: guideLabLink("12-add-custom-image-to-workshop")
        }),
        labFromItem("secure-desktop-when", "Secure Desktop"),
        labFromItem("secure-desktop-request", "Request")
      ]
    }),
    makeSection({
      id: "help-faq",
      label: "Section 7",
      title: "Help and FAQ",
      accent: "pine",
      summary: "Use this section when the blocker is routing, ownership, support context, or a repeat workflow question that should already have a stable answer.",
      purpose: "This section is intentionally short: first find the right owner, then bring enough context that someone can actually unblock the issue.",
      highlights: [
        "FAQ first for repeat questions.",
        "Use the owner or channel that fits the blocker.",
        "Bring WMS ID, preview URL, and repository or pull request context."
      ],
      sectionHref: guideLabLink("need-help"),
      sectionLabel: "Open Full Guide",
      image: {
        src: "./content/author-guide/5-labs-qa-checks/images/message-team.png",
        alt: "Message the Team option in WMS",
        caption: "Good support routing is mostly about choosing the right owner and carrying enough context."
      },
      labs: [
        labFromItem("need-help", "Support"),
        labFromItem("livelabs-faq", "FAQ"),
        labFromItem("ai-developer-hub", "AI")
      ]
    })
  ];
}());
