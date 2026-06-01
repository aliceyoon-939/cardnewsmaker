const path = require('path')
const fs = require('fs')

// workspace root 감지 오류로 .env.local이 안 읽힐 때를 대비해 직접 로드
const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^=\s#][^=]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['cloudinary'],
}
module.exports = nextConfig
