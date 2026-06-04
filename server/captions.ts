import { invokeLLM } from "./_core/llm";

/**
 * Generate a trade-specific social caption for a job-site photo.
 * Accepts a publicly-fetchable image URL (signed storage URL) and optional context.
 */
export async function generateCaption(params: {
  imageUrl: string;
  trade?: string;
  tone?: string;
  businessName?: string;
}): Promise<string> {
  const { imageUrl, trade, tone, businessName } = params;

  const system =
    "You are a social media copywriter for trade businesses (builders, plumbers, " +
    "electricians, landscapers, etc.). Write a single engaging Facebook caption for " +
    "the job-site photo. Keep it 1-3 short sentences, friendly and professional, " +
    "highlight the quality of the work, and end with 3-5 relevant hashtags. " +
    "Do not use markdown, quotes, or emoji-only lines. Return only the caption text.";

  const context: string[] = [];
  if (businessName) context.push(`Business name: ${businessName}.`);
  if (trade) context.push(`Trade: ${trade}.`);
  if (tone) context.push(`Tone: ${tone}.`);
  const contextLine = context.length
    ? context.join(" ")
    : "Trade: general contracting. Tone: confident and approachable.";

  const response = await invokeLLM({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: `Write the caption. ${contextLine}` },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
        ],
      },
    ],
  });

  const text = response?.choices?.[0]?.message?.content;
  if (typeof text === "string" && text.trim()) {
    return text.trim();
  }
  // Fallback caption so the flow never blocks on an empty model response.
  return (
    `Another job done right${businessName ? ` by ${businessName}` : ""}. ` +
    "Quality work you can count on. #TradeLife #QualityWork #LocalBusiness"
  );
}
