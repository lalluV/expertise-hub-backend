"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sniffMime = void 0;
/**
 * Minimal magic-byte sniffer for the only upload types we accept.
 * Replaces the `file-type` package (GHSA-5v7r-6r5c-r473: infinite loop on malformed ASF;
 * the fixed versions are ESM-only). Never throws; unknown content returns undefined.
 */
const sniffMime = (buf) => {
    if (!buf || buf.length < 4)
        return undefined;
    const at = (i, bytes) => buf.length >= i + bytes.length && bytes.every((b, k) => buf[i + k] === b);
    if (at(0, [0xff, 0xd8, 0xff]))
        return "image/jpeg";
    if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        return "image/png";
    if (at(0, [0x47, 0x49, 0x46, 0x38]) && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61)
        return "image/gif";
    if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50]))
        return "image/webp";
    if (at(0, [0x25, 0x50, 0x44, 0x46, 0x2d]))
        return "application/pdf";
    return undefined;
};
exports.sniffMime = sniffMime;
