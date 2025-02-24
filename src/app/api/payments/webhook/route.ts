import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "../../../../../supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
    console.log('🔄 [Webhook] Request received');
    console.log('📝 [Webhook] Request headers:', {
        'stripe-signature': req.headers.get("Stripe-Signature"),
        'content-type': req.headers.get("content-type"),
        'user-agent': req.headers.get("user-agent")
    });

    const sig = req.headers.get("Stripe-Signature");
    const body = await req.text();

    if (!sig) {
        console.error('❌ [Webhook] No Stripe signature found in headers');
        return NextResponse.json(
            { error: "No Stripe-Signature header" },
            { status: 400 }
        );
    }

    try {
        console.log('🔄 [Webhook] Constructing Stripe event...');
        const event = await stripe.webhooks.constructEventAsync(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
        console.log('✅ [Webhook] Event constructed successfully:', {
            type: event.type,
            id: event.id,
            apiVersion: event.api_version
        });

        console.log('🔄 [Webhook] Initializing Supabase client...');
        const supabase = await createClient();
        console.log('✅ [Webhook] Supabase client initialized');

        // Store webhook event
        console.log('🔄 [Webhook] Storing webhook event...');
        await storeWebhookEvent(supabase, {
            type: event.type,
            stripeEventId: event.id,
            created: event.created,
            data: event.data.object
        });

        // Handle different event types
        console.log(`🎯 [Webhook] Processing event type: ${event.type}`);
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
                console.log(`⚠️ [Webhook] Unhandled event type: ${event.type}`);
                return NextResponse.json(
                    { message: `Unhandled event type: ${event.type}` },
                    { status: 200 }
                );
        }
    } catch (err) {
        console.error('❌ [Webhook] Error processing webhook:', err);
        return NextResponse.json(
            { error: "Webhook Error" },
            { status: 500 }
        );
    }
}

async function storeWebhookEvent(
    supabase: any,
    {
        type,
        stripeEventId,
        created,
        data
    }: {
        type: string;
        stripeEventId: string;
        created: number;
        data: any;
    }
) {
    console.log('🔄 [StoreWebhook] Storing webhook event:', { type, stripeEventId });
    const { error } = await supabase
        .from("webhook_events")
        .insert({
            event_type: type,
            type: type.split('.')[0],
            stripe_event_id: stripeEventId,
            created_at: new Date(created * 1000).toISOString(),
            modified_at: new Date(created * 1000).toISOString(),
            data
        });

    if (error) {
        console.error('❌ [StoreWebhook] Error storing webhook event:', error);
    } else {
        console.log('✅ [StoreWebhook] Webhook event stored successfully');
    }
}

async function handleSubscriptionCreated(supabase: any, event: Stripe.Event) {
    console.log('🔄 [SubscriptionCreated] Processing subscription creation');
    const subscription = event.data.object as Stripe.Subscription;

    console.log('📝 [SubscriptionCreated] Subscription metadata:', subscription.metadata);

    // Try to get user information from Stripe customer
    let userId = subscription.metadata?.userId;
    if (!userId) {
        console.log('🔄 [SubscriptionCreated] No userId in metadata, fetching customer...');
        try {
            const customer = await stripe.customers.retrieve(subscription.customer as string);
            // Try to find user by email
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('email', (customer as Stripe.Customer).email)
                .single();

            if (userData) {
                userId = userData.id;
                console.log('✅ [SubscriptionCreated] Found user by email:', userData.id);
            } else {
                console.error('❌ [SubscriptionCreated] User not found:', userError);
            }
        } catch (error) {
            console.error('❌ [SubscriptionCreated] Error fetching customer:', error);
        }
    }

    if (!userId) {
        console.error('❌ [SubscriptionCreated] Unable to find associated user');
        return NextResponse.json(
            { error: "Unable to find associated user" },
            { status: 400 }
        );
    }

    const subscriptionData = {
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
        amount: subscription.items.data[0]?.plan.amount,
        started_at: subscription.start_date,
        customer_id: subscription.customer as string,
        metadata: subscription.metadata || {}
    };

    console.log('🔄 [SubscriptionCreated] Inserting subscription into database...');
    const { error } = await supabase
        .from("subscriptions")
        .insert(subscriptionData);

    if (error) {
        console.error('❌ [SubscriptionCreated] Error creating subscription:', error);
        return NextResponse.json(
            { error: "Failed to create subscription" },
            { status: 500 }
        );
    }
    console.log('✅ [SubscriptionCreated] Subscription inserted successfully');

    return NextResponse.json(
        { message: "Subscription created successfully" },
        { status: 200 }
    );
}

async function handleSubscriptionUpdated(supabase: any, event: Stripe.Event) {
    console.log('🔄 [SubscriptionUpdated] Processing subscription update');
    const subscription = event.data.object as Stripe.Subscription;

    const subscriptionData = {
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        metadata: subscription.metadata
    };

    console.log('📝 [SubscriptionUpdated] Update data:', subscriptionData);

    console.log('🔄 [SubscriptionUpdated] Updating subscription in database...');
    const { error } = await supabase
        .from("subscriptions")
        .update(subscriptionData)
        .eq("stripe_id", subscription.id);

    if (error) {
        console.error('❌ [SubscriptionUpdated] Error updating subscription:', error);
        return NextResponse.json(
            { error: "Failed to update subscription" },
            { status: 500 }
        );
    }
    console.log('✅ [SubscriptionUpdated] Subscription updated successfully');

    return NextResponse.json(
        { message: "Subscription updated successfully" },
        { status: 200 }
    );
}

async function handleSubscriptionDeleted(supabase: any, event: Stripe.Event) {
    console.log('🔄 [SubscriptionDeleted] Processing subscription deletion');
    const subscription = event.data.object as Stripe.Subscription;

    console.log('📝 [SubscriptionDeleted] Subscription metadata:', subscription.metadata);
    if (!subscription?.metadata?.email) {
        console.error('❌ [SubscriptionDeleted] No email found in subscription metadata');
        return NextResponse.json(
            { error: "Customer email could not be fetched" },
            { status: 500 }
        );
    }

    console.log('🔄 [SubscriptionDeleted] Updating subscription status to canceled...');
    const { error } = await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_id", subscription.id);

    if (error) {
        console.error('❌ [SubscriptionDeleted] Error updating subscription:', error);
        return NextResponse.json(
            { error: "Failed to update subscription" },
            { status: 500 }
        );
    }
    console.log('✅ [SubscriptionDeleted] Subscription marked as canceled');

    // Remove subscription reference from user
    console.log('🔄 [SubscriptionDeleted] Removing subscription reference from user...');
    const { error: userError } = await supabase
        .from("users")
        .update({ subscription: null })
        .eq("email", subscription?.metadata?.email);

    if (userError) {
        console.error('❌ [SubscriptionDeleted] Error updating user:', userError);
    } else {
        console.log('✅ [SubscriptionDeleted] User subscription reference removed');
    }

    return NextResponse.json(
        { message: "Subscription deleted successfully" },
        { status: 200 }
    );
}

async function handleCheckoutSessionCompleted(supabase: any, event: Stripe.Event) {
    console.log('🔄 [CheckoutCompleted] Processing checkout session completion');
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    console.log('📝 [CheckoutCompleted] Session metadata:', metadata);

    if (session.subscription) {
        console.log('🔄 [CheckoutCompleted] Updating subscription metadata in Stripe...');
        // Update subscription metadata in Stripe
        await stripe.subscriptions.update(
            session.subscription as string,
            { metadata }
        );
        console.log('✅ [CheckoutCompleted] Stripe subscription metadata updated');

        // Update subscription in database if needed
        console.log('🔄 [CheckoutCompleted] Updating subscription in database...');
        const { error } = await supabase
            .from("subscriptions")
            .update({
                metadata,
                user_id: metadata?.userId
            })
            .eq("stripe_id", session.subscription);

        if (error) {
            console.error('❌ [CheckoutCompleted] Error updating subscription:', error);
            return NextResponse.json(
                { error: "Failed to update subscription" },
                { status: 500 }
            );
        }
        console.log('✅ [CheckoutCompleted] Database subscription updated');
    }

    return NextResponse.json(
        { message: "Checkout session completed successfully" },
        { status: 200 }
    );
}

async function handleInvoicePaymentSucceeded(supabase: any, event: Stripe.Event) {
    console.log('🔄 [InvoiceSucceeded] Processing successful invoice payment');
    const invoice = event.data.object as Stripe.Invoice;

    // fetch the subscription from the subscription table
    const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("stripe_id", invoice.subscription);

    if (subscriptionError) {
        console.error('❌ [InvoiceSucceeded] Error fetching subscription:', subscriptionError);
        return NextResponse.json(
            { error: "Failed to fetch subscription" },
            { status: 500 }
        );
    }

    console.log('🔄 [InvoiceSucceeded] Storing invoice in webhook_events...');
    const { error } = await supabase
        .from("webhook_events")
        .insert({
            event_type: event.type,
            type: "invoice",
            stripe_event_id: event.id,
            data: {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription,
                amountPaid: String(invoice.amount_paid / 100),
                currency: invoice.currency,
                status: "succeeded",
                email: subscription?.email
            }
        });

    if (error) {
        console.error('❌ [InvoiceSucceeded] Error storing invoice:', error);
        return NextResponse.json(
            { error: "Failed to store invoice" },
            { status: 500 }
        );
    }
    console.log('✅ [InvoiceSucceeded] Invoice stored successfully');

    return NextResponse.json(
        { message: "Invoice payment succeeded" },
        { status: 200 }
    );
}

async function handleInvoicePaymentFailed(supabase: any, event: Stripe.Event) {
    console.log('🔄 [InvoiceFailed] Processing failed invoice payment');
    const invoice = event.data.object as Stripe.Invoice;

    // fetch the subscription from the subscription table
    const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("stripe_id", invoice.subscription);

    if (subscriptionError) {
        console.error('❌ [InvoiceSucceeded] Error fetching subscription:', subscriptionError);
        return NextResponse.json(
            { error: "Failed to fetch subscription" },
            { status: 500 }
        );
    }


    console.log('🔄 [InvoiceFailed] Storing failed invoice in webhook_events...');
    const { error } = await supabase
        .from("webhook_events")
        .insert({
            event_type: event.type,
            type: "invoice",
            stripe_event_id: event.id,
            data: {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription,
                amountDue: String(invoice.amount_due / 100),
                currency: invoice.currency,
                status: "failed",
                email: subscription?.email
            }
        });

    if (error) {
        console.error('❌ [InvoiceFailed] Error storing invoice:', error);
        return NextResponse.json(
            { error: "Failed to store invoice" },
            { status: 500 }
        );
    }
    console.log('✅ [InvoiceFailed] Failed invoice stored successfully');

    if (invoice.subscription) {
        console.log('🔄 [InvoiceFailed] Updating subscription status to past_due...');
        const { error: subError } = await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_id", invoice.subscription);

        if (subError) {
            console.error('❌ [InvoiceFailed] Error updating subscription:', subError);
        } else {
            console.log('✅ [InvoiceFailed] Subscription status updated to past_due');
        }
    }

    return NextResponse.json(
        { message: "Invoice payment failed" },
        { status: 200 }
    );
}