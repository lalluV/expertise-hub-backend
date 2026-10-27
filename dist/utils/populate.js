"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskPopulate = exports.requestPopulate = exports.EXPERT_TASK_REF_SELECT = exports.EXPERT_REF_SELECT = exports.CUSTOMER_REF_SELECT = void 0;
exports.CUSTOMER_REF_SELECT = "name phone email avatarUri";
/** Fields needed for expert refs, including name-privacy fields. */
exports.EXPERT_REF_SELECT = "name phone email headline avatarUri categories customCategory experience rate rating available hideName displayName";
exports.EXPERT_TASK_REF_SELECT = "name phone email headline avatarUri hideName displayName";
exports.requestPopulate = [
    { path: "customer", select: exports.CUSTOMER_REF_SELECT },
    { path: "expert", select: exports.EXPERT_REF_SELECT },
];
exports.taskPopulate = [
    ...exports.requestPopulate,
    { path: "task.expert", select: exports.EXPERT_TASK_REF_SELECT },
];
