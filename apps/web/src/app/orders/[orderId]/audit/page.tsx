import { AuditHistory } from '@/components/orders/audit-history';
export default async function AuditPage({ params }: { params: Promise<{ orderId: string }> }) {
  return <AuditHistory orderId={(await params).orderId} />;
}
