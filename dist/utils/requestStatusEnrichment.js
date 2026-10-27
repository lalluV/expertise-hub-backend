"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichRequestsWithStatus = enrichRequestsWithStatus;
exports.enrichRequestWithStatus = enrichRequestWithStatus;
const requestShape_1 = require("./requestShape");
async function enrichRequestsWithStatus(requests, viewer) {
    return requests.map((request) => {
        const plain = (0, requestShape_1.shapeRequestForViewer)(request, viewer);
        return {
            ...plain,
            taskStatus: plain.task?.status,
            latestQuote: plain.quote
                ? {
                    _id: String(plain._id),
                    status: plain.quote.status,
                    finalPrice: plain.quote.finalPrice,
                    taxPercent: plain.quote.taxPercent,
                    taxAmount: plain.quote.taxAmount,
                    advancePercent: plain.quote.advancePercent,
                    advanceAmount: plain.quote.advanceAmount,
                }
                : undefined,
        };
    });
}
async function enrichRequestWithStatus(request, viewer) {
    const [enriched] = await enrichRequestsWithStatus([request], viewer);
    return enriched;
}
