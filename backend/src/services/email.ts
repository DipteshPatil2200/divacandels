import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export async function sendInquiryEmails(inquiry: { inquiryNumber: string; inquiryType?: string; customerName: string; email?: string | null; phone: string; message: string; createdAt?: Date }) {
  if (env.EMAIL_PROVIDER === "console") {
    console.info(`Email preview: New inquiry ${inquiry.inquiryNumber} from ${inquiry.customerName}`);
    return;
  }
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.EMAIL_FROM_ADDRESS) throw new Error("SMTP configuration is incomplete");
  const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } });
  const isContact = inquiry.inquiryType === "GENERAL" && inquiry.inquiryNumber.startsWith("DIVA-CONTACT-");
  await transport.sendMail({ from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`, to: env.NOTIFICATION_EMAIL, subject: isContact ? `New DIVA Candles Contact Inquiry – ${inquiry.inquiryNumber}` : `New DIVA Candles Inquiry – ${inquiry.inquiryNumber} – ${inquiry.customerName}`, text: `New Customer Inquiry\n\nInquiry No:\n${inquiry.inquiryNumber}\n\nCustomer Name:\n${inquiry.customerName}\n\nMobile:\n${inquiry.phone}\n\nEmail:\n${inquiry.email || "Not provided"}\n\nMessage:\n${inquiry.message}\n\nDate:\n${(inquiry.createdAt ?? new Date()).toLocaleString("en-IN")}` });
  if (inquiry.email) await transport.sendMail({ from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`, to: inquiry.email, subject: `We received your DIVA Candles inquiry – ${inquiry.inquiryNumber}`, text: `Thank you for contacting DIVA Candles.\n\nWe have received your inquiry under reference number ${inquiry.inquiryNumber}. Our team will contact you shortly.\n\nIlluminate Moments. Inspire Memories.` });
}
