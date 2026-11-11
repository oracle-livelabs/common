// Read-only, in-memory boundary. Production authorization belongs to the backend.
export const ON_CALL_SOURCES = ['SLACK-AUTHORS', 'MAIL-DB', 'MAIL-HELP', 'MAIL-COMMUNITY']
const text = (value, fallback = '') => typeof value === 'string' ? value : fallback
const list = (value) => Array.isArray(value) ? value : []
const strings = (value) => list(value).filter((item) => typeof item === 'string')
const diagnostics = (value) => list(value).map((item) => typeof item === 'string' ? item : [text(item?.code), text(item?.operation)].filter(Boolean).join(' / ') || 'Source warning details unavailable')
const id = (value) => /^[a-zA-Z0-9_.:-]{1,160}$/.test(text(value)) ? value : ''

export function unavailableOnCall(reason = 'Private on-call backend is not configured.') {
  return { availability: 'UNAVAILABLE', mode: 'none', reason, sources: [], cases: [], drafts: [], reports: [], deliveries: [], readiness: { liveStatus: 'BLOCKED', blockers: [reason], sourceReadiness: [] } }
}

export function privateReportUrl(value, origin) {
  if (!value) return null
  try {
    const base = new URL(origin)
    const url = new URL(value, base)
    if (url.origin !== base.origin || url.username || url.password || url.search || url.hash || !/^\/api\/on-call\/reports\/[a-zA-Z0-9/_\-.]+$/.test(url.pathname)) return null
    return url.href
  } catch { return null }
}

export function normalizeOnCallSnapshot(payload, { expectedMode, origin = 'https://invalid.example' } = {}) {
  if (payload?.schema !== 'hub-operations.v1' || payload?.profile !== 'on-call-review') throw new Error('Unsupported on-call review schema/profile.')
  if (!['synthetic', 'live'].includes(expectedMode) || payload.mode !== expectedMode) throw new Error('On-call snapshot mode does not match the selected mode.')
  for (const key of ['sources', 'cases', 'drafts', 'reports']) {
    if (!Array.isArray(payload[key])) throw new Error(`On-call ${key} must be an explicit array.`)
  }
  const readiness = payload.readiness || {}
  if (readiness.mode !== expectedMode) throw new Error('On-call readiness mode does not match the selected mode.')
  for (const key of ['cases', 'drafts', 'reports']) {
    if (payload[key].some((record) => record?.mode !== expectedMode)) throw new Error(`On-call ${key} contains a missing or mismatched mode.`)
  }
  if (payload.reports.some((report) => report?.profile !== 'on-call-review')) throw new Error('On-call report profile does not match on-call-review.')
  if (expectedMode === 'synthetic' && payload.artifactLabel !== 'SYNTHETIC_ONLY') throw new Error('Synthetic preview must carry the SYNTHETIC_ONLY label.')
  if (expectedMode === 'live') {
    const required = ['configuredForLive', 'independentLiveVerificationPerformed', 'backendAuthorizationVerified', 'privateAudienceVerified', 'retentionVerified', 'redactionVerified']
    if (readiness.liveStatus !== 'READY' || required.some((key) => readiness[key] !== true)) throw new Error('Live review is blocked: private access, retention, redaction and backend readiness must be verified.')
  }
  const sources = list(payload.sources).map((source) => {
    if (!ON_CALL_SOURCES.includes(source?.sourceId)) throw new Error('Unexpected on-call source binding.')
    if (typeof source.state !== 'string' || !source.state.trim()) throw new Error('Each configured source requires an explicit read state.')
    return {
      sourceId: source.sourceId, state: text(source.state, 'UNKNOWN'),
      coverageStatus: text(source.coverageStatus, 'UNVERIFIED'),
      lastAttemptAt: text(source.lastAttemptAt), lastCompleteObservationAt: text(source.lastCompleteObservationAt),
      collectionObservedAt: text(source.collectionObservedAt), windowStart: text(source.windowStart),
      warnings: diagnostics(source.warnings), errors: diagnostics(source.errors), limitations: diagnostics(source.limitations),
      noChangesObservedWithinCompletedRead: source.noChangesObservedWithinCompletedRead === true
    }
  })
  if (new Set(sources.map((source) => source.sourceId)).size !== sources.length) throw new Error('Duplicate on-call source binding.')
  if (sources.length !== ON_CALL_SOURCES.length || ON_CALL_SOURCES.some((sourceId) => !sources.some((source) => source.sourceId === sourceId))) throw new Error('All four configured sources require explicit read states; unchecked sources cannot be omitted.')
  const cases = list(payload.cases).map((item) => {
    if (!id(item.caseId) || !sources.some((source) => source.sourceId === item.sourceId) || !id(item.sourceRevision)) throw new Error('Case identity/source revision is missing or unbound.')
    return {
      caseId: item.caseId, sourceId: item.sourceId, sourceRevision: item.sourceRevision,
      summary: text(item.summary, 'Redacted case summary unavailable.'), topic: text(item.topic, 'Unclassified'), priority: text(item.priority, 'UNASSIGNED'),
      contextComplete: item.contextComplete === true, tombstone: item.tombstone === true,
      sensitiveExposureDetected: item.sensitiveExposureDetected === true,
      state: text(item.state, 'UNCONFIRMED'), nextHumanAction: text(item.nextHumanAction),
      reportedRecovery: item.reportedRecovery === true, sourceResolution: text(item.sourceResolution, 'UNCONFIRMED'),
      ownerConfirmedResolved: item.ownerConfirmedResolved === true,
      // Support case processing never establishes a learner PASS.
      learnerPass: null, lastObservedAt: text(item.lastObservedAt)
    }
  })
  if (new Set(cases.map((item) => item.caseId)).size !== cases.length) throw new Error('Duplicate case identity.')
  const drafts = list(payload.drafts).map((draft) => {
    const item = cases.find((entry) => entry.caseId === draft.caseId)
    if (!id(draft.draftId) || !item || item.sourceId !== draft.sourceId || !Number.isInteger(draft.version) || draft.version < 1) throw new Error('Draft identity/case/version is invalid.')
    if (draft.sourceAnswerSentOrPosted === true || draft.nativeMailboxDraftCreated === true || draft.resolvesSourceCase === true) throw new Error('Unsupported source-write or case-resolution claim in draft-only review.')
    const supersededBy = id(draft.supersededByDraftId || draft.supersededBy)
    let status = supersededBy ? 'SUPERSEDED' : text(draft.status, 'NEEDS_REVIEW')
    if (!supersededBy && draft.sourceRevision !== item.sourceRevision) status = 'STALE_CONTEXT'
    if (!supersededBy && (!item.contextComplete || draft.contextComplete !== true)) status = 'CONTEXT_INCOMPLETE'
    if (!supersededBy && (item.tombstone || item.sensitiveExposureDetected)) status = 'REVIEW_BLOCKED'
    const currentEligible = status === 'NEEDS_REVIEW' && draft.sourceRevision === item.sourceRevision && item.contextComplete && draft.contextComplete === true && draft.sourceFresh === true && !item.tombstone && !item.sensitiveExposureDetected
    const reviewState = text(draft.reviewState, 'NEEDS_REVIEW')
    const review = draft.review
    const decision = { APPROVED_FOR_HUMAN_USE: 'APPROVE', CHANGES_REQUESTED: 'REQUEST_CHANGES' }[reviewState]
    const exactReviewMetadata = Boolean(currentEligible && decision && review && !Array.isArray(review) &&
      review.mode === expectedMode && review.decision === decision && review.version === draft.version &&
      review.sourceRevision === draft.sourceRevision && review.sourceRevision === item.sourceRevision &&
      id(draft.knowledgeRevision) && review.knowledgeRevision === draft.knowledgeRevision &&
      /^[a-zA-Z0-9_-]{1,80}$/.test(text(review.reviewerReference)) && Number.isFinite(Date.parse(review.reviewedAt)))
    const needsReview = currentEligible && !exactReviewMetadata
    return {
      draftId: draft.draftId, caseId: item.caseId, sourceId: draft.sourceId, version: draft.version,
      sourceRevision: text(draft.sourceRevision), knowledgeRevision: text(draft.knowledgeRevision), contextRevision: text(draft.contextRevision), basisRevision: text(draft.basisRevision),
      status, reviewState, reviewMetadataState: exactReviewMetadata ? 'EXACT_REVISION_MATCH' : review || decision ? 'UNVERIFIED' : 'NOT_SUPPLIED', needsReview,
      kind: text(draft.kind, 'CLARIFICATION'),
      text: text(draft.draftTextSanitized, 'Sanitized draft text unavailable.'),
      previousDraftId: id(draft.previousDraftId), supersededBy, missingEvidence: strings(draft.missingEvidence),
      reviewable: needsReview
    }
  })
  if (new Set(drafts.map((draft) => draft.draftId)).size !== drafts.length) throw new Error('Duplicate draft identity.')
  const reports = list(payload.reports).map((report) => {
    const reference = report.reference ?? report.reportRef ?? ''
    if (typeof reference !== 'string') throw new Error('On-call report reference must be an opaque string.')
    if (reference && expectedMode === 'live' && (!/^protected-ref:[a-zA-Z0-9_-]{1,120}$/.test(reference) || /password|secret|token|credential|authorization|bearer/i.test(reference))) throw new Error('Live report reference must be an opaque protected-ref identifier without sensitive text.')
    if (reference && expectedMode === 'synthetic' && !/^synthetic-[a-f0-9]{20}\/(report\.md|run-manifest\.json)$/.test(reference)) throw new Error('Synthetic report reference must be a manifest-relative synthetic artifact path.')
    return {
    reportId: id(report.reportId), status: text(report.status, 'UNAVAILABLE'), generatedAt: text(report.generatedAt),
    profile: 'on-call-review', artifactLabel: expectedMode === 'synthetic' ? 'SYNTHETIC_ONLY' : 'PRIVATE',
    reportComplete: report.reportComplete === true, learnerPass: null,
    reference, sha256: /^[a-f0-9]{64}$/.test(text(report.sha256)) ? report.sha256 : '',
    url: expectedMode === 'live' ? privateReportUrl(report.reportUrl, origin) : null
    }
  })
  return {
    availability: 'AVAILABLE', mode: expectedMode, reason: '', generatedAt: text(payload.generatedAt), sources, cases, drafts, reports,
    deliveries: list(payload.deliveries).map((delivery) => ({ deliveryId: id(delivery.deliveryId), status: text(delivery.status, 'UNAVAILABLE') })),
    readiness: {
      liveStatus: text(readiness.liveStatus, 'BLOCKED'), blockers: strings(readiness.blockers),
      sourceReadiness: list(readiness.sourceReadiness).filter((source) => ON_CALL_SOURCES.includes(source.sourceId)).map((source) => ({ sourceId: source.sourceId, blockers: strings(source.blockers) }))
    }
  }
}

export async function loadOnCallSnapshot({ mode = 'none', endpoint = '', origin, assetBase, fetchImpl = globalThis.fetch } = {}) {
  if (mode === 'none') return unavailableOnCall()
  if (mode === 'synthetic') return loadSealedSyntheticSnapshot({ origin, assetBase, fetchImpl })
  if (mode !== 'live') return unavailableOnCall('Unsupported review mode.')
  let url
  try {
    url = new URL(endpoint, origin)
    if (!endpoint || url.origin !== new URL(origin).origin || url.username || url.password || url.search || url.hash || url.pathname !== '/api/on-call/review') throw new Error('Invalid endpoint')
  } catch { return unavailableOnCall('Same-origin private review endpoint is not configured.') }
  try {
    const response = await fetchImpl(url.href, { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error(`Private review endpoint returned HTTP ${response.status}.`)
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Private review endpoint did not return JSON.')
    return normalizeOnCallSnapshot(await response.json(), { expectedMode: 'live', origin })
  } catch (error) {
    // Never substitute synthetic cases after a failed live read.
    return unavailableOnCall(error instanceof SyntaxError ? 'Private review endpoint returned invalid JSON.' : error instanceof Error ? error.message : 'Private review read failed.')
  }
}

export const SYNTHETIC_RUN = 'synthetic-e5900984270976e44089'

export async function loadSealedSyntheticSnapshot({ origin, assetBase, fetchImpl = globalThis.fetch } = {}) {
  try {
    const base = new URL(`./synthetic/${SYNTHETIC_RUN}/`, assetBase || `${origin}/`)
    if (base.origin !== new URL(origin).origin) throw new Error('Synthetic preview assets must be same-origin.')
    // The caller supplies the app asset base for GitHub Pages/subpath compatibility.
    const responses = await Promise.all(['hub-operations.json', 'run-manifest.json', 'report.md'].map((name) => fetchImpl(new URL(name, base).href, { method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) })))
    if (responses.some((response) => !response.ok)) throw new Error('Synthetic sealed preview assets are unavailable.')
    const [snapshotText, manifestText, reportText] = await Promise.all(responses.map((response) => response.text()))
    const manifest = JSON.parse(manifestText)
    if (manifest.schema !== 'oncall-sealed-run.v1' || manifest.mode !== 'synthetic' || manifest.runId !== SYNTHETIC_RUN || manifest.realSourcesRead !== false || manifest.sourceWrites !== 0 || manifest.nativeDraftsCreated !== 0 || manifest.slackMessagesSent !== 0) throw new Error('Synthetic manifest boundaries are invalid.')
    const hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map((byte) => byte.toString(16).padStart(2, '0')).join('')
    for (const [name, value] of [['hub-operations.json', snapshotText], ['report.md', reportText]]) {
      if (await hash(value) !== manifest.artifacts?.find((item) => item.name === name)?.sha256) throw new Error('Synthetic sealed artifact hash mismatch.')
    }
    const snapshot = normalizeOnCallSnapshot(JSON.parse(snapshotText), { expectedMode: 'synthetic', origin })
    snapshot.reports = snapshot.reports.map((report) => ({ ...report, reference: `${SYNTHETIC_RUN}/report.md`, sha256: manifest.artifacts.find((item) => item.name === 'report.md').sha256, syntheticUrl: new URL('report.html', base).href }))
    return snapshot
  } catch (error) {
    return unavailableOnCall(error instanceof SyntaxError ? 'Synthetic preview JSON is invalid.' : error instanceof Error ? error.message : 'Synthetic preview verification failed.')
  }
}

export function createReviewPreview(snapshot, draftId, reviewer) {
  const draft = snapshot.drafts.find((item) => item.draftId === draftId)
  if (!draft?.reviewable) throw new Error('This draft is superseded, incomplete, stale or otherwise unavailable for review.')
  const reference = text(reviewer).trim()
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(reference)) throw new Error('Enter an opaque reviewer reference using 1–80 letters, digits, underscores or hyphens.')
  return {
    schema: 'on-call-review-preview.v1', mode: snapshot.mode, decision: 'PREVIEW_ONLY', reviewerReference: reference,
    caseId: draft.caseId, draftId: draft.draftId, version: draft.version,
    sourceRevision: draft.sourceRevision, knowledgeRevision: draft.knowledgeRevision, contextRevision: draft.contextRevision, basisRevision: draft.basisRevision,
    authoritativeApproval: false, privatePersistencePerformed: false, sourceAnswerSentOrPosted: false
  }
}

export function syntheticOnCallSnapshot() {
  const at = '2026-10-02T09:00:00Z'
  const sources = ON_CALL_SOURCES.map((sourceId) => ({ sourceId, state: 'COMPLETE', coverageStatus: 'COMPLETE_BOUNDED_READ', lastAttemptAt: at, lastCompleteObservationAt: at, collectionObservedAt: at, windowStart: '2026-09-25T09:00:00Z', warnings: ['Synthetic bounded batch only; historical coverage and server access are unverified.'], errors: [], limitations: [] }))
  sources[2].state = 'PARTIAL'
  sources[2].coverageStatus = 'PARTIAL_READ'
  sources[2].warnings = ['Synthetic page limit reached; earlier replies remain unread.']
  const cases = ON_CALL_SOURCES.map((sourceId, index) => ({ mode: 'synthetic', caseId: `synthetic-case-${index + 1}`, sourceId, sourceRevision: `synthetic-source-${index + 1}-v2`, summary: ['Synthetic workshop launch incident requiring owner escalation.', 'Synthetic Green Button question requiring current lifecycle context.', 'Synthetic validation question with incomplete conversation context.', 'Synthetic tutorial question awaiting clarification.'][index], contextComplete: index !== 2, topic: ['Incident', 'WMS/lifecycle', 'Validation/Self QA', 'Other/unresolved'][index], priority: ['P0', 'P2', 'P1', 'P2'][index], nextHumanAction: 'Verify current context and owner; a human reviews any response.', reportedRecovery: index === 3, sourceResolution: 'UNCONFIRMED', ownerConfirmedResolved: false, learnerPass: null, state: 'OPEN', lastObservedAt: at }))
  const drafts = cases.map((item, index) => ({ mode: 'synthetic', draftId: `synthetic-draft-${index + 1}-v2`, caseId: item.caseId, sourceId: item.sourceId, version: 2, sourceRevision: item.sourceRevision, knowledgeRevision: 'synthetic-knowledge-v1', contextRevision: `synthetic-context-${index + 1}-v2`, basisRevision: `synthetic-basis-${index + 1}-v2`, status: 'NEEDS_REVIEW', reviewState: 'NEEDS_REVIEW', kind: index === 0 ? 'ESCALATION' : 'CLARIFICATION', draftTextSanitized: 'Synthetic draft: please provide the workshop identifier, failing step and sanitized error so the on-call owner can review current evidence. A human must review and send any response.', missingEvidence: ['Current approved guidance and verified owner'], contextComplete: item.contextComplete, sourceFresh: true, previousDraftId: index === 0 ? 'synthetic-draft-1-v1' : null, sourceAnswerSentOrPosted: false, nativeMailboxDraftCreated: false, resolvesSourceCase: false }))
  drafts.push({ ...drafts[0], draftId: 'synthetic-draft-1-v1', version: 1, sourceRevision: 'synthetic-source-1-v1', status: 'SUPERSEDED', supersededBy: drafts[0].draftId, previousDraftId: null })
  return {
    schema: 'hub-operations.v1', profile: 'on-call-review', mode: 'synthetic', artifactLabel: 'SYNTHETIC_ONLY', generatedAt: at, sources, cases, drafts,
    reports: [{ mode: 'synthetic', profile: 'on-call-review', reportId: 'synthetic-report-001', status: 'COMPLETE', generatedAt: at, reportComplete: true, reference: `${SYNTHETIC_RUN}/report.md` }], deliveries: [],
    readiness: { mode: 'synthetic', liveStatus: 'BLOCKED', blockers: ['Private reviewer audience not verified', 'Retention policy not verified', 'Live source readers not bound', 'Private backend authorization not verified'], sourceReadiness: [] }
  }
}
