/**
 * Real-World Browser Automation Examples using Playwright with Browserbase
 *
 * This demonstrates the Resend pattern:
 * 1. Component creates Browserbase session
 * 2. Component calls this user action with connectUrl
 * 3. User action performs automation (Playwright, Puppeteer, etc.)
 * 4. User action reports success/failure back to component
 */

import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Real-World Example 1: Scrape HackerNews Top Stories
 *
 * Extracts the top 5 stories from HackerNews homepage
 */
export const scrapeHackerNewsAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({
      maxStories: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    const startTime = Date.now();

    try {
      console.log(`[HackerNews] Starting job ${jobId}`);
      const { chromium } = await import("playwright-core");

      const browser = await chromium.connectOverCDP(connectUrl);
      const context = browser.contexts()[0];
      const page = context.pages()[0];

      console.log(`[HackerNews] Navigating to HackerNews...`);
      await page.goto("https://news.ycombinator.com", {
        waitUntil: "networkidle",
      });

      // Extract top stories
      const maxStories = params.maxStories || 5;
      const stories = await page.evaluate((max) => {
        const items = Array.from(document.querySelectorAll(".athing")).slice(
          0,
          max,
        );
        return items.map((item) => {
          const titleEl = item.querySelector(".titleline > a");
          const scoreRow = item.nextElementSibling;
          const scoreEl = scoreRow?.querySelector(".score");
          const ageEl = scoreRow?.querySelector(".age");

          return {
            rank: item.querySelector(".rank")?.textContent || "",
            title: titleEl?.textContent || "",
            url: titleEl?.getAttribute("href") || "",
            score: scoreEl?.textContent || "0 points",
            age: ageEl?.textContent || "",
          };
        });
      }, maxStories);

      await browser.close();

      const duration = Date.now() - startTime;

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: {
          stories,
          count: stories.length,
          scrapedAt: new Date().toISOString(),
        },
        metrics: { duration },
      });

      console.log(
        `[HackerNews] Successfully scraped ${stories.length} stories`,
      );
    } catch (error: any) {
      console.error(`[HackerNews] Job ${jobId} failed:`, error.message);
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});

/**
 * Real-World Example 2: Check GitHub Repository Info
 *
 * Extracts repository stats and information
 */
export const scrapeGitHubRepoAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({
      owner: v.string(),
      repo: v.string(),
    }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    const startTime = Date.now();

    try {
      console.log(
        `[GitHub] Starting job ${jobId} for ${params.owner}/${params.repo}`,
      );
      const { chromium } = await import("playwright-core");

      const browser = await chromium.connectOverCDP(connectUrl);
      const context = browser.contexts()[0];
      const page = context.pages()[0];

      const url = `https://github.com/${params.owner}/${params.repo}`;
      console.log(`[GitHub] Navigating to ${url}...`);
      await page.goto(url, { waitUntil: "networkidle" });

      // Wait for page to fully load
      await page.waitForTimeout(3000);

      // Extract repository information (piece by piece to avoid eval errors)
      const name = await page.evaluate(() => {
        const title = document.querySelector("title")?.textContent || "";
        return title.split(":")[0].trim() || title.split("·")[0].trim();
      });

      const description = await page.evaluate(() => {
        return (
          document
            .querySelector('meta[property="og:description"]')
            ?.getAttribute("content") || ""
        );
      });

      const stars = await page.evaluate(() => {
        const starLink = document.querySelector('a[href$="/stargazers"]');
        if (starLink) {
          const match = starLink.textContent?.match(/[\d,]+/);
          return match ? match[0] : "0";
        }
        return "0";
      });

      const forks = await page.evaluate(() => {
        const forkLink = document.querySelector('a[href$="/forks"]');
        if (forkLink) {
          const match = forkLink.textContent?.match(/[\d,]+/);
          return match ? match[0] : "0";
        }
        return "0";
      });

      const language = await page.evaluate(() => {
        return (
          document
            .querySelector('[itemprop="programmingLanguage"]')
            ?.textContent?.trim() || ""
        );
      });

      const topics = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a.topic-tag")).map(
          (el) => el.textContent?.trim() || "",
        );
      });

      const repoInfo = {
        name,
        description,
        stars,
        forks,
        language,
        topics,
      };

      await browser.close();

      const duration = Date.now() - startTime;

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: {
          ...repoInfo,
          url,
          scrapedAt: new Date().toISOString(),
        },
        metrics: { duration },
      });

      console.log(
        `[GitHub] Successfully scraped ${params.owner}/${params.repo}`,
      );
    } catch (error: any) {
      console.error(`[GitHub] Job ${jobId} failed:`, error.message);
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});

/**
 * Real-World Example 3: Scrape Product Hunt Today's Products
 *
 * Gets the top products from Product Hunt
 */
export const scrapeProductHuntAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({
      maxProducts: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    const startTime = Date.now();

    try {
      console.log(`[ProductHunt] Starting job ${jobId}`);
      const { chromium } = await import("playwright-core");

      const browser = await chromium.connectOverCDP(connectUrl);
      const context = browser.contexts()[0];
      const page = context.pages()[0];

      console.log(`[ProductHunt] Navigating to Product Hunt...`);
      await page.goto("https://www.producthunt.com", {
        waitUntil: "networkidle",
      });

      // Wait for products to load
      await page.waitForSelector("article", { timeout: 10000 });

      // Extract products
      const maxProducts = params.maxProducts || 5;
      const products = await page.evaluate((max) => {
        const articles = Array.from(document.querySelectorAll("article")).slice(
          0,
          max,
        );
        return articles.map((article, idx) => {
          const getName = () => {
            const h3 = article.querySelector("h3");
            return h3?.textContent?.trim() || "";
          };

          const getDescription = () => {
            const desc = article.querySelector(
              '[class*="tagline"], [class*="description"]',
            );
            return desc?.textContent?.trim() || "";
          };

          const getUpvotes = () => {
            const button = article.querySelector('[class*="vote"]');
            const text = button?.textContent?.trim() || "0";
            return text.match(/\d+/)?.[0] || "0";
          };

          return {
            rank: idx + 1,
            name: getName(),
            description: getDescription(),
            upvotes: getUpvotes(),
          };
        });
      }, maxProducts);

      await browser.close();

      const duration = Date.now() - startTime;

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: {
          products,
          count: products.length,
          scrapedAt: new Date().toISOString(),
        },
        metrics: { duration },
      });

      console.log(
        `[ProductHunt] Successfully scraped ${products.length} products`,
      );
    } catch (error: any) {
      console.error(`[ProductHunt] Job ${jobId} failed:`, error.message);
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});

/**
 * Example: Multi-step automation with form interaction
 */
export const fillFormAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({
      url: v.string(),
      formData: v.object({
        email: v.string(),
        name: v.optional(v.string()),
      }),
    }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    const startTime = Date.now();

    try {
      const { chromium } = await import("playwright-core");

      const browser = await chromium.connectOverCDP(connectUrl);
      const context = browser.contexts()[0];
      const page = context.pages()[0];

      console.log(`[User Action] Navigating to ${params.url}`);
      await page.goto(params.url);

      // Fill form fields
      await page.fill('input[name="email"]', params.formData.email);
      if (params.formData.name) {
        await page.fill('input[name="name"]', params.formData.name);
      }

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for navigation or success message
      await page
        .waitForURL(/success|thank-you/, { timeout: 10000 })
        .catch(() => {
          // Alternative: wait for success message
          return page.waitForSelector(".success-message", { timeout: 5000 });
        });

      const successUrl = page.url();

      await browser.close();

      const duration = Date.now() - startTime;

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: {
          success: true,
          successUrl,
        },
        metrics: { duration },
      });
    } catch (error: any) {
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});

/**
 * Example: Advanced - Extract data from multiple pages
 */
export const crawlPagesAction = internalAction({
  args: {
    jobId: v.id("browserbase:jobs"),
    connectUrl: v.string(),
    params: v.object({
      startUrl: v.string(),
      maxPages: v.number(),
    }),
  },
  handler: async (ctx, { jobId, connectUrl, params }) => {
    const startTime = Date.now();

    try {
      const { chromium } = await import("playwright-core");

      const browser = await chromium.connectOverCDP(connectUrl);
      const context = browser.contexts()[0];
      const page = context.pages()[0];

      const results = [];
      const visited = new Set<string>();
      const toVisit = [params.startUrl];

      while (toVisit.length > 0 && results.length < params.maxPages) {
        const url = toVisit.shift()!;
        if (visited.has(url)) continue;

        console.log(`[User Action] Visiting: ${url}`);
        await page.goto(url);
        visited.add(url);

        // Extract data
        const title = await page.title();
        const content = await page.textContent("body");

        results.push({
          url,
          title,
          contentLength: content?.length || 0,
        });

        // Find more links (limit to same domain)
        const links = await page.$$eval(
          "a[href]",
          (anchors, baseUrl) => {
            return anchors
              .map((a) => {
                const href = a.getAttribute("href");
                if (!href) return null;
                try {
                  const url = new URL(href, baseUrl);
                  return url.hostname === new URL(baseUrl).hostname
                    ? url.href
                    : null;
                } catch {
                  return null;
                }
              })
              .filter(Boolean);
          },
          params.startUrl,
        );

        toVisit.push(
          ...links.filter((link) => !visited.has(link!)).slice(0, 5),
        );
      }

      await browser.close();

      const duration = Date.now() - startTime;

      await ctx.runMutation(api.browserbase._completeJob, {
        jobId,
        result: {
          pagesVisited: results.length,
          results,
        },
        metrics: { duration },
      });
    } catch (error: any) {
      await ctx.runMutation(api.browserbase._failJob, {
        jobId,
        error: error.message,
      });
    }
  },
});
