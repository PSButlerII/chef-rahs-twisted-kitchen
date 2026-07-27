import { TIP_PRESET_PERCENTAGES } from "@/lib/payment-config";

export function calculateTip(
  subtotal: number,
  tipType: string,
  customTipAmount?: number,
) {
  if (tipType === "custom") {
    return customTipAmount ?? 0;
  }

  const percentage = Number(tipType);

  return TIP_PRESET_PERCENTAGES.includes(
    percentage as (typeof TIP_PRESET_PERCENTAGES)[number],
  )
    ? subtotal * (percentage / 100)
    : 0;
}
