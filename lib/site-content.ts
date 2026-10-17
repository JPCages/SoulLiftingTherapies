import { categories, type Category } from './sandbox-data';

export type Feeling = { icon: string; label: string };

export type SiteContent = {
  // Business
  businessName: string; descriptor: string;
  heroTitle: string; heroAccent: string; heroIntro: string;
  phone: string; email: string; horncastle: string; woodhall: string; notice: string;
  categories: Category[];

  // Banner images (behind headings)
  heroImage?: string;        // homepage hero
  accountHeroImage?: string; // customer account hero

  // Homepage copy
  homeMenuEyebrow?: string; homeMenuHeading?: string;
  homePrivateEyebrow?: string; homePrivateHeading?: string; homePrivateIntro?: string;
  homeLoginCta?: string;

  // Services page copy
  servicesTitle?: string; servicesHelpHeading?: string; servicesHelpCta?: string;

  // Customer account copy
  accountGreeting?: string; accountName?: string; accountSubtitle?: string;
  feelingHeading?: string; feelings?: Feeling[];
  appointmentLabel?: string; appointmentHeading?: string; appointmentEmpty?: string; appointmentHint?: string; appointmentCta?: string;
  wellbeingLabel?: string; wellbeingHint?: string;
  pointsLabel?: string; pointsIntro?: string;
  journeyHeading?: string; journeyIntro?: string;

  // Booking page copy (legacy sandbox fields, no longer rendered)
  bookingEyebrow?: string; bookingHeading?: string; bookingIntro?: string; bookingNote?: string;
  bookingSuccessHeading?: string; bookingSuccessBody?: string;

  // Booking request copy. New keys so saved sandbox wording cannot override them.
  bookingRequestEyebrow?: string; bookingRequestHeading?: string; bookingRequestIntro?: string;
  bookingRequestNote?: string; bookingResponseTime?: string;
  bookingRequestSuccessHeading?: string; bookingRequestSuccessBody?: string;

  // Customer-app features that are not built yet; off until they are.
  wellbeingEnabled?: boolean; journeyEnabled?: boolean;

  // Homepage layout (2026 redesign). Every field is optional and falls back to a
  // sensible default or hides itself, so existing saved content keeps working.
  homeMenuSub?: string;                 // blank -> a sentence counted from the live menu
  homeHeroCaptionTitle?: string; homeHeroCaptionText?: string;   // blank -> no caption on the photo
  homeTrustYears?: string; homeTrustPlaces?: string;             // blank -> that item is hidden
  homeHowEyebrow?: string; homeHowHeading?: string; homeHowIntro?: string;
  homeStep1Title?: string; homeStep1Text?: string;
  homeStep2Title?: string; homeStep2Text?: string;
  homeStep3Title?: string; homeStep3Text?: string;
  homeFindHeading?: string; homeFindIntro?: string;
  horncastleHours?: string; woodhallHours?: string;              // blank -> no hours shown

  // Login page copy
  loginEyebrow?: string; loginHeading?: string; loginIntro?: string;
  loginCustomerTitle?: string; loginCustomerBlurb?: string;
  loginAdminTitle?: string; loginAdminBlurb?: string;

  // Loyalty (Soul Points) rules
  loyaltyEnabled?: boolean;
  loyaltyPoundsPerPoint?: number; // £ spent per 1 point (default 10 → £10 = 1 point)
  loyaltyRewardPoints?: number;   // points needed for a reward (default 40 → £400)
  loyaltyRewardText?: string;     // what the reward is
};

export const defaultSiteContent: SiteContent = {
  businessName: 'Soul Lifting Therapies', descriptor: 'Massage & Facial Specialist',
  heroTitle: 'Beauty that feels like', heroAccent: 'time for you.',
  heroIntro: 'Emma creates calm, considered treatments in Horncastle and Woodhall Spa.',
  phone: '07539 867002', email: 'soulliftingtherapies@gmail.com',
  horncastle: 'Coco Hair & Beauty, 25 Bull Ring, Horncastle, LN9 5HU',
  woodhall: 'Ashlex Hair & Beauty, Tattershall Road, Woodhall Spa, Lincolnshire, LN10 6QJ',
  notice: '', categories,

  heroImage: '/images/room-forest.jpeg',
  accountHeroImage: '/images/room-forest.jpeg',

  homeMenuEyebrow: 'Treatment menu',
  homeMenuHeading: 'Choose what feels right today.',
  homePrivateEyebrow: 'Your private space',
  homePrivateHeading: 'Appointments, progress and rewards—together.',
  homePrivateIntro: 'Customer accounts give you a private place for your treatment journey.',
  homeLoginCta: 'Log in or create an account',

  servicesTitle: 'Treatments',
  servicesHelpHeading: 'Not sure which treatment is right for you?',
  servicesHelpCta: 'Ask Emma',

  accountGreeting: 'Welcome back', accountName: 'there', accountSubtitle: 'Your personal wellbeing space',
  feelingHeading: 'How are you feeling today?',
  feelings: [
    { icon: '☾', label: 'Tired' },
    { icon: '☼', label: 'Stressed' },
    { icon: '⌁', label: 'Tight muscles' },
    { icon: '✦', label: 'Dull skin' },
  ],
  appointmentLabel: 'UPCOMING APPOINTMENT', appointmentHeading: 'Next treatment',
  appointmentEmpty: 'No appointment booked', appointmentHint: 'When you book, your appointment will appear here.',
  appointmentCta: 'Book a treatment →',
  wellbeingLabel: 'WELLBEING SCORE', wellbeingHint: 'Your private check-in',
  pointsLabel: 'SOUL POINTS', pointsIntro: 'Rewards will be added once the programme is live.',
  journeyHeading: 'Your treatment journey',
  journeyIntro: 'Keep private before-and-after photos and notes you choose to save, so you can look back at your progress.',

  bookingEyebrow: 'Sandbox booking preview', bookingHeading: 'Choose your time out.',
  bookingIntro: 'These are example slots only. The real app will check Fresha before confirming anything.',
  bookingNote: 'When live, Emma checks the request against Fresha first, then sends the £10 deposit link.',
  bookingSuccessHeading: 'Test request received.',
  bookingSuccessBody: 'No booking has been made, no email was sent and no deposit was requested.',

  bookingRequestEyebrow: 'Request a treatment',
  bookingRequestHeading: 'Tell Emma when suits you.',
  bookingRequestIntro: 'Choose your treatment and the times that work for you. Emma checks her diary and comes back to confirm — sending this does not book the appointment itself.',
  bookingRequestNote: 'Emma confirms by text or email, usually within a day. A £10 deposit secures the appointment once she has confirmed the time.',
  bookingResponseTime: 'within a day',
  bookingRequestSuccessHeading: 'Request sent.',
  bookingRequestSuccessBody: 'Emma will check her diary and come back to you to confirm. Nothing is held until she does.',

  wellbeingEnabled: false,
  journeyEnabled: false,

  homeTrustYears: '10+ years in practice',
  homeTrustPlaces: 'Two locations across Lincolnshire',
  homeHowEyebrow: 'Booking',
  homeHowHeading: 'How booking works',
  homeHowIntro: 'Emma keeps her diary in Fresha, so nothing is confirmed by a machine. You ask, she checks, she comes back to you.',
  homeStep1Title: 'Tell her when suits',
  homeStep1Text: 'Pick a treatment and the days or times that work for you. It takes about a minute.',
  homeStep2Title: 'Emma checks her diary',
  homeStep2Text: 'She confirms by text or email, usually within a day. Nothing is held until she does.',
  homeStep3Title: '£10 secures it',
  homeStep3Text: 'A deposit confirms the appointment and comes off the price on the day.',
  homeFindHeading: 'Where to find Emma',
  homeFindIntro: 'Two rooms, both easy to park at.',

  loginEyebrow: 'Your private space', loginHeading: 'Welcome back.',
  loginIntro: 'Choose how you would like to continue.',
  loginCustomerTitle: 'I’m a customer', loginCustomerBlurb: 'Appointments, progress and rewards',
  loginAdminTitle: 'I’m Emma', loginAdminBlurb: 'Manage treatments and business content',

  loyaltyEnabled: true,
  loyaltyPoundsPerPoint: 10,
  loyaltyRewardPoints: 40,
  loyaltyRewardText: 'Free 15-minute massage',
};

// Merge a stored (possibly partial) document over the defaults so every field is present.
export function withDefaults(stored?: Partial<SiteContent> | null): SiteContent {
  const c = { ...defaultSiteContent, ...(stored ?? {}) };
  if (!Array.isArray(c.categories) || c.categories.length === 0) c.categories = categories;
  if (!Array.isArray(c.feelings) || c.feelings.length === 0) c.feelings = defaultSiteContent.feelings;
  return c;
}
