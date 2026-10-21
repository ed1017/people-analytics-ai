import {PREVIEW_9037_PACKAGE} from './lib/dataset-9037-preview-marker.mjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(PREVIEW_9037_PACKAGE?{outputFileTracingIncludes:{'/**':['./.private-9037/integrity-manifest.json','./.private-9037/component-contracts.json','./.private-9037/components.json','./.private-9037/joint-dashboard.json','./.private-9037/captured-62-queries.json']}}:{}),
};

export default nextConfig;
