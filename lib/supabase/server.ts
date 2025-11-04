import { getSupabaseClient } from "./client"

export async function createServerClient() {
  return getSupabaseClient()
}
