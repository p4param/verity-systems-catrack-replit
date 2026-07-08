export function formatUserIdToUuid(userId: number | string): string {
  const idStr = String(userId).trim();
  
  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(idStr)) {
    return idStr;
  }
  
  const num = parseInt(idStr, 10);
  if (isNaN(num)) {
    return "00000000-0000-0000-0000-000000000000";
  }
  
  // Pad the hexadecimal representation of the number to 12 chars
  const hex = num.toString(16).padStart(12, "0");
  return `00000000-0000-0000-0000-${hex}`;
}
