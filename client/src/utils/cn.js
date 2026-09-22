/** Joins class names, skipping falsy values. */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export default cn;
