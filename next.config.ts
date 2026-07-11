import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // `lucide-react` is already in Next's own default optimizePackageImports
    // list, so it is deliberately not repeated here. `radix-ui` is not on that
    // list and is a dependency (components.json / src/components/ui), so
    // barrel-importing from it would otherwise pull in every primitive.
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
