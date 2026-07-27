"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type TokenResult = {
  status: string;
  token?: string;
  errors?: Array<{ message?: string }>;
};

type SquarePaymentMethod = {
  attach?: (selector: string) => Promise<void>;
  destroy?: () => Promise<void>;
  tokenize: () => Promise<TokenResult>;
};

type SquarePayments = {
  card: () => Promise<SquarePaymentMethod>;
  paymentRequest: (options: {
    countryCode: string;
    currencyCode: string;
    total: { amount: string; label: string };
  }) => unknown;
  applePay: (request: unknown) => Promise<SquarePaymentMethod>;
  googlePay: (request: unknown) => Promise<SquarePaymentMethod>;
};

type SquareBrowser = {
  payments: (applicationId: string, locationId: string) => SquarePayments;
};

declare global {
  interface Window {
    Square?: SquareBrowser;
  }
}

type PublicConfig = {
  enabled: boolean;
  applicationId: string | null;
  locationId: string | null;
  disabledReason: string | null;
};

export type SquareSandboxPaymentHandle = {
  tokenizeCard: () => Promise<string>;
};

type Props = {
  total: number;
  disabled: boolean;
  onWalletToken: (sourceId: string) => Promise<void>;
  onAvailabilityChange: (available: boolean) => void;
};

const scriptId = "square-sandbox-web-payments-sdk";
const scriptUrl = "https://sandbox.web.squarecdn.com/v1/square.js";

function loadSquareScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.Square) {
      resolve();
      return;
    }

    const existing = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Square payment fields could not be loaded.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Square payment fields could not be loaded."));
    document.head.appendChild(script);
  });
}

function getToken(result: TokenResult) {
  if (result.status === "OK" && result.token) return result.token;

  const message = result.errors?.find((error) => error.message)?.message;
  throw new Error(message ?? "Square could not tokenize this payment method.");
}

export const SquareSandboxPaymentForm = forwardRef<
  SquareSandboxPaymentHandle,
  Props
>(function SquareSandboxPaymentForm(
  { total, disabled, onWalletToken, onAvailabilityChange },
  ref,
) {
  const cardRef = useRef<SquarePaymentMethod | null>(null);
  const applePayRef = useRef<SquarePaymentMethod | null>(null);
  const googlePayRef = useRef<SquarePaymentMethod | null>(null);
  const [message, setMessage] = useState("Loading Square sandbox checkout...");
  const [ready, setReady] = useState(false);
  const [wallets, setWallets] = useState({ applePay: false, googlePay: false });

  useImperativeHandle(ref, () => ({
    async tokenizeCard() {
      if (!cardRef.current) {
        throw new Error("Square card fields are not ready.");
      }

      return getToken(await cardRef.current.tokenize());
    },
  }));

  useEffect(() => {
    let cancelled = false;
    const paymentMethods: SquarePaymentMethod[] = [];

    async function initialize() {
      try {
        const response = await fetch("/api/payments/square/config", {
          cache: "no-store",
        });
        const config = (await response.json()) as PublicConfig;

        if (!config.enabled || !config.applicationId || !config.locationId) {
          throw new Error(
            config.disabledReason ?? "Square sandbox checkout is disabled.",
          );
        }

        await loadSquareScript();

        if (!window.Square || cancelled) return;

        const payments = window.Square.payments(
          config.applicationId,
          config.locationId,
        );
        const card = await payments.card();
        await card.attach?.("#square-sandbox-card");
        paymentMethods.push(card);
        cardRef.current = card;

        if (cancelled) return;
        setReady(true);
        setMessage("Sandbox card fields are ready.");
        onAvailabilityChange(true);

        try {
          const paymentRequest = payments.paymentRequest({
            countryCode: "US",
            currencyCode: "USD",
            total: { amount: total.toFixed(2), label: "Total" },
          });

          try {
            const googlePay = await payments.googlePay(paymentRequest);
            await googlePay.attach?.("#square-sandbox-google-pay");
            paymentMethods.push(googlePay);
            googlePayRef.current = googlePay;
            setWallets((current) => ({ ...current, googlePay: true }));
          } catch {
            // Google Pay is optional; card checkout remains available.
          }

          try {
            const applePay = await payments.applePay(paymentRequest);
            paymentMethods.push(applePay);
            applePayRef.current = applePay;
            setWallets((current) => ({ ...current, applePay: true }));
          } catch {
            // Apple Pay is optional; card checkout remains available.
          }
        } catch {
          // Payment-request setup is optional; card checkout remains available.
        }

        if (cancelled) return;
        setMessage(
          "Sandbox card fields are ready. Wallets appear when supported.",
        );
      } catch (error) {
        if (cancelled) return;
        setReady(false);
        setMessage(
          error instanceof Error
            ? error.message
            : "Square sandbox checkout is unavailable.",
        );
        onAvailabilityChange(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      cardRef.current = null;
      applePayRef.current = null;
      googlePayRef.current = null;
      onAvailabilityChange(false);
      for (const paymentMethod of paymentMethods) {
        void paymentMethod.destroy?.();
      }
    };
  }, [onAvailabilityChange, total]);

  async function payWithWallet(method: SquarePaymentMethod | null) {
    if (!method || disabled) return;

    try {
      setMessage("Tokenizing sandbox payment...");
      await onWalletToken(getToken(await method.tokenize()));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Wallet payment failed.",
      );
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-black text-amber-950">
        Square Sandbox — test payments only
      </p>
      <p className="mt-1 text-xs leading-5 text-amber-900">{message}</p>

      <div id="square-sandbox-card" className="mt-4 min-h-12 bg-white" />

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div
          id="square-sandbox-google-pay"
          className={wallets.googlePay ? "" : "hidden"}
          onClick={() => void payWithWallet(googlePayRef.current)}
        />
        {wallets.applePay && (
          <button
            type="button"
            disabled={disabled || !ready}
            onClick={() => void payWithWallet(applePayRef.current)}
            className="rounded-md bg-black px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Pay with Apple Pay
          </button>
        )}
      </div>

      {!wallets.applePay && !wallets.googlePay && ready && (
        <p className="mt-3 text-xs text-amber-900">
          Wallet buttons appear only on supported sandbox browsers and devices.
        </p>
      )}
    </div>
  );
});
