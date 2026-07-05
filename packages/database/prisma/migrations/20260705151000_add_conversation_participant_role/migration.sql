CREATE TYPE "ConversationParticipantRole" AS ENUM ('ADMIN', 'MEMBER');

ALTER TABLE "ConversationParticipant"
ADD COLUMN "role" "ConversationParticipantRole" NOT NULL DEFAULT 'MEMBER';

UPDATE "ConversationParticipant" cp
SET "role" = 'ADMIN'
FROM (
  SELECT DISTINCT ON ("conversationId") "id"
  FROM "ConversationParticipant"
  ORDER BY "conversationId", "joinedAt" ASC
) first_participant
JOIN "Conversation" c ON c."id" = (
  SELECT "conversationId"
  FROM "ConversationParticipant"
  WHERE "id" = first_participant."id"
)
WHERE cp."id" = first_participant."id"
  AND c."type" = 'GROUP';
