export class Annotation {
  public constructor(data: Annotation) {
    this.startOffset = data.startOffset;
    this.endOffset = data.endOffset;
    this.lowFrequency = data.lowFrequency;
    this.highFrequency = data.highFrequency;
    this.tags = data.tags;
    this.reference = data.reference;
    this.validations = data.validations;
  }

  startOffset: number;
  endOffset: number;
  lowFrequency: number;
  highFrequency: number;
  tags: Tag[];
  reference: object;
  validations: Validation[];
}

export class Tag {
  public constructor(data: Tag) {
    this.text = data.text;
    this.reference = data.reference;
  }

  text: string;
  reference: object;
}

export class Validation {
  public constructor(data: Validation) {
    this.target = data.target;
    this.confirmed = data.confirmed;

    const target = data.target;
    if (target instanceof Tag) {
      this.target = target;
    } else {
      this.target = new Tag(target);
    }
  }

  target: Tag;
  confirmed: boolean;

  // points to a domain model with user ids
  reference?: object;
}
