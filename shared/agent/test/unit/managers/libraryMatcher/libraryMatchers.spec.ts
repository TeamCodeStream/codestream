import { describe, expect, it } from "@jest/globals";
import { libraryMatchers } from "../../../../src/managers/libraryMatcher/libraryMatchers";

describe("library matchers", () => {
	describe("python library matcher", () => {
		it("should return true for library paths", () => {
			const libraryLines = [
				"/usr/local/lib/python3.10/dist-packages/gunicorn/app/wsgiapp.py",
				"/usr/local/lib/python3/site-packages/gunicorn/app/base.py",
				"/usr/local/lib/python2/lib-dynload/flask/app.py",
				"/usr/local/lib/python3.10/dist-packages/newrelic/api/wsgi_application.py"
			];
			for (const line of libraryLines) {
				expect(libraryMatchers["python"](line)).toBe(true);
			}
		});
		it("should return false for non-library paths", () => {
			const lines = ["/src/routes/app.py", "/src/main.py", "/src/routes/db.py"];
			for (const line of lines) {
				expect(libraryMatchers["python"](line)).toBe(false);
			}
		});
	});
});
