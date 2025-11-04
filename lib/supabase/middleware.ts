import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  // For now, allow all requests to proceed
  // Auth will be handled client-side on protected routes
  return supabaseResponse
}
