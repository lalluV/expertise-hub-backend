"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignManagedTask = exports.processManagedPayment = exports.setQuoteDecision = exports.createManagedQuote = exports.ensureRequestExists = void 0;
const Payment_1 = require("../models/Payment");
const Request_1 = require("../models/Request");
const http_1 = require("../utils/http");
const quoteResponse_1 = require("../utils/quoteResponse");
const taskResponse_1 = require("../utils/taskResponse");
const ensureRequestExists = async (requestId) => {
    const request = await Request_1.RequestModel.findById(requestId);
    if (!request) {
        throw new http_1.HttpError(404, "Request not found");
    }
    return request;
};
exports.ensureRequestExists = ensureRequestExists;
const requestPopulate = [
    { path: "customer", select: "name phone email avatarUri" },
    {
        path: "expert",
        select: "name phone headline avatarUri categories experience rating available",
    },
];
const taskPopulate = [
    ...requestPopulate,
    { path: "task.expert", select: "name phone headline avatarUri" },
];
const createManagedQuote = async (payload) => {
    const request = await (0, exports.ensureRequestExists)(payload.requestId);
    if (![Request_1.RequestStatus.PENDING, Request_1.RequestStatus.REVIEWED].includes(request.status)) {
        throw new http_1.HttpError(400, "Quote can only be created for pending/reviewed requests");
    }
    if (request.quote?.status === Request_1.QuoteStatus.PENDING) {
        throw new http_1.HttpError(400, "A pending quote already exists for this request");
    }
    const finalPrice = Number(payload.basePrice) + Number(payload.commission);
    request.quote = {
        basePrice: payload.basePrice,
        commission: payload.commission,
        finalPrice,
        notes: payload.notes?.trim() || "",
        status: Request_1.QuoteStatus.PENDING,
    };
    request.status = Request_1.RequestStatus.QUOTED;
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id).populate(requestPopulate);
    const quote = populated ? (0, quoteResponse_1.toQuoteApiResponse)(populated) : null;
    if (!quote) {
        throw new http_1.HttpError(500, "Failed to create quote");
    }
    return quote;
};
exports.createManagedQuote = createManagedQuote;
const setQuoteDecision = async (requestId, status) => {
    const request = await Request_1.RequestModel.findById(requestId);
    if (!request?.quote) {
        throw new http_1.HttpError(404, "Quote not found");
    }
    const quote = request.quote;
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
    const populated = await Request_1.RequestModel.findById(request._id).populate(requestPopulate);
    const response = populated ? (0, quoteResponse_1.toQuoteApiResponse)(populated) : null;
    if (!response) {
        throw new http_1.HttpError(500, "Failed to update quote");
    }
    return response;
};
exports.setQuoteDecision = setQuoteDecision;
const processManagedPayment = async (payload) => {
    const request = await (0, exports.ensureRequestExists)(payload.requestId);
    if (request.customer.toString() !== payload.customerId) {
        throw new http_1.HttpError(403, "You can only pay for your own request");
    }
    if (request.status !== Request_1.RequestStatus.ACCEPTED) {
        throw new http_1.HttpError(400, "Payment is only allowed after quote acceptance");
    }
    if (!request.quote || request.quote.status !== Request_1.QuoteStatus.ACCEPTED) {
        throw new http_1.HttpError(400, "Accepted quote is required before payment");
    }
    if (Number(payload.amount) !== Number(request.quote.finalPrice)) {
        throw new http_1.HttpError(400, "Payment amount must match quoted final price");
    }
    const existingSuccess = await Payment_1.Payment.findOne({
        request: payload.requestId,
        status: Payment_1.PaymentStatus.SUCCESS,
    });
    if (existingSuccess) {
        throw new http_1.HttpError(400, "Payment already completed for this request");
    }
    const payment = await Payment_1.Payment.create({
        request: payload.requestId,
        customer: payload.customerId,
        amount: payload.amount,
        status: Payment_1.PaymentStatus.SUCCESS,
    });
    request.status = Request_1.RequestStatus.REVIEWED;
    await request.save();
    return payment;
};
exports.processManagedPayment = processManagedPayment;
const assignManagedTask = async (payload) => {
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
    const populated = await Request_1.RequestModel.findById(request._id).populate(taskPopulate);
    const task = populated ? (0, taskResponse_1.toTaskApiResponse)(populated) : null;
    if (!task) {
        throw new http_1.HttpError(500, "Failed to assign task");
    }
    return task;
};
exports.assignManagedTask = assignManagedTask;
