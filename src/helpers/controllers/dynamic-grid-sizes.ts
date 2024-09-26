import { Signal } from "@lit-labs/preact-signals";
import { VerificationGridComponent } from "../../components/verification-grid/verification-grid";
import { Size } from "../../models/rendering";
import { Pixel, UnitInterval } from "../../models/unitConverters";

export interface GridShape {
  rows: number;
  columns: number;
}

export class DynamicGridSizeController<Container extends HTMLElement> {
  public constructor(container: Container, targetElement: VerificationGridComponent, isOverlapping: Signal<boolean>) {
    this.targetElement = targetElement;
    this.isOverlapping = isOverlapping;

    const resizeObserver = new ResizeObserver((size: ResizeObserverEntry[]) => {
      if (!this.target) return;

      // because we know that this resize observer will only ever be used with
      // one element, we can safely assume that the first element in the array
      // is the container element
      const container = size[0];
      this.handleResize(container);
    });
    resizeObserver.observe(container);

    // because each tile advertises if they are overlapping, we debounce the
    // overlapping signal so that if one grid size causes multiple tiles to
    // overlap (and the signal is set multiple times), we only have to handle
    // the intersection once
    let debounceTimeout: number | undefined;
    this.isOverlapping.subscribe((value: boolean) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = window.setTimeout(() => {
        if (value) {
          this.handleIntersection();
        }
      }, 5);
    });
  }

  private targetElement: VerificationGridComponent;
  private candidateShapes: GridShape[] = [];
  private containerSize: Size = { width: 0, height: 0 };
  private minimumGridCellSize: Size = { width: 300, height: 300 };
  private isOverlapping: Signal<boolean>;
  private target = 0;

  /**
   * Generates a list of candidates for the target and applies the most optimal
   * candidate.
   *
   * If the candidate does not fit, the intersection handler will be called to
   * try the next candidate.
   */
  public setTarget(target: number): void {
    this.target = target;
    this.candidateShapes = this.generateSearchTargetBuffer(target);
    this.applyNextCandidateShape();
  }

  /**
   * Re-generates possible candidates for the new container size
   * and applies the most optimal candidate.
   */
  private handleResize(container: ResizeObserverEntry): void {
    this.containerSize = container.contentRect;
    this.setTarget(this.target);
  }

  private handleIntersection(): void {
    this.applyNextCandidateShape();
  }

  private applyNextCandidateShape(): void {
    const nextCandidate = this.nextCandidateShape();
    this.setGridShape(nextCandidate);
  }

  /**
   * @returns
   * The first candidate shape that is viable.
   * Viability means that we have determined that it will fit in the container
   * and that it hasn't overflowed in the past.
   */
  private nextCandidateShape(): GridShape {
    const nextBufferCandidate = this.candidateShapes.shift();
    if (nextBufferCandidate) {
      return nextBufferCandidate;
    }

    // if we run out of candidates we default to a 1x1 grid
    // this can occur if 1 1x1 grid overflows and we have no other candidates
    // in this case, we want to fall back to a 1x1 grid as "least bad" option
    return { columns: 1, rows: 1 };
  }

  // because we might overflow above and below the target, we generate possible
  // grid shapes that are within a certain range of the target
  private generateSearchTargetBuffer(target: number): GridShape[] {
    // because one is the minimum grid size, we know that if one doesn't fit
    // then nothing will fit.
    // therefore, we do not have to worry about alternative candidate shapes for
    // a grid size of one, and we can short circuit generating candidates
    if (target === 1) {
      return [{ columns: 1, rows: 1 }];
    }

    const candidateTargets: GridShape[] = [];

    candidateTargets.push(
      ...this.candidateShapesForTarget(target),
      ...this.candidateShapesForTarget(target + 1),
      ...this.candidateShapesForTarget(target + 2),
    );

    // find all candidates all down to one
    for (let lowScanTarget = target - 1; lowScanTarget > 0; lowScanTarget--) {
      candidateTargets.push(...this.candidateShapesForTarget(lowScanTarget));
    }

    return this.sortByEligibility(candidateTargets);
  }

  /**
   * Returns all the possible grid shapes that can be used to create a grid of
   * the target size.
   * This function does not check if the grid shape will fit in the container.
   */
  private candidateShapesForTarget(target: number): GridShape[] {
    const candidateShapes: GridShape[] = [];

    // find all the factors of the target grid size
    for (let i = 1; i <= target; i++) {
      const isFactor = target % i === 0;
      if (isFactor) {
        const columns = i;
        const rows = target / i;

        // we have a minimum cell size that a candidate needs to meet
        // because users can provide a custom template of a variable size
        // this function cannot guarantee that the grid will fit in the
        // container.
        // however, we keep this condition in so that we can filter out
        // candidates that will definitely not fit
        const meetsMinimumSize = this.validateShapeCellSize({ columns, rows });
        if (meetsMinimumSize) {
          candidateShapes.push({ columns, rows });
        }
      }
    }

    return candidateShapes;
  }

  /**
   * Sorts the grid shape candidates by two conditions:
   * 1. The distance from the target grid size
   * 2. The similarity between the grid aspect ratio and the container aspect ratio
   */
  private sortByEligibility(shapes: GridShape[]): GridShape[] {
    const sortFunction = (a: GridShape, b: GridShape) => {
      const aSize = a.columns * a.rows;
      const bSize = b.columns * b.rows;

      const aTargetDistance = Math.abs(this.target - aSize);
      const bTargetDistance = Math.abs(this.target - bSize);

      // if two candidates have the same distance from the target, we want to
      // sort the candidates by the similarity between the grid aspect ratio
      if (aTargetDistance === bTargetDistance) {
        const aSimilarity = this.gridAspectRatioSimilarity(this.containerSize, a);
        const bSimilarity = this.gridAspectRatioSimilarity(this.containerSize, b);
        return aSimilarity - bSimilarity;
      }

      return aTargetDistance - bTargetDistance;
    };

    return shapes.sort(sortFunction);
  }

  private setGridShape(shape: GridShape): void {
    this.isOverlapping.value = false;
    this.targetElement.columns = shape.columns;
    this.targetElement.rows = shape.rows;
  }

  /**
   * @description
   * Computes the similarity between the grid aspect ratio and the container
   * aspect ratio
   *
   * @param containerSize - The size of the grid container
   * @param gridShape - The shape of the grid
   *
   * @returns A value between 0 and 1 that represents the similarity between the
   * grid aspect ratio and the container aspect ratio
   */
  private gridAspectRatioSimilarity(containerSize: Size, gridShape: GridShape): UnitInterval {
    const tileSize = this.gridCellSizeForShape(gridShape);
    const targetAspectRatio = containerSize.width / containerSize.height;
    const candidateSizeAspectRatio = tileSize.width / tileSize.height;
    const difference = Math.abs(targetAspectRatio - candidateSizeAspectRatio);
    return difference;
  }

  /**
   * @returns
   * A boolean that represents if the cells in the proposed grid shape meet
   * the minimum cell size requirements.
   */
  private validateShapeCellSize(gridShape: GridShape): boolean {
    const minimumTileWidth: Pixel = this.minimumGridCellSize.width;
    const minimumTileHeight: Pixel = this.minimumGridCellSize.height;

    const proposedTileSize = this.gridCellSizeForShape(gridShape);

    const meetsMinimumWidth = proposedTileSize.width >= minimumTileWidth;
    const meetsMinimumHeight = proposedTileSize.height >= minimumTileHeight;

    return meetsMinimumHeight && meetsMinimumWidth;
  }

  /**
   * @returns
   * A size object that represents the size of a cell in a proposed grid shape
   */
  private gridCellSizeForShape(gridShape: GridShape): Size {
    const usableContainerSize: Size = {
      width: this.containerSize.width,
      height: this.containerSize.height,
    };

    const width = usableContainerSize.width / gridShape.columns;
    const height = usableContainerSize.height / gridShape.rows;

    return { width, height };
  }
}
