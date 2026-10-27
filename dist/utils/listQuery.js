"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginate = exports.queryString = exports.parseListQuery = exports.escapeRegex = void 0;
const MAX_LIMIT = 100;
/** Escape user input for use inside a RegExp (prevents ReDoS / regex injection). */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
exports.escapeRegex = escapeRegex;
const str = (v) => typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : undefined;
/**
 * Parses ?search=&page=&limit= from the query string. Pagination is opt-in:
 * when neither page nor limit is given, every item is returned (backwards
 * compatible with clients that expect a plain array).
 */
const parseListQuery = (query) => {
    const page = Number(query.page);
    const limit = Number(query.limit);
    const wantsPaging = query.page !== undefined || query.limit !== undefined;
    return {
        search: str(query.search ?? query.q),
        ...(wantsPaging
            ? {
                page: Number.isInteger(page) && page > 0 ? page : 1,
                limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : 20,
            }
            : {}),
    };
};
exports.parseListQuery = parseListQuery;
exports.queryString = str;
/**
 * Slices an in-memory list and sets pagination headers. The body stays a
 * plain array so existing clients keep working; totals are in headers.
 */
const paginate = (res, items, q) => {
    res.setHeader("X-Total-Count", String(items.length));
    if (!q.limit)
        return items;
    const page = q.page ?? 1;
    res.setHeader("X-Page", String(page));
    res.setHeader("X-Limit", String(q.limit));
    res.setHeader("Access-Control-Expose-Headers", "X-Total-Count, X-Page, X-Limit");
    return items.slice((page - 1) * q.limit, page * q.limit);
};
exports.paginate = paginate;
