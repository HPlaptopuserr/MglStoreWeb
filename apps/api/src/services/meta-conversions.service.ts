type MetaEventName =
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

export type MetaConversionEvent = {
  eventName: MetaEventName;
  eventId: string;
  sourceUrl: string;
  customData: {
    content_ids: string[];
    content_name?: string;
    content_type: "product";
    currency: "MNT";
    value: number;
    num_items?: number;
  };
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
};

type MetaConversionResult =
  | { configured: false }
  | { configured: true; accepted: boolean; status: number };

export function isMetaConversionsConfigured() {
  return Boolean(
    process.env.META_PIXEL_ID?.trim() &&
    process.env.META_CONVERSIONS_API_TOKEN?.trim() &&
    process.env.META_GRAPH_API_VERSION?.trim(),
  );
}

export async function sendMetaConversionEvent(
  event: MetaConversionEvent,
): Promise<MetaConversionResult> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN?.trim();
  const graphVersion = process.env.META_GRAPH_API_VERSION?.trim();

  if (!pixelId || !accessToken || !graphVersion) {
    return { configured: false };
  }

  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: event.eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: event.eventId,
            event_source_url: event.sourceUrl,
            action_source: "website",
            user_data: {
              client_ip_address: event.clientIpAddress,
              client_user_agent: event.clientUserAgent,
              fbp: event.fbp,
              fbc: event.fbc,
            },
            custom_data: event.customData,
          },
        ],
        ...(process.env.META_TEST_EVENT_CODE?.trim()
          ? { test_event_code: process.env.META_TEST_EVENT_CODE.trim() }
          : {}),
      }),
    },
  );

  return {
    configured: true,
    accepted: response.ok,
    status: response.status,
  };
}
