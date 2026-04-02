'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/shared/Button';
import {
  discoverBusiness,
  generateReveal,
  completeOnboarding,
  type DiscoveryResult,
  type RevealData,
} from '@/lib/api';

type Step = 1 | 2 | 3 | 4 | 5;
type Priority = 'seo' | 'reviews' | 'social';

interface OnboardingState {
  businessName: string;
  businessType: string;
  city: string;
  photos: File[];
  photoPreviews: string[];
  description: string;
  priority: Priority | null;
  discovery: DiscoveryResult | null;
  reveal: RevealData | null;
}

const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { id: 'salon', label: 'Salon', icon: '💇' },
  { id: 'dental', label: 'Dental', icon: '🦷' },
  { id: 'medical', label: 'Medical', icon: '🏥' },
  { id: 'home-services', label: 'Home Services', icon: '🔧' },
  { id: 'fitness', label: 'Fitness', icon: '🏋️' },
  { id: 'retail', label: 'Retail', icon: '🛍️' },
  { id: 'other', label: 'Other', icon: '📦' },
];

const PRIORITIES: { id: Priority; icon: string; label: string; sublabel: string }[] = [
  { id: 'seo', icon: '🔍', label: 'Get found online', sublabel: 'I need people to find me on Google' },
  { id: 'reviews', icon: '⭐', label: 'Manage my reviews', sublabel: 'I need help with reviews and reputation' },
  { id: 'social', icon: '📱', label: 'Stay active on social', sublabel: 'I need to post more consistently' },
];

// Mock discovery result for demo/offline mode
const MOCK_DISCOVERY: DiscoveryResult = {
  businessName: '',
  address: '1401 S Lamar Blvd, Austin, TX 78704',
  googleRating: 4.3,
  reviewCount: 28,
  yelpStatus: 'Not found on Yelp',
  photoCount: 3,
  instagramStatus: 'No Instagram',
  websiteStatus: 'No website found',
  competitors: [
    { name: 'Torchy\'s Tacos', rating: 4.5, reviewCount: 847 },
    { name: 'Veracruz All Natural', rating: 4.7, reviewCount: 623 },
    { name: 'El Primo', rating: 4.2, reviewCount: 156 },
  ],
};

const MOCK_REVEAL: RevealData = {
  websitePreviewUrl: '',
  businessDescription: 'Authentic Tex-Mex made from scratch daily on South Lamar. Family recipes, local ingredients, and the kind of hospitality that keeps regulars coming back every week.',
  tagline: 'Real Tex-Mex. Real people. Since 2019.',
  socialPostDraft: 'Nothing beats a slow Tuesday with fresh guacamole and good company. Come see us on South Lamar — your table is ready. 🌮',
  socialPostImageUrl: '',
  googleOptimizations: [
    'Updated business description with local keywords',
    'Added hours and holiday schedule',
    'Drafted response for latest review',
  ],
  suggestedCampaign: 'Ask your 5 most recent customers for a Google review',
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<OnboardingState>({
    businessName: '',
    businessType: '',
    city: '',
    photos: [],
    photoPreviews: [],
    description: '',
    priority: null,
    discovery: null,
    reveal: null,
  });
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedAll, setPublishedAll] = useState(false);

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stepContainerRef = useRef<HTMLDivElement>(null);

  // Auto-detect city on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // In production: reverse geocode coordinates to city name
          setState((s) => ({ ...s, city: 'Austin, TX' }));
        },
        () => {
          // Geolocation denied — leave empty for manual entry
        },
      );
    }
  }, []);

  // Smooth scroll to top on step change
  useEffect(() => {
    stepContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const progress = step / 5;

  const goTo = (s: Step) => {
    setValidationError('');
    setStep(s);
  };

  // Step 1 → Step 2: Discover business
  const handleStep1Continue = async () => {
    if (!state.businessName.trim()) {
      setValidationError("What's your business called?");
      return;
    }
    if (!state.businessType) {
      setValidationError('Tap your business type above.');
      return;
    }

    setIsDiscovering(true);
    goTo(2);

    try {
      const result = await discoverBusiness(state.businessName, state.city || 'Austin, TX');
      setState((s) => ({ ...s, discovery: { ...result, businessName: s.businessName } }));
    } catch {
      // Offline/error: use mock data
      setState((s) => ({
        ...s,
        discovery: { ...MOCK_DISCOVERY, businessName: s.businessName },
      }));
    } finally {
      setIsDiscovering(false);
    }
  };

  // Photo handling
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = [...state.photos, ...files].slice(0, 6);
    const newPreviews = newPhotos.map((f) => URL.createObjectURL(f));

    // Revoke old previews
    state.photoPreviews.forEach(URL.revokeObjectURL);

    setState((s) => ({
      ...s,
      photos: newPhotos,
      photoPreviews: newPreviews,
    }));
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(state.photoPreviews[index]);
    setState((s) => ({
      ...s,
      photos: s.photos.filter((_, i) => i !== index),
      photoPreviews: s.photoPreviews.filter((_, i) => i !== index),
    }));
  };

  // Step 3 → Step 4: Generate reveal
  const handleStep3Continue = async () => {
    if (state.photos.length < 3) {
      setValidationError('A few more photos will make your site and posts look great. Can you add at least 3?');
      return;
    }

    goTo(4);
    setIsGenerating(true);

    try {
      const result = await generateReveal(
        state.businessName,
        state.businessType,
        state.description,
      );
      setState((s) => ({ ...s, reveal: result }));
    } catch {
      setState((s) => ({ ...s, reveal: MOCK_REVEAL }));
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 4 priority select → Step 5
  const handlePrioritySelect = (priority: Priority) => {
    setState((s) => ({ ...s, priority }));
    setTimeout(() => goTo(5), 300);
  };

  // Publish everything
  const handlePublishAll = async () => {
    setIsPublishing(true);

    try {
      const formData = new FormData();
      formData.append('businessName', state.businessName);
      formData.append('businessType', state.businessType);
      formData.append('city', state.city || 'Austin, TX');
      formData.append('description', state.description);
      formData.append('priority', state.priority || 'seo');
      state.photos.forEach((photo) => formData.append('photos', photo));

      const result = await completeOnboarding(formData);
      localStorage.setItem('lg_conversation_id', result.conversationId);
    } catch {
      // Even on error, proceed to main app — the thread will catch up
    }

    setPublishedAll(true);
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      {/* Progress bar */}
      <div className="h-[3px] bg-cream w-full flex-shrink-0">
        <div
          className="h-full bg-terracotta transition-all duration-normal ease-default"
          style={{ width: `${progress * 100}%` }}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={5}
        />
      </div>

      {/* Step content */}
      <div ref={stepContainerRef} className="flex-1 overflow-y-auto">
        <div className="px-screen-margin py-8 flex flex-col min-h-full">
          {/* Back button */}
          {step > 1 && step < 5 && (
            <button
              onClick={() => goTo((step - 1) as Step)}
              className="self-start mb-4 text-body text-slate hover:text-charcoal transition-colors"
              aria-label="Go back"
            >
              ← Back
            </button>
          )}

          {/* ============================================================
           * STEP 1: Tell me about your business
           * ============================================================ */}
          {step === 1 && (
            <div className="flex flex-col gap-8 flex-1 animate-in">
              <div>
                <h1>Let&apos;s get your business set up.</h1>
                <p className="text-body text-charcoal mt-2">
                  I just need a few things from you — this will take about five minutes.
                </p>
              </div>

              <input
                type="text"
                value={state.businessName}
                onChange={(e) => {
                  setState({ ...state, businessName: e.target.value });
                  setValidationError('');
                }}
                placeholder="Your business name"
                autoFocus
                className="w-full min-h-tap-min px-[var(--space-input-padding-x)] py-[var(--space-input-padding-y)] text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast"
              />

              <div className="grid grid-cols-4 gap-3">
                {BUSINESS_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setState({ ...state, businessType: type.id });
                      setValidationError('');
                    }}
                    className={[
                      'flex flex-col items-center justify-center gap-1',
                      'min-h-[88px] rounded-md transition-all duration-fast',
                      state.businessType === type.id
                        ? 'bg-terracotta-light border-2 border-terracotta'
                        : 'bg-cream border-2 border-transparent hover:bg-terracotta-light/50',
                    ].join(' ')}
                    aria-pressed={state.businessType === type.id}
                  >
                    <span className="text-[28px]">{type.icon}</span>
                    <span className="text-caption text-charcoal">{type.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-body text-charcoal">
                <span>📍</span>
                {state.city ? (
                  <>
                    <span>{state.city}</span>
                    <button
                      className="text-caption text-terracotta ml-auto"
                      onClick={() => setState({ ...state, city: '' })}
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <input
                    type="text"
                    value={state.city}
                    onChange={(e) => setState({ ...state, city: e.target.value })}
                    placeholder="What city are you in?"
                    className="flex-1 text-body text-charcoal placeholder:text-slate-light bg-transparent border-b border-charcoal/12 focus:border-terracotta outline-none pb-1"
                  />
                )}
              </div>

              {validationError && (
                <p className="text-body text-terracotta">{validationError}</p>
              )}

              <div className="mt-auto pt-4">
                <Button
                  variant="primary"
                  label="Continue"
                  fullWidth
                  onClick={handleStep1Continue}
                />
              </div>
            </div>
          )}

          {/* ============================================================
           * STEP 2: Here's what I found (Discovery)
           * ============================================================ */}
          {step === 2 && (
            <div className="flex flex-col gap-8 flex-1 animate-in">
              {isDiscovering ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <div className="loading-glow w-16 h-16 rounded-full" />
                  <p className="text-body text-charcoal text-center">
                    Finding your business...
                  </p>
                </div>
              ) : state.discovery ? (
                <>
                  <div className="card flex flex-col gap-3">
                    <h2 className="font-semibold">{state.discovery.businessName}</h2>
                    <div className="flex flex-col gap-2 text-body">
                      <div className="flex items-center gap-2">
                        <span className="text-slate w-6 text-center">📍</span>
                        <span>{state.discovery.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate w-6 text-center">⭐</span>
                        <span>
                          {state.discovery.googleRating
                            ? `${state.discovery.googleRating} on Google (${state.discovery.reviewCount} reviews)`
                            : 'Not on Google yet'}
                          {' · '}{state.discovery.yelpStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate w-6 text-center">📸</span>
                        <span>
                          {state.discovery.photoCount} photos on Google · {state.discovery.instagramStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate w-6 text-center">🌐</span>
                        <span>{state.discovery.websiteStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Affirmation */}
                  <p className="text-body text-charcoal">
                    {state.discovery.googleRating
                      ? `You've got a good foundation — ${state.discovery.reviewCount} reviews with a ${state.discovery.googleRating} average is solid. Let me help you build on that.`
                      : "Starting fresh? Perfect. A blank page means we get to do this right from the beginning."}
                  </p>

                  {/* Competitors found */}
                  {state.discovery.competitors.length > 0 && (
                    <div className="card-subtle flex flex-col gap-3">
                      <h3 className="text-caption text-slate uppercase tracking-widest font-semibold">
                        Nearby competition
                      </h3>
                      {state.discovery.competitors.map((comp, i) => (
                        <div key={i} className="flex items-center justify-between text-body">
                          <span className="text-charcoal">{comp.name}</span>
                          <span className="text-slate">
                            ⭐ {comp.rating} ({comp.reviewCount})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-4 flex flex-col gap-3">
                    <Button variant="primary" label="That's me" fullWidth onClick={() => goTo(3)} />
                    <button className="text-caption text-terracotta text-center py-2">
                      Something wrong? Edit details
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ============================================================
           * STEP 3: Show me your best (Photos)
           * ============================================================ */}
          {step === 3 && (
            <div className="flex flex-col gap-8 flex-1 animate-in">
              <div>
                <h1>Now show me what makes your business special.</h1>
                <p className="text-body text-charcoal mt-2">
                  Upload a few photos — your space, your team, your best work.
                  I&apos;ll use these everywhere.
                </p>
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-3 gap-2">
                {state.photoPreviews.map((preview, i) => (
                  <div key={i} className="aspect-square rounded-sm overflow-hidden relative group">
                    <img
                      src={preview}
                      alt={`Business photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-charcoal/60 text-white rounded-full flex items-center justify-center text-small opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {state.photos.length < 6 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-sm border-2 border-dashed flex flex-col items-center justify-center gap-1 text-slate hover:text-charcoal hover:border-terracotta transition-colors"
                    style={{ borderColor: 'var(--border-default)' }}
                    aria-label="Add photo"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" x2="12" y1="5" y2="19" />
                      <line x1="5" x2="19" y1="12" y2="12" />
                    </svg>
                    <span className="text-small">Add</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
                aria-hidden="true"
              />

              <input
                type="text"
                value={state.description}
                onChange={(e) => setState({ ...state, description: e.target.value })}
                placeholder="What makes you special? (optional)"
                className="w-full min-h-tap-min px-[var(--space-input-padding-x)] py-[var(--space-input-padding-y)] text-body text-charcoal placeholder:text-slate-light bg-cream rounded-md border border-transparent focus:border-terracotta outline-none transition-colors duration-fast"
              />

              <p className="text-caption text-slate">
                💡 the more photos you share, the better your site and posts will look
              </p>

              {validationError && (
                <p className="text-body text-terracotta">{validationError}</p>
              )}

              <div className="mt-auto pt-4">
                <Button
                  variant="primary"
                  label="Continue"
                  fullWidth
                  onClick={handleStep3Continue}
                />
              </div>
            </div>
          )}

          {/* ============================================================
           * STEP 4: What matters most (Priority)
           * ============================================================ */}
          {step === 4 && !isGenerating && (
            <div className="flex flex-col gap-8 flex-1 animate-in">
              <h1>What matters most to you right now?</h1>

              <div className="flex flex-col gap-3">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePrioritySelect(p.id)}
                    className="flex items-center gap-4 p-5 rounded-md text-left bg-white shadow-sm hover:bg-terracotta-light transition-colors duration-fast min-h-[80px]"
                  >
                    <span className="text-[28px] flex-shrink-0">{p.icon}</span>
                    <div>
                      <span className="text-h2 text-charcoal block">{p.label}</span>
                      <span className="text-body text-slate">{p.sublabel}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generating loading state — "like a sign being painted" */}
          {step === 4 && isGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-in">
              <div className="relative">
                <h1
                  className="text-display text-charcoal text-center"
                  style={{
                    animation: 'fadeUp 1.5s cubic-bezier(0, 0, 0.2, 1) both',
                  }}
                >
                  {state.businessName}
                </h1>
                <p
                  className="text-body text-slate text-center mt-2"
                  style={{
                    animation: 'fadeUp 1.5s cubic-bezier(0, 0, 0.2, 1) 0.5s both',
                  }}
                >
                  {state.reveal?.tagline || MOCK_REVEAL.tagline}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="loading-glow w-48 h-1 rounded-full" />
                <p
                  className="text-caption text-slate"
                  style={{
                    animation: 'fadeUp 0.5s cubic-bezier(0, 0, 0.2, 1) 1s both',
                  }}
                >
                  Building something beautiful...
                </p>
              </div>
            </div>
          )}

          {/* ============================================================
           * STEP 5: The Reveal — The iPhone Moment
           * ============================================================ */}
          {step === 5 && (
            <div className="flex flex-col gap-8 flex-1">
              {publishedAll ? (
                /* Post-publish confirmation */
                <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-in">
                  <div className="w-16 h-16 rounded-full bg-sage-light flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sage">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h1 className="text-center">Published!</h1>
                  <p className="text-body text-slate text-center">Welcome to LocalGenius.</p>
                </div>
              ) : (
                /* The reveal cards */
                <>
                  <h1 className="animate-in">Here&apos;s what I built for you.</h1>

                  {/* Website — designed to look like a real site preview */}
                  <div className="card animate-in reveal-stagger-1 flex flex-col gap-card-gap">
                    <span className="text-caption text-slate uppercase tracking-widest font-semibold">
                      Your Website
                    </span>
                    <div className="rounded-md overflow-hidden border" style={{ borderColor: 'var(--border-default)' }}>
                      {/* Fake browser chrome */}
                      <div className="bg-cream px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-light/40" />
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-light/40" />
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-light/40" />
                        </div>
                        <div className="flex-1 bg-warm-white rounded-sm px-2 py-0.5 text-small text-slate text-center">
                          {state.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}atx.com
                        </div>
                      </div>
                      {/* Site preview */}
                      <div className="bg-warm-white">
                        {/* Hero with photo */}
                        {state.photoPreviews[0] ? (
                          <div className="relative h-40 overflow-hidden">
                            <img src={state.photoPreviews[0]} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <h3 className="text-h2 text-white font-semibold">{state.businessName}</h3>
                              <p className="text-caption text-white/80">
                                {state.reveal?.tagline || MOCK_REVEAL.tagline}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="h-40 bg-cream flex items-center justify-center">
                            <h3 className="text-h1 text-charcoal">{state.businessName}</h3>
                          </div>
                        )}
                        {/* Content preview */}
                        <div className="p-4 flex flex-col gap-3">
                          <p className="text-caption text-charcoal leading-relaxed">
                            {state.reveal?.businessDescription || MOCK_REVEAL.businessDescription}
                          </p>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-terracotta text-white text-small text-center py-2 rounded-sm font-semibold">
                              Book a Table
                            </div>
                            <div className="flex-1 bg-cream text-charcoal text-small text-center py-2 rounded-sm">
                              View Menu
                            </div>
                          </div>
                          {state.discovery?.googleRating && (
                            <div className="flex items-center gap-1 text-small text-slate">
                              <span className="text-gold">★</span>
                              {state.discovery.googleRating} · {state.discovery.reviewCount} reviews
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-caption text-terracotta">
                      {state.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}atx.com — live now
                    </p>
                    <div className="flex gap-3">
                      <div className="flex-[3]"><Button variant="primary" label="View Site" fullWidth onClick={() => {}} /></div>
                      <div className="flex-[2]"><Button variant="secondary" label="Edit" fullWidth onClick={() => {}} /></div>
                    </div>
                  </div>

                  {/* Social post */}
                  <div className="card animate-in reveal-stagger-2 flex flex-col gap-card-gap">
                    <span className="text-caption text-slate uppercase tracking-widest font-semibold">
                      Your First Post
                    </span>
                    {state.photoPreviews[0] && (
                      <div className="aspect-square rounded-sm overflow-hidden">
                        <img src={state.photoPreviews[0]} alt="Social post preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="text-body text-charcoal">
                      {state.reveal?.socialPostDraft || MOCK_REVEAL.socialPostDraft}
                    </p>
                    <div className="flex gap-3">
                      <div className="flex-[3]"><Button variant="primary" label="Post Now" fullWidth onClick={() => {}} /></div>
                      <div className="flex-[2]"><Button variant="secondary" label="Edit" fullWidth onClick={() => {}} /></div>
                    </div>
                  </div>

                  {/* Google listing */}
                  <div className="card animate-in reveal-stagger-3 flex flex-col gap-card-gap">
                    <span className="text-caption text-slate uppercase tracking-widest font-semibold">
                      Your Google Listing
                    </span>
                    <ul className="flex flex-col gap-2">
                      {(state.reveal?.googleOptimizations || MOCK_REVEAL.googleOptimizations).map((opt, i) => (
                        <li key={i} className="flex items-start gap-2 text-body text-charcoal">
                          <span className="text-sage mt-0.5">✓</span>
                          {opt}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-3">
                      <div className="flex-[3]"><Button variant="primary" label="Looks Good" fullWidth onClick={() => {}} /></div>
                      <div className="flex-[2]"><Button variant="secondary" label="Edit" fullWidth onClick={() => {}} /></div>
                    </div>
                  </div>

                  {/* Campaign */}
                  <div className="card animate-in reveal-stagger-4 flex flex-col gap-card-gap">
                    <span className="text-caption text-slate uppercase tracking-widest font-semibold">
                      First Campaign
                    </span>
                    <p className="text-body text-charcoal">
                      {state.reveal?.suggestedCampaign || MOCK_REVEAL.suggestedCampaign}
                    </p>
                    <div className="flex gap-3">
                      <div className="flex-[3]"><Button variant="primary" label="Start Campaign" fullWidth onClick={() => {}} /></div>
                      <div className="flex-[2]"><Button variant="secondary" label="Later" fullWidth onClick={() => {}} /></div>
                    </div>
                  </div>

                  {/* Master publish */}
                  <div className="mt-4 mb-8">
                    <Button
                      variant="primary"
                      label="Looks good — publish everything"
                      fullWidth
                      loading={isPublishing}
                      onClick={handlePublishAll}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
