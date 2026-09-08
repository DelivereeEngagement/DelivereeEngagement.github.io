import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS ? "/deliveree-driver-hub" : "",
  assetPrefix: process.env.GITHUB_ACTIONS ? "/deliveree-driver-hub/" : ""
};

export default nextConfig;
