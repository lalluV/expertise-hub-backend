import { IRequest } from "../models/Request";

export interface QuoteApiResponse {
  _id: string;
  request: Record<string, unknown>;
  basePrice: number;
  commission: number;
  finalPrice: number;
  notes?: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type RequestWithQuote = {
  _id: unknown;
  quote?: {
    basePrice: number;
    commission: number;
    finalPrice: number;
    notes?: string;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  toObject?: () => Record<string, unknown>;
  [key: string]: unknown;
};

export function toQuoteApiResponse(
  request: IRequest | RequestWithQuote,
): QuoteApiResponse | null {
  const plain =
    typeof request.toObject === "function"
      ? (request.toObject() as RequestWithQuote)
      : { ...request };

  if (!plain.quote) return null;

  const { quote, ...requestFields } = plain;

  return {
    _id: String(plain._id),
    request: requestFields as Record<string, unknown>,
    basePrice: quote.basePrice,
    commission: quote.commission,
    finalPrice: quote.finalPrice,
    notes: quote.notes,
    status: quote.status,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
}
