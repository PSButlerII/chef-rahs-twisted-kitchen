import { Button, Section, Text } from "react-email";
import { BrandedEmailLayout } from "@/emails/BrandedEmailLayout";
import { emailStyles } from "@/emails/styles";
import {
  getSquareSandboxPaymentNotice,
  type SquareDisplayEnvironment,
} from "@/lib/square-display-labels";

type Props = {
  customerName: string;
  serviceType: string;
  quotedTotal: number;
  depositPaid: number;
  remainingBalance: number;
  paymentUrl: string;
  environment: SquareDisplayEnvironment;
};

export function FinalBalancePaymentRequestEmail({
  customerName,
  serviceType,
  quotedTotal,
  depositPaid,
  remainingBalance,
  paymentUrl,
  environment,
}: Props) {
  const sandboxNotice = getSquareSandboxPaymentNotice(environment);
  return (
    <BrandedEmailLayout
      preview={`Your ${serviceType.toLowerCase()} final balance is ready`}
      eyebrow="Final balance"
      title="Final Payment Is Ready"
    >
      <Text style={emailStyles.text}>Hi {customerName},</Text>
      <Text style={emailStyles.text}>
        The remaining balance for your {serviceType.toLowerCase()} request is
        ready for payment.
      </Text>
      <Section style={emailStyles.accentCard}>
        <Text style={emailStyles.row}>
          <strong>Quoted total:</strong> ${quotedTotal.toFixed(2)}
        </Text>
        <Text style={emailStyles.row}>
          <strong>Deposit paid:</strong> ${depositPaid.toFixed(2)}
        </Text>
        <Text style={emailStyles.totalText}>
          Remaining balance: ${remainingBalance.toFixed(2)}
        </Text>
      </Section>
      <Text style={emailStyles.text}>
        This secure Square-hosted link expires in 2 hours. Completing this
        payment confirms the remaining quoted balance.
      </Text>
      <Section>
        <Button href={paymentUrl} style={emailStyles.button}>
          Pay final balance with Square
        </Button>
      </Section>
      {sandboxNotice ? (
        <Text style={emailStyles.mutedText}>{sandboxNotice}</Text>
      ) : null}
    </BrandedEmailLayout>
  );
}
