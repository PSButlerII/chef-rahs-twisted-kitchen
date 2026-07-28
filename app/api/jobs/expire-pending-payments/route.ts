import { createHash, timingSafeEqual } from "node:crypto";
import { expirePendingPayments } from "@/lib/payment-expiration";
import { rateLimitRequest, rateLimits } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MINIMUM_JOBS_TOKEN_LENGTH = 32;
const noCacheHeaders = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: noCacheHeaders,
  });
}

function tokenMatches(providedToken: string, expectedToken: string) {
  const providedDigest = createHash("sha256").update(providedToken).digest();
  const expectedDigest = createHash("sha256").update(expectedToken).digest();

  return timingSafeEqual(providedDigest, expectedDigest);
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.PAYMENT_JOBS_TOKEN?.trim();

  if (!expectedToken || expectedToken.length < MINIMUM_JOBS_TOKEN_LENGTH) {
    return jsonResponse({ error: "Not found." }, 404);
  }

  const rateLimitResponse = rateLimitRequest(
    request,
    rateLimits.paymentExpirationJob,
  );

  if (rateLimitResponse) {
    for (const [name, value] of Object.entries(noCacheHeaders)) {
      rateLimitResponse.headers.set(name, value);
    }

    return rateLimitResponse;
  }

  const providedToken = request.headers.get("x-payment-jobs-token")?.trim();

  if (!providedToken || !tokenMatches(providedToken, expectedToken)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  try {
    return jsonResponse(await expirePendingPayments(), 200);
  } catch (error) {
    console.error("Pending payment expiration job failed.", error);

    return jsonResponse(
      {
        attemptsChecked: 0,
        attemptsExpired: 0,
        ordersCancelled: 0,
        emailsSent: 0,
        errors: 1,
      },
      500,
    );
  }
}
