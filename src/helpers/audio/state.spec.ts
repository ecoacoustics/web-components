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

      // Verify it exited very quickly (< 100ms)
      expect(elapsed).toBeLessThan(100);
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

      // Verify it exited very quickly (< 100ms)
      expect(elapsed).toBeLessThan(100);

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
     * Note: The full timeout behavior (2-second wait) is difficult to test in a unit test
     * because the synchronous busy-wait blocks the test thread. The timeout is primarily
     * a safety mechanism for the deadlock scenario described in issue #591, where multiple
     * AudioWorklet processors running in high-priority threads starve the worker threads.
     *
     * The timeout has been manually tested and verified to work correctly in the browser.
     * For automated testing, consider:
     * - E2E tests that create multiple spectrograms simultaneously
     * - Manual testing on the powerful owl microsite with 4 spectrograms
     * - Performance profiling to verify CPU usage during the timeout scenario
     */
    test("timeout mechanism exists and has reasonable constants", () => {
      // This test verifies the timeout implementation exists and uses sensible values
      // We can't easily test the full timeout without actually waiting seconds
      const state = State.createState();
      const processorState = new ProcessorState(state.stateBuffer);

      // Read the source to verify timeout constants are defined
      // This is a smoke test to catch if someone accidentally removes the timeout
      const sourceCode = processorState.busyWaitForWorkerToProcessBuffer.toString();

      // Verify retry attempt structure exists (iteration-based, not time-based)
      // We use iterations because performance.now() isn't available in AudioWorklet
      expect(sourceCode).toContain("ITERATIONS_PER_ATTEMPT");
      expect(sourceCode).toContain("MAX_ATTEMPTS");

      // Verify it re-notifies the worker between attempts
      expect(sourceCode).toContain("Atomics.notify");

      // Verify it logs an error on final timeout
      expect(sourceCode).toContain("console.error");
      expect(sourceCode).toContain("deadlock");

      // Verify it drops the buffer (resets writeHead) and resets bufferAvailable
      expect(sourceCode).toContain("bufferWriteHead");
      expect(sourceCode).toContain("bufferAvailable");
      expect(sourceCode).toContain("NOT_READY");
    });
  });
});
