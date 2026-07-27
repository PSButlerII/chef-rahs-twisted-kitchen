"use client";

import { useEffect, useState } from "react";

type BusinessSettings = {
  deliveryFee: number;
  lateFee: number;
  cateringDepositPercent: number;
  orderCutoffDay: number;
  orderCutoffHour: number;
  orderCutoffMinute: number;
  noWeekendOrdering: boolean;
  deliveryArea: string | null;
  checkoutCustomerSchedulingEnabled: boolean;
  checkoutFixedFulfillmentDay: number;
  checkoutFixedFulfillmentHour: number | null;
  checkoutFixedFulfillmentMinute: number | null;
  checkoutFixedFulfillmentMessage: string | null;
  weeklyCustomerSchedulingEnabled: boolean;
  weeklyOrderingOpenDay: number;
  weeklyOrderingOpenHour: number;
  weeklyOrderingOpenMinute: number;
  weeklyLateFeeStartDay: number;
  weeklyLateFeeStartHour: number;
  weeklyLateFeeStartMinute: number;
  weeklyOrderingCloseDay: number;
  weeklyOrderingCloseHour: number;
  weeklyOrderingCloseMinute: number;
  weeklyFixedFulfillmentDay: number;
  weeklyFixedFulfillmentHour: number | null;
  weeklyFixedFulfillmentMinute: number | null;
  weeklyFixedFulfillmentMessage: string | null;
  manualPaymentCheckoutAllowed: boolean;
};

const defaultSettings: BusinessSettings = {
  deliveryFee: 10,
  lateFee: 10,
  cateringDepositPercent: 50,
  orderCutoffDay: 4,
  orderCutoffHour: 17,
  orderCutoffMinute: 0,
  noWeekendOrdering: true,
  deliveryArea: "Greater Atlanta area",
  checkoutCustomerSchedulingEnabled: false,
  checkoutFixedFulfillmentDay: 0,
  checkoutFixedFulfillmentHour: null,
  checkoutFixedFulfillmentMinute: null,
  checkoutFixedFulfillmentMessage:
    "Orders are fulfilled on Sunday. You will be notified when your order is scheduled.",
  weeklyCustomerSchedulingEnabled: false,
  weeklyOrderingOpenDay: 3,
  weeklyOrderingOpenHour: 0,
  weeklyOrderingOpenMinute: 0,
  weeklyLateFeeStartDay: 5,
  weeklyLateFeeStartHour: 17,
  weeklyLateFeeStartMinute: 0,
  weeklyOrderingCloseDay: 5,
  weeklyOrderingCloseHour: 22,
  weeklyOrderingCloseMinute: 0,
  weeklyFixedFulfillmentDay: 0,
  weeklyFixedFulfillmentHour: null,
  weeklyFixedFulfillmentMinute: null,
  weeklyFixedFulfillmentMessage:
    "Weekly meal plan orders are delivered on Sunday. You will be notified when delivery is scheduled.",
  manualPaymentCheckoutAllowed: false,
};

export function useBusinessSettings() {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    async function loadSettings() {
      const response = await fetch("/api/business-settings");

      if (!response.ok) return;

      const data = await response.json();
      setSettings(data);
    }

    loadSettings();
  }, []);

  return settings;
}
