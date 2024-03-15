/**
 * Copied from https://source.datanerd.us/logging/shared-component-logs/blob/master/shared-component/helpers/entityLogAttributesMapper.js
 *
 * Note that "entity type" referred to in this file is `entity.type` and NOT `entity.entityType`
 **/
import { EntityAccount } from "@codestream/protocols/agent";
import {
	Attribute,
	ComparisonType,
	EntityTag,
	ENTITY_TYPE_AND_LOG_ATTRIBUTES_MAP,
	AZURE_ENTITY_TYPE_AND_LOG_ATTRIBUTES,
} from "./logging.types";

export class EntityAttributeMapper {
	private createAttributeCondition(attribute: Attribute, attributeValue?: string): string {
		const value =
			attributeValue && attribute.prepare ? attribute.prepare(attributeValue) : attributeValue;

		switch (attribute.comparisonType) {
			case ComparisonType.EQUAL:
				return `\`${attribute.attributeName}\`='${value!}'`;
			case ComparisonType.CONTAINS:
				return `\`${attribute.attributeName}\` LIKE '%${value!}%'`;
			case ComparisonType.STARTS_WITH:
				return `\`${attribute.attributeName}\` LIKE '${value!}%'`;
			case ComparisonType.ENDS_WITH:
				return `\`${attribute.attributeName}\` LIKE '%${value!}'`;
			case ComparisonType.NOT_HAS:
				return `NOT \`${attribute.attributeName}\``;
			default:
				throw new Error(`Unhandled condition: '${attribute.comparisonType}'`);
		}
	}

	private getLogAttributesForEntityType(entityTypeInUpperCase: string | null): Attribute[] {
		if (entityTypeInUpperCase === null) {
			return [];
		}

		if (ENTITY_TYPE_AND_LOG_ATTRIBUTES_MAP[entityTypeInUpperCase]) {
			return ENTITY_TYPE_AND_LOG_ATTRIBUTES_MAP[entityTypeInUpperCase];
		}
		// As Azure has 37 different resource types (at the moment of writing this), we cheated a bit to don't need
		// to add duplicated code on the ENTITY_TYPE_AND_LOG_ATTRIBUTES_MAP and also to don't need to modify this
		// list if a new Azure resource type support is added to NewRelic.
		if (entityTypeInUpperCase?.startsWith("AZURE")) {
			return AZURE_ENTITY_TYPE_AND_LOG_ATTRIBUTES;
		}
		return [];
	}

	private createAwsAccountIdLambdaCondition(entityTags: EntityTag[] = []): string {
		const AWS_ACCOUNT_ID_TAG = "aws.accountId";

		const tag = entityTags.find(tag => tag?.key === AWS_ACCOUNT_ID_TAG);
		const awsAccountId = tag?.values?.[0];
		let condition = "";

		// If there's an entity tag for aws.accountId add a condition that
		// checks `owner`=[aws.accountId]. We also have a "NOT" condition because
		// not all lambdas tagged with aws.accountId will have an `owner` attribute.
		// But in the case where they do have an `owner` we'll get the one that
		// matches aws.accountId.

		if (awsAccountId) {
			const NOT_HAS_OWNER: Attribute = {
				attributeName: "owner",
				comparisonType: ComparisonType.NOT_HAS,
			};

			const OWNER_EQUALS: Attribute = {
				attributeName: "owner",
				comparisonType: ComparisonType.EQUAL,
			};

			const notHasOwner = this.createAttributeCondition(NOT_HAS_OWNER);
			const ownerEqualsAwsAccountId = this.createAttributeCondition(OWNER_EQUALS, awsAccountId);

			condition = ` AND (${notHasOwner} OR ${ownerEqualsAwsAccountId}) `;
		}
		return condition;
	}

	private constructWhereConditionsWithLogAttributes({
		entityTypeInUpperCase,
		entityGuid,
		logAttributeValue,
	}: {
		entityTypeInUpperCase: string | null;
		entityGuid: string;
		logAttributeValue: string;
	}): string {
		const logAttributes = this.getLogAttributesForEntityType(entityTypeInUpperCase);
		const hasLogAttributes = logAttributes && logAttributes.length;
		const hasAttributeValue = typeof logAttributeValue !== "undefined";

		let conditions = [
			this.createAttributeCondition(
				{ attributeName: "entity.guid", comparisonType: ComparisonType.EQUAL },
				entityGuid
			),
			this.createAttributeCondition(
				{ attributeName: "entity.guids", comparisonType: ComparisonType.CONTAINS },
				entityGuid
			),
		];

		if (hasLogAttributes && hasAttributeValue) {
			conditions = conditions.concat(
				logAttributes.map(attribute => this.createAttributeCondition(attribute, logAttributeValue))
			);
		}

		return conditions.join(" OR ");
	}

	getWhereClauseForEntity(entity: EntityAccount): string {
		const { type, entityGuid, entityName, tags } = entity;
		const entityTypeInUpperCase: string | null = type ? type.toUpperCase() : null;
		const logAttributeValue = entityName;

		let whereClause = this.constructWhereConditionsWithLogAttributes({
			entityTypeInUpperCase,
			entityGuid,
			logAttributeValue,
		});

		// Add condition where owner=tags.aws.accountId to prevent case where other
		// lambdas with the same name are shown in the wrong entity
		// https://new-relic.atlassian.net/browse/NR-230233
		if (entityTypeInUpperCase === "AWSLAMBDAFUNCTION") {
			whereClause += this.createAwsAccountIdLambdaCondition(tags);
		}

		return whereClause;
	}
}
