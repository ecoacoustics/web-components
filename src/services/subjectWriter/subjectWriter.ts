import { SubjectWrapper } from "../../models/subject";

export class SubjectWriter extends WritableStream<SubjectWrapper> {
  public get closed(): boolean {
    return this._closed;
  }

  private readonly subjectCount: () => number;
  private writerShouldResume?: () => void;
  private writerReachedTarget?: () => void;
  private target = 0;
  private _closed = false;

  // Added cached promise fields to avoid creating a new Promise each call
  private resumePromise?: Promise<void>;
  private pausePromise?: Promise<void>;

  public constructor(subjects: SubjectWrapper[]) {
    super({
      write: async (subject) => {
        console.debug(`writing subject`, subject, `current buffer size: ${subjects.length}`);
        return new Promise(async (resolve) => {
          // We do a pre-check of the subjects array so if the writer submits
          // items to the stream, we don't immediately append the item to the
          // subject array without knowing if it should be added.
          //
          // Additionally, we use a "while" loop here because if the pauseWriter
          // is resolved, the conditions that we might have rejected the subject
          // on originally might have changed, so we use a while loop to
          // re-evaluate the append conditions when the subjectWriter resumes.
          // Note because this while loop is in a promise, it will not block the
          // main thread.
          while (subjects.length >= this.target) {
            await this.pauseWriter();
          }

          subjects.push(subject);

          // We do a post-check of the subjects array for because if we resolve
          // the write() promise without checking the new subjects length we'll
          // fetch another item that we won't use, and will be caught by the
          // guard above.
          if (subjects.length >= this.target) {
            await this.pauseWriter();
          }

          resolve();
        });
      },
      close: () => {
        // If the stream is closed we have reached the end of the dataset and we
        // should release any promises that are waiting for the target to be
        // reached.
        this.closeStream();
      },
    });

    this.subjectCount = () => subjects.length;
  }

  public async closeStream(): Promise<void> {
    this._closed = true;
    this.pauseWriter();
  }

  public async setTarget(newTarget: number): Promise<void> {
    if (newTarget < 0) {
      throw new Error("Invalid target value. Target must be a non-negative number.");
    }

    if (this.closed) {
      console.error("Cannot set target on closed SubjectWriter");
      return;
    }

    // If we have enough items to satisfy the new target, we don't have to await
    // anything, and we can just return.
    if (newTarget <= this.subjectCount()) {
      return;
    }

    // If the requested target is already satisfied or not greater than current
    // target, return the existing resume promise so callers can await it.
    if (newTarget > this.target) {
      this.target = newTarget;
    }

    return this.resumeWriter();
  }

  /**
   * Unlocks the subject buffer WriteableStream and returns a promise that will
   * resolve when the writeable stream has reached its target or the end of the
   * data source.
   */
  private resumeWriter(): Promise<void> {
    // Return existing resume promise if already created.
    if (this.resumePromise) {
      return this.resumePromise;
    }

    this.writerShouldResume?.();

    this.resumePromise = new Promise((resolve) => {
      this.writerReachedTarget = () => {
        resolve();
        // clear cached promise and resolver reference
        this.resumePromise = undefined;
        this.writerReachedTarget = undefined;
      };
    });

    return this.resumePromise;
  }

  /**
   * Pauses the writer and returns a promise that will will resolve when the
   * writer should resume fetching items.
   */
  private pauseWriter(): Promise<void> {
    // Return existing pause promise if already created.
    if (this.pausePromise) {
      return this.pausePromise;
    }

    this.writerReachedTarget?.();

    this.pausePromise = new Promise((resolve) => {
      this.writerShouldResume = () => {
        resolve();
        // clear cached promise and resolver reference
        this.pausePromise = undefined;
        this.writerShouldResume = undefined;
      };
    });

    return this.pausePromise;
  }
}
