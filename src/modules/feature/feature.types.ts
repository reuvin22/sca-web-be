import type { z } from "zod";
import type { featureQuerySchema } from "./feature.validator";

export type FeatureQuery = z.infer<typeof featureQuerySchema>;
