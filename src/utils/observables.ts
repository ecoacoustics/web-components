import * as rxjs from 'rxjs';

export function resizeObservable(elem) {
  return new rxjs.Observable(subscriber => {
    var ro = new ResizeObserver(entries => {
      subscriber.next(entries);
    });

    // Observe one or multiple elements
    ro.observe(elem);
    return function unsubscribe() {
      ro.unobserve(elem);
    };
  });
}
