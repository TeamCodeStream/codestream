import React from "react";
import { Capabilities, CodemarkPlus } from "@codestream/protocols/agent";
import { injectIntl, WrappedComponentProps } from "react-intl";
import { CodeStreamState } from "../store";
import { connect } from "react-redux";
import MarkerActions from "./MarkerActions";

interface State {}

type IntlProps = WrappedComponentProps<"intl">;

interface InheritedProps {
	codemark: CodemarkPlus;
	capabilities: Capabilities;
	isAuthor: boolean;
	alwaysRenderCode?: boolean;
	toggleCodeHighlightInTextEditor?: Function;
	jumpToMarkerId?: string;
	displayType?: "collapsed" | "default" | "activity";
}

type Props = InheritedProps & IntlProps;

class CodemarkActions extends React.Component<Props, State> {
	render() {
		const { codemark, capabilities, isAuthor, jumpToMarkerId } = this.props;
		if (codemark == null) return null;
		if (!codemark.markers || !codemark.markers.length) return null;

		const numMarkers = codemark.markers.length;
		const selected = this.props.displayType !== "activity";

		return codemark.markers.map((marker, index) => {
			// do we jump to the marker? only if it is selectd, and either
			// the jumpToMarkerId matches, or otherwise it's the first marker
			const jumpToMarker = !selected
				? false
				: jumpToMarkerId
				? jumpToMarkerId === marker.id
				: index === 0;
			return (
				<div key={index}>
					<MarkerActions
						key={marker.id}
						codemark={codemark}
						marker={marker}
						capabilities={capabilities}
						isAuthor={isAuthor}
						alwaysRenderCode={true /* alwaysRenderCode || numMarkers > 1 */}
						markerIndex={index}
						numMarkers={numMarkers}
						jumpToMarker={jumpToMarker}
						selected={selected}
					/>
				</div>
			);
		});
	}
}

const mapStateToProps = (state: CodeStreamState) => {
	return {
		jumpToMarkerId: state.context.currentMarkerId
	};
};

export default connect(mapStateToProps)(injectIntl(CodemarkActions));
