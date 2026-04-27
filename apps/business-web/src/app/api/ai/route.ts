import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { buildBusinessAiSystemPrompt, BUSINESS_AI_MAX_TOKENS } from '@/lib/business/business-ai';
import { businessAiRequestSchema } from '@/lib/business/schemas';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsedBody = businessAiRequestSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error:
          parsedBody.error.issues[0]?.message ??
          'Message payload is invalid. Refresh and try again.',
      },
      { status: 400 }
    );
  }

  const apiKey = process.env['ANTHROPIC_API_KEY'];

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI assistant is not configured yet. Add ANTHROPIC_API_KEY and redeploy.' },
      { status: 503 }
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: BUSINESS_AI_MAX_TOKENS,
      system: buildBusinessAiSystemPrompt(parsedBody.data.businessContext),
      messages: parsedBody.data.messages,
    });

    const textContent = response.content.find((block) => block.type === 'text');

    return NextResponse.json({
      text:
        textContent?.type === 'text'
          ? textContent.text
          : 'I could not generate a useful reply just now. Please try again.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/ai]', message);

    return NextResponse.json(
      { error: 'AI request failed. Check ANTHROPIC_API_KEY and try again.' },
      { status: 502 }
    );
  }
}
