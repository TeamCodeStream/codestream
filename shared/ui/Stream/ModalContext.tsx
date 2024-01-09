import React from "react";

export interface ModalContextType {
	zIndex: number;
}

export const ModalContext = React.createContext<ModalContextType>({
	zIndex: 52,
});
