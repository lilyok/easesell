import { createVerify, X509Certificate } from "crypto";
import { appleRootCertificate } from "./apple-root";
import { HttpError } from "./http";
import { PLUS_PRODUCT_ID, bundleId } from "./quota";

export interface StoreSubscription {
  productId: string;
  originalTransactionId: string;
  expiresAt: string;
  environment: string;
}

export function readStoreSubscription(
  jws: string,
  options: { allowXcode: boolean; now?: Date; expectedBundleId?: string }
): StoreSubscription {
  const parts = jws.split(".");
  if (parts.length !== 3) {
    throw new HttpError("The App Store receipt could not be read.", 400);
  }
  const payload = decodeJson(parts[1]);
  if (!payload || typeof payload !== "object") {
    throw new HttpError("The App Store receipt could not be read.", 400);
  }
  const record = payload as Record<string, unknown>;
  if (record.environment === "Xcode") {
    if (!options.allowXcode) {
      throw new HttpError("That receipt is only valid in local testing.", 400);
    }
  } else {
    verifyAppleSignature(parts[0], parts[1], parts[2]);
  }
  return subscriptionFromPayload(record, options.now ?? new Date(), options.expectedBundleId ?? bundleId());
}

function subscriptionFromPayload(
  record: Record<string, unknown>,
  now: Date,
  expectedBundleId: string
): StoreSubscription {
  if (record.bundleId !== expectedBundleId) {
    throw new HttpError("The subscription is for a different app.", 400);
  }
  if (record.productId !== PLUS_PRODUCT_ID) {
    throw new HttpError("That purchase is not EaseSell Plus.", 400);
  }
  if (record.revocationDate != null) {
    throw new HttpError("That subscription was refunded.", 400);
  }
  if (typeof record.expiresDate !== "number" || typeof record.originalTransactionId !== "string") {
    throw new HttpError("The App Store receipt is missing subscription dates.", 400);
  }
  if (record.expiresDate <= now.getTime()) {
    throw new HttpError("That subscription has expired.", 400);
  }
  const environment = typeof record.environment === "string" ? record.environment : "Production";
  return {
    productId: PLUS_PRODUCT_ID,
    originalTransactionId: record.originalTransactionId,
    expiresAt: new Date(record.expiresDate).toISOString(),
    environment,
  };
}

function verifyAppleSignature(headerPart: string, payloadPart: string, signaturePart: string): void {
  const header = decodeJson(headerPart) as { alg?: string; x5c?: string[] } | null;
  if (!header || header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length === 0) {
    throw new HttpError("The App Store receipt could not be read.", 400);
  }
  const certificates = header.x5c.map((encoded) => new X509Certificate(Buffer.from(encoded, "base64")));
  const root = appleRootCertificate();
  const now = Date.now();
  for (const certificate of certificates) {
    const from = Date.parse(certificate.validFrom);
    const to = Date.parse(certificate.validTo);
    if (now < from || now > to) {
      throw new HttpError("The App Store receipt certificate has expired.", 400);
    }
  }
  for (let index = 0; index < certificates.length - 1; index += 1) {
    if (!certificates[index].verify(certificates[index + 1].publicKey)) {
      throw new HttpError("The App Store receipt was not signed by Apple.", 400);
    }
  }
  const top = certificates[certificates.length - 1];
  const chainedToRoot =
    top.fingerprint256 === root.fingerprint256 || top.verify(root.publicKey);
  if (!chainedToRoot) {
    throw new HttpError("The App Store receipt was not signed by Apple.", 400);
  }
  const signature = Buffer.from(signaturePart, "base64url");
  const valid = createVerify("SHA256")
    .update(`${headerPart}.${payloadPart}`)
    .verify(
      { key: certificates[0].publicKey, dsaEncoding: "ieee-p1363" },
      signature
    );
  if (!valid) {
    throw new HttpError("The App Store receipt was not signed by Apple.", 400);
  }
}

function decodeJson(part: string): unknown {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
