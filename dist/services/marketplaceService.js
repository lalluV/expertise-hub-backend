"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignManagedTask = exports.processManagedPayment = exports.getPaymentSummaryForRequest = exports.setQuoteDecision = exports.createManagedQuote = exports.ensureRequestExists = void 0;
const Payment_1 = require("../models/Payment");
const Request_1 = require("../models/Request");
const http_1 = require("../utils/http");
const quoteResponse_1 = require("../utils/quoteResponse");
const taskResponse_1 = require("../utils/taskResponse");
const money_1 = require("../utils/money");
const populate_1 = require("../utils/populate");
const ensureRequestExists = async (requestId) => {
    const request = await Request_1.RequestModel.findById(requestId);
    if (!request) {
        throw new http_1.HttpError(404, "Request not found");
    }
    return request;
};
exports.ensureRequestExists = ensureRequestExists;
const createManagedQuote = async (payload, viewer) => {
    const request = await (0, exports.ensureRequestExists)(payload.requestId);
    if (![Request_1.RequestStatus.PENDING, Request_1.RequestStatus.REVIEWED].includes(request.status)) {
        throw new http_1.HttpError(400, "Quote can only be created for pending/reviewed requests");
    }
    if (request.quote?.status === Request_1.QuoteStatus.PENDING) {
        throw new http_1.HttpError(400, "A pending quote already exists for this request");
    }
    // total (finalPrice) = (basePrice + commission) + tax; advance is a share of the total
    const totals = (0, money_1.computeQuoteTotals)(payload);
    request.quote = {
        basePrice: payload.basePrice,
        commission: payload.commission,
        taxPercent: totals.taxPercent,
        taxAmount: totals.taxAmount,
        finalPrice: totals.total,
        advancePercent: totals.advancePercent,
        advanceAmount: totals.advanceAmount,
        notes: payload.notes?.trim() || "",
        status: Request_1.QuoteStatus.PENDING,
    };
    request.status = Request_1.RequestStatus.QUOTED;
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id).populate(populate_1.requestPopulate);
    const quote = populated ? (0, quoteResponse_1.toQuoteApiResponse)(populated, viewer) : null;
    if (!quote) {
        throw new http_1.HttpError(500, "Failed to create quote");
    }
    return quote;
};
exports.createManagedQuote = createManagedQuote;
const setQuoteDecision = async (requestId, status, viewer) => {
    const request = await Request_1.RequestModel.findById(requestId);
    if (!request?.quote) {
        throw new http_1.HttpError(404, "Quote not found");
    }
    const quote = request.quote;
    if (viewer?.role === "customer" &&
        String(request.customer) !== String(viewer._id)) {
        throw new http_1.HttpError(403, "Not authorized to update this quote");
    }
    if (status === Request_1.QuoteStatus.ACCEPTED) {
        const canAccept = quote.status === Request_1.QuoteStatus.PENDING ||
            (quote.status === Request_1.QuoteStatus.REJECTED && Boolean(request.expert));
        if (!canAccept) {
            throw new http_1.HttpError(400, "Quote cannot be accepted");
        }
    }
    else if (status === Request_1.QuoteStatus.REJECTED) {
        if (quote.status !== Request_1.QuoteStatus.PENDING) {
            throw new http_1.HttpError(400, "Quote decision was already made");
        }
    }
    else {
        throw new http_1.HttpError(400, "Invalid quote status");
    }
    quote.status = status;
    if (status === Request_1.QuoteStatus.ACCEPTED) {
        request.status = request.expert
            ? Request_1.RequestStatus.ASSIGNED
            : Request_1.RequestStatus.ACCEPTED;
        if (request.expert && !request.task) {
            request.task = {
                expert: request.expert,
                status: Request_1.TaskStatus.ASSIGNED,
                notes: "",
            };
        }
    }
    else {
        request.status = Request_1.RequestStatus.REJECTED;
    }
    request.markModified("quote");
    if (request.task) {
        request.markModified("task");
    }
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id).populate(populate_1.requestPopulate);
    const response = populated ? (0, quoteResponse_1.toQuoteApiResponse)(populated, viewer) : null;
    if (!response) {
        throw new http_1.HttpError(500, "Failed to update quote");
    }
    return response;
};
exports.setQuoteDecision = setQuoteDecision;
/** Statuses in which a first (advance or full) payment may be made. */
const PAYABLE_FIRST = [Request_1.RequestStatus.ACCEPTED, Request_1.RequestStatus.ASSIGNED];
const PAYABLE_AFTER_ADVANCE = [
    Request_1.RequestStatus.ACCEPTED,
    Request_1.RequestStatus.REVIEWED,
    Request_1.RequestStatus.ASSIGNED,
    Request_1.RequestStatus.COMPLETED,
];
/** Totals + what has been paid so far for a request's accepted quote. */
const getPaymentSummaryForRequest = async (requestId) => {
    const request = await (0, exports.ensureRequestExists)(requestId);
    const quote = request.quote;
    const payments = await Payment_1.Payment.find({ request: requestId }).sort({
        createdAt: 1,
    });
    const successful = payments.filter((p) => p.status === Payment_1.PaymentStatus.SUCCESS);
    const paidTotal = (0, money_1.round2)(successful.reduce((acc, p) => acc + (p.total ?? p.amount), 0));
    if (!quote) {
        return { request, quote: null, payments, paidTotal, balanceDue: 0 };
    }
    const totals = (0, money_1.computeQuoteTotals)({
        basePrice: quote.basePrice,
        commission: quote.commission,
        taxPercent: quote.taxPercent ?? 0,
        advancePercent: quote.advancePercent ?? 0,
    });
    const advancePaid = successful.some((p) => p.type === Payment_1.PaymentType.ADVANCE);
    const finalPaid = successful.some((p) => p.type === Payment_1.PaymentType.FINAL);
    return {
        request,
        quote: totals,
        payments,
        advancePaid,
        finalPaid,
        paidTotal,
        balanceDue: (0, money_1.round2)(Math.max(0, quote.finalPrice - paidTotal)),
    };
};
exports.getPaymentSummaryForRequest = getPaymentSummaryForRequest;
const processManagedPayment = async (payload) => {
    const request = await (0, exports.ensureRequestExists)(payload.requestId);
    const type = payload.type === "advance" ? Payment_1.PaymentType.ADVANCE : Payment_1.PaymentType.FINAL;
    if (request.customer.toString() !== payload.customerId) {
        throw new http_1.HttpError(403, "You can only pay for your own request");
    }
    if (!request.quote || request.quote.status !== Request_1.QuoteStatus.ACCEPTED) {
        throw new http_1.HttpError(400, "Accepted quote is required before payment");
    }
    const quote = request.quote;
    const totals = (0, money_1.computeQuoteTotals)({
        basePrice: quote.basePrice,
        commission: quote.commission,
        taxPercent: quote.taxPercent ?? 0,
        advancePercent: quote.advancePercent ?? 0,
    });
    const successful = await Payment_1.Payment.find({
        request: payload.requestId,
        status: Payment_1.PaymentStatus.SUCCESS,
    });
    const advancePaid = successful.find((p) => p.type === Payment_1.PaymentType.ADVANCE);
    const finalPaid = successful.find((p) => p.type === Payment_1.PaymentType.FINAL);
    if (finalPaid) {
        throw new http_1.HttpError(400, "Payment already completed for this request");
    }
    let dueTotal;
    let taxPart;
    if (type === Payment_1.PaymentType.ADVANCE) {
        if (totals.advancePercent <= 0) {
            throw new http_1.HttpError(400, "This quote has no advance payment");
        }
        if (advancePaid) {
            throw new http_1.HttpError(400, "Advance payment already made for this request");
        }
        if (!PAYABLE_FIRST.includes(request.status)) {
            throw new http_1.HttpError(400, "Payment is only allowed after quote acceptance");
        }
        dueTotal = totals.advanceAmount;
        taxPart = (0, money_1.round2)((dueTotal * totals.taxPercent) / (100 + totals.taxPercent));
    }
    else {
        if (advancePaid) {
            // Balance after the advance
            if (!PAYABLE_AFTER_ADVANCE.includes(request.status)) {
                throw new http_1.HttpError(400, "Payment is not allowed in the current status");
            }
            dueTotal = (0, money_1.round2)(totals.total - (advancePaid.total ?? advancePaid.amount));
            taxPart = (0, money_1.round2)(totals.taxAmount - (advancePaid.taxAmount ?? 0));
        }
        else {
            if (!PAYABLE_FIRST.includes(request.status)) {
                throw new http_1.HttpError(400, "Payment is only allowed after quote acceptance");
            }
            dueTotal = totals.total;
            taxPart = totals.taxAmount;
        }
    }
    if (payload.amount !== undefined && (0, money_1.round2)(Number(payload.amount)) !== dueTotal) {
        throw new http_1.HttpError(400, type === Payment_1.PaymentType.ADVANCE
            ? "Payment amount must match the advance amount due"
            : advancePaid
                ? "Payment amount must match the remaining balance"
                : "Payment amount must match quoted final price");
    }
    const payment = await Payment_1.Payment.create({
        request: payload.requestId,
        customer: payload.customerId,
        amount: (0, money_1.round2)(dueTotal - taxPart),
        taxPercent: totals.taxPercent,
        taxAmount: taxPart,
        total: dueTotal,
        type,
        status: Payment_1.PaymentStatus.SUCCESS,
    });
    if (request.status === Request_1.RequestStatus.ACCEPTED) {
        request.status = Request_1.RequestStatus.REVIEWED;
        await request.save();
    }
    return payment;
};
exports.processManagedPayment = processManagedPayment;
const assignManagedTask = async (payload, viewer) => {
    const request = await (0, exports.ensureRequestExists)(payload.requestId);
    if (request.task) {
        throw new http_1.HttpError(400, "Task already assigned");
    }
    if (![Request_1.RequestStatus.ACCEPTED, Request_1.RequestStatus.ASSIGNED, Request_1.RequestStatus.REVIEWED].includes(request.status)) {
        throw new http_1.HttpError(400, "Task can only be assigned after the customer accepts the quote");
    }
    request.task = {
        expert: payload.expertId,
        status: Request_1.TaskStatus.ASSIGNED,
        notes: "",
    };
    request.status = Request_1.RequestStatus.ASSIGNED;
    request.expert = payload.expertId;
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id).populate(populate_1.taskPopulate);
    const task = populated ? (0, taskResponse_1.toTaskApiResponse)(populated, viewer) : null;
    if (!task) {
        throw new http_1.HttpError(500, "Failed to assign task");
    }
    return task;
};
exports.assignManagedTask = assignManagedTask;
