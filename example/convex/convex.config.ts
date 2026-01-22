import { defineApp } from "convex/server";
import stagehand from "convex-stagehand/convex.config";

const app = defineApp();
app.use(stagehand, { name: "stagehand" });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default app as any;
