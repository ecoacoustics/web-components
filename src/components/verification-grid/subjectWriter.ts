import { SubjectWrapper } from "../../models/subject";

export class SubjectWriter extends WritableStream<SubjectWrapper> {
  private readonly subjects: SubjectWrapper[] = [];
  private target = 0;

  private unlockWriter?: (...args: any[]) => void;

  private releaseTargetLock?: () => void;
  private targetLock = new Promise<void>((resolve) => {
    this.releaseTargetLock = resolve;
  });

  public constructor(subjects: SubjectWrapper[]) {
    super({
      write: async (subject) => {
        return new Promise(async (resolve) => {
          this.subjects.push(subject);

          if (this.subjects.length >= this.target) {
            this.releaseTargetLock?.();
            return new Promise((res) => {
              this.unlockWriter = res;
            });
          }

          resolve();
        });
      },
    });

    this.subjects = subjects;
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

    await this.targetLock;
  }
}
