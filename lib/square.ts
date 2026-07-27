import "server-only";

import { SquareClient, SquareEnvironment } from "square";

export type SquarePublicConfig = {
  enabled: boolean;
  applicationId: string | null;
  locationId: string | null;
  environment: "sandbox";
  disabledReason: string | null;
};

function readEnvironmentValue(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getSquarePublicConfig(): SquarePublicConfig {
  const environment = readEnvironmentValue("SQUARE_ENVIRONMENT");
  const applicationId = readEnvironmentValue("SQUARE_APPLICATION_ID");
  const locationId = readEnvironmentValue("SQUARE_LOCATION_ID");
  const accessToken = readEnvironmentValue("SQUARE_ACCESS_TOKEN");

  if (environment !== "sandbox") {
    return {
      enabled: false,
      applicationId: null,
      locationId: null,
      environment: "sandbox",
      disabledReason: "Square sandbox checkout is not configured.",
    };
  }

  if (!applicationId || !locationId || !accessToken) {
    return {
      enabled: false,
      applicationId: null,
      locationId: null,
      environment: "sandbox",
      disabledReason:
        "Square sandbox checkout is missing required configuration.",
    };
  }

  return {
    enabled: true,
    applicationId,
    locationId,
    environment: "sandbox",
    disabledReason: null,
  };
}

export function getSquareServerConfig() {
  const publicConfig = getSquarePublicConfig();
  const accessToken = readEnvironmentValue("SQUARE_ACCESS_TOKEN");

  if (
    !publicConfig.enabled ||
    !publicConfig.applicationId ||
    !publicConfig.locationId ||
    !accessToken
  ) {
    throw new Error("Square sandbox checkout is not configured.");
  }

  return {
    ...publicConfig,
    applicationId: publicConfig.applicationId,
    locationId: publicConfig.locationId,
    accessToken,
  };
}

export function createSquareClient() {
  const config = getSquareServerConfig();

  return new SquareClient({
    token: config.accessToken,
    environment: SquareEnvironment.Sandbox,
  });
}

export function getSquareWebhookConfig() {
  const signatureKey = readEnvironmentValue("SQUARE_WEBHOOK_SIGNATURE_KEY");
  const notificationUrl = readEnvironmentValue(
    "SQUARE_WEBHOOK_NOTIFICATION_URL",
  );

  if (!signatureKey || !notificationUrl) {
    return null;
  }

  return { signatureKey, notificationUrl };
}
