"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toTaskApiResponse = toTaskApiResponse;
const requestShape_1 = require("./requestShape");
function toTaskApiResponse(request, viewer) {
    const plain = (0, requestShape_1.shapeRequestForViewer)(request, viewer);
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
