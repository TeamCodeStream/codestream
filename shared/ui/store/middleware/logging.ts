import { Dispatch, Middleware } from "redux";

// TODO compare this with performance / circular reference errors of
//  JSON.stringify but I have a feeling it's best to keep this and disable
//  in production bundle since this is probably a huge memory / performance hog
// Modern browsers console.log uses a reference to the object so logging the
// store does not work since it will log the current state of the store when
// the console.log is expanded, not when it was logged!
function snapshot<T>(store: T): T {
	return structuredClone(store);
}

export const logging: Middleware<any, any, Dispatch> = store => {
	return next => {
		return action => {
			const actionSnapshot = snapshot(action); // Even the action logging needs to be a snapshot
			const oldState = snapshot(store.getState());
			const result = next(action);
			if (oldState.configs.debug) {
				console.groupCollapsed(actionSnapshot.type);
				console.debug(actionSnapshot);
				console.debug("old state", oldState);
				console.debug("new state", snapshot(store.getState()));
				console.groupEnd();
			}
			return result;
		};
	};
};
