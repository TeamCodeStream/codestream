import { execSync } from "child_process";

export function getRevision(): string {
	const revision: string = execSync("git rev-parse HEAD").toString().trim();

	return revision;
}

export function commit(message: string): void {
	execSync(`git commit -am "${message}"`, { stdio: "inherit" });
}

export function fetch(): void {
	execSync(`git fetch`, { stdio: "inherit" });
}

export function rebase(): void {
	execSync(`git rebase`, { stdio: "inherit" });
}

export function push(): void {
	execSync(`git push`, { stdio: "inherit" });
}

export function tag(product: string, version: string): void {
	const tagName = `${product}-${version}`;

	execSync(`git tag ${tagName}`, { stdio: "inherit" });
	execSync(`git push origin ${tagName}`, { stdio: "inherit" });
}
