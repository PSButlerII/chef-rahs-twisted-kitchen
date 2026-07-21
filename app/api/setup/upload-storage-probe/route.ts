import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { rateLimits, rateLimitRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MINIMUM_PROBE_TOKEN_LENGTH = 32;
const PROBE_DIRECTORY_NAME = ".probe";
const PROBE_FILE_PATTERN = /^storage-probe-[\w.-]+\.txt$/;

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

function probeTokenMatches(providedToken: string, expectedToken: string) {
  const providedDigest = createHash("sha256").update(providedToken).digest();
  const expectedDigest = createHash("sha256").update(expectedToken).digest();

  return timingSafeEqual(providedDigest, expectedDigest);
}

function protectProbe(request: NextRequest) {
  const expectedToken = process.env.UPLOAD_STORAGE_PROBE_TOKEN?.trim();

  if (!expectedToken || expectedToken.length < MINIMUM_PROBE_TOKEN_LENGTH) {
    return jsonResponse({ error: "Not found." }, 404);
  }

  const rateLimitResponse = rateLimitRequest(
    request,
    rateLimits.uploadStorageProbe,
  );

  if (rateLimitResponse) {
    for (const [name, value] of Object.entries(noCacheHeaders)) {
      rateLimitResponse.headers.set(name, value);
    }

    return rateLimitResponse;
  }

  const providedToken = request.headers
    .get("x-upload-storage-probe-token")
    ?.trim();

  if (!providedToken || !probeTokenMatches(providedToken, expectedToken)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  return null;
}

function getProbeConfiguration() {
  const filesystemDirectory = process.env.UPLOAD_PROBE_FILESYSTEM_DIR?.trim();
  const publicBaseUrl = process.env.UPLOAD_PROBE_PUBLIC_BASE_URL?.trim();

  if (!filesystemDirectory || !path.isAbsolute(filesystemDirectory)) {
    throw new Error("UPLOAD_PROBE_FILESYSTEM_DIR must be an absolute path.");
  }

  if (!publicBaseUrl) {
    throw new Error("UPLOAD_PROBE_PUBLIC_BASE_URL must be configured.");
  }

  const parsedPublicBaseUrl = new URL(publicBaseUrl);

  if (!["http:", "https:"].includes(parsedPublicBaseUrl.protocol)) {
    throw new Error("UPLOAD_PROBE_PUBLIC_BASE_URL must use HTTP or HTTPS.");
  }

  return {
    probeDirectory: path.join(filesystemDirectory, PROBE_DIRECTORY_NAME),
    publicBaseUrl: parsedPublicBaseUrl.toString().replace(/\/$/, ""),
  };
}

function probeResult(
  probeDirectory: string,
  publicBaseUrl: string,
  fileName: string,
  canWrite: boolean,
  canRead: boolean,
) {
  return {
    success: canWrite && canRead,
    canWrite,
    canRead,
    fileName,
    absoluteDirectoryUsed: probeDirectory,
    publicUrl: `${publicBaseUrl}/${encodeURIComponent(fileName)}`,
    cleanupInstructions:
      "Send DELETE /api/setup/upload-storage-probe with the same probe token header, then remove UPLOAD_STORAGE_PROBE_TOKEN and restart or redeploy.",
  };
}

export async function POST(request: NextRequest) {
  const protectionResponse = protectProbe(request);

  if (protectionResponse) {
    return protectionResponse;
  }

  let probeDirectory = "";
  let publicBaseUrl = "";
  const fileName = `storage-probe-${Date.now()}-${randomUUID()}.txt`;
  let canWrite = false;
  let canRead = false;

  try {
    ({ probeDirectory, publicBaseUrl } = getProbeConfiguration());
    await mkdir(probeDirectory, { recursive: true });

    const contents = `Chef Rah's upload storage probe\n${new Date().toISOString()}\n`;
    const filePath = path.join(probeDirectory, fileName);

    await writeFile(filePath, contents, { encoding: "utf8", flag: "wx" });
    canWrite = true;
    canRead = (await readFile(filePath, "utf8")) === contents;

    return jsonResponse(
      probeResult(probeDirectory, publicBaseUrl, fileName, canWrite, canRead),
      canRead ? 200 : 500,
    );
  } catch (error) {
    console.error("Upload storage probe failed.", error);

    return jsonResponse(
      probeResult(probeDirectory, publicBaseUrl, fileName, canWrite, canRead),
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  const protectionResponse = protectProbe(request);

  if (protectionResponse) {
    return protectionResponse;
  }

  try {
    const { probeDirectory } = getProbeConfiguration();
    const entries = await readdir(probeDirectory, {
      withFileTypes: true,
    }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }

      throw error;
    });
    const probeFiles = entries.filter(
      (entry) => entry.isFile() && PROBE_FILE_PATTERN.test(entry.name),
    );

    await Promise.all(
      probeFiles.map((entry) => unlink(path.join(probeDirectory, entry.name))),
    );

    return jsonResponse(
      {
        success: true,
        filesRemoved: probeFiles.length,
        absoluteDirectoryUsed: probeDirectory,
      },
      200,
    );
  } catch (error) {
    console.error("Upload storage probe cleanup failed.", error);

    return jsonResponse({ error: "Upload storage probe cleanup failed." }, 500);
  }
}
