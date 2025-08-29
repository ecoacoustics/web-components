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
        console.debug(`writing subject ${subject}, current buffer size: ${subjects.length}`);
        return new Promise(async (resolve) => {
          subjects.push(subject);

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
      },
    });

    this.subjectCount = () => subjects.length;
  }

  public closeStream(): void {
    this.resumeWriter();
    this._closed = true;
  }

  public async setTarget(value: number): Promise<void> {
    if (value < 0) {
      throw new Error("Invalid target value");
    }

    if (value <= this.subjectCount()) {
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
