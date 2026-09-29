export const FREE_LISTINGS_PER_MONTH = 2;
export const PLUS_PRODUCT_ID = "app.easesell.plus.monthly";

export function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function bundleId(): string {
  return process.env.APPLE_BUNDLE_ID || "app.easesell.ios";
}

export function canIdentify(used: number, subscribed: boolean): boolean {
  return subscribed || used < FREE_LISTINGS_PER_MONTH;
}

export interface AccountSummary {
  used: number;
  limit: number;
  subscribed: boolean;
  month: string;
}

export function accountSummary(
  used: number,
  subscribed: boolean,
  month = monthKey()
): AccountSummary {
  return {
    used,
    limit: FREE_LISTINGS_PER_MONTH,
    subscribed,
    month,
  };
}
