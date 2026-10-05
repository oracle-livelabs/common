export const roles = {
  user: {
    label: 'User',
    description: 'Reviews QA health, evidence, and reports without changing operational records.',
    permissions: ['view', 'export_reports']
  },
  admin: {
    label: 'Admin',
    description: 'Manages users, demo data, monitors, watchdog records, and local audit evidence.',
    permissions: [
      'view',
      'export_reports',
      'manage_users',
      'manage_watchdog',
      'configure_monitors',
      'manage_demo_data',
      'manage_github_intake',
      'manage_knowledge_base',
      'view_admin_console'
    ]
  }
}

export const futureRoles = [
  { label: 'Viewer', purpose: 'Read dashboards, reports, and public evidence.' },
  { label: 'QA Analyst', purpose: 'Triage alerts, add notes, and attach evidence.' },
  { label: 'Domain Owner', purpose: 'Own and update records for assigned domains.' },
  { label: 'Admin', purpose: 'Manage users, monitors, permissions, and settings.' }
]

export const navigation = [
  { id: 'command-center', label: 'Command Center', help: 'Triage-first overview of active risk, health, evidence, and decisions.' },
  { id: 'operations', label: 'QA Operations', help: 'Watchdog, health monitor, automation runs, and domain quality areas.' },
  { id: 'github-intake', label: 'GitHub Intake', help: 'PRs, issues, logs, and review history for repository-driven QA work.' },
  { id: 'knowledge-base', label: 'Knowledge Base', help: 'Notebook-style source intake for files, links, summaries, and QA review notes.' },
  { id: 'test-management', label: 'Test Management', help: 'Launch point for the linked LiveLabs TMS prototype.' },
  { id: 'reports', label: 'Reports', help: 'Demo report templates and local Markdown or JSON exports.' },
  { id: 'admin-console', label: 'Admin Console', help: 'Users, roles, sources, monitors, demo data, and audit events.' }
]

export const watchdogTabs = [
  { id: 'alerts', label: 'Alerts' },
  { id: 'logs', label: 'Logs' },
  { id: 'monitors', label: 'Monitors' },
  { id: 'incidents', label: 'Incidents' }
]

export const seedUsers = [
  {
    id: 'usr-admin',
    name: 'QA Hub Admin',
    email: 'admin@livelabs.qa',
    password: 'admin123',
    role: 'admin',
    status: 'active',
    team: 'LiveLabs QA'
  },
  {
    id: 'usr-user',
    name: 'QA Hub User',
    email: 'user@livelabs.qa',
    password: 'user123',
    role: 'user',
    status: 'active',
    team: 'Content QA'
  }
]

export const seedSources = [
  { id: 'src-jira', name: 'Jira LDA', type: 'PM system', freshnessMinutes: 36, confidence: 'Confirmed', owner: 'PM Ops', status: 'Demo read-only' },
  { id: 'src-ci', name: 'QA Automation CI', type: 'CI/CD', freshnessMinutes: 18, confidence: 'Confirmed', owner: 'Automation QA', status: 'Demo artifact' },
  { id: 'src-analytics', name: 'LiveLabs Analytics', type: 'Analytics JSON', freshnessMinutes: 125, confidence: 'Needs Review', owner: 'Analytics QA', status: 'Stale demo' },
  { id: 'src-livestack', name: 'LiveStack Validation', type: 'Guide validation', freshnessMinutes: 64, confidence: 'Inferred', owner: 'LiveStack QA', status: 'Demo evidence' },
  { id: 'src-platform', name: 'LiveLabs Platform Checks', type: 'Platform smoke', freshnessMinutes: 12, confidence: 'Confirmed', owner: 'Platform QA', status: 'Demo pass' },
  { id: 'src-wms', name: 'WMS/TMS Readiness', type: 'Publishing process', freshnessMinutes: 240, confidence: 'Stale', owner: 'Content Ops', status: 'Needs refresh' },
  { id: 'src-manual', name: 'Manual QA Review', type: 'Human review', freshnessMinutes: 20, confidence: 'Confirmed', owner: 'LiveLabs QA', status: 'Demo note' }
]

export const seedEvidence = [
  {
    id: 'ev-usage-drop',
    title: 'Candidate workshop usage delta crossed review threshold',
    type: 'Analytics finding',
    sourceId: 'src-analytics',
    timestamp: '2026-05-26 10:20',
    freshnessMinutes: 125,
    confidence: 'Needs Review',
    summary: 'Workshop and sprint starts dropped enough to require ownership review.',
    link: 'demo://analytics/usage-delta'
  },
  {
    id: 'ev-livestack-guide',
    title: 'LiveStack guide parity review is incomplete',
    type: 'Guide validation',
    sourceId: 'src-livestack',
    timestamp: '2026-05-26 09:42',
    freshnessMinutes: 64,
    confidence: 'Inferred',
    summary: 'Desktop and tenancy guide variants need parity review before promotion.',
    link: 'demo://livestack/guide-parity'
  },
  {
    id: 'ev-platform-smoke',
    title: 'Public catalog smoke recovered after retry',
    type: 'CI smoke',
    sourceId: 'src-ci',
    timestamp: '2026-05-25 17:15',
    freshnessMinutes: 18,
    confidence: 'Confirmed',
    summary: 'HTTP health retry passed after one transient failure.',
    link: 'demo://ci/run-2198'
  },
  {
    id: 'ev-link-failure',
    title: 'Content link validation failed on workshop set',
    type: 'Automation artifact',
    sourceId: 'src-ci',
    timestamp: '2026-05-26 10:48',
    freshnessMinutes: 44,
    confidence: 'Confirmed',
    summary: 'Broken link report was generated and needs content-owner triage.',
    link: 'demo://ci/broken-links'
  },
  {
    id: 'ev-wms-stale',
    title: 'WMS/TMS process snapshot is stale',
    type: 'Process readiness',
    sourceId: 'src-wms',
    timestamp: '2026-05-26 07:10',
    freshnessMinutes: 240,
    confidence: 'Stale',
    summary: 'Publishing-readiness source has not refreshed within the review threshold.',
    link: 'demo://wms/readiness'
  }
]

export const seedMonitors = [
  {
    id: 'mon-usage',
    name: 'Usage anomaly threshold',
    domain: 'Usage Metrics',
    status: 'Risk',
    cadence: 'Hourly',
    threshold: '15% drop or 2 stale periods',
    owner: 'Analytics QA',
    sourceId: 'src-analytics',
    escalation: 'Create watchdog alert and assign analytics owner.',
    lastRun: '2026-05-26 10:20',
    nextRun: '2026-05-26 11:20'
  },
  {
    id: 'mon-livestack',
    name: 'LiveStack guide parity',
    domain: 'LiveStack QA',
    status: 'Watch',
    cadence: 'Daily',
    threshold: 'All guide variants must pass validation',
    owner: 'LiveStack QA',
    sourceId: 'src-livestack',
    escalation: 'Route guide gaps to LiveStack owner.',
    lastRun: '2026-05-26 09:42',
    nextRun: '2026-05-27 09:42'
  },
  {
    id: 'mon-platform-smoke',
    name: 'Platform smoke health',
    domain: 'Platform',
    status: 'Operational',
    cadence: '30 min',
    threshold: '2 consecutive smoke failures',
    owner: 'Platform QA',
    sourceId: 'src-platform',
    escalation: 'Open platform incident if retry fails.',
    lastRun: '2026-05-26 10:58',
    nextRun: '2026-05-26 11:28'
  },
  {
    id: 'mon-wms',
    name: 'WMS/TMS freshness',
    domain: 'Platform And Content',
    status: 'Stale',
    cadence: 'Daily',
    threshold: 'Freshness above 180 minutes',
    owner: 'Content Ops',
    sourceId: 'src-wms',
    escalation: 'Request publishing-readiness refresh.',
    lastRun: '2026-05-26 07:10',
    nextRun: '2026-05-27 07:10'
  }
]

export const seedWatchEvents = [
  {
    id: 'wd-001',
    title: 'Workshop usage anomaly needs review',
    domain: 'Usage Metrics',
    severity: 'High',
    status: 'New',
    owner: 'Analytics QA',
    sourceId: 'src-analytics',
    monitorId: 'mon-usage',
    evidenceIds: ['ev-usage-drop'],
    nextAction: 'Confirm whether usage drop is source-data drift, content relevance, or platform launch issue.',
    tmsLinks: [
      { type: 'requirement', id: 'REQ-004', label: 'Usage anomaly requirement' },
      { type: 'test-case', id: 'TC-004', label: 'Usage anomaly test' },
      { type: 'plan', id: 'TP-2026-05', label: 'May readiness plan' }
    ],
    updated: '2026-05-26 10:20',
    incident: true,
    timeline: [
      '2026-05-26 10:20 - Monitor detected usage delta.',
      '2026-05-26 10:24 - Watchdog alert created for analytics owner.'
    ]
  },
  {
    id: 'wd-002',
    title: 'LiveStack guide validation gap',
    domain: 'LiveStack QA',
    severity: 'Medium',
    status: 'Investigating',
    owner: 'LiveStack owner',
    sourceId: 'src-livestack',
    monitorId: 'mon-livestack',
    evidenceIds: ['ev-livestack-guide'],
    nextAction: 'Compare desktop, sandbox, and tenancy guide variants and attach validation evidence.',
    tmsLinks: [
      { type: 'requirement', id: 'REQ-002', label: 'LiveStack readiness requirement' },
      { type: 'test-case', id: 'TC-002', label: 'LiveStack guide test' },
      { type: 'execution', id: 'EX-002', label: 'Blocked execution' }
    ],
    updated: '2026-05-26 09:42',
    incident: false,
    timeline: [
      '2026-05-26 09:42 - Guide validation flagged parity gap.',
      '2026-05-26 09:55 - LiveStack owner started review.'
    ]
  },
  {
    id: 'wd-003',
    title: 'Catalog smoke check recovered after retry',
    domain: 'Platform',
    severity: 'Low',
    status: 'Mitigated',
    owner: 'Platform QA',
    sourceId: 'src-ci',
    monitorId: 'mon-platform-smoke',
    evidenceIds: ['ev-platform-smoke'],
    nextAction: 'Keep watch for repeated transient failures before opening an incident.',
    tmsLinks: [
      { type: 'test-case', id: 'TC-001', label: 'Catalog search test' },
      { type: 'execution', id: 'EX-001', label: 'Passed smoke execution' }
    ],
    updated: '2026-05-25 17:15',
    incident: false,
    timeline: [
      '2026-05-25 17:12 - First public catalog check failed.',
      '2026-05-25 17:15 - Retry passed and alert moved to mitigated.'
    ]
  },
  {
    id: 'wd-004',
    title: 'WMS/TMS readiness source is stale',
    domain: 'Platform And Content',
    severity: 'Medium',
    status: 'New',
    owner: 'Content Ops',
    sourceId: 'src-wms',
    monitorId: 'mon-wms',
    evidenceIds: ['ev-wms-stale'],
    nextAction: 'Refresh publishing-readiness source before using it for release decisions.',
    tmsLinks: [
      { type: 'requirement', id: 'REQ-003', label: 'Content integrity requirement' },
      { type: 'test-case', id: 'TC-003', label: 'Link validation test' },
      { type: 'execution', id: 'EX-003', label: 'Failed link execution' }
    ],
    updated: '2026-05-26 07:10',
    incident: true,
    timeline: [
      '2026-05-26 07:10 - Freshness threshold exceeded.',
      '2026-05-26 10:00 - Needs content-ops confirmation.'
    ]
  }
]

export const seedHealthChecks = [
  {
    id: 'hl-001',
    domain: 'Platform',
    name: 'LiveLabs platform smoke',
    status: 'Operational',
    owner: 'Platform QA',
    cadence: '30 min',
    score: 98,
    freshnessMinutes: 12,
    lastRun: '2026-05-26 10:58',
    nextRun: '2026-05-26 11:28',
    sourceId: 'src-platform',
    evidenceId: 'ev-platform-smoke',
    reason: 'Latest platform check passed after prior retry.'
  },
  {
    id: 'hl-002',
    domain: 'LiveStack QA',
    name: 'LiveStack guide parity',
    status: 'Watch',
    owner: 'LiveStack QA',
    cadence: 'Daily',
    score: 82,
    freshnessMinutes: 64,
    lastRun: '2026-05-26 09:42',
    nextRun: '2026-05-27 09:42',
    sourceId: 'src-livestack',
    evidenceId: 'ev-livestack-guide',
    reason: 'Guide variants need parity confirmation.'
  },
  {
    id: 'hl-003',
    domain: 'Platform And Content',
    name: 'Content link validation',
    status: 'Risk',
    owner: 'Content QA',
    cadence: 'Hourly',
    score: 76,
    freshnessMinutes: 44,
    lastRun: '2026-05-26 10:48',
    nextRun: '2026-05-26 11:48',
    sourceId: 'src-ci',
    evidenceId: 'ev-link-failure',
    reason: 'Content link validation failed and needs owner triage.'
  },
  {
    id: 'hl-004',
    domain: 'Automation Runs',
    name: 'Automation run health',
    status: 'Watch',
    owner: 'Automation QA',
    cadence: 'Hourly',
    score: 87,
    freshnessMinutes: 35,
    lastRun: '2026-05-26 10:35',
    nextRun: '2026-05-26 11:35',
    sourceId: 'src-ci',
    evidenceId: 'ev-link-failure',
    reason: 'One validation lane failed while smoke remained healthy.'
  },
  {
    id: 'hl-005',
    domain: 'Usage Metrics',
    name: 'Workshop usage anomaly',
    status: 'Risk',
    owner: 'Analytics QA',
    cadence: 'Hourly',
    score: 71,
    freshnessMinutes: 125,
    lastRun: '2026-05-26 10:20',
    nextRun: '2026-05-26 11:20',
    sourceId: 'src-analytics',
    evidenceId: 'ev-usage-drop',
    reason: 'Usage source is stale and shows a threshold-crossing delta.'
  },
  {
    id: 'hl-006',
    domain: 'Sprint Ops',
    name: 'Sprint readiness aging',
    status: 'Operational',
    owner: 'PM Ops',
    cadence: 'Daily',
    score: 91,
    freshnessMinutes: 45,
    lastRun: '2026-05-26 10:25',
    nextRun: '2026-05-27 10:25',
    sourceId: 'src-jira',
    evidenceId: 'ev-platform-smoke',
    reason: 'No blocked sprint QA item is beyond the demo threshold.'
  },
  {
    id: 'hl-007',
    domain: 'Platform And Content',
    name: 'WMS/TMS readiness freshness',
    status: 'Stale',
    owner: 'Content Ops',
    cadence: 'Daily',
    score: 62,
    freshnessMinutes: 240,
    lastRun: '2026-05-26 07:10',
    nextRun: '2026-05-27 07:10',
    sourceId: 'src-wms',
    evidenceId: 'ev-wms-stale',
    reason: 'Publishing-readiness source has exceeded the freshness threshold.'
  }
]

export const seedAutomationRuns = [
  { id: 'run-2198', name: 'Public catalog smoke', status: 'Passed', scope: 'Platform', artifact: 'html-report/index.html', sourceId: 'src-ci', updated: '18 min', evidenceId: 'ev-platform-smoke', owner: 'Platform QA' },
  { id: 'run-2197', name: 'Content link validation', status: 'Failed', scope: 'Workshops', artifact: 'broken-links.json', sourceId: 'src-ci', updated: '44 min', evidenceId: 'ev-link-failure', owner: 'Content QA' },
  { id: 'run-2196', name: 'LiveStack bundle smoke', status: 'Needs Review', scope: 'LiveStack', artifact: 'bundle-validation.md', sourceId: 'src-livestack', updated: '1 hr', evidenceId: 'ev-livestack-guide', owner: 'LiveStack QA' },
  { id: 'run-2195', name: 'Accessibility scan', status: 'Passed', scope: 'Hub shell', artifact: 'a11y-summary.json', sourceId: 'src-ci', updated: '2 hr', evidenceId: 'ev-platform-smoke', owner: 'Automation QA' }
]

export const seedReports = [
  { id: 'rep-daily', title: 'Daily QA Health', audience: 'PM and QA leads', domains: ['Platform', 'Usage Metrics', 'Automation Runs'], format: 'Markdown' },
  { id: 'rep-release', title: 'Release Readiness', audience: 'Release owners', domains: ['Platform And Content', 'LiveStack QA', 'Sprint Ops'], format: 'Markdown' },
  { id: 'rep-automation', title: 'Automation Failures', audience: 'Automation and platform owners', domains: ['Automation Runs', 'Platform'], format: 'JSON' },
  { id: 'rep-content', title: 'Content Risk', audience: 'Content owners', domains: ['Platform And Content', 'Usage Metrics'], format: 'Markdown' },
  { id: 'rep-livestack', title: 'LiveStack Readiness', audience: 'LiveStack owners', domains: ['LiveStack QA'], format: 'Markdown' }
]

export const seedGithubItems = [
  {
    id: 'gh-pr-613',
    type: 'Pull Request',
    title: 'Full Guide redirect and sample workshop validation',
    repo: 'oracle-livelabs/common',
    status: 'Needs QA Review',
    owner: 'Author Guide',
    updated: '2026-05-26 10:35',
    signal: 'Preview links and redirect behavior require smoke validation.',
    link: 'demo://github/pr-613',
    tmsLinks: [
      { type: 'test-case', id: 'TC-003', label: 'Published link validation' },
      { type: 'plan', id: 'TP-CONTENT-05', label: 'Content regression plan' }
    ],
    history: ['Branch synced with upstream', 'Local review server used', 'Pending final PR page validation']
  },
  {
    id: 'gh-analytics-admin',
    type: 'Issue',
    title: 'Analytics admin QA exception controls',
    repo: 'oracle-livelabs/common/livelabs-analytics',
    status: 'Validated',
    owner: 'Analytics QA',
    updated: '2026-05-26 11:11',
    signal: 'Disabled workshops retained but no longer eligible for exception badges.',
    link: 'demo://github/analytics-admin',
    tmsLinks: [
      { type: 'requirement', id: 'REQ-004', label: 'Usage ownership requirement' },
      { type: 'test-case', id: 'TC-004', label: 'Usage monitor test' }
    ],
    history: ['Script syntax parsed', '183 JSON files parsed', 'Headless Chrome smoke passed']
  },
  {
    id: 'gh-qa-framework',
    type: 'Log',
    title: 'QA automation framework cleanup',
    repo: 'oracle-livelabs/common/qa-automation',
    status: 'Ready',
    owner: 'Automation QA',
    updated: '2026-05-25 11:47',
    signal: 'Lean Playwright setup validated with doctor, collect, and typecheck gates.',
    link: 'demo://github/qa-framework',
    tmsLinks: [
      { type: 'test-case', id: 'TC-003', label: 'Automation link test' },
      { type: 'execution', id: 'EX-003', label: 'Failed execution evidence' }
    ],
    history: ['Removed future-only bloat', 'Docs refreshed', 'HTTP health retry passed']
  }
]

export const seedKnowledgeItems = [
  {
    id: 'kb-analytics-exclusion',
    title: 'Analytics QA exclusion criteria',
    type: 'Dashboard rule note',
    status: 'Reviewed',
    owner: 'Analytics QA',
    updated: '2026-05-26',
    source: 'LiveLabs Analytics admin review',
    link: '../livelabs-analytics/admin/',
    summary: 'QA exclusion should use age, staleness, demand, and score thresholds, with item-level overrides for workshops and sprints.',
    nextAction: 'Promote accepted criteria into the analytics admin configuration backlog.',
    extractedFacts: ['Default QA exclusion is off for static Pages review.', 'Item-level overrides can mark selected candidate rows as QA Excluded.', 'Future OCI/ADB version needs shared config persistence.'],
    relatedSignals: ['Analytics', 'Governance', 'TMS']
  },
  {
    id: 'kb-author-guide-release',
    title: 'Author Guide release feedback',
    type: 'Feedback file',
    status: 'Needs Source Refresh',
    owner: 'Content QA',
    updated: '2026-05-25',
    source: 'New Author Guide review notes',
    link: '../new-author-guide/',
    summary: 'Feedback maps to quickstart clarity, cheatsheet lookup, sample workshop flow, and demo-first navigation.',
    nextAction: 'Attach feedback source and keep a traceability row for each accepted change.',
    extractedFacts: ['Demo should appear before labs in the sample workshop menu.', 'Quickstart and cheatsheet serve different author workflows.', 'Automated link and mobile checks should run before push.'],
    relatedSignals: ['Content', 'Authoring', 'GitHub']
  },
  {
    id: 'kb-private-auth-runbook',
    title: 'Private page automation access',
    type: 'Runbook',
    status: 'New',
    owner: 'Automation QA',
    updated: '2026-05-26',
    source: 'QA automation runbook',
    link: '../qa-automation/docs/runbooks/authenticated-page-access.md',
    summary: 'Authenticated page testing should use approved storage state or a test-only session bootstrap endpoint, not copied session URLs.',
    nextAction: 'Review with platform owner before enabling CI private-page smoke tests.',
    extractedFacts: ['Storage state files are ignored and must not be committed.', 'Bootstrap token must live in a local or CI secret.', 'Ready text should confirm the app is past SSO.'],
    relatedSignals: ['Automation', 'Platform', 'Security']
  }
]

export const seedAuditEvents = [
  {
    id: 'aud-seed',
    actor: 'System',
    action: 'Seeded V3 demo state',
    target: 'Demo workspace',
    detail: 'Local-only seeded data loaded for review.',
    timestamp: '2026-05-26 11:00'
  }
]

export const sectionSummaries = {
  'livestack-qa': {
    title: 'LiveStack QA',
    description: 'Guide, bundle, runtime, container, ORDS, and validation evidence for LiveStack work.',
    points: ['Guide parity is on watch', 'Bundle smoke needs owner review', 'Runtime checks should capture Podman and host-local paths']
  },
  'platform-content': {
    title: 'Platform And Content QA',
    description: 'Catalog, search, launch, metadata, WMS/TMS, and content quality risk.',
    points: ['Content link validation failed', 'WMS/TMS freshness is stale', 'Publishing risks should route to Sprint Ops']
  },
  'usage-metrics': {
    title: 'Usage Metrics',
    description: 'Workshop starts, sprint usage, adoption patterns, anomaly detection, and at-risk content signals.',
    points: ['Usage anomaly threshold crossed', 'Analytics source is stale', 'At-risk content should link to owner queue']
  },
  'sprint-ops': {
    title: 'Sprint Ops',
    description: 'Sprint procedure health, owner response, blockers, readiness gates, and QA task drift.',
    points: ['Track aging blockers', 'Expose missing owners', 'Prepare release readiness evidence']
  }
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function getSeedState() {
  return {
    version: 3,
    users: clone(seedUsers),
    sources: clone(seedSources),
    evidence: clone(seedEvidence),
    monitors: clone(seedMonitors),
    watchEvents: clone(seedWatchEvents),
    healthChecks: clone(seedHealthChecks),
    automationRuns: clone(seedAutomationRuns),
    reports: clone(seedReports),
    githubItems: clone(seedGithubItems),
    knowledgeItems: clone(seedKnowledgeItems),
    auditEvents: clone(seedAuditEvents),
    reportExports: []
  }
}

export function can(role, permission) {
  return Boolean(roles[role]?.permissions.includes(permission))
}

export function getSafeUser(user) {
  if (!user) {
    return null
  }
  const { password: _password, ...safeUser } = user
  return safeUser
}

export function authenticate(users, email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const user = users.find((item) => item.email.toLowerCase() === normalizedEmail)

  if (!user || user.password !== password) {
    return { ok: false, reason: 'Invalid email or password.' }
  }

  if (user.status !== 'active') {
    return { ok: false, reason: 'This account is disabled.' }
  }

  return { ok: true, user: getSafeUser(user) }
}

export function createAuditEvent(actor, action, target, detail) {
  return {
    id: `aud-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    actor: actor?.name || actor?.email || 'System',
    action,
    target,
    detail,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
  }
}

export function createUser(users, payload, actorRole) {
  if (!can(actorRole, 'manage_users')) {
    throw new Error('Admin role required to create users.')
  }

  const email = String(payload.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) {
    throw new Error('A valid email is required.')
  }

  if (users.some((user) => user.email.toLowerCase() === email)) {
    throw new Error('A user with this email already exists.')
  }

  const nextUser = {
    id: `usr-${Date.now()}`,
    name: String(payload.name || 'New QA user').trim(),
    email,
    password: String(payload.password || 'ChangeMe123'),
    role: payload.role === 'admin' ? 'admin' : 'user',
    status: payload.status === 'disabled' ? 'disabled' : 'active',
    team: String(payload.team || 'LiveLabs QA').trim()
  }

  return [...users, nextUser]
}

export function updateUser(users, id, patch, actorRole) {
  if (!can(actorRole, 'manage_users')) {
    throw new Error('Admin role required to update users.')
  }

  return users.map((user) => {
    if (user.id !== id) {
      return user
    }

    return {
      ...user,
      name: patch.name ?? user.name,
      role: patch.role === 'admin' ? 'admin' : patch.role === 'user' ? 'user' : user.role,
      status: patch.status === 'disabled' ? 'disabled' : patch.status === 'active' ? 'active' : user.status,
      team: patch.team ?? user.team
    }
  })
}

export function deleteUser(users, id, actorRole, actorId) {
  if (!can(actorRole, 'manage_users')) {
    throw new Error('Admin role required to delete users.')
  }

  if (id === actorId) {
    throw new Error('Admins cannot delete their own active session account.')
  }

  return users.filter((user) => user.id !== id)
}

export function createWatchEvent(events, payload, actorRole) {
  if (!can(actorRole, 'manage_watchdog')) {
    throw new Error('Admin role required to create watchdog events.')
  }

  const title = String(payload.title || '').trim()
  if (!title) {
    throw new Error('Watchdog event title is required.')
  }

  return [
    {
      id: `wd-${Date.now()}`,
      title,
      domain: payload.domain || 'Platform',
      severity: payload.severity || 'Medium',
      status: 'New',
      owner: payload.owner || 'Unassigned',
      sourceId: payload.sourceId || 'src-manual',
      monitorId: payload.monitorId || '',
      evidenceIds: payload.evidenceId ? [payload.evidenceId] : [],
      nextAction: payload.nextAction || 'Review the signal, attach evidence, and assign an owner.',
      updated: new Date().toISOString().slice(0, 16).replace('T', ' '),
      incident: payload.incident === 'true' || payload.incident === true,
      timeline: [`${new Date().toISOString().slice(0, 16).replace('T', ' ')} - Manual watchdog alert created.`]
    },
    ...events
  ]
}

export function createGithubItem(items, payload, actorRole) {
  if (!can(actorRole, 'manage_github_intake')) {
    throw new Error('Admin role required to add GitHub intake records.')
  }

  const title = String(payload.title || '').trim()
  if (!title) {
    throw new Error('GitHub intake title is required.')
  }

  const type = ['Pull Request', 'Issue', 'Log'].includes(payload.type) ? payload.type : 'Issue'
  return [
    {
      id: `gh-${Date.now()}`,
      type,
      title,
      repo: String(payload.repo || 'oracle-livelabs/common').trim(),
      status: String(payload.status || 'Needs QA Review').trim(),
      owner: String(payload.owner || 'LiveLabs QA').trim(),
      updated: new Date().toISOString().slice(0, 16).replace('T', ' '),
      signal: String(payload.signal || 'Review required before QA sign-off.').trim(),
      link: String(payload.link || 'demo://github/manual-intake').trim(),
      history: [
        `${new Date().toISOString().slice(0, 16).replace('T', ' ')} - Local GitHub intake record created.`
      ]
    },
    ...items
  ]
}

export function createKnowledgeItem(items, payload, actorRole) {
  if (!can(actorRole, 'manage_knowledge_base')) {
    throw new Error('Admin role required to add knowledge notes.')
  }

  const link = String(payload.link || '').trim()
  const source = String(payload.source || '').trim()
  const summary = String(payload.summary || '').trim()
  if (!link && !source && !summary) {
    throw new Error('Add a source link, file reference, or summary to create a knowledge item.')
  }
  const type = String(payload.type || 'Link').trim()
  const title = String(payload.title || source || link || 'Manual QA knowledge item').trim()
  const domain = String(payload.domain || 'QA Hub').trim()
  const extractedFacts = [
    summary || `Demo extraction from ${link || source}.`,
    `Classified as ${domain}.`,
    'Ready for review, tagging, and promotion into the QA backlog.'
  ]

  return [
    {
      id: `kb-${Date.now()}`,
      title,
      type,
      status: 'New',
      owner: String(payload.owner || `${domain} owner`).trim(),
      updated: new Date().toISOString().slice(0, 10),
      source: source || type,
      link: link || 'demo://knowledge/manual-intake',
      summary: summary || `Static prototype extraction for ${title}.`,
      nextAction: String(payload.nextAction || 'Review, edit, and promote into the QA operating backlog.').trim(),
      extractedFacts,
      relatedSignals: [domain, 'Knowledge Base']
    },
    ...items
  ]
}

export function updateKnowledgeItemStatus(items, id, status, actorRole) {
  if (!can(actorRole, 'manage_knowledge_base')) {
    throw new Error('Admin role required to update knowledge items.')
  }
  const allowed = ['New', 'Needs Source Refresh', 'Reviewed', 'Promoted', 'Archived']
  if (!allowed.includes(status)) {
    throw new Error('Unsupported knowledge status.')
  }
  return items.map((item) => item.id === id ? { ...item, status, updated: new Date().toISOString().slice(0, 10) } : item)
}

export function deleteKnowledgeItem(items, id, actorRole) {
  if (!can(actorRole, 'manage_knowledge_base')) {
    throw new Error('Admin role required to delete knowledge items.')
  }
  return items.filter((item) => item.id !== id)
}

export function updateWatchEventStatus(events, id, status, actorRole) {
  if (!can(actorRole, 'manage_watchdog')) {
    throw new Error('Admin role required to update watchdog events.')
  }

  const allowed = ['New', 'Investigating', 'Mitigated', 'Resolved']
  if (!allowed.includes(status)) {
    throw new Error('Unsupported watchdog status.')
  }

  return events.map((event) => (
    event.id === id
      ? {
        ...event,
        status,
        updated: new Date().toISOString().slice(0, 16).replace('T', ' '),
        timeline: [
          ...(event.timeline || []),
          `${new Date().toISOString().slice(0, 16).replace('T', ' ')} - Status changed to ${status}.`
        ]
      }
      : event
  ))
}

export function createMonitor(monitors, payload, actorRole) {
  if (!can(actorRole, 'configure_monitors')) {
    throw new Error('Admin role required to configure monitors.')
  }

  const name = String(payload.name || '').trim()
  if (!name) {
    throw new Error('Monitor name is required.')
  }

  return [
    {
      id: `mon-${Date.now()}`,
      name,
      domain: payload.domain || 'Platform',
      status: payload.status || 'Watch',
      cadence: payload.cadence || 'Hourly',
      threshold: payload.threshold || 'Threshold pending definition',
      owner: payload.owner || 'Unassigned',
      sourceId: payload.sourceId || 'src-manual',
      escalation: payload.escalation || 'Create a watchdog alert when threshold is crossed.',
      lastRun: 'Not run yet',
      nextRun: 'After next scheduler cycle'
    },
    ...monitors
  ]
}

export function freshnessLabel(minutes) {
  if (minutes >= 180) {
    return 'Stale'
  }
  if (minutes >= 60) {
    return 'Needs Review'
  }
  return 'Fresh'
}

export function deriveHealthStatus(check) {
  if (check.freshnessMinutes >= 180) {
    return 'Stale'
  }
  return check.status
}

export function getSource(state, sourceId) {
  return state.sources.find((source) => source.id === sourceId)
}

export function getEvidence(state, evidenceId) {
  return state.evidence.find((evidence) => evidence.id === evidenceId)
}

export function getMonitor(state, monitorId) {
  return state.monitors.find((monitor) => monitor.id === monitorId)
}

export function deriveSummary(events, healthChecks) {
  const activeEvents = events.filter((event) => event.status !== 'Resolved')
  const healthGroups = healthChecks.reduce((groups, check) => {
    const status = deriveHealthStatus(check)
    groups[status] = (groups[status] || 0) + 1
    return groups
  }, {})

  return {
    activeEvents: activeEvents.length,
    highSeverity: activeEvents.filter((event) => event.severity === 'High').length,
    incidents: activeEvents.filter((event) => event.incident).length,
    risk: healthGroups.Risk || 0,
    watch: healthGroups.Watch || 0,
    stale: healthGroups.Stale || 0,
    healthy: healthGroups.Operational || 0
  }
}

export function getActionQueue(state) {
  const highAlerts = state.watchEvents
    .filter((event) => event.status !== 'Resolved' && event.severity === 'High')
    .map((event) => ({
      id: event.id,
      title: event.title,
      domain: event.domain,
      reason: event.nextAction,
      targetView: 'qa-watchdog',
      priority: 'High'
    }))

  const staleChecks = state.healthChecks
    .filter((check) => deriveHealthStatus(check) === 'Stale')
    .map((check) => ({
      id: check.id,
      title: check.name,
      domain: check.domain,
      reason: check.reason,
      targetView: 'health-monitor',
      priority: 'Stale'
    }))

  const failedRuns = state.automationRuns
    .filter((run) => run.status === 'Failed' || run.status === 'Needs Review')
    .map((run) => ({
      id: run.id,
      title: run.name,
      domain: run.scope,
      reason: `${run.status}: review ${run.artifact}`,
      targetView: 'automation-runs',
      priority: run.status
    }))

  return [...highAlerts, ...staleChecks, ...failedRuns].slice(0, 8)
}

export function generateReport(state, reportId, format = 'Markdown') {
  const report = state.reports.find((item) => item.id === reportId) || state.reports[0]
  const summary = deriveSummary(state.watchEvents, state.healthChecks)
  const relatedEvents = state.watchEvents.filter((event) => report.domains.includes(event.domain))
  const relatedChecks = state.healthChecks.filter((check) => report.domains.includes(check.domain))

  if (format === 'JSON') {
    return JSON.stringify({
      title: report.title,
      generatedAt: new Date().toISOString(),
      demoOnly: true,
      summary,
      events: relatedEvents,
      healthChecks: relatedChecks
    }, null, 2)
  }

  const eventLines = relatedEvents.length
    ? relatedEvents.map((event) => `- ${event.severity}: ${event.title} (${event.status}, owner: ${event.owner})`).join('\n')
    : '- No related watchdog events in demo data.'

  const checkLines = relatedChecks.length
    ? relatedChecks.map((check) => `- ${deriveHealthStatus(check)}: ${check.name} (${check.score}, fresh ${check.freshnessMinutes} min)`).join('\n')
    : '- No related health checks in demo data.'

  return `# ${report.title}

Generated: ${new Date().toISOString()}
Audience: ${report.audience}
Demo-only: yes

## Summary

- Active watchdog events: ${summary.activeEvents}
- High severity events: ${summary.highSeverity}
- Risk checks: ${summary.risk}
- Watch checks: ${summary.watch}
- Stale checks: ${summary.stale}

## Watchdog Findings

${eventLines}

## Health Findings

${checkLines}

## Next Actions

- Validate source freshness before treating this as production status.
- Assign domain owners to unresolved high or stale records.
- Promote repeated failures into QA Watchdog incident review.
`
}

export function resetDemoState(actor) {
  const seeded = getSeedState()
  seeded.auditEvents = [
    createAuditEvent(actor, 'Reset demo data', 'Demo workspace', 'Seeded V3 data restored.')
  ]
  return seeded
}
