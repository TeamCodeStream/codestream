import { NraiProvider } from "../../../../src/providers/newrelic/nrai/nraiProvider";
import { describe, expect, it } from "@jest/globals";

describe("getAIEligibility", () => {
	describe("Override feature flag enabled", () => {
		const graphqlClient = {
			addHeader: () => {},
			getFeatureFlags: () => ({
				"Collaboration/ama": true,
				"Collaboration/nrai_ga": false,
			}),
		};
		const provider = new NraiProvider(graphqlClient as any);
		it("should return true", async () => {
			const result = await provider.getAIEligibility({ accountId: 1 });
			expect(result).toBe(true);
		});
	});

	describe("Pre-release preview enabled", () => {
		const graphqlClient = {
			addHeader: () => {},
			query: () => {
				return new Promise(resolve => {
					resolve({
						actor: {
							preReleaseProgram: {
								program: {
									submission: {
										accepted: true,
									},
								},
							},
						},
					});
				});
			},
			getFeatureFlags: () => ({
				"Collaboration/ama": false,
				"Collaboration/nrai_ga": false,
			}),
		};
		const provider = new NraiProvider(graphqlClient as any);
		it("should return true", async () => {
			const result = await provider.getAIEligibility({ accountId: 1 });
			expect(result).toBe(true);
		});
	});

	describe("Pre-release preview disabled", () => {
		const graphqlClient = {
			addHeader: () => {},
			query: () => {
				return new Promise(resolve => {
					resolve({
						actor: {
							preReleaseProgram: {
								program: {
									submission: {
										accepted: false,
									},
								},
							},
						},
					});
				});
			},
			getFeatureFlags: () => ({
				"Collaboration/ama": false,
				"Collaboration/nrai_ga": false,
			}),
		};
		const provider = new NraiProvider(graphqlClient as any);
		it("should return false", async () => {
			const result = await provider.getAIEligibility({ accountId: 1 });
			expect(result).toBe(false);
		});
	});

	describe("GA without NRAI capability", () => {
		const graphqlClient = {
			addHeader: () => {},
			getFeatureFlags: () => ({
				"Collaboration/ama": false,
				"Collaboration/nrai_ga": true,
			}),
			getCapabilities: () => ({
				"newrelic_ai.ask.any": false,
			}),
		};
		const provider = new NraiProvider(graphqlClient as any);
		it("should return false", async () => {
			const result = await provider.getAIEligibility({ accountId: 1 });
			expect(result).toBe(false);
		});
	});

	describe("GA with NRAI capability but no compute entitlement or trial", () => {
		const graphqlClient = {
			addHeader: () => {},
			query: () => {
				return new Promise(resolve => {
					resolve({
						actor: {
							preReleaseProgram: {
								trialStatus: {
									status: "NONE",
								},
							},
						},
					});
				});
			},
			getFeatureFlags: () => ({
				"Collaboration/ama": false,
				"Collaboration/nrai_ga": true,
			}),
			getCapabilities: () => ({
				"newrelic_ai.ask.any": true,
			}),
			getEntitlements: () => ({
				nr_queries_ccu: false,
			}),
		};
		const provider = new NraiProvider(graphqlClient as any);
		it("should return false", async () => {
			const result = await provider.getAIEligibility({ accountId: 1 });
			expect(result).toBe(false);
		});
	});

	describe("GA with NRAI capability and compute entitlement", () => {
		const graphqlClient = {
			addHeader: () => {},
			query: () => {
				return new Promise(resolve => {
					resolve({
						actor: {
							preReleaseProgram: {
								trialStatus: {
									status: "NONE",
								},
							},
						},
					});
				});
			},
			getFeatureFlags: () => ({
				"Collaboration/ama": false,
				"Collaboration/nrai_ga": true,
			}),
			getCapabilities: () => ({
				"newrelic_ai.ask.any": true,
			}),
			getEntitlements: () => ({
				nr_queries_ccu: true,
			}),
		};
		const provider = new NraiProvider(graphqlClient as any);
		it("should return true", async () => {
			const result = await provider.getAIEligibility({ accountId: 1 });
			expect(result).toBe(true);
		});
	});

	describe("GA with NRAI capability and active trial", () => {
		const graphqlClient = {
			addHeader: () => {},
			query: () => {
				return new Promise(resolve => {
					resolve({
						actor: {
							preReleaseProgram: {
								trialStatus: {
									status: "IN_TRIAL",
								},
							},
						},
					});
				});
			},
			getFeatureFlags: () => ({
				"Collaboration/ama": false,
				"Collaboration/nrai_ga": true,
			}),
			getCapabilities: () => ({
				"newrelic_ai.ask.any": true,
			}),
			getEntitlements: () => ({
				nr_queries_ccu: false,
			}),
		};
		const provider = new NraiProvider(graphqlClient as any);
		it("should return true", async () => {
			const result = await provider.getAIEligibility({ accountId: 1 });
			expect(result).toBe(true);
		});
	});
});
