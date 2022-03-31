import { parseHost } from "@codestream/webview/utilities/urls";
import * as React from "react";
import { LegacyRef, MutableRefObject, Ref, useEffect, useState } from "react";

interface Props {
    providerShortName: string
    tabIndex?: number,
    onChange: (value: string) => void,
    onValidChange: (valid: boolean) => void,
    inputRef: LegacyRef<HTMLInputElement>;
    submitAttempted: boolean,
    placeholder?: string,
    invalidHosts?: string[]
}

export default function UrlInputComponent(props: Props) {

    const [baseUrl, setBaseUrl] = useState<string>('');
    const [baseUrlTouched, setBaseUrlTouched] = useState<boolean>(false);
    const [validHost, setValidHost] = useState<boolean>(false);

    useEffect(() => {
        const hostname = parseHost(baseUrl);
        if (!hostname) {
            setValidHost(false);
            return;
        }
        if (!props.invalidHosts || !Array.isArray(props.invalidHosts) || props.invalidHosts.length === 0) {
            return;
        }
        for (const invalidHost of props.invalidHosts) {
            if (hostname.includes(invalidHost)) {
                setValidHost(false);
                return;
            }
        }
        setValidHost(true);
    }, [baseUrl]);

    useEffect(() => {
        props.onValidChange(validHost);
    }, [validHost]);

    const renderBaseUrlHelp = () => {
        if (baseUrlTouched || props.submitAttempted) {
            if (baseUrl.length === 0) return <small className="error-message">Required</small>;
            if (!validHost) return <small className="error-message">Invalid URL</small>;
        }
        return;
    };

    const handleBlur = (_e: React.FocusEvent) => {
        setBaseUrlTouched(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBaseUrl(e.target.value);
        props.onChange(e.target.value);
    };

    return (
        <div>
            <label>
                <strong>{props.providerShortName} Base URL</strong>
            </label>
            <label>
                Please provide the Base URL used by your team to access {props.providerShortName}.
            </label>
            <input
                ref={props.inputRef}
                className="native-key-bindings input-text control"
                type="text"
                name="baseUrl"
                tabIndex={props.tabIndex}
                value={baseUrl}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={props.placeholder}
                id="configure-provider-initial-input"
            />
            {renderBaseUrlHelp()}
            <br/>
            <br/>
        </div>);
}