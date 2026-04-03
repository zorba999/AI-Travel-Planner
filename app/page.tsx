'use client';

import { useState, useEffect } from 'react';
import {
  MapPin, Calendar, Wallet, Users, Plane,
  Sun, CloudSun, Moon, Utensils, Lightbulb,
  ArrowLeft, Sparkles, ChevronDown, ChevronUp, ShieldCheck,
} from 'lucide-react';

/* ── Types ── */
interface Activity {
  activity: string;
  description: string;
  location: string;
  estimated_cost: string;
}

interface DayPlan {
  day_number: number;
  theme: string;
  morning: Activity;
  afternoon: Activity;
  evening: Activity;
  lunch_recommendation: string;
  dinner_recommendation: string;
  estimated_day_cost: string;
}

interface ItineraryData {
  destination: string;
  duration: string;
  total_budget: string;
  overview: string;
  budget_breakdown: string;
  pro_tips: string[];
  days: DayPlan[];
}

interface FormData {
  destination: string;
  days: number;
  budget: string;
  currency: string;
  styles: string[];
  travelers: number;
}

/* ── Constants ── */
const TRAVEL_STYLES = [
  { id: 'culture',   label: '🏛️ Culture' },
  { id: 'food',      label: '🍜 Food & Gastronomy' },
  { id: 'nature',    label: '🌿 Nature & Outdoors' },
  { id: 'relax',     label: '🏖️ Relax & Wellness' },
  { id: 'adventure', label: '🧗 Adventure' },
  { id: 'nightlife', label: '🌙 Nightlife' },
  { id: 'shopping',  label: '🛍️ Shopping' },
  { id: 'history',   label: '📸 History & Art' },
];

const CURRENCIES = [
  { value: 'EUR', symbol: '€' },
  { value: 'USD', symbol: '$' },
  { value: 'GBP', symbol: '£' },
  { value: 'JPY', symbol: '¥' },
];

const LOADING_MESSAGES = [
  'Mapping the perfect route…',
  'Finding hidden gems…',
  'Curating local experiences…',
  'Calculating smart budget splits…',
  'Almost ready for takeoff…',
];

/* ── Background blobs ── */
function Blobs() {
  return (
    <>
      <div
        className="pointer-events-none fixed top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full animate-blob"
        style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none fixed top-[40%] right-[-10%] w-[420px] h-[420px] rounded-full animate-blob animation-delay-2000"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.13) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none fixed bottom-[-5%] left-[30%] w-[380px] h-[380px] rounded-full animate-blob animation-delay-4000"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }}
      />
    </>
  );
}

/* ── Loading view ── */
function LoadingView({ destination }: { destination: string }) {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] gap-8 animate-fade-in-up">
      {/* Animated rings + plane */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border border-teal-500/20 animate-ping"
          style={{ animationDuration: '2.4s' }}
        />
        <div
          className="absolute inset-3 rounded-full border border-teal-400/15 animate-ping"
          style={{ animationDuration: '2.4s', animationDelay: '0.6s' }}
        />
        <div className="absolute inset-6 rounded-full border border-teal-400/10 animate-ping"
          style={{ animationDuration: '2.4s', animationDelay: '1.2s' }}
        />
        <div
          className="relative w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(13,148,136,0.3), rgba(8,145,178,0.2))' }}
        >
          <Plane className="w-9 h-9 text-teal-400 animate-float" style={{ transform: 'rotate(45deg)' }} />
        </div>
      </div>

      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-white">
          Planning your trip to{' '}
          <span className="gradient-text">{destination}</span>
        </h2>
        <p className="text-slate-400 text-sm h-6 transition-all duration-500">
          {LOADING_MESSAGES[msgIdx]}
        </p>
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-teal-500"
            style={{ animation: `bounce 1s infinite ${i * 0.18}s` }}
          />
        ))}
      </div>

      <p className="text-xs text-slate-600">
        Inference paid with <span className="text-teal-500 font-semibold">$OPG</span> · TEE-verified on Base Sepolia
      </p>
    </div>
  );
}

/* ── Activity card ── */
function ActivityCard({
  label, icon, accentColor, borderColor, activity,
}: {
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  borderColor: string;
  activity: Activity;
}) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderColor,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>
          {label}
        </span>
      </div>
      <p className="font-semibold text-white text-sm">{activity.activity}</p>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{activity.description}</p>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-slate-500">📍 {activity.location}</span>
        <span className="text-xs font-semibold" style={{ color: accentColor }}>
          {activity.estimated_cost}
        </span>
      </div>
    </div>
  );
}

/* ── Day card ── */
function DayCard({ day, index }: { day: DayPlan; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="glass rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: `${index * 0.06}s` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between text-left glass-hover"
      >
        <div className="flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black shrink-0"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
          >
            {day.day_number}
          </span>
          <h3 className="font-semibold text-white text-sm">{day.theme}</h3>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-xs font-semibold text-teal-400 hidden sm:block">
            {day.estimated_day_cost}
          </span>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/5">
          <div className="pt-3 space-y-3">
            <ActivityCard
              label="Morning"
              icon={<Sun className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />}
              accentColor="#fbbf24"
              borderColor="rgba(251,191,36,0.15)"
              activity={day.morning}
            />
            <ActivityCard
              label="Afternoon"
              icon={<CloudSun className="w-3.5 h-3.5" style={{ color: '#60a5fa' }} />}
              accentColor="#60a5fa"
              borderColor="rgba(96,165,250,0.15)"
              activity={day.afternoon}
            />
            <ActivityCard
              label="Evening"
              icon={<Moon className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} />}
              accentColor="#a78bfa"
              borderColor="rgba(167,139,250,0.15)"
              activity={day.evening}
            />
          </div>

          {/* Dining */}
          <div
            className="rounded-xl p-4 border"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(52,211,153,0.15)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Dining</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">Lunch: </span>
              {day.lunch_recommendation}
            </p>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              <span className="font-semibold text-white">Dinner: </span>
              {day.dinner_recommendation}
            </p>
          </div>

          <p className="text-right text-xs text-slate-600 font-medium">
            Day total: <span className="text-teal-400">{day.estimated_day_cost}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Results view ── */
function ResultsView({
  itinerary,
  raw,
  transactionHash,
  isDemo,
  onReset,
}: {
  itinerary: ItineraryData | null;
  raw: string | null;
  transactionHash: string | null;
  isDemo: boolean;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-slate-500 hover:text-teal-400 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Plan another trip
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse inline-block" />
          OpenGradient AI
        </div>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div
          className="rounded-xl px-4 py-3 text-xs flex items-start gap-2 border"
          style={{
            background: 'rgba(251,191,36,0.06)',
            borderColor: 'rgba(251,191,36,0.2)',
            color: '#fcd34d',
          }}
        >
          <span className="mt-0.5">⚡</span>
          <span>
            <span className="font-bold">Demo mode</span> — Add{' '}
            <code className="bg-amber-500/10 px-1 py-0.5 rounded font-mono">OG_PRIVATE_KEY</code>{' '}
            to your environment variables for live AI inference on OpenGradient.
          </span>
        </div>
      )}

      {/* On-chain verification badge */}
      {transactionHash && (
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 animate-glow-pulse border"
          style={{
            background: 'rgba(45,212,191,0.06)',
            borderColor: 'rgba(45,212,191,0.25)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-teal-400">Inference verified on-chain</p>
              <p className="text-[10px] text-teal-600 font-mono truncate">{transactionHash}</p>
            </div>
          </div>
          {transactionHash.startsWith('0x') && (
            <a
              href={`https://sepolia.basescan.org/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-400 font-bold hover:text-teal-300 underline shrink-0 transition-colors"
            >
              View on BaseScan →
            </a>
          )}
        </div>
      )}

      {itinerary ? (
        <>
          {/* Destination hero */}
          <div
            className="rounded-2xl p-7 text-white border border-white/10 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #0d4f4f)' }}
          >
            {/* Decorative plane */}
            <Plane
              className="absolute right-6 top-6 w-16 h-16 opacity-10"
              style={{ transform: 'rotate(45deg)' }}
            />
            <div className="relative">
              <h2 className="text-3xl font-black tracking-tight mb-1">{itinerary.destination}</h2>
              <div className="flex flex-wrap gap-3 text-sm text-teal-200 mt-2">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {itinerary.duration}
                </span>
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" /> {itinerary.total_budget}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">{itinerary.overview}</p>
              {itinerary.budget_breakdown && (
                <div
                  className="mt-4 rounded-xl p-3 border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest mb-1">
                    Budget Breakdown
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">{itinerary.budget_breakdown}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pro tips */}
          {itinerary.pro_tips?.length > 0 && (
            <div
              className="rounded-2xl p-5 border"
              style={{
                background: 'rgba(251,191,36,0.05)',
                borderColor: 'rgba(251,191,36,0.15)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-amber-300 text-sm">Pro Tips</h3>
              </div>
              <ul className="space-y-2">
                {itinerary.pro_tips.map((tip, i) => (
                  <li key={i} className="text-xs text-amber-200/80 flex items-start gap-2 leading-relaxed">
                    <span className="text-amber-500 mt-0.5 shrink-0">›</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Day-by-day */}
          <div>
            <h3 className="font-bold text-slate-300 text-sm uppercase tracking-widest mb-4">
              Day-by-Day Itinerary
            </h3>
            <div className="space-y-3">
              {itinerary.days?.map((day, i) => (
                <DayCard key={day.day_number} day={day} index={i} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Your Travel Itinerary</h2>
          <pre className="text-xs text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">{raw}</pre>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    destination: '',
    days: 5,
    budget: '500',
    currency: 'EUR',
    styles: ['culture', 'food'],
    travelers: 1,
  });
  const [step, setStep] = useState<'form' | 'loading' | 'results'>('form');
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const toggleStyle = (id: string) =>
    setFormData((prev) => ({
      ...prev,
      styles: prev.styles.includes(id)
        ? prev.styles.filter((s) => s !== id)
        : [...prev.styles, id],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destination.trim() || formData.styles.length === 0) return;

    setStep('loading');
    setError(null);
    setItinerary(null);
    setRawResponse(null);
    setTransactionHash(null);
    setIsDemo(false);

    try {
      const currencySymbol = CURRENCIES.find((c) => c.value === formData.currency)?.symbol || formData.currency;
      const styleLabels = formData.styles.map(
        (s) => TRAVEL_STYLES.find((t) => t.id === s)?.label.replace(/^\S+\s/, '') || s,
      );

      const apiUrl = process.env.NEXT_PUBLIC_VERCEL_ENV ? '/api/infer' : '/api/generate';
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: formData.destination,
          days: formData.days,
          budget: formData.budget,
          currency: currencySymbol,
          styles: styleLabels,
          travelers: formData.travelers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate itinerary');
        setStep('form');
        return;
      }

      if (data.itinerary) setItinerary(data.itinerary);
      else if (data.raw) setRawResponse(data.raw);

      if (data.transaction_hash && data.transaction_hash !== 'pending') {
        setTransactionHash(data.transaction_hash);
      }
      setIsDemo(!!data.demo);
      setStep('results');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
      setStep('form');
    }
  };

  const reset = () => {
    setStep('form');
    setItinerary(null);
    setRawResponse(null);
    setError(null);
    setTransactionHash(null);
    setIsDemo(false);
  };

  const isValid = formData.destination.trim().length > 0 && formData.styles.length > 0;

  return (
    <main
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: '#080c18' }}
    >
      <Blobs />

      <div className="relative z-10 max-w-2xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border"
            style={{
              background: 'rgba(45,212,191,0.08)',
              borderColor: 'rgba(45,212,191,0.2)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse inline-block" />
            <span className="text-xs font-semibold text-teal-400 tracking-widest uppercase">
              Powered by OpenGradient
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3">
            AI{' '}
            <span className="gradient-text">Travel</span>{' '}
            Planner
          </h1>
          <p className="text-slate-400 text-lg">
            Your personalized itinerary, verified on-chain
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-5 py-4 mb-6 text-sm flex items-start gap-3 border animate-fade-in-up"
            style={{
              background: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.2)',
              color: '#fca5a5',
            }}
          >
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>
              {error}
              {(error.toLowerCase().includes('opg') ||
                error.toLowerCase().includes('balance') ||
                error.toLowerCase().includes('payment')) && (
                <>
                  {' '}—{' '}
                  <a
                    href="https://faucet.opengradient.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold text-red-300 hover:text-white"
                  >
                    Get $OPG tokens from the faucet
                  </a>
                </>
              )}
            </span>
          </div>
        )}

        {/* Form */}
        {step === 'form' && (
          <form
            onSubmit={handleSubmit}
            className="glass rounded-3xl p-7 space-y-7 animate-fade-in-up shadow-2xl"
            style={{ boxShadow: '0 0 60px rgba(0,0,0,0.5)' }}
          >
            {/* Destination */}
            <div>
              <label className="block text-[11px] font-bold text-teal-400 uppercase tracking-widest mb-2.5">
                <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
                Destination
              </label>
              <input
                type="text"
                placeholder="e.g. Istanbul, Turkey"
                value={formData.destination}
                onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
                className="glass-input w-full px-4 py-3.5 rounded-xl text-base"
              />
            </div>

            {/* Duration + Budget */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-teal-400 uppercase tracking-widest mb-2.5">
                  <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                  Duration
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={formData.days}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        days: Math.max(1, Math.min(14, parseInt(e.target.value) || 1)),
                      }))
                    }
                    className="glass-input w-full px-4 py-3.5 rounded-xl pr-14"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                    days
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-teal-400 uppercase tracking-widest mb-2.5">
                  <Wallet className="w-3.5 h-3.5 inline mr-1.5" />
                  Budget
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="500"
                    value={formData.budget}
                    onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
                    className="glass-input flex-1 min-w-0 px-4 py-3.5 rounded-xl"
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                    className="glass-input px-3 py-3.5 rounded-xl"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.symbol}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Travelers */}
            <div>
              <label className="block text-[11px] font-bold text-teal-400 uppercase tracking-widest mb-2.5">
                <Users className="w-3.5 h-3.5 inline mr-1.5" />
                Travelers
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, travelers: n }))}
                    className="flex-1 py-3 rounded-xl text-sm font-bold border transition-all"
                    style={
                      formData.travelers === n
                        ? {
                            background: 'linear-gradient(135deg, rgba(13,148,136,0.4), rgba(8,145,178,0.3))',
                            borderColor: 'rgba(45,212,191,0.5)',
                            color: '#2dd4bf',
                            boxShadow: '0 0 12px rgba(45,212,191,0.15)',
                          }
                        : {
                            background: 'rgba(255,255,255,0.03)',
                            borderColor: 'rgba(255,255,255,0.08)',
                            color: '#64748b',
                          }
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel style */}
            <div>
              <label className="block text-[11px] font-bold text-teal-400 uppercase tracking-widest mb-2.5">
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                Travel Style{' '}
                <span className="text-slate-600 font-normal normal-case tracking-normal">
                  (pick at least one)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TRAVEL_STYLES.map((style) => {
                  const active = formData.styles.includes(style.id);
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => toggleStyle(style.id)}
                      className="px-3.5 py-2 rounded-xl text-xs border font-semibold transition-all"
                      style={
                        active
                          ? {
                              background: 'rgba(45,212,191,0.12)',
                              borderColor: 'rgba(45,212,191,0.4)',
                              color: '#2dd4bf',
                              boxShadow: '0 0 10px rgba(45,212,191,0.12)',
                            }
                          : {
                              background: 'rgba(255,255,255,0.03)',
                              borderColor: 'rgba(255,255,255,0.08)',
                              color: '#64748b',
                            }
                      }
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid}
              className="btn-primary w-full py-4 text-white font-black rounded-xl text-base flex items-center justify-center gap-2.5"
            >
              <Plane className="w-5 h-5" style={{ transform: 'rotate(45deg)' }} />
              Generate My Itinerary
            </button>

            <p className="text-center text-[11px] text-slate-700">
              Inference paid with{' '}
              <span className="text-teal-500 font-bold">$OPG</span>
              {' '}via OpenGradient x402 · TEE-verified on Base Sepolia
            </p>
          </form>
        )}

        {step === 'loading' && <LoadingView destination={formData.destination} />}

        {step === 'results' && (
          <ResultsView
            itinerary={itinerary}
            raw={rawResponse}
            transactionHash={transactionHash}
            isDemo={isDemo}
            onReset={reset}
          />
        )}
      </div>
    </main>
  );
}
