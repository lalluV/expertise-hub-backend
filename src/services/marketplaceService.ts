import { Payment, PaymentStatus } from "../models/Payment";
import {
  QuoteStatus,
  RequestModel,
  RequestStatus,
  TaskStatus,
} from "../models/Request";
import { HttpError } from "../utils/http";
import { toQuoteApiResponse } from "../utils/quoteResponse";
import { toTaskApiResponse } from "../utils/taskResponse";

export const ensureRequestExists = async (requestId: string) => {
  const request = await RequestModel.findById(requestId);
  if (!request) {
    throw new HttpError(404, "Request not found");
  }
  return request;
};

const requestPopulate = [
  { path: "customer", select: "name phone email avatarUri" },
  {
    path: "expert",
    select:
      "name phone headline avatarUri categories experience rating available",
  },
];

const taskPopulate = [
  ...requestPopulate,
  { path: "task.expert", select: "name phone headline avatarUri" },
];

export const createManagedQuote = async (payload: {
  requestId: string;
  basePrice: number;
  commission: number;
  notes?: string;
}) => {
  const request = await ensureRequestExists(payload.requestId);

  if (![RequestStatus.PENDING, RequestStatus.REVIEWED].includes(request.status)) {
    throw new HttpError(400, "Quote can only be created for pending/reviewed requests");
  }

  if (request.quote?.status === QuoteStatus.PENDING) {
    throw new HttpError(400, "A pending quote already exists for this request");
  }

  const finalPrice = Number(payload.basePrice) + Number(payload.commission);
  request.quote = {
    basePrice: payload.basePrice,
    commission: payload.commission,
    finalPrice,
    notes: payload.notes?.trim() || "",
    status: QuoteStatus.PENDING,
  };
  request.status = RequestStatus.QUOTED;
  await request.save();

  const populated = await RequestModel.findById(request._id).populate(requestPopulate);
  const quote = populated ? toQuoteApiResponse(populated) : null;
  if (!quote) {
    throw new HttpError(500, "Failed to create quote");
  }
  return quote;
};

export const setQuoteDecision = async (requestId: string, status: QuoteStatus) => {
  const request = await RequestModel.findById(requestId);
  if (!request?.quote) {
    throw new HttpError(404, "Quote not found");
  }

  const quote = request.quote;

  if (status === QuoteStatus.ACCEPTED) {
    const canAccept =
      quote.status === QuoteStatus.PENDING ||
      (quote.status === QuoteStatus.REJECTED && Boolean(request.expert));
    if (!canAccept) {
      throw new HttpError(400, "Quote cannot be accepted");
    }
  } else if (status === QuoteStatus.REJECTED) {
    if (quote.status !== QuoteStatus.PENDING) {
      throw new HttpError(400, "Quote decision was already made");
    }
  } else {
    throw new HttpError(400, "Invalid quote status");
  }

  quote.status = status;

  if (status === QuoteStatus.ACCEPTED) {
    request.status = request.expert
      ? RequestStatus.ASSIGNED
      : RequestStatus.ACCEPTED;

    if (request.expert && !request.task) {
      request.task = {
        expert: request.expert,
        status: TaskStatus.ASSIGNED,
        notes: "",
      };
    }
  } else {
    request.status = RequestStatus.REJECTED;
  }

  request.markModified("quote");
  if (request.task) {
    request.markModified("task");
  }
  await request.save();

  const populated = await RequestModel.findById(request._id).populate(requestPopulate);
  const response = populated ? toQuoteApiResponse(populated) : null;
  if (!response) {
    throw new HttpError(500, "Failed to update quote");
  }
  return response;
};

export const processManagedPayment = async (payload: {
  requestId: string;
  customerId: string;
  amount: number;
}) => {
  const request = await ensureRequestExists(payload.requestId);

  if (request.customer.toString() !== payload.customerId) {
    throw new HttpError(403, "You can only pay for your own request");
  }
  if (request.status !== RequestStatus.ACCEPTED) {
    throw new HttpError(400, "Payment is only allowed after quote acceptance");
  }

  if (!request.quote || request.quote.status !== QuoteStatus.ACCEPTED) {
    throw new HttpError(400, "Accepted quote is required before payment");
  }

  if (Number(payload.amount) !== Number(request.quote.finalPrice)) {
    throw new HttpError(400, "Payment amount must match quoted final price");
  }

  const existingSuccess = await Payment.findOne({
    request: payload.requestId,
    status: PaymentStatus.SUCCESS,
  });
  if (existingSuccess) {
    throw new HttpError(400, "Payment already completed for this request");
  }

  const payment = await Payment.create({
    request: payload.requestId,
    customer: payload.customerId,
    amount: payload.amount,
    status: PaymentStatus.SUCCESS,
  });

  request.status = RequestStatus.REVIEWED;
  await request.save();

  return payment;
};

export const assignManagedTask = async (payload: {
  requestId: string;
  expertId: string;
}) => {
  const request = await ensureRequestExists(payload.requestId);
  if (request.task) {
    throw new HttpError(400, "Task already assigned");
  }

  if (
    ![RequestStatus.ACCEPTED, RequestStatus.ASSIGNED, RequestStatus.REVIEWED].includes(
      request.status,
    )
  ) {
    throw new HttpError(
      400,
      "Task can only be assigned after the customer accepts the quote",
    );
  }

  request.task = {
    expert: payload.expertId as any,
    status: TaskStatus.ASSIGNED,
    notes: "",
  };
  request.status = RequestStatus.ASSIGNED;
  request.expert = payload.expertId as any;
  await request.save();

  const populated = await RequestModel.findById(request._id).populate(taskPopulate);
  const task = populated ? toTaskApiResponse(populated) : null;
  if (!task) {
    throw new HttpError(500, "Failed to assign task");
  }
  return task;
};
