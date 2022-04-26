import {
	useEffect,
	useRef,
	useState,
	useCallback,
	useLayoutEffect,
	EffectCallback,
	useMemo
} from "react";
import { noop } from "../utils";

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

export function useInterval(callback: Fn, delay = 1000) {
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
		let id = setInterval(tick, delay);
		return () => clearInterval(id);
	}, [delay]);
}

export function useTimeout(callback: Fn, delay: number) {
	useEffect(() => {
		let id = setTimeout(function() {
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
		width: 0
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
					function(...args: Parameters<IntersectionObserverCallback>) {
						callbackRef.current.call(undefined, ...args);
					},
					{
						...options,
						root: _rootRef.current
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
			}
		}),
		[]
	);
}
//https://stackoverflow.com/questions/53446020/how-to-compare-oldvalues-and-newvalues-on-react-hooks-useeffect
export const useHasChanged = (val: any) => {
	const prevVal = usePrevious(val);
	return prevVal !== val;
};

export const usePrevious = <T>(value: T): T | undefined => {
	const ref = useRef<T>();
	useEffect(() => {
		ref.current = value;
	});
	return ref.current;
};
