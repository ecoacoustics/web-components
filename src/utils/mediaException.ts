export default class MediaException extends Error {
  constructor(message) {
    super(message);
    this.name = 'MediaException';
  }
}
