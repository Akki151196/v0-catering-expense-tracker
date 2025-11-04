// This works with the Next.js runtime without external package dependencies

export interface MockUser {
  id: string
  email: string
  user_metadata?: Record<string, any>
}

export interface MockSupabaseClient {
  auth: {
    signInWithPassword: (options: any) => Promise<any>
    signUp: (options: any) => Promise<any>
    signOut: () => Promise<void>
    getUser: () => Promise<any>
    getSession: () => Promise<any>
  }
  from: (table: string) => any
}

let client: MockSupabaseClient | null = null

function createMockClient(): MockSupabaseClient {
  // Get credentials from environment
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.log("[v0] Missing Supabase env vars")
  }

  return {
    auth: {
      signInWithPassword: async (options: any) => {
        try {
          const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: key,
            },
            body: JSON.stringify({
              email: options.email,
              password: options.password,
            }),
          })
          const data = await response.json()
          if (response.ok) {
            localStorage.setItem("sb-auth-token", data.access_token)
            return { data: { user: data.user }, error: null }
          }
          return { data: null, error: { message: "Invalid credentials" } }
        } catch (error: any) {
          return { data: null, error: { message: error.message } }
        }
      },
      signUp: async (options: any) => {
        try {
          const response = await fetch(`${url}/auth/v1/signup`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: key,
            },
            body: JSON.stringify({
              email: options.email,
              password: options.password,
              data: options.data || {},
            }),
          })
          const data = await response.json()
          return { data, error: response.ok ? null : data }
        } catch (error: any) {
          return { data: null, error: { message: error.message } }
        }
      },
      signOut: async () => {
        localStorage.removeItem("sb-auth-token")
      },
      getUser: async () => {
        const token = localStorage.getItem("sb-auth-token")
        if (!token) return { data: null, error: { message: "No session" } }
        try {
          const response = await fetch(`${url}/auth/v1/user`, {
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: key,
            },
          })
          const user = await response.json()
          return { data: user, error: null }
        } catch (error: any) {
          return { data: null, error: { message: error.message } }
        }
      },
      getSession: async () => {
        const token = localStorage.getItem("sb-auth-token")
        return { data: { session: token ? { access_token: token } : null }, error: null }
      },
    },
    from: (table: string) => ({
      select: () => ({ then: () => ({ data: [] }) }),
      insert: () => ({ then: () => ({ data: null }) }),
      update: () => ({ then: () => ({ data: null }) }),
      delete: () => ({ then: () => ({ data: null }) }),
    }),
  }
}

export function getSupabaseClient(): MockSupabaseClient {
  if (!client) {
    client = createMockClient()
  }
  return client
}

export function createClient() {
  return getSupabaseClient()
}
