"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = void 0;
/** Recursively drops keys that could become Mongo operators ($gt, $where) or paths ("a.b"). */
const clean = (value, depth = 0) => {
    if (depth > 20 || value === null || typeof value !== "object")
        return value;
    if (Array.isArray(value))
        return value.map((v) => clean(v, depth + 1));
    const out = {};
    for (const [k, v] of Object.entries(value)) {
        if (k.startsWith("$") || k.includes(".") || k === "__proto__" || k === "constructor")
            continue;
        out[k] = clean(v, depth + 1);
    }
    return out;
};
const sanitizeInput = (req, _res, next) => {
    if (req.body && typeof req.body === "object")
        req.body = clean(req.body);
    if (req.query && typeof req.query === "object") {
        const q = clean(req.query);
        for (const key of Object.keys(req.query))
            delete req.query[key];
        Object.assign(req.query, q);
    }
    if (req.params)
        req.params = clean(req.params);
    next();
};
exports.sanitizeInput = sanitizeInput;
