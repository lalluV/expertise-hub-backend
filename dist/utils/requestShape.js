"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPROVED_REVIEW_MATCH = exports.isApprovedReview = void 0;
exports.normalizeQuote = normalizeQuote;
exports.shapeRequestForViewer = shapeRequestForViewer;
const User_1 = require("../models/User");
const Request_1 = require("../models/Request");
const expertPrivacy_1 = require("./expertPrivacy");
const money_1 = require("./money");
/** Review visible in public lists / rating: approved or legacy (no status). */
const isApprovedReview = (review) => !!review && (!review.status || review.status === Request_1.ReviewStatus.APPROVED);
exports.isApprovedReview = isApprovedReview;
/** Mongo filter for counted reviews (legacy docs without status count). */
exports.APPROVED_REVIEW_MATCH = {
    "review.rating": { $exists: true },
    "review.status": {
        $nin: [Request_1.ReviewStatus.PENDING, Request_1.ReviewStatus.REJECTED],
    },
};
function normalizeQuote(quote) {
    const totals = (0, money_1.computeQuoteTotals)({
        basePrice: quote.basePrice,
        commission: quote.commission,
        taxPercent: quote.taxPercent ?? 0,
        advancePercent: quote.advancePercent ?? 0,
    });
    return {
        ...quote,
        amount: totals.amount,
        taxPercent: quote.taxPercent ?? 0,
        taxAmount: quote.taxAmount ?? totals.taxAmount,
        advancePercent: quote.advancePercent ?? 0,
        advanceAmount: quote.advanceAmount ?? totals.advanceAmount,
        balanceAmount: totals.balanceAmount,
        total: quote.finalPrice,
    };
}
/**
 * Prepares a plain request object for the viewer:
 * - removes legacy `priority`
 * - applies expert name privacy to populated expert refs
 * - experts only see approved reviews
 * - adds tax/advance defaults on the embedded quote
 */
function shapeRequestForViewer(request, viewer) {
    const plain = typeof request.toObject === "function"
        ? { ...request.toObject() }
        : { ...request };
    delete plain.priority;
    if (plain.expert && typeof plain.expert === "object") {
        plain.expert = (0, expertPrivacy_1.shapeExpertForViewer)(plain.expert, viewer);
    }
    if (plain.task?.expert && typeof plain.task.expert === "object") {
        plain.task = {
            ...plain.task,
            expert: (0, expertPrivacy_1.shapeExpertForViewer)(plain.task.expert, viewer),
        };
    }
    if (plain.quote) {
        plain.quote = normalizeQuote(plain.quote);
    }
    if (plain.review &&
        viewer?.role === User_1.UserRole.EXPERT &&
        !(0, exports.isApprovedReview)(plain.review)) {
        delete plain.review;
    }
    return plain;
}
