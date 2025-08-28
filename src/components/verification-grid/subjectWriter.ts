import { SubjectWrapper } from "../../models/subject";

export class SubjectWriter extends WritableStream<SubjectWrapper> {
  public closed = false;

  private readonly subjects: SubjectWrapper[] = [];
  private target = 0;

  private unlockWriter?: (...args: any[]) => void;
  private releaseTargetLock?: () => void;

  public constructor(subjects: SubjectWrapper[]) {
    super({
      write: async (subject) => {
        return new Promise(async (resolve) => {
          this.subjects.push(subject);

          if (this.subjects.length >= this.target) {
            this.releaseTargetLock?.();
            await new Promise((res) => {
              this.unlockWriter = res;
            });
          }

          resolve();
        });
      },
    });

    this.subjects = subjects;
  }

  public closeStream(): void {
    this.releaseTargetLock?.();
    super.close();

    this.closed = true;
  }

  public async setTarget(value: number): Promise<void> {
    if (value < 0) {
      throw new Error("Invalid target value");
    }

    if (value <= this.subjects.length) {
      return;
    }

    this.target = value;
    this.unlockWriter?.();

    await this.createTargetLock();
  }

  private createTargetLock(): Promise<void> {
    return new Promise((resolve) => {
      this.releaseTargetLock = resolve;
    });
  }
}
