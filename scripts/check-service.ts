import { appleRootCertificate } from "../src/server/apple-root";
import { matchFromWebDetection } from "../src/server/match";
import { canIdentify, monthKey } from "../src/server/quota";
import { readStoreSubscription } from "../src/server/subscription";
import { HttpError } from "../src/server/http";

appleRootCertificate();

const named = matchFromWebDetection({
  bestGuessLabels: [{ label: "Fisher-Price Laugh & Learn" }],
  webEntities: [{ description: "Something else", score: 0.99 }],
  pagesWithMatchingImages: [{ url: "https://example.com/toy", pageTitle: "Toy page" }],
});
if (named.title !== "Fisher-Price Laugh & Learn" || !named.found || named.sourceUrl !== "https://example.com/toy") {
  throw new Error("match failed");
}
if (matchFromWebDetection({}).found) throw new Error("empty detection should not count as found");
if (!canIdentify(1, false) || canIdentify(2, false) || !canIdentify(9, true)) {
  throw new Error("quota failed");
}
if (!/^\d{4}-\d{2}$/.test(monthKey(new Date("2026-09-29T12:00:00Z")))) {
  throw new Error("month key failed");
}

const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
const payload = Buffer.from(
  JSON.stringify({
    environment: "Xcode",
    bundleId: "app.easesell.ios",
    productId: "app.easesell.plus.monthly",
    expiresDate: Date.now() + 86_400_000,
    originalTransactionId: "xcode-1",
  })
).toString("base64url");
const jws = `${header}.${payload}.sig`;

let rejected = false;
try {
  readStoreSubscription(jws, { allowXcode: false });
} catch (error) {
  rejected = error instanceof HttpError;
}
if (!rejected) throw new Error("Xcode receipt should be rejected without dev auth");

const accepted = readStoreSubscription(jws, { allowXcode: true });
if (accepted.originalTransactionId !== "xcode-1") throw new Error("Xcode receipt was not accepted");

checkQuota()
  .then(() => {
    console.log("service checks passed");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });

async function checkQuota() {
  process.env.EASESELL_DEV_AUTH = "1";
  process.env.VISION_STUB = "1";
  delete process.env.GOOGLE_CLOUD_VISION_API_KEY;

  const { POST: signIn } = await import("../src/app/api/session/route");
  const { POST: identify } = await import("../src/app/api/identify/route");

  function request(path: string, body: unknown, token?: string): Request {
    return new Request(`http://127.0.0.1${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  const sessionResponse = await signIn(request("/api/session", { devUser: "check" }));
  const session = (await sessionResponse.json()) as { token?: string; error?: string };
  if (sessionResponse.status !== 200 || !session.token) {
    throw new Error(`sign-in failed: ${JSON.stringify(session)}`);
  }

  const photo = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64");
  async function name(draftId: string) {
    const response = await identify(
      request("/api/identify", { draftId, imageBase64: photo }, session.token)
    );
    const body = (await response.json()) as { title?: string; code?: string };
    return { status: response.status, body };
  }

  const first = await name("11111111-1111-4111-8111-111111111111");
  const second = await name("22222222-2222-4222-8222-222222222222");
  const third = await name("33333333-3333-4333-8333-333333333333");
  const retry = await name("11111111-1111-4111-8111-111111111111");
  if (first.status !== 200 || first.body.title !== "Sample item") {
    throw new Error(`first listing failed: ${JSON.stringify(first)}`);
  }
  if (second.status !== 200) throw new Error(`second listing failed: ${JSON.stringify(second)}`);
  if (third.status !== 402 || third.body.code !== "payment_required") {
    throw new Error(`third listing should require payment: ${JSON.stringify(third)}`);
  }
  if (retry.status !== 200) throw new Error(`retry should stay free: ${JSON.stringify(retry)}`);
}
