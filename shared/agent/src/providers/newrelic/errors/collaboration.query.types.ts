export interface CommentsByThreadIdResponse {
	actor: {
		collaboration: {
			commentsByThreadId: {
				entities: {
					body: string;
					id: string;
					systemMessageType: string;
					creator: {
						email: string;
						name: string;
						userId: string;
					};
				}[];
			};
		};
	};
}
