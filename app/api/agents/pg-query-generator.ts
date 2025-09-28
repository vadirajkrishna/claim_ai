import { Agent } from '@openai/agents';
import { SQL_QUERY_PROMPT } from '@/components/agent/prompt';

// Create JSON-formatted version of the SQL_QUERY_PROMPT for this specific agent
const JSON_SQL_QUERY_PROMPT = `${SQL_QUERY_PROMPT}

## CRITICAL OUTPUT FORMAT REQUIREMENT

YOU MUST RESPOND ONLY WITH VALID JSON. NO MARKDOWN, NO EXPLANATIONS, NO ADDITIONAL TEXT.

### For Single Query Request:
\`\`\`json
{
  "rule_name": "Late Reporting Detection",
  "query": "SELECT c.claim_id, c.loss_date, c.report_date, (c.report_date - c.loss_date) AS days_to_report FROM claims c WHERE (c.report_date - c.loss_date) > 30 ORDER BY days_to_report DESC;"
}
\`\`\`

### For Multiple Query Request:
\`\`\`json
[
  {
    "rule_name": "Late Reporting Detection",
    "query": "SELECT c.claim_id, c.loss_date, c.report_date, (c.report_date - c.loss_date) AS days_to_report FROM claims c WHERE (c.report_date - c.loss_date) > 30 ORDER BY days_to_report DESC;"
  },
  {
    "rule_name": "Bank Account Reuse",
    "query": "SELECT cp.bank_account_hash, COUNT(DISTINCT cp.claimant_id) as claimant_count, ARRAY_AGG(DISTINCT cp.claimant_id) as claimant_ids FROM claim_parties cp WHERE cp.bank_account_hash IS NOT NULL GROUP BY cp.bank_account_hash HAVING COUNT(DISTINCT cp.claimant_id) > 1 ORDER BY claimant_count DESC;"
  }
]
\`\`\`

REMEMBER: Your response must be valid JSON only. No markdown code blocks, no explanations, no additional text.
`;

// SQL Query Generator Agent
export const sqlQueryGeneratorAgent = new Agent({
  name: 'SQL Query Generator',
  instructions: JSON_SQL_QUERY_PROMPT,
  model: 'gpt-5'
});