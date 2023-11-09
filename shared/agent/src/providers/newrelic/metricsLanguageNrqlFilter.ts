"use strict";
import { LanguageId } from "./clm/clmManager";

const languageFilters: Map<LanguageId, string> = new Map([
	["python", " AND code.function != '__call__' "],
]);

export function getLanguageFilter(languageId: LanguageId) {
	return languageFilters.get(languageId) ?? "";
}
