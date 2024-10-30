import { Subject } from "../models/subject";
import { Tag } from "../models/tag";
import { test } from "../tests/assertions";
import { SubjectParser } from "./subjectParser";

// each test must have an input, and either an expectedUrl and/or an expectedTag
type VerificationParserTest = {
  name: string;
  input: Subject;
} & ({ expectedUrl: string } | { expectedTag: Tag });

const tests: VerificationParserTest[] = [
  {
    name: "empty subject",
    input: {},
    expectedUrl: "",
    expectedTag: { text: "" },
  },
  {
    name: "subject with a string tag",
    input: {
      src: "https://www.testing.com",
      tags: "bird",
    },
    expectedUrl: "https://www.testing.com",
    expectedTag: { text: "bird" },
  },
  {
    // I have chosen to test the number zero here because it is a falsy value
    // meaning that it shouldn't be caught by the null/undefined check to use
    // the default tag
    name: "subject with a falsy number tag",
    input: {
      tags: 0,
    },
    expectedTag: { text: "0" },
  },
  {
    name: "subject with a number tag",
    input: {
      tags: 123,
    },
    expectedTag: { text: "123" },
  },
  {
    name: "subject with a boolean tag",
    input: {
      tags: true,
    },
    expectedTag: { text: "true" },
  },
  {
    name: "subject with a null tag",
    input: {
      tags: null,
    },
    expectedTag: { text: "" },
  },
  {
    name: "subject with an undefined tag",
    input: {
      tags: undefined,
    },
    expectedTag: { text: "" },
  },
  {
    name: "subject with an empty string tag",
    input: {
      tags: "",
    },
    expectedTag: { text: "" },
  },
  {
    // I do not expect that users will pass in a symbol as a tag, but I have
    // included this test to show that the parser can handle it
    name: "subject with a symbol tag",
    input: {
      tags: Symbol("bird"),
    },
    expectedTag: { text: "Symbol(bird)" },
  },
  {
    name: "array of string tags",
    input: {
      tags: ["bird", "sparrow", "finch"],
    },
    expectedTag: { text: "bird" },
  },
  {
    name: "subject with an array of object tags",
    input: {
      tags: [{ text: "bird" }, { text: "sparrow" }, { text: "finch" }],
    },
    expectedTag: { text: "bird" },
  },
  {
    name: "array of tag object and strings",
    input: {
      tags: ["bird", { text: "sparrow" }, "finch"],
    },
    expectedTag: { text: "bird" },
  },
  {
    name: "nested array of tag objects",
    input: {
      tags: [
        // prettier wants to inline this all on one line. However, I think that
        // a one line object with nested arrays is hard to read
        // I have therefore disabled prettier for these nested objects
        // @prettier-ignore
        [{ text: "nest" }, { text: "tree" }],
        { text: "bird" },
      ],
    },
    expectedTag: { text: "nest" },
  },
  {
    name: "nested array of tag objects and strings",
    input: {
      tags: [
        // @prettier-ignore
        [{ text: "tree" }, "nest"],
        "bird",
        { text: "sparrow" },
        "finch",
      ],
    },
    expectedTag: { text: "tree" },
  },
  {
    name: "empty array of tags",
    input: {
      tags: [],
    },
    expectedTag: { text: "" },
  },
  {
    name: "nested empty array of tags",
    input: {
      tags: [[]],
    },
    expectedTag: { text: "" },
  }
];

test.describe("SubjectParser", () => {
  for (const testItem of tests) {
    const result = SubjectParser.parse(testItem.input);

    if ("expectedUrl" in testItem) {
      test(`should have the correct url for a ${testItem.name}`, () => {
        test.expect(result.url).toEqual(testItem.expectedUrl);
      });
    }

    if ("expectedTag" in testItem) {
      test(`should have the correct tag for a ${testItem.name}`, () => {
        test.expect(result.tag).toEqual(testItem.expectedTag);
      });
    }
  }
});
