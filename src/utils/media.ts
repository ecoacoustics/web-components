import Globals from './globals';
import MediaException from './mediaException';

/**
 * Get the media element when the component loads or is updated
 */

const htmlElement = Globals._win.HTMLElement.prototype;
const htmlMediaElement = Globals._win.HTMLMediaElement.prototype;

export function getMedia(element: string, owner: typeof htmlElement): typeof htmlMediaElement | null {
  const mediaSource = owner.querySelector(`#${element}`);

  // Warn if no element has been set
  if (!element) {
    Globals._logger.warn('No HTMLMediaElement was defined');

    // If the HTMLELement does not throw an error
  } else if (!mediaSource) {
    throw new MediaException(`The HTMLElement ${element} does not exist`);

    // If mediaSource HTMLElement is a HTMLMediaElement
  } else if (typeof mediaSource === typeof htmlMediaElement || mediaSource.id === 'allow-unsafe') {
    // Cast from HTMLElement to HTMLMediaElement and return mediaSource
    return mediaSource as typeof htmlMediaElement;

    // If the HTMLElement is not a HTMLMediaElement throw an error
  } else {
    throw new MediaException(`The HTMLElement ${element} is not a HTMLMediaElement`);
  }

  return null;
}
