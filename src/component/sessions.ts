/**
 * Session Management Module
 *
 * Handles Browserbase session lifecycle:
 * - Create sessions via API
 * - Track session status
 * - Cleanup sessions (REQUEST_RELEASE)
 */

import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import {
  createSession as createBrowserbaseSession,
  getSession as getBrowserbaseSession,
  completeSession as completeBrowserbaseSession,
  type BrowserbaseConfig,
  type SessionOptions,
} from "./lib/browserbase.js";

/**
 * Create a new Browserbase session
 * Called by job executor
 */
export const createSession = internalAction({
  args: {
    config: v.object({
      apiKey: v.string(),
      projectId: v.string(),
    }),
    options: v.optional(
      v.object({
        timeout: v.optional(v.number()),
        keepAlive: v.optional(v.boolean()),
        region: v.optional(v.string()),
        proxies: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, { config, options }) => {
    // Call Browserbase API to create session
    const session = await createBrowserbaseSession(
      config as BrowserbaseConfig,
      options as SessionOptions,
    );

    // Store session in database
    const sessionId = await ctx.runMutation(internal.sessions.insertSession, {
      sessionId: session.id,
      projectId: session.projectId,
      connectUrl: session.connectUrl,
      seleniumRemoteUrl: session.seleniumRemoteUrl,
      status: session.status,
      region: session.region || undefined,
      expiresAt: new Date(session.expiresAt).getTime(),
      createdAt: Date.now(),
    });

    return {
      id: sessionId,
      sessionId: session.id,
      connectUrl: session.connectUrl,
      seleniumRemoteUrl: session.seleniumRemoteUrl,
      status: session.status,
    };
  },
});

/**
 * Insert session into database
 */
export const insertSession = internalMutation({
  args: {
    sessionId: v.string(),
    projectId: v.string(),
    connectUrl: v.string(),
    seleniumRemoteUrl: v.string(),
    status: v.union(
      v.literal("RUNNING"),
      v.literal("ERROR"),
      v.literal("TIMED_OUT"),
      v.literal("COMPLETED"),
    ),
    region: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", args);
  },
});

/**
 * Get session from database
 */
export const getSession = internalQuery({
  args: { sessionRecordId: v.id("sessions") },
  handler: async (ctx, { sessionRecordId }) => {
    return await ctx.db.get(sessionRecordId);
  },
});

/**
 * Update session status from Browserbase API
 */
export const updateSessionStatus = internalAction({
  args: {
    sessionRecordId: v.id("sessions"),
    config: v.object({
      apiKey: v.string(),
      projectId: v.string(),
    }),
  },
  handler: async (ctx, { sessionRecordId, config }) => {
    // Get session from database
    const session = await ctx.runQuery(internal.sessions.getSession, {
      sessionRecordId,
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Poll Browserbase API for status
    const bbSession = await getBrowserbaseSession(
      config as BrowserbaseConfig,
      session.sessionId,
    );

    // Update database
    await ctx.runMutation(internal.sessions.updateSession, {
      sessionRecordId,
      status: bbSession.status,
      startedAt: bbSession.startedAt
        ? new Date(bbSession.startedAt).getTime()
        : undefined,
      endedAt: bbSession.endedAt
        ? new Date(bbSession.endedAt).getTime()
        : undefined,
      avgCpuUsage: bbSession.avgCpuUsage,
      memoryUsage: bbSession.memoryUsage,
      proxyBytes: bbSession.proxyBytes,
    });

    return bbSession.status;
  },
});

/**
 * Update session in database
 */
export const updateSession = internalMutation({
  args: {
    sessionRecordId: v.id("sessions"),
    status: v.union(
      v.literal("RUNNING"),
      v.literal("ERROR"),
      v.literal("TIMED_OUT"),
      v.literal("COMPLETED"),
    ),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    avgCpuUsage: v.optional(v.number()),
    memoryUsage: v.optional(v.number()),
    proxyBytes: v.optional(v.number()),
  },
  handler: async (ctx, { sessionRecordId, ...updates }) => {
    await ctx.db.patch(sessionRecordId, updates);
  },
});

/**
 * Cleanup session (REQUEST_RELEASE)
 * Called when job finishes or times out
 */
export const cleanupSession = internalAction({
  args: {
    sessionRecordId: v.id("sessions"),
    config: v.object({
      apiKey: v.string(),
      projectId: v.string(),
    }),
  },
  handler: async (ctx, { sessionRecordId, config }) => {
    // Get session from database
    const session = await ctx.runQuery(internal.sessions.getSession, {
      sessionRecordId,
    });

    if (!session) {
      console.warn(`Session ${sessionRecordId} not found during cleanup`);
      return;
    }

    // Skip if already completed
    if (session.status === "COMPLETED" || session.status === "TIMED_OUT") {
      console.log(
        `Session ${session.sessionId} already ${session.status}, skipping cleanup`,
      );
      return;
    }

    try {
      // Call Browserbase API to REQUEST_RELEASE
      const bbSession = await completeBrowserbaseSession(
        config as BrowserbaseConfig,
        session.sessionId,
      );

      // Update database
      await ctx.runMutation(internal.sessions.updateSession, {
        sessionRecordId,
        status: bbSession.status,
        endedAt: Date.now(),
      });

      console.log(`Session ${session.sessionId} cleaned up successfully`);
    } catch (error: any) {
      console.error(
        `Failed to cleanup session ${session.sessionId}:`,
        error.message,
      );
      // Still mark as completed in database
      await ctx.runMutation(internal.sessions.updateSession, {
        sessionRecordId,
        status: "COMPLETED",
        endedAt: Date.now(),
      });
    }
  },
});
