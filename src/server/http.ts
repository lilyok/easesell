export class HttpError extends Error {
  readonly status: number;
  readonly extra: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    extra: Record<string, unknown> = {}
  ) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function devAuthEnabled(): boolean {
  return process.env.EASESELL_DEV_AUTH === "1";
}
