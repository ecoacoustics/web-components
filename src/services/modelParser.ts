import { camelCase, dotCase, pascalCase, snakeCase, kebabCase, sentenceCase, noCase } from "change-case";

export type CandidateKey = string;
export type Transformer = Record<string, CandidateKey[]>;

const uppercaseTransformer = (value: string): string => value.toUpperCase();
const loweCaseTransformer = (value: string): string => value.toLowerCase();

// you can create parsers from this abstract service by extending it and
// implementing the parse method
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class ModelParser<T> {
  protected constructor() {}

  public abstract parse(model: Record<string, any>): T;

  // this function takes a model and a transformer
  // it searches through the values in the transformer and checks to see if the key exists in the model
  // if it does, then the models key is updated with the key from the transformer
  protected static deriveModel(original: Record<string, unknown>, transformer: Transformer): Record<string, unknown> {
    const model: Record<string, unknown> = {};

    for (const [target, candidateKeys] of Object.entries(transformer)) {
      for (const candidateKey of candidateKeys) {
        if (original[candidateKey]) {
          model[target] = original[candidateKey];
        }
      }
    }

    return model;
  }

  private static getKeyPermutations(key: string): string[] {
    const supportedCasings = [
      camelCase,
      snakeCase,
      dotCase,
      pascalCase,
      kebabCase,
      noCase,
      sentenceCase,
      uppercaseTransformer,
      loweCaseTransformer,
    ];
    return supportedCasings.map((casing) => casing(key));
  }

  protected static keyTransformer(key: string[]): string[] {
    return key.flatMap(ModelParser.getKeyPermutations);
  }
}
