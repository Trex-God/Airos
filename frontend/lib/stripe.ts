import "server-only";

import Stripe from "stripe";

import { requireServerEnv } from "@/lib/env";

let stripeClient: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requireServerEnv("STRIPE_SECRET_KEY"));
  }

  return stripeClient;
}
