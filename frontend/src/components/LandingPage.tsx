'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Repeat, 
  Shield, 
  BarChart3, 
  Users, 
  CheckCircle2,
  ArrowRight,
  Zap,
  Globe,
  Receipt,
  TrendingUp,
  Clock,
  Lock
} from 'lucide-react';

export function LandingPage() {
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set());
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionRefs.current.forEach((ref, index) => {
      if (!ref) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleSections((prev) => new Set(prev).add(index));
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -100px 0px',
        }
      );

      observer.observe(ref);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);
  const features = [
    {
      icon: Repeat,
      title: 'Automated Recurring Billing',
      description: 'Set up subscriptions with flexible billing cycles - daily, weekly, monthly, or yearly. Automatic payment processing ensures you never miss a payment.',
    },
    {
      icon: Smartphone,
      title: 'M-Pesa Integration',
      description: 'Seamlessly integrate with M-Pesa payment methods including Ratiba (Standing Orders), STK Push, C2B, and B2C for comprehensive payment coverage.',
    },
    {
      icon: Users,
      title: 'Multi-Tenant Architecture',
      description: 'Perfect for SaaS businesses. Each tenant operates independently with their own subscriptions, customers, and payment methods.',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with encrypted credentials, secure API endpoints, and comprehensive audit trails for all transactions.',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      description: 'Track subscription metrics, payment success rates, revenue, and customer insights with real-time dashboards and reports.',
    },
    {
      icon: Receipt,
      title: 'Invoice Management',
      description: 'Automatically generate invoices for each billing cycle. Track payment history, outstanding amounts, and manage refunds effortlessly.',
    },
  ];

  const paymentMethods = [
    {
      name: 'Ratiba (Standing Orders)',
      description: 'Set up automatic recurring payments via M-Pesa Ratiba. Customers authorize once, and payments are processed automatically on schedule.',
      icon: Repeat,
    },
    {
      name: 'STK Push',
      description: 'Send payment requests directly to customer phones via M-Pesa STK Push. Perfect for one-time payments or manual subscription activation.',
      icon: Smartphone,
    },
    {
      name: 'C2B (Customer to Business)',
      description: 'Accept payments from customers using M-Pesa Paybill or Till numbers. Ideal for high-volume transactions.',
      icon: CreditCard,
    },
    {
      name: 'B2C (Business to Customer)',
      description: 'Send payments to customers for refunds, payouts, or disbursements. Fully automated with webhook callbacks.',
      icon: ArrowRight,
    },
  ];

  const steps = [
    {
      step: '1',
      title: 'Create Subscription Plan',
      description: 'Define your subscription details including name, amount, billing frequency, and optional trial period.',
    },
    {
      step: '2',
      title: 'Add Customer',
      description: 'Register customers with their phone numbers and preferred payment method. Multi-tenant support ensures data isolation.',
    },
    {
      step: '3',
      title: 'Setup Payment Method',
      description: 'Configure M-Pesa payment method (Ratiba, STK Push, or C2B) and authorize the first payment.',
    },
    {
      step: '4',
      title: 'Automated Billing',
      description: 'The system automatically processes payments on schedule, sends invoices, and handles failed payments with retry logic.',
    },
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-zinc-200/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-zinc-200/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-zinc-100/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-6 w-6 text-zinc-900 dark:text-zinc-50 mr-2" />
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">PesaFlow</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 py-20 sm:py-32">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-tl from-pink-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            {/* Hero Icon/Visual */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <Zap className="h-16 w-16 text-white" />
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 px-4">
              Subscription Billing
              <span className="block text-lg sm:text-xl lg:text-2xl text-zinc-600 dark:text-zinc-400 mt-2 font-normal">
                Powered by M-Pesa
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Automate recurring payments, manage subscriptions, and grow your business with Kenya's most trusted payment platform. 
              Built for SaaS companies, service providers, and businesses that need reliable subscription billing.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/signup"
                className="rounded-md bg-zinc-900 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="text-base font-semibold leading-6 text-zinc-900 dark:text-zinc-50"
              >
                Sign In <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950 dark:via-blue-950 dark:to-cyan-950 relative">
        {/* Decorative grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-40"></div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce delay-300"></div>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Everything you need to manage subscriptions
            </h2>
            <p className="mt-2 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Powerful features designed to streamline your subscription billing workflow.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group flex flex-col rounded-2xl bg-zinc-50 p-8 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                {/* Decorative gradient background */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-green-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-green-500/5 transition-all duration-300 -z-10"></div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold leading-7 text-zinc-900 dark:text-zinc-50">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-base leading-7 text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods Section */}
      <section className="py-24 sm:py-32 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950 relative overflow-hidden">
        {/* Animated circles */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-tl from-cyan-400/20 to-teal-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            {/* Visual icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-green-500 to-blue-600 p-4 rounded-full">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Multiple M-Pesa Payment Options
            </h2>
            <p className="mt-2 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Support all M-Pesa payment methods to give your customers flexibility and convenience.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
            {paymentMethods.map((method, index) => (
              <div
                key={method.name}
                className="group relative flex gap-6 rounded-2xl bg-white p-8 shadow-sm dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-blue-600 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <method.icon className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold leading-7 text-zinc-900 dark:text-zinc-50">
                    {method.name}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
                    {method.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 sm:py-32 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-950 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            {/* Visual element */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-full">
                  <Clock className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              How It Works
            </h2>
            <p className="mt-2 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Get started in minutes with our simple setup process.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              {steps.map((step, index) => (
                <div key={step.step} className="relative pl-16 group">
                  <dt className="text-base font-semibold leading-7 text-zinc-900 dark:text-zinc-50">
                    <div className="absolute left-0 top-0 group-hover:scale-110 transition-transform duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                        <span className="text-lg font-bold text-white">{step.step}</span>
                      </div>
                    </div>
                    {step.title}
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
                    {step.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 sm:py-32 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10 dark:opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            {/* Visual icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-full">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              Why Choose PesaFlow?
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              Powerful features that make subscription billing effortless
            </p>
          </div>
          <div className="mx-auto max-w-6xl mt-16">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Repeat,
                  title: 'Auto Retry',
                  description: 'Automated payment retry logic for failed transactions',
                  color: 'from-blue-500 to-cyan-500',
                },
                {
                  icon: Clock,
                  title: 'Trial Support',
                  description: 'Trial period support with automatic conversion',
                  color: 'from-purple-500 to-pink-500',
                },
                {
                  icon: Zap,
                  title: 'Real-Time',
                  description: 'Comprehensive webhook system for real-time updates',
                  color: 'from-yellow-500 to-orange-500',
                },
                {
                  icon: Globe,
                  title: 'Multi-Currency',
                  description: 'Multi-currency support (KES default)',
                  color: 'from-green-500 to-emerald-500',
                },
                {
                  icon: Shield,
                  title: 'Audit Logs',
                  description: 'Detailed audit logs and transaction history',
                  color: 'from-indigo-500 to-blue-500',
                },
                {
                  icon: Users,
                  title: 'Self-Service',
                  description: 'Customer self-service portal for subscription management',
                  color: 'from-pink-500 to-rose-500',
                },
                {
                  icon: BarChart3,
                  title: 'Flexible Billing',
                  description: 'Flexible billing cycles (daily, weekly, monthly, yearly)',
                  color: 'from-teal-500 to-cyan-500',
                },
                {
                  icon: Receipt,
                  title: 'Auto Invoices',
                  description: 'Automatic invoice generation and delivery',
                  color: 'from-amber-500 to-yellow-500',
                },
              ].map((benefit, index) => (
                <div
                  key={benefit.title}
                  className="group relative rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-6 border border-amber-200/50 dark:border-amber-800/50 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  {/* Gradient accent on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  
                  {/* Icon */}
                  <div className="relative mb-4">
                    <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
                    <div className={`relative inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <benefit.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {benefit.description}
                  </p>
                  
                  {/* Decorative element */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-0 group-hover:opacity-50 transition-opacity"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots/Workflow Section */}
      <section className="py-24 sm:py-32 bg-gradient-to-br from-slate-50 via-zinc-50 to-neutral-50 dark:from-slate-950 dark:via-zinc-950 dark:to-neutral-950 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
              See It In Action
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              Experience the complete subscription billing workflow
            </p>
          </div>

          <div className="space-y-16">
            {/* Dashboard Screenshot */}
            <div 
              ref={(el) => { sectionRefs.current[0] = el; }}
              className={`flex flex-col lg:flex-row items-center gap-12 transition-all duration-1000 ${
                visibleSections.has(0)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="flex-1">
                <div className="relative group">
                  {/* Screenshot placeholder - Replace with actual screenshot */}
                  <div className="relative rounded-2xl bg-white dark:bg-zinc-900 border-4 border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all duration-500 group-hover:shadow-blue-500/20 group-hover:scale-[1.02] group-hover:border-blue-300 dark:group-hover:border-blue-700">
                    <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-700">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div className="ml-4 text-xs text-zinc-500 dark:text-zinc-400">Dashboard - PesaFlow</div>
                    </div>
                    <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 min-h-[400px] flex items-center justify-center">
                      {/* TODO: Replace this div with actual dashboard screenshot */}
                      <div className="text-center">
                        <BarChart3 className="h-16 w-16 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">
                          Dashboard Screenshot
                          <br />
                          <span className="text-xs">Add screenshot: /app/dashboard/page.tsx</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Decorative shadow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-2xl -z-10 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-500"></div>
                  {/* Animated glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-20"></div>
                </div>
              </div>
              <div className={`flex-1 space-y-4 transition-all duration-1000 delay-200 ${
                visibleSections.has(0)
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-10'
              }`}>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Step 1</span>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Dashboard Overview
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Get a complete overview of your subscription business at a glance. View active subscriptions, 
                  revenue metrics, recent payments, and upcoming billing dates all in one place.
                </p>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {[
                    'Real-time subscription metrics',
                    'Revenue tracking and analytics',
                    'Quick access to all features',
                  ].map((item, idx) => (
                    <li 
                      key={item}
                      className={`flex items-start gap-2 transition-all duration-500 ${
                        visibleSections.has(0)
                          ? 'opacity-100 translate-x-0'
                          : 'opacity-0 -translate-x-4'
                      }`}
                      style={{ transitionDelay: `${300 + idx * 100}ms` }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Subscriptions Screenshot */}
            <div 
              ref={(el) => { sectionRefs.current[1] = el; }}
              className={`flex flex-col lg:flex-row-reverse items-center gap-12 transition-all duration-1000 delay-300 ${
                visibleSections.has(1)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="flex-1">
                <div className="relative group">
                  <div className="relative rounded-2xl bg-white dark:bg-zinc-900 border-4 border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all duration-500 group-hover:shadow-green-500/20 group-hover:scale-[1.02] group-hover:border-green-300 dark:group-hover:border-green-700">
                    <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-700">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div className="ml-4 text-xs text-zinc-500 dark:text-zinc-400">Subscriptions - PesaFlow</div>
                    </div>
                    <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 min-h-[400px] flex items-center justify-center">
                      {/* TODO: Replace this div with actual subscriptions screenshot */}
                      <div className="text-center">
                        <Repeat className="h-16 w-16 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">
                          Subscriptions Screenshot
                          <br />
                          <span className="text-xs">Add screenshot: /app/subscriptions/page.tsx</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-2xl -z-10 group-hover:from-green-500/30 group-hover:to-emerald-500/30 transition-all duration-500"></div>
                  {/* Animated glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-20"></div>
                </div>
              </div>
              <div className={`flex-1 space-y-4 transition-all duration-1000 delay-500 ${
                visibleSections.has(1)
                  ? 'opacity-100 -translate-x-0'
                  : 'opacity-0 -translate-x-10'
              }`}>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">Step 2</span>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Manage Subscriptions
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Create and manage all your subscription plans with ease. Set up billing cycles, 
                  trial periods, and payment methods. View subscription status, payment history, and manage customer subscriptions.
                </p>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {[
                    'Create subscription plans',
                    'Track subscription status',
                    'Manage billing cycles',
                  ].map((item, idx) => (
                    <li 
                      key={item}
                      className={`flex items-start gap-2 transition-all duration-500 ${
                        visibleSections.has(1)
                          ? 'opacity-100 translate-x-0'
                          : 'opacity-0 translate-x-4'
                      }`}
                      style={{ transitionDelay: `${600 + idx * 100}ms` }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Payment Methods Screenshot */}
            <div 
              ref={(el) => { sectionRefs.current[2] = el; }}
              className={`flex flex-col lg:flex-row items-center gap-12 transition-all duration-1000 delay-600 ${
                visibleSections.has(2)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="flex-1">
                <div className="relative group">
                  <div className="relative rounded-2xl bg-white dark:bg-zinc-900 border-4 border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all duration-500 group-hover:shadow-purple-500/20 group-hover:scale-[1.02] group-hover:border-purple-300 dark:group-hover:border-purple-700">
                    <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-700">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div className="ml-4 text-xs text-zinc-500 dark:text-zinc-400">Payment Methods - PesaFlow</div>
                    </div>
                    <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 min-h-[400px] flex items-center justify-center">
                      {/* TODO: Replace this div with actual payment methods screenshot */}
                      <div className="text-center">
                        <CreditCard className="h-16 w-16 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">
                          Payment Methods Screenshot
                          <br />
                          <span className="text-xs">Add screenshot: /app/payment-methods/page.tsx</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl -z-10 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all duration-500"></div>
                  {/* Animated glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-20"></div>
                </div>
              </div>
              <div className={`flex-1 space-y-4 transition-all duration-1000 delay-800 ${
                visibleSections.has(2)
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-10'
              }`}>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Step 3</span>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Setup Payment Methods
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Configure M-Pesa payment methods including Ratiba standing orders, STK Push, and C2B. 
                  Set up automatic recurring payments and manage payment preferences for your customers.
                </p>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {[
                    'M-Pesa Ratiba integration',
                    'STK Push payments',
                    'Automatic payment processing',
                  ].map((item, idx) => (
                    <li 
                      key={item}
                      className={`flex items-start gap-2 transition-all duration-500 ${
                        visibleSections.has(2)
                          ? 'opacity-100 translate-x-0'
                          : 'opacity-0 -translate-x-4'
                      }`}
                      style={{ transitionDelay: `${900 + idx * 100}ms` }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Invoices Screenshot */}
            <div 
              ref={(el) => { sectionRefs.current[3] = el; }}
              className={`flex flex-col lg:flex-row-reverse items-center gap-12 transition-all duration-1000 delay-900 ${
                visibleSections.has(3)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
            >
              <div className="flex-1">
                <div className="relative group">
                  <div className="relative rounded-2xl bg-white dark:bg-zinc-900 border-4 border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all duration-500 group-hover:shadow-amber-500/20 group-hover:scale-[1.02] group-hover:border-amber-300 dark:group-hover:border-amber-700">
                    <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-700">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div className="ml-4 text-xs text-zinc-500 dark:text-zinc-400">Invoices - PesaFlow</div>
                    </div>
                    <div className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 min-h-[400px] flex items-center justify-center">
                      {/* TODO: Replace this div with actual invoices screenshot */}
                      <div className="text-center">
                        <Receipt className="h-16 w-16 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-500">
                          Invoices Screenshot
                          <br />
                          <span className="text-xs">Add screenshot: /app/invoices/page.tsx</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl blur-2xl -z-10 group-hover:from-amber-500/30 group-hover:to-orange-500/30 transition-all duration-500"></div>
                  {/* Animated glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-20"></div>
                </div>
              </div>
              <div className={`flex-1 space-y-4 transition-all duration-1000 delay-1100 ${
                visibleSections.has(3)
                  ? 'opacity-100 -translate-x-0'
                  : 'opacity-0 -translate-x-10'
              }`}>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Step 4</span>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Automatic Invoicing
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Automatically generate and send invoices for every billing cycle. Track payment status, 
                  view invoice history, and manage outstanding balances. All invoices are automatically created when payments are processed.
                </p>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {[
                    'Auto-generated invoices',
                    'Payment tracking',
                    'Download and share invoices',
                  ].map((item, idx) => (
                    <li 
                      key={item}
                      className={`flex items-start gap-2 transition-all duration-500 ${
                        visibleSections.has(3)
                          ? 'opacity-100 translate-x-0'
                          : 'opacity-0 translate-x-4'
                      }`}
                      style={{ transitionDelay: `${1200 + idx * 100}ms` }}
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-gradient-to-br from-slate-900 via-zinc-900 to-neutral-900 dark:from-slate-950 dark:via-zinc-950 dark:to-neutral-950 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 animate-pulse"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            {/* Visual element */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-white to-blue-200 rounded-full blur-2xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm p-6 rounded-2xl border border-white/20">
                  <Lock className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to streamline your subscription billing?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              Join businesses already using PesaFlow to automate their recurring payments and grow their revenue.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/signup"
                className="group relative rounded-md bg-white px-8 py-4 text-base font-semibold text-zinc-900 shadow-lg hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-300 hover:scale-105"
              >
                <span className="relative z-10">Get Started Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-md opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </Link>
              <Link
                href="/login"
                className="group text-base font-semibold leading-6 text-white hover:text-blue-300 transition-colors flex items-center gap-2"
              >
                Sign In 
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center">
              <Zap className="h-6 w-6 text-zinc-900 dark:text-zinc-50 mr-2" />
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">PesaFlow</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              © {new Date().getFullYear()} PesaFlow.io. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
