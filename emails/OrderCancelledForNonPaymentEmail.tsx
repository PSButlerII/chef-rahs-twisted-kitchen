import { Section, Text } from "react-email";
import { BrandedEmailLayout } from "@/emails/BrandedEmailLayout";
import { emailStyles } from "@/emails/styles";
import { formatOrderType } from "@/lib/format-labels";

type Props = {
  customerName: string;
  orderId: string;
  orderType: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
  }>;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Text style={emailStyles.row}>
      <span style={emailStyles.label}>{label}:</span> {value}
    </Text>
  );
}

export function OrderCancelledForNonPaymentEmail({
  customerName,
  orderId,
  orderType,
  total,
  items,
}: Props) {
  return (
    <BrandedEmailLayout
      preview="Your order was cancelled because payment was not completed."
      eyebrow="Payment timeout"
      title="Order Cancelled"
    >
      <Text style={emailStyles.text}>Hello {customerName},</Text>

      <Text style={emailStyles.text}>
        Your order was cancelled because payment was not completed within the
        two-hour payment window. This cancellation process does not itself
        create a charge.
      </Text>

      <Section style={emailStyles.accentCard}>
        <Text style={emailStyles.cardTitle}>Cancelled Order</Text>
        <DetailRow label="Order ID" value={orderId} />
        <DetailRow label="Order Type" value={formatOrderType(orderType)} />
        <Text style={emailStyles.totalText}>${total.toFixed(2)}</Text>
      </Section>

      <Section style={emailStyles.card}>
        <Text style={emailStyles.cardTitle}>Order Summary</Text>
        {items.map((item, index) => (
          <Text key={`${item.name}-${index}`} style={emailStyles.row}>
            {item.quantity} × {item.name}
          </Text>
        ))}
      </Section>

      <Text style={emailStyles.text}>
        If ordering is still available, you may return to the website and place
        a new order. No public order or retry link is included in this email.
      </Text>
    </BrandedEmailLayout>
  );
}
