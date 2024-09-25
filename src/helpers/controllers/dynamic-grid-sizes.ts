import { Signal } from "@lit-labs/preact-signals";
import { VerificationGridComponent } from "../../components/verification-grid/verification-grid";
import { Size } from "../../models/rendering";
import { Pixel, UnitInterval } from "../../models/unitConverters";

export interface GridShape {
  rows: number;
  columns: number;
  strength?: number;
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
    let debounceTimeout: number | undefined;

    this.isOverlapping.subscribe((value: boolean) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = window.setTimeout(() => {
        if (value) {
          this.handleIntersection();
        }
      }, 500);
    });
  }

  private targetElement: VerificationGridComponent;
  private candidateShapes: GridShape[] = [];
  private containerSize: Size = { width: 0, height: 0 };
  // private minimumGridCellSize: Size = { width: 0, height: 0 };
  private minimumGridCellSize: Size = { width: 300, height: 300 };
  private isOverlapping: Signal<boolean>;
  private target = 0;
  private displacementMaximum = 0;

  public setTarget(target: number): void {
    this.target = target;
    this.displacementMaximum = 0;
    this.candidateShapes = this.generateSearchTargetBuffer(target);
    this.nextGridShape();
  }

  private handleResize(container: ResizeObserverEntry): void {
    this.containerSize = container.contentRect;
    this.setTarget(this.target);
  }

  private handleIntersection(): void {
    this.nextGridShape();
  }

  /**
   * This function will start a process that picks the most optimal grid size
   * it might not pick a grid size that fits exactly.
   * In this case, the intersection handler will be called to try a different
   * grid size.
   */
  private nextGridShape(): void {
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
    // this.candidateShapes.forEach((shape) => {
    //   console.log(shape);
    // });

    const nextBufferCandidate = this.candidateShapes.shift();
    if (nextBufferCandidate) {
      return nextBufferCandidate;
    }

    // because we have exhausted all the candidate grid shapes, we want to
    // generate new candidates
    const displacementRange = 2;
    const displacementStart = this.displacementMaximum + 1;
    const displacementEnd = this.displacementMaximum + displacementRange;

    const newCandidates = this.generateSearchTargetBuffer(this.target, displacementStart, displacementEnd, false);
    this.candidateShapes.push(...newCandidates);

    return this.nextCandidateShape();
  }

  // because we might overflow above and below the target, we generate possible
  // grid shapes that are within a certain range of the target
  private generateSearchTargetBuffer(
    target: number,
    displacementStart = 1,
    displacementLimit = 2,
    includeTarget = true,
  ): GridShape[] {
    const candidateTargets: GridShape[][] = [];
    if (includeTarget) {
      candidateTargets.push(this.sortByEligibility(this.candidateShapesForTarget(target)));
    }

    for (let displacement = displacementStart; displacement <= displacementLimit; displacement++) {
      const lowerTarget = target - displacement;
      const upperTarget = target + displacement;

      // we push the upper candidates first so that they are preferred if we
      // cannot exactly match the target
      const upperCandidates = this.candidateShapesForTarget(upperTarget);
      if (upperCandidates.length > 0) {
        candidateTargets.push(this.sortByEligibility(upperCandidates));
      }

      if (lowerTarget > 0) {
        const lowerCandidates = this.candidateShapesForTarget(lowerTarget);
        if (lowerCandidates.length > 0) {
          candidateTargets.push(this.sortByEligibility(lowerCandidates));
        }
      }
    }

    this.displacementMaximum = Math.max(displacementLimit, this.displacementMaximum);

    return candidateTargets.flat();
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

        const willFit = this.willFitShape({ columns, rows });
        if (willFit) {
          candidateShapes.push({ columns, rows });
        }
      }
    }

    return candidateShapes;
  }

  private sortByEligibility(shapes: GridShape[]): GridShape[] {
    for (const shape of shapes) {
      const strength = this.gridAspectRatioSimilarity(this.containerSize, shape);
      shape.strength = strength;
    }

    const sortCallback = (a: GridShape, b: GridShape): number => (a.strength ?? 0) - (b.strength ?? 0);
    return shapes.sort(sortCallback);
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
    console.debug({ difference, targetAspectRatio, candidateSizeAspectRatio }, gridShape);
    return difference;
  }

  private willFitShape(gridShape: GridShape): boolean {
    const minimumTileWidth: Pixel = this.minimumGridCellSize.width;
    const minimumTileHeight: Pixel = this.minimumGridCellSize.height;

    const proposedTileSize = this.gridCellSizeForShape(gridShape);

    const meetsMinimumWidth = proposedTileSize.width >= minimumTileWidth;
    const meetsMinimumHeight = proposedTileSize.height >= minimumTileHeight;

    return meetsMinimumHeight && meetsMinimumWidth;
  }

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
