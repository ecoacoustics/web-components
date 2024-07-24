import { infoCardFixture as test } from "./info-card.fixture";
import { Subject } from "../../models/subject";
import { expect } from "../../tests/assertions";

test.describe("Info Card", () => {
  test.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  test("Download link should be the same as the audio source", async ({ fixture }) => {
    const subjectModel: Subject = {
      name: "John Doe",
      age: 52,
      location: "New York",
      occupation: "Software Engineer",
      company: "Google",
      hobbies: "Fishing",
    };
    await fixture.changeSubject(subjectModel);

    const realizedAudioLink = await fixture.audioDownloadLocation();
    expect(realizedAudioLink).toBe(fixture.testAudioUrl);
  });

  test("should not have a 'show more' button if there are not more than three subject fields", async ({ fixture }) => {
    const subjectModel: Subject = {
      name: "John Doe",
      age: 52,
      hobbies: "Fishing",
    };
    await fixture.changeSubject(subjectModel);

    const showMoreButton = fixture.showMoreButton();
    await expect(showMoreButton).not.toBeAttached();
  });

  test("should not have a 'show more' button if there is no subject", async ({ fixture }) => {
    const showMoreButton = fixture.showMoreButton();
    await expect(showMoreButton).not.toBeAttached();
  });

  test("The show more and show less button should expand and hide information", async ({ fixture }) => {
    const subjectModel: Subject = {
      name: "John Doe",
      age: 52,
      location: "New York",
      occupation: "Software Engineer",
      company: "Google",
      hobbies: "Fishing",
    };
    const numberOfCollapsedItems = 3;
    const numberOfExpandedItems = Object.keys(subjectModel).length;

    await fixture.changeSubject(subjectModel);

    const collapsedItem = await fixture.infoCardItems();
    await expect(fixture.showMoreButton()).toHaveText("Show More");
    expect(collapsedItem).toHaveLength(numberOfCollapsedItems);

    await fixture.showMoreButton().click();

    const expandedItems = await fixture.infoCardItems();
    await expect(fixture.showMoreButton()).toHaveText("Show Less");
    expect(expandedItems).toHaveLength(numberOfExpandedItems);

    await fixture.showMoreButton().click();

    const collapsedItems = await fixture.infoCardItems();
    await expect(fixture.showMoreButton()).toHaveText("Show More");
    expect(collapsedItems).toHaveLength(numberOfCollapsedItems);
  });

  test("The info card should show subject information", async ({ fixture }) => {
    const subjectModel: Subject = {
      name: "John Doe",
      age: 52,
      location: "New York",
      occupation: "Software Engineer",
      company: "Google",
      hobbies: "Fishing",
    };
    const expectedSubjectModel = [
      { key: "name", value: "John Doe" },
      { key: "age", value: "52" },
      { key: "location", value: "New York" },
      { key: "occupation", value: "Software Engineer" },
      { key: "company", value: "Google" },
      { key: "hobbies", value: "Fishing" },
    ];

    await fixture.changeSubject(subjectModel);
    await fixture.showMoreButton().click();
    const realizedSubjectModel = await fixture.infoCardItems();

    expect(realizedSubjectModel).toEqual(expectedSubjectModel);
  });

  test("should create the correct info card for a subject with no information", async ({ fixture }) => {
    fixture.changeSubject({});
    const expectedSubjectModel = [];

    const realizedSubjectModel = await fixture.infoCardItems();
    expect(realizedSubjectModel).toEqual(expectedSubjectModel);
  });

  test("should handle a subject with empty value fields", async ({ fixture }) => {
    const subjectModel: Subject = {
      name: "",
      age: 0,
      location: undefined,
      occupation: "",
      company: "",
      hobbies: undefined,
    };
    const expectedSubjectModel = [
      { key: "name", value: "" },
      { key: "age", value: "0" },
      { key: "location", value: "" },
      { key: "occupation", value: "" },
      { key: "company", value: "" },
      { key: "hobbies", value: "" },
    ];

    await fixture.changeSubject(subjectModel);
    await fixture.showMoreButton().click();

    const realizedSubjectModel = await fixture.infoCardItems();
    expect(realizedSubjectModel).toEqual(expectedSubjectModel);
  });

  test("should handle changing the value of the subject model", async ({ fixture }) => {
    const subjectModel: Subject = {
      name: "John Doe",
      age: 52,
    };
    const newModel: Subject = {
      ...subjectModel,
      age: 53,
    };

    const expectedSubjectModel = [
      { key: "name", value: "John Doe" },
      { key: "age", value: "53" },
    ];

    await fixture.changeSubject(subjectModel);
    await fixture.changeSubject(newModel);
    const realizedSubjectModel = await fixture.infoCardItems();

    expect(realizedSubjectModel).toEqual(expectedSubjectModel);
  });
});
