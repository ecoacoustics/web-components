
export class Profiler {
    private firstSample = 0;
    private lastSample = 0;
    private samples: number[] = [];
  
    constructor(private name: string) {}
  
    public addSample(value: number): void {
      if (this.samples.length === 0) {
        this.firstSample = performance.now();
      }
      this.samples.push(value);
      this.lastSample = performance.now();
    }
  
    public addSamples(values: number[]): void {
      if (this.samples.length === 0) {
        this.firstSample = performance.now();
      }
      this.samples = this.samples.concat(values);
      this.lastSample = performance.now();
    }
  
    public calculate() {
      // calculate basic stats
      let min = Infinity,
        max = -Infinity,
        sum = 0;
      this.samples.forEach((value) => {
        if (value < min) min = value;
        if (value > max) max = value;
        sum += value;
      });
  
      const elapsed = this.lastSample - this.firstSample;
      const result = {
        name: this.name,
        min,
        max,
        sum,
        average: sum / this.samples.length,
        length: this.samples.length,
        elapsed,
      };
  
      this.samples = [];
      this.firstSample = 0;
      this.lastSample = 0;
  
      return result;
    }
  }
