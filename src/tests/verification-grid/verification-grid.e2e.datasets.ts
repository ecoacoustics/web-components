// This array can be returned from a getPage callback function for tests that
// require a partially verified dataset that doesn't also need to test reading
// local files.
//
// By using a static array inside of the code, it improves diff views, reduces
// the number of Git LFS assets, and stops public/ directory pollution.
//
// Using "as const" means that if you hover over the mock dataset in a test it
// will show the actual values of the dataset so you don't have to open the
// source file.
export const partialVerifiedSubjects = [
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    Tag: "koala",
    oe_tag: "Insects",
    verified: false,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    Tag: "koala",
    oe_tag: "Noisy Miner",
    verified: true,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    Tag: "koala",
  },
  // In this example, we don’t have an oe_tag value, so while the verified state
  // should be shown, the tag that was verified should be empty.
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    verified: false,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 5.04581928253174,
    verified: false,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 5.04581928253174,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 5.04581928253174,
    oe_tag: "Insects",
    verified: false,
  },
] as const;

export const partialCompleteCompound = [
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    Tag: "koala",
    verified: false,
    oe_tag: "Koala",
    oe_new_tag: "Brush Turkey",
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    Tag: "koala",
    oe_tag: "Noisy Miner",
    verified: true,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    Tag: "koala",
    oe_tag: "Insects",
    verified: true,
    oe_new_tag: "Panda",
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 5.04581928253174,
    oe_tag: "Noisy Miner",
    verified: true,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 5.04581928253174,
    oe_new_tag: "Brush Turkey",
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 5.04581928253174,
    oe_tag: "Insects",
    verified: false,
  },
] as const;

export const fullyCompleteVerified = [
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    Tag: "koala",
    verified: true,
    oe_tag: "Koala",
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    Tag: "koala",
    oe_tag: "Noisy Miner",
    verified: true,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    Tag: "koala",
    oe_tag: "Insects",
    verified: true,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 4.84603595733643,
    oe_tag: "Noisy Miner",
    verified: true,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 5.04581928253174,
    oe_tag: "Noisy Miner",
    verified: true,
  },
  {
    AudioLink: "http://localhost:3000/example2.flac",
    Distance: 5.04581928253174,
    oe_tag: "Insects",
    verified: false,
  },
] as const;

export const emptyDataset = [];
