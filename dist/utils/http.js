"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = exports.HttpError = void 0;
class HttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.HttpError = HttpError;
const ok = (data, message = "Success") => ({
    success: true,
    message,
    data,
});
exports.ok = ok;
