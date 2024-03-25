import {
	DependencyList,
	EffectCallback,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { isEqual } from "lodash";

import { AppDispatch, CodeStreamState } from "@codestream/webview/store";
import { RequestType } from "vscode-jsonrpc";
import { noop } from "../utils";
import { HostApi, RequestParamsOf, RequestResponseOf } from "../webview-api";

type Fn = () => void;

/*
	This is mostly just to be an explicit label for what the hook does because useEffect rules
	can be hard to remember.
*/
export function useDidMount(callback: EffectCallback) {
	useEffect(callback, []);
}

/*
	This hook runs the provided callback only when the component has been mounted and provided dependencies change.
	The callback IS NOT invoked when the component is initially mounted.
*/
export function useUpdates(callback: Fn, dependencies: any[] = []) {
	const isMountedRef = useRef(false);
	useDidMount(() => {
		isMountedRef.current = true;
	});
	useEffect(isMountedRef.current ? callback : noop, dependencies);
}

export function useInterval(callback: Fn, delay = 1000, skew = false) {
	const savedCallback = useRef<Fn>(callback);

	// Remember the latest callback.
	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	// Set up the interval.
	useEffect(() => {
		function tick() {
			savedCallback.current!();
		}

		let delayWithSkew = delay;

		if (skew) {
			const skewFactor = 0.95 + Math.random() * 0.1; // Random number between 0.95 and 1.05
			delayWithSkew *= skewFactor; // Skewing the delay by up to +/-5%
		}

		let id = setInterval(tick, delayWithSkew);
		return () => clearInterval(id);
	}, [delay]);
}

interface UseRequestTypeResult<T, E = T> {
	data: T | undefined;
	loading: boolean;
	error: E | undefined;
}

/**
 * @param requestType<Req, Resp>
 * @param payload
 * @param dependencies
 * @param enabled Controls whether to make the request
 * @returns { loading, data, error }
 */
export function useRequestType<RT extends RequestType<any, any, any, any>, E = RT>(
	requestType: RT,
	payload: RequestParamsOf<RT>,
	dependencies: DependencyList = [],
	enabled = true
): UseRequestTypeResult<RequestResponseOf<RT>, E> {
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<RequestResponseOf<RT> | undefined>(undefined);
	const [error, setError] = useState<E | undefined>(undefined);

	const fetch = async () => {
		if (enabled) {
			try {
				setLoading(true);
				const response = (await HostApi.instance.send(
					requestType,
					payload
				)) as RequestResponseOf<RT>;
				setData(response);
				setLoading(false);
			} catch (error) {
				setLoading(false);
				setError(error);
			}
		}
	};

	useEffect(() => {
		fetch();
	}, dependencies);

	return { loading, data, error } as UseRequestTypeResult<RequestResponseOf<RT>, E>;
}

export function useTimeout(callback: Fn, delay: number) {
	useEffect(() => {
		let id = setTimeout(function () {
			callback();
		}, delay);

		return () => clearTimeout(id);
	}, [callback, delay]);
}

export function useRetryingCallback(fn: () => Promise<any>) {
	const canRun = useRef(true);
	useInterval(async () => {
		if (!canRun.current) {
			return;
		}
		try {
			canRun.current = false;
			await fn();
		} catch (error) {}
		canRun.current = true;
	}, 5000);
}

type RectResult = {
	bottom: number;
	height: number;
	left: number;
	right: number;
	top: number;
	width: number;
};

function getRect<T extends HTMLElement>(element?: T): RectResult {
	let rect: RectResult = {
		bottom: 0,
		height: 0,
		left: 0,
		right: 0,
		top: 0,
		width: 0,
	};
	if (element) rect = element.getBoundingClientRect();
	return rect;
}

export function useRect<T extends HTMLElement>(
	ref: React.RefObject<T>,
	dependencies: any[] = []
): RectResult {
	const [rect, setRect] = useState<RectResult>(
		ref && ref.current ? getRect(ref.current) : getRect()
	);

	const handleResize = useCallback(() => {
		if (!ref.current) return;
		setRect(getRect(ref.current)); // Update client rect
	}, [ref]);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;

		handleResize();

		// @ts-ignore
		if (typeof ResizeObserver === "function") {
			// @ts-ignore
			let resizeObserver: ResizeObserver | null = new ResizeObserver(() => handleResize());
			resizeObserver.observe(element);
			return () => {
				if (!resizeObserver) return;
				resizeObserver.disconnect();
				resizeObserver = null;
			};
		} else {
			window.addEventListener("resize", handleResize); // Browser support, remove freely
			return () => window.removeEventListener("resize", handleResize);
		}
	}, dependencies);

	return rect;
}

export function useIntersectionObserver(
	callback: IntersectionObserverCallback,
	options: Pick<IntersectionObserverInit, "threshold" | "rootMargin"> = {}
) {
	const callbackRef = useRef(callback);
	useEffect(() => {
		callbackRef.current = callback;
	});
	const observerRef = useRef<IntersectionObserver>();
	const cleanupObserver = () => {
		if (observerRef.current != undefined) {
			observerRef.current.disconnect();
			observerRef.current = undefined;
		}
	};
	const _rootRef = useRef<HTMLElement>();
	const _targetRef = useRef<HTMLElement>();

	// after updates, check whether the observer needs to be created or destroyed
	useEffect(() => {
		// if ready to observe
		if (_rootRef.current && _targetRef.current) {
			if (observerRef.current == undefined) {
				const observer = new IntersectionObserver(
					function (...args: Parameters<IntersectionObserverCallback>) {
						callbackRef.current.call(undefined, ...args);
					},
					{
						...options,
						root: _rootRef.current,
					}
				);
				observer.observe(_targetRef.current);
				observerRef.current = observer;
			}
		} else {
			cleanupObserver();
		}
	});

	// cleanup when the consuming component is unmounted
	useEffect(() => cleanupObserver, []);

	// return the same object to guarantee referential identity
	return useMemo(
		() => ({
			targetRef(element) {
				_targetRef.current = element;
			},
			rootRef(element) {
				_rootRef.current = element;
			},
		}),
		[]
	);
}

//https://stackoverflow.com/questions/53446020/how-to-compare-oldvalues-and-newvalues-on-react-hooks-useeffect
export const useHasChanged = (val: any) => {
	const prevVal = usePrevious(val);
	return prevVal !== val;
};

export const usePrevious = <T>(value: T, initialValue?: T): T | undefined => {
	const ref = initialValue ? useRef<T>(initialValue) : useRef<T>();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
};

/*
 From https://stackoverflow.com/questions/55187563/determine-which-dependency-array-variable-caused-useeffect-hook-to-fire
 Temporarily replace useEffect with this and check web console logs
 */
export const useEffectDebugger = (effectHook, dependencies, dependencyNames: string[] = []) => {
	const previousDeps = usePrevious(dependencies, []);

	const changedDeps = dependencies.reduce((accum, dependency, index) => {
		if (dependency !== previousDeps[index]) {
			const keyName = dependencyNames[index] || index;
			return {
				...accum,
				[keyName]: {
					before: previousDeps[index],
					after: dependency,
				},
			};
		}

		return accum;
	}, {});

	if (Object.keys(changedDeps).length) {
		console.log("[use-effect-debugger] ", changedDeps);
	}

	useEffect(effectHook, dependencies);
};

// Credit: https://stackoverflow.com/questions/59721035/usestate-only-update-component-when-values-in-object-change
export const useMemoizedState = <T>(initialValue: T): [T, (val: T) => void] => {
	const [state, _setState] = useState<T>(initialValue);

	const setState = (newState: T) => {
		_setState(prev => {
			if (!isEqual(newState, prev)) {
				return newState;
			} else {
				return prev;
			}
		});
	};

	return [state, setState];
};

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<CodeStreamState> = useSelector;
