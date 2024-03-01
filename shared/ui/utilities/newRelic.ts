import { NewRelicId } from "@codestream/protocols/agent";

/**
 * Parses an ID-like string and returns the corresponding NewRelicId object.
 * @param idLike - ID-like string to be parsed.
 * @param strict - When set to true, performs strict validation on the parsed values. Default is false.
 * @returns The parsed NewRelicId object or undefined if parsing fails or the ID-like string is empty.
 */
export function parseId(idLike: string, strict: boolean = false): NewRelicId | undefined {
	try {
		// KEEP IN SYNC WITH AGENT

		if (!idLike) return undefined;

		const parsed = atob(idLike);
		if (!parsed) return undefined;

		const split = parsed.split(/\|/);

		// "140272|ERT|ERR_GROUP|12076a73-fc88-3205-92d3-b785d12e08b6"
		const [accountId, domain, type, identifier] = split;

		const result = {
			accountId: accountId ? parseInt(accountId, 10) : 0,
			domain,
			type,
			identifier,
		};
		// If strict mode is not enabled, return the result object directly
		if (!strict) return result as NewRelicId;

		// Define validation rules for each property
		const rules = {
			accountId: /\d{1,10}/, // Account ID must be a string of 1-10 digits
			domain: /[A-Z][A-Z0-9_]{2,14}/, // Domain must start with an uppercase letter, followed by 2-14 uppercase letters, digits, or underscores
			type: /[A-Z][A-Z0-9_]{1,49}/, // Type must start with an uppercase letter, followed by 1-49 uppercase letters, digits, or underscores
			identifier: /[\x20-\x7E]{1,50}/, // Identifier must consist of printable ASCII characters (20-7E) and be 1-50 characters long
		} as any;

		// Validate each property against its corresponding rule
		for (const key of Object.keys(rules)) {
			if (result[key] == null || !rules[key].test(result[key])) {
				// Return undefined if any property fails validation or is null
				return undefined;
			}
		}

		return result;
	} catch {
		return undefined;
	}
}
