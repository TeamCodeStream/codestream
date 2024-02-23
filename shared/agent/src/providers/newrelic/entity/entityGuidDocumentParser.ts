import {
	EditorEntityGuidsRequest,
	EditorEntityGuidsResponse,
	EntityGuidToken,
	GetEditorEntityGuidsRequestType,
} from "@codestream/protocols/agent";
import { DocumentManager } from "../../../documentManager";
import { Logger } from "../../../logger";
import { lsp, lspHandler } from "../../../system";
import { parseId } from "../utils";
import { EntityProvider } from "./entityProvider";

/**
 * 
entityGuidLike regex

(?=.*[0-9]): Positive lookahead assertion that checks if the string contains at least one digit (0-9).
(?=.*[a-zA-Z]): Positive lookahead assertion that checks if the string contains at least one lowercase or uppercase letter (a-z or A-Z).
([a-zA-Z0-9]+): Matches a sequence of one or more alphanumeric characters. This is surrounded by parentheses so that the {9,} quantifier applies to the entire sequence.
{9,}: Quantifier that specifies the minimum length of the sequence should be at least 9 characters.
/g: Regular expression flag indicating that the matching should be global, i.e., find all matches within the input string.

*/
const regEx = /(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+){9,}/g;

@lsp
export class EntityGuidDocumentParser {
	constructor(
		private documentManager: DocumentManager,
		private entityProvider: EntityProvider
	) {}

	@lspHandler(GetEditorEntityGuidsRequestType)
	async parse(request: EditorEntityGuidsRequest): Promise<EditorEntityGuidsResponse> {
		try {
			const document = this.documentManager.get(request.documentUri);
			if (!document) return { items: [] };

			const text = document.getText();
			if (!text) return { items: [] };

			const entityGuidTokens: EntityGuidToken[] = [];

			let match;
			while ((match = regEx.exec(text))) {
				const entityGuidTokenMatch = match[0];
				const parsed = parseId(entityGuidTokenMatch, true);
				if (!parsed) continue;

				entityGuidTokens.push({
					guid: entityGuidTokenMatch,
					range: {
						start: match.index,
						end: match.index + entityGuidTokenMatch.length,
					},
					metadata: {
						found: false,
					},
					entity: undefined as any,
					url: `${this.entityProvider.coreUrl}/redirect/entity/${entityGuidTokenMatch}`,
					markdownString: undefined,
				});
			}
			if (!entityGuidTokens.length) return { items: [] };

			const response = await this.entityProvider.getEntitiesById({
				guids: entityGuidTokens.map(_ => _.guid),
			});
			if (!response?.entities?.length) return { items: [] };

			entityGuidTokens.forEach(_ => {
				const entity = response.entities.find(e => e.guid === _.guid);
				if (entity) {
					_.entity = entity;
					_.markdownString = `Entity Name: ${entity.name}

Account: ${_.entity.account!.id} - ${_.entity.account!.name}

Type: ${_.entity.type}`;
					_.metadata.found = true;
				}
			});

			return {
				items: entityGuidTokens.filter(_ => _.metadata.found),
			};
		} catch (ex) {
			Logger.warn("Error parsing document for entity guids", { error: ex });
		}
		return { items: [] };
	}
}
