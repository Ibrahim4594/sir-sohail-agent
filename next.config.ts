import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Hide Next.js dev indicator overlay — it sits in the corner where our
  // feedback affordance lives and distracts during demos.
  devIndicators: false,
};

export default nextConfig;
