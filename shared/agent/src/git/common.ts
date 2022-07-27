const uncommittedRegex = /^[0]{40}(\^[0-9]*?)??:??$/;

export function isUncommitted(sha: string) {
	return uncommittedRegex.test(sha);
}

export function removeAngleBracketsFromEmail(email: string) {
	const angleBracketsEmailRegex = /<(.+)>/g;
	const result = angleBracketsEmailRegex.exec(email);
	return (result && result[1]) || email;
}
