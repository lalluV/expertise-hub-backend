"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichRequestsWithStatus = enrichRequestsWithStatus;
exports.enrichRequestWithStatus = enrichRequestWithStatus;
function toPlain(doc) {
    return typeof doc.toObject === "function" ? doc.toObject() : doc;
}
async function enrichRequestsWithStatus(requests) {
    return requests.map((request) => {
        const plain = toPlain(request);
        return {
            ...plain,
            taskStatus: plain.task?.status,
            latestQuote: plain.quote
                ? {
                    _id: String(plain._id),
                    status: plain.quote.status,
                    finalPrice: plain.quote.finalPrice,
                }
                : undefined,
        };
    });
}
async function enrichRequestWithStatus(request) {
    const [enriched] = await enrichRequestsWithStatus([request]);
    return enriched;
}
