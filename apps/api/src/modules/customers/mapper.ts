import type { CustomerDocument, CustomerResponse } from './types.js';

export const toCustomerResponse = (customer: CustomerDocument): CustomerResponse => ({
  id: customer._id.toHexString(),
  name: customer.name,
  companyName: customer.companyName,
  email: customer.email,
  phone: customer.phone,
  billingAddress: customer.billingAddress,
  shippingAddress: customer.shippingAddress,
  notes: customer.notes,
  createdAt: customer.createdAt.toISOString(),
  updatedAt: customer.updatedAt.toISOString(),
});
