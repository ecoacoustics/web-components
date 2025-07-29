import { Tag } from "../../models/tag";
import { expect } from "../../tests/assertions";
import { TypeaheadCallback } from "./typeahead";
import { typeaheadFixture as test } from "./typeahead.fixture";

const testedTags: Tag[] = [{ text: "tag1" }, { text: "tag2" }, { text: "tag3" }];

const searchCallback: TypeaheadCallback<Tag> = (searchTerm: string) =>
  testedTags.filter((option) => option.text.includes(searchTerm));

test.beforeEach(async ({ fixture }) => {
  await fixture.create(searchCallback);
});

test("should create", () => {
  expect(true).toBeTruthy();
});
