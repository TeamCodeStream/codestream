import { describe, it } from "@jest/globals";
import { normalizeUrl, parseHost } from "../../utilities/urls";

describe("urls", () => {
    describe("parseHost", () => {
        it("should parse host for valid url", () => {
            const host = parseHost("https://thehost.com/stuff?stuff2");
            expect(host).toEqual("thehost.com");
        });

        it("should parse host for url missing scheme", () => {
            const host = parseHost("thehost.com/stuff?stuff2");
            expect(host).toEqual("thehost.com");
        });

        it("should return null for empty string", () => {
            const host = parseHost("");
            expect(host).toBeNull();
        });

        it("should return null for whitespace string", () => {
            const host = parseHost("  ");
            expect(host).toBeNull();
        });
    });

    describe("normalizeUrl", () => {
        it("should convert to lowercase", () => {
            const host = normalizeUrl("https://TheHost.com/stuff?stuff2");
            expect(host).toEqual("https://thehost.com/stuff?stuff2");
        });

        it("should prepend https if scheme not present", () => {
            const host = normalizeUrl("thehost.com/stuff?stuff2");
            expect(host).toEqual("https://thehost.com/stuff?stuff2");
        });

        it("should remove trailing slash", () => {
            const host = normalizeUrl("https://host/whatever/ ");
            expect(host).toBe("https://host/whatever");
        });

        it("should trim whitespace on both sides", () => {
            const host = normalizeUrl("  https://theurl    ");
            expect(host).toBe("https://theurl");
        });
    });
});
