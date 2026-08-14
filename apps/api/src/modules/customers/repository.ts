import { ObjectId } from 'mongodb';

import { database } from '../../config/database.js';
import { ensureCustomersCollection } from '../../config/mongo-schema.js';
import type { CreateCustomerInput, ListCustomersInput, UpdateCustomerInput } from './schema.js';
import type { CustomerDocument } from './types.js';

const customers = () => database().collection<CustomerDocument>('customers');

export const ensureCustomerIndexes = async () => {
  await ensureCustomersCollection();

  const existingIndexes = await customers().indexes();
  const emailIndex = existingIndexes.find((index) => index.name === 'customers_user_email');
  const needsEmailIndexMigration =
    emailIndex &&
    (emailIndex.sparse ||
      !emailIndex.unique ||
      emailIndex.partialFilterExpression?.deletedAt !== null);

  if (needsEmailIndexMigration) {
    await customers().dropIndex('customers_user_email');
  }

  await customers().createIndexes([
    {
      key: { userId: 1, email: 1 },
      name: 'customers_user_email',
      unique: true,
      partialFilterExpression: { deletedAt: null },
    },
    { key: { userId: 1, name: 1 }, name: 'customers_user_name' },
    { key: { userId: 1, createdAt: -1 }, name: 'customers_user_created' },
  ]);
};

export const createCustomer = async (userId: string, input: CreateCustomerInput) => {
  const now = new Date();
  const document: CustomerDocument = {
    _id: new ObjectId(),
    userId,
    name: input.name,
    companyName: input.companyName?.trim() || null,
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    billingAddress: input.billingAddress?.trim() || null,
    shippingAddress: input.shippingAddress?.trim() || null,
    notes: input.notes?.trim() || null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await customers().insertOne(document);
  return document;
};

export const listCustomers = async (userId: string, input: ListCustomersInput) => {
  const filter: Record<string, unknown> = { userId, deletedAt: null };

  if (input.q) {
    const query = input.q.trim();
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { companyName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
      ];
    }
  }

  const [items, total] = await Promise.all([
    customers()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((input.page - 1) * input.limit)
      .limit(input.limit)
      .toArray(),
    customers().countDocuments(filter),
  ]);

  return { items, total };
};

export const findCustomerById = async (userId: string, customerId: ObjectId) => {
  return customers().findOne({ _id: customerId, userId, deletedAt: null });
};

export const findCustomerByEmail = async (userId: string, email: string) => {
  return customers().findOne({ userId, email: email.trim().toLowerCase(), deletedAt: null });
};

export const updateCustomer = async (
  userId: string,
  customerId: ObjectId,
  input: UpdateCustomerInput,
) => {
  const update: Partial<CustomerDocument> = {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.companyName === undefined ? {} : { companyName: input.companyName?.trim() || null }),
    ...(input.email === undefined ? {} : { email: input.email.trim().toLowerCase() }),
    ...(input.phone === undefined ? {} : { phone: input.phone?.trim() || null }),
    ...(input.billingAddress === undefined
      ? {}
      : { billingAddress: input.billingAddress?.trim() || null }),
    ...(input.shippingAddress === undefined
      ? {}
      : { shippingAddress: input.shippingAddress?.trim() || null }),
    ...(input.notes === undefined ? {} : { notes: input.notes?.trim() || null }),
    updatedAt: new Date(),
  };

  return customers().findOneAndUpdate(
    { _id: customerId, userId, deletedAt: null },
    { $set: update },
    { returnDocument: 'after' },
  );
};

export const softDeleteCustomer = async (userId: string, customerId: ObjectId) => {
  return customers().findOneAndUpdate(
    { _id: customerId, userId, deletedAt: null },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
};
