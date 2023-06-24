import React from "react";

interface Props {
	message: string;
}

export const FossaResults = (props: Props) => {
	return <>{props.message}</>;
};
