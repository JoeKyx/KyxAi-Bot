// server.js
//
// Use this sample code to handle webhook events in your integration.
//
// 1) Paste this code into a new file (server.js)
//
// 2) Install dependencies
//   npm install stripe
//   npm install express
//
// 3) Run the server on http://localhost:4242
//   node server.js

// The library needs to be configured with your account's secret key.
// Ensure the key is kept out of any version control system you might be using.
import { config } from "dotenv";
import { addPremium, getUserIdForCustomerId } from "./api/data.js";
config();

import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import express from "express";
const app = express();

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = "whsec_EEf9oGis6V0diE0iWDx3bBCttJMXfWru";

app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    console.log("Webhook received!");
    const sig = request.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      console.log(err);
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case "invoice.payment_succeeded": {
        const checkoutSessionCompleted = event.data.object;
        console.log(JSON.stringify(checkoutSessionCompleted, null, 2));
        // Then define and call a function to handle the event checkout.session.completed
        const discordId = await getUserIdForCustomerId(
          checkoutSessionCompleted.customer
        );
        // Get subscription info
        const subscription = await stripe.subscriptions.retrieve(
          checkoutSessionCompleted.subscription
        );
        console.log(JSON.stringify(subscription, null, 2));
        addPremium(
          discordId,
          subscription.current_period_start * 1000,
          subscription.current_period_end * 1000,
          checkoutSessionCompleted.subscription
        );
        break;
      }
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);

app.get("/stripe/success", (request, response) => {
  response.send(
    "Success! Thanks for subscribing to Kyx AI. You can now close this tab."
  );
});

app.get("/stripe/cancel", (request, response) => {
  response.send("Cancel");
});

app.listen(3005, () => console.log("Running on port 3005"));
