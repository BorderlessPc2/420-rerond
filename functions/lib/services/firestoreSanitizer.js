"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeForFirestore = sanitizeForFirestore;
const firestore_1 = require("firebase-admin/firestore");
function isPlainObject(value) {
    if (value === null ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        value instanceof Date ||
        value instanceof Buffer ||
        value instanceof Uint8Array ||
        value instanceof firestore_1.FieldValue) {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return (proto === Object.prototype ||
        proto === null);
}
function sanitizeForFirestore(value) {
    if (value === undefined)
        return null;
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeForFirestore(item));
    }
    if (!isPlainObject(value)) {
        return value;
    }
    const sanitized = {};
    for (const [key, item] of Object.entries(value)) {
        sanitized[key] = sanitizeForFirestore(item);
    }
    return sanitized;
}
//# sourceMappingURL=firestoreSanitizer.js.map