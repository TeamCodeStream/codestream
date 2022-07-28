// "use strict";
//
// import { expect } from "chai";
// import { beforeEach, describe, it } from "mocha";
// import * as sinon from "sinon";
// import {
// 	GroupIndex,
// 	GroupSequentialIndex,
// 	Index,
// 	IndexType,
// 	UniqueIndex
// } from "../../../src/managers";
// import { Cache } from "../../../src/managers/cache";
// import { Id } from "../../../src/managers/managers";
// import { CSEntity } from "../../../src/protocol/api.protocol";
//
// describe("Cache", function() {
// 	describe("constructor", function() {
// 		it("Creates a unique index for Id", function() {
// 			// const cache = new Cache<TestPerson>(new Map());
// 			// const indexes = cache["indexes"] as Map<keyof TestPerson, Index<TestPerson>>;
// 			//
// 			// expect(indexes.size).toEquals(1);
// 			// const idIndex = indexes.get("id")!;
// 			// expect(idIndex).to.have.deep.property("fields", ["id"]);
// 			// expect(idIndex).to.have.property("type", IndexType.Unique);
// 		});
// 	});
//
// 	describe("get", function() {
// 		it("Returns entity from Id index", function() {
// 			// const johnDoe = makePerson("1", "John", "Doe");
// 			// const cache = new Cache<TestPerson>(new Map());
// 			// const indexes = cache["indexes"] as Map<keyof TestPerson, Index<TestPerson>>;
// 			// const idIndex = indexes.get("id")!;
// 			//
// 			// const mock = sinon.mock(idIndex);
// 			// mock
// 			// 	.expects("get")
// 			// 	.once()
// 			// 	.withArgs("1")
// 			// 	.returns(johnDoe);
// 			//
// 			// expect(cache.get("1")).toEquals(johnDoe);
// 			// mock.verify();
// 		});
// 	});
//
// 	describe("getBy", function() {
// 		it("Throws error if index is not defined", function() {
// 			// const indexes = new Map<keyof TestPerson, Index<TestPerson>>();
// 			// const cache = new Cache(indexes);
// 			//
// 			// expect(() => {
// 			// 	cache.getBy("ssn", "111-11-1111");
// 			// }).to.throw();
// 		});
//
// 		it("Throws error if index type is not unique", function() {
// 			// const indexes = new Map<keyof TestPerson, Index<TestPerson>>();
// 			// indexes.set("lastName", new GroupIndex(["lastName"]));
// 			// const cache = new Cache(indexes);
// 			//
// 			// expect(() => {
// 			// 	cache.getBy("lastName", "Doe");
// 			// }).to.throw();
// 		});
//
// 		it("Returns entity from field index", function() {
// 			// const johnDoe = makePerson("1", "John", "Doe");
// 			// const indexes = new Map();
// 			// const ssnIndex = new UniqueIndex<TestPerson>(["ssn"]);
// 			// indexes.set("ssn", ssnIndex);
// 			// const cache = new Cache<TestPerson>(indexes);
// 			//
// 			// const mock = sinon.mock(ssnIndex);
// 			// mock
// 			// 	.expects("get")
// 			// 	.once()
// 			// 	.withArgs("1")
// 			// 	.returns(johnDoe);
// 			//
// 			// expect(cache.getBy("ssn", "1")).toEquals(johnDoe);
// 			// mock.verify();
// 		});
// 	});
//
// 	describe("getGroup", function() {
// 		it("Throws error if index is not defined", function() {
// 			// const indexes = new Map<keyof TestPerson, Index<TestPerson>>();
// 			// const cache = new Cache<TestPerson>(indexes);
// 			//
// 			// expect(() => {
// 			// 	cache.getGroup("lastName", "Foo");
// 			// }).to.throw();
// 		});
//
// 		it("Throws error if index type is not group", function() {
// 			// const indexes = new Map<keyof TestPerson, Index<TestPerson>>();
// 			// indexes.set("ssn", new UniqueIndex(["ssn"]));
// 			// const cache = new Cache<TestPerson>(indexes);
// 			//
// 			// expect(() => {
// 			// 	cache.getGroup("ssn", "111-11-1111");
// 			// }).to.throw();
// 		});
//
// 		it("Returns entities from field index", function() {
// 			// const joeFoo = makePerson("1", "Joe", "Foo");
// 			// const jimFoo = makePerson("2", "Jim", "Foo");
// 			// const indexes = new Map();
// 			// const lastNameIndex = new UniqueIndex<TestPerson>(["lastName"]);
// 			// indexes.set("lastName", lastNameIndex);
// 			// const cache = new Cache<TestPerson>(indexes);
// 			//
// 			// const mock = sinon.mock(lastNameIndex);
// 			// mock
// 			// 	.expects("get")
// 			// 	.once()
// 			// 	.withArgs("Foo")
// 			// 	.returns([joeFoo, jimFoo]);
// 			//
// 			// const foos = cache.getBy("lastName", "Foo");
// 			// expect(foos).to.lengthOf(2);
// 			// expect(foos).to.have.members([joeFoo, jimFoo]);
// 			//
// 			// mock.verify();
// 		});
// 	});
//
// 	describe("getGroupSlice", function() {
// 		it("Throws error if index is not defined", function() {
// 			// const indexes = new Map<keyof TestPost, Index<TestPost>>();
// 			// const cache = new Cache<TestPost>(indexes);
// 			//
// 			// expect(() => {
// 			// 	cache.getGroupSlice("streamId", "1", 1, 10);
// 			// }).to.throw();
// 		});
//
// 		it("Throws error if index type is not group-sequential", function() {
// 			// const indexes = new Map<keyof TestPerson, Index<TestPerson>>();
// 			// indexes.set("ssn", new UniqueIndex(["ssn"]));
// 			// const cache = new Cache(indexes);
// 			//
// 			// expect(() => {
// 			// 	cache.getGroupSlice("ssn", "111-11-1111", 1, 10);
// 			// }).to.throw();
// 		});
//
// 		it("Returns entities from field index", function() {
// 			// const post1 = makePost("1", "stream1", "post 1", 1);
// 			// const post2 = makePost("2", "stream1", "post 2", 2);
// 			// const indexes = new Map();
// 			// const streamIdIndex = new GroupSequentialIndex<TestPost>(["streamId"], "seq");
// 			// indexes.set("streamId", streamIdIndex);
// 			// const cache = new Cache<TestPost>(indexes);
// 			//
// 			// const mock = sinon.mock(streamIdIndex);
// 			// mock
// 			// 	.expects("getGroupSlice")
// 			// 	.once()
// 			// 	.withArgs("stream1", 1, 3)
// 			// 	.returns([post1, post2]);
// 			//
// 			// const posts = cache.getGroupSlice("streamId", "stream1", 1, 3);
// 			// expect(posts).to.lengthOf(2);
// 			// expect(posts).to.have.members([post1, post2]);
// 			//
// 			// mock.verify();
// 		});
// 	});
//
// 	describe("getGroupTail", function() {
// 		it("Throws error if index is not defined", function() {
// 			// const indexes = new Map<keyof TestPost, Index<TestPost>>();
// 			// const cache = new Cache<TestPost>(indexes);
// 			//
// 			// expect(() => {
// 			// 	cache.getGroupTail("streamId", "1", 2);
// 			// }).to.throw();
// 		});
//
// 		it("Throws error if index type is not group-sequential", function() {
// 			// const indexes = new Map<keyof TestPerson, Index<TestPerson>>();
// 			// indexes.set("ssn", new UniqueIndex(["ssn"]));
// 			// const cache = new Cache(indexes);
// 			//
// 			// expect(() => {
// 			// 	cache.getGroupTail("ssn", "111-11-1111", 2);
// 			// }).to.throw();
// 		});
//
// 		it("Returns entities from field index", function() {
// 			// const post1 = makePost("1", "stream1", "post 1", 1);
// 			// const post2 = makePost("2", "stream1", "post 2", 2);
// 			// const indexes = new Map();
// 			// const streamIdIndex = new GroupSequentialIndex<TestPost>(["streamId"], "seq");
// 			// indexes.set("streamId", streamIdIndex);
// 			// const cache = new Cache<TestPost>(indexes);
// 			//
// 			// const mock = sinon.mock(streamIdIndex);
// 			// mock
// 			// 	.expects("getGroupTail")
// 			// 	.once()
// 			// 	.withArgs("stream1", 2)
// 			// 	.returns([post1, post2]);
// 			//
// 			// const posts = cache.getGroupTail("streamId", "stream1", 2);
// 			// expect(posts).to.lengthOf(2);
// 			// expect(posts).to.have.members([post1, post2]);
// 			//
// 			// mock.verify();
// 		});
// 	});
//
// 	describe("set", function() {
// 		it("Sets the entity in all indexes", function() {
// 			// const lastNameIndex = new GroupIndex<TestPerson>(["lastName"]);
// 			// const indexes = new Map();
// 			// indexes.set("lastName", lastNameIndex);
// 			// const cache = new Cache<TestPerson>(indexes);
// 			// const allIndexes = cache["indexes"];
// 			// const idIndex = allIndexes.get("id")!;
// 			//
// 			// const mockId = sinon.mock(idIndex);
// 			// const mockLastName = sinon.mock(lastNameIndex);
// 			//
// 			// const oldPerson = makePerson("1", "John", "Doe");
// 			// const newPerson = makePerson("1", "John", "Doe", "111-11-1111");
// 			//
// 			// mockId
// 			// 	.expects("set")
// 			// 	.once()
// 			// 	.withArgs(newPerson, oldPerson);
// 			//
// 			// mockLastName
// 			// 	.expects("set")
// 			// 	.once()
// 			// 	.withArgs(newPerson, oldPerson);
// 			//
// 			// cache.set(newPerson, oldPerson);
// 			//
// 			// mockId.verify();
// 			// mockLastName.verify();
// 		});
// 	});
//
// 	describe("initGroup", function() {
// 		it("Throw error if index type is not group or group-sequential", function() {
// 			// const indexes = new Map<keyof TestPerson, Index<TestPerson>>();
// 			// indexes.set("ssn", new UniqueIndex(["ssn"]));
// 			// const cache = new Cache(indexes);
// 			//
// 			// expect(() => {
// 			// 	cache.initGroup("ssn", "111-11-1111", []);
// 			// }).to.throw();
// 		});
//
// 		it("Sets each entity and initializes group index", function() {
// 			// const joeFoo = makePerson("1", "Joe", "Foo", "111-11-1111");
// 			// const jimFoo = makePerson("2", "Jim", "Foo", "222-22-2222");
// 			//
// 			// const indexes = new Map();
// 			// const ssnIndex = new UniqueIndex<TestPerson>(["ssn"]);
// 			// const lastNameIndex = new GroupIndex<TestPerson>(["lastName"]);
// 			// indexes.set("ssn", ssnIndex);
// 			// indexes.set("lastName", lastNameIndex);
// 			// const cache = new Cache<TestPerson>(indexes);
// 			//
// 			// const ssnMock = sinon.mock(ssnIndex);
// 			// ssnMock
// 			// 	.expects("set")
// 			// 	.once()
// 			// 	.withArgs(joeFoo);
// 			// ssnMock
// 			// 	.expects("set")
// 			// 	.once()
// 			// 	.withArgs(jimFoo);
// 			//
// 			// const lastNameMock = sinon.mock(lastNameIndex);
// 			// lastNameMock
// 			// 	.expects("initGroup")
// 			// 	.once()
// 			// 	.withArgs("Foo", [joeFoo, jimFoo]);
// 			//
// 			// cache.initGroup("lastName", "Foo", [joeFoo, jimFoo]);
// 			//
// 			// ssnMock.verify();
// 			// lastNameMock.verify();
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
// function makePerson(id: string, firstName: string, lastName: string, ssn?: string): TestPerson {
// 	return {
// 		id,
// 		firstName,
// 		lastName,
// 		ssn,
// 		createdAt: new Date().getTime(),
// 		modifiedAt: new Date().getTime(),
// 		creatorId: "666"
// 	};
// }
//
// function makePost(id: Id, streamId: Id, text: string, seq: number): TestPost {
// 	return {
// 		id,
// 		streamId,
// 		text,
// 		seq,
// 		createdAt: new Date().getTime(),
// 		modifiedAt: new Date().getTime(),
// 		creatorId: "666"
// 	};
// }
