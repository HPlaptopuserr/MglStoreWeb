interface ProcurementCandidate {
  productId: string;
  name: string;
  availableStock: number;
  organizationStock: number;
  reorderPoint: number;
  soldQuantity90d: number;
  systemRequestedQuantity90d: number;
  previouslyRequestedQuantity: number;
}

export interface ProcurementSuggestion {
  productId: string;
  quantity: number;
  reason: string;
}

interface ProcurementAdvice {
  mode: "ai" | "smart";
  summary: string;
  suggestions: ProcurementSuggestion[];
}

const fallbackAdvice = (
  candidates: ProcurementCandidate[],
): ProcurementAdvice => {
  const eligible = candidates
    .filter(
      (candidate) =>
        candidate.availableStock > 0 &&
        ((candidate.reorderPoint > 0 &&
          candidate.organizationStock < candidate.reorderPoint) ||
          candidate.soldQuantity90d > 0 ||
          candidate.previouslyRequestedQuantity > 0),
    )
    .sort((first, second) => {
      const score = (candidate: ProcurementCandidate) =>
        Math.max(0, candidate.reorderPoint - candidate.organizationStock) *
          1000 +
        candidate.soldQuantity90d * 10 +
        candidate.previouslyRequestedQuantity +
        candidate.systemRequestedQuantity90d;
      return score(second) - score(first);
    });

  return {
    mode: "smart",
    summary: eligible.length
      ? "Босго, борлуулалт, өмнөх татан авалтаар шалгагдсан барааны санал."
      : "Одоогоор татан авах шаардлагатай бараа тодорхойлогдсонгүй.",
    suggestions: eligible.slice(0, 10).map((candidate) => {
      const shortage = Math.max(
        0,
        candidate.reorderPoint - candidate.organizationStock,
      );
      const monthlySales = Math.ceil(candidate.soldQuantity90d / 3);
      const monthlyRequested = Math.ceil(
        candidate.previouslyRequestedQuantity / 3,
      );
      const quantity = Math.min(
        candidate.availableStock,
        Math.max(1, shortage, monthlySales, monthlyRequested),
      );
      const reason =
        shortage > 0
          ? `Босгоос ${shortage} ширхгээр доош орсон`
          : candidate.soldQuantity90d > 0
            ? `90 хоногт ${candidate.soldQuantity90d} ширхэг зарагдсан`
            : "Өмнө татан авалт хийж байсан";
      return {
        productId: candidate.productId,
        quantity,
        reason,
      };
    }),
  };
};

const responseText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const output = (payload as { output?: unknown[] }).output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
};

export async function buildProcurementAdvice(
  candidates: ProcurementCandidate[],
): Promise<ProcurementAdvice> {
  const fallback = fallbackAdvice(candidates);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || candidates.length === 0) return fallback;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PROCUREMENT_MODEL || "gpt-5.6-luna",
        reasoning: { effort: "low" },
        max_output_tokens: 1200,
        store: false,
        input: [
          {
            role: "system",
            content:
              "Та Монгол жижиглэн дэлгүүрийн худалдан авалтын туслах. Зөвхөн өгөгдсөн бараанаас бодит хэрэгцээтэйг сонго; бүгдийг заавал сонгохгүй. Босгоос доош барааг түрүүл. quantity нь сарын эрэлтээс хэтрэхгүй бүхэл тоо байна. reason-ийг Монгол хэлээр 12 үгээс богино бич.",
          },
          {
            role: "user",
            content: `Дараагийн татан авалтын оновчтой жагсаалтыг JSON хэлбэрээр гарга: ${JSON.stringify(candidates)}`,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "procurement_advice",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                suggestions: {
                  type: "array",
                  maxItems: 10,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      productId: { type: "string" },
                      quantity: { type: "integer", minimum: 1 },
                      reason: { type: "string" },
                    },
                    required: ["productId", "quantity", "reason"],
                  },
                },
              },
              required: ["summary", "suggestions"],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return fallback;
    const text = responseText(await response.json());
    if (!text) return fallback;
    const parsed = JSON.parse(text) as {
      summary: string;
      suggestions: ProcurementSuggestion[];
    };
    const candidatesById = new Map(
      candidates.map((candidate) => [candidate.productId, candidate]),
    );
    const suggestions = parsed.suggestions
      .filter((item) => candidatesById.has(item.productId))
      .map((item) => {
        const candidate = candidatesById.get(item.productId)!;
        const demandCap = Math.max(
          1,
          candidate.reorderPoint - candidate.organizationStock,
          Math.ceil(candidate.soldQuantity90d / 3),
          Math.ceil(candidate.previouslyRequestedQuantity / 3),
        );
        return {
          ...item,
          quantity: Math.min(
            candidate.availableStock,
            demandCap,
            Math.max(1, Math.round(item.quantity)),
          ),
        };
      });
    return suggestions.length > 0
      ? { mode: "ai", summary: parsed.summary, suggestions }
      : fallback;
  } catch (error) {
    console.warn("procurement AI fallback", error);
    return fallback;
  }
}
