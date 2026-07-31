import { EmailDeliveryRequest, EmailDeliveryResult, EmailTransport } from '@/modules/cat/quotation/domain/email-transport';

// QM-WP04B — Customer Delivery.
// Mock transport standing in for a real SMTP/Microsoft 365/SES/SendGrid
// provider. No provider is configured anywhere in this codebase yet
// (confirmed during QM-WP04B research) — this simulates a successful send
// and logs it, so ProposalDelivery records, statuses, and Delivery History
// are all real and auditable even though the outbound send itself is not
// wired to a live provider. Swap this export for a real EmailTransport
// implementation when a provider is chosen; nothing else changes.
export class MockEmailTransport implements EmailTransport {
  async send(request: EmailDeliveryRequest): Promise<EmailDeliveryResult> {
    console.log(
      `[MOCK EMAIL TRANSPORT] Simulated send to ${request.recipientName} <${request.to}> — Subject: "${request.subject}"`,
    );
    return { success: true };
  }
}

export const emailTransport: EmailTransport = new MockEmailTransport();
