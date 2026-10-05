// Author-facing examples checked against the LiveLabs template and renderer.
// Keep example text literal: the reference does not execute or render edits.
window.LiveLabsMarkdownSections = [
  {
    "id": "start",
    "title": "Start with a lab and a manifest",
    "description": "A Markdown file holds the instructions. The workshop manifest puts lab files in the order learners follow.",
    "patterns": [
      {
        "id": "lab-skeleton",
        "title": "Copy a starter lab",
        "kind": "livelabs",
        "description": "Save this as lab-1/lab-1.md. Replace the title, objective, time, task, and acknowledgement with your own content.",
        "source": "# Explore your environment\n\n## Introduction\nLearn how to check the environment before starting the workshop.\n\nEstimated Time: 5 minutes\n\n### Objectives\nIn this lab, you will:\n* Confirm that your environment is ready.\n\n### Prerequisites\n* Access to the workshop environment.\n\n## Task 1: Check the environment\n\n1. Open your workshop environment.\n\n    Confirm that the expected home page appears.\n\n## Learn More\n* [Oracle documentation](https://docs.oracle.com/)\n\n## Acknowledgements\n* **Author** - Your name, role\n* **Last Updated By/Date** - Your name, Month Year",
        "result": "One lab title, a short introduction, an objective, and one numbered task with a visible completion check.",
        "notes": [
          "Use exactly one # title. Use ## Task N: Action for tasks, numbered in order.",
          "The workshop introduction uses Estimated Workshop Time:. Individual labs use Estimated Time:.",
          "Keep Acknowledgements at the end. Learn More is optional."
        ],
        "keywords": "template starter introduction objectives prerequisites time acknowledgements"
      },
      {
        "id": "files-and-manifest",
        "title": "Put the lab in the workshop",
        "kind": "livelabs",
        "language": "json",
        "description": "Start with the official sample workshop, which supplies the loader index.html. In workshops/tenancy/manifest.json, list your lab files in learning order.",
        "source": "{\n  \"workshoptitle\": \"My workshop\",\n  \"tutorials\": [\n    {\n      \"title\": \"Introduction\",\n      \"filename\": \"../../introduction/introduction.md\"\n    },\n    {\n      \"title\": \"Lab 1: Explore your environment\",\n      \"filename\": \"../../lab-1/lab-1.md\"\n    }\n  ]\n}",
        "result": "The workshop menu opens Introduction first, followed by Lab 1. Paths are relative to the manifest, not to the Markdown file.",
        "notes": [
          "This is a minimal manifest example. Add the Get Started and Need Help content appropriate to your workshop environment.",
          "Create the referenced introduction and lab files. Keep each lab's images/ and files/ folders beside its .md file.",
          "Use lowercase names with dashes and match filename case exactly. JSON needs straight double quotes and no trailing commas."
        ],
        "links": [
          {
            "label": "Get the official sample workshop",
            "href": "https://github.com/oracle-livelabs/common/tree/main/sample-livelabs-templates/sample-workshop"
          }
        ],
        "keywords": "manifest json workshoptitle tutorials filename folders structure order"
      }
    ]
  },
  {
    "id": "text",
    "title": "Write clear, readable text",
    "description": "Build a simple heading hierarchy, separate paragraphs, and emphasize only what helps the learner act.",
    "patterns": [
      {
        "id": "headings",
        "title": "Headings and hierarchy",
        "kind": "core",
        "description": "Put a space after each # marker. Use # once for the lab title, ## for its sections, and ### for subsections.",
        "source": "# Explore your environment\n\n## Introduction\n\n### Objectives\n\n## Task 1: Check the environment",
        "result": "Headings form a clear outline. In LiveLabs, task headings organize the lab instructions.",
        "notes": [
          "Markdown also recognizes levels #### through ###### and underlined headings made with === or ---. Prefer # headings and the LiveLabs task structure.",
          "Do not use bold paragraphs as substitutes for headings or add a second H1."
        ],
        "keywords": "heading h1 h2 h3 h4 h5 h6 setext space hierarchy"
      },
      {
        "id": "paragraphs",
        "title": "Paragraphs and line breaks",
        "kind": "core",
        "description": "Leave one blank line between paragraphs. Use two trailing spaces or <br> to force a line break.",
        "source": "Open the console.\n\nSelect your compartment.\n\nFirst line ends with two spaces.  \nSecond line appears directly below it.\n\nFirst line uses <br> for the same break.<br>\nSecond line appears directly below it.",
        "result": "Two separate paragraphs, followed by examples of two ways to create a line break: two trailing spaces and <br>.",
        "notes": [
          "A single newline usually continues the same paragraph. Use a blank line for a new paragraph.",
          "Use <br> when an explicit break is clearer; use a normal paragraph break for separate ideas.",
          "Trailing-space cleanup can remove intentional two-space line breaks. Check the rendered result when using that form."
        ],
        "keywords": "paragraph line break br whitespace indent blank line"
      },
      {
        "id": "emphasis",
        "title": "Bold, italic, and strikethrough",
        "kind": "core",
        "description": "Use bold for interface labels and important actions. Use italic sparingly for emphasis.",
        "source": "Select **Create**.\n\nRead the *optional* background information.\n\nThis is ***important context***.\n\nReplace ~~the old value~~ with the new value.\n\nUse a**bold**word or an*italic*word only when necessary.",
        "result": "Create is bold, optional is italic, important context is both, and the old value is struck through.",
        "notes": [
          "_italic_ and __bold__ are alternatives. Prefer asterisks, especially for emphasis inside a word.",
          "Keep spaces outside the markers: **Create**, not ** Create **."
        ],
        "keywords": "bold italic strong strikethrough strike asterisk underscore"
      },
      {
        "id": "quotes-and-rules",
        "title": "Notes, blockquotes, and dividers",
        "kind": "core",
        "description": "Use a short note for context that supports a step. Do not hide a required action in a note.",
        "source": "> **Note:** Keep the browser tab open.\n>\n> This note can have another paragraph.\n>> Nested quotation, when needed.\n\n---\n\nContinue with the next section.",
        "result": "An indented note, a nested quotation, and a horizontal divider before the final paragraph.",
        "notes": [
          "---, ***, and ___ can create a horizontal rule. Leave blank lines around a divider so it is not mistaken for an underlined heading.",
          "A blockquote is a visual note, not a special warning component."
        ],
        "keywords": "blockquote quote nested warning note horizontal rule hr divider"
      }
    ]
  },
  {
    "id": "steps",
    "title": "Turn actions into steps",
    "description": "Use numbered lists for a procedure and bullets for options. Keep supporting content attached to the correct step.",
    "patterns": [
      {
        "id": "ordered-lists",
        "title": "Numbered steps",
        "kind": "core",
        "description": "Write one main action per step. Use a period and exactly one space after the step number.",
        "source": "1. Open the console.\n2. Select your compartment.\n3. Confirm that the resource is listed.",
        "result": "Three sequential actions that end with an observable check.",
        "notes": [
          "Use periods, not 1) markers. Keep task numbers and step numbers in sequence.",
          "Markdown renderers may renumber lists automatically. Write meaningful source numbers so reviews are easy."
        ],
        "keywords": "ordered numbered list sequence procedure"
      },
      {
        "id": "unordered-lists",
        "title": "Bullets and nested lists",
        "kind": "core",
        "description": "Use one bullet style consistently. Indent a nested list by four spaces.",
        "source": "* Console access\n* Workshop files\n    * Sample data\n    * Setup instructions",
        "result": "Two main bullets, with two supporting items under Workshop files.",
        "notes": [
          "-, *, and + can start a bullet list. Avoid switching markers in one list.",
          "Use bullets for choices or prerequisites, not for actions whose order matters."
        ],
        "keywords": "unordered bullets nested dash plus asterisk"
      },
      {
        "id": "step-content",
        "title": "Paragraphs, images, and code inside a step",
        "kind": "livelabs",
        "description": "Indent each supporting paragraph, image, and code fence by four spaces so it stays inside the numbered step.",
        "source": "1. Check the client version.\n\n    Run this command:\n\n    ```bash\n    <copy>\n    oci --version\n    </copy>\n    ```\n\n    Confirm that a version number appears.\n\n    ![Client version shown in a terminal](images/client-version.png)\n\n2. Continue to the next task.",
        "result": "The command, expected result, and screenshot all belong to step 1. Step 2 continues the same procedure.",
        "notes": [
          "Use spaces consistently. A missing indent can detach an image or restart the list.",
          "Create the referenced screenshot or replace the example path before using this snippet."
        ],
        "keywords": "four spaces indentation paragraph inside list nested code image"
      }
    ]
  },
  {
    "id": "code",
    "title": "Show commands and results",
    "description": "Separate what the learner runs from what they should see. Make runnable commands easy to copy.",
    "patterns": [
      {
        "id": "inline-code",
        "title": "Inline code and fenced blocks",
        "kind": "core",
        "description": "Use backticks for filenames, commands, and literal values. Use a fenced block for multiple lines.",
        "source": "Run `oci --version` to check the CLI version.\n\n```text\nExpected output:\nA version number, such as 3.x.x\n```",
        "result": "The inline command has code styling. Expected output appears as a separate block, without a copy control.",
        "notes": [
          "Write a language after the opening fence, such as bash, sql, json, or text.",
          "Label output clearly so the learner does not run it as a command."
        ],
        "keywords": "inline code backtick fenced output language bash sql json"
      },
      {
        "id": "copy-code",
        "title": "Add a LiveLabs copy button",
        "kind": "livelabs",
        "description": "Put balanced <copy> tags inside a fenced code block. Include only the command the learner should copy.",
        "source": "```bash\n<copy>\noci --version\n</copy>\n```",
        "result": "The LiveLabs workshop adds a copy button. The copied text excludes the <copy> tags.",
        "notes": [
          "Do not add a shell prompt, secrets, or expected output inside the copy tags.",
          "Replace placeholders with clear learner instructions. SQL and PL/SQL blocks can append a newline when copied; test the resulting paste in the intended client."
        ],
        "keywords": "copy command code button tags"
      },
      {
        "id": "reveal-code",
        "title": "Reveal an optional answer",
        "kind": "livelabs",
        "description": "Wrap an optional solution in <details> and <summary>. Keep required instructions outside the collapsed panel.",
        "source": "<details>\n<summary>Reveal the command</summary>\n\n```bash\n<copy>\noci --version\n</copy>\n```\n\n</details>",
        "result": "A disclosure control expands to show the copyable command in the workshop.",
        "notes": [
          "Use details/summary, not an invented <reveal> tag.",
          "Preview the block in LiveLabs, especially when nesting it inside a numbered step."
        ],
        "keywords": "reveal details summary hide solution"
      },
      {
        "id": "escape-characters",
        "title": "Show punctuation literally",
        "kind": "core",
        "description": "Put a backslash before punctuation when it should appear as text instead of formatting. Use inline code when showing syntax.",
        "source": "\\*not italic\\*\n\n\\# not a heading\n\n\\[not a link\\]\n\nUse `**bold**` to show the Markdown itself.",
        "result": "The asterisks, heading marker, and brackets are visible as literal characters.",
        "notes": [
          "Do not add backslashes inside code fences just to escape Markdown; fenced content is already literal."
        ],
        "keywords": "escaping characters backslash literal punctuation"
      }
    ]
  },
  {
    "id": "links-media",
    "title": "Add links, screenshots, and video",
    "description": "Tell learners what a link opens and what a screenshot proves. Replace every placeholder path or ID before publishing.",
    "patterns": [
      {
        "id": "links",
        "title": "Descriptive links and references",
        "kind": "core",
        "description": "Use meaningful link text. Use a reference definition when several links share a destination.",
        "source": "[Oracle documentation](https://docs.oracle.com/)\n\n[Read the documentation][docs]\n\n[docs]: https://docs.oracle.com/ \"Oracle documentation\"\n\n<https://docs.oracle.com/>",
        "result": "The first two forms show descriptive link text. The angle-bracket form shows the URL.",
        "notes": [
          "Avoid 'click here'. Encode spaces in destinations as %20, or use filenames without spaces.",
          "Keep the reference definition on its own line. Test every destination."
        ],
        "keywords": "link reference automatic url title spaces percent20 hyperlink"
      },
      {
        "id": "lab-navigation",
        "title": "Navigate between labs",
        "kind": "livelabs",
        "description": "Use LiveLabs navigation tokens for the workshop sequence. A specific lab link uses the lab's URL token.",
        "source": "[Continue to the next lab](#next)\n[Return to the previous lab](#prev)\n[Go to the first lab](#first)\n[Go to the last lab](#last)\n[Open Lab 1](?lab=lab-1)",
        "result": "The workshop loader opens the requested lab. These tokens need the LiveLabs workshop context.",
        "notes": [
          "Replace lab-1 with the actual ?lab= token observed in your workshop URL.",
          "For a heading within a lab, inspect and test its generated anchor. Do not assume GitHub and LiveLabs create the same heading IDs."
        ],
        "keywords": "next prev first last particular lab internal anchor navigation hotlink"
      },
      {
        "id": "downloads",
        "title": "Open or download a supporting file",
        "kind": "livelabs",
        "description": "Keep supporting files in the lab's files/ folder. Add ?download=1 when the learner must save the file.",
        "source": "[Open the sample JSON](files/sample.json)\n[Download the sample data](files/data.csv?download=1)",
        "result": "A normal link opens a browser-renderable file. The download form requests a download through the LiveLabs renderer.",
        "notes": [
          "The examples require the referenced files. Verify the resulting URL in the published workshop.",
          "Use approved external storage for distributed PDFs, ZIPs, or large data bundles. Check access and link expiry.",
          "Use Ctrl/Cmd-click or middle-click for a new tab; do not assume local Markdown links support target=\"_blank\".",
          "For cross-origin files, browser and server behavior can affect downloads. Test the link from the learner page."
        ],
        "keywords": "download files csv zip pdf json question download=1"
      },
      {
        "id": "images",
        "title": "Add a useful screenshot",
        "kind": "core",
        "description": "Write alt text that explains the screenshot's purpose. Keep the image near the action or result it illustrates.",
        "source": "![The resource list shows the new instance](images/instance-ready.png \" \")",
        "result": "The screenshot displays with descriptive alternative text and the workshop's default image treatment.",
        "notes": [
          "Use lowercase filenames with dashes and exact case. Paths are relative to the lab Markdown file.",
          "Avoid blank alt text. Remove personal data, account identifiers, and secrets from screenshots.",
          "Keep essential instructions in text so the image is not the only way to complete the step."
        ],
        "keywords": "image alt title screenshot png accessibility"
      },
      {
        "id": "image-sizing",
        "title": "Size an image without distortion",
        "kind": "livelabs",
        "description": "Use the LiveLabs image-size extension when default sizing does not fit the explanation. An asterisk preserves automatic height.",
        "source": "![Architecture overview](images/architecture.png =50%x*)\n![Architecture overview](images/architecture.png =500x*)\n![Architecture overview](images/architecture.png =500x200)\n![Architecture overview](images/architecture.png =50%x50%)",
        "result": "The first two forms set width and preserve aspect ratio. The other forms set both dimensions and can distort the image.",
        "notes": [
          "Prefer default sizing or automatic height. Check legibility on a narrow screen and use a clear source image.",
          "The workshop template can constrain image size. Check the rendered result rather than assuming a percentage will override the layout."
        ],
        "keywords": "image sizing width height 50% 500 200 75%"
      },
      {
        "id": "video-embeds",
        "title": "Embed a video",
        "kind": "livelabs",
        "description": "Use the provider prefix and the video's ID, not an image link or an ordinary watch URL.",
        "source": "[](youtube:VIDEO_ID)\n[](youtube:VIDEO_ID:small)\n[Overview video](videohub:VIDEO_ID)\n[Overview video](videohub:VIDEO_ID:medium)",
        "result": "LiveLabs replaces the special link with a video player. Replace VIDEO_ID with the real provider ID and test it.",
        "notes": [
          "Use the shown YouTube form for compatibility with workshop validation. Supported sizes include small, medium, and large; small is the default.",
          "A regular [Watch video](https://...) link opens a destination; it does not use the LiveLabs embed syntax.",
          "Check audience access, captions, and a text alternative. Video should support the written lab."
        ],
        "keywords": "youtube videohub video hub embed media recording size"
      },
      {
        "id": "direct-video",
        "title": "Use a direct video file when needed",
        "kind": "livelabs",
        "description": "For an approved hosted video file, prefix the full URL with video:.",
        "source": "[](video:https://example.com/workshop-overview.mp4)",
        "result": "The workshop displays an HTML5 video player after you replace the illustrative URL with an accessible video file.",
        "notes": [
          "MP4 is the documented recommended format. Verify playback, permissions, captions, and link lifetime with the intended audience."
        ],
        "keywords": "direct video mp4 webm ogg object storage"
      }
    ]
  },
  {
    "id": "tables",
    "title": "Compare information in a table",
    "description": "Use a small table when rows and columns help people compare. Keep long procedures in numbered steps.",
    "patterns": [
      {
        "id": "table-alignment",
        "title": "Columns, alignment, and links",
        "kind": "core",
        "description": "Separate cells with pipes. Put colons in the divider row to set left, center, or right alignment.",
        "source": "| Resource | Status | Count |\n| :--- | :---: | ---: |\n| [Documentation](https://docs.oracle.com/) | **Ready** | 2 |\n| `sample.json` | Review | 1 |",
        "result": "Resource aligns left, Status centers, and Count aligns right. Cells can contain links, emphasis, and inline code.",
        "notes": [
          "Include a header row and separator row. Keep the same number of columns in every row.",
          "Keep each link label descriptive so readers know where it leads."
        ],
        "keywords": "table links alignment left right center columns pipe"
      },
      {
        "id": "table-pipes",
        "title": "A literal pipe inside a cell",
        "kind": "core",
        "description": "Escape a pipe when it belongs in a cell instead of starting the next column.",
        "source": "| Character | Meaning |\n| --- | --- |\n| \\| | A literal pipe |",
        "result": "The first data cell contains a pipe character, and the row keeps two columns.",
        "notes": [
          "Preview tables in the workshop and on mobile. Use short column labels and avoid wide, dense tables."
        ],
        "keywords": "table escape pipe backslash"
      },
      {
        "id": "table-caption",
        "title": "Give a table a caption",
        "kind": "livelabs",
        "description": "Add a title immediately after the final table row. LiveLabs supplies the table number.",
        "source": "| Resource | Status |\n| --- | --- |\n| Instance | Ready |\n{: title=\"Resource status\"}",
        "result": "The workshop displays a numbered table caption with the title Resource status.",
        "notes": [
          "Keep the caption next to its table and verify numbering in the assembled lab."
        ],
        "keywords": "table caption title numbering"
      }
    ]
  },
  {
    "id": "reuse",
    "title": "Reuse content and choose a variant",
    "description": "These features need both Markdown and manifest configuration. Keep the two in sync, then test each workshop variant.",
    "patterns": [
      {
        "id": "include-content",
        "title": "Include a shared Markdown file",
        "kind": "livelabs",
        "description": "Insert a shortname in Markdown, then map the same shortname to a file in the manifest.",
        "source": "[](include:shared-prerequisites)",
        "result": "LiveLabs replaces the include marker with the mapped content when it loads the lab.",
        "notes": [
          "Add the mapping shown in the next example to the same workshop manifest.",
          "Resolve include paths from the manifest location. Make sure all images and links in the included content resolve correctly."
        ],
        "keywords": "include shortname shared reuse"
      },
      {
        "id": "include-mapping",
        "title": "Map the include in the manifest",
        "kind": "livelabs",
        "language": "json",
        "description": "Merge this property into your existing manifest. This fragment is not a complete manifest.",
        "source": "{\n  \"include\": {\n    \"shared-prerequisites\": \"../../shared/prerequisites.md\"\n  }\n}",
        "result": "The shortname shared-prerequisites resolves to shared/prerequisites.md relative to workshops/tenancy/manifest.json.",
        "notes": [
          "Create the shared file and keep workshoptitle and tutorials in the full manifest.",
          "Include mappings belong at the top level of the manifest."
        ],
        "keywords": "include manifest mapping filename shortname json"
      },
      {
        "id": "conditional-content",
        "title": "Write conditional instructions",
        "kind": "livelabs",
        "description": "Use <if> blocks for content that differs between workshop variants. Match the type value to the manifest setting.",
        "source": "<if type=\"python\">\nUse the Python instructions.\n</if>\n\n<if type=\"r\">\nUse the R instructions.\n</if>",
        "result": "A workshop configured with type python displays the Python block and excludes the R block.",
        "notes": [
          "Use straight quotes around the type value.",
          "Test every type. Keep shared steps outside the conditional blocks."
        ],
        "keywords": "if conditional python r environment variant type"
      },
      {
        "id": "conditional-manifest",
        "title": "Select the variant in the manifest",
        "kind": "livelabs",
        "language": "json",
        "description": "Set type on the lab's entry inside tutorials. This complete minimal example selects the Python content in Lab 1.",
        "source": "{\n  \"workshoptitle\": \"My workshop\",\n  \"tutorials\": [\n    {\n      \"title\": \"Introduction\",\n      \"filename\": \"../../introduction/introduction.md\"\n    },\n    {\n      \"title\": \"Lab 1: Explore your environment\",\n      \"filename\": \"../../lab-1/lab-1.md\",\n      \"type\": \"python\"\n    }\n  ]\n}",
        "result": "The renderer reads this tutorial's type and selects matching <if> blocks in that lab.",
        "notes": [
          "Keep type inside the tutorial entry, not at the top level of the manifest.",
          "For a fixed variant, use a matching string such as python. Advanced workshops can use a type object to offer selectable language tabs; consult the full authoring guide."
        ],
        "keywords": "type conditional manifest python r json"
      },
      {
        "id": "variable-config",
        "title": "Configure reusable values",
        "kind": "livelabs",
        "language": "json",
        "description": "For repeated values, merge a variables property into the manifest. It lists JSON files relative to the manifest.",
        "source": "{\n  \"variables\": [\n    \"../../variables/variables.json\"\n  ]\n}",
        "result": "The loader reads the values file before replacing variable markers in the lab.",
        "notes": [
          "This is a property fragment, not a complete manifest. Keep workshoptitle and tutorials.",
          "For this path, create variables/variables.json at the workshop root with the content shown next."
        ],
        "keywords": "variables manifest reusable values json configuration"
      },
      {
        "id": "variable-values",
        "title": "Define a value and use it in Markdown",
        "kind": "livelabs",
        "language": "json",
        "description": "Save this object in variables/variables.json. In your lab, write: Connect to **[](var:database_name)**.",
        "source": "{\n  \"database_name\": \"WORKSHOPDB\"\n}",
        "result": "The learner sees: Connect to WORKSHOPDB, with the database name in bold.",
        "notes": [
          "The variable name must match exactly. Use valid JSON with straight quotes and commas between properties.",
          "Variables are published content, not a secure place for passwords or tokens."
        ],
        "keywords": "var database_name substitution variables placeholder"
      },
      {
        "id": "building-blocks",
        "title": "Use maintained building blocks",
        "kind": "livelabs",
        "description": "Check the shared building-block library before duplicating a common provisioning or setup procedure.",
        "result": "A maintained block can keep repeated instructions consistent across workshops.",
        "notes": [
          "Follow the block's own setup instructions and required variables. Verify its dependencies, included images, and expected environment.",
          "Read the assembled lab from beginning to end. Reused content still needs to fit the learner's task and prerequisites."
        ],
        "links": [
          {
            "label": "Browse LiveLabs building blocks",
            "href": "https://github.com/oracle-livelabs/common/tree/main/building-blocks"
          },
          {
            "label": "Author with building blocks",
            "href": "https://github.com/oracle-livelabs/common/blob/main/building-blocks/how-to-author-with-blocks/how-to-author-with-blocks.md"
          }
        ],
        "keywords": "building blocks tasks reusable maintained include variables"
      }
    ]
  },
  {
    "id": "validate",
    "title": "Preview, check, and publish",
    "description": "A correct-looking snippet is only a starting point. Test the assembled workshop through the same loader your learners use.",
    "patterns": [
      {
        "id": "preview-qa",
        "title": "Preview the workshop and run QA",
        "kind": "livelabs",
        "description": "Serve the workshop folder over HTTP, for example with VS Code Live Server. Open workshops/tenancy/index.html rather than the .md file.",
        "source": "http://127.0.0.1:5500/workshops/tenancy/index.html?qa=true\nhttp://127.0.0.1:5500/workshops/tenancy/index.html?lab=lab-1&qa=true",
        "language": "text",
        "result": "The workshop loader renders the lab, and ?qa=true enables the available QA checks. Use &qa=true when a query already exists.",
        "notes": [
          "Use your server's actual port and the correct workshop variant. qa=true enables checks; it is not a pass certificate.",
          "Run the documented Markdown validator, fix findings, and repeat the full learner procedure.",
          "Check task order, code copy, includes, conditions, downloads, images, videos, links, and narrow-screen readability."
        ],
        "links": [
          {
            "label": "Open the LiveLabs Markdown authoring guide",
            "href": "https://oracle-livelabs.github.io/common/sample-livelabs-templates/create-labs/labs/workshops/livelabs/?lab=4-labs-markdown-develop-content"
          }
        ],
        "keywords": "qa=true lintchecker live server preview validation publish vscode"
      },
      {
        "id": "final-checks",
        "title": "Check paths, access, and safe examples",
        "kind": "livelabs",
        "description": "Before review, test from the intended learner environment and compare the page with the source files.",
        "result": "Every link and asset works, instructions follow the actual product, and no example exposes private information.",
        "notes": [
          "Match file and folder case exactly. A path that works on Windows can fail on a case-sensitive host.",
          "Remove passwords, tokens, private keys, personal information, and sensitive identifiers from text, code, files, and screenshots.",
          "Verify file downloads and media access without relying on your author permissions. Check externally hosted links for expiry.",
          "Confirm the commands produce the stated results, acknowledgements are current, and reused material has appropriate attribution.",
          "Follow the guide's review and publication process after local QA."
        ],
        "links": [
          {
            "label": "Continue to review and publication",
            "href": "../quickstart/#step-3"
          }
        ],
        "keywords": "security case sensitive trusted content checks publish review access secrets"
      },
      {
        "id": "unsupported-extensions",
        "title": "Do not assume every Markdown extension works",
        "kind": "caution",
        "description": "Some Markdown tools support extra syntax that the checked LiveLabs renderer does not enable. Check compatibility before using it in a lab.",
        "source": "==highlighted text==\nH~2~O\nx^2^\nA footnote[^1]\n\n[^1]: Footnote text\n\nTerm\n: Definition\n\n- [ ] A task checkbox",
        "result": "These forms may remain literal text instead of a highlight, subscript, superscript, footnote, definition list, or checkbox.",
        "notes": [
          "Use supported emphasis, normal text such as H2O or x squared, descriptive reference links, and plain bullets instead.",
          "Task headings (## Task 1: ...) are a LiveLabs feature; checkbox task-list syntax is a different feature.",
          "Test any additional syntax in the actual workshop before teaching or publishing it."
        ],
        "keywords": "unsupported extended highlight mark subscript superscript footnote definition task checkbox checklist"
      }
    ]
  }
];
