'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type SegmentKey = 'saas' | 'education' | 'utilities';

type Capability = {
  title: string;
  description: string;
};

type SegmentBlueprint = {
  label: string;
  headline: string;
  description: string;
  priorities: string[];
  metric: string;
};

const capabilities: Capability[] = [
  {
    title: 'Recurring billing engine',
    description: 'Create daily, weekly, monthly, and yearly plans with automated charge scheduling.',
  },
  {
    title: 'M-Pesa payment orchestration',
    description: 'Run STK Push, Ratiba standing orders, C2B collections, and B2C payouts from one flow.',
  },
  {
    title: 'Failed payment recovery',
    description: 'Recover missed collections with retries, reminders, and status tracking in real time.',
  },
  {
    title: 'Invoice and receipt automation',
    description: 'Generate billing artifacts per cycle so finance and support stay synchronized.',
  },
  {
    title: 'Tenant-safe architecture',
    description: 'Operate multiple teams or clients with isolated data, users, and billing contexts.',
  },
  {
    title: 'Operations analytics',
    description: 'Track collections, success rates, and subscriber movement from one dashboard.',
  },
];

const paymentRails = [
  {
    title: 'Ratiba Standing Orders',
    description: 'Set recurring debits for predictable monthly collections.',
  },
  {
    title: 'STK Push',
    description: 'Trigger phone-based payment prompts for onboarding and retries.',
  },
  {
    title: 'C2B Collections',
    description: 'Accept customer payments via paybill and till workflows.',
  },
  {
    title: 'B2C Payouts',
    description: 'Process customer refunds and disbursements with callback tracking.',
  },
];

const operationsFlow = [
  {
    step: '01',
    title: 'Create plan and billing cadence',
    description: 'Define plan price, frequency, and trial behavior for each subscriber segment.',
  },
  {
    step: '02',
    title: 'Activate customer payment method',
    description: 'Initialize STK Push or Ratiba and confirm payment authorization.',
  },
  {
    step: '03',
    title: 'Automate renewals and retries',
    description: 'Run recurring collections and recover failed attempts without manual intervention.',
  },
  {
    step: '04',
    title: 'Monitor and optimize collections',
    description: 'Use live metrics and invoices to improve success rates and retention.',
  },
];

const segments: Record<SegmentKey, SegmentBlueprint> = {
  saas: {
    label: 'SaaS Products',
    headline: 'Convert trials and keep renewals predictable',
    description:
      'Align onboarding, first payment, and renewal events so product growth and billing health move together.',
    priorities: [
      'Auto-convert trials into paid plans on schedule.',
      'Trigger renewal reminders before charge windows.',
      'Surface churn-risk accounts for proactive saves.',
    ],
    metric: 'Focus metric: trial-to-paid conversion and successful renewals.',
  },
  education: {
    label: 'Education Platforms',
    headline: 'Collect tuition and cohort fees on-time',
    description:
      'Standardize recurring student payments and reduce manual follow-up with automated billing cycles.',
    priorities: [
      'Group plans by class, cohort, or intake.',
      'Automate parent or student reminder sequences.',
      'Issue receipts instantly after each payment.',
    ],
    metric: 'Focus metric: monthly collection completion rate.',
  },
  utilities: {
    label: 'Membership & Utilities',
    headline: 'Keep recurring service accounts active',
    description:
      'Support high-volume recurring collections with robust retries and transparent account histories.',
    priorities: [
      'Track failed payments with reason-level visibility.',
      'Recover accounts before service disruption.',
      'Run refund workflows when needed via B2C.',
    ],
    metric: 'Focus metric: failed-payment recovery percentage.',
  },
};

function formatKes(value: number) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(value);
}

export function LandingPage() {
  const [segment, setSegment] = useState<SegmentKey>('saas');
  const [subscribers, setSubscribers] = useState(500);
  const [planValue, setPlanValue] = useState(2000);
  const [failedRate, setFailedRate] = useState(9);
  const [recoveryRate, setRecoveryRate] = useState(46);

  const activeSegment = segments[segment];

  const estimation = useMemo(() => {
    const monthlyBilling = subscribers * planValue;
    const atRisk = monthlyBilling * (failedRate / 100);
    const recovered = atRisk * (recoveryRate / 100);
    const collected = monthlyBilling - atRisk + recovered;
    const collectionRate = monthlyBilling > 0 ? (collected / monthlyBilling) * 100 : 0;

    return {
      monthlyBilling,
      atRisk,
      recovered,
      annualRecovered: recovered * 12,
      collectionRate,
    };
  }, [subscribers, planValue, failedRate, recoveryRate]);

  return (
    <div className="landing-shell relative min-h-screen overflow-x-clip">
      <div className="landing-grid absolute inset-0 -z-20" aria-hidden="true" />
      <div className="landing-noise absolute inset-0 -z-10" aria-hidden="true" />
      <div className="landing-orb landing-orb-one absolute -left-24 top-0 -z-10 h-80 w-80 rounded-full blur-3xl" aria-hidden="true" />
      <div className="landing-orb landing-orb-two absolute right-0 top-44 -z-10 h-[26rem] w-[26rem] rounded-full blur-3xl" aria-hidden="true" />

      <nav className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-display text-base font-semibold text-slate-900">PesaFlow</p>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Subscription Billing</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">Features</a>
            <a href="#payments" className="transition-colors hover:text-slate-900">Payments</a>
            <a href="#use-cases" className="transition-colors hover:text-slate-900">Use Cases</a>
            <a href="#estimator" className="transition-colors hover:text-slate-900">Estimator</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <section className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-start">
          <div className="landing-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">
              M-Pesa native subscription platform
            </span>

            <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Automate recurring billing with M-Pesa from signup to recovery.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              PesaFlow helps teams run subscription billing end-to-end: recurring collections, failed payment retries, invoices, refunds, and
              tenant-safe operations in one system.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
              >
                Start Free Workspace
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open Existing Account
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                'Recurring plan automation',
                'M-Pesa payment method coverage',
                'Live collection monitoring',
              ].map((item, index) => (
                <div
                  key={item}
                  className="landing-panel landing-stagger rounded-2xl border border-slate-200 bg-white/90 px-4 py-4"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <p className="text-sm font-medium text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <aside
            id="estimator"
            className="landing-panel landing-rise rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-[0_24px_64px_-40px_rgba(15,23,42,0.38)] sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Collection estimator</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-slate-900">Monthly billing impact</h2>
              </div>
              <div className="rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-700">Annual recovered</p>
                <p className="font-display text-xl font-semibold text-teal-900">{formatKes(estimation.annualRecovered)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Active subscribers</span>
                  <span>{subscribers.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={10000}
                  step={10}
                  value={subscribers}
                  onChange={(event) => setSubscribers(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Average monthly plan (KES)</span>
                  <span>{formatKes(planValue)}</span>
                </div>
                <input
                  type="range"
                  min={300}
                  max={15000}
                  step={100}
                  value={planValue}
                  onChange={(event) => setPlanValue(Number(event.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Failed payment rate</span>
                    <span>{failedRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={35}
                    step={1}
                    value={failedRate}
                    onChange={(event) => setFailedRate(Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Recovery rate</span>
                    <span>{recoveryRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    step={1}
                    value={recoveryRate}
                    onChange={(event) => setRecoveryRate(Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200"
                  />
                </label>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Monthly billing</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatKes(estimation.monthlyBilling)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">At-risk collections</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatKes(estimation.atRisk)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Recovered monthly</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatKes(estimation.recovered)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Net collection rate</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{estimation.collectionRate.toFixed(1)}%</p>
              </div>
            </div>
          </aside>
        </section>

        <section id="features" className="mt-20 sm:mt-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Core capabilities</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
              Everything your team needs to run subscription billing operations
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              From onboarding to renewal recovery, PesaFlow keeps billing workflows predictable and auditable.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {capabilities.map((capability, index) => (
              <article
                key={capability.title}
                className="landing-panel landing-stagger rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.45)]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <h3 className="font-display text-xl font-semibold text-slate-900">{capability.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{capability.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="payments" className="mt-20 rounded-3xl border border-slate-200 bg-white/95 p-6 sm:mt-24 sm:p-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">M-Pesa rails</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
              Support every subscription payment moment
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Handle onboarding payments, recurring debits, and refund flows with webhook-backed updates.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {paymentRails.map((rail, index) => (
              <div
                key={rail.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <h3 className="font-display text-lg font-semibold text-slate-900">{rail.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{rail.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 sm:mt-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Operational flow</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
              From plan setup to reliable monthly collections
            </h2>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-4">
            {operationsFlow.map((item) => (
              <article key={item.step} className="rounded-2xl border border-slate-200 bg-white/95 p-5">
                <p className="text-xs font-semibold tracking-[0.12em] text-teal-700">{item.step}</p>
                <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="use-cases" className="mt-20 rounded-3xl border border-slate-200 bg-white/95 p-6 sm:mt-24 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.96fr_1.04fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Use cases</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
                Adapt billing workflows to your business model
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Switch context by segment to see where to focus first for healthier recurring revenue.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {(Object.keys(segments) as SegmentKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSegment(key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      segment === key
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {segments[key].label}
                  </button>
                ))}
              </div>
            </div>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{activeSegment.label}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">{activeSegment.headline}</h3>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">{activeSegment.description}</p>
              <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">{activeSegment.metric}</p>

              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                {activeSegment.priorities.map((priority) => (
                  <li key={priority}>{priority}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="mt-20 sm:mt-24">
          <div className="rounded-3xl border border-slate-900 bg-slate-900 px-6 py-10 text-slate-100 sm:px-10 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Launch checklist</p>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                  Go live with subscription billing in one operating stack
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Configure plans, connect customer payment flows, and start collecting recurring payments with built-in billing visibility.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Included out of the box</p>
                <ul className="space-y-3 text-sm leading-6 text-slate-100">
                  <li>Tenant-safe user and data isolation</li>
                  <li>Automated renewals with retry logic</li>
                  <li>Invoices, receipts, and refund tracking</li>
                </ul>

                <div className="pt-2">
                  <Link
                    href="/signup"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
                  >
                    Create Workspace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="font-medium">PesaFlow powers M-Pesa subscription billing for modern teams.</p>
          <p>© {new Date().getFullYear()} PesaFlow.io</p>
        </div>
      </footer>
    </div>
  );
}
