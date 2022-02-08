// this is what makes our react component + jest testing work

const { alias, aliasJest, configPaths } = require("react-app-rewire-alias");
const aliasMap = configPaths("./tsconfig.paths.json");

module.exports = alias(aliasMap);
module.exports.jest = aliasJest(aliasMap);
