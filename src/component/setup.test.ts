import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { internal } from "./_generated/api.js";
import schema from "./schema.js";

const modules = import.meta.glob("./**/*.ts");

describe("Browserbase Component", () => {
  async function setupTest() {
    const t = convexTest(schema, modules);
    return t;
  }

  let t: Awaited<ReturnType<typeof setupTest>>;

  beforeEach(async () => {
    vi.useFakeTimers();
    t = await setupTest();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("scheduleJob", () => {
    it("should successfully schedule a job", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: {
          apiKey: "test_api_key",
          projectId: "test_project_id",
        },
        userAction: "internal.testAction.run",
        maxRetries: 2,
      });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe("string");
    });

    it("should create a job with correct initial state", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: {
          apiKey: "test_api_key",
          projectId: "test_project_id",
        },
        userAction: "internal.testAction.run",
        maxRetries: 3,
      });

      const status = await t.query(internal.jobs.getJobStatus, { jobId });

      expect(status).toBeDefined();
      expect(status?.status).toBe("pending");
      expect(status?.retryCount).toBe(0);
      expect(status?.maxRetries).toBe(3);
      expect(status?.result).toBeUndefined();
      expect(status?.error).toBeUndefined();
    });

    it("should set default maxRetries to 0", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: {
          apiKey: "test_api_key",
          projectId: "test_project_id",
        },
        userAction: "internal.testAction.run",
      });

      const status = await t.query(internal.jobs.getJobStatus, { jobId });

      expect(status?.maxRetries).toBe(0);
    });
  });

  describe("getJobStatus", () => {
    it("should return job status for existing job", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: {
          apiKey: "test_api_key",
          projectId: "test_project_id",
        },
        userAction: "internal.testAction.run",
      });

      const status = await t.query(internal.jobs.getJobStatus, { jobId });

      expect(status).toBeDefined();
      expect(status?.id).toBe(jobId);
      expect(status?.status).toBe("pending");
    });
  });

  describe("listJobs", () => {
    it("should return empty array when no jobs exist", async () => {
      const jobs = await t.query(internal.jobs.listJobs, {});

      expect(jobs).toEqual([]);
    });

    it("should list all jobs", async () => {
      // Create multiple jobs
      await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
      });

      await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example2.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
      });

      const jobs = await t.query(internal.jobs.listJobs, {});

      expect(jobs).toHaveLength(2);
    });

    it("should filter jobs by status", async () => {
      // Create a job
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
      });

      // Mark it as completed
      await t.mutation(internal.jobs.completeJob, {
        jobId,
        result: { success: true },
      });

      // Create another pending job
      await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example2.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
      });

      const completedJobs = await t.query(internal.jobs.listJobs, {
        status: "completed",
      });
      const pendingJobs = await t.query(internal.jobs.listJobs, {
        status: "pending",
      });

      expect(completedJobs).toHaveLength(1);
      expect(pendingJobs).toHaveLength(1);
    });

    it("should respect limit parameter", async () => {
      // Create 5 jobs
      for (let i = 0; i < 5; i++) {
        await t.mutation(internal.jobs.scheduleJob, {
          params: { url: `https://example${i}.com` },
          config: { apiKey: "key", projectId: "project" },
          userAction: "internal.test.run",
        });
      }

      const jobs = await t.query(internal.jobs.listJobs, { limit: 3 });

      expect(jobs).toHaveLength(3);
    });
  });

  describe("completeJob", () => {
    it("should mark job as completed with result", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
      });

      await t.mutation(internal.jobs.completeJob, {
        jobId,
        result: { data: "test result" },
        metrics: { duration: 5000 },
      });

      const status = await t.query(internal.jobs.getJobStatus, { jobId });

      expect(status?.status).toBe("completed");
      expect(status?.result).toEqual({ data: "test result" });
      expect(status?.sessionDuration).toBe(5000);
      expect(status?.completedAt).toBeDefined();
    });
  });

  describe("failJob", () => {
    it("should mark job as failed when max retries reached", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
        maxRetries: 0,
      });

      await t.mutation(internal.jobs.failJob, {
        jobId,
        error: "Test error",
      });

      const status = await t.query(internal.jobs.getJobStatus, { jobId });

      expect(status?.status).toBe("failed");
      expect(status?.error).toBe("Test error");
      expect(status?.completedAt).toBeDefined();
    });

    it("should retry when under max retries", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
        maxRetries: 2,
      });

      await t.mutation(internal.jobs.failJob, {
        jobId,
        error: "First attempt failed",
      });

      const status = await t.query(internal.jobs.getJobStatus, { jobId });

      expect(status?.status).toBe("pending"); // Should be pending for retry
      expect(status?.retryCount).toBe(1);
      expect(status?.error).toBe("First attempt failed");
    });

    it("should increment retry count on each failure", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
        maxRetries: 3,
      });

      // First failure
      await t.mutation(internal.jobs.failJob, {
        jobId,
        error: "Attempt 1 failed",
      });
      let status = await t.query(internal.jobs.getJobStatus, { jobId });
      expect(status?.retryCount).toBe(1);
      expect(status?.status).toBe("pending");

      // Second failure
      await t.mutation(internal.jobs.failJob, {
        jobId,
        error: "Attempt 2 failed",
      });
      status = await t.query(internal.jobs.getJobStatus, { jobId });
      expect(status?.retryCount).toBe(2);
      expect(status?.status).toBe("pending");

      // Third failure
      await t.mutation(internal.jobs.failJob, {
        jobId,
        error: "Attempt 3 failed",
      });
      status = await t.query(internal.jobs.getJobStatus, { jobId });
      expect(status?.retryCount).toBe(3);
      expect(status?.status).toBe("pending");

      // Final failure - should mark as failed
      await t.mutation(internal.jobs.failJob, {
        jobId,
        error: "Final attempt failed",
      });
      status = await t.query(internal.jobs.getJobStatus, { jobId });
      expect(status?.retryCount).toBe(3);
      expect(status?.status).toBe("failed");
    });
  });

  describe("cancelJob", () => {
    it("should cancel a pending job", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
      });

      await t.mutation(internal.jobs.cancelJob, { jobId });

      const status = await t.query(internal.jobs.getJobStatus, { jobId });

      expect(status?.status).toBe("cancelled");
      expect(status?.completedAt).toBeDefined();
    });

    it("should throw error when cancelling completed job", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
      });

      await t.mutation(internal.jobs.completeJob, {
        jobId,
        result: { data: "done" },
      });

      await expect(
        t.mutation(internal.jobs.cancelJob, { jobId }),
      ).rejects.toThrow("Job already completed");
    });

    it("should throw error when cancelling already cancelled job", async () => {
      const jobId = await t.mutation(internal.jobs.scheduleJob, {
        params: { url: "https://example.com" },
        config: { apiKey: "key", projectId: "project" },
        userAction: "internal.test.run",
      });

      await t.mutation(internal.jobs.cancelJob, { jobId });

      await expect(
        t.mutation(internal.jobs.cancelJob, { jobId }),
      ).rejects.toThrow("Job already cancelled");
    });
  });
});
