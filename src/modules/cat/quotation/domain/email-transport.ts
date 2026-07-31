// QM-WP04B — Customer Delivery.
// Transport abstraction, deliberately kept between the delivery API route
// and whatever actually sends mail. QM-WP04B ships a mock implementation
// (see infrastructure/mock-email-transport.ts) that simulates a successful
// send and logs it. A future Work Package can plug in a real provider
// (SMTP, Microsoft 365, SES, SendGrid, ...) by implementing this same
// interface — no change to the business model, the API, or the UI.

export interface EmailDeliveryRequest {
  to: string;
  recipientName: string;
  subject: string;
  message: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  error?: string;
}

export interface EmailTransport {
  send(request: EmailDeliveryRequest): Promise<EmailDeliveryResult>;
}
