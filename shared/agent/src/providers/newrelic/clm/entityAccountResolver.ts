import { EntityAccount, NRErrorResponse, ObservabilityRepo } from "@codestream/protocols/agent";
import { GitRepository } from "../../../git/models/repository";
import { GraphqlNrqlError } from "../newrelic.types";
import { Logger } from "../../../logger";
import { join, relative, sep } from "path";
import { SessionServiceContainer } from "../../../container";
import { EntityProvider } from "../entity/entityProvider";
import { GoldenSignalsProvider } from "../goldenSignals/goldenSignalsProvider";
import { ReposProvider } from "../repos/reposProvider";
import { lsp } from "../../../system/decorators/lsp";
import { errorTypeMapper } from "../utils";
import { ContextLogger } from "../../contextLogger";

@lsp
export class EntityAccountResolver {
	constructor(
		private sessionServiceContainer: SessionServiceContainer,
		private entityProvider: EntityProvider,
		private goldenSignalsProvider: GoldenSignalsProvider,
		private reposProvider: ReposProvider
	) {}

	async resolveEntityAccount(filePath: string): Promise<{
		result?: {
			entity: EntityAccount;
			relativeFilePath: string;
			observabilityRepo: ObservabilityRepo;
			repoForFile: GitRepository;
			remote: string;
		};
		error?: NRErrorResponse;
	}> {
		const { git, users } = this.sessionServiceContainer;
		const codeStreamUser = await users.getMe();

		const repoForFile = await git.getRepositoryByFilePath(filePath);
		if (!repoForFile?.id) {
			ContextLogger.warn("getFileLevelTelemetry: no repo for file", {
				filePath,
			});
			return {};
		}

		try {
			const { entityCount } = await this.entityProvider.getEntityCount();
			if (entityCount < 1) {
				ContextLogger.log("getFileLevelTelemetry: no NR1 entities");
				return {};
			}
		} catch (ex) {
			if (ex instanceof GraphqlNrqlError) {
				const type = errorTypeMapper(ex);
				Logger.warn(`getFileLevelTelemetry error ${type}`, {
					filePath,
				});
				return {
					error: <NRErrorResponse>{
						error: {
							message: ex.message,
							type,
						},
					},
				};
			}
			return {};
		}

		const remotes = await repoForFile.getWeightedRemotesByStrategy("prioritizeUpstream", undefined);
		const remote = remotes.map(_ => _.rawUrl)[0];

		let relativeFilePath = relative(repoForFile.path, filePath);
		if (relativeFilePath[0] !== sep) {
			relativeFilePath = join(sep, relativeFilePath);
		}

		// See if the git repo is associated with NR1
		const observabilityRepo = await this.reposProvider.getObservabilityEntityRepos(repoForFile.id);
		if (!observabilityRepo) {
			ContextLogger.warn("getFileLevelTelemetry: no observabilityRepo");
			return {};
		}
		if (!observabilityRepo.entityAccounts?.length) {
			ContextLogger.warn("getFileLevelTelemetry: no entityAccounts");
			return {
				error: <NRErrorResponse>{
					repo: {
						id: repoForFile.id,
						name: this.reposProvider.getRepoName(repoForFile),
						remote: remote,
					},
					error: {
						message: "",
						type: "NOT_ASSOCIATED",
					},
				},
			};
		}

		const entity = this.goldenSignalsProvider.getGoldenSignalsEntity(
			codeStreamUser!,
			observabilityRepo
		);
		return {
			result: {
				entity,
				relativeFilePath,
				observabilityRepo,
				repoForFile,
				remote,
			},
		};
	}
}
