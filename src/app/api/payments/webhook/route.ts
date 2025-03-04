import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "../../../../../supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Types
type WebhookEvent = {
    event_type: string;
    type: string;
    stripe_event_id: string;
    created_at: string;
    modified_at: string;
    data: any;
};

type SubscriptionData = {
    stripe_id: string;
    user_id: string;
    price_id: string;
    stripe_price_id: string;
    currency: string;
    interval: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    amount: number;
    started_at: number;
    customer_id: string;
    metadata: Record<string, any>;
};

// Utility functions
async function logAndStoreWebhookEvent(
    supabase: SupabaseClient,
    event: Stripe.Event,
    data: any
): Promise<void> {
    try {
        const webhookEvent = {
            event_type: event.type,
            type: event.type.split('.')[0],
            stripe_event_id: event.id,
            created_at: new Date(event.created * 1000).toISOString(),
            modified_at: new Date(event.created * 1000).toISOString(),
            data
        } as WebhookEvent;
                
        const { error, data: insertedData } = await supabase
            .from("webhook_events")
            .insert(webhookEvent)
            .select();

        if (error) {
            console.error("Error storing webhook event:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            throw error;
        }
    } catch (err) {
        console.error("Exception storing webhook event:", err);
        if (err instanceof Error) {
            console.error("Error message:", err.message);
            console.error("Error stack:", err.stack);
        }
        throw err;
    }
}

async function updateSubscriptionStatus(
    supabase: SupabaseClient,
    stripeId: string,
    status: string
): Promise<void> {
    try {
        const { error, data } = await supabase
            .from("subscriptions")
            .update({ status })
            .eq("stripe_id", stripeId)
            .select();

        if (error) {
            console.error("Error updating subscription status:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            throw error;
        }
    } catch (err) {
        console.error("Exception updating subscription status:", err);
        if (err instanceof Error) {
            console.error("Error message:", err.message);
            console.error("Error stack:", err.stack);
        }
        throw err;
    }
}

// Main webhook handler
export async function POST(req: NextRequest) {
    const sig = req.headers.get("Stripe-Signature");
    if (!sig) {
        console.error("No Stripe-Signature header provided");
        return NextResponse.json(
            { error: "No Stripe-Signature header" },
            { status: 400 }
        );
    }

    try {
        const body = await req.text();
        
        const event = await stripe.webhooks.constructEventAsync(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
        const supabase = await createServiceClient();
        
        await logAndStoreWebhookEvent(supabase, event, event.data.object);

        switch (event.type) {
            case "customer.subscription.created":
                return await handleSubscriptionCreated(supabase, event);
            case "customer.subscription.updated":
                return await handleSubscriptionUpdated(supabase, event);
            case "customer.subscription.deleted":
                return await handleSubscriptionDeleted(supabase, event);
            case "checkout.session.completed":
                return await handleCheckoutSessionCompleted(supabase, event);
            case "invoice.payment_succeeded":
                return await handleInvoicePaymentSucceeded(supabase, event);
            case "invoice.payment_failed":
                return await handleInvoicePaymentFailed(supabase, event);
            default:
                return NextResponse.json(
                    { message: `Unhandled event type: ${event.type}` },
                    { status: 200 }
                );
        }
    } catch (err) {
        console.error("Webhook Error:", err);
        if (err instanceof Error) {
            console.error("Error message:", err.message);
            console.error("Error stack:", err.stack);
        }
        return NextResponse.json(
            { error: "Webhook Error" },
            { status: 500 }
        );
    }
}

// Event handlers
async function handleSubscriptionCreated(supabase: SupabaseClient, event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;

    // Try to get user information
    let userId = subscription.metadata?.userId;
    
    if (!userId) {
        try {
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('email', (customer as Stripe.Customer).email)
                .single();

            if (userError) {
                console.error("Error finding user:", userError);
                console.error("Error details:", JSON.stringify(userError, null, 2));
            }

            userId = userData?.id;
            
            if (!userId) {
                console.error("User not found in database");
                throw new Error('User not found');
            }
        } catch (error) {
            console.error("Error retrieving user:", error);
            if (error instanceof Error) {
                console.error("Error message:", error.message);
                console.error("Error stack:", error.stack);
            }
            return NextResponse.json(
                { error: "Unable to find associated user" },
                { status: 400 }
            );
        }
    }

    const subscriptionData: SubscriptionData = {
        stripe_id: subscription.id,
        user_id: userId,
        price_id: subscription.items.data[0]?.price.id,
        stripe_price_id: subscription.items.data[0]?.price.id,
        currency: subscription.currency,
        interval: subscription.items.data[0]?.plan.interval,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        amount: subscription.items.data[0]?.plan.amount ?? 0,
        started_at: subscription.start_date ?? Math.floor(Date.now() / 1000),
        customer_id: subscription.customer as string,
        metadata: subscription.metadata || {}
    };

    const { error, data: insertedData } = await supabase
        .from("subscriptions")
        .insert(subscriptionData)
        .select();

    if (error) {
        console.error("Error creating subscription:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return NextResponse.json(
            { error: "Failed to create subscription" },
            { status: 500 }
        );
    }

    return NextResponse.json(
        { message: "Subscription created successfully" },
        { status: 200 }
    );
}

async function handleSubscriptionUpdated(supabase: SupabaseClient, event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;

    const { error, data: updatedData } = await supabase
        .from("subscriptions")
        .update({
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
            metadata: subscription.metadata
        })
        .eq("stripe_id", subscription.id)
        .select();

    if (error) {
        console.error("Error updating subscription:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return NextResponse.json(
            { error: "Failed to update subscription" },
            { status: 500 }
        );
    }
    return NextResponse.json(
        { message: "Subscription updated successfully" },
        { status: 200 }
    );
}

async function handleSubscriptionDeleted(supabase: SupabaseClient, event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;

    if (!subscription?.metadata?.email) {
        return NextResponse.json(
            { error: "Customer email not found" },
            { status: 400 }
        );
    }

    try {
        await updateSubscriptionStatus(supabase, subscription.id, "canceled");
        
        await supabase
            .from("users")
            .update({ subscription: null })
            .eq("email", subscription.metadata.email);

        return NextResponse.json(
            { message: "Subscription deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to process subscription deletion" },
            { status: 500 }
        );
    }
}

async function handleCheckoutSessionCompleted(supabase: SupabaseClient, event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription?.id;
    
    if (!subscriptionId) {
        return NextResponse.json(
            { message: "No subscription in checkout session" },
            { status: 200 }
        );
    }

    try {
        await stripe.subscriptions.update(
            subscriptionId,
            { 
                metadata: {
                    ...session.metadata,
                    checkoutSessionId: session.id
                }
            }
        );

        await supabase
            .from("subscriptions")
            .update({
                metadata: {
                    ...session.metadata,
                    checkoutSessionId: session.id
                },
                user_id: session.metadata?.userId
            })
            .eq("stripe_id", subscriptionId);

        return NextResponse.json(
            { 
                message: "Checkout session completed successfully",
                subscriptionId 
            },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to process checkout completion" },
            { status: 500 }
        );
    }
}

async function handleInvoicePaymentSucceeded(supabase: SupabaseClient, event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription?.id;

    try {
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("stripe_id", subscriptionId)
            .single();

        const webhookData = {
            event_type: event.type,
            type: "invoice",
            stripe_event_id: event.id,
            data: {
                invoiceId: invoice.id,
                subscriptionId,
                amountPaid: String(invoice.amount_paid / 100),
                currency: invoice.currency,
                status: "succeeded",
                email: subscription?.email
            }
        };

        await supabase
            .from("webhook_events")
            .insert(webhookData);

        return NextResponse.json(
            { message: "Invoice payment succeeded" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to process successful payment" },
            { status: 500 }
        );
    }
}

async function handleInvoicePaymentFailed(supabase: SupabaseClient, event: Stripe.Event) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription?.id;

    try {
        const { data: subscription } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("stripe_id", subscriptionId)
            .single();

        const webhookData = {
            event_type: event.type,
            type: "invoice",
            stripe_event_id: event.id,
            data: {
                invoiceId: invoice.id,
                subscriptionId,
                amountDue: String(invoice.amount_due / 100),
                currency: invoice.currency,
                status: "failed",
                email: subscription?.email
            }
        };

        await supabase
            .from("webhook_events")
            .insert(webhookData);

        if (subscriptionId) {
            await updateSubscriptionStatus(supabase, subscriptionId, "past_due");
        }

        return NextResponse.json(
            { message: "Invoice payment failed" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to process failed payment" },
            { status: 500 }
        );
    }
}