-- Preserve legacy Business history; Store starts in its own namespace.
CREATE TYPE "ChatApp" AS ENUM ('BUSINESS', 'STORE');
ALTER TABLE "Conversation" ADD COLUMN "app" "ChatApp" NOT NULL DEFAULT 'BUSINESS';
ALTER TABLE "PushToken" ADD COLUMN "app" "ChatApp" NOT NULL DEFAULT 'BUSINESS';
CREATE INDEX "Conversation_app_updatedAt_idx" ON "Conversation"("app", "updatedAt");
