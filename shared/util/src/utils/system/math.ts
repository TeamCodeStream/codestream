export function roundDownExponentially(count: number, min: number) {
	return Math.max(Math.pow(10, Math.floor(Math.log10(count))), min);
}
