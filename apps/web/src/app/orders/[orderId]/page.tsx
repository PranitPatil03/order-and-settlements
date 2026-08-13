import { OrderDetail } from '@/components/orders/order-detail';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetail orderId={orderId} />;
}
