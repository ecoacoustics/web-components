import { expect, expectConsoleError, test } from "../../tests/assertions";
import { SubjectWriter } from "./subjectWriter";

test("should create in the correct state", () => {
  const writer = new SubjectWriter([]);

  expect(writer.locked).toBe(false);
  expect(writer.closed).toBe(false);

  // The reason why we can use the SubjectWriter as a WritableStream is because
  // it has the WriteableStream class in its prototype chain.
  expect(writer).toBeInstanceOf(WritableStream);
});

test("should be able to write from a stream that immediately closes", async () => {
  const subjects = [];
  const writer = new SubjectWriter(subjects);

  // This readableStream will close as soon as the first item is pulled.
  // Meaning that it will be active when attached to the writer, but will only
  // close once the first item is requested.
  // This makes it harder for this test to pass because the pipeTo will have to
  // wait until the stream is closed.
  const readableStream = new ReadableStream({
    pull(controller) {
      controller.close();
    },
  });

  await expect(readableStream.pipeTo(writer)).resolves.toBeUndefined();

  // We expect that the subjects array is still empty and has not been modified
  expect(subjects).toEqual([]);
});

test("should not write any items until a target is set", async ({ page }) => {
  const subjects = [];
  const writer = new SubjectWriter(subjects);

  const testItem = { id: 1, name: "test" };
  const readableStream = new ReadableStream({
    pull(controller) {
      controller.enqueue(testItem);
      controller.close();
    },
  });

  // We don't want to await the pipeTo call because that would block the test
  // until the stream was closed.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  readableStream.pipeTo(writer);

  // TODO: Remove this hack to wait until the first item is written
  await page.waitForTimeout(1000);

  expect(subjects).toEqual([]);

  await writer.setTarget(1);

  expect(subjects).toEqual([testItem]);
});

test("should be able to change the target", async () => {
  const subjects = [];
  const writer = new SubjectWriter(subjects);

  const testItem = { id: 1, name: "test" };
  const readableStream = new ReadableStream({
    pull(controller) {
      controller.enqueue(testItem);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  readableStream.pipeTo(writer);

  await writer.setTarget(1);
  expect(subjects).toEqual([testItem]);

  await writer.setTarget(2);
  expect(subjects).toEqual([testItem, testItem]);

  await writer.setTarget(25);
  expect(subjects).toHaveLength(25);

  // If we set the target to a value lower than the current length, we should
  // see that the setTarget promise resolves immediately and that the subjects
  // array does not change.
  await writer.setTarget(10);
  expect(subjects).toHaveLength(25);
});
