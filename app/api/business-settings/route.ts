import { NextResponse } from "next/server";
import { getBusinessSettings } from "@/lib/business-settings";
import { isManualPaymentCheckoutAllowed } from "@/lib/payment-config";

export async function GET() {
  const settings = await getBusinessSettings();

  return NextResponse.json({
    ...settings,
    manualPaymentCheckoutAllowed: isManualPaymentCheckoutAllowed(),
  });
}
