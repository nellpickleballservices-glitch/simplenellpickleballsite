import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// In-memory rate limiting (per session)
// ---------------------------------------------------------------------------
const SESSION_LIMIT = 20
const SESSION_TTL_MS = 60 * 60 * 1000 // 1 hour

interface SessionEntry {
  count: number
  firstMessage: number
}

const sessions = new Map<string, SessionEntry>()

function cleanStaleSessions() {
  const now = Date.now()
  for (const [id, entry] of sessions) {
    if (now - entry.firstMessage > SESSION_TTL_MS) {
      sessions.delete(id)
    }
  }
}

function isRateLimited(sessionId: string): boolean {
  cleanStaleSessions()
  const entry = sessions.get(sessionId)
  if (!entry) {
    sessions.set(sessionId, { count: 1, firstMessage: Date.now() })
    return false
  }
  entry.count += 1
  return entry.count > SESSION_LIMIT
}

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Validate API key
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'configuration_error', message: 'Nelly is unavailable right now. Please try again later.' },
      { status: 500 },
    )
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  let body: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    locale: string
    sessionId: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { messages, locale, sessionId } = body

  if (!messages || !Array.isArray(messages) || !sessionId) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // Rate limiting
  if (isRateLimited(sessionId)) {
    const msg =
      locale === 'es'
        ? 'He respondido muchas preguntas! Visita nuestra pagina de Contacto o escribe por WhatsApp para mas ayuda.'
        : "I've answered a lot of questions! Visit our Contact page or WhatsApp for more help."
    return NextResponse.json({ error: 'rate_limited', message: msg }, { status: 429 })
  }

  // ---------------------------------------------------------------------------
  // Fetch content_blocks + upcoming events for system prompt
  // ---------------------------------------------------------------------------
  let knowledge = ''
  let eventsText = 'No upcoming events listed.'

  try {
    const { data: blocks } = await supabaseAdmin
      .from('content_blocks')
      .select('block_key, content_es, content_en')

    if (blocks && blocks.length > 0) {
      knowledge = blocks
        .map((b) => {
          const content = locale === 'es' ? b.content_es : b.content_en
          return `[${b.block_key}]: ${content ?? '(no content)'}`
        })
        .join('\n')
    }

    const today = new Date().toISOString().split('T')[0]
    const { data: events } = await supabaseAdmin
      .from('events')
      .select(
        'title_es, title_en, description_es, description_en, event_date, event_type, start_time, end_time',
      )
      .gte('event_date', today)
      .order('event_date')
      .limit(10)

    if (events && events.length > 0) {
      eventsText = events
        .map((e) => {
          const title = locale === 'es' ? e.title_es : e.title_en
          const desc = locale === 'es' ? e.description_es : e.description_en
          const time =
            e.start_time && e.end_time ? `${e.start_time} - ${e.end_time}` : 'Time TBD'
          return `- ${title} (${e.event_type}) on ${e.event_date} at ${time}${desc ? ': ' + desc : ''}`
        })
        .join('\n')
    }
  } catch {
    // If CMS fetch fails, continue with empty knowledge — Nelly still works
  }

  // ---------------------------------------------------------------------------
  // System prompt
  // ---------------------------------------------------------------------------
  const systemPrompt = `You are Nelly, the friendly AI assistant for NELL Pickleball Club in Bavaro, Dominican Republic.
Your name plays on the club name NELL, inspired by founder Maria Nelly Mercedes Carrasco.

RULES:
- Detect the language of the user's message and ALWAYS respond in that same language
- You help visitors with: pickleball rules, membership plans ($50/mo VIP all locations, $35/mo Basic one location), court reservations, upcoming events, and club locations
- Be warm, enthusiastic, and encouraging about pickleball
- Keep responses concise (2-3 paragraphs max)
- If asked about something outside club topics, politely redirect: "I'm here to help with NELL Pickleball Club! For other questions, feel free to reach out via WhatsApp."
- Never make up information not in the knowledge base
- For membership signup, direct users to the Pricing page
- For reservations, explain they need to create an account first

CLUB KNOWLEDGE BASE:
${knowledge || 'No content available.'}

UPCOMING EVENTS:
${eventsText}`

  // ---------------------------------------------------------------------------
  // OpenAI streaming call
  // ---------------------------------------------------------------------------
  const recentMessages = messages.slice(-10)

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...recentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    // Convert OpenAI async iterable to ReadableStream SSE
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'api_error', message: 'Nelly is unavailable right now. Please try again later.' },
      { status: 500 },
    )
  }
}
