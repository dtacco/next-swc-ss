"use client";

import { checkoutSessionAction } from "@/app/actions";
import { User } from "@supabase/supabase-js";
import { Button } from "./ui/button";
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "./ui/card";

export default function PricingCard({ item, user }: {
    item: any,
    user: User | null
}) {
    const handleCheckout = async (priceId: string) => {
        if (!user) {
            window.location.href = '/sign-in';
            return;
        }

        const session = await checkoutSessionAction({
            priceId: priceId,
            successUrl: `${process.env.FRONTEND_URL}/success`,
            customerEmail: user.email!,
            metadata: {
                userId: user.id,
                email: user.email!,
                subscription: 'true'
            }
        })

        if (!session.url) {
            return;
        }

        window.location.href = session.url!;
    }

    return (
        <Card className={`w-[350px] relative overflow-hidden ${item.popular ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border border-gray-200'}`}>
            {item.popular && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-30" />
            )}
            <CardHeader className="relative">
                {item.popular && (
                    <div className="px-4 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-full w-fit mb-4">
                        Most Popular
                    </div>
                )}
                <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">{item.name}</CardTitle>
                <CardDescription className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-bold text-gray-900">${item?.amount / 100}</span>
                    <span className="text-gray-600">/{item?.interval}</span>
                </CardDescription>
            </CardHeader>
            <CardFooter className="relative">
                <Button
                    onClick={async () => {
                        await handleCheckout(item.id)   
                    }}
                    className={`w-full py-6 text-lg font-medium`}
                >
                    Get Started
                </Button>
            </CardFooter>
        </Card>
    )
}