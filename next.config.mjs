/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Self-contained server.js bundle for cPanel "Setup Node.js App".
  output: "standalone",
};

export default nextConfig;
