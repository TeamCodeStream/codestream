import { expect } from "@jest/globals";
import { mockDeep } from "jest-mock-extended";
import { ReposScm } from "@codestream/protocols/agent";

import { ScmManager } from "../../../src/managers/scmManager";
import { CodeStreamSession } from "../../../src/session";

jest.mock("../../../src/session");

const mockCodeStreamSession = mockDeep<CodeStreamSession>();

describe("scmManager", () => {
	describe("specialCase", () => {
		it("should remove duplicate repoId that ends with '/bin/default'", () => {
			const scmManager = new ScmManager(mockCodeStreamSession);
			const repos: ReposScm[] = [
				{
					id: "1234",
					path: "/blah",
					folder: {
						uri: "uri",
						name: "repo1",
					},
				},
				{
					id: "1234",
					path: "/blah/bin/default",
					folder: {
						uri: "uri",
						name: "repo1",
					},
				},
				{
					id: "2345",
					path: "/project",
					folder: {
						uri: "uri",
						name: "repo2",
					},
				},
			];
			const response = scmManager.specialCase(repos);
			expect(response).toStrictEqual([
				{
					id: "1234",
					path: "/blah",
					folder: {
						uri: "uri",
						name: "repo1",
					},
				},
				{
					id: "2345",
					path: "/project",
					folder: {
						uri: "uri",
						name: "repo2",
					},
				},
			]);
		});

		it("should remove duplicate repoId that ends with '/bin/default' reordered", () => {
			const scmManager = new ScmManager(mockCodeStreamSession);
			const repos: ReposScm[] = [
				{
					id: "1234",
					path: "/blah/bin/default",
					folder: {
						uri: "uri",
						name: "repo1",
					},
				},
				{
					id: "2345",
					path: "/project",
					folder: {
						uri: "uri",
						name: "repo2",
					},
				},
				{
					id: "1234",
					path: "/blah",
					folder: {
						uri: "uri",
						name: "repo1",
					},
				},
			];
			const response = scmManager.specialCase(repos);
			expect(response).toStrictEqual([
				{
					id: "2345",
					path: "/project",
					folder: {
						uri: "uri",
						name: "repo2",
					},
				},
				{
					id: "1234",
					path: "/blah",
					folder: {
						uri: "uri",
						name: "repo1",
					},
				},
			]);
		});

		it("should remove duplicate repoId that ends with '/bin/default' multiple dupes", () => {
			const scmManager = new ScmManager(mockCodeStreamSession);
			const repos: ReposScm[] = [
				{
					id: "1234",
					path: "/blah",
					folder: {
						uri: "uri",
						name: "repo1",
					},
				},
				{
					id: "1234",
					path: "/blah/bin/default",
					folder: {
						uri: "uri",
						name: "repo1",
					},
				},
				{
					id: "2345",
					path: "/project",
					folder: {
						uri: "uri",
						name: "repo2",
					},
				},
				{
					id: "3456",
					path: "workspace/project/bin/default",
					folder: {
						uri: "uri",
						name: "repo3",
					},
				},
				{
					id: "3456",
					path: "workspace/project",
					folder: {
						uri: "uri",
						name: "repo3",
					},
				},
			];
			const response = scmManager.specialCase(repos);
			expect(response).toStrictEqual([
				{
					id: "1234",
					path: "/blah",
					folder: {
						uri: "uri",
						name: "repo1",
					},
				},
				{
					id: "2345",
					path: "/project",
					folder: {
						uri: "uri",
						name: "repo2",
					},
				},
				{
					id: "3456",
					path: "workspace/project",
					folder: {
						uri: "uri",
						name: "repo3",
					},
				},
			]);
		});
	});
});
