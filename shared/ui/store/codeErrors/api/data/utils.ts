const machineId = getRandomInt(0, 16777215).toString(16);

function getRandomInt(min: number, max: number): number {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMongoId(): string {
	const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
	const processId = getRandomInt(0, 32767).toString(16);
	const counter = getRandomInt(0, 16777215).toString(16);

	return (
		timestamp +
		"00000000".slice(machineId.length) +
		machineId +
		"0000".slice(processId.length) +
		processId +
		"000000".slice(counter.length) +
		counter
	);
}
