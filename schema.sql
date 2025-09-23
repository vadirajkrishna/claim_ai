-- Create tables for the claims fraud detection system

CREATE TABLE IF NOT EXISTS addresses (
    address_id TEXT PRIMARY KEY,
    line1 TEXT NOT NULL,
    city TEXT NOT NULL,
    postcode TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS policies (
    policy_id TEXT PRIMARY KEY,
    inception_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    product TEXT NOT NULL,
    region TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claim_parties (
    claimant_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email_hash TEXT NOT NULL,
    phone_hash TEXT NOT NULL,
    address_id TEXT NOT NULL REFERENCES addresses(address_id),
    bank_account_hash TEXT NOT NULL,
    device_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS claims (
    claim_id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL REFERENCES policies(policy_id),
    claimant_id TEXT NOT NULL REFERENCES claim_parties(claimant_id),
    loss_date DATE NOT NULL,
    report_date DATE NOT NULL,
    loss_type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
    claim_id TEXT PRIMARY KEY REFERENCES claims(claim_id),
    rule_score NUMERIC(5,2),
    ml_score NUMERIC(5,2),
    graph_score NUMERIC(5,2),
    risk_score NUMERIC(5,2),
    reasons_json JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimant_id ON claims(claimant_id);
CREATE INDEX IF NOT EXISTS idx_claims_loss_date ON claims(loss_date);
CREATE INDEX IF NOT EXISTS idx_claims_amount ON claims(amount);
CREATE INDEX IF NOT EXISTS idx_scores_risk_score ON scores(risk_score);
CREATE INDEX IF NOT EXISTS idx_claim_parties_address_id ON claim_parties(address_id);
CREATE INDEX IF NOT EXISTS idx_claim_parties_bank_account_hash ON claim_parties(bank_account_hash);
CREATE INDEX IF NOT EXISTS idx_claim_parties_device_id ON claim_parties(device_id);