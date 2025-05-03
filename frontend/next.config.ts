import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 禁用无关的Next.js功能
  images: {
    unoptimized: true,
  },
  // 关闭严格模式，避免开发时重复渲染引起的问题
  reactStrictMode: false,
};

export default nextConfig;
