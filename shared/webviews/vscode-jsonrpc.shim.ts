"use strict";

class is {
	static number(value: any): value is number {
		return typeof value === "number" || value instanceof Number;
	}

	static string(value: any): value is string {
		return typeof value === "string" || value instanceof String;
	}
}

/**
 * A language server message
 */
export interface Message {
	jsonrpc: string;
}

/**
 * Request message
 */
export interface RequestMessage extends Message {
	/**
	 * The request id.
	 */
	id: number | string;

	/**
	 * The method to be invoked.
	 */
	method: string;

	/**
	 * The method's params.
	 */
	params?: any;
}

/**
 * Predefined error codes.
 */
export class ErrorCodes {
	// Defined by JSON RPC
	static readonly ParseError = -32700;
	static readonly InvalidRequest = -32600;
	static readonly MethodNotFound = -32601;
	static readonly InvalidParams = -32602;
	static readonly InternalError = -32603;
	static readonly serverErrorStart = -32099;
	static readonly serverErrorEnd = -32000;
	static readonly ServerNotInitialized = -32002;
	static readonly UnknownErrorCode = -32001;

	// Defined by the protocol.
	static readonly RequestCancelled = -32800;
	static readonly ContentModified = -32801;

	// Defined by VSCode library.
	static readonly MessageWriteError = 1;
	static readonly MessageReadError = 2;
}

export interface ResponseErrorLiteral<D> {
	/**
	 * A number indicating the error type that occured.
	 */
	code: number;

	/**
	 * A string providing a short decription of the error.
	 */
	message: string;

	/**
	 * A Primitive or Structured value that contains additional
	 * information about the error. Can be omitted.
	 */
	data?: D;
}

/**
 * An error object return in a response in case a request
 * has failed.
 */
export class ResponseError<D> extends Error {
	public readonly code: number;
	public readonly data: D | undefined;

	constructor(code: number, message: string, data?: D) {
		super(message);
		this.code = typeof is.number(code) ? code : ErrorCodes.UnknownErrorCode;
		this.data = data;
		Object.setPrototypeOf(this, ResponseError.prototype);
	}

	public toJson(): ResponseErrorLiteral<D> {
		return {
			code: this.code,
			message: this.message,
			data: this.data,
		};
	}
}

/**
 * A response message.
 */
export interface ResponseMessage extends Message {
	/**
	 * The request id.
	 */
	id: number | string | null;

	/**
	 * The result of a request. This member is REQUIRED on success.
	 * This member MUST NOT exist if there was an error invoking the method.
	 */
	result?: string | number | boolean | object;

	/**
	 * The error object in case a request fails.
	 */
	error?: ResponseErrorLiteral<any>;
}

/**
 * A LSP Log Entry.
 */
export type LSPMessageType =
	| "send-request"
	| "receive-request"
	| "send-response"
	| "receive-response"
	| "send-notification"
	| "receive-notification";

export interface LSPLogMessage {
	type: LSPMessageType;
	message: RequestMessage | ResponseMessage | NotificationMessage;
	timestamp: number;
}

/**
 * An interface to type messages.
 */
export interface MessageType {
	readonly method: string;
	readonly numberOfParams: number;
}

/**
 * An abstract implementation of a MessageType.
 */
export abstract class AbstractMessageType implements MessageType {
	// NOTE: Changes method to be a readonly prop to ensure serialization

	constructor(public readonly method: string, private _numberOfParams: number) {}

	get numberOfParams(): number {
		return this._numberOfParams;
	}
}

/**
 * End marker interface for request and notification types.
 */
export interface _EM {
	_$endMarker$_: number;
}

/**
 * Classes to type request response pairs
 */
export class RequestType0<R, E, RO> extends AbstractMessageType {
	public readonly _?: [R, E, RO, _EM];
	constructor(method: string) {
		super(method, 0);
		this._ = undefined;
	}
}

export class RequestType<P, R, E, RO> extends AbstractMessageType {
	public readonly _?: [P, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 1);
		this._ = undefined;
	}
}

export class RequestType1<P1, R, E, RO> extends AbstractMessageType {
	public readonly _?: [P1, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 1);
		this._ = undefined;
	}
}

export class RequestType2<P1, P2, R, E, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 2);
		this._ = undefined;
	}
}

export class RequestType3<P1, P2, P3, R, E, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 3);
		this._ = undefined;
	}
}

export class RequestType4<P1, P2, P3, P4, R, E, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 4);
		this._ = undefined;
	}
}

export class RequestType5<P1, P2, P3, P4, P5, R, E, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 5);
		this._ = undefined;
	}
}

export class RequestType6<P1, P2, P3, P4, P5, P6, R, E, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, P6, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 6);
		this._ = undefined;
	}
}

export class RequestType7<P1, P2, P3, P4, P5, P6, P7, R, E, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, P6, P7, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 7);
		this._ = undefined;
	}
}

export class RequestType8<P1, P2, P3, P4, P5, P6, P7, P8, R, E, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, P6, P7, P8, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 8);
		this._ = undefined;
	}
}

export class RequestType9<
	P1,
	P2,
	P3,
	P4,
	P5,
	P6,
	P7,
	P8,
	P9,
	R,
	E,
	RO
> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 9);
		this._ = undefined;
	}
}

/**
 * Notification Message
 */
export interface NotificationMessage extends Message {
	/**
	 * The method to be invoked.
	 */
	method: string;

	/**
	 * The notification's params.
	 */
	params?: any;
}

export class NotificationType<P, RO> extends AbstractMessageType {
	public readonly _?: [P, RO, _EM];
	constructor(method: string) {
		super(method, 1);
		this._ = undefined;
	}
}

export class NotificationType0<RO> extends AbstractMessageType {
	public readonly _?: [RO, _EM];
	constructor(method: string) {
		super(method, 0);
		this._ = undefined;
	}
}

export class NotificationType1<P1, RO> extends AbstractMessageType {
	public readonly _?: [P1, RO, _EM];
	constructor(method: string) {
		super(method, 1);
		this._ = undefined;
	}
}

export class NotificationType2<P1, P2, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, RO, _EM];
	constructor(method: string) {
		super(method, 2);
		this._ = undefined;
	}
}

export class NotificationType3<P1, P2, P3, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, RO, _EM];
	constructor(method: string) {
		super(method, 3);
		this._ = undefined;
	}
}

export class NotificationType4<P1, P2, P3, P4, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, RO, _EM];
	constructor(method: string) {
		super(method, 4);
		this._ = undefined;
	}
}

export class NotificationType5<P1, P2, P3, P4, P5, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, RO, _EM];
	constructor(method: string) {
		super(method, 5);
		this._ = undefined;
	}
}

export class NotificationType6<P1, P2, P3, P4, P5, P6, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, P6, RO, _EM];
	constructor(method: string) {
		super(method, 6);
		this._ = undefined;
	}
}

export class NotificationType7<P1, P2, P3, P4, P5, P6, P7, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, P6, P7, RO, _EM];
	constructor(method: string) {
		super(method, 7);
		this._ = undefined;
	}
}

export class NotificationType8<P1, P2, P3, P4, P5, P6, P7, P8, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, P6, P7, P8, RO, _EM];
	constructor(method: string) {
		super(method, 8);
		this._ = undefined;
	}
}

export class NotificationType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, RO> extends AbstractMessageType {
	public readonly _?: [P1, P2, P3, P4, P5, P6, P7, P8, P9, RO, _EM];
	constructor(method: string) {
		super(method, 9);
		this._ = undefined;
	}
}

/**
 * Tests if the given message is a request message
 */
export function isRequestMessage(message: Message | undefined): message is RequestMessage {
	const candidate = message as RequestMessage;
	return (
		candidate && is.string(candidate.method) && (is.string(candidate.id) || is.number(candidate.id))
	);
}

/**
 * Tests if the given message is a notification message
 */
export function isNotificationMessage(
	message: Message | undefined
): message is NotificationMessage {
	const candidate = message as NotificationMessage;
	return candidate && is.string(candidate.method) && (message as any).id === void 0;
}

/**
 * Tests if the given message is a response message
 */
export function isResponseMessage(message: Message | undefined): message is ResponseMessage {
	const candidate = message as ResponseMessage;
	return (
		candidate &&
		(candidate.result !== void 0 || !!candidate.error) &&
		(is.string(candidate.id) || is.number(candidate.id) || candidate.id === null)
	);
}
