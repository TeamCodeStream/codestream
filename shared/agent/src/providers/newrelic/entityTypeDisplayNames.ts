//
// Using a static value because the query is only available with the Product scope
// (NR1 internal) and we don't have access to execute it at runtime
//
// For the custom array, some of the more commonly used displayNames from entityTypeDisplayNames
// are not very CS friendly given our limited landscape to work with in the sidebar.
// This is a list of custom overrides we use instead.
//
export const entityTypeDisplayNamesCustom = [
	{
		domain: "APM",
		id: "APM-APPLICATION",
		type: "APPLICATION",
		uiDefinitions: {
			displayName: "APM",
			displayNamePlural: "APM",
		},
	},
	{
		domain: "BROWSER",
		id: "BROWSER-APPLICATION",
		type: "APPLICATION",
		uiDefinitions: {
			displayName: "Browser",
			displayNamePlural: "Browser",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SERVICE",
		type: "SERVICE",
		uiDefinitions: {
			displayName: "OTel",
			displayNamePlural: "OTel",
		},
	},
];

//
// The below array is pulled straight from NR1
//
// Query here:
// https://one.newrelic.com/nerdgraph-graphiql?state=382bbb5b-0b44-60a6-8826-732c0bd40850
// {
// 	actor {
// 	  entityTypes {
// 		uiDefinitions {
// 		  displayName
// 		  displayNamePlural
// 		}
// 		domain
// 		type
// 		id
// 	  }
// 	}
// }
//

export const entityTypeDisplayNames = [
	{
		domain: "AGENT",
		id: "AGENT-INFRAAGENT",
		type: "INFRAAGENT",
		uiDefinitions: {
			displayName: "Infraagent",
			displayNamePlural: "Infraagents",
		},
	},
	{
		domain: "AGENT",
		id: "AGENT-OTELCOL",
		type: "OTELCOL",
		uiDefinitions: {
			displayName: "Otelcol",
			displayNamePlural: "Otelcols",
		},
	},
	{
		domain: "AGENT",
		id: "AGENT-SUPERAGENT",
		type: "SUPERAGENT",
		uiDefinitions: {
			displayName: "Superagent",
			displayNamePlural: "Superagents",
		},
	},
	{
		domain: "AIOPS",
		id: "AIOPS-CONDITION",
		type: "CONDITION",
		uiDefinitions: {
			displayName: "Alert Condition",
			displayNamePlural: "Alert Conditions",
		},
	},
	{
		domain: "AIOPS",
		id: "AIOPS-DESTINATION",
		type: "DESTINATION",
		uiDefinitions: {
			displayName: "Destination",
			displayNamePlural: "Destinations",
		},
	},
	{
		domain: "AIOPS",
		id: "AIOPS-ISSUE",
		type: "ISSUE",
		uiDefinitions: {
			displayName: "Issue",
			displayNamePlural: "Issues",
		},
	},
	{
		domain: "AIOPS",
		id: "AIOPS-POLICY",
		type: "POLICY",
		uiDefinitions: {
			displayName: "Alert Policy",
			displayNamePlural: "Alert Policies",
		},
	},
	{
		domain: "AIOPS",
		id: "AIOPS-WORKFLOW",
		type: "WORKFLOW",
		uiDefinitions: {
			displayName: "Workflow",
			displayNamePlural: "Workflows",
		},
	},
	{
		domain: "APM",
		id: "APM-APPLICATION",
		type: "APPLICATION",
		uiDefinitions: {
			displayName: "Service - APM",
			displayNamePlural: "Services - APM",
		},
	},
	{
		domain: "BROWSER",
		id: "BROWSER-APPLICATION",
		type: "APPLICATION",
		uiDefinitions: {
			displayName: "Browser application",
			displayNamePlural: "Browser applications",
		},
	},
	{
		domain: "BROWSER",
		id: "BROWSER-MICRO_FRONTEND",
		type: "MICRO_FRONTEND",
		uiDefinitions: {
			displayName: "Micro frontend",
			displayNamePlural: "Micro frontends",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-AMQP_SERVER",
		type: "AMQP_SERVER",
		uiDefinitions: {
			displayName: "Amqp Server",
			displayNamePlural: "Amqp Servers",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-CASSANDRA_SERVER",
		type: "CASSANDRA_SERVER",
		uiDefinitions: {
			displayName: "Cassandra Server",
			displayNamePlural: "Cassandra Servers",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-CLIENT",
		type: "CLIENT",
		uiDefinitions: {
			displayName: "Client",
			displayNamePlural: "Clients",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-DNS_SERVER",
		type: "DNS_SERVER",
		uiDefinitions: {
			displayName: "Dns Server",
			displayNamePlural: "Dns Servers",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-HTTP_SERVER",
		type: "HTTP_SERVER",
		uiDefinitions: {
			displayName: "Http Server",
			displayNamePlural: "Http Servers",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-KAFKA_SERVER",
		type: "KAFKA_SERVER",
		uiDefinitions: {
			displayName: "Kafka Server",
			displayNamePlural: "Kafka Servers",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-MONGODB_SERVER",
		type: "MONGODB_SERVER",
		uiDefinitions: {
			displayName: "Mongodb Server",
			displayNamePlural: "Mongodb Servers",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-MYSQL_SERVER",
		type: "MYSQL_SERVER",
		uiDefinitions: {
			displayName: "Mysql Server",
			displayNamePlural: "Mysql Servers",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-POSTGRES_SERVER",
		type: "POSTGRES_SERVER",
		uiDefinitions: {
			displayName: "Postgres Server",
			displayNamePlural: "Postgres Servers",
		},
	},
	{
		domain: "EBPF",
		id: "EBPF-REDIS_SERVER",
		type: "REDIS_SERVER",
		uiDefinitions: {
			displayName: "Redis Server",
			displayNamePlural: "Redis Servers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ACCESS_POINT",
		type: "ACCESS_POINT",
		uiDefinitions: {
			displayName: "Access Point",
			displayNamePlural: "Access Points",
		},
	},
	{
		domain: "EXT",
		id: "EXT-AEROSPIKE",
		type: "AEROSPIKE",
		uiDefinitions: {
			displayName: "Aerospike",
			displayNamePlural: "Aerospikes",
		},
	},
	{
		domain: "EXT",
		id: "EXT-AIR_CONDITIONER",
		type: "AIR_CONDITIONER",
		uiDefinitions: {
			displayName: "Air conditioner",
			displayNamePlural: "Air conditioners",
		},
	},
	{
		domain: "EXT",
		id: "EXT-AIX_ORACLE",
		type: "AIX_ORACLE",
		uiDefinitions: {
			displayName: "Aix Oracle",
			displayNamePlural: "Aix Oracles",
		},
	},
	{
		domain: "EXT",
		id: "EXT-APACHE_DRUID",
		type: "APACHE_DRUID",
		uiDefinitions: {
			displayName: "Apache Druid",
			displayNamePlural: "Apache Druids",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ARGOCD",
		type: "ARGOCD",
		uiDefinitions: {
			displayName: "Argocd",
			displayNamePlural: "Argocds",
		},
	},
	{
		domain: "EXT",
		id: "EXT-AUDIOCODES_GATEWAY",
		type: "AUDIOCODES_GATEWAY",
		uiDefinitions: {
			displayName: "Audiocodes Gateway",
			displayNamePlural: "Audiocodes Gateways",
		},
	},
	{
		domain: "EXT",
		id: "EXT-AWS_ELEMENTAL",
		type: "AWS_ELEMENTAL",
		uiDefinitions: {
			displayName: "AWS Elemental",
			displayNamePlural: "AWS Elemental",
		},
	},
	{
		domain: "EXT",
		id: "EXT-BILLABLE_USER",
		type: "BILLABLE_USER",
		uiDefinitions: {
			displayName: "Billable User",
			displayNamePlural: "Billable Users",
		},
	},
	{
		domain: "EXT",
		id: "EXT-BROWSER_APP",
		type: "BROWSER_APP",
		uiDefinitions: null,
	},
	{
		domain: "EXT",
		id: "EXT-CDN_GENERIC",
		type: "CDN_GENERIC",
		uiDefinitions: {
			displayName: "CDN",
			displayNamePlural: "CDNs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-CISCO_APIC",
		type: "CISCO_APIC",
		uiDefinitions: {
			displayName: "Cisco APIC",
			displayNamePlural: "Cisco APICs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-CISCO_DCNM",
		type: "CISCO_DCNM",
		uiDefinitions: {
			displayName: "Cisco Dcnm",
			displayNamePlural: "Cisco Dcnms",
		},
	},
	{
		domain: "EXT",
		id: "EXT-CISCO_UCS",
		type: "CISCO_UCS",
		uiDefinitions: {
			displayName: "Cisco UCS",
			displayNamePlural: "Cisco UCS",
		},
	},
	{
		domain: "EXT",
		id: "EXT-CLOUDFLARE_HOST",
		type: "CLOUDFLARE_HOST",
		uiDefinitions: {
			displayName: "Cloudflare Host",
			displayNamePlural: "Cloudflare Hosts",
		},
	},
	{
		domain: "EXT",
		id: "EXT-COHESITY",
		type: "COHESITY",
		uiDefinitions: {
			displayName: "Cohesity",
			displayNamePlural: "Cohesities",
		},
	},
	{
		domain: "EXT",
		id: "EXT-COREDNS",
		type: "COREDNS",
		uiDefinitions: {
			displayName: "Coredns",
			displayNamePlural: "Corednses",
		},
	},
	{
		domain: "EXT",
		id: "EXT-CUSTOMER_CONSUMPTION",
		type: "CUSTOMER_CONSUMPTION",
		uiDefinitions: {
			displayName: "Customer Consumption",
			displayNamePlural: "Customer Consumptions",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DB2",
		type: "DB2",
		uiDefinitions: {
			displayName: "DB2 Database",
			displayNamePlural: "DB2 Databases",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DDI",
		type: "DDI",
		uiDefinitions: {
			displayName: "DDI",
			displayNamePlural: "DDIs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DEEPER_CONNECT",
		type: "DEEPER_CONNECT",
		uiDefinitions: {
			displayName: "Deeper Connect",
			displayNamePlural: "Deeper Connects",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DELL_AVAMAR",
		type: "DELL_AVAMAR",
		uiDefinitions: {
			displayName: "Dell Avamar",
			displayNamePlural: "Dell Avamars",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DELL_COMPELLENT",
		type: "DELL_COMPELLENT",
		uiDefinitions: {
			displayName: "Dell Compellent",
			displayNamePlural: "Dell Compellents",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DELL_DATADOMAIN",
		type: "DELL_DATADOMAIN",
		uiDefinitions: {
			displayName: "Dell Datadomain",
			displayNamePlural: "Dell Datadomains",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DELL_RECOVERPOINT",
		type: "DELL_RECOVERPOINT",
		uiDefinitions: {
			displayName: "Dell Recoverpoint",
			displayNamePlural: "Dell Recoverpoints",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DELL_VMAX",
		type: "DELL_VMAX",
		uiDefinitions: {
			displayName: "Dell Vmax",
			displayNamePlural: "Dell Vmaxes",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DELL_VNX",
		type: "DELL_VNX",
		uiDefinitions: {
			displayName: "Dell Vnx",
			displayNamePlural: "Dell Vnxes",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DELL_VPLEX",
		type: "DELL_VPLEX",
		uiDefinitions: {
			displayName: "Dell Vplex",
			displayNamePlural: "Dell Vplexes",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DELL_XTREMIO",
		type: "DELL_XTREMIO",
		uiDefinitions: {
			displayName: "Dell Xtremio",
			displayNamePlural: "Dell Xtremios",
		},
	},
	{
		domain: "EXT",
		id: "EXT-DORA",
		type: "DORA",
		uiDefinitions: {
			displayName: "Dora",
			displayNamePlural: "Doras",
		},
	},
	{
		domain: "EXT",
		id: "EXT-EMAIL_GATEWAY",
		type: "EMAIL_GATEWAY",
		uiDefinitions: {
			displayName: "Email gateway",
			displayNamePlural: "Email gateways",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ENDPOINT",
		type: "ENDPOINT",
		uiDefinitions: {
			displayName: "Network endpoint",
			displayNamePlural: "Network endpoints",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ENVIRONMENT_SENSOR",
		type: "ENVIRONMENT_SENSOR",
		uiDefinitions: {
			displayName: "Environment sensor",
			displayNamePlural: "Environment sensors",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ENVOY",
		type: "ENVOY",
		uiDefinitions: {
			displayName: "Envoy",
			displayNamePlural: "Envoys",
		},
	},
	{
		domain: "EXT",
		id: "EXT-FACTORIO_GAME",
		type: "FACTORIO_GAME",
		uiDefinitions: {
			displayName: "Factorio Game",
			displayNamePlural: "Factorio Games",
		},
	},
	{
		domain: "EXT",
		id: "EXT-FASTLY_POP",
		type: "FASTLY_POP",
		uiDefinitions: {
			displayName: "Fastly datacenter",
			displayNamePlural: "Fastly datacenters",
		},
	},
	{
		domain: "EXT",
		id: "EXT-FIBRE_CHANNEL_SWITCH",
		type: "FIBRE_CHANNEL_SWITCH",
		uiDefinitions: {
			displayName: "Fibre Channel Switch",
			displayNamePlural: "Fibre Channel Switches",
		},
	},
	{
		domain: "EXT",
		id: "EXT-FIREWALL",
		type: "FIREWALL",
		uiDefinitions: {
			displayName: "Firewall",
			displayNamePlural: "Firewalls",
		},
	},
	{
		domain: "EXT",
		id: "EXT-FLEX_REMOTE",
		type: "FLEX_REMOTE",
		uiDefinitions: {
			displayName: "Flex Remote",
			displayNamePlural: "Flex Remotes",
		},
	},
	{
		domain: "EXT",
		id: "EXT-FLOW_DEVICE",
		type: "FLOW_DEVICE",
		uiDefinitions: {
			displayName: "Flow Device",
			displayNamePlural: "Flow Devices",
		},
	},
	{
		domain: "EXT",
		id: "EXT-GATSBY_BUILD",
		type: "GATSBY_BUILD",
		uiDefinitions: {
			displayName: "Gatsby Build",
			displayNamePlural: "Gatsby Builds",
		},
	},
	{
		domain: "EXT",
		id: "EXT-HARBORREGISTRY",
		type: "HARBORREGISTRY",
		uiDefinitions: {
			displayName: "Harborregistry",
			displayNamePlural: "Harborregistries",
		},
	},
	{
		domain: "EXT",
		id: "EXT-HARDWARE_SECURITY_MODULE",
		type: "HARDWARE_SECURITY_MODULE",
		uiDefinitions: {
			displayName: "Hardware Security Module",
			displayNamePlural: "Hardware Security Modules",
		},
	},
	{
		domain: "EXT",
		id: "EXT-HCP_VAULT",
		type: "HCP_VAULT",
		uiDefinitions: {
			displayName: "Hcp Vault",
			displayNamePlural: "Hcp Vaults",
		},
	},
	{
		domain: "EXT",
		id: "EXT-HOST",
		type: "HOST",
		uiDefinitions: {
			displayName: "Host - External",
			displayNamePlural: "Host - Externals",
		},
	},
	{
		domain: "EXT",
		id: "EXT-IBMMQMANAGER",
		type: "IBMMQMANAGER",
		uiDefinitions: {
			displayName: "IBM MQ Manager",
			displayNamePlural: "IBM MQ Managers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-IBMMQQUEUE",
		type: "IBMMQQUEUE",
		uiDefinitions: {
			displayName: "IBM MQ Queue",
			displayNamePlural: "IBM MQ Queues",
		},
	},
	{
		domain: "EXT",
		id: "EXT-IBM_DATAPOWER",
		type: "IBM_DATAPOWER",
		uiDefinitions: {
			displayName: "IBM DataPower",
			displayNamePlural: "IBM DataPower",
		},
	},
	{
		domain: "EXT",
		id: "EXT-IBM_WGA",
		type: "IBM_WGA",
		uiDefinitions: {
			displayName: "IBM WGA",
			displayNamePlural: "IBM WGAs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-IDRAC",
		type: "IDRAC",
		uiDefinitions: {
			displayName: "iDRAC",
			displayNamePlural: "iDRACs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ILO",
		type: "ILO",
		uiDefinitions: {
			displayName: "ILO",
			displayNamePlural: "ILOes",
		},
	},
	{
		domain: "EXT",
		id: "EXT-INFLUXDB",
		type: "INFLUXDB",
		uiDefinitions: {
			displayName: "Influxdb",
			displayNamePlural: "Influxdbs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ISILON",
		type: "ISILON",
		uiDefinitions: {
			displayName: "Isilon",
			displayNamePlural: "Isilons",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ISTIO_SERVICE",
		type: "ISTIO_SERVICE",
		uiDefinitions: {
			displayName: "Istio Service",
			displayNamePlural: "Istio Services",
		},
	},
	{
		domain: "EXT",
		id: "EXT-JFROG_SERVER",
		type: "JFROG_SERVER",
		uiDefinitions: {
			displayName: "Jfrog Server",
			displayNamePlural: "Jfrog Servers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-JNPR_ICMP_DEVICE",
		type: "JNPR_ICMP_DEVICE",
		uiDefinitions: {
			displayName: "Jnpr Icmp Device",
			displayNamePlural: "Jnpr Icmp Devices",
		},
	},
	{
		domain: "EXT",
		id: "EXT-KENTIK_DEFAULT",
		type: "KENTIK_DEFAULT",
		uiDefinitions: {
			displayName: "Kentik Default",
			displayNamePlural: "Kentik Defaults",
		},
	},
	{
		domain: "EXT",
		id: "EXT-KENTIK_PING",
		type: "KENTIK_PING",
		uiDefinitions: {
			displayName: "Ping device",
			displayNamePlural: "Ping Devices",
		},
	},
	{
		domain: "EXT",
		id: "EXT-KEY_TRANSACTION",
		type: "KEY_TRANSACTION",
		uiDefinitions: {
			displayName: "Key Transaction",
			displayNamePlural: "Key Transactions",
		},
	},
	{
		domain: "EXT",
		id: "EXT-LOAD_BALANCER",
		type: "LOAD_BALANCER",
		uiDefinitions: {
			displayName: "Load balancer",
			displayNamePlural: "Load balancers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-MEDIA_GATEWAY",
		type: "MEDIA_GATEWAY",
		uiDefinitions: {
			displayName: "Media gateway",
			displayNamePlural: "Media gateways",
		},
	},
	{
		domain: "EXT",
		id: "EXT-MEDIA_SERVER",
		type: "MEDIA_SERVER",
		uiDefinitions: {
			displayName: "Media server",
			displayNamePlural: "Media servers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-MERAKI_DEVICE",
		type: "MERAKI_DEVICE",
		uiDefinitions: {
			displayName: "Meraki Device",
			displayNamePlural: "Meraki Devices",
		},
	},
	{
		domain: "EXT",
		id: "EXT-MERAKI_NETWORK",
		type: "MERAKI_NETWORK",
		uiDefinitions: {
			displayName: "Meraki Network",
			displayNamePlural: "Meraki Networks",
		},
	},
	{
		domain: "EXT",
		id: "EXT-MERAKI_ORGANIZATION",
		type: "MERAKI_ORGANIZATION",
		uiDefinitions: {
			displayName: "Meraki Organization",
			displayNamePlural: "Meraki Organizations",
		},
	},
	{
		domain: "EXT",
		id: "EXT-MOBILE_APP",
		type: "MOBILE_APP",
		uiDefinitions: null,
	},
	{
		domain: "EXT",
		id: "EXT-MOBILITY_CONTROLLER",
		type: "MOBILITY_CONTROLLER",
		uiDefinitions: {
			displayName: "Mobility Controller",
			displayNamePlural: "Mobility Controllers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-MYSQL",
		type: "MYSQL",
		uiDefinitions: null,
	},
	{
		domain: "EXT",
		id: "EXT-NAS",
		type: "NAS",
		uiDefinitions: {
			displayName: "NAS",
			displayNamePlural: "NAS",
		},
	},
	{
		domain: "EXT",
		id: "EXT-NETGEAR_READYNAS",
		type: "NETGEAR_READYNAS",
		uiDefinitions: {
			displayName: "Netgear Readynas",
			displayNamePlural: "Netgear Readynases",
		},
	},
	{
		domain: "EXT",
		id: "EXT-NETWORK_DHCP_SERVICE",
		type: "NETWORK_DHCP_SERVICE",
		uiDefinitions: {
			displayName: "Network Dhcp Service",
			displayNamePlural: "Network Dhcp Services",
		},
	},
	{
		domain: "EXT",
		id: "EXT-NETWORK_DNS_SERVICE",
		type: "NETWORK_DNS_SERVICE",
		uiDefinitions: {
			displayName: "Network Dns Service",
			displayNamePlural: "Network Dns Services",
		},
	},
	{
		domain: "EXT",
		id: "EXT-NETWORK_SYNTH",
		type: "NETWORK_SYNTH",
		uiDefinitions: {
			displayName: "Network Synthetic",
			displayNamePlural: "Network Synthetics",
		},
	},
	{
		domain: "EXT",
		id: "EXT-NET_SNMP",
		type: "NET_SNMP",
		uiDefinitions: {
			displayName: "Net-SNMP",
			displayNamePlural: "Net-SNMP",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PACKAGE",
		type: "PACKAGE",
		uiDefinitions: {
			displayName: "Package",
			displayNamePlural: "Packages",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PACKET_BROKER",
		type: "PACKET_BROKER",
		uiDefinitions: {
			displayName: "Packet broker",
			displayNamePlural: "Packet brokers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PDU",
		type: "PDU",
		uiDefinitions: {
			displayName: "PDU",
			displayNamePlural: "PDU",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PIHOLE",
		type: "PIHOLE",
		uiDefinitions: {
			displayName: "Pi-Hole",
			displayNamePlural: "Pi-Holes",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PINECONE_INDEX",
		type: "PINECONE_INDEX",
		uiDefinitions: {
			displayName: "Pinecone Index",
			displayNamePlural: "Pinecone Indexes",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PIXIE_AMQP",
		type: "PIXIE_AMQP",
		uiDefinitions: {
			displayName: "AMQP - Pixie",
			displayNamePlural: "AMQP - Pixie",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PIXIE_CASSANDRA",
		type: "PIXIE_CASSANDRA",
		uiDefinitions: {
			displayName: "Cassandra - Pixie",
			displayNamePlural: "Cassandra - Pixie",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PIXIE_DNS",
		type: "PIXIE_DNS",
		uiDefinitions: {
			displayName: "DNS - Pixie",
			displayNamePlural: "DNS - Pixie",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PIXIE_KAFKABROKER",
		type: "PIXIE_KAFKABROKER",
		uiDefinitions: {
			displayName: "Kafka - Pixie",
			displayNamePlural: "Kafka - Pixie",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PIXIE_MYSQL",
		type: "PIXIE_MYSQL",
		uiDefinitions: {
			displayName: "MySQL - Pixie",
			displayNamePlural: "MySQL - Pixie",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PIXIE_POSTGRES",
		type: "PIXIE_POSTGRES",
		uiDefinitions: {
			displayName: "Postgres - Pixie",
			displayNamePlural: "Postgres - Pixie",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PIXIE_REDIS",
		type: "PIXIE_REDIS",
		uiDefinitions: {
			displayName: "Redis - Pixie",
			displayNamePlural: "Redis - Pixie",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PRINTER",
		type: "PRINTER",
		uiDefinitions: {
			displayName: "Printer",
			displayNamePlural: "Printers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-PURE",
		type: "PURE",
		uiDefinitions: {
			displayName: "Pure",
			displayNamePlural: "Pures",
		},
	},
	{
		domain: "EXT",
		id: "EXT-REDIS",
		type: "REDIS",
		uiDefinitions: {
			displayName: "Redis cluster",
			displayNamePlural: "Redis clusters",
		},
	},
	{
		domain: "EXT",
		id: "EXT-RF_SCANNER",
		type: "RF_SCANNER",
		uiDefinitions: {
			displayName: "RF Scanner",
			displayNamePlural: "RF Scanners",
		},
	},
	{
		domain: "EXT",
		id: "EXT-RHOST",
		type: "RHOST",
		uiDefinitions: {
			displayName: "OpMon Host",
			displayNamePlural: "OpMon Hosts",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ROUTER",
		type: "ROUTER",
		uiDefinitions: {
			displayName: "Router",
			displayNamePlural: "Routers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-RSERVICE",
		type: "RSERVICE",
		uiDefinitions: {
			displayName: "RService",
			displayNamePlural: "RServices",
		},
	},
	{
		domain: "EXT",
		id: "EXT-RSERVICEV2",
		type: "RSERVICEV2",
		uiDefinitions: {
			displayName: "Rservicev2",
			displayNamePlural: "Rservicev2s",
		},
	},
	{
		domain: "EXT",
		id: "EXT-RUBRIK",
		type: "RUBRIK",
		uiDefinitions: {
			displayName: "Rubrik",
			displayNamePlural: "Rubriks",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_ABAPWS",
		type: "SAP_ABAPWS",
		uiDefinitions: {
			displayName: "SAP ABAP Web Service",
			displayNamePlural: "SAP ABAP Web Services",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_HANA",
		type: "SAP_HANA",
		uiDefinitions: {
			displayName: "SAP HANA DB",
			displayNamePlural: "SAP HANA DBs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_HTTPDEST",
		type: "SAP_HTTPDEST",
		uiDefinitions: {
			displayName: "HTTP Destination",
			displayNamePlural: "HTTP Destinations",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_IDOC",
		type: "SAP_IDOC",
		uiDefinitions: {
			displayName: "IDOC",
			displayNamePlural: "IDOCs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_INSTANCE",
		type: "SAP_INSTANCE",
		uiDefinitions: {
			displayName: "App Server Instance",
			displayNamePlural: "App Server Instances",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_JOB",
		type: "SAP_JOB",
		uiDefinitions: {
			displayName: "Background Job",
			displayNamePlural: "Background Jobs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_MAXDB",
		type: "SAP_MAXDB",
		uiDefinitions: {
			displayName: "SAP MaxDB",
			displayNamePlural: "SAP MaxDBs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_MSSQL",
		type: "SAP_MSSQL",
		uiDefinitions: {
			displayName: "SAP SQLServer DB",
			displayNamePlural: "SAP SQLServer DBs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_ORACLE",
		type: "SAP_ORACLE",
		uiDefinitions: {
			displayName: "SAP Oracle DB",
			displayNamePlural: "SAP ORACLE DBs",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_QRFC",
		type: "SAP_QRFC",
		uiDefinitions: {
			displayName: "RFC Queue",
			displayNamePlural: "RFC Queues",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_RFCDEST",
		type: "SAP_RFCDEST",
		uiDefinitions: {
			displayName: "RFC Destination",
			displayNamePlural: "RFC Destinations",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_SYSTEM",
		type: "SAP_SYSTEM",
		uiDefinitions: {
			displayName: "System",
			displayNamePlural: "Systems",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SAP_TRANSACTION",
		type: "SAP_TRANSACTION",
		uiDefinitions: {
			displayName: "SAP Transaction",
			displayNamePlural: "SAP Transactions",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SD_WAN",
		type: "SD_WAN",
		uiDefinitions: {
			displayName: "SD WAN",
			displayNamePlural: "SD WAN",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SERVICE",
		type: "SERVICE",
		uiDefinitions: {
			displayName: "Service - OpenTelemetry",
			displayNamePlural: "Services - OpenTelemetry",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SERVICE_LEVEL",
		type: "SERVICE_LEVEL",
		uiDefinitions: {
			displayName: "Service Level",
			displayNamePlural: "Service Levels",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SHELLED_SPA",
		type: "SHELLED_SPA",
		uiDefinitions: {
			displayName: "Shelled Spa",
			displayNamePlural: "Shelled Spas",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SITE",
		type: "SITE",
		uiDefinitions: {
			displayName: "Site",
			displayNamePlural: "Sites",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SNMP_APPLIANCE",
		type: "SNMP_APPLIANCE",
		uiDefinitions: {
			displayName: "SNMP appliance",
			displayNamePlural: "SNMP appliances",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SOLARWINDS_NETWORK",
		type: "SOLARWINDS_NETWORK",
		uiDefinitions: {
			displayName: "Solarwinds Network",
			displayNamePlural: "Solarwinds Networks",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SOLARWINDS_OTHER",
		type: "SOLARWINDS_OTHER",
		uiDefinitions: {
			displayName: "Solarwinds Other",
			displayNamePlural: "Solarwinds Others",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SOLARWINDS_SERVER",
		type: "SOLARWINDS_SERVER",
		uiDefinitions: {
			displayName: "Solarwinds Server",
			displayNamePlural: "Solarwinds Servers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SSL_CERTIFICATE",
		type: "SSL_CERTIFICATE",
		uiDefinitions: {
			displayName: "Ssl Certificate",
			displayNamePlural: "Ssl Certificates",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SWITCH",
		type: "SWITCH",
		uiDefinitions: {
			displayName: "Switch",
			displayNamePlural: "Switches",
		},
	},
	{
		domain: "EXT",
		id: "EXT-SYNOLOGY",
		type: "SYNOLOGY",
		uiDefinitions: {
			displayName: "Synology",
			displayNamePlural: "Synologies",
		},
	},
	{
		domain: "EXT",
		id: "EXT-TEAM",
		type: "TEAM",
		uiDefinitions: {
			displayName: "Team",
			displayNamePlural: "Teams",
		},
	},
	{
		domain: "EXT",
		id: "EXT-TEMPORAL",
		type: "TEMPORAL",
		uiDefinitions: {
			displayName: "Temporal self hosted",
			displayNamePlural: "Temporal self hosteds",
		},
	},
	{
		domain: "EXT",
		id: "EXT-TINYPROXY",
		type: "TINYPROXY",
		uiDefinitions: {
			displayName: "Tinyproxy",
			displayNamePlural: "Tinyproxies",
		},
	},
	{
		domain: "EXT",
		id: "EXT-TRAP_DEVICE",
		type: "TRAP_DEVICE",
		uiDefinitions: {
			displayName: "Trap Device",
			displayNamePlural: "Trap Devices",
		},
	},
	{
		domain: "EXT",
		id: "EXT-UNIX_HOST",
		type: "UNIX_HOST",
		uiDefinitions: {
			displayName: "Unix host",
			displayNamePlural: "Unix hosts",
		},
	},
	{
		domain: "EXT",
		id: "EXT-UPS",
		type: "UPS",
		uiDefinitions: {
			displayName: "UPS",
			displayNamePlural: "UPS",
		},
	},
	{
		domain: "EXT",
		id: "EXT-VPC_NETWORK",
		type: "VPC_NETWORK",
		uiDefinitions: {
			displayName: "VPC Network",
			displayNamePlural: "VPC Networks",
		},
	},
	{
		domain: "EXT",
		id: "EXT-WAF",
		type: "WAF",
		uiDefinitions: {
			displayName: "Web Application Firewall",
			displayNamePlural: "Web Application Firewalls",
		},
	},
	{
		domain: "EXT",
		id: "EXT-WAN_OPTIMIZER",
		type: "WAN_OPTIMIZER",
		uiDefinitions: {
			displayName: "WAN Optimizer",
			displayNamePlural: "WAN Optimizers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-WEB_GATEWAY",
		type: "WEB_GATEWAY",
		uiDefinitions: {
			displayName: "Web gateway",
			displayNamePlural: "Web gateways",
		},
	},
	{
		domain: "EXT",
		id: "EXT-WIRELESS_CONTROLLER",
		type: "WIRELESS_CONTROLLER",
		uiDefinitions: {
			displayName: "Wireless Controller",
			displayNamePlural: "Wireless Controllers",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ZERTO",
		type: "ZERTO",
		uiDefinitions: {
			displayName: "Zerto",
			displayNamePlural: "Zertoes",
		},
	},
	{
		domain: "EXT",
		id: "EXT-ZFS",
		type: "ZFS",
		uiDefinitions: {
			displayName: "Zfs",
			displayNamePlural: "Zfses",
		},
	},
	{
		domain: "EXTERNAL",
		id: "EXTERNAL-SERVICE",
		type: "SERVICE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-APACHESERVER",
		type: "APACHESERVER",
		uiDefinitions: {
			displayName: "Apache server",
			displayNamePlural: "Apache servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSALB",
		type: "AWSALB",
		uiDefinitions: {
			displayName: "ELB application load balancer",
			displayNamePlural: "ELB application load balancers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSALBLISTENER",
		type: "AWSALBLISTENER",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSALBLISTENERRULE",
		type: "AWSALBLISTENERRULE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSALBTARGETGROUP",
		type: "AWSALBTARGETGROUP",
		uiDefinitions: {
			displayName: "ELB application target group",
			displayNamePlural: "ELB application target groups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSAPIGATEWAYAPI",
		type: "AWSAPIGATEWAYAPI",
		uiDefinitions: {
			displayName: "API Gateway API",
			displayNamePlural: "API Gateway APIs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSAPIGATEWAYRESOURCEWITHMETRICS",
		type: "AWSAPIGATEWAYRESOURCEWITHMETRICS",
		uiDefinitions: {
			displayName: "API Gateway resource",
			displayNamePlural: "API Gateway resources",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSAPIGATEWAYSTAGE",
		type: "AWSAPIGATEWAYSTAGE",
		uiDefinitions: {
			displayName: "API Gateway stage",
			displayNamePlural: "API Gateway stages",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSAPPSTREAM",
		type: "AWSAPPSTREAM",
		uiDefinitions: {
			displayName: "AppStream",
			displayNamePlural: "AppStream",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSAPPSYNCAPI",
		type: "AWSAPPSYNCAPI",
		uiDefinitions: {
			displayName: "AppSync api",
			displayNamePlural: "AppSync apis",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSATHENAWORKGROUP",
		type: "AWSATHENAWORKGROUP",
		uiDefinitions: {
			displayName: "Athena workgroup",
			displayNamePlural: "Athena workgroups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSAUTOSCALINGGROUP",
		type: "AWSAUTOSCALINGGROUP",
		uiDefinitions: {
			displayName: "AutoScaling group",
			displayNamePlural: "AutoScaling groups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSBACKUP",
		type: "AWSBACKUP",
		uiDefinitions: {
			displayName: "Backup",
			displayNamePlural: "Backups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSBILLINGACCOUNTCOST",
		type: "AWSBILLINGACCOUNTCOST",
		uiDefinitions: {
			displayName: "Account Cost",
			displayNamePlural: "Account Costs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSBILLINGACCOUNTSERVICECOST",
		type: "AWSBILLINGACCOUNTSERVICECOST",
		uiDefinitions: {
			displayName: "Account Service Cost",
			displayNamePlural: "Account Service Costs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSBILLINGBUDGET",
		type: "AWSBILLINGBUDGET",
		uiDefinitions: {
			displayName: "Budget",
			displayNamePlural: "Budgets",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSBILLINGSERVICECOST",
		type: "AWSBILLINGSERVICECOST",
		uiDefinitions: {
			displayName: "Service Cost",
			displayNamePlural: "Service Costs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCERTIFICATEMANAGER",
		type: "AWSCERTIFICATEMANAGER",
		uiDefinitions: {
			displayName: "Certificate Manager",
			displayNamePlural: "Certificate Managers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCHATBOT",
		type: "AWSCHATBOT",
		uiDefinitions: {
			displayName: "Chatbot",
			displayNamePlural: "Chatbot",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCLOUDFRONTDISTRIBUTION",
		type: "AWSCLOUDFRONTDISTRIBUTION",
		uiDefinitions: {
			displayName: "CloudFront distribution",
			displayNamePlural: "CloudFront distributions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCLOUDSEARCH",
		type: "AWSCLOUDSEARCH",
		uiDefinitions: {
			displayName: "CloudSearch",
			displayNamePlural: "CloudSearch",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCLOUDWATCHMETRICSTREAM",
		type: "AWSCLOUDWATCHMETRICSTREAM",
		uiDefinitions: {
			displayName: "CloudWatch Metric Stream",
			displayNamePlural: "CloudWatch Metric Streams",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCODEBUILD",
		type: "AWSCODEBUILD",
		uiDefinitions: {
			displayName: "CodeBuild",
			displayNamePlural: "CodeBuild",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCOGNITOUSERPOOL",
		type: "AWSCOGNITOUSERPOOL",
		uiDefinitions: {
			displayName: "Cognito user pool",
			displayNamePlural: "Cognito user pools",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCONNECTCONTACTFLOW",
		type: "AWSCONNECTCONTACTFLOW",
		uiDefinitions: {
			displayName: "Connect contact flow",
			displayNamePlural: "Connect contact flows",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCONNECTINSTANCE",
		type: "AWSCONNECTINSTANCE",
		uiDefinitions: {
			displayName: "Connect instance",
			displayNamePlural: "Connect instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSCONNECTQUEUE",
		type: "AWSCONNECTQUEUE",
		uiDefinitions: {
			displayName: "Connect queue",
			displayNamePlural: "Connect queues",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDATASYNC",
		type: "AWSDATASYNC",
		uiDefinitions: {
			displayName: "DataSync",
			displayNamePlural: "DataSync",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDIRECTCONNECTCONNECTION",
		type: "AWSDIRECTCONNECTCONNECTION",
		uiDefinitions: {
			displayName: "Direct Connect connection",
			displayNamePlural: "Direct Connect connections",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDMSHOST",
		type: "AWSDMSHOST",
		uiDefinitions: {
			displayName: "Database Migration Service Host",
			displayNamePlural: "Database Migration Service Host",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDMSREPLICATIONTASK",
		type: "AWSDMSREPLICATIONTASK",
		uiDefinitions: {
			displayName: "Database Migration Service Replication Task",
			displayNamePlural: "Database Migration Service Replication Task",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDOCDBCLUSTER",
		type: "AWSDOCDBCLUSTER",
		uiDefinitions: {
			displayName: "DocumentDB cluster",
			displayNamePlural: "DocumentDB clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDOCDBCLUSTERBYROLE",
		type: "AWSDOCDBCLUSTERBYROLE",
		uiDefinitions: {
			displayName: "DocumentDB cluster by role",
			displayNamePlural: "DocumentDB cluster by roles",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDOCDBINSTANCE",
		type: "AWSDOCDBINSTANCE",
		uiDefinitions: {
			displayName: "DocumentDB instance",
			displayNamePlural: "DocumentDB instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDYNAMODBGLOBALSECONDARYINDEX",
		type: "AWSDYNAMODBGLOBALSECONDARYINDEX",
		uiDefinitions: {
			displayName: "DynamoDB global secondary index",
			displayNamePlural: "DynamoDB global secondary indexes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDYNAMODBREGION",
		type: "AWSDYNAMODBREGION",
		uiDefinitions: {
			displayName: "DynamoDB region",
			displayNamePlural: "DynamoDB regions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSDYNAMODBTABLE",
		type: "AWSDYNAMODBTABLE",
		uiDefinitions: {
			displayName: "DynamoDB table",
			displayNamePlural: "DynamoDB tables",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSEBSVOLUME",
		type: "AWSEBSVOLUME",
		uiDefinitions: {
			displayName: "EBS volume",
			displayNamePlural: "EBS volumes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSECRREPOSITORY",
		type: "AWSECRREPOSITORY",
		uiDefinitions: {
			displayName: "Repository",
			displayNamePlural: "Repositories",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSECSCLUSTER",
		type: "AWSECSCLUSTER",
		uiDefinitions: {
			displayName: "ECS cluster",
			displayNamePlural: "ECS clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSECSCONTAINERINSTANCE",
		type: "AWSECSCONTAINERINSTANCE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSECSSERVICE",
		type: "AWSECSSERVICE",
		uiDefinitions: {
			displayName: "ECS service",
			displayNamePlural: "ECS services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSEFSFILESYSTEM",
		type: "AWSEFSFILESYSTEM",
		uiDefinitions: {
			displayName: "EFS filesystem",
			displayNamePlural: "EFS filesystems",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICACHEMEMCACHEDCLUSTER",
		type: "AWSELASTICACHEMEMCACHEDCLUSTER",
		uiDefinitions: {
			displayName: "ElastiCache Memcached cluster",
			displayNamePlural: "ElastiCache Memcached clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICACHEMEMCACHEDNODE",
		type: "AWSELASTICACHEMEMCACHEDNODE",
		uiDefinitions: {
			displayName: "ElastiCache Memcached node",
			displayNamePlural: "ElastiCache Memcached nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICACHEREDISCLUSTER",
		type: "AWSELASTICACHEREDISCLUSTER",
		uiDefinitions: {
			displayName: "ElastiCache Redis cluster",
			displayNamePlural: "ElastiCache Redis clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICACHEREDISNODE",
		type: "AWSELASTICACHEREDISNODE",
		uiDefinitions: {
			displayName: "ElastiCache Redis node",
			displayNamePlural: "ElastiCache Redis nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICACHEREDISREPLICATIONGROUP",
		type: "AWSELASTICACHEREDISREPLICATIONGROUP",
		uiDefinitions: {
			displayName: "ElastiCache Redis Replication Group",
			displayNamePlural: "ElastiCache Redis Replication Groups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICACHEREDISSHARD",
		type: "AWSELASTICACHEREDISSHARD",
		uiDefinitions: {
			displayName: "ElastiCache Redis Shard",
			displayNamePlural: "ElastiCache Redis Shards",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICBEANSTALKENVIRONMENT",
		type: "AWSELASTICBEANSTALKENVIRONMENT",
		uiDefinitions: {
			displayName: "Elastic Beanstalk environment",
			displayNamePlural: "Elastic Beanstalk environments",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICBEANSTALKINSTANCE",
		type: "AWSELASTICBEANSTALKINSTANCE",
		uiDefinitions: {
			displayName: "Elastic Beanstalk instance",
			displayNamePlural: "Elastic Beanstalk instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICMAPREDUCECLUSTER",
		type: "AWSELASTICMAPREDUCECLUSTER",
		uiDefinitions: {
			displayName: "EMR cluster",
			displayNamePlural: "EMR clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICSEARCHCLUSTER",
		type: "AWSELASTICSEARCHCLUSTER",
		uiDefinitions: {
			displayName: "Elasticsearch cluster",
			displayNamePlural: "Elasticsearch clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICSEARCHNODE",
		type: "AWSELASTICSEARCHNODE",
		uiDefinitions: {
			displayName: "Elasticsearch node",
			displayNamePlural: "Elasticsearch nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELASTICTRANSCODER",
		type: "AWSELASTICTRANSCODER",
		uiDefinitions: {
			displayName: "ElasticTranscoder",
			displayNamePlural: "ElasticTranscoder",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSELB",
		type: "AWSELB",
		uiDefinitions: {
			displayName: "ELB classic load balancer",
			displayNamePlural: "ELB classic load balancers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSEVENTSRULE",
		type: "AWSEVENTSRULE",
		uiDefinitions: {
			displayName: "Events Rule",
			displayNamePlural: "Events Rules",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSEVENTSRULEALL",
		type: "AWSEVENTSRULEALL",
		uiDefinitions: {
			displayName: "All Events",
			displayNamePlural: "All Eventses",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSFSXFORLUSTRE",
		type: "AWSFSXFORLUSTRE",
		uiDefinitions: {
			displayName: "FSxForLustre",
			displayNamePlural: "FSxForLustre",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSFSXVOLUME",
		type: "AWSFSXVOLUME",
		uiDefinitions: {
			displayName: "FSx Volume",
			displayNamePlural: "FSx Volumes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSFSXWINDOWSFILESERVER",
		type: "AWSFSXWINDOWSFILESERVER",
		uiDefinitions: {
			displayName: "FSx windows file server",
			displayNamePlural: "FSx windows file servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSGAMELIFT",
		type: "AWSGAMELIFT",
		uiDefinitions: {
			displayName: "GameLift",
			displayNamePlural: "GameLift",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSGLUEJOB",
		type: "AWSGLUEJOB",
		uiDefinitions: {
			displayName: "Glue job",
			displayNamePlural: "Glue jobs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSGWLB",
		type: "AWSGWLB",
		uiDefinitions: {
			displayName: "Load Balancer",
			displayNamePlural: "Load Balancers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSGWLBTARGETGROUP",
		type: "AWSGWLBTARGETGROUP",
		uiDefinitions: {
			displayName: "Target Group",
			displayNamePlural: "Target Groups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSHEALTHUNKNOWN",
		type: "AWSHEALTHUNKNOWN",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSINSPECTOR",
		type: "AWSINSPECTOR",
		uiDefinitions: {
			displayName: "Inspector",
			displayNamePlural: "Inspector",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSIOTBROKER",
		type: "AWSIOTBROKER",
		uiDefinitions: {
			displayName: "IOT broker",
			displayNamePlural: "IOT brokers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSIOTRULE",
		type: "AWSIOTRULE",
		uiDefinitions: {
			displayName: "IOT rule",
			displayNamePlural: "IOT rules",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSIOTRULEACTION",
		type: "AWSIOTRULEACTION",
		uiDefinitions: {
			displayName: "IOT rule action",
			displayNamePlural: "IOT rule actions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSIOTTWINMAKER",
		type: "AWSIOTTWINMAKER",
		uiDefinitions: {
			displayName: "IOTTWINMAKER",
			displayNamePlural: "IOTTWINMAKER",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSIPAM",
		type: "AWSIPAM",
		uiDefinitions: {
			displayName: "Address Manager",
			displayNamePlural: "Address Managers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSIPAMPOOL",
		type: "AWSIPAMPOOL",
		uiDefinitions: {
			displayName: "Pool",
			displayNamePlural: "Pools",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSIPAMSCOPE",
		type: "AWSIPAMSCOPE",
		uiDefinitions: {
			displayName: "Scope",
			displayNamePlural: "Scopes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSKEYSPACES",
		type: "AWSKEYSPACES",
		uiDefinitions: {
			displayName: "Keyspaces",
			displayNamePlural: "Keyspaces",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSKINESISANALYTICSAPPLICATION",
		type: "AWSKINESISANALYTICSAPPLICATION",
		uiDefinitions: {
			displayName: "Kinesis Data Analytics application",
			displayNamePlural: "Kinesis Data Analytics applications",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSKINESISANALYTICSTASK",
		type: "AWSKINESISANALYTICSTASK",
		uiDefinitions: {
			displayName: "Kinesis Data Analytics task",
			displayNamePlural: "Kinesis Data Analytics tasks",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSKINESISDELIVERYSTREAM",
		type: "AWSKINESISDELIVERYSTREAM",
		uiDefinitions: {
			displayName: "Kinesis delivery stream",
			displayNamePlural: "Kinesis delivery streams",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSKINESISSTREAM",
		type: "AWSKINESISSTREAM",
		uiDefinitions: {
			displayName: "Kinesis stream",
			displayNamePlural: "Kinesis streams",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSKINESISSTREAMSHARD",
		type: "AWSKINESISSTREAMSHARD",
		uiDefinitions: {
			displayName: "Kinesis shard",
			displayNamePlural: "Kinesis shards",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSKMSKEY",
		type: "AWSKMSKEY",
		uiDefinitions: {
			displayName: "Key",
			displayNamePlural: "Keys",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSLAMBDAFUNCTION",
		type: "AWSLAMBDAFUNCTION",
		uiDefinitions: {
			displayName: "Lambda function",
			displayNamePlural: "Lambda functions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSLAMBDAFUNCTIONALIAS",
		type: "AWSLAMBDAFUNCTIONALIAS",
		uiDefinitions: {
			displayName: "Lambda Function Alias",
			displayNamePlural: "Lambda Function Aliases",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSLAMBDAREGION",
		type: "AWSLAMBDAREGION",
		uiDefinitions: {
			displayName: "Lambda Region",
			displayNamePlural: "Lambda Regions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSLEX",
		type: "AWSLEX",
		uiDefinitions: {
			displayName: "Lex",
			displayNamePlural: "Lex",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSLOGS",
		type: "AWSLOGS",
		uiDefinitions: {
			displayName: "Logs",
			displayNamePlural: "Logs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMEDIACONVERTOPERATION",
		type: "AWSMEDIACONVERTOPERATION",
		uiDefinitions: {
			displayName: "Elemental MediaConvert operation",
			displayNamePlural: "Elemental MediaConvert operations",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMEDIACONVERTQUEUE",
		type: "AWSMEDIACONVERTQUEUE",
		uiDefinitions: {
			displayName: "Elemental MediaConvert queue",
			displayNamePlural: "Elemental MediaConvert queues",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMEDIAPACKAGEVODPACKAGINGCONFIGURATION",
		type: "AWSMEDIAPACKAGEVODPACKAGINGCONFIGURATION",
		uiDefinitions: {
			displayName: "MediaPackage VOD packaging configuration",
			displayNamePlural: "MediaPackage VOD packaging configurations",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMEDIATAILOR",
		type: "AWSMEDIATAILOR",
		uiDefinitions: {
			displayName: "Elemental MediaTailor",
			displayNamePlural: "Elemental MediaTailor",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMEMORYDBCLUSTER",
		type: "AWSMEMORYDBCLUSTER",
		uiDefinitions: {
			displayName: "Cluster",
			displayNamePlural: "Clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMQBROKER",
		type: "AWSMQBROKER",
		uiDefinitions: {
			displayName: "MQ broker",
			displayNamePlural: "MQ brokers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMQQUEUE",
		type: "AWSMQQUEUE",
		uiDefinitions: {
			displayName: "MQ queue",
			displayNamePlural: "MQ queues",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMQTOPIC",
		type: "AWSMQTOPIC",
		uiDefinitions: {
			displayName: "MQ topic",
			displayNamePlural: "MQ topics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMSKBROKER",
		type: "AWSMSKBROKER",
		uiDefinitions: {
			displayName: "Managed Kafka broker",
			displayNamePlural: "Managed Kafka brokers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMSKCLUSTER",
		type: "AWSMSKCLUSTER",
		uiDefinitions: {
			displayName: "Managed Kafka cluster",
			displayNamePlural: "Managed Kafka clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSMSKTOPIC",
		type: "AWSMSKTOPIC",
		uiDefinitions: {
			displayName: "Managed Kafka topic",
			displayNamePlural: "Managed Kafka topics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNATGATEWAY",
		type: "AWSNATGATEWAY",
		uiDefinitions: {
			displayName: "VPC NAT Gateway",
			displayNamePlural: "VPC NAT Gateways",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNEPTUNECLUSTER",
		type: "AWSNEPTUNECLUSTER",
		uiDefinitions: {
			displayName: "Neptune cluster",
			displayNamePlural: "Neptune clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNEPTUNECLUSTERBYROLE",
		type: "AWSNEPTUNECLUSTERBYROLE",
		uiDefinitions: {
			displayName: "Neptune cluster by role",
			displayNamePlural: "Neptune cluster by roles",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNEPTUNEDATABASECLASS",
		type: "AWSNEPTUNEDATABASECLASS",
		uiDefinitions: {
			displayName: "Neptune database class",
			displayNamePlural: "Neptune database classes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNEPTUNEINSTANCE",
		type: "AWSNEPTUNEINSTANCE",
		uiDefinitions: {
			displayName: "Neptune instance",
			displayNamePlural: "Neptune instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNETWORKFIREWALL",
		type: "AWSNETWORKFIREWALL",
		uiDefinitions: {
			displayName: "Firewall",
			displayNamePlural: "Firewalls",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNLB",
		type: "AWSNLB",
		uiDefinitions: {
			displayName: "ELB network load balancer",
			displayNamePlural: "ELB network load balancers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNLBLISTENER",
		type: "AWSNLBLISTENER",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNLBLISTENERRULE",
		type: "AWSNLBLISTENERRULE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSNLBTARGETGROUP",
		type: "AWSNLBTARGETGROUP",
		uiDefinitions: {
			displayName: "ELB network target group",
			displayNamePlural: "ELB network target groups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSOUTPOST",
		type: "AWSOUTPOST",
		uiDefinitions: {
			displayName: "Outpost",
			displayNamePlural: "Outposts",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSPOLLYLEXICON",
		type: "AWSPOLLYLEXICON",
		uiDefinitions: {
			displayName: "Polly (Lexicon)",
			displayNamePlural: "Polly (Lexicon)",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSPOLLYOPERATION",
		type: "AWSPOLLYOPERATION",
		uiDefinitions: {
			displayName: "Polly (Operation)",
			displayNamePlural: "Polly (Operation)",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSPRIVATELINKENDPOINT",
		type: "AWSPRIVATELINKENDPOINT",
		uiDefinitions: {
			displayName: "Private Link Endpoint",
			displayNamePlural: "Private Link Endpoints",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSPRIVATELINKSERVICE",
		type: "AWSPRIVATELINKSERVICE",
		uiDefinitions: {
			displayName: "Service",
			displayNamePlural: "Services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSPROMETHEUSRULEGROUP",
		type: "AWSPROMETHEUSRULEGROUP",
		uiDefinitions: {
			displayName: "Rule Group",
			displayNamePlural: "Rule Groups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSPROMETHEUSWORKSPACE",
		type: "AWSPROMETHEUSWORKSPACE",
		uiDefinitions: {
			displayName: "Workspace",
			displayNamePlural: "Workspaces",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSQLDBLEDGER",
		type: "AWSQLDBLEDGER",
		uiDefinitions: {
			displayName: "QLDB ledger",
			displayNamePlural: "QLDB ledgers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSRDSDBCLUSTER",
		type: "AWSRDSDBCLUSTER",
		uiDefinitions: {
			displayName: "RDS cluster",
			displayNamePlural: "RDS clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSRDSDBINSTANCE",
		type: "AWSRDSDBINSTANCE",
		uiDefinitions: {
			displayName: "RDS instance",
			displayNamePlural: "RDS instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSRDSPROXY",
		type: "AWSRDSPROXY",
		uiDefinitions: {
			displayName: "RDS Proxy",
			displayNamePlural: "RDS Proxies",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSREDSHIFTCLUSTER",
		type: "AWSREDSHIFTCLUSTER",
		uiDefinitions: {
			displayName: "Redshift cluster",
			displayNamePlural: "Redshift clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSREDSHIFTNODE",
		type: "AWSREDSHIFTNODE",
		uiDefinitions: {
			displayName: "Redshift node",
			displayNamePlural: "Redshift nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSREKOGNITION",
		type: "AWSREKOGNITION",
		uiDefinitions: {
			displayName: "Rekognition",
			displayNamePlural: "Rekognition",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSREKOGNITIONOPERATION",
		type: "AWSREKOGNITIONOPERATION",
		uiDefinitions: {
			displayName: "Rekognition Operation",
			displayNamePlural: "Rekognition Operations",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSROUTE53HEALTHCHECK",
		type: "AWSROUTE53HEALTHCHECK",
		uiDefinitions: {
			displayName: "Route 53 health check",
			displayNamePlural: "Route 53 health checks",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSROUTE53RESOLVERENDPOINT",
		type: "AWSROUTE53RESOLVERENDPOINT",
		uiDefinitions: {
			displayName: "Route53 Resolver endpoint",
			displayNamePlural: "Route53 Resolver endpoints",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSS3BUCKET",
		type: "AWSS3BUCKET",
		uiDefinitions: {
			displayName: "S3 bucket",
			displayNamePlural: "S3 buckets",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSAGEMAKER",
		type: "AWSSAGEMAKER",
		uiDefinitions: {
			displayName: "SageMaker",
			displayNamePlural: "SageMaker",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSECRETSMANAGER",
		type: "AWSSECRETSMANAGER",
		uiDefinitions: {
			displayName: "Manager",
			displayNamePlural: "Managers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSESREGION",
		type: "AWSSESREGION",
		uiDefinitions: {
			displayName: "SES region",
			displayNamePlural: "SES regions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSIMPLEWORKFLOW",
		type: "AWSSIMPLEWORKFLOW",
		uiDefinitions: {
			displayName: "SimpleWorkFlow",
			displayNamePlural: "SimpleWorkFlow",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSNSTOPIC",
		type: "AWSSNSTOPIC",
		uiDefinitions: {
			displayName: "SNS topic",
			displayNamePlural: "SNS topics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSQSQUEUE",
		type: "AWSSQSQUEUE",
		uiDefinitions: {
			displayName: "SQS queue",
			displayNamePlural: "SQS queues",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSTATESACTIVITY",
		type: "AWSSTATESACTIVITY",
		uiDefinitions: {
			displayName: "Step Functions activity",
			displayNamePlural: "Step Functions activities",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSTATESAPIUSAGE",
		type: "AWSSTATESAPIUSAGE",
		uiDefinitions: {
			displayName: "Step Functions apiusage",
			displayNamePlural: "Step Functions apiusages",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSTATESLAMBDAFUNCTION",
		type: "AWSSTATESLAMBDAFUNCTION",
		uiDefinitions: {
			displayName: "Step Functions lambdafunction",
			displayNamePlural: "Step Functions lambdafunctions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSTATESSERVICE",
		type: "AWSSTATESSERVICE",
		uiDefinitions: {
			displayName: "Step Functions service",
			displayNamePlural: "Step Functions services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSTATESSERVICEINTEGRATION",
		type: "AWSSTATESSERVICEINTEGRATION",
		uiDefinitions: {
			displayName: "Step Functions serviceintegration",
			displayNamePlural: "Step Functions serviceintegrations",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSTATESSTATEMACHINE",
		type: "AWSSTATESSTATEMACHINE",
		uiDefinitions: {
			displayName: "Step Functions statemachine",
			displayNamePlural: "Step Functions statemachines",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSSTORAGEGATEWAY",
		type: "AWSSTORAGEGATEWAY",
		uiDefinitions: {
			displayName: "Storage Gateway",
			displayNamePlural: "Storage Gateway",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTEXTRACT",
		type: "AWSTEXTRACT",
		uiDefinitions: {
			displayName: "Textract",
			displayNamePlural: "Textract",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTIMESTREAMDATABASE",
		type: "AWSTIMESTREAMDATABASE",
		uiDefinitions: {
			displayName: "Timestream Database",
			displayNamePlural: "Timestream Database",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTIMESTREAMTABLE",
		type: "AWSTIMESTREAMTABLE",
		uiDefinitions: {
			displayName: "Timestream Table",
			displayNamePlural: "Timestream Table",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTRANSCRIBE",
		type: "AWSTRANSCRIBE",
		uiDefinitions: {
			displayName: "Transcribe",
			displayNamePlural: "Transcribe",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTRANSFERFAMILY",
		type: "AWSTRANSFERFAMILY",
		uiDefinitions: {
			displayName: "TransferFamily",
			displayNamePlural: "TransferFamily",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTRANSITGATEWAYTRANSITGATEWAY",
		type: "AWSTRANSITGATEWAYTRANSITGATEWAY",
		uiDefinitions: {
			displayName: "Transit Gateway transit gateway",
			displayNamePlural: "Transit Gateway transit gateways",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTRANSLATE",
		type: "AWSTRANSLATE",
		uiDefinitions: {
			displayName: "Translate",
			displayNamePlural: "Translate",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTRUSTEDADVISORCATEGORY",
		type: "AWSTRUSTEDADVISORCATEGORY",
		uiDefinitions: {
			displayName: "Category",
			displayNamePlural: "Categories",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTRUSTEDADVISORCHECK",
		type: "AWSTRUSTEDADVISORCHECK",
		uiDefinitions: {
			displayName: "Check",
			displayNamePlural: "Checks",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSTRUSTEDADVISORSERVICELIMIT",
		type: "AWSTRUSTEDADVISORSERVICELIMIT",
		uiDefinitions: {
			displayName: "Service Limit",
			displayNamePlural: "Service Limits",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSUSAGE",
		type: "AWSUSAGE",
		uiDefinitions: {
			displayName: "Usage",
			displayNamePlural: "Usages",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSVPCLATTICESERVICE",
		type: "AWSVPCLATTICESERVICE",
		uiDefinitions: {
			displayName: "Awsvpclatticeservice",
			displayNamePlural: "Awsvpclatticeservices",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSVPCNETWORKINTERFACE",
		type: "AWSVPCNETWORKINTERFACE",
		uiDefinitions: {
			displayName: "VPC Network Interface",
			displayNamePlural: "VPC Network Interfaces",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSVPCVPNTUNNEL",
		type: "AWSVPCVPNTUNNEL",
		uiDefinitions: {
			displayName: "VPC VPN tunnel",
			displayNamePlural: "VPC VPN tunnels",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSVPN",
		type: "AWSVPN",
		uiDefinitions: {
			displayName: "Awsvpn",
			displayNamePlural: "Awsvpns",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSVPNCONNECTION",
		type: "AWSVPNCONNECTION",
		uiDefinitions: {
			displayName: "VPN Connection",
			displayNamePlural: "VPN Connections",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSWAFV2RULEGROUP",
		type: "AWSWAFV2RULEGROUP",
		uiDefinitions: {
			displayName: "WAFV2 rule group",
			displayNamePlural: "WAFV2 rule groups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSWAFV2WEBACL",
		type: "AWSWAFV2WEBACL",
		uiDefinitions: {
			displayName: "WAFV2 web acl",
			displayNamePlural: "WAFV2 web acls",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSWAFWEBACL",
		type: "AWSWAFWEBACL",
		uiDefinitions: {
			displayName: "WAF web ACL",
			displayNamePlural: "WAF web ACLs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSWORKMAIL",
		type: "AWSWORKMAIL",
		uiDefinitions: {
			displayName: "Workmail",
			displayNamePlural: "Workmail",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSWORKSPACES",
		type: "AWSWORKSPACES",
		uiDefinitions: {
			displayName: "WorkSpaces",
			displayNamePlural: "WorkSpaces",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AWSWORKSPACESWEB",
		type: "AWSWORKSPACESWEB",
		uiDefinitions: {
			displayName: "WorkSpacesWeb",
			displayNamePlural: "WorkSpacesWeb",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREAPIMANAGEMENTSERVICE",
		type: "AZUREAPIMANAGEMENTSERVICE",
		uiDefinitions: {
			displayName: "API Management service",
			displayNamePlural: "API Management services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREAPPCONFIGURATION",
		type: "AZUREAPPCONFIGURATION",
		uiDefinitions: {
			displayName: "App Configuration",
			displayNamePlural: "App Configurations",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREAPPLICATIONGATEWAY",
		type: "AZUREAPPLICATIONGATEWAY",
		uiDefinitions: {
			displayName: "App Gateway application gateway",
			displayNamePlural: "App Gateway application gateways",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREAPPLICATIONINSIGHT",
		type: "AZUREAPPLICATIONINSIGHT",
		uiDefinitions: {
			displayName: "Application Insight",
			displayNamePlural: "Application Insights",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREAPPSERVICEENVIRONMENT",
		type: "AZUREAPPSERVICEENVIRONMENT",
		uiDefinitions: {
			displayName: "App Service Environment",
			displayNamePlural: "App Service Environments",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREAPPSERVICEHOSTNAME",
		type: "AZUREAPPSERVICEHOSTNAME",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREAPPSERVICEPLAN",
		type: "AZUREAPPSERVICEPLAN",
		uiDefinitions: {
			displayName: "App Service Plan",
			displayNamePlural: "App Service Plans",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREAPPSERVICEWEBAPP",
		type: "AZUREAPPSERVICEWEBAPP",
		uiDefinitions: {
			displayName: "App Service web app",
			displayNamePlural: "App Service web apps",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREAUTOMATIONACCOUNT",
		type: "AZUREAUTOMATIONACCOUNT",
		uiDefinitions: {
			displayName: "Automation Account",
			displayNamePlural: "Automation Accounts",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREBATCHACCOUNT",
		type: "AZUREBATCHACCOUNT",
		uiDefinitions: {
			displayName: "Batch Account",
			displayNamePlural: "Batch Accounts",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREBINGSEARCH",
		type: "AZUREBINGSEARCH",
		uiDefinitions: {
			displayName: "Bing Search",
			displayNamePlural: "Bing Search",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECDNPROFILE",
		type: "AZURECDNPROFILE",
		uiDefinitions: {
			displayName: "CDN profile",
			displayNamePlural: "CDN profiles",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECLOUDSERVICE",
		type: "AZURECLOUDSERVICE",
		uiDefinitions: {
			displayName: "Cloud Service",
			displayNamePlural: "Cloud Services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECOGNITIVESEARCH",
		type: "AZURECOGNITIVESEARCH",
		uiDefinitions: {
			displayName: "Cognitive Search",
			displayNamePlural: "Cognitive Searches",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECOGNITIVESERVICE",
		type: "AZURECOGNITIVESERVICE",
		uiDefinitions: {
			displayName: "Cognitive Service",
			displayNamePlural: "Cognitive Services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECONTAINERSINSTANCEGROUP",
		type: "AZURECONTAINERSINSTANCEGROUP",
		uiDefinitions: {
			displayName: "Containers instance group",
			displayNamePlural: "Containers instance groups",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECONTAINERSMANAGEDCLUSTER",
		type: "AZURECONTAINERSMANAGEDCLUSTER",
		uiDefinitions: {
			displayName: "Containers managed cluster",
			displayNamePlural: "Containers managed clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECONTAINERSREGISTRY",
		type: "AZURECONTAINERSREGISTRY",
		uiDefinitions: {
			displayName: "Containers registry",
			displayNamePlural: "Containers registries",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECOSMOSDBACCOUNT",
		type: "AZURECOSMOSDBACCOUNT",
		uiDefinitions: {
			displayName: "Cosmos DB account",
			displayNamePlural: "Cosmos DB accounts",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECOSMOSDBCOLLECTION",
		type: "AZURECOSMOSDBCOLLECTION",
		uiDefinitions: {
			displayName: "Cosmos DB collection",
			displayNamePlural: "Cosmos DB collections",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURECOSMOSDBDATABASE",
		type: "AZURECOSMOSDBDATABASE",
		uiDefinitions: {
			displayName: "Cosmos DB database",
			displayNamePlural: "Cosmos DB databases",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDATABOXEDGE",
		type: "AZUREDATABOXEDGE",
		uiDefinitions: {
			displayName: "Data Box Edge",
			displayNamePlural: "Data Box Edges",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDATAEXPLORER",
		type: "AZUREDATAEXPLORER",
		uiDefinitions: {
			displayName: "Data Explorer",
			displayNamePlural: "Data Explorers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDATAFACTORYDATAFACTORY",
		type: "AZUREDATAFACTORYDATAFACTORY",
		uiDefinitions: {
			displayName: "Data Factory data factory",
			displayNamePlural: "Data Factory data factories",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDATAFACTORYFACTORY",
		type: "AZUREDATAFACTORYFACTORY",
		uiDefinitions: {
			displayName: "Data Factory factory",
			displayNamePlural: "Data Factory factories",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDATALAKEANALYTIC",
		type: "AZUREDATALAKEANALYTIC",
		uiDefinitions: {
			displayName: "Data Lake Analytic",
			displayNamePlural: "Data Lake Analytics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDATALAKESTORAGE",
		type: "AZUREDATALAKESTORAGE",
		uiDefinitions: {
			displayName: "Data Lake Storage",
			displayNamePlural: "Data Lake Storages",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDATASHARE",
		type: "AZUREDATASHARE",
		uiDefinitions: {
			displayName: "Data Share",
			displayNamePlural: "Data Shares",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDEVICEPROVISIONINGSERVICE",
		type: "AZUREDEVICEPROVISIONINGSERVICE",
		uiDefinitions: {
			displayName: "Device Provisioning Service",
			displayNamePlural: "Device Provisioning Services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDISKSTORAGE",
		type: "AZUREDISKSTORAGE",
		uiDefinitions: {
			displayName: "Disk Storage",
			displayNamePlural: "Disk Storages",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREDNSZONE",
		type: "AZUREDNSZONE",
		uiDefinitions: {
			displayName: "DNS Zone",
			displayNamePlural: "DNS Zones",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEVENTGRIDDOMAIN",
		type: "AZUREEVENTGRIDDOMAIN",
		uiDefinitions: {
			displayName: "Event Grid Domain",
			displayNamePlural: "Event Grid Domains",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEVENTGRIDPARTNERNAMESPACE",
		type: "AZUREEVENTGRIDPARTNERNAMESPACE",
		uiDefinitions: {
			displayName: "Event Grid Partner Namespace",
			displayNamePlural: "Event Grid Partner Namespaces",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEVENTGRIDPARTNERTOPIC",
		type: "AZUREEVENTGRIDPARTNERTOPIC",
		uiDefinitions: {
			displayName: "Event Grid Partner Topic",
			displayNamePlural: "Event Grid Partner Topics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEVENTGRIDSUBSCRIPTION",
		type: "AZUREEVENTGRIDSUBSCRIPTION",
		uiDefinitions: {
			displayName: "Event Grid Subscription",
			displayNamePlural: "Event Grid Subscriptions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEVENTGRIDSYSTEMTOPIC",
		type: "AZUREEVENTGRIDSYSTEMTOPIC",
		uiDefinitions: {
			displayName: "Event Grid System Topic",
			displayNamePlural: "Event Grid System Topics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEVENTGRIDTOPIC",
		type: "AZUREEVENTGRIDTOPIC",
		uiDefinitions: {
			displayName: "Event Grid Topic",
			displayNamePlural: "Event Grid Topics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEVENTHUBCLUSTER",
		type: "AZUREEVENTHUBCLUSTER",
		uiDefinitions: {
			displayName: "Event Hub cluster",
			displayNamePlural: "Event Hub clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEVENTHUBNAMESPACE",
		type: "AZUREEVENTHUBNAMESPACE",
		uiDefinitions: {
			displayName: "Event Hub namespace",
			displayNamePlural: "Event Hub namespaces",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEXPRESSROUTECIRCUIT",
		type: "AZUREEXPRESSROUTECIRCUIT",
		uiDefinitions: {
			displayName: "Express Route circuit",
			displayNamePlural: "Express Route circuits",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEXPRESSROUTECONNECTION",
		type: "AZUREEXPRESSROUTECONNECTION",
		uiDefinitions: {
			displayName: "Express Route connection",
			displayNamePlural: "Express Route connections",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREEXPRESSROUTEGATEWAY",
		type: "AZUREEXPRESSROUTEGATEWAY",
		uiDefinitions: {
			displayName: "Express Route gateway",
			displayNamePlural: "Express Route gateways",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREFIREWALL",
		type: "AZUREFIREWALL",
		uiDefinitions: {
			displayName: "Firewalls azure firewall entity",
			displayNamePlural: "Firewalls azure firewall entities",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREFRONTDOORFRONTDOOR",
		type: "AZUREFRONTDOORFRONTDOOR",
		uiDefinitions: {
			displayName: "Front Door front door",
			displayNamePlural: "Front Door front doors",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREFUNCTIONSAPP",
		type: "AZUREFUNCTIONSAPP",
		uiDefinitions: {
			displayName: "Azure Function",
			displayNamePlural: "Azure Functions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREFUNCTIONSWORKFLOW",
		type: "AZUREFUNCTIONSWORKFLOW",
		uiDefinitions: {
			displayName: "Functions Workflow",
			displayNamePlural: "Functions Workflows",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREHDINSIGHT",
		type: "AZUREHDINSIGHT",
		uiDefinitions: {
			displayName: "HDInsight",
			displayNamePlural: "HDInsights",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREINTEGRATIONSERVICEENVIRONMENT",
		type: "AZUREINTEGRATIONSERVICEENVIRONMENT",
		uiDefinitions: {
			displayName: "Integration Service Environment",
			displayNamePlural: "Integration Service Environments",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREIOTCENTRALAPPLICATION",
		type: "AZUREIOTCENTRALAPPLICATION",
		uiDefinitions: {
			displayName: "IoT Central Application",
			displayNamePlural: "IoT Central Applications",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREIOTHUB",
		type: "AZUREIOTHUB",
		uiDefinitions: {
			displayName: "IoT Hub",
			displayNamePlural: "IoT Hubs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREKEYVAULTVAULT",
		type: "AZUREKEYVAULTVAULT",
		uiDefinitions: {
			displayName: "Key Vault vault",
			displayNamePlural: "Key Vault vaults",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURELOADBALANCER",
		type: "AZURELOADBALANCER",
		uiDefinitions: {
			displayName: "Load balancer",
			displayNamePlural: "Load balancers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURELOADBALANCERBACKEND",
		type: "AZURELOADBALANCERBACKEND",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURELOADBALANCERFRONTENDIP",
		type: "AZURELOADBALANCERFRONTENDIP",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURELOADBALANCERINBOUNDNATPOOL",
		type: "AZURELOADBALANCERINBOUNDNATPOOL",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURELOADBALANCERINBOUNDNATRULE",
		type: "AZURELOADBALANCERINBOUNDNATRULE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURELOADBALANCERPROBE",
		type: "AZURELOADBALANCERPROBE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURELOADBALANCERRULE",
		type: "AZURELOADBALANCERRULE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURELOGICAPPSINTEGRATIONSERVICEENVIRONMENT",
		type: "AZURELOGICAPPSINTEGRATIONSERVICEENVIRONMENT",
		uiDefinitions: {
			displayName: "Logic Apps integration service environment",
			displayNamePlural: "Logic Apps integration service environments",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURELOGICAPPSWORKFLOW",
		type: "AZURELOGICAPPSWORKFLOW",
		uiDefinitions: {
			displayName: "Logic Apps workflow",
			displayNamePlural: "Logic Apps workflows",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMACHINELEARNINGDEPLOYMENT",
		type: "AZUREMACHINELEARNINGDEPLOYMENT",
		uiDefinitions: {
			displayName: "Machine Learning Deployment",
			displayNamePlural: "Machine Learning Deployments",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMACHINELEARNINGENDPOINTS",
		type: "AZUREMACHINELEARNINGENDPOINTS",
		uiDefinitions: {
			displayName: "Machine Learning Endpoints",
			displayNamePlural: "Machine Learning Endpoints",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMACHINELEARNINGWORKSPACE",
		type: "AZUREMACHINELEARNINGWORKSPACE",
		uiDefinitions: {
			displayName: "Machine Learning workspace",
			displayNamePlural: "Machine Learning workspaces",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMAP",
		type: "AZUREMAP",
		uiDefinitions: {
			displayName: "Map",
			displayNamePlural: "Maps",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMARIADBSERVER",
		type: "AZUREMARIADBSERVER",
		uiDefinitions: {
			displayName: "MariaDB Server",
			displayNamePlural: "MariaDB Servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMEDIASERVICE",
		type: "AZUREMEDIASERVICE",
		uiDefinitions: {
			displayName: "Media Service",
			displayNamePlural: "Media Services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMEDIASERVICESLIVEEVENT",
		type: "AZUREMEDIASERVICESLIVEEVENT",
		uiDefinitions: {
			displayName: "Media Services Live Event",
			displayNamePlural: "Media Services Live Events",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMEDIASERVICESSTREAMINGENDPOINT",
		type: "AZUREMEDIASERVICESSTREAMINGENDPOINT",
		uiDefinitions: {
			displayName: "Media Services Streaming Endpoint",
			displayNamePlural: "Media Services Streaming Endpoints",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMEDIASERVICESVIDEOANALYZER",
		type: "AZUREMEDIASERVICESVIDEOANALYZER",
		uiDefinitions: {
			displayName: "Media Services Video Analyzer",
			displayNamePlural: "Media Services Video Analyzers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMYSQLFLEXIBLESERVER",
		type: "AZUREMYSQLFLEXIBLESERVER",
		uiDefinitions: {
			displayName: "MySQL Flexible Server",
			displayNamePlural: "MySQL Flexible Servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREMYSQLSERVER",
		type: "AZUREMYSQLSERVER",
		uiDefinitions: {
			displayName: "MySQL Server",
			displayNamePlural: "MySQL Servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURENETAPPCAPACITYPOOL",
		type: "AZURENETAPPCAPACITYPOOL",
		uiDefinitions: {
			displayName: "NetApp Capacity Pool",
			displayNamePlural: "NetApp Capacity Pools",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURENETAPPFILE",
		type: "AZURENETAPPFILE",
		uiDefinitions: {
			displayName: "NetApp File",
			displayNamePlural: "NetApp Files",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURENETWORKWATCHER",
		type: "AZURENETWORKWATCHER",
		uiDefinitions: {
			displayName: "Network Watcher",
			displayNamePlural: "Network Watchers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURENOTIFICATIONHUB",
		type: "AZURENOTIFICATIONHUB",
		uiDefinitions: {
			displayName: "Notification Hub",
			displayNamePlural: "Notification Hubs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREPEERING",
		type: "AZUREPEERING",
		uiDefinitions: {
			displayName: "Peering",
			displayNamePlural: "Peerings",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREPEERINGSERVICE",
		type: "AZUREPEERINGSERVICE",
		uiDefinitions: {
			displayName: "Peering Service",
			displayNamePlural: "Peering Services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREPOSTGRESQLFLEXIBLESERVER",
		type: "AZUREPOSTGRESQLFLEXIBLESERVER",
		uiDefinitions: {
			displayName: "PostgreSQL Flexible Server",
			displayNamePlural: "PostgreSQL Flexible Servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREPOSTGRESQLSERVER",
		type: "AZUREPOSTGRESQLSERVER",
		uiDefinitions: {
			displayName: "PostgreSQL Server",
			displayNamePlural: "PostgreSQL Servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREPOWERBIDEDICATEDCAPACITY",
		type: "AZUREPOWERBIDEDICATEDCAPACITY",
		uiDefinitions: {
			displayName: "Power BI Dedicated capacity",
			displayNamePlural: "Power BI Dedicated capacities",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREPRIVATEDNSZONE",
		type: "AZUREPRIVATEDNSZONE",
		uiDefinitions: {
			displayName: "Private DNS Zone",
			displayNamePlural: "Private DNS Zones",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREPURVIEW",
		type: "AZUREPURVIEW",
		uiDefinitions: {
			displayName: "Purview",
			displayNamePlural: "Purview",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREREDISCACHE",
		type: "AZUREREDISCACHE",
		uiDefinitions: {
			displayName: "Redis cache",
			displayNamePlural: "Redis caches",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREREDISCACHESHARD",
		type: "AZUREREDISCACHESHARD",
		uiDefinitions: {
			displayName: "Redis shard",
			displayNamePlural: "Redis shards",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURERELAY",
		type: "AZURERELAY",
		uiDefinitions: {
			displayName: "Relay",
			displayNamePlural: "Relays",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESERVICEBUSNAMESPACE",
		type: "AZURESERVICEBUSNAMESPACE",
		uiDefinitions: {
			displayName: "Service Bus namespace",
			displayNamePlural: "Service Bus namespaces",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESERVICEBUSQUEUE",
		type: "AZURESERVICEBUSQUEUE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESERVICEBUSSUBSCRIPTION",
		type: "AZURESERVICEBUSSUBSCRIPTION",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESERVICEBUSTOPIC",
		type: "AZURESERVICEBUSTOPIC",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESIGNALR",
		type: "AZURESIGNALR",
		uiDefinitions: {
			displayName: "SignalR",
			displayNamePlural: "SignalR",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESPRINGAPP",
		type: "AZURESPRINGAPP",
		uiDefinitions: {
			displayName: "Spring App",
			displayNamePlural: "Spring Apps",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESQLDATABASE",
		type: "AZURESQLDATABASE",
		uiDefinitions: {
			displayName: "SQL database",
			displayNamePlural: "SQL databases",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESQLELASTICPOOL",
		type: "AZURESQLELASTICPOOL",
		uiDefinitions: {
			displayName: "SQL ElasticPool",
			displayNamePlural: "SQL ElasticPools",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESQLFIREWALL",
		type: "AZURESQLFIREWALL",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESQLMANAGEDINSTANCE",
		type: "AZURESQLMANAGEDINSTANCE",
		uiDefinitions: {
			displayName: "SQL Managed instance",
			displayNamePlural: "SQL Managed instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESQLREPLICATIONLINK",
		type: "AZURESQLREPLICATIONLINK",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESQLRESTOREPOINT",
		type: "AZURESQLRESTOREPOINT",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESQLSERVER",
		type: "AZURESQLSERVER",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESTORAGEACCOUNT",
		type: "AZURESTORAGEACCOUNT",
		uiDefinitions: {
			displayName: "Storage account",
			displayNamePlural: "Storage accounts",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESTORAGESYNC",
		type: "AZURESTORAGESYNC",
		uiDefinitions: {
			displayName: "Storage Sync",
			displayNamePlural: "Storage Sync",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESTREAMANALYTIC",
		type: "AZURESTREAMANALYTIC",
		uiDefinitions: {
			displayName: "Stream Analytic",
			displayNamePlural: "Stream Analytics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURESYNAPSEANALYTIC",
		type: "AZURESYNAPSEANALYTIC",
		uiDefinitions: {
			displayName: "Synapse Analytic",
			displayNamePlural: "Synapse Analytics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURETIMESERIESINSIGHT",
		type: "AZURETIMESERIESINSIGHT",
		uiDefinitions: {
			displayName: "Time Series Insight",
			displayNamePlural: "Time Series Insights",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZURETRAFFICMANAGER",
		type: "AZURETRAFFICMANAGER",
		uiDefinitions: {
			displayName: "Traffic Manager",
			displayNamePlural: "Traffic Managers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALHUB",
		type: "AZUREVIRTUALHUB",
		uiDefinitions: {
			displayName: "Virtual Hub",
			displayNamePlural: "Virtual Hubs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALMACHINESCALESET",
		type: "AZUREVIRTUALMACHINESCALESET",
		uiDefinitions: {
			displayName: "Virtual machine scale set",
			displayNamePlural: "Virtual machine scale sets",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKS",
		type: "AZUREVIRTUALNETWORKS",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKSIPCONFIGURATION",
		type: "AZUREVIRTUALNETWORKSIPCONFIGURATION",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKSNETWORKINTERFACE",
		type: "AZUREVIRTUALNETWORKSNETWORKINTERFACE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKSPEERING",
		type: "AZUREVIRTUALNETWORKSPEERING",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKSPUBLICIPADDRESS",
		type: "AZUREVIRTUALNETWORKSPUBLICIPADDRESS",
		uiDefinitions: {
			displayName: "Virtual Network public IP address",
			displayNamePlural: "Virtual Network public IP addresses",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKSROUTE",
		type: "AZUREVIRTUALNETWORKSROUTE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKSROUTETABLE",
		type: "AZUREVIRTUALNETWORKSROUTETABLE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKSSECURITYGROUP",
		type: "AZUREVIRTUALNETWORKSSECURITYGROUP",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKSSECURITYRULE",
		type: "AZUREVIRTUALNETWORKSSECURITYRULE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVIRTUALNETWORKSSUBNET",
		type: "AZUREVIRTUALNETWORKSSUBNET",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVPNGATEWAY",
		type: "AZUREVPNGATEWAY",
		uiDefinitions: {
			displayName: "VPN Gateway",
			displayNamePlural: "VPN Gateways",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREVPNGATEWAYSVPNGATEWAY",
		type: "AZUREVPNGATEWAYSVPNGATEWAY",
		uiDefinitions: {
			displayName: "Virtual Network Gateway",
			displayNamePlural: "Virtual Network Gateways",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-AZUREWEBAPP",
		type: "AZUREWEBAPP",
		uiDefinitions: {
			displayName: "Web App",
			displayNamePlural: "Web Apps",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-CASSANDRANODE",
		type: "CASSANDRANODE",
		uiDefinitions: {
			displayName: "Cassandra node",
			displayNamePlural: "Cassandra nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-CONSULAGENT",
		type: "CONSULAGENT",
		uiDefinitions: {
			displayName: "Consul agent",
			displayNamePlural: "Consul agents",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-CONTAINER",
		type: "CONTAINER",
		uiDefinitions: {
			displayName: "Container",
			displayNamePlural: "Containers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-COUCHBASEBUCKET",
		type: "COUCHBASEBUCKET",
		uiDefinitions: {
			displayName: "Couchbase bucket",
			displayNamePlural: "Couchbase buckets",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-COUCHBASECLUSTER",
		type: "COUCHBASECLUSTER",
		uiDefinitions: {
			displayName: "Couchbase cluster",
			displayNamePlural: "Couchbase clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-COUCHBASENODE",
		type: "COUCHBASENODE",
		uiDefinitions: {
			displayName: "Couchbase node",
			displayNamePlural: "Couchbase nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-COUCHBASEQUERYENGINE",
		type: "COUCHBASEQUERYENGINE",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-ELASTICSEARCHNODE",
		type: "ELASTICSEARCHNODE",
		uiDefinitions: {
			displayName: "Elasticsearch node",
			displayNamePlural: "Elasticsearch nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-ETCD_CLUSTER",
		type: "ETCD_CLUSTER",
		uiDefinitions: {
			displayName: "ETCD cluster",
			displayNamePlural: "ETCD clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-F5NODE",
		type: "F5NODE",
		uiDefinitions: {
			displayName: "F5 node",
			displayNamePlural: "F5 nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-F5POOL",
		type: "F5POOL",
		uiDefinitions: {
			displayName: "F5 pool",
			displayNamePlural: "F5 pools",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-F5POOLMEMBER",
		type: "F5POOLMEMBER",
		uiDefinitions: {
			displayName: "F5 poolMember",
			displayNamePlural: "F5 poolMembers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-F5SYSTEM",
		type: "F5SYSTEM",
		uiDefinitions: {
			displayName: "F5 system",
			displayNamePlural: "F5 systems",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-F5VIRTUALSERVER",
		type: "F5VIRTUALSERVER",
		uiDefinitions: {
			displayName: "F5 virtual server",
			displayNamePlural: "F5 virtual servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPAIPLATFORMENDPOINT",
		type: "GCPAIPLATFORMENDPOINT",
		uiDefinitions: {
			displayName: "VertexAI Endpoint",
			displayNamePlural: "VertexAI Endpoints",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPAIPLATFORMFEATUREONLINESTORE",
		type: "GCPAIPLATFORMFEATUREONLINESTORE",
		uiDefinitions: {
			displayName: "VertexAI Feature Online Store",
			displayNamePlural: "VertexAI Feature Online Stores",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPAIPLATFORMFEATURESTORE",
		type: "GCPAIPLATFORMFEATURESTORE",
		uiDefinitions: {
			displayName: "VertexAI Feature Store",
			displayNamePlural: "VertexAI Feature Stores",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPAIPLATFORMINDEX",
		type: "GCPAIPLATFORMINDEX",
		uiDefinitions: {
			displayName: "VertexAI Index",
			displayNamePlural: "VertexAI Indexes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPAIPLATFORMLOCATION",
		type: "GCPAIPLATFORMLOCATION",
		uiDefinitions: {
			displayName: "VertexAI Location",
			displayNamePlural: "VertexAI Locations",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPALLOYDBCLUSTER",
		type: "GCPALLOYDBCLUSTER",
		uiDefinitions: {
			displayName: "AlloyDB Cluster",
			displayNamePlural: "AlloyDB Clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPALLOYDBDATABASE",
		type: "GCPALLOYDBDATABASE",
		uiDefinitions: {
			displayName: "AlloyDB Database",
			displayNamePlural: "AlloyDB Databases",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPALLOYDBINSTANCE",
		type: "GCPALLOYDBINSTANCE",
		uiDefinitions: {
			displayName: "AlloyDB Instance",
			displayNamePlural: "AlloyDB Instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPAPPENGINESERVICE",
		type: "GCPAPPENGINESERVICE",
		uiDefinitions: {
			displayName: "App Engine service",
			displayNamePlural: "App Engine services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPBIGQUERYDATASET",
		type: "GCPBIGQUERYDATASET",
		uiDefinitions: {
			displayName: "Big Query dataset",
			displayNamePlural: "Big Query datasets",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPBIGQUERYPROJECT",
		type: "GCPBIGQUERYPROJECT",
		uiDefinitions: {
			displayName: "Big Query project",
			displayNamePlural: "Big Query projects",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPBIGQUERYTABLE",
		type: "GCPBIGQUERYTABLE",
		uiDefinitions: {
			displayName: "Big Query table",
			displayNamePlural: "Big Query tables",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPBIGTABLECLUSTER",
		type: "GCPBIGTABLECLUSTER",
		uiDefinitions: {
			displayName: "Bigtable cluster",
			displayNamePlural: "Bigtable clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPBIGTABLETABLE",
		type: "GCPBIGTABLETABLE",
		uiDefinitions: {
			displayName: "Bigtable table",
			displayNamePlural: "Bigtable tables",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPCLOUDFUNCTION",
		type: "GCPCLOUDFUNCTION",
		uiDefinitions: {
			displayName: "Cloud Function",
			displayNamePlural: "Cloud Functions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPCLOUDSQL",
		type: "GCPCLOUDSQL",
		uiDefinitions: {
			displayName: "Cloud SQL",
			displayNamePlural: "Cloud SQLs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPCLOUDTASKSQUEUE",
		type: "GCPCLOUDTASKSQUEUE",
		uiDefinitions: {
			displayName: "Cloud tasks queue",
			displayNamePlural: "Cloud tasks queues",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPCOMPOSERENVIRONMENT",
		type: "GCPCOMPOSERENVIRONMENT",
		uiDefinitions: {
			displayName: "Composer environment",
			displayNamePlural: "Composer environments",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPCOMPOSERWORKFLOW",
		type: "GCPCOMPOSERWORKFLOW",
		uiDefinitions: {
			displayName: "Composer workflow",
			displayNamePlural: "Composer workflows",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPDATAFLOWJOB",
		type: "GCPDATAFLOWJOB",
		uiDefinitions: {
			displayName: "Dataflow job",
			displayNamePlural: "Dataflow jobs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPDATAPROCCLUSTER",
		type: "GCPDATAPROCCLUSTER",
		uiDefinitions: {
			displayName: "Dataproc cluster",
			displayNamePlural: "Dataproc clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPDATASTOREREQUEST",
		type: "GCPDATASTOREREQUEST",
		uiDefinitions: {
			displayName: "Datastore request",
			displayNamePlural: "Datastore requests",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPFIREBASEDATABASENAMESPACE",
		type: "GCPFIREBASEDATABASENAMESPACE",
		uiDefinitions: {
			displayName: "Firebase Database namespace",
			displayNamePlural: "Firebase Database namespaces",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPFIREBASEHOSTINGDOMAIN",
		type: "GCPFIREBASEHOSTINGDOMAIN",
		uiDefinitions: {
			displayName: "Firebase Hosting domain",
			displayNamePlural: "Firebase Hosting domains",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPFIREBASESTORAGEBUCKET",
		type: "GCPFIREBASESTORAGEBUCKET",
		uiDefinitions: {
			displayName: "Firebase Storage bucket",
			displayNamePlural: "Firebase Storage buckets",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPFIRESTOREINSTANCE",
		type: "GCPFIRESTOREINSTANCE",
		uiDefinitions: {
			displayName: "Firestore instance",
			displayNamePlural: "Firestore instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPFIRESTOREREQUEST",
		type: "GCPFIRESTOREREQUEST",
		uiDefinitions: {
			displayName: "Firestore request",
			displayNamePlural: "Firestore requests",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPHTTPLOADBALANCER",
		type: "GCPHTTPLOADBALANCER",
		uiDefinitions: {
			displayName: "HTTP load balancer",
			displayNamePlural: "HTTP load balancers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPINTERCONNECTATTACHMENT",
		type: "GCPINTERCONNECTATTACHMENT",
		uiDefinitions: {
			displayName: "Interconnect attachment",
			displayNamePlural: "Interconnect attachments",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPINTERCONNECTINTERCONNECT",
		type: "GCPINTERCONNECTINTERCONNECT",
		uiDefinitions: {
			displayName: "Interconnect",
			displayNamePlural: "Interconnects",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPINTERNALLOADBALANCER",
		type: "GCPINTERNALLOADBALANCER",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPKUBERNETESCONTAINER",
		type: "GCPKUBERNETESCONTAINER",
		uiDefinitions: {
			displayName: "Kubernetes Container",
			displayNamePlural: "Kubernetes Containers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPKUBERNETESNODE",
		type: "GCPKUBERNETESNODE",
		uiDefinitions: {
			displayName: "Kubernetes node",
			displayNamePlural: "Kubernetes nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPMEMCACHEMEMCACHENODE",
		type: "GCPMEMCACHEMEMCACHENODE",
		uiDefinitions: {
			displayName: "Memcache memcache node",
			displayNamePlural: "Memcache memcache nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPPUBSUBSUBSCRIPTION",
		type: "GCPPUBSUBSUBSCRIPTION",
		uiDefinitions: {
			displayName: "Pub/Sub subscription",
			displayNamePlural: "Pub/Sub subscriptions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPPUBSUBTOPIC",
		type: "GCPPUBSUBTOPIC",
		uiDefinitions: {
			displayName: "Pub/Sub topic",
			displayNamePlural: "Pub/Sub topics",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPREDISINSTANCE",
		type: "GCPREDISINSTANCE",
		uiDefinitions: {
			displayName: "Redis instance",
			displayNamePlural: "Redis instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPROUTERCLOUDROUTER",
		type: "GCPROUTERCLOUDROUTER",
		uiDefinitions: {
			displayName: "Router cloud router",
			displayNamePlural: "Router cloud routers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPROUTERNATGATEWAY",
		type: "GCPROUTERNATGATEWAY",
		uiDefinitions: {
			displayName: "Router nat gateway",
			displayNamePlural: "Router nat gateways",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPRUNREVISION",
		type: "GCPRUNREVISION",
		uiDefinitions: {
			displayName: "Run revision",
			displayNamePlural: "Run revisions",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPSPANNERDATABASE",
		type: "GCPSPANNERDATABASE",
		uiDefinitions: {
			displayName: "Spanner database",
			displayNamePlural: "Spanner databases",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPSPANNERINSTANCE",
		type: "GCPSPANNERINSTANCE",
		uiDefinitions: {
			displayName: "Spanner instance",
			displayNamePlural: "Spanner instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPSTORAGEBUCKET",
		type: "GCPSTORAGEBUCKET",
		uiDefinitions: {
			displayName: "Storage bucket",
			displayNamePlural: "Storage buckets",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPTCPSSLPROXYLOADBALANCER",
		type: "GCPTCPSSLPROXYLOADBALANCER",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPVERTEXAIENDPOINT",
		type: "GCPVERTEXAIENDPOINT",
		uiDefinitions: {
			displayName: "Gcpvertexaiendpoint",
			displayNamePlural: "Gcpvertexaiendpoints",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPVERTEXAIFEATURESTORE",
		type: "GCPVERTEXAIFEATURESTORE",
		uiDefinitions: {
			displayName: "Gcpvertexaifeaturestore",
			displayNamePlural: "Gcpvertexaifeaturestores",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPVIRTUALMACHINEDISK",
		type: "GCPVIRTUALMACHINEDISK",
		uiDefinitions: {
			displayName: "Virtual Machine Disk",
			displayNamePlural: "Virtual Machine Disks",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-GCPVPCACCESSCONNECTOR",
		type: "GCPVPCACCESSCONNECTOR",
		uiDefinitions: {
			displayName: "VPC Access connector",
			displayNamePlural: "VPC Access connectors",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-HOST",
		type: "HOST",
		uiDefinitions: {
			displayName: "Host",
			displayNamePlural: "Hosts",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-IBMMQ_MANAGER",
		type: "IBMMQ_MANAGER",
		uiDefinitions: {
			displayName: "IBM MQ Manager",
			displayNamePlural: "IBM MQ Managers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-IBMMQ_QUEUE",
		type: "IBMMQ_QUEUE",
		uiDefinitions: {
			displayName: "IBM MQ Queue",
			displayNamePlural: "IBM MQ Queues",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KAFKABROKER",
		type: "KAFKABROKER",
		uiDefinitions: {
			displayName: "Kafka broker",
			displayNamePlural: "Kafka brokers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KAFKATOPIC",
		type: "KAFKATOPIC",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETESCLUSTER",
		type: "KUBERNETESCLUSTER",
		uiDefinitions: {
			displayName: "Kubernetes Cluster",
			displayNamePlural: "Kubernetes Clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETES_APISERVER",
		type: "KUBERNETES_APISERVER",
		uiDefinitions: {
			displayName: "Kubernetes API Server",
			displayNamePlural: "Kubernetes API Servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETES_CRONJOB",
		type: "KUBERNETES_CRONJOB",
		uiDefinitions: {
			displayName: "Kubernetes CronJob",
			displayNamePlural: "Kubernetes CronJobs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETES_DAEMONSET",
		type: "KUBERNETES_DAEMONSET",
		uiDefinitions: {
			displayName: "Kubernetes DaemonSet",
			displayNamePlural: "Kubernetes DaemonSets",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETES_DEPLOYMENT",
		type: "KUBERNETES_DEPLOYMENT",
		uiDefinitions: {
			displayName: "Kubernetes Deployment",
			displayNamePlural: "Kubernetes Deployments",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETES_JOB",
		type: "KUBERNETES_JOB",
		uiDefinitions: {
			displayName: "Kubernetes Job",
			displayNamePlural: "Kubernetes Jobs",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETES_PERSISTENTVOLUME",
		type: "KUBERNETES_PERSISTENTVOLUME",
		uiDefinitions: {
			displayName: "Kubernetes PersistentVolume",
			displayNamePlural: "Kubernetes PersistentVolumes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETES_PERSISTENTVOLUMECLAIM",
		type: "KUBERNETES_PERSISTENTVOLUMECLAIM",
		uiDefinitions: {
			displayName: "Kubernetes PersistentVolumeClaim",
			displayNamePlural: "Kubernetes PersistentVolumeClaims",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETES_POD",
		type: "KUBERNETES_POD",
		uiDefinitions: {
			displayName: "Kubernetes Pod",
			displayNamePlural: "Kubernetes Pods",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-KUBERNETES_STATEFULSET",
		type: "KUBERNETES_STATEFULSET",
		uiDefinitions: {
			displayName: "Kubernetes StatefulSet",
			displayNamePlural: "Kubernetes StatefulSets",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-MEMCACHEDINSTANCE",
		type: "MEMCACHEDINSTANCE",
		uiDefinitions: {
			displayName: "Memcached instance",
			displayNamePlural: "Memcached instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-MONGODB_COLLECTION",
		type: "MONGODB_COLLECTION",
		uiDefinitions: {
			displayName: "MongoDB Collection",
			displayNamePlural: "MongoDB Collections",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-MONGODB_DATABASE",
		type: "MONGODB_DATABASE",
		uiDefinitions: {
			displayName: "MongoDB Database",
			displayNamePlural: "MongoDB Databases",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-MONGODB_INSTANCE",
		type: "MONGODB_INSTANCE",
		uiDefinitions: {
			displayName: "MongoDB Instance",
			displayNamePlural: "MongoDB Instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-MSSQLINSTANCE",
		type: "MSSQLINSTANCE",
		uiDefinitions: {
			displayName: "MSSQL instance",
			displayNamePlural: "MSSQL instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-MYSQLNODE",
		type: "MYSQLNODE",
		uiDefinitions: {
			displayName: "MySQL node",
			displayNamePlural: "MySQL nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-NA",
		type: "NA",
		uiDefinitions: null,
	},
	{
		domain: "INFRA",
		id: "INFRA-NGINXSERVER",
		type: "NGINXSERVER",
		uiDefinitions: {
			displayName: "NGINX server",
			displayNamePlural: "NGINX servers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-ORACLEDBINSTANCE",
		type: "ORACLEDBINSTANCE",
		uiDefinitions: {
			displayName: "Oracledb instance",
			displayNamePlural: "Oracledb instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-POSTGRESQLINSTANCE",
		type: "POSTGRESQLINSTANCE",
		uiDefinitions: {
			displayName: "PostgreSQL instance",
			displayNamePlural: "PostgreSQL instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-POWERDNS_AUTHORITATIVE",
		type: "POWERDNS_AUTHORITATIVE",
		uiDefinitions: {
			displayName: "PowerDNS Authoritative",
			displayNamePlural: "PowerDNS Authoritatives",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-POWERDNS_RECURSOR",
		type: "POWERDNS_RECURSOR",
		uiDefinitions: {
			displayName: "PowerDNS Recursor",
			displayNamePlural: "PowerDNS Recursors",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-RABBITMQCLUSTER",
		type: "RABBITMQCLUSTER",
		uiDefinitions: {
			displayName: "Rabbitmq cluster",
			displayNamePlural: "Rabbitmq clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-RABBITMQEXCHANGE",
		type: "RABBITMQEXCHANGE",
		uiDefinitions: {
			displayName: "RabbitMQ exchange",
			displayNamePlural: "RabbitMQ exchanges",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-RABBITMQNODE",
		type: "RABBITMQNODE",
		uiDefinitions: {
			displayName: "RabbitMQ node",
			displayNamePlural: "RabbitMQ nodes",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-RABBITMQQUEUE",
		type: "RABBITMQQUEUE",
		uiDefinitions: {
			displayName: "RabbitMQ queue",
			displayNamePlural: "RabbitMQ queues",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-REDISINSTANCE",
		type: "REDISINSTANCE",
		uiDefinitions: {
			displayName: "Redis instance",
			displayNamePlural: "Redis instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-SQUID_CACHEMGR",
		type: "SQUID_CACHEMGR",
		uiDefinitions: {
			displayName: "Squid Cache manager",
			displayNamePlural: "Squid Cache managers",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-VARNISHINSTANCE",
		type: "VARNISHINSTANCE",
		uiDefinitions: {
			displayName: "Varnish instance",
			displayNamePlural: "Varnish instances",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-VSPHERECLUSTER",
		type: "VSPHERECLUSTER",
		uiDefinitions: {
			displayName: "vSphere cluster",
			displayNamePlural: "vSphere clusters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-VSPHEREDATACENTER",
		type: "VSPHEREDATACENTER",
		uiDefinitions: {
			displayName: "vSphere datacenter",
			displayNamePlural: "vSphere datacenters",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-VSPHEREDATASTORE",
		type: "VSPHEREDATASTORE",
		uiDefinitions: {
			displayName: "vSphere datastore",
			displayNamePlural: "vSphere datastores",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-VSPHEREHOST",
		type: "VSPHEREHOST",
		uiDefinitions: {
			displayName: "vSphere host",
			displayNamePlural: "vSphere hosts",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-VSPHERERESOURCEPOOL",
		type: "VSPHERERESOURCEPOOL",
		uiDefinitions: {
			displayName: "vSphere resource pool",
			displayNamePlural: "vSphere resource pools",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-VSPHEREVM",
		type: "VSPHEREVM",
		uiDefinitions: {
			displayName: "vSphere virtual machine",
			displayNamePlural: "vSphere virtual machines",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-WINDOWSSERVICE",
		type: "WINDOWSSERVICE",
		uiDefinitions: {
			displayName: "Legacy Windows Service",
			displayNamePlural: "Legacy Windows Services",
		},
	},
	{
		domain: "INFRA",
		id: "INFRA-WIN_SERVICE",
		type: "WIN_SERVICE",
		uiDefinitions: {
			displayName: "Windows Service",
			displayNamePlural: "Windows Services",
		},
	},
	{
		domain: "MLOPS",
		id: "MLOPS-LLM_APPLICATION",
		type: "LLM_APPLICATION",
		uiDefinitions: {
			displayName: "Application",
			displayNamePlural: "Applications",
		},
	},
	{
		domain: "MLOPS",
		id: "MLOPS-MACHINE_LEARNING_ENDPOINT",
		type: "MACHINE_LEARNING_ENDPOINT",
		uiDefinitions: {
			displayName: "Endpoint",
			displayNamePlural: "Endpoints",
		},
	},
	{
		domain: "MLOPS",
		id: "MLOPS-MACHINE_LEARNING_MODEL",
		type: "MACHINE_LEARNING_MODEL",
		uiDefinitions: {
			displayName: "Model",
			displayNamePlural: "Models",
		},
	},
	{
		domain: "MLOPS",
		id: "MLOPS-MACHINE_LEARNING_MODEL_DATA",
		type: "MACHINE_LEARNING_MODEL_DATA",
		uiDefinitions: {
			displayName: "Model Inference Data",
			displayNamePlural: "Model Inference Datas",
		},
	},
	{
		domain: "MLOPS",
		id: "MLOPS-MACHINE_LEARNING_TRAINING_JOB",
		type: "MACHINE_LEARNING_TRAINING_JOB",
		uiDefinitions: null,
	},
	{
		domain: "MOBILE",
		id: "MOBILE-APPLICATION",
		type: "APPLICATION",
		uiDefinitions: {
			displayName: "Mobile application",
			displayNamePlural: "Mobile applications",
		},
	},
	{
		domain: "NR1",
		id: "NR1-FLEET",
		type: "FLEET",
		uiDefinitions: {
			displayName: "Fleet",
			displayNamePlural: "Fleets",
		},
	},
	{
		domain: "NR1",
		id: "NR1-REPOSITORY",
		type: "REPOSITORY",
		uiDefinitions: {
			displayName: "Repository",
			displayNamePlural: "Repositories",
		},
	},
	{
		domain: "NR1",
		id: "NR1-TEST",
		type: "TEST",
		uiDefinitions: {
			displayName: "Test",
			displayNamePlural: "Tests",
		},
	},
	{
		domain: "NR1",
		id: "NR1-WORKLOAD",
		type: "WORKLOAD",
		uiDefinitions: {
			displayName: "Workload",
			displayNamePlural: "Workloads",
		},
	},
	{
		domain: "PROTO",
		id: "PROTO-CUSTOM_APP",
		type: "CUSTOM_APP",
		uiDefinitions: null,
	},
	{
		domain: "PROTO",
		id: "PROTO-CUSTOM_HOST",
		type: "CUSTOM_HOST",
		uiDefinitions: null,
	},
	{
		domain: "PROTO",
		id: "PROTO-DT_EXTERNAL",
		type: "DT_EXTERNAL",
		uiDefinitions: null,
	},
	{
		domain: "PROTO",
		id: "PROTO-ENGGROUP",
		type: "ENGGROUP",
		uiDefinitions: null,
	},
	{
		domain: "PROTO",
		id: "PROTO-GMGROUP",
		type: "GMGROUP",
		uiDefinitions: null,
	},
	{
		domain: "PROTO",
		id: "PROTO-IOT",
		type: "IOT",
		uiDefinitions: null,
	},
	{
		domain: "PROTO",
		id: "PROTO-TEAM",
		type: "TEAM",
		uiDefinitions: null,
	},
	{
		domain: "REF",
		id: "REF-BUILD_ARTIFACT",
		type: "BUILD_ARTIFACT",
		uiDefinitions: {
			displayName: "Build Artifact",
			displayNamePlural: "Build Artifacts",
		},
	},
	{
		domain: "REF",
		id: "REF-REPOSITORY",
		type: "REPOSITORY",
		uiDefinitions: null,
	},
	{
		domain: "SYNTH",
		id: "SYNTH-MONITOR",
		type: "MONITOR",
		uiDefinitions: {
			displayName: "Synthetic monitor",
			displayNamePlural: "Synthetic monitors",
		},
	},
	{
		domain: "SYNTH",
		id: "SYNTH-MONITOR_DOWNTIME",
		type: "MONITOR_DOWNTIME",
		uiDefinitions: {
			displayName: "Monitor Downtime",
			displayNamePlural: "Monitor Downtimes",
		},
	},
	{
		domain: "SYNTH",
		id: "SYNTH-PRIVATE_LOCATION",
		type: "PRIVATE_LOCATION",
		uiDefinitions: {
			displayName: "Private location",
			displayNamePlural: "Private locations",
		},
	},
	{
		domain: "SYNTH",
		id: "SYNTH-RUNTIME_VALIDATION",
		type: "RUNTIME_VALIDATION",
		uiDefinitions: {
			displayName: "Runtime Validation",
			displayNamePlural: "Runtime Validations",
		},
	},
	{
		domain: "SYNTH",
		id: "SYNTH-SECURE_CRED",
		type: "SECURE_CRED",
		uiDefinitions: {
			displayName: "Secure credential",
			displayNamePlural: "Secure credentials",
		},
	},
	{
		domain: "TEST",
		id: "TEST-ANDRE",
		type: "ANDRE",
		uiDefinitions: null,
	},
	{
		domain: "TEST",
		id: "TEST-EP_E2E",
		type: "EP_E2E",
		uiDefinitions: null,
	},
	{
		domain: "TEST",
		id: "TEST-JPUJOL",
		type: "JPUJOL",
		uiDefinitions: null,
	},
	{
		domain: "TEST",
		id: "TEST-MANUELRODRIGUEZ",
		type: "MANUELRODRIGUEZ",
		uiDefinitions: null,
	},
	{
		domain: "TEST",
		id: "TEST-TEST1",
		type: "TEST1",
		uiDefinitions: null,
	},
	{
		domain: "UNINSTRUMENTED",
		id: "UNINSTRUMENTED-AWSDYNAMODBTABLE",
		type: "AWSDYNAMODBTABLE",
		uiDefinitions: {
			displayName: "Awsdynamodbtable",
			displayNamePlural: "Awsdynamodbtables",
		},
	},
	{
		domain: "UNINSTRUMENTED",
		id: "UNINSTRUMENTED-AWSS3BUCKET",
		type: "AWSS3BUCKET",
		uiDefinitions: {
			displayName: "Uninstrumented S3 bucket",
			displayNamePlural: "Uninstrumented S3 buckets",
		},
	},
	{
		domain: "UNINSTRUMENTED",
		id: "UNINSTRUMENTED-AWSSNSTOPIC",
		type: "AWSSNSTOPIC",
		uiDefinitions: {
			displayName: "Uninstrumented SNS topic",
			displayNamePlural: "Uninstrumented SNS topics",
		},
	},
	{
		domain: "UNINSTRUMENTED",
		id: "UNINSTRUMENTED-AWSSQSQUEUE",
		type: "AWSSQSQUEUE",
		uiDefinitions: {
			displayName: "Uninstrumented SQS queue",
			displayNamePlural: "Uninstrumented SQS queues",
		},
	},
	{
		domain: "UNINSTRUMENTED",
		id: "UNINSTRUMENTED-CONTAINER",
		type: "CONTAINER",
		uiDefinitions: {
			displayName: "Uninstrumented container",
			displayNamePlural: "Uninstrumented containers",
		},
	},
	{
		domain: "UNINSTRUMENTED",
		id: "UNINSTRUMENTED-DATABASE",
		type: "DATABASE",
		uiDefinitions: {
			displayName: "Uninstrumented database",
			displayNamePlural: "Uninstrumented databases",
		},
	},
	{
		domain: "UNINSTRUMENTED",
		id: "UNINSTRUMENTED-HOST",
		type: "HOST",
		uiDefinitions: {
			displayName: "Uninstrumented host",
			displayNamePlural: "Uninstrumented hosts",
		},
	},
	{
		domain: "VIDEO",
		id: "VIDEO-BROWSER_VIDEO",
		type: "BROWSER_VIDEO",
		uiDefinitions: {
			displayName: "Browser Video",
			displayNamePlural: "Browser Videos",
		},
	},
	{
		domain: "VIDEO",
		id: "VIDEO-CONVIVA",
		type: "CONVIVA",
		uiDefinitions: {
			displayName: "Conviva",
			displayNamePlural: "Convivas",
		},
	},
	{
		domain: "VIDEO",
		id: "VIDEO-MOBILE_VIDEO",
		type: "MOBILE_VIDEO",
		uiDefinitions: {
			displayName: "Mobile Video",
			displayNamePlural: "Mobile Videos",
		},
	},
	{
		domain: "VIDEO",
		id: "VIDEO-ROKU_SYSTEM",
		type: "ROKU_SYSTEM",
		uiDefinitions: {
			displayName: "Roku System",
			displayNamePlural: "Roku Systems",
		},
	},
	{
		domain: "VIDEO",
		id: "VIDEO-ROKU_VIDEO",
		type: "ROKU_VIDEO",
		uiDefinitions: {
			displayName: "Roku Video",
			displayNamePlural: "Roku Videos",
		},
	},
	{
		domain: "VIZ",
		id: "VIZ-DASHBOARD",
		type: "DASHBOARD",
		uiDefinitions: {
			displayName: "Dashboard",
			displayNamePlural: "Dashboards",
		},
	},
];
