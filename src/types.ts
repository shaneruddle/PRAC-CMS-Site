export interface Translation {
  title?: string;
  metaDescription?: string;
  body?: string;
  excerpt?: string;
  name?: string;
  h1?: string;
  intro?: string;
  deliveryInfo?: string;
  drivingTips?: string;
  question?: string;
  answer?: string;
  description?: string;
  longDescription?: string;
  alternativeRationale?: string;
  faqs?: { question: string; answer: string }[];
}

export type Status = 'draft' | 'published';

export interface BlogPost {
  id?: string;
  slug: string;
  status: Status;
  publishedAt: any;
  updatedAt: any;
  createdAt: any;
  author: string;
  category: string;
  featuredImage: string;
  translations: Record<string, Translation>;
  seo: {
    ogImage?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
  };
}

export interface Location {
  id?: string;
  slug: string;
  status: Status;
  displayOrder: number;
  heroImage: string;
  mapEmbedUrl: string;
  translations: Record<string, Translation>;
  nearbyAreas: string[];
  featuredCarIds: string[];
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };
  updatedAt: any;
  createdAt: any;
}

export interface VehicleGuide {
  id?: string;
  slug: string;
  status: Status;
  displayOrder: number;
  make: string;
  model: string;
  year: number;
  category: 'sedan' | 'suv' | 'pickup' | 'hatchback' | 'premium' | 'economy';
  heroImage: string;
  gallery: string[];
  specs: {
    seats: number;
    transmission: 'automatic' | 'manual';
    fuelType: string;
    luggage: string;
    features: string[];
  };
  featuredCarIds: string[];
  translations: Record<string, Translation>;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
  };
  updatedAt: any;
  createdAt: any;
}

export interface WebsiteCar {
  id?: string;
  name: string;
  priceGridVehicle?: string;
  mainImage?: string;
  isActive?: boolean;
}

export interface FAQ {
  id?: string;
  category: string;
  status: Status;
  displayOrder: number;
  translations: Record<string, Translation>;
  updatedAt: any;
  createdAt: any;
}

export interface DeployTrigger {
  id?: string;
  triggeredAt: any;
  triggeredBy: string;
  status: 'queued' | 'building' | 'deployed' | 'failed';
  changedCollection: string;
  changedDocId: string;
}

export interface HotelAttraction {
  name: string;
  distanceKm: number;
}

export interface Hotel {
  id?: string;
  slug: string;
  name: string;
  category: string;
  stars: number;
  area: string;
  address: string;
  lat: number;
  lng: number;
  published: boolean;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  headlineOffer: string;
  guestDiscount: number;
  discountCode: string;
  pickupNotes: string;
  responseTime: string;
  body: string;
  nearbyAttractions: HotelAttraction[];
  whyRentFromUs: string[];
  faqs: { question: string; answer: string }[];
  outreachStatus: "not_contacted" | "contacted" | "replied" | "linked" | "declined";
  linkedUrl: string;
  outreachNotes: string;
  updatedAt?: any;
  createdAt?: any;
}

export const OUTREACH_STATUSES = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "linked", label: "Linked" },
  { value: "declined", label: "Declined" },
];
