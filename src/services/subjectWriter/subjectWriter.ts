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
        this.writerReachedTarget?.();
        this.closeStream();
      },
    });

    this.subjectCount = () => subjects.length;
  }

  public async closeStream(): Promise<void> {
    this.pauseWriter();
    this._closed = true;
  }

  public async setTarget(value: number): Promise<void> {
    if (value < 0) {
      throw new Error("Invalid target value");
    }

    if (this.closed) {
      console.error("Cannot set target on closed SubjectWriter");
      return;
    }

    if (value <= this.subjectCount() || value <= this.target) {
      return;
    }

    this.target = value;
    await this.resumeWriter();
  }

  /**
   * Unlocks the subject buffer WriteableStream and returns a promise that will
   * resolve when the writeable stream has reached its target or the end of the
   * data source.
   */
  private resumeWriter(): Promise<void> {
    this.writerShouldResume?.();
    return new Promise((resolve) => {
      this.writerReachedTarget = resolve;
    });
  }

  /**
   * Pauses the writer and returns a promise that will will resolve when the
   * writer should resume fetching items.
   */
  private pauseWriter(): Promise<void> {
    this.writerReachedTarget?.();
    return new Promise((resolve) => {
      this.writerShouldResume = resolve;
    });
  }
}
