const [green, red, yellow, original]: string[] = ["\x1b[32m", "\x1b[31m", "\x1b[33m", "\x1b[0m"];

function _writeToConsole(
	method: (message?: string) => void,
	color: string,
	message?: string
): void {
	if (message) {
		if (color) {
			method(`${color}${message}${original}`);
		} else {
			method(`${message}`);
		}
	} else {
		method();
	}
}

export function error(message?: string): void {
	_writeToConsole(console.error, red, message);
}

export function success(message?: string): void {
	_writeToConsole(console.log, green, message);
}

export function info(message?: string): void {
	_writeToConsole(console.log, original, message);
}

export function warn(message?: string): void {
	_writeToConsole(console.warn, yellow, message);
}
