export function parseId(entityGuid: string) {
	try {
		const parsed = atob(entityGuid);
		const split = parsed.split(/\|/);

		// "140272|ERT|ERR_GROUP|12076a73-fc88-3205-92d3-b785d12e08b6"
		const [accountId, entityDomain, entityType, appId] = split;

		return {
			accountId: accountId ? parseInt(accountId, 10) : 0,
			entityGuid,
			entityType,
			entityDomain,
			appId,
		};
	} catch {
		return undefined;
	}
}
