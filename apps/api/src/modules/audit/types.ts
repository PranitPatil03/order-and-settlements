import type { ObjectId } from 'mongodb';
export type AuditLogDocument = {
  _id: ObjectId;
  userId: string;
  orderId: ObjectId;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  occurredAt: Date;
};
