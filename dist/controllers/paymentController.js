"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRevenueAnalytics = exports.getPaymentSummary = exports.getPayments = exports.processPayment = void 0;
const marketplaceService_1 = require("../services/marketplaceService");
const Payment_1 = require("../models/Payment");
const Request_1 = require("../models/Request");
const User_1 = require("../models/User");
const money_1 = require("../utils/money");
const analytics_1 = require("../utils/analytics");
const toPaymentResponse = (payment) => {
    const plain = typeof payment.toObject === "function" ? payment.toObject() : payment;
    const taxAmount = plain.taxAmount ?? 0;
    return {
        ...plain,
        type: plain.type ?? Payment_1.PaymentType.FINAL,
        taxPercent: plain.taxPercent ?? 0,
        taxAmount,
        total: plain.total ?? (0, money_1.round2)(plain.amount + taxAmount),
    };
};
// @desc    Process payment (advance or final)
// @route   POST /api/payments/process
// @access  Private/Customer
const processPayment = async (req, res) => {
    const { requestId, amount, type } = req.body;
    const payment = await (0, marketplaceService_1.processManagedPayment)({
        requestId,
        amount,
        type,
        customerId: req.user._id.toString(),
    });
    res.status(201).json(toPaymentResponse(payment));
};
exports.processPayment = processPayment;
// @desc    Get payments
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
    let query = {};
    if (req.user.role === User_1.UserRole.CUSTOMER) {
        query = { customer: req.user._id };
    }
    else if (req.user.role === User_1.UserRole.EXPERT) {
        const requests = await Request_1.RequestModel.find({
            task: { $exists: true },
            "task.expert": req.user._id,
        }).select("_id");
        const requestIds = requests.map((r) => r._id);
        query = { request: { $in: requestIds }, status: Payment_1.PaymentStatus.SUCCESS };
    }
    const payments = await Payment_1.Payment.find(query)
        .populate("request", "description budget")
        .populate("customer", "name")
        .sort({ createdAt: -1 });
    res.json(payments.map(toPaymentResponse));
};
exports.getPayments = getPayments;
// @desc    Payment summary for a request: totals, advance/final status, balance due
// @route   GET /api/payments/summary/:requestId
// @access  Private (customer owner, assigned expert, admin)
const getPaymentSummary = async (req, res) => {
    const summary = await (0, marketplaceService_1.getPaymentSummaryForRequest)(String(req.params.requestId));
    const { request } = summary;
    if (req.user.role === User_1.UserRole.CUSTOMER &&
        String(request.customer) !== String(req.user._id)) {
        return res.status(403).json({ message: "Not authorized" });
    }
    if (req.user.role === User_1.UserRole.EXPERT &&
        String(request.expert) !== String(req.user._id) &&
        String(request.task?.expert) !== String(req.user._id)) {
        return res.status(403).json({ message: "Not authorized" });
    }
    res.json({
        requestId: String(request._id),
        quote: summary.quote,
        advancePaid: summary.advancePaid ?? false,
        finalPaid: summary.finalPaid ?? false,
        paidTotal: summary.paidTotal,
        balanceDue: summary.balanceDue,
        payments: summary.payments.map(toPaymentResponse),
    });
};
exports.getPaymentSummary = getPaymentSummary;
// @desc    Revenue/net-profit totals with period-over-period growth
// @route   GET /api/payments/analytics?range=7d|30d|90d|all|custom&from=&to=
// @access  Private/Admin
const RANGES = ["7d", "30d", "90d", "all", "custom"];
const getRevenueAnalytics = async (req, res) => {
    const range = String(req.query.range ?? "7d");
    if (!RANGES.includes(range))
        return res.status(400).json({ message: "Invalid range" });
    const parseDay = (v, endOfDay) => {
        if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v))
            return undefined;
        const d = new Date(`${v}T00:00:00.000Z`);
        return endOfDay ? new Date(d.getTime() + 86_400_000) : d;
    };
    const from = parseDay(req.query.from, false);
    const to = parseDay(req.query.to, true);
    if (range === "custom" && (!from || !to || to <= from)) {
        return res.status(400).json({ message: "Custom range needs from <= to (YYYY-MM-DD)" });
    }
    const periods = (0, analytics_1.resolvePeriods)(range, new Date(), from, to);
    const payments = await Payment_1.Payment.find({ status: Payment_1.PaymentStatus.SUCCESS })
        .select("amount taxAmount total createdAt")
        .lean();
    const requests = await Request_1.RequestModel.find({ "quote.status": Request_1.QuoteStatus.ACCEPTED })
        .select("quote.commission quote.createdAt")
        .lean();
    const paid = (p) => p.total ?? (0, money_1.round2)((p.amount ?? 0) + (p.taxAmount ?? 0));
    const sum = (period) => {
        const ps = period ? payments.filter((p) => (0, analytics_1.inPeriod)(p.createdAt, period)) : payments;
        const rs = period ? requests.filter((r) => (0, analytics_1.inPeriod)(r.quote?.createdAt, period)) : requests;
        return {
            revenue: (0, money_1.round2)(ps.reduce((s, p) => s + paid(p), 0)),
            netProfit: (0, money_1.round2)(rs.reduce((s, r) => s + (r.quote?.commission ?? 0), 0)),
        };
    };
    const current = sum(periods?.current ?? null);
    const previous = periods ? sum(periods.previous) : null;
    res.json({
        range,
        current: { ...current, ...(periods ? { start: periods.current.start, end: periods.current.end } : {}) },
        previous: previous && periods ? { ...previous, start: periods.previous.start, end: periods.previous.end } : null,
        growth: {
            revenue: (0, analytics_1.computeGrowth)(current.revenue, previous?.revenue ?? null),
            netProfit: (0, analytics_1.computeGrowth)(current.netProfit, previous?.netProfit ?? null),
        },
    });
};
exports.getRevenueAnalytics = getRevenueAnalytics;
