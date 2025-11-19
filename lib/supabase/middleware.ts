import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase environment variables not found in middleware, skipping auth check')
      return supabaseResponse
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              supabaseResponse = NextResponse.next({
                request,
              })
              supabaseResponse.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    await supabase.auth.getUser()
  } catch (error) {
    console.error('Error in middleware:', error)
  }

  return supabaseResponse
}
