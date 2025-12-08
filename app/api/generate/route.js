import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req) {
  const data = await req.json();

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Build prompt based on inputs
  const promptParts = [];
  if (data.season) promptParts.push(`Season: ${data.season}`);
  if (data.personality) promptParts.push(`Personality: ${data.personality}`);
  if (data.people) promptParts.push(`People: ${data.people}`);
  if (data.location) promptParts.push(`Location: ${data.location}`);
  if (data.activityType) promptParts.push(`Type: ${data.activityType}`);
  if (data.extraInfo) promptParts.push(`Extra info: ${data.extraInfo}`);

  const basePrompt = promptParts.length
    ? `Generate a fun activity based on: ${promptParts.join(', ')}. Include a 1-2 sentence quick description and a detailed paragraph on how to do it.`
    : 'Generate a random fun activity for all ages that can be done with any number of people. Include a 1-2 sentence quick description and a detailed paragraph on how to do it.';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: basePrompt }],
      max_tokens: 500
    });

    const text = completion.choices[0].message.content;

    return NextResponse.json({ result: text });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
