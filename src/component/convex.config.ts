import { defineComponent } from "convex/server";
import workpool from "@convex-dev/workpool/convex.config";

const component = defineComponent("browserbase");
component.use(workpool, { name: "jobQueue" });

export default component;
