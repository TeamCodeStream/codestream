// import { expect } from "chai";
// import { before, describe, it, xit } from "mocha";
// import * as sinon from "sinon";
// import { IndexType } from "../../../src/managers";
// import { EntityManager, Id, IndexParams } from "../../../src/managers/managers";
// import { SequentialSlice } from "../../../src/managers/sequentialSlice";
// import { CSEntity } from "../../../src/protocol/api.protocol";
//
// describe("EntityManager", function() {
// 	describe("get", function() {
// 		it("Returns entity from cache if present", async function() {
// 			const manager = new PersonManager();
// 			const cache = manager["cache"];
// 			const mockCache = sinon.mock(cache);
//
// 			const joeFoo = makePerson("Joe", "Foo", "111-11-1111");
//
// 			mockCache
// 				.expects("get")
// 				.once()
// 				.withArgs(joeFoo.id)
// 				.returns(joeFoo);
//
// 			const entity = await manager.get(joeFoo.id);
// 			expect(entity).toEquals(joeFoo);
//
// 			mockCache.verify();
// 		});
//
// 		it("Fetches entity from server if absent", async function() {
// 			const manager = new PersonManager();
// 			const cache = manager["cache"];
// 			const mockApi = sinon.mock(manager.api);
// 			const mockCache = sinon.mock(cache);
//
// 			const joeFoo = makePerson("Joe", "Foo", "111-11-1111");
//
// 			mockCache
// 				.expects("get")
// 				.once()
// 				.withArgs(joeFoo.id)
// 				.returns(undefined);
//
// 			mockApi
// 				.expects("fetch")
// 				.once()
// 				.withArgs(joeFoo.id)
// 				.returns(joeFoo);
//
// 			mockCache
// 				.expects("set")
// 				.once()
// 				.withArgs(joeFoo);
//
// 			const entity = await manager.get(joeFoo.id);
// 			expect(entity).toEquals(joeFoo);
//
// 			mockCache.verify();
// 			mockApi.verify();
// 		});
// 	});
//
// 	describe("getBy", function() {
// 		it("Returns entity from cache if present", async function() {
// 			const manager = new PersonManager();
// 			const cache = manager["cache"];
// 			const mockCache = sinon.mock(cache);
//
// 			const joeFoo = makePerson("Joe", "Foo", "111-11-1111");
//
// 			mockCache
// 				.expects("getBy")
// 				.once()
// 				.withArgs("ssn", "111-11-1111")
// 				.returns(joeFoo);
//
// 			const person = await manager.getBy("ssn", "111-11-1111");
// 			expect(person).toEquals(joeFoo);
//
// 			mockCache.verify();
// 		});
//
// 		it("Fetches entity from server if absent", async function() {
// 			const manager = new PersonManager();
// 			const cache = manager["cache"];
// 			const mockApi = sinon.mock(manager.api);
// 			const mockCache = sinon.mock(cache);
//
// 			const joeFoo = makePerson("Joe", "Foo", "111-11-1111");
//
// 			mockCache
// 				.expects("getBy")
// 				.once()
// 				.withArgs("ssn", "111-11-1111")
// 				.returns(undefined);
//
// 			mockApi
// 				.expects("fetchBySSN")
// 				.once()
// 				.withArgs("111-11-1111")
// 				.returns(joeFoo);
//
// 			mockCache
// 				.expects("set")
// 				.once()
// 				.withArgs(joeFoo);
//
// 			const person = await manager.getBy("ssn", "111-11-1111");
// 			expect(person).toEquals(joeFoo);
//
// 			mockApi.verify();
// 			mockCache.verify();
// 		});
// 	});
//
// 	describe("getGroup", function() {
// 		it("Returns entities from cache if present", async function() {
// 			const manager = new PersonManager();
// 			const cache = manager["cache"];
// 			const mockCache = sinon.mock(cache);
//
// 			const joeFoo = makePerson("Joe", "Foo");
// 			const jimFoo = makePerson("Jim", "Foo");
//
// 			mockCache
// 				.expects("getGroup")
// 				.once()
// 				.withArgs("lastName", "Foo")
// 				.returns([joeFoo, jimFoo]);
//
// 			const foos = await manager.getManyBy("lastName", "Foo");
// 			expect(foos).to.have.members([joeFoo, jimFoo]);
//
// 			mockCache.verify();
// 		});
//
// 		it("Fetches entities from server if absent", async function() {
// 			const manager = new PersonManager();
// 			const cache = manager["cache"];
// 			const mockApi = sinon.mock(manager.api);
// 			const mockCache = sinon.mock(cache);
//
// 			const joeFoo = makePerson("Joe", "Foo");
// 			const jimFoo = makePerson("Jim", "Foo");
//
// 			mockCache
// 				.expects("getGroup")
// 				.once()
// 				.withArgs("lastName", "Foo")
// 				.returns(undefined);
//
// 			mockApi
// 				.expects("fetchByLastName")
// 				.once()
// 				.withArgs("Foo")
// 				.returns([joeFoo, jimFoo]);
//
// 			mockCache
// 				.expects("initGroup")
// 				.once()
// 				.withArgs("lastName", "Foo", [joeFoo, jimFoo]);
//
// 			const foos = await manager.getManyBy("lastName", "Foo");
// 			expect(foos).to.have.members([joeFoo, jimFoo]);
//
// 			mockApi.verify();
// 			mockCache.verify();
// 		});
// 	});
//
// 	describe("getGroupSlice", function() {
// 		it("Returns entities from cache if present", async function() {
// 			const manager = new PostManager();
// 			const cache = manager["cache"];
// 			const mockCache = sinon.mock(cache);
//
// 			const post1 = makePost("stream1", 1);
// 			const post2 = makePost("stream1", 2);
// 			const post3 = makePost("stream1", 3);
//
// 			mockCache
// 				.expects("getGroupSlice")
// 				.once()
// 				.withArgs("streamId", "stream1", 1, 4)
// 				.returns(new SequentialSlice([post1, post2, post3], "seq", 1, 4, 100));
//
// 			const slice = await manager.getGroupSlice("streamId", "stream1", 1, 4);
// 			expect(slice.data).to.have.ordered.members([post1, post2, post3]);
//
// 			mockCache.verify();
// 		});
//
// 		it("Fills gaps in the cache data", async function() {
// 			const manager = new PostManager();
// 			const cache = manager["cache"];
// 			const mockCache = sinon.mock(cache);
// 			const mockApi = sinon.mock(manager.api);
//
// 			const post1 = makePost("stream1", 1);
// 			const post2 = makePost("stream1", 2);
// 			const post3 = makePost("stream1", 3);
// 			const post4 = makePost("stream1", 4);
// 			const post5 = makePost("stream1", 5);
// 			const post6 = makePost("stream1", 6);
// 			const post7 = makePost("stream1", 7);
// 			const post8 = makePost("stream1", 8);
// 			const data = [
// 				post1,
// 				undefined,
// 				undefined,
// 				post4,
// 				post5,
// 				undefined,
// 				post7,
// 				post8
// 			] as TestPost[];
//
// 			mockCache
// 				.expects("getGroupSlice")
// 				.once()
// 				.withArgs("streamId", "stream1", 1, 9)
// 				.returns(new SequentialSlice(data, "seq", 1, 9, 100));
//
// 			mockApi
// 				.expects("fetchPosts")
// 				.once()
// 				.withArgs("stream1", 2, 4)
// 				.returns([post2, post3]);
// 			mockApi
// 				.expects("fetchPosts")
// 				.once()
// 				.withArgs("stream1", 6, 7)
// 				.returns([post6]);
//
// 			mockCache
// 				.expects("set")
// 				.once()
// 				.withArgs(post2);
// 			mockCache
// 				.expects("set")
// 				.once()
// 				.withArgs(post3);
// 			mockCache
// 				.expects("set")
// 				.once()
// 				.withArgs(post6);
//
// 			const slice = await manager.getGroupSlice("streamId", "stream1", 1, 9);
// 			expect(slice.data).to.have.ordered.members([
// 				post1,
// 				post2,
// 				post3,
// 				post4,
// 				post5,
// 				post6,
// 				post7,
// 				post8
// 			]);
//
// 			mockCache.verify();
// 			mockApi.verify();
// 		});
//
// 		it("Fetches entities from server if absent", async function() {
// 			const manager = new PostManager();
// 			const cache = manager["cache"];
// 			const mockCache = sinon.mock(cache);
// 			const mockApi = sinon.mock(manager.api);
//
// 			const post1 = makePost("stream1", 1);
// 			const post2 = makePost("stream1", 2);
// 			const post3 = makePost("stream1", 3);
//
// 			mockCache
// 				.expects("getGroupSlice")
// 				.once()
// 				.withArgs("streamId", "stream1", 1, 3)
// 				.returns(undefined);
//
// 			mockApi
// 				.expects("fetchPosts")
// 				.once()
// 				.withArgs("stream1", undefined, undefined, 1)
// 				.returns([post1, post2, post3]);
//
// 			mockCache
// 				.expects("initGroup")
// 				.once()
// 				.withArgs("streamId", "stream1", [post1, post2, post3]);
//
// 			mockCache
// 				.expects("getGroupSlice")
// 				.once()
// 				.withArgs("streamId", "stream1", 1, 3)
// 				.returns(new SequentialSlice([post1, post2], "seq", 1, 3, 100));
//
// 			const slice = await manager.getGroupSlice("streamId", "stream1", 1, 3);
// 			expect(slice.data).to.have.ordered.members([post1, post2]);
//
// 			mockCache.verify();
// 			mockApi.verify();
// 		});
// 	});
//
// 	describe("getGroupTail", function() {
// 		it("Returns entities from cache if present", async function() {
// 			const manager = new PostManager();
// 			const cache = manager["cache"];
// 			const mockCache = sinon.mock(cache);
//
// 			const post2 = makePost("stream1", 2);
// 			const post3 = makePost("stream1", 3);
//
// 			mockCache
// 				.expects("getGroupTail")
// 				.once()
// 				.withArgs("streamId", "stream1", 2)
// 				.returns(new SequentialSlice([post2, post3], "seq", 2, 4, 3));
//
// 			const tail = await manager.getGroupTail("streamId", "stream1", 2);
// 			expect(tail.data).to.have.ordered.members([post2, post3]);
//
// 			mockCache.verify();
// 		});
//
// 		it("Fills gaps in the cache data", async function() {
// 			const manager = new PostManager();
// 			const cache = manager["cache"];
// 			const mockCache = sinon.mock(cache);
// 			const mockApi = sinon.mock(manager.api);
//
// 			const post1 = makePost("stream1", 1);
// 			const post2 = makePost("stream1", 2);
// 			const post3 = makePost("stream1", 3);
// 			const data = [post1, undefined, post3] as TestPost[];
//
// 			mockCache
// 				.expects("getGroupTail")
// 				.once()
// 				.withArgs("streamId", "stream1", 3)
// 				.returns(new SequentialSlice(data, "seq", 1, 4, 3));
//
// 			mockApi
// 				.expects("fetchPosts")
// 				.once()
// 				.withArgs("stream1", 2, 3)
// 				.returns([post2]);
//
// 			mockCache
// 				.expects("set")
// 				.once()
// 				.withArgs(post2);
//
// 			const slice = await manager.getGroupTail("streamId", "stream1", 3);
// 			expect(slice.data).to.have.ordered.members([post1, post2, post3]);
//
// 			mockCache.verify();
// 			mockApi.verify();
// 		});
//
// 		it("Fetches entities from server if absent", async function() {
// 			const manager = new PostManager();
// 			const cache = manager["cache"];
// 			const mockCache = sinon.mock(cache);
// 			const mockApi = sinon.mock(manager.api);
//
// 			const post1 = makePost("stream1", 1);
// 			const post2 = makePost("stream1", 2);
// 			const post3 = makePost("stream1", 3);
//
// 			mockCache
// 				.expects("getGroupTail")
// 				.once()
// 				.withArgs("streamId", "stream1", 3)
// 				.returns(undefined);
//
// 			mockApi
// 				.expects("fetchPosts")
// 				.once()
// 				.withArgs("stream1", undefined, undefined, 3)
// 				.returns([post1, post2, post3]);
//
// 			mockCache
// 				.expects("initGroup")
// 				.once()
// 				.withArgs("streamId", "stream1", [post1, post2, post3]);
//
// 			mockCache
// 				.expects("getGroupTail")
// 				.once()
// 				.withArgs("streamId", "stream1", 3)
// 				.returns(new SequentialSlice([post1, post2, post3], "seq", 1, 4, 3));
//
// 			const slice = await manager.getGroupTail("streamId", "stream1", 3);
// 			expect(slice.data).to.have.ordered.members([post1, post2, post3]);
//
// 			mockCache.verify();
// 			mockApi.verify();
// 		});
// 	});
// });
//
// interface TestPerson extends CSEntity {
// 	firstName: string;
// 	lastName: string;
// 	ssn?: string;
// }
//
// interface TestPost extends CSEntity {
// 	streamId: string;
// 	text: string;
// 	seq: number;
// }
//
// class PersonManager extends EntityManager<TestPerson> {
// 	public api = {
// 		fetch: (id: Id) => {},
// 		fetchBySSN: (ssn: string) => {},
// 		fetchByLastName: (lastName: string) => {}
// 	};
//
// 	protected getIndexedFields(): IndexParams<TestPerson>[] {
// 		return [
// 			{
// 				field: "ssn",
// 				type: IndexType.Unique,
// 				fetchFn: this.fetchBySSN.bind(this)
// 			},
// 			{
// 				field: "lastName",
// 				type: IndexType.Group,
// 				fetchFn: this.fetchByLastName.bind(this)
// 			}
// 		];
// 	}
//
// 	protected async fetch(id: Id): Promise<TestPerson> {
// 		// @ts-ignore
// 		return await this.api.fetch(id);
// 	}
//
// 	public async fetchBySSN(ssn: string) {
// 		return await this.api.fetchBySSN(ssn);
// 	}
//
// 	public async fetchByLastName(lastName: string) {
// 		return await this.api.fetchByLastName(lastName);
// 	}
// }
//
// class PostManager extends EntityManager<TestPost> {
// 	public api = {
// 		fetch: (id: Id) => {},
// 		fetchPosts: (streamId: Id, seqStart?: number, seqEnd?: number, limit?: number) => {}
// 	};
//
// 	protected getIndexedFields(): IndexParams<TestPost>[] {
// 		return [
// 			{
// 				field: "streamId",
// 				type: IndexType.GroupSequential,
// 				seqField: "seq",
// 				fetchFn: this.fetchPosts.bind(this)
// 			}
// 		];
// 	}
//
// 	protected async fetch(id: Id): Promise<TestPost> {
// 		// @ts-ignore
// 		return await this.api.fetch(id);
// 	}
//
// 	protected async fetchPosts(streamId: Id, seqStart?: number, seqEnd?: number, limit?: number) {
// 		return await this.api.fetchPosts(streamId, seqStart, seqEnd, limit);
// 	}
// }
//
// let idSeed = 0;
//
// function makeTestEntity(): TestEntity {
// 	return {
// 		id: (++idSeed).toString(),
// 		createdAt: new Date().getTime(),
// 		modifiedAt: new Date().getTime(),
// 		creatorId: "666"
// 	};
// }
//
// function makePerson(firstName: string, lastName: string, ssn?: string): TestPerson {
// 	return {
// 		id: (++idSeed).toString(),
// 		firstName,
// 		lastName,
// 		ssn,
// 		createdAt: new Date().getTime(),
// 		modifiedAt: new Date().getTime(),
// 		creatorId: "666"
// 	};
// }
//
// function makePost(streamId: Id, seq: number): TestPost {
// 	return {
// 		id: (++idSeed).toString(),
// 		streamId,
// 		text: `Post ${seq}, stream ${streamId}.`,
// 		seq,
// 		createdAt: new Date().getTime(),
// 		modifiedAt: new Date().getTime(),
// 		creatorId: "666"
// 	};
// }
