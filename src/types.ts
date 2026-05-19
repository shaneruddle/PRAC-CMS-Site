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

export interface SiteConfig {
  contactPhone: string;
  whatsapp: string;
  lineId: string;
  email: string;
  officeAddress: string;
  businessHours: string;
  trustSignals: {
    yearsInBusiness: string;
    customersServed: string;
    googleRating: string;
    googleReviewCount: string;
    facebookRating: string;
    facebookReviewCount: string;
  };
  socialLinks: {
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
  };
}

export interface DeployTrigger {
  id?: string;
  triggeredAt: any;
  triggeredBy: string;
  status: 'queued' | 'building' | 'deployed' | 'failed';
  changedCollection: string;
  changedDocId: string;
}
