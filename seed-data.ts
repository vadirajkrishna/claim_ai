import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { addDays, subDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import * as crypto from 'crypto';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

type Product = 'AUTO' | 'HOME' | 'TRAVEL';
type Region = 'UK' | 'FR' | 'ES' | 'IT' | 'US';
type LossType = 'THEFT' | 'FIRE' | 'WATER' | 'ACCIDENT' | 'CANCELLATION' | 'BAGGAGE' | 'VANDALISM' | 'WEATHER';
type Status = 'New' | 'Investigating' | 'Approved' | 'Closed';

const supabaseUrl = 'https://tycgxpzvxglrrqkpgrwf.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/** ------------ CONFIG ------------- **/
const NUM_CLAIMS = 5000;
const PRODUCT_SPLIT: Record<Product, number> = { AUTO: 0.45, HOME: 0.35, TRAVEL: 0.20 };
const FRAUD_RATE_BY_PRODUCT: Record<Product, number> = { AUTO: 0.08, HOME: 0.07, TRAVEL: 0.06 }; // 5–10%
const REGIONS: Region[] = ['UK', 'FR', 'ES', 'IT', 'US'];
const LOSS_TYPES_BY_PRODUCT: Record<Product, LossType[]> = {
  AUTO: ['ACCIDENT', 'THEFT', 'VANDALISM', 'WEATHER'],
  HOME: ['FIRE', 'WATER', 'THEFT', 'WEATHER'],
  TRAVEL: ['CANCELLATION', 'BAGGAGE', 'THEFT', 'ACCIDENT']
};

// suspicious thresholds (for “just-below” amounts)
const SUSPICIOUS_THRESHOLDS = [4999, 9999, 14999, 19999];

// velocity window
const VELOCITY_DAYS = 14;

// reproducibility
faker.seed(42);

/** ------------ HELPERS ------------- **/
const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateBetween(start: Date, end: Date) {
  const ts = faker.date.between({ from: start, to: end }).getTime();
  return new Date(ts);
}

function jitter(val: number, pct = 0.05) {
  const delta = val * pct;
  return Math.max(1, Math.round(val + (Math.random() * 2 - 1) * delta));
}

function pickProduct(): Product {
  const r = Math.random();
  if (r < PRODUCT_SPLIT.AUTO) return 'AUTO';
  if (r < PRODUCT_SPLIT.AUTO + PRODUCT_SPLIT.HOME) return 'HOME';
  return 'TRAVEL';
}

function suspiciousAmount(base: number) {
  const t = randChoice(SUSPICIOUS_THRESHOLDS);
  const noise = Math.floor(Math.random() * 30) - 10; // +/- ~£10–20
  return Math.max(50, t + noise);
}

function normalAmount(product: Product, loss: LossType) {
  // rough ranges
  const ranges: Record<Product, [number, number]> = {
    AUTO: [300, 12000],
    HOME: [500, 25000],
    TRAVEL: [100, 6000]
  };
  const [min, max] = ranges[product];
  let base = faker.number.int({ min, max });
  if (loss === 'CANCELLATION') base = faker.number.int({ min: 200, max: 3000 });
  if (loss === 'BAGGAGE') base = faker.number.int({ min: 200, max: 2500 });
  return base;
}

function policyId() {
  return `POL-${nanoid()}`;
}
function claimId() {
  return `CLM-${nanoid()}`;
}
function claimantId() {
  return `CLT-${nanoid()}`;
}
function addressId() {
  return `ADR-${nanoid()}`;
}
function deviceId() {
  return `DEV-${nanoid()}`;
}
function bankHash() {
  const iban = faker.finance.iban();
  return hash(iban);
}

/** ------------ MAIN ------------- **/
(async () => {
  try {

    // Note: Please create the database tables manually in Supabase dashboard using schema.sql
    // or run the SQL commands from schema.sql in the Supabase SQL editor
    console.log('Starting data seed...');

    // 2) Generate base entities
    // Scale entities to support reuse/velocity patterns
    const numPolicies = 4000;
    const numAddresses = 2200;
    const numClaimants = 3200;

    const addresses = Array.from({ length: numAddresses }).map(() => {
      const id = addressId();
      const city = faker.location.city();
      const postcode = faker.location.zipCode();
      const coords = faker.location.nearbyGPSCoordinate({
        isMetric: true
      });
      const [latitude, longitude] = coords;
      return {
        address_id: id,
        line1: faker.location.streetAddress(),
        city,
        postcode,
        lat: latitude,
        lon: longitude
      };
    });

    // Insert addresses (batched)
    await insertBatch('addresses', addresses);

    const policies = Array.from({ length: numPolicies }).map(() => {
      const id = policyId();
      const product = pickProduct();
      const region = randChoice(REGIONS);
      const inception = faker.date.past({ years: 2 });
      const expiry = addDays(inception, faker.number.int({ min: 180, max: 720 }));
      return {
        policy_id: id,
        inception_date: inception,
        expiry_date: expiry,
        product,
        region
      };
    });

    const policiesForInsert = policies.map(p => ({
      policy_id: p.policy_id,
      inception_date: p.inception_date.toISOString().split('T')[0],
      expiry_date: p.expiry_date.toISOString().split('T')[0],
      product: p.product,
      region: p.region
    }));
    await insertBatch('policies', policiesForInsert);

    // Build rings (reused bank/address/device groups) to inject graph signals
    const ringCount = 30; // number of “fraud rings”
    const ringBanks = Array.from({ length: ringCount }).map(() => bankHash());
    const ringAddresses = faker.helpers.shuffle(addresses).slice(0, ringCount).map(a => a.address_id);
    const ringDevices = Array.from({ length: ringCount }).map(() => deviceId());

    const claimants = Array.from({ length: numClaimants }).map((_, i) => {
      const id = claimantId();
      const fullName = faker.person.fullName();
      const email = faker.internet.email({ firstName: fullName.split(' ')[0], lastName: fullName.split(' ')[1] });
      const phone = faker.phone.number();
      const addr = randChoice(addresses).address_id;
      const bank = Math.random() < 0.1 ? randChoice(ringBanks) : bankHash();
      const dev = Math.random() < 0.1 ? randChoice(ringDevices) : deviceId();
      return {
        claimant_id: id,
        name: fullName,
        email_hash: hash(email.toLowerCase()),
        phone_hash: hash(phone),
        address_id: Math.random() < 0.09 ? randChoice(ringAddresses) : addr, // some concentrated at ring addresses
        bank_account_hash: bank,
        device_id: dev
      };
    });

    await insertBatch('claim_parties', claimants);

    // 3) Generate claims with fraud patterns
    // Distribute products
    const targetByProduct: Record<Product, number> = {
      AUTO: Math.round(NUM_CLAIMS * PRODUCT_SPLIT.AUTO),
      HOME: Math.round(NUM_CLAIMS * PRODUCT_SPLIT.HOME),
      TRAVEL: NUM_CLAIMS - (Math.round(NUM_CLAIMS * PRODUCT_SPLIT.AUTO) + Math.round(NUM_CLAIMS * PRODUCT_SPLIT.HOME))
    };

    // Fraud targets per product
    const fraudTarget: Record<Product, number> = {
      AUTO: Math.round(targetByProduct.AUTO * FRAUD_RATE_BY_PRODUCT.AUTO),
      HOME: Math.round(targetByProduct.HOME * FRAUD_RATE_BY_PRODUCT.HOME),
      TRAVEL: Math.round(targetByProduct.TRAVEL * FRAUD_RATE_BY_PRODUCT.TRAVEL)
    };

    const claims: Array<{
      claim_id: string;
      policy_id: string;
      claimant_id: string;
      loss_date: Date;
      report_date: Date;
      loss_type: LossType;
      amount: number;
      status: Status;
      product: Product; // for scoring convenience
    }> = [];

    // map for quick lookups
    const policiesByProduct: Record<Product, typeof policies> = {
      AUTO: policies.filter(p => p.product === 'AUTO'),
      HOME: policies.filter(p => p.product === 'HOME'),
      TRAVEL: policies.filter(p => p.product === 'TRAVEL')
    };

    // Helper: create a claim (with optional fraud flags injection)
    const makeClaim = (product: Product, isFraud: boolean): typeof claims[number] => {
      const pol = randChoice(policiesByProduct[product]);
      const claimant = randChoice(claimants);
      const lossType = randChoice(LOSS_TYPES_BY_PRODUCT[product]);

      const inception = pol.inception_date;
      const expiry = pol.expiry_date;
      // normal loss date inside policy bounds
      let lossDate = randomDateBetween(inception, expiry);
      let reportDate = addDays(lossDate, faker.number.int({ min: 0, max: 7 }));

      // inject fraud date patterns
      const fraudRoll = Math.random();
      let flags: Array<'late' | 'inactive' | 'inceptionSpike' | 'velocity' | 'suspiciousAmt' | 'reuse'> = [];

      if (isFraud) {
        // choose 1–3 fraud patterns
        if (fraudRoll < 0.35) flags.push('late');
        if (Math.random() < 0.25) flags.push('inactive');
        if (Math.random() < 0.25) flags.push('inceptionSpike');
        if (Math.random() < 0.35) flags.push('suspiciousAmt');
        if (Math.random() < 0.35) flags.push('reuse');
      } else {
        // a small background noise of false positives in data
        if (Math.random() < 0.03) flags.push('suspiciousAmt');
      }

      // set date-based flags
      if (flags.includes('inactive')) {
        // pick loss outside active window
        lossDate = faker.date.between({
          from: subDays(inception, 120),
          to: subDays(inception, 1)
        });
        reportDate = addDays(lossDate, faker.number.int({ min: 1, max: 7 }));
      } else if (flags.includes('inceptionSpike')) {
        // loss within 0-3 days after inception
        lossDate = addDays(inception, faker.number.int({ min: 0, max: 3 }));
        reportDate = addDays(lossDate, faker.number.int({ min: 0, max: 2 }));
      }

      if (flags.includes('late')) {
        // report 30–90 days after loss
        reportDate = addDays(lossDate, faker.number.int({ min: 31, max: 90 }));
      }

      // amount logic
      let amount = normalAmount(product, lossType);
      if (flags.includes('suspiciousAmt')) {
        amount = suspiciousAmount(amount);
      }

      const statusPick: Status[] = ['New', 'Investigating', 'Approved', 'Closed'];
      const status = randChoice(statusPick);

      const c = {
        claim_id: claimId(),
        policy_id: pol.policy_id,
        claimant_id: claimant.claimant_id,
        loss_date: lossDate,
        report_date: reportDate,
        loss_type: lossType,
        amount: Math.round(amount * 100) / 100,
        status,
        product
      };

      // store velocity & reuse later via external logic (extra claims share addr/bank/device)
      return c;
    };

    // Generate per product with fraud ratios
    const pushClaimsForProduct = (product: Product) => {
      const total = targetByProduct[product];
      const fraudN = fraudTarget[product];
      const normalN = total - fraudN;

      for (let i = 0; i < normalN; i++) claims.push(makeClaim(product, false));
      for (let i = 0; i < fraudN; i++) claims.push(makeClaim(product, true));
    };

    pushClaimsForProduct('AUTO');
    pushClaimsForProduct('HOME');
    pushClaimsForProduct('TRAVEL');

    // 3.a) Inject velocity bursts (≥3 claims/14 days) & reuse rings
    // pick some ring addresses/devices/banks and create clustered claims around them
    const velocityClusters = 25; // number of clusters
    const clusterSize = () => faker.number.int({ min: 3, max: 6 });

    const now = new Date();
    for (let i = 0; i < velocityClusters; i++) {
      const addr = randChoice(ringAddresses);
      const dev = randChoice(ringDevices);
      const bank = randChoice(ringBanks);
      const p = randChoice(['AUTO', 'HOME', 'TRAVEL']) as Product;

      const windowStart = subDays(now, faker.number.int({ min: 20, max: 120 }));
      const baseLoss = randomDateBetween(windowStart, subDays(now, VELOCITY_DAYS));
      const k = clusterSize();
      for (let j = 0; j < k; j++) {
        // pick a claimant that we mutate to share addr/bank/device
        const cl = randChoice(claimants);
        cl.address_id = addr;
        cl.device_id = dev;
        cl.bank_account_hash = bank;

        const lossDate = addDays(baseLoss, faker.number.int({ min: 0, max: VELOCITY_DAYS - 1 }));
        const reportDate = addDays(lossDate, faker.number.int({ min: 0, max: 5 }));
        const pol = randChoice(policiesByProduct[p]);
        const lossType = randChoice(LOSS_TYPES_BY_PRODUCT[p]);

        claims.push({
          claim_id: claimId(),
          policy_id: pol.policy_id,
          claimant_id: cl.claimant_id,
          loss_date: lossDate,
          report_date: reportDate,
          loss_type: lossType,
          amount: suspiciousAmount(normalAmount(p, lossType)), // often suspicious near-threshold
          status: 'New',
          product: p
        });
      }
    }

    // 4) Insert claims (batched)
    const claimsForInsert = claims.map(c => ({
      claim_id: c.claim_id,
      policy_id: c.policy_id,
      claimant_id: c.claimant_id,
      loss_date: c.loss_date.toISOString().split('T')[0],
      report_date: c.report_date.toISOString().split('T')[0],
      loss_type: c.loss_type,
      amount: c.amount,
      status: c.status
    }));
    await insertBatch('claims', claimsForInsert);

    // 5) Compute scores (rule_score, ml_score, graph_score, risk_score)
    // Build helper maps
    const policyMap = new Map(policies.map(p => [p.policy_id, p]));
    const claimantMap = new Map(claimants.map(c => [c.claimant_id, c]));
    // for prior_claims_12m, velocity, reuse counts
    const byAddress = new Map<string, Array<typeof claims[number]>>();
    const byBank = new Map<string, Array<typeof claims[number]>>();
    const byDevice = new Map<string, Array<typeof claims[number]>>();
    const byClaimant = new Map<string, Array<typeof claims[number]>>();

    for (const cl of claims) {
      const party = claimantMap.get(cl.claimant_id)!;
      pushMap(byAddress, party.address_id, cl);
      pushMap(byBank, party.bank_account_hash, cl);
      pushMap(byDevice, party.device_id, cl);
      pushMap(byClaimant, cl.claimant_id, cl);
    }

    const scoresRows = claims.map((cl) => {
      const pol = policyMap.get(cl.policy_id)!;
      const party = claimantMap.get(cl.claimant_id)!;

      // features
      const days_to_report = Math.max(0, differenceInDays(cl.report_date, cl.loss_date));
      const days_since_inception = Math.max(0, differenceInDays(cl.loss_date, pol.inception_date));

      // prior_claims_12m for this claimant
      const prior12 = (byClaimant.get(cl.claimant_id) || []).filter(x => {
        return x.loss_date < cl.loss_date && differenceInDays(cl.loss_date, x.loss_date) <= 365;
      }).length;

      // velocity at address in 14 days around loss
      const addrs = byAddress.get(party.address_id) || [];
      const velocityCount = addrs.filter(x => {
        const d = Math.abs(differenceInDays(x.loss_date, cl.loss_date));
        return d <= VELOCITY_DAYS;
      }).length;

      const bankReuseCount = (byBank.get(party.bank_account_hash) || []).length;
      const addressDegree = (byAddress.get(party.address_id) || []).length;
      const deviceReuseCount = (byDevice.get(party.device_id) || []).length;

      // rule hits
      const ruleHits: string[] = [];
      // late reporting
      if (days_to_report > 30) ruleHits.push(`late_reporting=${days_to_report}d`);
      // inactive / outside policy or just after inception spike
      if (isBefore(cl.loss_date, pol.inception_date) || isAfter(cl.loss_date, pol.expiry_date)) {
        ruleHits.push('policy_inactive');
      } else if (differenceInDays(cl.loss_date, pol.inception_date) <= 3) {
        ruleHits.push('inception_spike');
      }
      // suspicious amount (near thresholds)
      if (SUSPICIOUS_THRESHOLDS.some(t => Math.abs(cl.amount - t) <= 30)) {
        ruleHits.push(`suspicious_amount≈${nearestThreshold(cl.amount)}`);
      }
      // velocity
      if (velocityCount >= 3) {
        ruleHits.push(`velocity_${VELOCITY_DAYS}d=${velocityCount}`);
      }
      // reuse
      if (bankReuseCount >= 3) ruleHits.push(`bank_reuse=${bankReuseCount}`);
      if (addressDegree >= 3) ruleHits.push(`address_degree=${addressDegree}`);
      if (deviceReuseCount >= 3) ruleHits.push(`device_reuse=${deviceReuseCount}`);

      // simple rule score (0–1): normalize by cap of 6 rule hits
      const rule_score = Math.min(1, ruleHits.length / 6);

      // pseudo-ML anomaly score (0–1): scale numeric features into 0–1-ish
      const s_amount = scale(cl.amount, 0, 25000);
      const s_delay = scale(days_to_report, 0, 90);
      const s_since = scale(days_since_inception, 0, 730);
      const s_prior = scale(prior12, 0, 8);
      const s_bank = scale(bankReuseCount, 0, 10);
      const s_addr = scale(addressDegree, 0, 10);
      const s_vel = scale(velocityCount, 0, 8);
      const ml_score = clamp(0.15*s_amount + 0.2*s_delay + 0.1*s_since + 0.15*s_prior + 0.2*s_bank + 0.1*s_addr + 0.1*s_vel, 0, 1);

      // graph score (centrality proxy)
      const graph_score = clamp(0.6*scale(bankReuseCount,0,12) + 0.4*scale(addressDegree,0,12), 0, 1);

      const risk_score = clamp(0.45*rule_score + 0.35*ml_score + 0.20*graph_score, 0, 1);

      const reasons = ruleHits.slice(0, 6);

      return {
        claim_id: cl.claim_id,
        rule_score: round2(rule_score),
        ml_score: round2(ml_score),
        graph_score: round2(graph_score),
        risk_score: round2(risk_score),
        reasons_json: JSON.stringify(reasons),
        created_at: new Date()
      };
    });

    const scoresForInsert = scoresRows.map(s => ({
      claim_id: s.claim_id,
      rule_score: s.rule_score,
      ml_score: s.ml_score,
      graph_score: s.graph_score,
      risk_score: s.risk_score,
      reasons_json: s.reasons_json,
      created_at: s.created_at.toISOString()
    }));
    await insertBatch('scores', scoresForInsert);

    // quick distribution logs
    const productCounts = { AUTO: 0, HOME: 0, TRAVEL: 0 } as Record<Product, number>;
    claims.forEach(c => { productCounts[c.product]++; });
    console.log('Seed complete ✅');
    console.log('Claims by product:', productCounts);

  } catch (e) {
    console.error(e);
  }
})();

/** --------- utils --------- **/
async function insertBatch(
  table: string,
  rows: any[],
  chunkSize = 500
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (!chunk.length) continue;

    const { error } = await supabase
      .from(table)
      .upsert(chunk, { ignoreDuplicates: true });

    if (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }
}

function pushMap<T>(m: Map<string, T[]>, key: string, val: T) {
  if (!m.has(key)) m.set(key, []);
  m.get(key)!.push(val);
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x));
}
function round2(x: number) {
  return Math.round(x * 100) / 100;
}
function scale(x: number, min: number, max: number) {
  if (max === min) return 0;
  const y = (x - min) / (max - min);
  return clamp(y, 0, 1);
}
function nearestThreshold(val: number) {
  let best = SUSPICIOUS_THRESHOLDS[0];
  let bd = Math.abs(val - best);
  for (const t of SUSPICIOUS_THRESHOLDS) {
    const d = Math.abs(val - t);
    if (d < bd) {
      best = t; bd = d;
    }
  }
  return best;
}