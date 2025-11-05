import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const maxFileSize = 10 * 1024 * 1024
    if (file.size > maxFileSize) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    const uniqueName = `receipts/${Date.now()}-${file.name}`

    const blob = await put(uniqueName, file, {
      access: "public",
    })

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Failed to upload receipt. Please try again." }, { status: 500 })
  }
}
