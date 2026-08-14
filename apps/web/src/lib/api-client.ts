const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type OrderStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue';

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type LineItem = {
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

export type Order = {
  id: string;
  customerId: string | null;
  customer: string;
  dueDate: string;
  currency: string;
  lineItems: LineItem[];
  subtotalCents: number;
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
  grossPaidCents: number;
  refundedTotalCents: number;
  netPaidCents: number;
  amountDueCents: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
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

export type Payment = {
  id: string;
  orderId: string;
  amountCents: number;
  paidAt: string;
  note: string | null;
  createdAt: string;
};

export type Refund = {
  id: string;
  orderId: string;
  amountCents: number;
  refundedAt: string;
  note: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  orderId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  occurredAt: string;
};

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = (await response.json().catch(() => null)) as T | ApiError | null;

  if (!response.ok) {
    const errorPayload = payload as ApiError | null;
    throw new Error(errorPayload?.error?.message ?? 'Request failed.');
  }

  return payload as T;
}

export async function getOrders(
  input: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
    q?: string;
    customerId?: string;
    refunded?: boolean;
  } = {},
) {
  const params = new URLSearchParams();
  if (input.status) params.set('status', input.status);
  if (input.page) params.set('page', String(input.page));
  if (input.limit) params.set('limit', String(input.limit));
  if (input.q?.trim()) params.set('q', input.q.trim());
  if (input.customerId) params.set('customerId', input.customerId);
  if (input.refunded) params.set('refunded', 'true');
  const query = params.toString();
  const response = await apiRequest<{ data: { items: Order[]; pagination: Pagination } }>(
    `/api/orders${query ? `?${query}` : ''}`,
  );
  return response.data;
}

export async function downloadOrdersCsv() {
  const response = await fetch(`${apiUrl}/api/orders/export`, { credentials: 'include' });
  if (!response.ok) throw new Error('Unable to export orders.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'orders.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function getCustomersPage(input: { page?: number; limit?: number; q?: string } = {}) {
  const params = new URLSearchParams();
  if (input.page) params.set('page', String(input.page));
  if (input.limit) params.set('limit', String(input.limit));
  if (input.q?.trim()) params.set('q', input.q.trim());
  const query = params.toString();
  const response = await apiRequest<{ data: { items: Customer[]; pagination: Pagination } }>(
    `/api/customers${query ? `?${query}` : ''}`,
  );
  return response.data;
}

export async function getCustomer(customerId: string) {
  const response = await apiRequest<{ data: Customer }>(`/api/customers/${customerId}`);
  return response.data;
}

export async function updateCustomer(
  customerId: string,
  input: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>,
) {
  const response = await apiRequest<{ data: Customer }>(`/api/customers/${customerId}`, {
    method: 'PATCH',
    body: input,
  });
  return response.data;
}

export async function getCustomers() {
  return (await getCustomersPage({ limit: 100 })).items;
}

export async function createCustomer(input: {
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  notes?: string;
}) {
  const response = await apiRequest<{ data: Customer }>('/api/customers', {
    method: 'POST',
    body: input,
  });
  return response.data;
}

export async function createOrder(input: {
  customerId?: string;
  customer?: string;
  currency?: string;
  dueDate: string;
  taxRateBps?: number;
  lineItems: Array<{ description: string; quantity: number; unitPriceCents: number }>;
}) {
  const response = await apiRequest<{ data: Order }>('/api/orders', {
    method: 'POST',
    body: input,
  });
  return response.data;
}

export async function getOrder(orderId: string) {
  const response = await apiRequest<{ data: Order }>(`/api/orders/${orderId}`);
  return response.data;
}

export async function getPayments(orderId: string) {
  const response = await apiRequest<{ data: Payment[] }>(`/api/orders/${orderId}/payments`);
  return response.data;
}

export async function getRefunds(orderId: string) {
  const response = await apiRequest<{ data: Refund[] }>(`/api/orders/${orderId}/refunds`);
  return response.data;
}

export async function recordRefund(
  orderId: string,
  input: { amountCents: number; refundedAt: string; note?: string },
) {
  const response = await apiRequest<{ data: { refund: Refund; order: Order } }>(
    `/api/orders/${orderId}/refunds`,
    { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: input },
  );
  return response.data;
}

export async function getAuditLogs(orderId: string) {
  const response = await apiRequest<{ data: AuditLog[] }>(`/api/orders/${orderId}/audit-logs`);
  return response.data;
}

export async function recordPayment(
  orderId: string,
  input: { amountCents: number; paidAt: string; note?: string },
) {
  const response = await apiRequest<{ data: { payment: Payment; order: Order } }>(
    `/api/orders/${orderId}/payments`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: input,
    },
  );
  return response.data;
}

export async function createPaymentLink(orderId: string) {
  const response = await apiRequest<{
    data: { url: string; createdAt: string };
  }>(`/api/orders/${orderId}/payment-link`, { method: 'POST' });
  return response.data;
}

export async function getPublicOrder(token: string) {
  const response = await apiRequest<{ data: { order: Order; payments: Payment[] } }>(
    `/api/public/payment-links/${token}`,
  );
  return response.data;
}

export async function createPublicCheckoutSession(token: string, input: { amountCents: number }) {
  const response = await apiRequest<{ data: { url: string; id: string } }>(
    `/api/public/payment-links/${token}/checkout-session`,
    {
      method: 'POST',
      body: input,
    },
  );
  return response.data;
}
