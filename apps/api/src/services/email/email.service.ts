import { isSmtpConfigured, sendSmtpMail } from "../../lib/smtp";
import type { EmailRecipient, EmailTemplate } from "./email.types";

export const emailService = {
  isConfigured: isSmtpConfigured,

  async send(input: { to: EmailRecipient | string; template: EmailTemplate }) {
    const address =
      typeof input.to === "string"
        ? input.to
        : input.to.name
          ? `${input.to.name} <${input.to.email}>`
          : input.to.email;
    const attempts = Math.max(1, Number(process.env.EMAIL_SEND_ATTEMPTS || 2));
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await sendSmtpMail({
          to: address,
          subject: input.template.subject,
          text: input.template.text,
          html: input.template.html,
        });
        return;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        }
      }
    }
    throw lastError;
  },
};
