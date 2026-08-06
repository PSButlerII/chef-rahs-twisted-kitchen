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
  depositAmount: number;
  paymentUrl: string;
  environment: SquareDisplayEnvironment;
};

export function DepositPaymentRequestEmail({
  customerName,
  serviceType,
  depositAmount,
  paymentUrl,
  environment,
}: Props) {
  const sandboxNotice = getSquareSandboxPaymentNotice(environment);
  return (
    <BrandedEmailLayout
      preview={`Your ${serviceType.toLowerCase()} deposit is ready`}
      eyebrow="Deposit request"
      title="Your Deposit Is Ready"
    >
      <Text style={emailStyles.text}>Hi {customerName},</Text>
      <Text style={emailStyles.text}>
        Your {serviceType.toLowerCase()} request has been approved. The deposit
        due is <strong>${depositAmount.toFixed(2)}</strong>.
      </Text>
      <Text style={emailStyles.text}>
        This secure Square-hosted payment link expires in 2 hours. Your request
        is not confirmed until the deposit payment is completed.
      </Text>
      <Section>
        <Button href={paymentUrl} style={emailStyles.button}>
          Pay deposit with Square
        </Button>
      </Section>
      {sandboxNotice ? (
        <Text style={emailStyles.mutedText}>{sandboxNotice}</Text>
      ) : null}
    </BrandedEmailLayout>
  );
}
