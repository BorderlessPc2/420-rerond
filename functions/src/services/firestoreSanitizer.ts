import { FieldValue } from "firebase-admin/firestore";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value instanceof Date ||
    value instanceof Buffer ||
    value instanceof Uint8Array ||
    value instanceof FieldValue
  ) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return (
    proto === Object.prototype ||
    proto === null
  );
}

export function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) return null as T;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    sanitized[key] = sanitizeForFirestore(item);
  }
  return sanitized as T;
}
