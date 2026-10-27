"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round2 = void 0;
exports.computeQuoteTotals = computeQuoteTotals;
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
exports.round2 = round2;
function computeQuoteTotals(input) {
    const amount = (0, exports.round2)(Number(input.basePrice) + Number(input.commission));
    const taxPercent = Number(input.taxPercent ?? 0);
    const advancePercent = Number(input.advancePercent ?? 0);
    const taxAmount = (0, exports.round2)((amount * taxPercent) / 100);
    const total = (0, exports.round2)(amount + taxAmount);
    const advanceAmount = (0, exports.round2)((total * advancePercent) / 100);
    return {
        amount,
        taxPercent,
        taxAmount,
        total,
        advancePercent,
        advanceAmount,
        balanceAmount: (0, exports.round2)(total - advanceAmount),
    };
}
