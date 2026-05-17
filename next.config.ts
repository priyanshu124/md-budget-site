import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/deep-dive/:path*",
        destination: "https://deep-dive-stage-budget.netlify.app/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
