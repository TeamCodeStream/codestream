import { EntityType } from "@codestream/protocols/agent";

export enum ComparisonType {
	EQUAL = "EQUAL",
	CONTAINS = "CONTAINS",
	STARTS_WITH = "STARTS_WITH",
	ENDS_WITH = "ENDS_WITH",
	NOT_HAS = "NOT_HAS",
}

export interface EntityTag {
	key: string;
	values: string[];
}

export interface Attribute {
	attributeName: string;
	comparisonType: ComparisonType;
	prepare?: (value: string) => string;
}

export interface EntityAttributeMappings {
	[type: string]: Attribute[];
}

export const ENTITY_TYPE_AND_LOG_ATTRIBUTES_MAP: EntityAttributeMappings = {
	APPLICATION: [
		{
			attributeName: "service_name",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "serviceName",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "service.name",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "entity.name",
			comparisonType: ComparisonType.EQUAL,
		},
	],
	CONTAINER: [
		{
			attributeName: "container_name",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "container.name",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "containerName",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "docker.name",
			comparisonType: ComparisonType.EQUAL,
		},
	],
	HOST: [
		{
			attributeName: "host.name",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "hostname",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "host",
			comparisonType: ComparisonType.EQUAL,
		},
	],
	SERVICE: [
		{
			attributeName: "service_name",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "serviceName",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "service.name",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "entity.name",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "container_name",
			comparisonType: ComparisonType.EQUAL,
		},
	],
	AWSLAMBDAFUNCTION: [
		{
			attributeName: "faas.name",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "aws.logGroup",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "aws.logGroup",
			comparisonType: ComparisonType.ENDS_WITH,
			prepare: (value: string) => `/${value}`,
		},
		{
			attributeName: "logGroup",
			comparisonType: ComparisonType.EQUAL,
		},
		{
			attributeName: "logGroup",
			comparisonType: ComparisonType.ENDS_WITH,
			prepare: (value: string) => `/${value}`,
		},
	],
	SWITCH: [{ attributeName: "device_name", comparisonType: ComparisonType.EQUAL }],
	ROUTER: [{ attributeName: "device_name", comparisonType: ComparisonType.EQUAL }],
	KUBERNETESCLUSTER: [
		{
			attributeName: "cluster_name",
			comparisonType: ComparisonType.EQUAL,
		},
	],
	KUBERNETES_POD: [
		{
			attributeName: "pod_name",
			comparisonType: ComparisonType.EQUAL,
		},
	],
};

export const AZURE_ENTITY_TYPE_AND_LOG_ATTRIBUTES: Attribute[] = [
	{ attributeName: "azure.resourceName", comparisonType: ComparisonType.EQUAL },
	// Microsoft didn't guarantee the existence of azure.resourceName for all their resources at this moment, so we need
	// to add a fallback to the last segment of the azure.resourceId which should be always the resource name (uppercase).
	{
		attributeName: "azure.resourceId",
		comparisonType: ComparisonType.ENDS_WITH,
		prepare: (value: string) => `/${value}`,
	},
];

export interface LogEntityResult {
	guid: string;
	name: string;
	entityType: EntityType;
	type: string;
	tags: {
		key: string;
		values: string[];
	}[];
	account: {
		name: string;
		id: number;
	};
}

export interface LogEntitySearchResult {
	actor: {
		entitySearch: {
			count: number;
			results: {
				nextCursor: string;
				entities: LogEntityResult[];
			};
		};
	};
}
