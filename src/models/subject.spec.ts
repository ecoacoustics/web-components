import { expect, test } from "../tests/assertions";
import { Classification } from "./decisions/classification";
import { Decision, DecisionOptions } from "./decisions/decision";
import { Verification } from "./decisions/verification";
import { DownloadableResult, Subject, SubjectWrapper } from "./subject";
import { Tag } from "./tag";

interface SubjectWrapperTest {
  name: string;
  subject: Subject;
  tag: Tag;

  decisions?: Decision[];

  expectedVerification?: Verification;
  expectedClassifications?: Classification[] | never[];
  expectedDownloadableResult?: Partial<DownloadableResult>;
}

const fakeSubject: Subject = {
  additionalData: {
    data: "This is some additional data that should be included in results",
    dateTime: new Date().toISOString(),
  },
  additionalText: "you should see this in the results",
  arrayTest: [1, 2, 3, 4],
};

function testVerificationDecision(): SubjectWrapperTest {
  const testedTag = { text: "cow" };
  const decisionOutcome = DecisionOptions.TRUE;
  const verificationDecision = new Verification(decisionOutcome, testedTag);

  return {
    name: "subject with a verification decision",
    subject: fakeSubject,
    tag: testedTag,
    decisions: [verificationDecision],
    expectedVerification: verificationDecision,
    expectedClassifications: [],

    // because the user has made a decision, we expect that additional
    // properties have been added to the orignal subject model for the verified
    // tag and the decision applied to that tag
    expectedDownloadableResult: {
      ...fakeSubject,
      oe_tag: testedTag.text,
      oe_confirmed: decisionOutcome,
    },
  };
}

function testClassificationDecision(): SubjectWrapperTest {
  const decisionOutcome = DecisionOptions.FALSE;
  const decisionTag = { text: "sloth" };
  const classificationDecision = new Classification(
    decisionOutcome,
    decisionTag,
  );

  return {
    name: "subject with a classification decision",
    subject: fakeSubject,

    // note that the verification tag is not the same as the classification tag
    // in this test we assert that only the classification property is added
    // because there was no verification decision about the subjects tag
    tag: { text: "owl" },
    decisions: [classificationDecision],
    expectedVerification: undefined,
    expectedClassifications: [classificationDecision],
    expectedDownloadableResult: {
      ...fakeSubject,
      "oe_sloth": decisionOutcome,
    },
  };
}

function testMultipleClassificationDecisions(): SubjectWrapperTest {
  const classificationDecisions: Classification[] = [
    new Classification(DecisionOptions.FALSE, { text: "absent bird" }),
    new Classification(DecisionOptions.TRUE, { text: "present bird" }),
  ];

  return {
    name: "subject with a multiple classification decisions",
    subject: fakeSubject,

    // note that the verification tag is not the same as the classification tag
    // in this test we assert that only the classification property is added
    // because there was no verification decision about the subjects tag
    tag: { text: "owl" },
    decisions: classificationDecisions,
    expectedVerification: undefined,
    expectedClassifications: classificationDecisions,
    expectedDownloadableResult: {
      ...fakeSubject,
      "oe_absent bird": DecisionOptions.FALSE,
      "oe_present bird": DecisionOptions.TRUE,
    } as any,
  };
}

// additional tags is represented as a verification decision and one or several
// classification decisions
function testAdditionalTagsDecision(): SubjectWrapperTest {
  const testVerificationTag: Tag = { text: "cat" };

  const verificationDecision = new Verification(
    DecisionOptions.TRUE,
    testVerificationTag,
  );
  const classificationDecisions = [
    new Classification(DecisionOptions.TRUE, { text: "male" }),
    new Classification(DecisionOptions.FALSE, { text: "female" }),
  ];

  return {
    name: "subject with additional tags (verification + classifications)",
    subject: fakeSubject,
    tag: testVerificationTag,
    decisions: [verificationDecision, ...classificationDecisions],
    expectedVerification: verificationDecision,
    expectedClassifications: classificationDecisions,
    expectedDownloadableResult: {
      ...fakeSubject,
      oe_tag: testVerificationTag.text,
      oe_confirmed: DecisionOptions.TRUE,
      oe_male: DecisionOptions.TRUE,
      oe_female: DecisionOptions.FALSE,
    },
  };
}

const tests: SubjectWrapperTest[] = [
  {
    name: "empty subject",
    subject: {},
    tag: { text: "" },
    expectedVerification: undefined,
    expectedClassifications: [],
    expectedDownloadableResult: {},
  },
  {
    name: "subject without decisions",
    subject: fakeSubject,
    tag: { text: "birb" },
    expectedVerification: undefined,
    expectedClassifications: [],
    // because the user has not made any decisions, we behave as if the subject
    // has not been modified until a decision is made
    // we therefore expect that the original model is returned without
    // modification when we download the results
    expectedDownloadableResult: fakeSubject as DownloadableResult,
  },
  testVerificationDecision(),
  testClassificationDecision(),
  testMultipleClassificationDecisions(),
  testAdditionalTagsDecision(),
];

function createSubjectWrapper(subjectTest: SubjectWrapperTest): SubjectWrapper {
  const model = new SubjectWrapper(
    subjectTest.subject,
    "https://api.ecosounds.org",
    subjectTest.tag,
  );

  const testDecisions = subjectTest.decisions ?? [];
  for (const decision of testDecisions) {
    model.addDecision(decision);
  }

  console.log(testDecisions);

  return model;
}

test.describe("subject shapes", () => {
  for (const testCase of tests) {
    test.describe(testCase.name, () => {
      test("should have the correct verification models", () => {
        const model = createSubjectWrapper(testCase);
        expect(model.verification).toEqual(testCase.expectedVerification);
      });

      test("should have the correct classification models", () => {
        const model = createSubjectWrapper(testCase);
        expect(model.classifications).toEqual(testCase.expectedClassifications);
      });

      test("should have the correct downloadable result", () => {
        const model = createSubjectWrapper(testCase);

        const expectedResult = testCase.expectedDownloadableResult;
        const realizedResult = model.toDownloadable();

        expect(realizedResult).toEqual(expectedResult);
      });
    });
  }
});

test.describe("hasTag", () => {
  test("should return the correct value for a subject with no decisions", () => {
    const testedTag = { text: "foo" };

    const subject = new SubjectWrapper(
      {},
      "https://api.ecosounds.org",
      testedTag,
    );
    const hasTag = subject.hasTag(testedTag);

    expect(hasTag).toEqual(false);
  });

  test("should return the correct value for a subject without the tag", () => {
    const testedTag = { text: "foo" };
    const decisionTag = { text: "bar" };
    const subject = new SubjectWrapper(
      {},
      "https://api.ecosounds.org",
      testedTag,
    );

    const decision = new Decision(DecisionOptions.TRUE, decisionTag);
    subject.addDecision(decision);

    const hasTag = subject.hasTag(testedTag);

    expect(hasTag).toEqual(false);
  });

  test("should return the correct value for a subject with the tag", () => {
    const testedTag = { text: "foo" };
    const subject = new SubjectWrapper(
      {},
      "https://api.ecosounds.org",
      testedTag,
    );

    const decision = new Decision(DecisionOptions.TRUE, testedTag);
    subject.addDecision(decision);

    const hasTag = subject.hasTag(testedTag);
    expect(hasTag).toEqual(true);
  });
});
