import type { ObjectId } from 'mongodb';

export type CustomerDocument = {
  _id: ObjectId;
  userId: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  notes: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerResponse = {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
