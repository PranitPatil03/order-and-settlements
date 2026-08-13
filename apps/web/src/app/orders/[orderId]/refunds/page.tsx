import { RefundHistory } from '@/components/orders/refund-history';
export default async function RefundsPage({ params }: { params: Promise<{ orderId: string }> }) {
  return <RefundHistory orderId={(await params).orderId} />;
}
