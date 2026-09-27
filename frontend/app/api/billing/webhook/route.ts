import { NextResponse } from "next/server";
import Stripe from "stripe";

import { jsonResponse } from "@/lib/api-response";
import {
  getBillingPeriod,
  isBillingPlan,
} from "@/lib/domain";
import { requireServerEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe";
import { getSupabaseServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getStripeId(
  resource: string | { id: string } | null | undefined,
): string | null {
  if (typeof resource === "string") {
    return resource;
  }

  return resource?.id ?? null;
}

async function findUserId(
  metadataUserId: string | undefined,
  subscriptionId: string | null,
  customerId: string | null,
): Promise<string | null> {
  if (metadataUserId) {
    return metadataUserId;
  }

  const supabase = getSupabaseServiceRoleClient();

  if (subscriptionId) {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return data.id;
    }
  }

  if (customerId) {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.id ?? null;
  }

  return null;
}

async function handleCheckoutCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
): Promise<void> {
  const checkoutSession = event.data.object;
  const userId = checkoutSession.metadata?.user_id;
  const planValue = checkoutSession.metadata?.plan;

  if (!userId || !isBillingPlan(planValue)) {
    throw new Error(
      "Completed Checkout Session has invalid billing metadata.",
    );
  }

  const supabase = getSupabaseServiceRoleClient();
  const customerId = getStripeId(checkoutSession.customer);
  const subscriptionId = getStripeId(checkoutSession.subscription);
  const paymentId =
    getStripeId(checkoutSession.payment_intent) ??
    subscriptionId ??
    checkoutSession.id;

  const { error } = await supabase.rpc(
    "process_checkout_completion",
    {
      p_amount_usd: (checkoutSession.amount_total ?? 0) / 100,
      p_billing_period: getBillingPeriod(planValue),
      p_calendar_month: new Date(event.created * 1000)
        .toISOString()
        .slice(0, 7),
      p_plan_type: planValue,
      p_stripe_customer_id: customerId,
      p_stripe_event_id: event.id,
      p_stripe_payment_id: paymentId,
      p_stripe_subscription_id: subscriptionId,
      p_user_id: userId,
    },
  );

  if (error) {
    throw error;
  }
}

async function handleSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent,
): Promise<void> {
  const subscription = event.data.object;
  const userId = await findUserId(
    subscription.metadata.user_id,
    subscription.id,
    getStripeId(subscription.customer),
  );

  if (!userId) {
    throw new Error("Unable to identify user for deleted subscription.");
  }

  const { error } = await getSupabaseServiceRoleClient()
    .from("users")
    .update({
      subscription_tier: "free",
      subscription_status: "cancelled",
      stripe_subscription_id: null,
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

async function handleInvoicePaymentFailed(
  event: Stripe.InvoicePaymentFailedEvent,
): Promise<void> {
  const invoice = event.data.object;
  const subscriptionDetails = invoice.parent?.subscription_details;
  const userId = await findUserId(
    subscriptionDetails?.metadata?.user_id,
    getStripeId(subscriptionDetails?.subscription),
    getStripeId(invoice.customer),
  );

  if (!userId) {
    throw new Error("Unable to identify user for failed invoice.");
  }

  const { error } = await getSupabaseServiceRoleClient()
    .from("users")
    .update({
      subscription_status: "past_due",
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

async function processEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event);
      break;
    default:
      break;
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return jsonResponse(
      {
        error: "Missing Stripe signature.",
        code: "MISSING_SIGNATURE",
      },
      400,
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      requireServerEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error: unknown) {
    console.error("Stripe webhook signature verification failed.", {
      message:
        error instanceof Error ? error.message : "Unknown verification error",
    });

    return jsonResponse(
      {
        error: "Invalid Stripe signature.",
        code: "INVALID_SIGNATURE",
      },
      400,
    );
  }

  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data: existingEvent, error: lookupError } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("provider", "stripe")
      .eq("event_id", event.id)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existingEvent) {
      return jsonResponse({ received: true });
    }

    const { error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        provider: "stripe",
        event_id: event.id,
        event_type: event.type,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse({ received: true });
      }

      throw insertError;
    }

    await processEvent(event);

    return jsonResponse({ received: true });
  } catch (error: unknown) {
    const supabase = getSupabaseServiceRoleClient();
    const { error: cleanupError } = await supabase
      .from("webhook_events")
      .delete()
      .eq("provider", "stripe")
      .eq("event_id", event.id);

    if (cleanupError) {
      console.error("Stripe webhook retry cleanup failed.", {
        eventId: event.id,
        code: cleanupError.code,
      });
    }

    console.error("Stripe webhook processing failed.", {
      eventId: event.id,
      eventType: event.type,
      message:
        error instanceof Error ? error.message : "Unknown processing error",
    });

    return jsonResponse(
      {
        error: "Webhook processing failed.",
        code: "WEBHOOK_PROCESSING_FAILED",
      },
      500,
    );
  }
}
