export async function POST(req) {
  const data = await req.json();

  // Build the prompt based on inputs
  const promptParts = [];

  if (data.season) promptParts.push(`Season: ${data.season}`);
  if (data.personality) promptParts.push(`Personality: ${data.personality}`);
  if (data.people) promptParts.push(`People: ${data.people}`);
  if (data.location) promptParts.push(`Location: ${data.location}`);
  if (data.activityType) promptParts.push(`Type: ${data.activityType}`);
  if (data.extraInfo) promptParts.push(`Extra info: ${data.extraInfo}`);

  const quickDescription = promptParts.length
    ? `Activity based on: ${promptParts.join(', ')}.`
    : 'A random fun activity for all ages that can be done with any number of people.';

  const fullDescription = quickDescription + ' Detailed steps to do the activity would go here. Make it descriptive enough to understand fully.';

  return new Response(
    JSON.stringify({
      activity: 'Sample Activity',
      quick: quickDescription,
      full: fullDescription
    }),
    { status: 200 }
  );
}
