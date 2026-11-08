/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/resources/:slug',
          has: [
            {
              type: 'query',
              key: 'lang',
              value: '(?<lang>en|hi|bn|ta|te|mr|gu|kn|ml|or|as)',
            },
          ],
          destination: '/resources/:slug/:lang',
        },
      ],
    };
  },
};

export default nextConfig;
