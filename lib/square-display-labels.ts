export type SquareDisplayEnvironment = "sandbox" | "production" | "invalid";

export function getSquareCustomerPaymentLabel(
  environment: SquareDisplayEnvironment,
) {
  return environment === "sandbox"
    ? "Pay with Card (Sandbox)"
    : "Pay with Card";
}

export function getSquareCustomerUnavailableLabel(
  environment: SquareDisplayEnvironment,
) {
  return environment === "sandbox"
    ? "Square Sandbox Unavailable"
    : "Online Payment Unavailable";
}

export function getSquareAdminProviderLabel(
  environment: SquareDisplayEnvironment,
) {
  return environment === "sandbox" ? "Square Sandbox" : "Square";
}

export function getSquareAdminRefundLabel(
  environment: SquareDisplayEnvironment,
) {
  return `${getSquareAdminProviderLabel(environment)} refund`;
}

export function getSquareSandboxPaymentNotice(
  environment: SquareDisplayEnvironment,
) {
  return environment === "sandbox"
    ? "This is a Square Sandbox payment request for testing."
    : null;
}

export function getSquareHistoryDisplayNote(note: string) {
  return note.replace(/Square sandbox payment/gi, "Square payment");
}
