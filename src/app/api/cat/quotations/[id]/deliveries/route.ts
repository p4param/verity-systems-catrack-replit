import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth/permission-guard';
import { emailTransport } from '@/modules/cat/quotation/infrastructure/mock-email-transport';
import { DeliveryChannel, DeliveryRecipientInput } from '@/modules/cat/quotation/domain/proposal-delivery-types';

// QM-WP04B — Customer Delivery.
// Delivers the Current Published Revision only — the revision is always
// resolved server-side from cat_quotation_publications, never accepted
// from the client, so a working draft can never be delivered. Every
// recipient produces its own ProposalDelivery row (an audit log entry),
// even for a multi-recipient send.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function fetchCurrentPublishedRevision(quotationId: string, tenantId: string) {
  const rows: any[] = await prisma.$queryRaw`
    SELECT revision_number as "revisionNumber"
    FROM cat_quotation_publications
    WHERE quotation_id = ${quotationId}::uuid AND tenant_id = ${tenantId}::uuid
    ORDER BY revision_number DESC
    LIMIT 1
  `;
  return rows[0]?.revisionNumber ?? null;
}

export async function GET(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_VIEW');
    const tenantId = user.tenantId;
    const params = await props.params;
    const { id } = params;

    const deliveries: any[] = await prisma.$queryRaw`
      SELECT
        d.id,
        d.revision_number as "revisionNumber",
        d.channel,
        d.status,
        d.recipient_name as "recipientName",
        d.recipient_email as "recipientEmail",
        d.subject,
        d.message,
        d.delivered_at as "deliveredAt",
        d.delivered_by as "deliveredById",
        u."fullName" as "deliveredByName"
      FROM cat_quotation_proposal_deliveries d
      LEFT JOIN users u ON u.id = d.delivered_by
      WHERE d.quotation_id = ${id}::uuid AND d.tenant_id = ${tenantId}::uuid
      ORDER BY d.delivered_at DESC
    `;

    return NextResponse.json({
      success: true,
      deliveries: deliveries.map((d) => ({
        id: d.id,
        revisionNumber: d.revisionNumber,
        channel: d.channel,
        status: d.status,
        recipientName: d.recipientName,
        recipientEmail: d.recipientEmail,
        subject: d.subject,
        message: d.message,
        deliveredAt: d.deliveredAt,
        deliveredBy: d.deliveredById ? { id: d.deliveredById, fullName: d.deliveredByName || 'Unknown' } : undefined,
      })),
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error fetching Delivery History:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: any) {
  try {
    const user = await requirePermission(req, 'CAT_QUOTATION_EDIT');
    const tenantId = user.tenantId;
    const userId = user.id;
    const params = await props.params;
    const { id } = params;

    const body = await req.json();
    const { channel, recipients, subject, message } = body as {
      channel?: DeliveryChannel;
      recipients?: DeliveryRecipientInput[];
      subject?: string;
      message?: string;
    };

    if (channel !== 'EMAIL' && channel !== 'PDF_DOWNLOAD') {
      return NextResponse.json({ success: false, error: 'Channel must be EMAIL or PDF_DOWNLOAD.' }, { status: 400 });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one recipient is required.' }, { status: 400 });
    }
    for (const r of recipients) {
      if (!r.name?.trim() || !r.email?.trim() || !EMAIL_PATTERN.test(r.email.trim())) {
        return NextResponse.json(
          { success: false, error: 'Every recipient requires a Name and a valid Email address.' },
          { status: 400 },
        );
      }
    }
    if (channel === 'EMAIL' && (!subject?.trim() || !message?.trim())) {
      return NextResponse.json({ success: false, error: 'Subject and Message are required for Email delivery.' }, { status: 400 });
    }

    // Never deliver a working draft — the revision is always resolved from
    // the publication ledger, never accepted from the client.
    const revisionNumber = await fetchCurrentPublishedRevision(id, tenantId);
    if (revisionNumber === null) {
      return NextResponse.json(
        { success: false, error: 'This quotation has no published revision to deliver.' },
        { status: 400 },
      );
    }

    const finalSubject = channel === 'EMAIL' ? subject!.trim() : null;
    const finalMessage = channel === 'EMAIL' ? message!.trim() : null;

    const created: any[] = [];
    for (const recipient of recipients) {
      const name = recipient.name.trim();
      const email = recipient.email.trim();
      let status: 'SENT' | 'FAILED' | 'DOWNLOADED';

      if (channel === 'EMAIL') {
        try {
          const result = await emailTransport.send({ to: email, recipientName: name, subject: finalSubject!, message: finalMessage! });
          status = result.success ? 'SENT' : 'FAILED';
        } catch (err) {
          console.error('Email transport error:', err);
          status = 'FAILED';
        }
      } else {
        status = 'DOWNLOADED';
      }

      const rows: any[] = await prisma.$queryRaw`
        INSERT INTO cat_quotation_proposal_deliveries (
          id, tenant_id, quotation_id, revision_number, channel, status,
          recipient_name, recipient_email, subject, message, delivered_at, delivered_by
        ) VALUES (
          gen_random_uuid(), ${tenantId}::uuid, ${id}::uuid, ${revisionNumber}, ${channel}, ${status},
          ${name}, ${email}, ${finalSubject}, ${finalMessage}, NOW(), ${userId}::uuid
        )
        RETURNING
          id, revision_number as "revisionNumber", channel, status,
          recipient_name as "recipientName", recipient_email as "recipientEmail",
          subject, message, delivered_at as "deliveredAt"
      `;
      created.push(rows[0]);
    }

    return NextResponse.json({ success: true, deliveries: created });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Error creating Proposal Delivery:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
