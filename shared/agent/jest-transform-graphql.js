// From https://github.com/EvHaus/jest-transform-graphql/blob/patch-1/index.js
const loader = require("graphql-tag/loader");

module.exports = {
	process(src) {
		// call directly the webpack loader with a mocked context
		// as graphql-tag/loader leverages `this.cacheable()`
		return {
			code: loader.call({ cacheable() {} }, src),
		};
	},
};
