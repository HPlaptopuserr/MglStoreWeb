export type AssistantSurface =
  | "web-search"
  | "vendor-products"
  | "admin-quality"
  | "warehouse-import";

export type AssistantIntent =
  | "product_data_review"
  | "category_suggestion"
  | "duplicate_detection"
  | "search_suggestion"
  | "import_cleanup"
  | "general_help";

export type AssistantAction =
  | {
      type: "apply_category";
      label: string;
      payload: { categoryId: string };
    }
  | {
      type: "apply_description";
      label: string;
      payload: { description: string };
    }
  | {
      type: "open_product";
      label: string;
      payload: { productId: string };
    }
  | {
      type: "run_search";
      label: string;
      payload: { query: string; filters?: Record<string, string> };
    };

export type AssistantMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AssistantContext = {
  surface: AssistantSurface;
  organizationId?: string;
  locale?: "mn" | "en";
  intent?: AssistantIntent;
};

export type AssistantResponse = {
  intent: AssistantIntent;
  answer: string;
  confidence: number;
  actions: AssistantAction[];
  tags?: string[];
};

export interface AssistantProvider<TInput = unknown> {
  id: string;
  mode: "rule" | "llm" | "hybrid";
  respond(input: TInput, context: AssistantContext): Promise<AssistantResponse>;
}
