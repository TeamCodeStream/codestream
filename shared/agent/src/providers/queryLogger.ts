interface CallStats {
	count: number;
	cumulativeCost: number;
	averageCost: number;
}

export interface RateLimit {
	rateLimit: number;
	rateLimitUsed: number;
	rateLimitRemaining: number;
	rateLimitResetTime: Date;
	rateLimitResource: string;
}

export interface QueryLogger {
	restApi: {
		rateLimits: Record<string, RateLimit>;
		fns: Record<string, CallStats>;
	};
	graphQlApi: {
		rateLimit?: {
			remaining: number;
			resetAt?: string;
			resetInMinutes?: number;
			last?: { name: string; cost: number };
		};
		fns: Record<string, CallStats>;
	};
}
