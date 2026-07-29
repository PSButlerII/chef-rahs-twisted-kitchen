import { Section, Text } from "react-email";
import { BrandedEmailLayout } from "@/emails/BrandedEmailLayout";
import { emailStyles } from "@/emails/styles";

type Props = {
  customerName: string;
  referenceLabel: string;
  referenceId: string;
  amount: number;
  reason: string;
};

export function RefundConfirmationEmail({
  customerName,
  referenceLabel,
  referenceId,
  amount,
  reason,
}: Props) {
  return (
    <BrandedEmailLayout
      preview="Your Square refund has been completed."
      eyebrow="Payment update"
      title="Refund Completed"
    >
      <Text style={emailStyles.text}>Hello {customerName},</Text>
      <Text style={emailStyles.text}>
        Your full refund has been completed. Square is the official source for
        the refund receipt and timing details.
      </Text>
      <Section style={emailStyles.accentCard}>
        <Text style={emailStyles.cardTitle}>Refund Summary</Text>
        <Text style={emailStyles.row}>
          <span style={emailStyles.label}>{referenceLabel}:</span>{" "}
          {referenceId}
        </Text>
        <Text style={emailStyles.row}>
          <span style={emailStyles.label}>Reason:</span> {reason}
        </Text>
        <Text style={emailStyles.totalText}>${amount.toFixed(2)}</Text>
      </Section>
    </BrandedEmailLayout>
  );
}
