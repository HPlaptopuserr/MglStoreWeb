export type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

export type EmailRecipient = {
  email: string;
  name?: string | null;
};
