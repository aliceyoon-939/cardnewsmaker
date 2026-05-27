import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

export async function POST(req) {
  const { dataUrl } = await req.json()
  if (!dataUrl) return NextResponse.json({ error: '이미지 데이터 없음' }, { status: 400 })

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Cloudinary 키가 설정되지 않았습니다 (설정 페이지에서 등록)' },
      { status: 500 }
    )
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })

  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: 'kpop-cardnews',
      resource_type: 'image',
    })
    return NextResponse.json({ url: result.secure_url })
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Cloudinary 업로드 실패' }, { status: 500 })
  }
}
