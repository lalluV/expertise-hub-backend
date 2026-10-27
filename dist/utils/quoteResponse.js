"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toQuoteApiResponse = toQuoteApiResponse;
const requestShape_1 = require("./requestShape");
function toQuoteApiResponse(request, viewer) {
    const plain = (0, requestShape_1.shapeRequestForViewer)(request, viewer);
    if (!plain.quote)
        return null;
    const { quote, ...requestFields } = plain;
    return {
        _id: String(plain._id),
        request: requestFields,
        basePrice: quote.basePrice,
        commission: quote.commission,
        amount: quote.amount,
        taxPercent: quote.taxPercent,
        taxAmount: quote.taxAmount,
        finalPrice: quote.finalPrice,
        total: quote.finalPrice,
        advancePercent: quote.advancePercent,
        advanceAmount: quote.advanceAmount,
        balanceAmount: quote.balanceAmount,
        notes: quote.notes,
        status: quote.status,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
    };
}
