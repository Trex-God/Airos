import { Webhook } from "svix";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface ClerkEmailAddress {
  email_address: string;
}

interface ClerkUserData {
  id: string;
  email_addresses: ClerkEmailAddress[];
  first_name: string | null;
  last_name: string | null;
  image_url: string;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData;
}

export async function POST(req: NextRequest) {
  const payload = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing Svix headers" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook verification unavailable" },
      { status: 400 },
    );
  }

  const webhook = new Webhook(webhookSecret);
  let event: ClerkWebhookEvent;

  try {
    event = webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (error) {
    console.error("[clerk-webhook] Verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  if (event.type !== "user.created" && event.type !== "user.updated") {
    console.info(`[clerk-webhook] Ignoring event: ${event.type}`);
    return NextResponse.json({ received: true });
  }

  try {
    const primaryEmail = event.data.email_addresses[0]?.email_address;

    if (!primaryEmail) {
      console.error(
        `[clerk-webhook] No email address for user ${event.data.id}`,
      );
      return NextResponse.json({ received: true });
    }

    const fullName = [event.data.first_name, event.data.last_name]
      .filter(Boolean)
      .join(" ");
    const supabaseAdmin = getSupabaseServiceRoleClient();
    const userFields = {
      id: event.data.id,
      email: primaryEmail,
      name: fullName,
      avatar_url: event.data.image_url,
    };

    const record =
      event.type === "user.created"
        ? {
            ...userFields,
            subscription_tier: "free" as const,
            subscription_status: "inactive" as const,
            quota_remaining: 5,
            user_type: "freelancer" as const,
            is_related_party: false,
          }
        : userFields;

    const { error } = await supabaseAdmin
      .from("users")
      .upsert(record, { onConflict: "id" });

    if (error) {
      console.error("[clerk-webhook] Supabase upsert failed:", error);
    }
  } catch (error) {
    console.error("[clerk-webhook] Supabase sync failed:", error);
  }

  return NextResponse.json({ received: true });
}
