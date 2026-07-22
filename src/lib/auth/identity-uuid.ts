/**
 * Canonical Identity & UUID Compatibility Helper
 * Hardening Package: HF-002
 *
 * Resolves user/tenant identity values into standard 36-character UUID strings.
 * Handles valid UUIDs directly and provides single-point adapter for legacy numeric identifiers.
 */

export const PLATFORM_SYSTEM_UUID = "00000000-0000-0000-0000-000000000001";

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function toCanonicalUuid(input: string | number | undefined | null, fallback: string = PLATFORM_SYSTEM_UUID): string {
    if (!input) return fallback;
    const str = String(input).trim();

    // 1. Direct standard UUID string match
    if (UUID_REGEX.test(str)) {
        return str;
    }

    // 2. Legacy numeric identifier adapter match
    if (/^\d+$/.test(str)) {
        return "00000000-0000-0000-0000-" + str.padStart(12, "0");
    }

    return str;
}
