CREATE TYPE "ConversationParticipantStatus" AS ENUM ('ACCEPTED', 'PENDING', 'DECLINED');

ALTER TABLE "ConversationParticipant"
ADD COLUMN "status" "ConversationParticipantStatus" NOT NULL DEFAULT 'ACCEPTED';

CREATE INDEX "ConversationParticipant_userId_status_idx"
ON "ConversationParticipant"("userId", "status");
