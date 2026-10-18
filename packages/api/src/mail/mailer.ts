import nodemailer from "nodemailer";

export type Email = { to: string; subject: string; text: string };

export interface Mailer {
  send(email: Email): Promise<void>;
}

export function createSmtpMailer(url: string, from: string): Mailer {
  const transport = nodemailer.createTransport(url);
  return {
    async send(email) {
      await transport.sendMail({ from, ...email });
    },
  };
}

/** For local dev without SMTP: the email, links included, goes to the log instead. */
export function createLogMailer(log: (line: string) => void = console.log): Mailer {
  return {
    async send(email) {
      log(`--- email to ${email.to}: ${email.subject}\n${email.text}\n---`);
    },
  };
}
