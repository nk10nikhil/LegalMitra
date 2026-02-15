CREATE TABLE "integration_connector_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "case_id" UUID,
    "connector" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "job_id" TEXT,
    "request_payload" JSONB,
    "result_payload" JSONB,
    "error_message" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connector_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integration_connector_requests_user_id_idx" ON "integration_connector_requests"("user_id");
CREATE INDEX "integration_connector_requests_case_id_idx" ON "integration_connector_requests"("case_id");
CREATE INDEX "integration_connector_requests_connector_status_idx" ON "integration_connector_requests"("connector", "status");
CREATE INDEX "integration_connector_requests_job_id_idx" ON "integration_connector_requests"("job_id");

ALTER TABLE "integration_connector_requests"
ADD CONSTRAINT "integration_connector_requests_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "integration_connector_requests"
ADD CONSTRAINT "integration_connector_requests_case_id_fkey"
FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
