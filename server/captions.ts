import { personalizeCaption } from "@shared/previewCaption";
import OpenAI from "openai";

type CaptionDetails = {
  businessName?: string;
  suburb?: string;
  callToAction?: string;
};

/**
 * Generate a trade-specific social caption for a job-site photo.
 * Uses OpenAI GPT-4o-mini for cost-effective caption generation.
 * Supplied business name, suburb, and call to action are woven in afterwards
 * so a missing model still cannot drop or invent them.
 */
export async function generateCaption(params: {
  imageUrl: string;
  trade?: string;
  tone?: string;
  businessName?: string;
  suburb?: string;
  callToAction?: string;
}): Promise<string> {
  const { imageUrl, trade, tone, businessName, suburb, callToAction } = params;
  const details: CaptionDetails = { businessName, suburb, callToAction };
  const fallback = personalizeCaption(
    `Another job done right${businessName ? ` by ${businessName}` : ""}. ` +
      "Quality work you can count on. #TradeLife #QualityWork #LocalBusiness",
    details
  );

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[Captions] OPENAI_API_KEY not set");
    return fallback;
  }

  const openai = new OpenAI({ apiKey });

  const personalization =
    businessName || suburb || callToAction
      ? " If a business name, suburb, or call to action is provided, weave those exact words into the caption. Do not invent a business name, suburb, phone number, website, or offer."
      : "";
  const system =
    "You are a social media copywriter for trade businesses (builders, plumbers, " +
    "electricians, landscapers, etc.). Write a single engaging Facebook caption for " +
    "the job-site photo. Keep it 1-3 short sentences, friendly and professional, " +
    "highlight the quality of the work, and end with 3-5 relevant hashtags. " +
    "Do not use markdown, quotes, or emoji-only lines. Return only the caption text." +
    personalization;

  const context: string[] = [];
  if (businessName) context.push(`Business name: ${businessName}.`);
  if (suburb) context.push(`Suburb: ${suburb}.`);
  if (callToAction) context.push(`Call to action: ${callToAction}.`);
  if (trade) context.push(`Trade: ${trade}.`);
  if (tone) context.push(`Tone: ${tone}.`);
  const contextLine = context.length
    ? context.join(" ")
    : "Trade: general contracting. Tone: confident and approachable.";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      max_tokens: 300,
    });

    const text = response?.choices?.[0]?.message?.content;
    if (typeof text === "string" && text.trim()) {
      return personalizeCaption(text, details);
    }
  } catch (error) {
    console.error("[Captions] OpenAI error:", error);
  }

  // Fallback caption so the flow never blocks on an empty model response.
  return fallback;
}
