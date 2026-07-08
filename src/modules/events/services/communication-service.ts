import { prisma } from "@/lib/prisma";

export class EmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    // Standard mail dispatch mock logger
    console.log(`[SMTP_DISPATCH] Sending Email To: ${to} | Subject: ${subject}`);
    return true;
  }
}

export class SmsService {
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    console.log(`[SMS_DISPATCH] Sending SMS To: ${phoneNumber} | Message: ${message}`);
    return true;
  }
}

export class WhatsAppService {
  async sendWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
    console.log(`[WHATSAPP_DISPATCH] Sending WhatsApp message to ${phoneNumber}`);
    return true;
  }
}

export class NotificationService {
  private emailService = new EmailService();
  private smsService = new SmsService();
  private whatsappService = new WhatsAppService();

  // Notification templates definitions with placeholders
  private templates: Record<string, { subject: string; body: string }> = {
    EVENT_CONFIRMED: {
      subject: "Your Event {{EventName}} is Confirmed!",
      body: "Dear {{CustomerName}}, we are pleased to confirm your event booked on {{EventDate}} at {{VenueName}}. Manager assigned: {{AssignedTo}}.",
    },
    PAYMENT_REMINDER: {
      subject: "Payment Reminder for {{EventName}}",
      body: "Hi {{CustomerName}}, this is a friendly reminder that an amount of {{AmountDue}} is due for your event on {{EventDate}}. Please make payment here: {{PaymentLink}}.",
    },
    TASK_ASSIGNED: {
      subject: "New Task Assigned: {{TaskTitle}}",
      body: "Hello {{AssignedTo}}, you have been assigned to task '{{TaskTitle}}' for event {{EventName}}.",
    },
  };

  private replacePlaceholders(templateStr: string, variables: Record<string, string>): string {
    let result = templateStr;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
    }
    return result;
  }

  async sendNotification(
    channel: "EMAIL" | "SMS" | "WHATSAPP" | "IN_APP",
    templateKey: string,
    recipient: string,
    variables: Record<string, string>
  ): Promise<boolean> {
    const template = this.templates[templateKey];
    if (!template) throw new Error(`Template not found for key: ${templateKey}`);

    const subject = this.replacePlaceholders(template.subject, variables);
    const body = this.replacePlaceholders(template.body, variables);

    // Track in database communications table
    await prisma.cateringEventCommunication.create({
      data: {
        tenantId: "8ee8a6c8-5dc6-4113-8898-0c67f4c54093",
        companyId: "2444c125-9ef1-4bdf-87f5-8d5cb5b2632b",
        branchId: "6475a34e-4f7f-4318-ae7f-0b32ee7c2a4c",
        eventId: variables.EventId || "00000000-0000-0000-0000-000000000000",
        channel,
        recipient,
        subject,
        content: body,
        createdBy: "3673f1d8-04ff-44e2-a05e-8557b447814b",
        updatedBy: "3673f1d8-04ff-44e2-a05e-8557b447814b",
      },
    });

    switch (channel) {
      case "EMAIL":
        return this.emailService.sendEmail(recipient, subject, body);
      case "SMS":
        return this.smsService.sendSms(recipient, body);
      case "WHATSAPP":
        return this.whatsappService.sendWhatsApp(recipient, body);
      case "IN_APP":
        console.log(`[IN_APP_DISPATCH] Created Notification for user ${recipient}: ${subject}`);
        return true;
      default:
        return false;
    }
  }
}
