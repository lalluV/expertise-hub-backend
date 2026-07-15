export interface LatestQuoteSummary {
  _id: string;
  status: string;
  finalPrice: number;
}

export type EnrichedRequest<T> = T & {
  taskStatus?: string;
  latestQuote?: LatestQuoteSummary;
};

function toPlain<T extends { toObject?: () => T }>(doc: T): T {
  return typeof doc.toObject === "function" ? doc.toObject() : doc;
}

export async function enrichRequestsWithStatus<T extends { _id: unknown }>(
  requests: T[],
): Promise<EnrichedRequest<T>[]> {
  return requests.map((request) => {
    const plain = toPlain(request as T & { toObject?: () => T }) as T & {
      quote?: { status: string; finalPrice: number };
      task?: { status: string };
    };

    return {
      ...plain,
      taskStatus: plain.task?.status,
      latestQuote: plain.quote
        ? {
            _id: String(plain._id),
            status: plain.quote.status,
            finalPrice: plain.quote.finalPrice,
          }
        : undefined,
    };
  });
}

export async function enrichRequestWithStatus<T extends { _id: unknown }>(
  request: T,
): Promise<EnrichedRequest<T>> {
  const [enriched] = await enrichRequestsWithStatus([request]);
  return enriched;
}
