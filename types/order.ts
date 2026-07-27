export type OrderType = "delivery" | "pickup";

export type TipType = "none" | "10" | "15" | "20" | "custom";

export type PaymentMethod = "manual" | "cash" | "approval" | "stripe";

export type CheckoutDetails = {
  orderType: OrderType;
  requestedDateTime: string;
  allergyNotes: string;
  substitutionPreference: string;
  tipType: TipType;
  customTipAmount?: number;
  saveContactInfo: boolean;
  allergenAcknowledged: boolean;
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryNotes: string;
  paymentMethod: PaymentMethod;
  payByDate: string;
};
