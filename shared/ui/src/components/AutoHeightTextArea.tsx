import React, {
	forwardRef,
	MutableRefObject,
	TextareaHTMLAttributes,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";

export const AutoHeightTextArea = forwardRef<
	HTMLTextAreaElement,
	TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => {
	const textareaRef = useRef<HTMLTextAreaElement | null>() as MutableRefObject<HTMLTextAreaElement>;
	useImperativeHandle(ref, () => textareaRef.current);

	const { value } = props;

	useEffect(() => {
		if (!textareaRef.current) return;
		textareaRef.current.style.height = "1px";
		textareaRef.current.style.height = 15 + textareaRef.current.scrollHeight + "px";
	}, [value]);

	return <textarea {...props} ref={textareaRef} />;
});
