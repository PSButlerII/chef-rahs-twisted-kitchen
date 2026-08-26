import { Button, Section, Text } from "react-email";
import { BrandedEmailLayout } from "@/emails/BrandedEmailLayout";
import { emailStyles } from "@/emails/styles";
import {
  getSquareSandboxPaymentNotice,
  type SquareDisplayEnvironment,
} from "@/lib/square-display-labels";

export function OrderPaymentRequestEmail({
  customerName,
  itemName,
  orderId,
  amountDue,
  paymentUrl,
  environment,
}: {
  customerName: string;
  itemName: string;
  orderId: string;
  amountDue: number;
  paymentUrl: string;
  environment: SquareDisplayEnvironment;
}) {
  const sandboxNotice = getSquareSandboxPaymentNotice(environment);
  return (
    <BrandedEmailLayout
      preview="Your approved order is ready for payment"
      eyebrow="Payment request"
      title="Complete Your Order Payment"
    >
      <Text style={emailStyles.text}>Hi {customerName},</Text>
      <Text style={emailStyles.text}>
        Your <strong>{itemName}</strong> order has been approved. The amount
        due is <strong>${amountDue.toFixed(2)}</strong>.
      </Text>
      <Text style={emailStyles.mutedText}>Order reference: {orderId}</Text>
      <Text style={emailStyles.text}>
        This secure Square-hosted payment link expires in 2 hours. Square is the
        official source for your payment receipt.
      </Text>
      <Section>
        <Button href={paymentUrl} style={emailStyles.button}>
          Pay now with Square
        </Button>
      </Section>
      {sandboxNotice ? (
        <Text style={emailStyles.mutedText}>{sandboxNotice}</Text>
      ) : null}
    </BrandedEmailLayout>
  );
}
