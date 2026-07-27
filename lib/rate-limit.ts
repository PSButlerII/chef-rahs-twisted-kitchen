import { NextRequest, NextResponse } from "next/server";

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

const MAX_BUCKETS = 5000;

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function rateLimitRequest(
  request: NextRequest,
  options: RateLimitOptions,
) {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${options.keyPrefix}:${ip}`;

  pruneExpiredBuckets(now);

  const existingBucket = buckets.get(key);

  if (!existingBucket || existingBucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return null;
  }

  existingBucket.count += 1;

  if (existingBucket.count <= options.limit) {
    return null;
  }

  const retryAfterSeconds = Math.ceil((existingBucket.resetAt - now) / 1000);

  return NextResponse.json(
    {
      error: "Too many requests. Please wait a few minutes and try again.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(existingBucket.resetAt / 1000)),
      },
    },
  );
}

export const rateLimits = {
  orderCreate: {
    keyPrefix: "orders:create",
    limit: 6,
    windowMs: 10 * 60 * 1000,
  },
  serviceRequestCreate: {
    keyPrefix: "service-requests:create",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  },
  accountCreate: {
    keyPrefix: "accounts:create",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  },
  accountPasswordChange: {
    keyPrefix: "accounts:password-change",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  },
  ownerBootstrap: {
    keyPrefix: "setup:owner-bootstrap",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  },
  foundationSeed: {
    keyPrefix: "setup:foundation-seed",
    limit: 10,
    windowMs: 15 * 60 * 1000,
  },
};
