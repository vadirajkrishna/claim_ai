/**
 * Fraud Detection Validation Rules
 *
 * This file contains all validation rules for detecting fraudulent insurance claims
 * across Auto, Home, and Travel products. Rules are segregated by validation type.
 */

export interface ValidationRule {
  name: string;
  description: string;
  threshold: number | string;
  weight: number; // 0-1 weight for overall risk score calculation
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MLFeature {
  name: string;
  description: string;
  normalizeRange: [number, number]; // [min, max] for normalization
  weight: number;
}

export interface GraphRule {
  name: string;
  description: string;
  threshold: number;
  weight: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// =============================================================================
// DIRECT SQL DATA CHECK RULES
// =============================================================================

export const SQL_VALIDATION_RULES: ValidationRule[] = [
  // TEMPORAL RULES
  {
    name: 'late_reporting',
    description: 'Claims reported more than 30 days after loss date',
    threshold: 30, // days
    weight: 0.15,
    severity: 'medium'
  },
  {
    name: 'policy_inactive_before',
    description: 'Loss occurred before policy inception date',
    threshold: 0, // days before inception
    weight: 0.25,
    severity: 'critical'
  },
  {
    name: 'policy_inactive_after',
    description: 'Loss occurred after policy expiry date',
    threshold: 0, // days after expiry
    weight: 0.25,
    severity: 'critical'
  },
  {
    name: 'inception_spike',
    description: 'Loss occurred within 3 days of policy inception',
    threshold: 3, // days from inception
    weight: 0.12,
    severity: 'medium'
  },

  // AMOUNT RULES
  {
    name: 'suspicious_amount_5k',
    description: 'Claim amount suspiciously close to £5,000 threshold',
    threshold: 50, // £50 variance from £5,000
    weight: 0.08,
    severity: 'low'
  },
  {
    name: 'suspicious_amount_10k',
    description: 'Claim amount suspiciously close to £10,000 threshold',
    threshold: 100, // £100 variance from £10,000
    weight: 0.10,
    severity: 'medium'
  },
  {
    name: 'suspicious_amount_15k',
    description: 'Claim amount suspiciously close to £15,000 threshold',
    threshold: 150, // £150 variance from £15,000
    weight: 0.10,
    severity: 'medium'
  },
  {
    name: 'suspicious_amount_20k',
    description: 'Claim amount suspiciously close to £20,000 threshold',
    threshold: 200, // £200 variance from £20,000
    weight: 0.12,
    severity: 'medium'
  },

  // VELOCITY RULES
  {
    name: 'velocity_14d_address',
    description: '3 or more claims from same address within 14 days',
    threshold: 3, // claims count
    weight: 0.18,
    severity: 'high'
  },
  {
    name: 'velocity_14d_bank',
    description: '3 or more claims to same bank account within 14 days',
    threshold: 3, // claims count
    weight: 0.20,
    severity: 'high'
  },
  {
    name: 'velocity_14d_device',
    description: '3 or more claims from same device within 14 days',
    threshold: 3, // claims count
    weight: 0.18,
    severity: 'high'
  },

  // REUSE RULES
  {
    name: 'bank_reuse_30d',
    description: 'Bank account used across 5+ claims in 30 days',
    threshold: 5, // claims count
    weight: 0.16,
    severity: 'high'
  },
  {
    name: 'address_reuse_90d',
    description: 'Address used across 4+ claims in 90 days',
    threshold: 4, // claims count
    weight: 0.14,
    severity: 'medium'
  },
  {
    name: 'device_reuse_60d',
    description: 'Device used across 3+ claims in 60 days',
    threshold: 3, // claims count
    weight: 0.12,
    severity: 'medium'
  },

  // PRIOR CLAIMS RULES
  {
    name: 'prior_claims_12m',
    description: 'Claimant has 3+ claims in last 12 months',
    threshold: 3, // claims count
    weight: 0.10,
    severity: 'medium'
  },
  {
    name: 'prior_claims_6m',
    description: 'Claimant has 2+ claims in last 6 months',
    threshold: 2, // claims count
    weight: 0.08,
    severity: 'low'
  }
];

// SQL queries for each rule
export const SQL_RULE_QUERIES = {
  late_reporting: `
    SELECT claim_id,
           (report_date - loss_date) as days_delay
    FROM claims
    WHERE (report_date - loss_date) > 30
  `,

  policy_inactive_before: `
    SELECT c.claim_id, c.loss_date, p.inception_date
    FROM claims c
    JOIN policies p ON c.policy_id = p.policy_id
    WHERE c.loss_date < p.inception_date
  `,

  policy_inactive_after: `
    SELECT c.claim_id, c.loss_date, p.expiry_date
    FROM claims c
    JOIN policies p ON c.policy_id = p.policy_id
    WHERE c.loss_date > p.expiry_date
  `,

  inception_spike: `
    SELECT c.claim_id,
           (c.loss_date - p.inception_date) as days_from_inception
    FROM claims c
    JOIN policies p ON c.policy_id = p.policy_id
    WHERE (c.loss_date - p.inception_date) <= 3
  `,

  velocity_14d_address: `
    SELECT cp.address_id,
           COUNT(*) as claim_count,
           ARRAY_AGG(c.claim_id) as claim_ids
    FROM claims c
    JOIN claim_parties cp ON c.claimant_id = cp.claimant_id
    WHERE c.loss_date >= CURRENT_DATE - INTERVAL '14 days'
    GROUP BY cp.address_id
    HAVING COUNT(*) >= 3
  `,

  velocity_14d_bank: `
    SELECT cp.bank_account_hash,
           COUNT(*) as claim_count,
           ARRAY_AGG(c.claim_id) as claim_ids
    FROM claims c
    JOIN claim_parties cp ON c.claimant_id = cp.claimant_id
    WHERE c.loss_date >= CURRENT_DATE - INTERVAL '14 days'
    GROUP BY cp.bank_account_hash
    HAVING COUNT(*) >= 3
  `,

  bank_reuse_30d: `
    SELECT cp.bank_account_hash,
           COUNT(*) as claim_count,
           ARRAY_AGG(DISTINCT c.claimant_id) as claimant_ids
    FROM claims c
    JOIN claim_parties cp ON c.claimant_id = cp.claimant_id
    WHERE c.loss_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY cp.bank_account_hash
    HAVING COUNT(*) >= 5
  `
};

// =============================================================================
// ML SCORE VALIDATION FEATURES
// =============================================================================

export const ML_FEATURES: MLFeature[] = [
  {
    name: 'amount',
    description: 'Claim amount in GBP',
    normalizeRange: [0, 50000], // £0 to £50k
    weight: 0.15
  },
  {
    name: 'days_to_report',
    description: 'Days between loss and report date',
    normalizeRange: [0, 365], // 0 to 365 days
    weight: 0.20
  },
  {
    name: 'days_since_inception',
    description: 'Days between policy inception and loss',
    normalizeRange: [0, 730], // 0 to 2 years
    weight: 0.10
  },
  {
    name: 'prior_claims_12m',
    description: 'Number of prior claims by claimant in 12 months',
    normalizeRange: [0, 10], // 0 to 10 claims
    weight: 0.15
  },
  {
    name: 'bank_reuse_count',
    description: 'Number of claims using same bank account',
    normalizeRange: [1, 15], // 1 to 15 claims
    weight: 0.20
  },
  {
    name: 'address_degree',
    description: 'Number of claims from same address',
    normalizeRange: [1, 12], // 1 to 12 claims
    weight: 0.10
  },
  {
    name: 'velocity_14d',
    description: 'Number of claims in 14-day window',
    normalizeRange: [1, 8], // 1 to 8 claims
    weight: 0.10
  }
];

// ML model thresholds
export const ML_THRESHOLDS = {
  anomaly_score: 0.6, // IsolationForest anomaly threshold
  z_score: 2.5, // Z-score threshold for baseline model
  risk_score: 0.7 // Overall ML risk score threshold
};

// =============================================================================
// GRAPH CHECK RULES
// =============================================================================

export const GRAPH_RULES: GraphRule[] = [
  {
    name: 'high_degree_bank_node',
    description: 'Bank account node connected to 8+ distinct claims',
    threshold: 8, // connections
    weight: 0.25,
    severity: 'critical'
  },
  {
    name: 'high_degree_address_node',
    description: 'Address node connected to 6+ distinct claimants',
    threshold: 6, // connections
    weight: 0.20,
    severity: 'high'
  },
  {
    name: 'high_degree_device_node',
    description: 'Device node connected to 5+ distinct claims',
    threshold: 5, // connections
    weight: 0.18,
    severity: 'high'
  },
  {
    name: 'triangle_pattern',
    description: 'Three claimants sharing address-bank-device triangle',
    threshold: 3, // minimum triangle size
    weight: 0.22,
    severity: 'critical'
  },
  {
    name: 'community_detection',
    description: 'Dense community with elevated average claim amounts',
    threshold: 1.5, // multiplier above average
    weight: 0.15,
    severity: 'medium'
  },
  {
    name: 'betweenness_centrality',
    description: 'Node with high betweenness centrality (broker role)',
    threshold: 0.1, // centrality score
    weight: 0.12,
    severity: 'medium'
  },
  {
    name: 'clustering_coefficient',
    description: 'Low clustering coefficient indicating artificial connections',
    threshold: 0.3, // below this threshold is suspicious
    weight: 0.10,
    severity: 'low'
  }
];

// Graph analysis queries (for SQL-based graph computation)
export const GRAPH_QUERIES = {
  bank_degree: `
    SELECT cp.bank_account_hash,
           COUNT(DISTINCT c.claim_id) as degree,
           COUNT(DISTINCT c.claimant_id) as unique_claimants,
           AVG(c.amount) as avg_amount
    FROM claims c
    JOIN claim_parties cp ON c.claimant_id = cp.claimant_id
    GROUP BY cp.bank_account_hash
    HAVING COUNT(DISTINCT c.claim_id) >= 8
  `,

  address_degree: `
    SELECT cp.address_id,
           COUNT(DISTINCT c.claimant_id) as degree,
           COUNT(DISTINCT c.claim_id) as total_claims,
           AVG(c.amount) as avg_amount
    FROM claims c
    JOIN claim_parties cp ON c.claimant_id = cp.claimant_id
    GROUP BY cp.address_id
    HAVING COUNT(DISTINCT c.claimant_id) >= 6
  `,

  triangles: `
    WITH shared_entities AS (
      SELECT
        c1.claimant_id as claimant1,
        c2.claimant_id as claimant2,
        cp1.address_id,
        cp1.bank_account_hash,
        cp1.device_id
      FROM claim_parties cp1
      JOIN claim_parties cp2 ON (
        cp1.address_id = cp2.address_id OR
        cp1.bank_account_hash = cp2.bank_account_hash OR
        cp1.device_id = cp2.device_id
      )
      JOIN claims c1 ON cp1.claimant_id = c1.claimant_id
      JOIN claims c2 ON cp2.claimant_id = c2.claimant_id
      WHERE cp1.claimant_id < cp2.claimant_id
    )
    SELECT address_id, bank_account_hash, device_id,
           COUNT(*) as triangle_count,
           ARRAY_CAT(ARRAY_AGG(DISTINCT claimant1), ARRAY_AGG(DISTINCT claimant2)) as claimants
    FROM shared_entities
    GROUP BY address_id, bank_account_hash, device_id
    HAVING COUNT(*) >= 3
  `
};

// =============================================================================
// RISK SCORING CONFIGURATION
// =============================================================================

export const RISK_SCORING = {
  // Weight distribution for final risk score
  weights: {
    rule_score: 0.45,    // SQL rule violations
    ml_score: 0.35,      // ML anomaly detection
    graph_score: 0.20    // Graph pattern analysis
  },

  // Risk level thresholds
  thresholds: {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
    critical: 0.85
  },

  // Actions based on risk levels
  actions: {
    low: 'monitor',
    medium: 'review',
    high: 'investigate',
    critical: 'escalate_siu'
  }
};

// Product-specific rule adjustments
export const PRODUCT_ADJUSTMENTS = {
  AUTO: {
    // Auto claims typically have higher amounts, adjust thresholds
    amount_multiplier: 1.0,
    velocity_sensitivity: 1.2, // More sensitive to velocity
    inception_spike_weight: 1.3 // Higher weight for inception spikes
  },
  HOME: {
    // Home claims can have very high amounts
    amount_multiplier: 1.5,
    velocity_sensitivity: 0.8, // Less sensitive to velocity
    inception_spike_weight: 1.0
  },
  TRAVEL: {
    // Travel claims are typically lower amounts
    amount_multiplier: 0.6,
    velocity_sensitivity: 1.1,
    inception_spike_weight: 0.8 // Lower weight for inception spikes
  }
};

// Export all rules for easy import
export const ALL_VALIDATION_RULES = {
  SQL_VALIDATION_RULES,
  SQL_RULE_QUERIES,
  ML_FEATURES,
  ML_THRESHOLDS,
  GRAPH_RULES,
  GRAPH_QUERIES,
  RISK_SCORING,
  PRODUCT_ADJUSTMENTS
};