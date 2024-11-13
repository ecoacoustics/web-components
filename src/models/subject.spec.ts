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
  const classificationDecision = new Classification(decisionOutcome, decisionTag);

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
      oe_sloth: decisionOutcome,
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

  const verificationDecision = new Verification(DecisionOptions.TRUE, testVerificationTag);
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
  const model = new SubjectWrapper(subjectTest.subject, "https://api.ecosounds.org", subjectTest.tag);

  const testDecisions = subjectTest.decisions ?? [];
  for (const decision of testDecisions) {
    model.addDecision(decision);
  }

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
        const classificationArray = Array.from(model.classifications.values());
        expect(classificationArray).toEqual(testCase.expectedClassifications);
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
    const testedTag: Tag = { text: "foo" };

    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", testedTag);
    const hasTag = subject.hasTag(testedTag);

    expect(hasTag).toEqual(false);
  });

  test("should behave correctly for a subject with only classifications", () => {
    const testedTag: Tag = { text: "foo" };
    const decisionTag: Tag = { text: "bar" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", testedTag);

    const decision = new Classification(DecisionOptions.TRUE, decisionTag);
    subject.addDecision(decision);

    const hasTag = subject.hasTag(decisionTag);
    expect(hasTag).toEqual(true);
  });

  test("should not return true if the subject tag doesn't have a decision, but there are classifications", () => {
    const testedTag: Tag = { text: "foo" };
    const decisionTag: Tag = { text: "bar" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", testedTag);

    const decision = new Classification(DecisionOptions.TRUE, decisionTag);
    subject.addDecision(decision);

    const hasTag = subject.hasTag(testedTag);
    expect(hasTag).toEqual(false);
  });

  test("should behave correctly for a subject with only a verification", () => {
    const testedTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", testedTag);

    const decision = new Verification(DecisionOptions.TRUE);
    subject.addDecision(decision);

    // I have purposely not used the "testedTag" object during the assertion so
    // that this test also asserts that the tag references don't need to be the
    // same for the hasTag method to work
    const hasTag = subject.hasTag({ text: "foo" });
    expect(hasTag).toEqual(true);
  });

  test("should behave correctly for a subject with both verification and classification decisions", () => {
    const subjectTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", subjectTag);

    // notice we create the verification without a tag
    // this is to test that the subject model can correctly add its own tag to
    // the verification decision
    const verification = new Verification(DecisionOptions.TRUE);
    subject.addDecision(verification);

    const classification = new Classification(DecisionOptions.TRUE, { text: "classification tag" });
    subject.addDecision(classification);

    const hasVerificationTag = subject.hasTag(subjectTag);
    expect(hasVerificationTag).toEqual(true);

    // I don't re-use the same tag object in this test to assert that the
    // tag references don't need to be the same for the hasTag method to work
    const hasClassificationTag = subject.hasTag({ text: "classification tag" });
    expect(hasClassificationTag).toEqual(true);
  });

  test("should behave correctly for a subject with overlapping verification and classification tags", () => {
    const testedTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", testedTag);

    const verification = new Verification(DecisionOptions.TRUE);
    subject.addDecision(verification);

    const classification = new Classification(DecisionOptions.TRUE, testedTag);
    subject.addDecision(classification);

    const hasTag = subject.hasTag(testedTag);
    expect(hasTag).toEqual(true);
  });
});

test.describe("addDecision", () => {
  test("should add a new verification decision", () => {
    const subjectTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", subjectTag);

    const verificationDecision = DecisionOptions.TRUE;
    const decision = new Verification(verificationDecision);
    subject.addDecision(decision);

    // the expected verification is not the same as the decision model that we
    // passed to the addDecision method because we expect the SubjectWrapper to
    // add its own tag to the decision
    const expectedVerification = new Verification(verificationDecision, subjectTag);
    expect(subject.verification).toEqual(expectedVerification);

    // we also expect that the applied decision has a new reference
    // we want to ensure that the decision applied to the SubjectWrapper is a
    // new instance of the input decision model so that when we add the tag
    // property, it doesn't update the tag on every other subject model
    //
    // by using the not.toBe matcher, we are asserting that the references are
    // not the same
    expect(subject.verification).not.toBe(decision);
  });

  test("should overwrite an existing verification decision", () => {
    const subjectTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", subjectTag);

    const initialDecision = new Verification(DecisionOptions.TRUE);
    subject.addDecision(initialDecision);

    const newVerificationDecision = DecisionOptions.FALSE;
    const newDecision = new Verification(newVerificationDecision);
    subject.addDecision(newDecision);

    // similar to the previous test, we expect that the subject model will add
    // its own tag to the decision when addDecision is called
    const expectedNewDecision = new Verification(newVerificationDecision, subjectTag);
    expect(subject.verification).toEqual(expectedNewDecision);
  });

  test("should add a new classification decision", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });

    const decision = new Classification(DecisionOptions.TRUE, { text: "bar" });
    subject.addDecision(decision);

    const expectedMap = new Map<string, Classification>([[decision.tag.text, decision]]);
    const realizedMap = subject.classifications;
    expect(realizedMap).toEqual(expectedMap);
  });

  test("should overwrite an existing classification decision if it has the same tag", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });

    const initialDecision = new Classification(DecisionOptions.TRUE, { text: "bar" });
    subject.addDecision(initialDecision);

    const newDecision = new Classification(DecisionOptions.FALSE, { text: "bar" });
    subject.addDecision(newDecision);

    const expectedMap = new Map<string, Classification>([[newDecision.tag.text, newDecision]]);
    const realizedMap = subject.classifications;
    expect(realizedMap).toEqual(expectedMap);
  });

  test("should add a new tag to an existing map if the tag doesn't exist", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });

    const initialDecision = new Classification(DecisionOptions.TRUE, { text: "bar" });
    subject.addDecision(initialDecision);

    const newDecision = new Classification(DecisionOptions.FALSE, { text: "baz" });
    subject.addDecision(newDecision);

    const expectedMap = new Map<string, Classification>([
      [initialDecision.tag.text, initialDecision],
      [newDecision.tag.text, newDecision],
    ]);
    const realizedMap = subject.classifications;
    expect(realizedMap).toEqual(expectedMap);
  });
});

test.describe("removeDecision", () => {
  test("should have no effect on a subject with no decisions", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });

    // I have added a condition to Playwright to fail the test if anything
    // throws an error
    // therefore this test will fail if the removeDecision method errors
    subject.removeDecision(new Verification(DecisionOptions.TRUE));

    expect(subject.verification).toBeUndefined();
    expect(subject.classifications.size).toEqual(0);
  });

  test("should have no effect if the decision doesn't exist", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });

    const unappliedDecision = new Verification(DecisionOptions.FALSE);
    subject.removeDecision(unappliedDecision);

    expect(subject.verification).toBeUndefined();
    expect(subject.classifications.size).toEqual(0);
  });

  test("should be able to remove a verification decision", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });
    const decision = new Verification(DecisionOptions.TRUE);

    subject.addDecision(decision);
    subject.removeDecision(decision);

    expect(subject.verification).toBeUndefined();
  });

  test("should be able to remove a classification decision", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });
    const decision = new Classification(DecisionOptions.TRUE, { text: "bar" });

    subject.addDecision(decision);
    subject.removeDecision(decision);

    expect(subject.classifications.size).toEqual(0);
  });

  test("should be able to remove a verification while there is a classification of the same tag", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });
    const verification = new Verification(DecisionOptions.TRUE);
    const classification = new Classification(DecisionOptions.TRUE, { text: "foo" });

    subject.addDecision(verification);
    subject.addDecision(classification);
    subject.removeDecision(verification);

    expect(subject.verification).toBeUndefined();
    expect(subject.classifications.size).toEqual(1);
    expect(subject.classifications.get("foo")).toEqual(classification);
  });

  test("should be able to remove a classification while there is a verification of the same tag", () => {
    const subjectTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", subjectTag);

    const verification = new Verification(DecisionOptions.TRUE);
    const classification = new Classification(DecisionOptions.TRUE, subjectTag);

    subject.addDecision(verification);
    subject.addDecision(classification);
    subject.removeDecision(classification);

    expect(subject.verification).not.toBeUndefined();
    expect(subject.classifications.size).toEqual(0);
  });
});

test.describe("skipUndecided", () => {
  test("should add skip decision for missing verification", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });

    subject.skipUndecided(true, []);

    expect(subject.verification?.confirmed).toEqual(DecisionOptions.SKIP);
  });

  test("should add skip decisions for missing classifications", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });
    const requiredTags = [{ text: "bar" }, { text: "baz" }];

    subject.skipUndecided(false, requiredTags);

    expect(subject.classifications.get("bar")?.confirmed).toEqual(DecisionOptions.SKIP);
    expect(subject.classifications.get("baz")?.confirmed).toEqual(DecisionOptions.SKIP);
  });

  test("should not overwrite existing decisions", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });
    const existingDecision = new Classification(DecisionOptions.TRUE, { text: "bar" });

    subject.addDecision(existingDecision);
    subject.skipUndecided(false, [{ text: "bar" }]);

    expect(subject.classifications.get("bar")).toEqual(existingDecision);
  });

  test("should handle both verification and classification skips", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });
    const requiredTags = [{ text: "bar" }, { text: "baz" }];

    subject.skipUndecided(true, requiredTags);

    expect(subject.verification?.confirmed).toEqual(DecisionOptions.SKIP);
    expect(subject.classifications.get("bar")?.confirmed).toEqual(DecisionOptions.SKIP);
    expect(subject.classifications.get("baz")?.confirmed).toEqual(DecisionOptions.SKIP);
  });
});

test.describe("hasDecision", () => {
  test("should return false for a subject with no decisions", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });

    const testedVerification = new Verification(DecisionOptions.TRUE);
    const testedClassification = new Classification(DecisionOptions.TRUE, { text: "bar" });

    const hasVerification = subject.hasDecision(testedVerification);
    const hasClassification = subject.hasDecision(testedClassification);

    expect(hasVerification).toEqual(false);
    expect(hasClassification).toEqual(false);
  });

  test("should return true for a subject with a verification decision", () => {
    const subjectTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", subjectTag);

    const decisionOutcome = DecisionOptions.TRUE;
    const appliedDecision = new Verification(decisionOutcome);
    subject.addDecision(appliedDecision);

    // I create a new verification decision and test if the subject has the
    // decision to test that the comparison is based on the decisions tag, and
    // not by the decisions object reference
    //
    // additionally, note that this verification model does not have a tag
    // this was done intentionally because we need to support testing comparing
    // verification decisions where we do not know the tag
    const testedDecision = new Verification(decisionOutcome);
    const hasDecision = subject.hasDecision(testedDecision);

    expect(hasDecision).toEqual(true);
  });

  test("should return true for a subject with a classification decision", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });

    const decisionOutcome = DecisionOptions.TRUE;
    const decisionTag: Tag = { text: "bar" };
    const decision = new Classification(decisionOutcome, decisionTag);
    subject.addDecision(decision);

    // similar to the previous test, I create a new classification decision and
    // test if it exists on the subject model to assert that the hasDecision
    // method compares decisions based on tags and not object references
    const testedDecision = new Classification(decisionOutcome, decisionTag);
    const hasDecision = subject.hasDecision(testedDecision);

    expect(hasDecision).toEqual(true);
  });

  test("should not match a verification decision with a classification decision that has the same tag", () => {
    const testedTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", testedTag);

    const classificationDecision = new Classification(DecisionOptions.TRUE, testedTag);
    subject.addDecision(classificationDecision);

    const unappliedVerification = new Verification(DecisionOptions.TRUE);

    const hasVerificationDecision = subject.hasDecision(unappliedVerification);
    expect(hasVerificationDecision).toEqual(false);
  });

  test("should not match a classification decision with a verification decision that has the same tag", () => {
    const subjectTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", subjectTag);

    const verificationDecision = new Verification(DecisionOptions.TRUE);
    subject.addDecision(verificationDecision);

    const unappliedClassification = new Classification(DecisionOptions.TRUE, subjectTag);

    const hasClassificationDecision = subject.hasDecision(unappliedClassification);
    expect(hasClassificationDecision).toEqual(false);
  });
});

test.describe("skipUndecided", () => {
  test("should apply a skip decision to a subject that has a missing verification", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });
    subject.skipUndecided(true, []);
    expect(subject.verification?.confirmed).toEqual(DecisionOptions.SKIP);
  });

  test("should apply a skip decision to a subject that has a missing classification", () => {
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", { text: "foo" });
    subject.skipUndecided(false, [{ text: "bar" }]);
    expect(subject.classifications.get("bar")?.confirmed).toEqual(DecisionOptions.SKIP);
  });

  test("should apply a skip decision to a subject that has missing verifications and classifications", () => {
    const subjectTag: Tag = { text: "foo" };
    const subject = new SubjectWrapper({}, "https://api.ecosounds.org", subjectTag);
    subject.skipUndecided(true, [{ text: "bar" }]);

    const expectedVerification = new Verification(DecisionOptions.SKIP, subjectTag);
    const expectedClassifications = new Map<string, Decision>([
      ["bar", new Classification(DecisionOptions.SKIP, { text: "bar" })],
    ]);

    expect(subject.verification).toEqual(expectedVerification);
    expect(subject.classifications).toEqual(expectedClassifications);
  });
});
