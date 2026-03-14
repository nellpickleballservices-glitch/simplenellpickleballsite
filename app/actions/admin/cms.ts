'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from './auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { ContentBlock } from '@/lib/types/admin'

interface GroupedContentBlocks {
  home: ContentBlock[]
  about: ContentBlock[]
  learn: ContentBlock[]
  faq: ContentBlock[]
}

export async function getContentBlocksAction(): Promise<GroupedContentBlocks> {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('content_blocks')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw new Error(error.message)

  const blocks = (data ?? []) as ContentBlock[]
  const grouped: GroupedContentBlocks = { home: [], about: [], learn: [], faq: [] }

  for (const block of blocks) {
    if (block.block_key.startsWith('home_')) grouped.home.push(block)
    else if (block.block_key.startsWith('about_')) grouped.about.push(block)
    else if (block.block_key.startsWith('learn_')) grouped.learn.push(block)
    else if (block.block_key.startsWith('faq_')) grouped.faq.push(block)
  }

  return grouped
}

export async function updateContentBlockAction(
  blockId: string,
  content_es: string,
  content_en: string
): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin
    .from('content_blocks')
    .update({
      content_es,
      content_en,
      updated_at: new Date().toISOString(),
    })
    .eq('id', blockId)

  if (error) throw new Error(error.message)

  // Trigger ISR cache invalidation so public pages see fresh content
  revalidatePath('/')

  return { success: true }
}

/**
 * Reorder content blocks atomically using batch RPC.
 * Replaces sequential N+1 update loop with a single database call.
 */
export async function reorderContentBlocksAction(
  blockIds: string[]
): Promise<{ success: boolean }> {
  await requireAdmin()

  const { error } = await supabaseAdmin.rpc('batch_reorder_content_blocks', {
    items: blockIds.map((id, i) => ({ id, sort_order: i + 1 }))
  })

  if (error) throw new Error(error.message)
  return { success: true }
}
