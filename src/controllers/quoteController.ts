import { Request, Response } from "express";
import { QuoteStatus, RequestModel } from "../models/Request";
import {
  createManagedQuote,
  setQuoteDecision,
} from "../services/marketplaceService";
import { toQuoteApiResponse } from "../utils/quoteResponse";

const requestPopulate = [
  { path: "customer", select: "name phone email avatarUri" },
  {
    path: "expert",
    select:
      "name phone headline avatarUri categories experience rating available",
  },
];

// @desc    Create a quote (Admin) — stored on the request document
// @route   POST /api/quotes
// @access  Private/Admin
export const createQuote = async (req: Request, res: Response) => {
  const { requestId, basePrice, commission, notes } = req.body;
  const quote = await createManagedQuote({
    requestId,
    basePrice,
    commission,
    notes,
  });
  res.status(201).json(quote);
};

// @desc    Accept or Reject a quote (Customer)
// @route   PATCH /api/quotes/:id/status
// @access  Private/Customer
export const updateQuoteStatus = async (req: Request, res: Response) => {
  const nextStatus = req.body.status as QuoteStatus;
  const quote = await setQuoteDecision(String(req.params.id), nextStatus);
  res.json(quote);
};

// @desc    Get quote by request id (quote id === request id)
// @route   GET /api/quotes/:id
// @access  Private
export const getQuoteById = async (req: any, res: Response) => {
  const request = await RequestModel.findOne({
    _id: req.params.id,
    quote: { $exists: true },
  }).populate(requestPopulate);

  if (!request) {
    res.status(404).json({ message: "Quote not found" });
    return;
  }

  const quote = toQuoteApiResponse(request);
  if (!quote) {
    res.status(404).json({ message: "Quote not found" });
    return;
  }

  const requestCustomer = request.customer as any;
  if (req.user.role === "customer") {
    const customerId =
      requestCustomer?._id?.toString?.() || requestCustomer?.toString?.();
    if (customerId !== req.user._id.toString()) {
      res.status(403).json({ message: "Not authorized to view this quote" });
      return;
    }
  }

  res.json(quote);
};

// @desc    Get quotes (requests that have an embedded quote)
// @route   GET /api/quotes
// @access  Private
export const getQuotes = async (req: any, res: Response) => {
  const requests = await RequestModel.find({ quote: { $exists: true } }).populate(
    requestPopulate,
  );

  const quotes = requests
    .map((request) => toQuoteApiResponse(request))
    .filter((quote): quote is NonNullable<typeof quote> => Boolean(quote));

  const filteredQuotes =
    req.user.role === "customer"
      ? quotes.filter((q) => {
          const customer = q.request?.customer as
            | { _id?: { toString(): string } }
            | string
            | undefined;
          const customerId =
            typeof customer === "object" && customer?._id
              ? customer._id.toString()
              : String(customer ?? "");
          return customerId === req.user._id.toString();
        })
      : req.user.role === "expert"
        ? quotes.filter((q) => {
            const request = q.request;
            if (!request) return false;
            const expert = request.expert as
              | { _id?: { toString(): string } }
              | string
              | undefined;
            const assignedExpert =
              typeof expert === "object" && expert?._id
                ? expert._id.toString()
                : String(expert ?? "");
            return assignedExpert === req.user._id.toString();
          })
        : quotes;

  res.json(filteredQuotes);
};
