import fs from 'node:fs';
import path from 'node:path';
import { writeSummaryFiles } from '../vendor/marco-qa/reporters/root-summary-reporter.mjs';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Provide normalized summary and a new output directory.');
const summary = JSON.parse(fs.readFileSync(input, 'utf8'));
writeSummaryFiles(output, summary, path.dirname(output));
for (const name of ['summary.html', 'retest-list.html']) {
  let html = fs.readFileSync(path.join(output, name), 'utf8');
  html = html.replace(/<script src="hub-client.js"><\/script>/g, '<script src="/admin-assets/jenkins-report-bridge.js"></script>')
    .replace('</head>', '<link rel="stylesheet" href="/admin-assets/jenkins-report-theme.css"></head>')
    .replace(/href="\/[^\"]*\/index.html"/g, 'href="/admin/jenkins/history"')
    .replace(/href="\/"/g, 'href="/admin/dashboard-management"')
    .replace(/QA Hub home/g, 'Analytics Admin')
    .replace(/fetch\("\/api\/par-link\/resolve"/g, 'fetch("/api/admin/jenkins/par-link/resolve"')
    .replace(/livelabs-qa-review-lists:v1/g, 'livelabs-analytics-admin-qa-review:v1');
  // Do not pass report data into markup: the upstream renderer escapes it. The notice is fixed text.
  html = html.replace(/(<body[^>]*>)/, '$1<div class="analytics-archive-notice">Saved Jenkins report · No new checks executed. Screenshot and trace files are not included.</div>');
  fs.writeFileSync(path.join(output, name), html);
}
