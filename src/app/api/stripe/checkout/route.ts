import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import Stripe from 'stripe'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json().catch(() => ({}))
    const { planSlug = 'lifetime', priceId, customerEmail } = body

    const userEmail = session?.user?.email || customerEmail || ''
    const userId = (session?.user as any)?.id || ''

    // Fetch site settings and plans
    const [settings, plans] = await Promise.all([
      db.siteSettings.get(),
      db.plan.findMany(),
    ])

    const selectedPlan = plans.find((p: any) => p.slug === planSlug) || plans[0]
    const priceAmount = Number(selectedPlan?.price) || (planSlug === 'monthly' ? 19 : planSlug === 'annual' ? 149 : 99)
    const currency = (settings.currency || 'usd').toLowerCase()

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const successUrl = `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}&plan=${planSlug}`
    const cancelUrl = `${origin}/pricing?canceled=true`

    // If Stripe Secret Key is present and starts with sk_
    if (settings.stripeSecretKey && settings.stripeSecretKey.startsWith('sk_')) {
      const stripe = new Stripe(settings.stripeSecretKey)

      let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

      // If specific Stripe Price ID is configured for this plan
      const configuredPriceId = priceId || (
        planSlug === 'lifetime' ? settings.lifetimePriceId :
        planSlug === 'monthly' ? settings.monthlyPriceId :
        settings.annualPriceId
      ) || selectedPlan?.stripePriceId

      if (configuredPriceId && configuredPriceId.startsWith('price_')) {
        lineItems.push({
          price: configuredPriceId,
          quantity: 1,
        })
      } else {
        // Dynamic price creation
        lineItems.push({
          price_data: {
            currency: currency,
            product_data: {
              name: `${settings.platformName || 'Dominion Writer'} - ${selectedPlan?.name || 'Lifetime Plan'}`,
              description: selectedPlan?.description || 'Unlimited AI book writing, formatting, and exports.',
            },
            unit_amount: Math.round(priceAmount * 100),
            ...(selectedPlan?.interval !== 'one-time' ? {
              recurring: {
                interval: selectedPlan?.interval === 'year' ? 'year' : 'month',
              },
            } : {}),
          },
          quantity: 1,
        })
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: selectedPlan?.interval === 'one-time' || !selectedPlan?.interval ? 'payment' : 'subscription',
        payment_method_types: ['card'],
        customer_email: userEmail || undefined,
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
          userEmail: userEmail,
          planSlug: planSlug,
          platform: 'DominionWriter',
        },
      })

      // Log transaction attempt
      await db.auditLog.create({
        data: {
          action: 'STRIPE_CHECKOUT_INITIATED',
          performedBy: userEmail || 'anonymous',
          details: `Stripe checkout initiated for ${selectedPlan?.name || planSlug} ($${priceAmount}) - Session ID: ${checkoutSession.id}`,
        },
      })

      return Response.json({ url: checkoutSession.url, sessionId: checkoutSession.id })
    }

    // Fallback Demo / Simulated Mode if keys are not yet configured or in mock test mode
    const mockSessionId = 'demo_cs_' + Math.random().toString(36).substring(2, 14)

    // In demo mode, if user is signed in, activate plan automatically for immediate testing
    if (userEmail) {
      await db.user.update({
        where: { email: userEmail },
        data: { planActive: true, planType: planSlug },
      }).catch(err => console.error('Demo auto-activation error:', err))

      await db.transaction.create({
        data: {
          userId,
          userEmail,
          amount: priceAmount,
          currency,
          planType: planSlug,
          stripeSessionId: mockSessionId,
        },
      }).catch(() => {})
    }

    await db.auditLog.create({
      data: {
        action: 'DEMO_CHECKOUT_COMPLETED',
        performedBy: userEmail || 'demo_user',
        details: `Simulated checkout completed for plan ${planSlug} ($${priceAmount})`,
      },
    })

    return Response.json({
      url: `${origin}/pricing/success?session_id=${mockSessionId}&plan=${planSlug}&demo=true`,
      sessionId: mockSessionId,
      demo: true,
    })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return Response.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  return POST(req)
}
