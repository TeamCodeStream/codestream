// "use strict";
//
// import { expect } from "chai";
// import { beforeEach, describe, it } from "mocha";
// import {
// 	GroupIndex,
// 	GroupSequentialIndex,
// 	IndexType,
// 	makeIndex,
// 	UniqueIndex
// } from "../../../src/managers";
// import { Id } from "../../../src/managers/managers";
// import { CSEntity } from "../../../src/protocol/api.protocol";
//
// describe("Indexes", function() {
// 	const joeFoo = makePerson("1", "Joe", "Foo", "111-11-1111");
// 	const jimFoo = makePerson("2", "Jim", "Foo", "222-22-2222");
// 	const joeBar = makePerson("3", "Joe", "Bar", "333-33-3333");
//
// 	describe("UniqueIndex", function() {
// 		let index: UniqueIndex<TestPerson>;
// 		beforeEach(function() {
// 			// index = makeIndex({
// 			// 	field: "ssn",
// 			// 	type: IndexType.Unique
// 			// }) as UniqueIndex<TestPerson>;
// 		});
//
// 		it("Accepts entities with valid key value", function() {
// 			index.set(joeFoo);
// 			index.set(jimFoo);
// 			index.set(joeBar);
//
// 			expect(index.get(joeFoo.ssn)).toEqual(joeFoo);
// 			expect(index.get(jimFoo.ssn)).toEqual(jimFoo);
// 			expect(index.get(joeBar.ssn)).toEqual(joeBar);
// 		});
//
// 		it("Dissociates entity from old value when its old version is supplied", function() {
// 			const oldSSN = "111-11-1111";
// 			const newSSN = "222-22-2222";
//
// 			const oldPerson = makePerson("4", "Jimmy", "John", oldSSN);
// 			const newPerson = {
// 				...oldPerson,
// 				ssn: newSSN
// 			};
//
// 			index.set(oldPerson);
// 			expect(index.get(oldSSN)).toEqual(oldPerson);
//
// 			index.set(newPerson, oldPerson);
// 			expect(index.get(oldSSN)).to.be.undefined;
// 			expect(index.get(newSSN)).toEqual(newPerson);
// 		});
//
// 		it("Rejects entities without a valid key value", function() {
// 			const noSSN = makePerson("1", "Illegal", "Immigrant");
// 			expect(() => {
// 				index.set(noSSN);
// 			}).to.throw();
// 		});
//
// 		it("Informs whether it has an entity or not", function() {
// 			index.set(joeFoo);
//
// 			expect(index.has(joeFoo.ssn)).to.be.true;
// 			expect(index.has(jimFoo.ssn)).to.be.false;
// 			expect(index.has(joeBar.ssn)).to.be.false;
// 		});
//
// 		it("Deletes entities", function() {
// 			index.set(joeFoo);
// 			expect(index.has(joeFoo.ssn)).to.be.true;
//
// 			index.delete(joeFoo.ssn);
// 			expect(index.has(joeFoo.ssn)).to.be.false;
// 		});
// 	});
//
// 	describe("GroupIndex", function() {
// 		let index: GroupIndex<TestPerson>;
// 		beforeEach(function() {
// 			// index = makeIndex({
// 			// 	field: "lastName",
// 			// 	type: IndexType.Group
// 			// }) as GroupIndex<TestPerson>;
// 		});
//
// 		it("Groups entities with the same key value", function() {
// 			// let foos;
// 			// let bars;
// 			// index.initGroup("Foo", [joeFoo]);
// 			// index.initGroup("Bar", []);
// 			//
// 			// foos = index.getGroup("Foo");
// 			// expect(foos).to.have.lengthOf(1);
// 			// expect(foos).to.include.members([joeFoo]);
// 			// bars = index.getGroup("Bar");
// 			// expect(bars).to.have.lengthOf(0);
// 			//
// 			// index.set(jimFoo);
// 			// index.set(joeBar);
// 			//
// 			// foos = index.getGroup("Foo");
// 			// expect(foos).to.have.lengthOf(2);
// 			// expect(foos).to.include.members([joeFoo, jimFoo]);
// 			// bars = index.getGroup("Bar");
// 			// expect(bars).to.have.lengthOf(1);
// 			// expect(bars).to.include.members([joeBar]);
// 		});
//
// 		it("Returns undefined for uninitialized groups", function() {
// 			const foos = index.getGroup("Foo");
// 			const bars = index.getGroup("Bar");
// 			expect(foos).to.be.undefined;
// 			expect(bars).to.be.undefined;
// 		});
//
// 		it("Throws error if a group is initialized twice", function() {
// 			index.initGroup("Foo", [joeFoo]);
// 			expect(() => {
// 				index.initGroup("Foo", [joeFoo]);
// 			}).to.throw();
// 		});
//
// 		it("Ignores entities until their group is initialized", function() {
// 			let foos;
// 			let bars;
//
// 			index.set(joeFoo);
// 			index.set(joeBar);
// 			foos = index.getGroup("Foo");
// 			bars = index.getGroup("Bar");
// 			expect(foos).to.be.undefined;
// 			expect(bars).to.be.undefined;
//
// 			index.initGroup("Foo", []);
// 			index.initGroup("Bar", []);
// 			index.set(joeFoo);
// 			index.set(joeBar);
// 			foos = index.getGroup("Foo");
// 			bars = index.getGroup("Bar");
// 			expect(foos).to.have.lengthOf(1);
// 			expect(bars).to.have.lengthOf(1);
// 		});
//
// 		it("Moves entity to new group when its old version is supplied", function() {
// 			const joeBaz = {
// 				...joeBar,
// 				lastName: "Baz"
// 			};
// 			let bars;
// 			let bazs;
//
// 			index.initGroup("Bar", [joeBar]);
// 			index.initGroup("Baz", []);
//
// 			bars = index.getGroup("Bar");
// 			bazs = index.getGroup("Baz");
// 			expect(bars).to.have.lengthOf(1);
// 			expect(bazs).to.have.lengthOf(0);
//
// 			index.set(joeBaz, joeBar);
//
// 			bars = index.getGroup("Bar");
// 			bazs = index.getGroup("Baz");
// 			expect(bars).to.have.lengthOf(0);
// 			expect(bazs).to.have.lengthOf(1);
// 		});
// 	});
//
// 	describe("GroupSequentialIndex", function() {
// 		const stream1Post1 = makePost("1", "1", "stream 1 post 1", 1);
// 		const stream1Post2 = makePost("2", "1", "stream 1 post 2", 2);
// 		const stream1Post3 = makePost("3", "1", "stream 1 post 3", 3);
// 		const stream1Post4 = makePost("4", "1", "stream 1 post 4", 4);
// 		const stream1Post5 = makePost("5", "1", "stream 1 post 5", 5);
//
// 		const stream2Post1 = makePost("6", "2", "stream 2 post 1", 1);
// 		const stream2Post2 = makePost("7", "2", "stream 2 post 2", 2);
// 		const stream2Post3 = makePost("8", "2", "stream 2 post 3", 3);
//
// 		let index: GroupSequentialIndex<TestPost>;
// 		beforeEach(function() {
// 			index = makeIndex({
// 				field: "streamId",
// 				seqField: "seq",
// 				type: IndexType.GroupSequential
// 			}) as GroupSequentialIndex<TestPost>;
// 		});
//
// 		it("Groups entities with the same key value", function() {
// 			index.initGroup("1", [stream1Post3]);
// 			index.initGroup("2", [stream2Post3]);
// 			index.set(stream1Post2);
// 			index.set(stream1Post1);
// 			index.set(stream2Post2);
// 			index.set(stream2Post1);
//
// 			const stream1 = index.getGroupSlice("1", 1, 4);
// 			expect(stream1!.data).to.contains(stream1Post1);
// 			expect(stream1!.data).to.contains(stream1Post2);
// 			expect(stream1!.data).to.contains(stream1Post3);
//
// 			const stream2 = index.getGroupSlice("2", 1, 4);
// 			expect(stream2!.data).to.contains(stream2Post1);
// 			expect(stream2!.data).to.contains(stream2Post2);
// 			expect(stream2!.data).to.contains(stream2Post3);
// 		});
//
// 		it("Sorts entities in each group by sequence value", function() {
// 			index.initGroup("1", [stream1Post3]);
// 			index.set(stream1Post1);
// 			index.set(stream1Post2);
// 			index.set(stream1Post5);
// 			index.set(stream1Post4);
//
// 			const stream1 = index.getGroupSlice("1", 1, 6);
// 			expect(stream1!.data[0]).toEqual(stream1Post1);
// 			expect(stream1!.data[1]).toEqual(stream1Post2);
// 			expect(stream1!.data[2]).toEqual(stream1Post3);
// 			expect(stream1!.data[3]).toEqual(stream1Post4);
// 			expect(stream1!.data[4]).toEqual(stream1Post5);
// 		});
//
// 		it("Returns slices a group", function() {
// 			index.initGroup("1", [stream1Post4, stream1Post5]);
// 			index.set(stream1Post2); // simulating a gap in the group
//
// 			const slice11 = index.getGroupSlice("1", 1, 1);
// 			expect(slice11!.seqStart).toEquals(1);
// 			expect(slice11!.seqEnd).toEquals(1);
// 			expect(slice11!.data.length).toEquals(0);
//
// 			const slice16 = index.getGroupSlice("1", 1, 6);
// 			expect(slice16!.seqStart).toEquals(1);
// 			expect(slice16!.seqEnd).toEquals(6);
// 			expect(slice16!.data).to.have.ordered.members([
// 				undefined,
// 				stream1Post2,
// 				undefined,
// 				stream1Post4,
// 				stream1Post5
// 			]);
//
// 			const slice19 = index.getGroupSlice("1", 1, 9);
// 			expect(slice19!.seqStart).toEquals(1);
// 			expect(slice19!.seqEnd).toEquals(9);
// 			expect(slice19!.data).to.have.ordered.members([
// 				undefined,
// 				stream1Post2,
// 				undefined,
// 				stream1Post4,
// 				stream1Post5
// 			]);
//
// 			const slice35 = index.getGroupSlice("1", 3, 5);
// 			expect(slice35!.seqStart).toEquals(3);
// 			expect(slice35!.seqEnd).toEquals(5);
// 			expect(slice35!.data).to.have.ordered.members([undefined, stream1Post4]);
// 		});
//
// 		it("Returns the tail of a group", function() {
// 			index.initGroup("1", [stream1Post3, stream1Post4, stream1Post5]);
//
// 			const tail9 = index.getGroupTail("1", 9);
// 			expect(tail9!.seqStart).toEquals(1);
// 			expect(tail9!.seqEnd).toEquals(6);
// 			expect(tail9!.data).to.have.ordered.members([
// 				undefined,
// 				undefined,
// 				stream1Post3,
// 				stream1Post4,
// 				stream1Post5
// 			]);
//
// 			const tail5 = index.getGroupTail("1", 5);
// 			expect(tail5!.seqStart).toEquals(1);
// 			expect(tail5!.seqEnd).toEquals(6);
// 			expect(tail5!.data).to.have.ordered.members([
// 				undefined,
// 				undefined,
// 				stream1Post3,
// 				stream1Post4,
// 				stream1Post5
// 			]);
//
// 			const tail2 = index.getGroupTail("1", 2);
// 			expect(tail2!.seqStart).toEquals(4);
// 			expect(tail2!.seqEnd).toEquals(6);
// 			expect(tail2!.data).to.have.ordered.members([stream1Post4, stream1Post5]);
// 		});
//
// 		it("Returns undefined slices for uninitialized groups", function() {
// 			const slice = index.getGroupSlice("1", 1, 6);
// 			expect(slice).to.be.undefined;
// 		});
//
// 		it("Returns undefined tail for uninitialized groups", function() {
// 			const tail = index.getGroupTail("1", 5);
// 			expect(tail).to.be.undefined;
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
