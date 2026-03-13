import { createClient } from '@/lib/supabase/server'

/**
 * Fetch multiple content blocks by key prefix.
 * Returns a Record<block_key, content_value> map.
 * Uses anon role — RLS allows public SELECT on content_blocks.
 */
export async function getContentBlocks(
  prefix: string,
  locale: string
): Promise<Record<string, string>> {
  const supabase = await createClient()
  const contentField = locale === 'en' ? 'content_en' : 'content_es'

  const { data, error } = await supabase
    .from('content_blocks')
    .select(`block_key, block_type, ${contentField}`)
    .like('block_key', `${prefix}%`)
    .order('sort_order', { ascending: true })

  if (error || !data) return {}

  const result: Record<string, string> = {}
  for (const row of data) {
    const value = (row as Record<string, unknown>)[contentField]
    if (typeof value === 'string') {
      result[row.block_key] = value
    }
  }
  return result
}

/**
 * Fetch a single content block by exact key.
 * Returns the content string or null if not found.
 */
export async function getContentBlock(
  key: string,
  locale: string
): Promise<string | null> {
  const supabase = await createClient()
  const contentField = locale === 'en' ? 'content_en' : 'content_es'

  const { data, error } = await supabase
    .from('content_blocks')
    .select(`block_key, ${contentField}`)
    .eq('block_key', key)
    .single()

  if (error || !data) return null

  const value = (data as Record<string, unknown>)[contentField]
  return typeof value === 'string' ? value : null
}
