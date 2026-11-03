type ModeChangeTicket = {
  status: string;
  posSaleId: string | null;
  kitchenTicketStatuses: string[];
};

/**
 * An OPEN ticket is only a draft when it has not produced a sale and every
 * kitchen ticket (if any) was cancelled. These drafts are not visible on KDS
 * and can be cancelled when an admin changes the register mode.
 */
export function canAutoCancelTicketForRegisterModeChange(
  ticket: ModeChangeTicket,
) {
  return (
    ticket.status === "OPEN" &&
    ticket.posSaleId === null &&
    ticket.kitchenTicketStatuses.every((status) => status === "CANCELLED")
  );
}
