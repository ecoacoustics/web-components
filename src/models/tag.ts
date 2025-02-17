export type TagName = string;

export interface Tag {
  text: TagName;

  id?: number;
  reference?: Record<PropertyKey, unknown> | null;

  // we use elementReferences to display slotted content as the tag label
  // TODO: we should find a more correct solution
  elementReferences?: ReadonlyArray<Element>;
}
