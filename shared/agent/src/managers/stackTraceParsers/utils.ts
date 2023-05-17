/*
 Given a fully qualified method with namespace, return the namespace and method name
 */
export function extractDotNamespace(methodName: string): { method: string; namespace?: string } {
	if (!methodName.includes(".")) return { method: methodName };
	const parts = methodName.split(".");
	const method = parts.pop();
	if (!method) return { method: methodName };
	const namespace = parts.join(".");
	return { method, namespace };
}
