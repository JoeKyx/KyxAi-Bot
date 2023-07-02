import Stripe from "stripe";
import { config } from "dotenv";
config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

import { getUserCustomerIds, addUserCustomerId } from "./data.js";
export const createCheckoutSession = async (
  priceId,
  quantity,
  mode,
  clientId,
  successUrl,
  cancelUrl
) => {
  console.log(clientId);

  // Check whether the user has a Stripe customer ID
  const customerIds = await getUserCustomerIds(clientId);
  console.log(customerIds);
  let customer;
  if (customerIds && customerIds.length > 0) {
    customer = await stripe.customers.retrieve(customerIds[0]);
  } else {
    customer = await stripe.customers.create();
  }

  // Add customer to user
  await addUserCustomerId(clientId, customer.id);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "ideal", "sofort", "paypal"],
    line_items: [
      {
        price: priceId,
        quantity: quantity,
      },
    ],
    mode: mode,
    customer: customer.id,
    client_reference_id: clientId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  console.log(JSON.stringify(session, null, 2));
  return session;
};

export const cancelSubscription = async (subscriptionId) => {
  try {
    const deletedSubscription = await stripe.subscriptions.cancel(
      subscriptionId
    );
    console.log(JSON.stringify(deletedSubscription, null, 2));
    return { success: true };
  } catch (err) {
    console.log(err);
    return { success: false };
  }
};
