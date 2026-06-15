-- Each customer payment proof reference may only be used once (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_proof_reference_unique"
ON "Payment" (UPPER(TRIM("reference")))
WHERE "status" IN ('AWAITING_CONFIRMATION', 'PAID', 'REFUNDED')
  AND "reference" IS NOT NULL
  AND UPPER(TRIM("reference")) <> 'MANUAL';
