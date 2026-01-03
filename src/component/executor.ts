/**
 * Job Executor
 *
 * Orchestrates job execution:
 * 1. Creates Browserbase session
 * 2. Links session to job
 * 3. Calls user's automation action with connectUrl
 * 4. Handles errors and cleanup
 */

import { internalAction } from "./_generated/server.js";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";

/**
 * Execute a job
 * Called by scheduler when job is ready
 */
export const executeJob = internalAction({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    console.log(`[Executor] Starting job ${jobId}`);

    try {
      // 1. Get job details
      const job = await ctx.runQuery(internal.jobs.getJobForExecution, {
        jobId,
      });
      if (!job) {
        throw new Error("Job not found");
      }

      console.log(`[Executor] Creating Browserbase session for job ${jobId}`);

      // 2. Create Browserbase session
      const session = await ctx.runAction(internal.sessions.createSession, {
        config: job.config,
        options: job.sessionOptions,
      });

      console.log(
        `[Executor] Session ${session.sessionId} created with connectUrl: ${session.connectUrl}`,
      );

      // 3. Link session to job
      await ctx.runMutation(internal.jobs.linkSession, {
        jobId,
        sessionId: session.id,
      });

      console.log(`[Executor] Calling user action: ${job.userAction}`);

      // 4. Call user's automation action with session connectUrl
      // The user action is responsible for calling completeJob or failJob
      try {
        // Call the user's action with the required parameters
        // Note: We use a fire-and-forget pattern here. The user action
        // will call _completeJob or _failJob when done.
        await ctx.scheduler.runAfter(0, job.userAction as any, {
          jobId,
          connectUrl: session.connectUrl,
          params: job.params,
        });

        console.log(
          `[Executor] User action ${job.userAction} has been scheduled`,
        );
        console.log(
          `[Executor] Job ${jobId} is now running, waiting for user action to complete/fail it`,
        );
      } catch (error: any) {
        console.error(`[Executor] Error scheduling user action:`, error);
        throw error;
      }
    } catch (error: any) {
      console.error(`[Executor] Job ${jobId} failed:`, error.message);

      // Mark job as failed
      await ctx.runMutation(internal.jobs.failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});
