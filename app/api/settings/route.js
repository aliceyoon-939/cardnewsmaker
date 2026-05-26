import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ENV_PATH = path.join(process.cwd(), '.env.local')
const KEYS = ['YOUTUBE_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'ELEVENLABS_API_KEY']

function parseEnv(content) {
  const result = {}
  for (const line of content.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) result[match[1].trim()] = match[2].trim()
  }
  return result
}

function buildEnv(obj) {
  return Object.entries(obj).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'
}

export async function GET() {
  try {
    const content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : ''
    const env = parseEnv(content)
    const data = {}
    for (const key of KEYS) {
      const val = env[key] || ''
      data[key] = val ? val.slice(0, 8) + '•'.repeat(Math.max(0, val.length - 8)) : ''
      data[`${key}_set`] = !!val
    }
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : ''
    const env = parseEnv(content)
    for (const key of KEYS) {
      if (body[key] !== undefined && body[key] !== '') {
        env[key] = body[key]
      }
    }
    fs.writeFileSync(ENV_PATH, buildEnv(env), 'utf-8')
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
