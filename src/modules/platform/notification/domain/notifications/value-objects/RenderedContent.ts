// VS09 EWP-003: RenderedContent value object

import { DeliveryValidationError } from '../NotificationErrors';

export interface RenderedContentRecord {
  subject: string;
  body: string;
}

export class RenderedContent {
  private readonly _subject: string;
  private readonly _body: string;

  private constructor(subject: string, body: string) {
    this._subject = subject;
    this._body = body;
  }

  get subject(): string { return this._subject; }
  get body(): string { return this._body; }

  static create(subject: string, body: string): RenderedContent {
    const fields: Record<string, string> = {};

    if (!subject || !subject.trim()) {
      fields.subject = 'subject is required';
    }

    if (!body || !body.trim()) {
      fields.body = 'body is required';
    }

    if (Object.keys(fields).length > 0) {
      throw new DeliveryValidationError(fields);
    }

    return new RenderedContent(subject.trim(), body);
  }

  static reconstitute(record: RenderedContentRecord): RenderedContent {
    return new RenderedContent(record.subject, record.body);
  }

  toRecord(): RenderedContentRecord {
    return {
      subject: this._subject,
      body: this._body,
    };
  }
}
