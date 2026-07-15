"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuotes = exports.getQuoteById = exports.updateQuoteStatus = exports.createQuote = void 0;
const Request_1 = require("../models/Request");
const marketplaceService_1 = require("../services/marketplaceService");
const quoteResponse_1 = require("../utils/quoteResponse");
const requestPopulate = [
    { path: "customer", select: "name phone email avatarUri" },
    {
        path: "expert",
        select: "name phone headline avatarUri categories experience rating available",
    },
];
// @desc    Create a quote (Admin) — stored on the request document
// @route   POST /api/quotes
// @access  Private/Admin
const createQuote = async (req, res) => {
    const { requestId, basePrice, commission, notes } = req.body;
    const quote = await (0, marketplaceService_1.createManagedQuote)({
        requestId,
        basePrice,
        commission,
        notes,
    });
    res.status(201).json(quote);
};
exports.createQuote = createQuote;
// @desc    Accept or Reject a quote (Customer)
// @route   PATCH /api/quotes/:id/status
// @access  Private/Customer
const updateQuoteStatus = async (req, res) => {
    const nextStatus = req.body.status;
    const quote = await (0, marketplaceService_1.setQuoteDecision)(String(req.params.id), nextStatus);
    res.json(quote);
};
exports.updateQuoteStatus = updateQuoteStatus;
// @desc    Get quote by request id (quote id === request id)
// @route   GET /api/quotes/:id
// @access  Private
const getQuoteById = async (req, res) => {
    const request = await Request_1.RequestModel.findOne({
        _id: req.params.id,
        quote: { $exists: true },
    }).populate(requestPopulate);
    if (!request) {
        res.status(404).json({ message: "Quote not found" });
        return;
    }
    const quote = (0, quoteResponse_1.toQuoteApiResponse)(request);
    if (!quote) {
        res.status(404).json({ message: "Quote not found" });
        return;
    }
    const requestCustomer = request.customer;
    if (req.user.role === "customer") {
        const customerId = requestCustomer?._id?.toString?.() || requestCustomer?.toString?.();
        if (customerId !== req.user._id.toString()) {
            res.status(403).json({ message: "Not authorized to view this quote" });
            return;
        }
    }
    res.json(quote);
};
exports.getQuoteById = getQuoteById;
// @desc    Get quotes (requests that have an embedded quote)
// @route   GET /api/quotes
// @access  Private
const getQuotes = async (req, res) => {
    const requests = await Request_1.RequestModel.find({ quote: { $exists: true } }).populate(requestPopulate);
    const quotes = requests
        .map((request) => (0, quoteResponse_1.toQuoteApiResponse)(request))
        .filter((quote) => Boolean(quote));
    const filteredQuotes = req.user.role === "customer"
        ? quotes.filter((q) => {
            const customer = q.request?.customer;
            const customerId = typeof customer === "object" && customer?._id
                ? customer._id.toString()
                : String(customer ?? "");
            return customerId === req.user._id.toString();
        })
        : req.user.role === "expert"
            ? quotes.filter((q) => {
                const request = q.request;
                if (!request)
                    return false;
                const expert = request.expert;
                const assignedExpert = typeof expert === "object" && expert?._id
                    ? expert._id.toString()
                    : String(expert ?? "");
                return assignedExpert === req.user._id.toString();
            })
            : quotes;
    res.json(filteredQuotes);
};
exports.getQuotes = getQuotes;
