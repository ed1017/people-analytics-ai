import type { NextConfig } from "next";

const diagnosticPreview=process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='codex/pr208-bounded-preview-20261011';

const nextConfig: NextConfig = {
  ...(diagnosticPreview?{env:{NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true'}}:{}),
};

export default nextConfig;
