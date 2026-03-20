import { expect, test } from "../../tests/assertions";
import { ProcessorState, State } from "./state";

test.describe("ProcessorState", () => {
  test.describe("busyWaitForWorkerToProcessBuffer", () => {
    test("should exit immediately when bufferAvailable is already false", () => {
      // Create a state with a SharedArrayBuffer
      const state = State.createState();
      const processorState = new ProcessorState(state.stateBuffer);

      // Set up the generation to match
      const generation = 1;
      processorState.processorReady(generation);

      // Don't set bufferReady - bufferAvailable should be false
      const startTime = performance.now();

      // This should exit immediately
      processorState.busyWaitForWorkerToProcessBuffer(generation);

      const elapsed = performance.now() - startTime;

      // Verify it exited very quickly (< 200ms)
      expect(elapsed).toBeLessThan(200);
      expect(processorState.bufferAvailable).toBe(false);
    });

    test("should exit immediately when generation does not match", () => {
      // Create a state with a SharedArrayBuffer
      const state = State.createState();
      const processorState = new ProcessorState(state.stateBuffer);

      // Set up one generation
      const generation = 1;
      processorState.processorReady(generation);
      processorState.bufferReady();

      const startTime = performance.now();

      // Try to wait with a different generation - should exit immediately
      processorState.busyWaitForWorkerToProcessBuffer(generation + 1);

      const elapsed = performance.now() - startTime;

      // Verify it exited very quickly (< 200ms)
      expect(elapsed).toBeLessThan(200);

      // Buffer should still be available since we exited due to generation mismatch
      expect(processorState.bufferAvailable).toBe(true);
    });

    test("should track generation correctly across state instances", () => {
      // Create a shared state buffer
      const state = State.createState();
      const processorState = new ProcessorState(state.stateBuffer);
      const mainThreadState = new State(state.stateBuffer);

      // Initial generation should be 0 (default SharedArrayBuffer value)
      expect(mainThreadState.generation).toBe(0);

      // Initial processor ready/complete generations should be -1
      expect(mainThreadState.processorReadyGeneration).toBe(-1);
      expect(mainThreadState.processorCompleteGeneration).toBe(-1);

      // Processor reports ready with generation 0
      const gen0Ready = processorState.processorReady(0);
      expect(gen0Ready).toBe(true);
      expect(mainThreadState.processorReadyGeneration).toBe(0);

      // Main thread resets, incrementing generation from 0 to 1
      const gen1 = mainThreadState.reset();
      expect(gen1).toBe(1);
      expect(mainThreadState.generation).toBe(1);

      // Old processor (gen 0) should now see generation mismatch
      expect(processorState.matchesCurrentGeneration(0)).toBe(false);
      expect(processorState.matchesCurrentGeneration(1)).toBe(true);

      // New processor reports ready with generation 1
      const newProcessorState = new ProcessorState(state.stateBuffer);
      const gen1Ready = newProcessorState.processorReady(1);
      expect(gen1Ready).toBe(true);
      expect(mainThreadState.processorReadyGeneration).toBe(1);
    });

    /**
     * This test exercises the timeout path of busyWaitForWorkerToProcessBuffer by
     * setting up a buffer that will never be processed by a worker. When the method
     * returns, it should have:
     * - Logged an error about the deadlock/timeout, and
     * - Dropped the buffer / reset bufferAvailable.
     *
     * This verifies observable behavior rather than inspecting the function source.
     */
    test("timeout mechanism logs and cleans up on unprocessed buffer", () => {
      const state = State.createState();
      const processorState = new ProcessorState(state.stateBuffer);

      const generation = 1;
      processorState.processorReady(generation);
      // Mark a buffer as ready so the processor will wait for it to be processed.
      processorState.bufferReady();

      // Spy on console.error to ensure a timeout/deadlock is reported.
      const originalConsoleError = console.error;
      let errorCalled = false;
      // eslint-disable-next-line no-console
      console.error = (...args: unknown[]) => {
        errorCalled = true;
        // Preserve existing logging behavior.
        // eslint-disable-next-line no-console
        originalConsoleError.apply(console, args as any);
      };

      try {
        processorState.busyWaitForWorkerToProcessBuffer(generation);
      } finally {
        // Always restore console.error, even if the call throws.
        console.error = originalConsoleError;
      }

      // The timeout path should have logged an error and cleared the buffer.
      expect(errorCalled).toBe(true);
      expect(processorState.bufferAvailable).toBe(false);
    });
  });
});
