import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { errorResponse, jsonResponse } from "@/lib/api-response";
import { PRICE_ENV_BY_PLAN } from "@/lib/domain";
import { requireServerEnv } from "@/lib/env";
import { CheckoutRequestSchema } from "@/lib/schemas";
import { getStripeClient } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const { userId } = await auth();

  if (!userId) {
    return errorResponse(
      401,
      "Authentication required",
      "AUTH_REQUIRED",
    );
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress ?? "";

  let requestBody: unknown;

  try {
    requestBody = await req.json();
  } catch {
    return errorResponse(
      422,
      "Invalid request. Check your input.",
      "VALIDATION_ERROR",
    );
  }

  const parsedBody = CheckoutRequestSchema.safeParse(requestBody);

  if (!parsedBody.success) {
    return errorResponse(
      422,
      "Invalid request. Check your input.",
      "VALIDATION_ERROR",
    );
  }

  try {
    const { plan } = parsedBody.data;
    const priceId = requireServerEnv(PRICE_ENV_BY_PLAN[plan]);
    const apiUrl = requireServerEnv("NEXT_PUBLIC_API_URL").replace(
      /\/+$/,
      "",
    );
    const mode: Stripe.Checkout.SessionCreateParams.Mode =
      plan === "pay_task" ? "payment" : "subscription";
    const metadata = {
      user_id: userId,
      plan,
    };

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      success_url: `${apiUrl}/dashboard?payment=success`,
      cancel_url: `${apiUrl}/#pricing`,
      customer_email: userEmail,
      client_reference_id: userId,
      metadata,
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
    };

    if (mode === "subscription") {
      checkoutParams.subscription_data = {
        metadata,
      };
    }

    const checkoutSession =
      await getStripeClient().checkout.sessions.create(checkoutParams);

    if (!checkoutSession.url) {
      console.error("Stripe Checkout Session did not return a URL.", {
        sessionId: checkoutSession.id,
      });
      return errorResponse(
        502,
        "Unable to create checkout session.",
        "CHECKOUT_URL_MISSING",
      );
    }

    return jsonResponse({
      checkout_url: checkoutSession.url,
    });
  } catch (error: unknown) {
    console.error("Stripe Checkout Session creation failed.", {
      message:
        error instanceof Error ? error.message : "Unknown server error",
    });

    return errorResponse(
      500,
      "Unable to create checkout session.",
      "CHECKOUT_FAILED",
    );
  }
}
