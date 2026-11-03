import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PAR_URL = "https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/fake-token-value/n/example/b/qa/o/assets/demo.zip";
const BUILD_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "qa-par-unit-"));
let parAudit;
let sourceDiscovery;

before(async () => {
  fs.writeFileSync(path.join(BUILD_ROOT, "package.json"), JSON.stringify({ type: "module" }));
  const program = ts.createProgram({
    rootNames: [
      path.join(ROOT, "config", "projectConfig.ts"),
      path.join(ROOT, "tests", "support", "parAudit.ts"),
      path.join(ROOT, "tests", "support", "parSourceDiscovery.ts"),
    ],
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      rootDir: ROOT,
      outDir: BUILD_ROOT,
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      types: ["node"],
    },
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => ts.sys.newLine,
    }));
  }
  program.emit();
  parAudit = await import(pathToFileURL(path.join(BUILD_ROOT, "tests", "support", "parAudit.js")).href);
  sourceDiscovery = await import(pathToFileURL(path.join(BUILD_ROOT, "tests", "support", "parSourceDiscovery.js")).href);
});

after(() => fs.rmSync(BUILD_ROOT, { recursive: true, force: true }));

test("collects workshop contacts only from author acknowledgement sections", () => {
  const markdown = `
Contact support@example.com before the lab.

## Acknowledgements

- Ada Author ([ada.author@oracle.com](mailto:ada.author@oracle.com))
- Reviewer: reviewer@oracle.com
- Automation: build-bot@users.noreply.github.com

## Next steps

Ignore next.owner@oracle.com here.
`;
  assert.deepEqual(sourceDiscovery.extractAuthorEmailsFromMarkdown(markdown), [
    "ada.author@oracle.com",
    "reviewer@oracle.com",
  ]);
});

test("collects published author names when acknowledgements contain no email", () => {
  const markdown = `
## Acknowledgements

* **Authors**
    * Kate D'Orazio - Oracle OCI Vision Services
    * Vaishnavi Kotturu - Oracle OCI Vision Services
* **Last Updated By/Date**
    * Someone Else, February 2023
`;
  assert.deepEqual(sourceDiscovery.extractAuthorNamesFromMarkdown(markdown), [
    "Kate D'Orazio - Oracle OCI Vision Services",
    "Vaishnavi Kotturu - Oracle OCI Vision Services",
  ]);
});

test("recognizes and masks OCI PAR URLs", () => {
  assert.equal(parAudit.isParUrl(PAR_URL), true);
  assert.equal(parAudit.isParUrl("https://objectstorage.eu-frankfurt-1.oraclecloud.com/n/example/b/qa/o/demo.zip"), false);
  const masked = parAudit.maskParUrl(PAR_URL + "?download=1");
  assert.match(masked, /\/p\/\*\*\*\//);
  assert.doesNotMatch(masked, /fake-token-value/);
  assert.equal(parAudit.parFingerprint(PAR_URL).length, 16);
  assert.deepEqual(
    (({ region, namespace, bucket, objectName }) => ({ region, namespace, bucket, objectName }))(parAudit.parseParUrl(PAR_URL)),
    { region: "eu-frankfurt-1", namespace: "example", bucket: "qa", objectName: "assets/demo.zip" },
  );
});

test("extracts PAR URLs from rendered text and markup", () => {
  const found = parAudit.extractParUrlsFromText(
    "curl '" + PAR_URL + "' and <a href=\"" + PAR_URL + "?download=1&amp;name=demo\">asset</a> and **[download](" + PAR_URL + "?markdown=1)**",
  );
  assert.equal(found.length, 3);
  assert.ok(found.every((url) => parAudit.isParUrl(url)));
  assert.ok(found.every((url) => !url.endsWith(")**")));
});

test("ignores explicit angle-bracket PAR placeholders without hiding real links", () => {
  const placeholderUrl = "https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/%3Cyour-par-token%3E/n/example/b/qa/o/oci-files.zip";
  const replacementUrl = "https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/%3Creplace-with-par-url%3E/n/example/b/qa/o/oci-files.zip";
  const markdown = [
    "Placeholder: " + placeholderUrl,
    "Replacement: " + replacementUrl,
    "Real autolink: <" + PAR_URL + ">",
    "Download this real link to your computer: " + PAR_URL,
  ].join("\n");
  assert.equal(parAudit.isObviousParPlaceholder(placeholderUrl), true);
  assert.equal(parAudit.isObviousParPlaceholder(replacementUrl), true);
  assert.equal(parAudit.isParUrl(placeholderUrl), false);
  assert.deepEqual(parAudit.extractParUrlsFromText(markdown), [PAR_URL]);
});

test("records the exact Markdown section, line, and safe excerpt for a PAR", () => {
  const markdown = [
    "# Workshop", "", "## Task 8: Install sample data", "", "1. Get sample file", "",
    "    <copy>wget " + PAR_URL + "</copy>",
  ].join("\n");
  const candidates = sourceDiscovery.sourceTextCandidates(markdown, {
    pageType: "tenancy-instructions-lab",
    pageUrl: "https://example.com/index.html?lab=install",
    label: "Lab 2",
    sourceFileUrl: "https://example.com/install.md",
  });
  assert.equal(candidates.length, 1);
  assert.deepEqual(
    (({ sourceLine, section, instruction, searchText, location, sourceExcerpt }) => ({ sourceLine, section, instruction, searchText, location, sourceExcerpt }))(candidates[0].sources[0]),
    {
      sourceLine: 7,
      section: "Task 8: Install sample data",
      instruction: "1. Get sample file",
      searchText: "assets/demo.zip",
      location: "Markdown line 7",
      sourceExcerpt: "wget https://objectstorage.eu-frankfurt-1.oraclecloud.com/p/***/n/example/b/qa/o/assets/demo.zip",
    },
  );
});

test("fails an audit attachment when part of its page crawl was not scanned", () => {
  const audit = parAudit.buildParAuditAttachment("catalog", "Workshop", [], {
    pagesScanned: 2,
    scanErrors: [{ page_type: "preview-instructions", page_url: "https://example.com/instructions", label: "Lab 2", error: "Navigation timed out." }],
  });
  assert.throws(() => parAudit.assertParAuditPassed(audit), /page scan error/i);
});

test("removes PAR tokens, cookies, authorization, and APEX sessions from diagnostics", () => {
  const diagnostic = parAudit.sanitizeDiagnosticMessage(
    "Call log:\n - cookie: private-cookie-value\n - authorization: Bearer private-auth-value\n - GET " + PAR_URL + "?session=12345",
  );
  const nestedSource = parAudit.sanitizeSourceUrl(
    "https://example.com/instructions?session=12345&manifest=" + encodeURIComponent(PAR_URL),
  );
  assert.doesNotMatch(diagnostic, /private-cookie-value|private-auth-value|fake-token-value|session=12345/);
  assert.doesNotMatch(nestedSource, /fake-token-value|session=/);
});
