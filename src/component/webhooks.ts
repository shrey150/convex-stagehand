import { internalAction, internalMutation } from "./_generated/server.js";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";

/**
 * Send webhook notification for job completion
 */
export const sendWebhook = internalAction({
  args: {
    jobId: v.id("jobs"),
    webhookUrl: v.string(),
    attemptNumber: v.number(),
  },
  handler: async (ctx, { jobId, webhookUrl, attemptNumber }) => {
    // Get job details
    const job = await ctx.runQuery(internal.jobs.getJobStatus, { jobId });
    if (!job) {
      console.error(`Job ${jobId} not found for webhook delivery`);
      return;
    }

    // Build webhook payload
    const payload = {
      event: job.status === "completed" ? "job.completed" : "job.failed",
      timestamp: Date.now(),
      job: {
        id: jobId,
        status: job.status,
        result: job.result,
        error: job.error,
        timing: {
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          durationMs:
            job.startedAt && job.completedAt
              ? job.completedAt - job.startedAt
              : undefined,
        },
      },
    };

    // Create delivery record
    const deliveryId = await ctx.runMutation(internal.webhooks.createDelivery, {
      jobId,
      webhookUrl,
      payload,
      attemptNumber,
    });

    try {
      // Send HTTP POST
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Convex-Stagehand/1.0",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();

      // Record success
      await ctx.runMutation(internal.webhooks.updateDelivery, {
        deliveryId,
        status: "sent",
        statusCode: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit to 1KB
        sentAt: Date.now(),
      });
    } catch (error: any) {
      // Record failure
      await ctx.runMutation(internal.webhooks.updateDelivery, {
        deliveryId,
        status: "failed",
        error: error.message || "Unknown error",
      });

      // Retry with exponential backoff (max 3 attempts)
      if (attemptNumber < 3) {
        const backoffMs = Math.pow(2, attemptNumber) * 1000; // 2s, 4s, 8s
        await ctx.scheduler.runAfter(backoffMs, internal.webhooks.sendWebhook, {
          jobId,
          webhookUrl,
          attemptNumber: attemptNumber + 1,
        });
      } else {
        console.error(
          `Webhook delivery failed after ${attemptNumber} attempts for job ${jobId}`,
        );
      }
    }
  },
});

/**
 * Create webhook delivery record
 */
export const createDelivery = internalMutation({
  args: {
    jobId: v.id("jobs"),
    webhookUrl: v.string(),
    payload: v.any(),
    attemptNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookDeliveries", {
      jobId: args.jobId,
      webhookUrl: args.webhookUrl,
      payload: args.payload,
      attemptNumber: args.attemptNumber,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

/**
 * Update webhook delivery record
 */
export const updateDelivery = internalMutation({
  args: {
    deliveryId: v.id("webhookDeliveries"),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    statusCode: v.optional(v.number()),
    responseBody: v.optional(v.string()),
    error: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, { deliveryId, ...updates }) => {
    await ctx.db.patch(deliveryId, updates);
  },
});
