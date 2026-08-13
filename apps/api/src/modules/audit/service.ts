import { ObjectId, type ClientSession } from 'mongodb';
import { database } from '../../config/database.js';
import { ensureAuditLogsCollection } from '../../config/mongo-schema.js';
import type { AuditLogDocument } from './types.js';

const logs = () => database().collection<AuditLogDocument>('audit_logs');
export const ensureAuditIndexes = async () => {
  await ensureAuditLogsCollection();
  await logs().createIndexes([
    { key: { userId: 1, orderId: 1, occurredAt: -1 }, name: 'audit_user_order_date' },
  ]);
};
export const recordStatusChange = async (
  input: Omit<AuditLogDocument, '_id' | 'occurredAt' | 'eventType'>,
  session?: ClientSession,
) =>
  logs().insertOne(
    { _id: new ObjectId(), ...input, eventType: 'order.status_changed', occurredAt: new Date() },
    { session },
  );
