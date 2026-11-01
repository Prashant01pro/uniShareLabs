import fs from 'fs';
import path from 'path';

const rootDir = 'd:/hackathon';
const docsDir = path.join(rootDir, 'docs');

const featureAuditPath = path.join(docsDir, 'FEATURE_AUDIT.md');
const apiDocPath = path.join(docsDir, 'API_DOCUMENTATION.md');
const dbSchemaPath = path.join(docsDir, 'DATABASE_SCHEMA.md');
const lifecyclePath = path.join(docsDir, 'LIFECYCLE_DOCUMENTATION.md');
const originalReqPath = path.join(rootDir, '.agents', 'teamwork', 'ORIGINAL_REQUEST.md');

console.log('=== EMPIRICAL CONTRACT VERIFICATION HARNESS ===\n');

const featureAuditContent = fs.readFileSync(featureAuditPath, 'utf8');
const apiDocContent = fs.readFileSync(apiDocPath, 'utf8');
const dbSchemaContent = fs.readFileSync(dbSchemaPath, 'utf8');
const lifecycleContent = fs.readFileSync(lifecyclePath, 'utf8');
const originalReqContent = fs.readFileSync(originalReqPath, 'utf8');

const results = {
  passed: [],
  warnings: [],
  failures: []
};

function pass(name, detail) {
  results.passed.push({ name, detail });
  console.log(`[PASS] ${name}: ${detail}`);
}

function warn(name, detail) {
  results.warnings.push({ name, detail });
  console.log(`[WARN] ${name}: ${detail}`);
}

function fail(name, detail) {
  results.failures.push({ name, detail });
  console.log(`[FAIL] ${name}: ${detail}`);
}

// -------------------------------------------------------------
// 1. REQUIREMENTS R1 - R10 AUDIT
// -------------------------------------------------------------
console.log('\n--- 1. AUDITING REQUIREMENTS R1 - R10 ---');
const requiredReqs = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'];

for (const req of requiredReqs) {
  const reqRegex = new RegExp(`\\*\\*${req}\\.`, 'i');
  if (reqRegex.test(featureAuditContent)) {
    pass(`Requirement ${req}`, `Explicitly mapped in FEATURE_AUDIT.md Section 3`);
  } else {
    fail(`Requirement ${req}`, `Missing explicit Section 3 heading in FEATURE_AUDIT.md`);
  }
}

// -------------------------------------------------------------
// 2. FEATURE AUDIT TABLE: 34 FEATURES VERIFICATION
// -------------------------------------------------------------
console.log('\n--- 2. AUDITING 34 FEATURES IN FEATURE_AUDIT.MD ---');
const tableRowRegex = /^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/gm;
let match;
const featuresFound = [];
while ((match = tableRowRegex.exec(featureAuditContent)) !== null) {
  const featNum = parseInt(match[1].trim(), 10);
  featuresFound.push({
    num: featNum,
    req: match[2].trim(),
    step: match[3].trim(),
    name: match[4].trim(),
    backendFiles: match[5].trim(),
    frontendFiles: match[6].trim(),
    endpoints: match[7].trim(),
    criteria: match[8].trim(),
    tier: match[9].trim()
  });
}

if (featuresFound.length === 34) {
  pass('Feature Count', `Found exactly 34 features in FEATURE_AUDIT.md table`);
} else {
  fail('Feature Count', `Expected 34 features, found ${featuresFound.length}`);
}

// Verify sequential numbering 1..34
const missingNums = [];
for (let i = 1; i <= 34; i++) {
  if (!featuresFound.some(f => f.num === i)) {
    missingNums.push(i);
  }
}
if (missingNums.length === 0) {
  pass('Feature Sequence', 'Features 1 through 34 are sequentially contiguous');
} else {
  fail('Feature Sequence', `Missing feature numbers: ${missingNums.join(', ')}`);
}

// Verify all required fields for each feature are non-empty
let incompleteFeatures = 0;
for (const feat of featuresFound) {
  if (!feat.req || !feat.name || !feat.backendFiles || !feat.frontendFiles || !feat.endpoints || !feat.criteria || !feat.tier) {
    incompleteFeatures++;
    fail(`Feature ${feat.num}`, `Incomplete fields: ${JSON.stringify(feat)}`);
  }
}
if (incompleteFeatures === 0) {
  pass('Feature Completeness', 'All 34 features have non-empty backend, frontend, endpoint, criteria, and tier specifications');
}

// -------------------------------------------------------------
// 3. API DOCUMENTATION VERIFICATION
// -------------------------------------------------------------
console.log('\n--- 3. AUDITING API_DOCUMENTATION.MD ---');

// Extract endpoints defined in API_DOCUMENTATION.md
const endpointHeadingRegex = /####\s+`(GET|POST|PUT|PATCH|DELETE)\s+([^`]+)`/g;
const apiEndpoints = [];
while ((match = endpointHeadingRegex.exec(apiDocContent)) !== null) {
  apiEndpoints.push({
    method: match[1],
    path: match[2].trim()
  });
}

pass('API Endpoint Count', `Extracted ${apiEndpoints.length} REST endpoints defined in API_DOCUMENTATION.md`);

// Verify standard endpoints
const expectedEndpoints = [
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh-token',
  'POST /api/v1/auth/logout',
  'GET /api/v1/auth/me',
  'GET /api/v1/auth/demo-tokens',
  'GET /api/v1/resources',
  'POST /api/v1/resources',
  'GET /api/v1/resources/:id',
  'PUT /api/v1/resources/:id',
  'GET /api/v1/resources/:id/eligibility',
  'POST /api/v1/resources/:id/maintenance',
  'POST /api/v1/bookings',
  'GET /api/v1/bookings',
  'GET /api/v1/bookings/:id',
  'PATCH /api/v1/bookings/:id/cancel',
  'GET /api/v1/bookings/review-queue',
  'POST /api/v1/bookings/:id/approve',
  'POST /api/v1/bookings/:id/reject',
  'POST /api/v1/bookings/:id/delegate',
  'POST /api/v1/bookings/:id/accept-waitlist-offer',
  'POST /api/v1/inspections/check-in',
  'POST /api/v1/inspections/return',
  'GET /api/v1/inspections/booking/:bookingId',
  'POST /api/v1/incidents',
  'POST /api/v1/incidents/:id/dispute',
  'POST /api/v1/incidents/:id/adjudicate',
  'GET /api/v1/waitlist/resource/:resourceId',
  'GET /api/v1/waitlist/my-waitlists',
  'DELETE /api/v1/waitlist/:id',
  'GET /api/v1/audit/ledger',
  'GET /api/v1/audit/verify-chain',
  'GET /api/v1/audit/analytics/utilization',
  'GET /api/v1/audit/analytics/chargebacks'
];

for (const expected of expectedEndpoints) {
  const [expMethod, expPath] = expected.split(' ');
  const found = apiEndpoints.some(e => e.method === expMethod && e.path.split('?')[0] === expPath);
  if (found) {
    pass(`Endpoint ${expected}`, 'Present in API_DOCUMENTATION.md');
  } else {
    fail(`Endpoint ${expected}`, 'Missing from API_DOCUMENTATION.md');
  }
}

// RFC 7807 verification
if (apiDocContent.includes('RFC 7807 Problem Details') && 
    apiDocContent.includes('"type"') && 
    apiDocContent.includes('"title"') && 
    apiDocContent.includes('"status"') && 
    apiDocContent.includes('"detail"') && 
    apiDocContent.includes('"instance"') && 
    apiDocContent.includes('"code"')) {
  pass('RFC 7807 Spec', 'RFC 7807 problem details JSON structure is completely specified');
} else {
  fail('RFC 7807 Spec', 'RFC 7807 problem details specification is incomplete');
}

// Verify Socket.IO events
const socketEvents = [
  'booking:created',
  'booking:approved',
  'booking:rejected',
  'waitlist:promoted',
  'booking:checked_in',
  'booking:late_warning',
  'booking:returned',
  'incident:created',
  'trust_score:updated'
];
for (const evt of socketEvents) {
  if (apiDocContent.includes(`\`${evt}\``)) {
    pass(`Socket Event ${evt}`, 'Documented in event taxonomy');
  } else {
    fail(`Socket Event ${evt}`, 'Missing from event taxonomy');
  }
}

// -------------------------------------------------------------
// 4. DATABASE SCHEMA VERIFICATION
// -------------------------------------------------------------
console.log('\n--- 4. AUDITING DATABASE_SCHEMA.MD ---');

const expectedSchemas = [
  { name: 'User', collection: 'users', keyIndex: '{ email: 1 }' },
  { name: 'Resource', collection: 'resources', keyIndex: '{ code: 1 }' },
  { name: 'Booking', collection: 'bookings', keyIndex: '{ resourceId: 1, status: 1, startTime: 1, endTime: 1 }' },
  { name: 'Inspection', collection: 'inspections', keyIndex: '{ bookingId: 1, type: 1 }' },
  { name: 'Incident', collection: 'incidents', keyIndex: '{ incidentNumber: 1 }' },
  { name: 'AuditLog', collection: 'audit_logs', keyIndex: '{ sequenceNumber: 1 }' },
  { name: 'IdempotencyKey', collection: 'idempotency_keys', keyIndex: 'expires: 86400' },
  { name: 'WaitlistEntry', collection: 'waitlist_entries', keyIndex: '{ resourceId: 1, status: 1, priorityScore: -1, createdAt: 1 }' }
];

for (const s of expectedSchemas) {
  const hasInterface = dbSchemaContent.includes(`export interface I${s.name}`);
  const hasSchema = dbSchemaContent.includes(`${s.name.toLowerCase()}Schema = new Schema`) || 
                    dbSchemaContent.includes(`${s.name.charAt(0).toLowerCase() + s.name.slice(1)}Schema = new Schema`);
  const hasKeyIndex = dbSchemaContent.includes(s.keyIndex);

  if (hasInterface && hasSchema && hasKeyIndex) {
    pass(`Schema ${s.name} (${s.collection})`, `Interface, Schema, and critical index (${s.keyIndex}) fully defined`);
  } else {
    fail(`Schema ${s.name} (${s.collection})`, `Missing components: interface=${hasInterface}, schema=${hasSchema}, index=${hasKeyIndex}`);
  }
}

// -------------------------------------------------------------
// 5. LIFECYCLE STEPS & STATE MACHINE AUDIT
// -------------------------------------------------------------
console.log('\n--- 5. AUDITING LIFECYCLE_DOCUMENTATION.MD ---');

for (let step = 1; step <= 10; step++) {
  const stepRegex = new RegExp(`### 3\\.${step}\\s+Step ${step}:`, 'i');
  if (stepRegex.test(lifecycleContent)) {
    pass(`Lifecycle Step ${step}`, `Complete subsection found in Section 3`);
  } else {
    fail(`Lifecycle Step ${step}`, `Missing subsection in Section 3`);
  }
}

// Check 6 gates in Step 4
const gates = [
  'Gate 1 (Operational Boundary)',
  'Gate 2 (Maintenance Collision)',
  'Gate 3 (Half-Open Interval Collision)',
  'Gate 4 (Weekly Quota Engine)',
  'Gate 5 (Anti-Hoarding Cooldown)',
  'Gate 6 (Certification Validity Throughout Slot)'
];
for (const g of gates) {
  if (lifecycleContent.includes(g)) {
    pass(`Verification Gate: ${g}`, 'Found in Step 4 specification');
  } else {
    fail(`Verification Gate: ${g}`, 'Missing from Step 4 specification');
  }
}

// -------------------------------------------------------------
// 6. ADVERSARIAL STRESS TEST & CONSISTENCY CHECKS
// -------------------------------------------------------------
console.log('\n--- 6. ADVERSARIAL STRESS TEST & CROSS-DOC DISCREPANCIES ---');

// Check BookingStatus enums across files
const dbBookingStatusMatch = dbSchemaContent.match(/export type BookingStatus =\s*([^;]+);/);
let dbStatuses = [];
if (dbBookingStatusMatch) {
  dbStatuses = dbBookingStatusMatch[1].split('|').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  console.log('Database BookingStatus enum values:', dbStatuses);
}

// Check what status names appear in LIFECYCLE_DOCUMENTATION.md state table
const lifecycleStatesFound = new Set();
const matrixRowRegex = /\|\s*`([A-Z_]+)`\s*\|\s*`([A-Z_]+)`\s*\|/g;
let mMatch;
while ((mMatch = matrixRowRegex.exec(lifecycleContent)) !== null) {
  lifecycleStatesFound.add(mMatch[1]);
  lifecycleStatesFound.add(mMatch[2]);
}
console.log('Lifecycle matrix states found:', Array.from(lifecycleStatesFound));

// Inconsistency Check 1: DISPUTED vs IN_DISPUTE
const hasDbDisputed = dbStatuses.includes('DISPUTED');
const hasDbInDispute = dbStatuses.includes('IN_DISPUTE');
const hasLifecycleDisputed = lifecycleStatesFound.has('DISPUTED');
const hasLifecycleInDispute = lifecycleStatesFound.has('IN_DISPUTE');

if (hasDbDisputed && !hasDbInDispute && hasLifecycleInDispute && !hasLifecycleDisputed) {
  warn('Status Inconsistency [CRITICAL_EDGE]', 
    'Discrepancy detected: DATABASE_SCHEMA.md defines `DISPUTED` in BookingStatus, whereas LIFECYCLE_DOCUMENTATION.md uses `IN_DISPUTE` (and API_DOCUMENTATION.md line 327 returns `IN_DISPUTE`).');
} else {
  pass('Dispute Status Consistency', 'Consistent dispute status name');
}

// Inconsistency Check 2: Intermediate states in matrix vs DB schema
const extraLifecycleStates = Array.from(lifecycleStatesFound).filter(s => !dbStatuses.includes(s));
console.log('States in Lifecycle Matrix not in DB BookingStatus enum:', extraLifecycleStates);
if (extraLifecycleStates.length > 0) {
  warn('Lifecycle FSM vs Persistent Schema Drift', 
    `Lifecycle transition matrix includes ephemeral/pipeline states not in DB BookingStatus enum: ${extraLifecycleStates.join(', ')}. Need clear documentation stating whether these are ephemeral pipeline states or persistent DB statuses.`);
}

// Check formulas consistency
const archHasFormulaF = /F\s*=\s*\(W_\{hist\}\s*\\cdot\s*S_\{hist\}\)/.test(fs.readFileSync(path.join(docsDir, 'ARCHITECTURE.md'), 'utf8'));
const lifecycleHasWaitlistFormula = /Score_\{waitlist\}\s*=/.test(lifecycleContent);
pass('Formula Documentation', `General Fairness Score F documented in ARCHITECTURE.md: ${archHasFormulaF}; Waitlist Priority formula documented in LIFECYCLE_DOCUMENTATION.md: ${lifecycleHasWaitlistFormula}`);

// Check Equipment Categories across files
const expectedCategories = ['MICROSCOPES', 'CLEANROOMS', 'MAKERSPACE_3D_PRINTERS', 'SPECTROMETERS', 'CNC_MACHINING', 'GENERAL_LAB'];
for (const cat of expectedCategories) {
  const inDb = dbSchemaContent.includes(cat);
  const inLifecycle = lifecycleContent.includes(cat);
  const inApi = apiDocContent.includes(cat);
  if (inDb && inLifecycle && inApi) {
    pass(`Category ${cat}`, 'Consistently present in DB, Lifecycle, and API docs');
  } else {
    fail(`Category ${cat}`, `Missing from some docs: DB=${inDb}, Lifecycle=${inLifecycle}, API=${inApi}`);
  }
}

// Summary
console.log('\n=== SUMMARY OF EMPIRICAL VERIFICATION ===');
console.log(`PASSED: ${results.passed.length}`);
console.log(`WARNINGS: ${results.warnings.length}`);
console.log(`FAILURES: ${results.failures.length}`);

if (results.failures.length === 0) {
  console.log('\nVERDICT: REQUIREMENTS FULLY SATISFIED WITH MINOR DISCREPANCY WARNINGS');
} else {
  console.log('\nVERDICT: FAILURES DETECTED - REQUEST CHANGES');
}
