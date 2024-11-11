import { expect, test } from "../tests/assertions";
import { Classification } from "./decisions/classification";
import { Decision, DecisionOptions } from "./decisions/decision";
import { Verification } from "./decisions/verification";
import { DownloadableResult, Subject, SubjectWrapper } from "./subject";
import { Tag } from "./tag";

interface SubjectWrapperTest {
  name: string;
  subject: Subject;
  url: string;
  tag: Tag;

  decisions?: Decision[];

  expectedVerification?: Verification;
  expectedClassifications?: Classification[];
  expectedDownloadableResult?: Partial<DownloadableResult>;
}

const tests: SubjectWrapperTest[] = [
  {
    subject: {
      name: "empty subject",
      subject: {},
      url: "",
      tag: { text: "" },
      decisions: [],
      expectedverification: {},
      expectedClassifications: [],
      expectedDownloadableResult: {},
    },
  },
];

function createSubjectWrapper(subjectTest: SubjectWrapperTest): SubjectWrapper {
  const model = new SubjectWrapper(subjectTest.subject, subjectTest.url, subjectTest.tag);

  const testDecisions = subjectTest.decisions ?? [];
  for (const decision of testDecisions) {
    model.addDecision(decision);
  }

  return model;
}

test.describe("Subject", () => {
  for (const subjectTest of tests) {
    test.describe(subjectTest.name, () => {
      test("should have the correct verification models", () => {
        const model = createSubjectWrapper(subjectTest);
        expect(model.verification).toEqual(subjectTest.expectedVerification);
      });

      test("should have the correct classification models", () => {
        const model = createSubjectWrapper(subjectTest);
        expect(model.classifications).toEqual(subjectTest.expectedClassifications);
      });

      test("should have the correct downloadable result", () => {
        const model = createSubjectWrapper(subjectTest);

        const expectedResult = subjectTest.expectedDownloadableResult;
        const realizedResult = model.toDownloadable();

        expect(realizedResult).toEqual(expectedResult);
      });
    });
  }

  test.describe("hasTag", () => {
    test("should return the correct value for a subject with no decisions", () => {
      const testedTag = { text: "foo" };

      const subject = new SubjectWrapper({}, "url", testedTag);
      const hasTag = subject.hasTag(testedTag);

      expect(hasTag).toEqual(false);
    });

    test("should return the correct value for a subject without the tag", () => {
      const testedTag = { text: "foo" };
      const decisionTag = { text: "bar" };
      const subject = new SubjectWrapper({}, "url", testedTag);

      const decision = new Decision(DecisionOptions.TRUE, decisionTag);
      subject.addDecision(decision);

      const hasTag = subject.hasTag(testedTag);

      expect(hasTag).toEqual(false);
    });

    test("should return the correct value for a subject with the tag", () => {
      const testedTag = { text: "foo" };
      const subject = new SubjectWrapper({}, "url", testedTag);

      const decision = new Decision(DecisionOptions.TRUE, testedTag);
      subject.addDecision(decision);

      const hasTag = subject.hasTag(testedTag);
      expect(hasTag).toEqual(true);
    });
  });
});
