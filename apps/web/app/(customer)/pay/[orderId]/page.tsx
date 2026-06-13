import { OrderPaymentView } from "../../../../components/customer/OrderPaymentView";

type Props = { params: Promise<{ orderId: string }> };

export default async function PayOrderPage({ params }: Props) {
  const { orderId } = await params;
  return <OrderPaymentView orderId={orderId} />;
}
