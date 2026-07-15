"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTaskApiResponse = toTaskApiResponse;
function toTaskApiResponse(request) {
    const plain = typeof request.toObject === "function"
        ? request.toObject()
        : { ...request };
    if (!plain.task)
        return null;
    const { task, ...requestFields } = plain;
    return {
        _id: String(plain._id),
        request: requestFields,
        expert: task.expert,
        status: task.status,
        notes: task.notes,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
    };
}
