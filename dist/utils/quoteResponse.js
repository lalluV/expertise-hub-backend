"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toQuoteApiResponse = toQuoteApiResponse;
function toQuoteApiResponse(request) {
    const plain = typeof request.toObject === "function"
        ? request.toObject()
        : { ...request };
    if (!plain.quote)
        return null;
    const { quote, ...requestFields } = plain;
    return {
        _id: String(plain._id),
        request: requestFields,
        basePrice: quote.basePrice,
        commission: quote.commission,
        finalPrice: quote.finalPrice,
        notes: quote.notes,
        status: quote.status,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
    };
}
