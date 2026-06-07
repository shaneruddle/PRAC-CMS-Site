import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, ArrowLeft, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Hotel, OUTREACH_STATUSES } from "@/types";
import { cn } from "@/lib/utils";
import { triggerMarketingDeploy } from "@/lib/triggerDeploy";

const CATEGORIES = ["hotel", "resort", "boutique", "serviced_apartment", "guesthouse", "villa"];

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

function CharCount({ value, limit }: { value: string; limit: number }) {
  const len = (value || "").length;
  return (
    <span className={cn("text-[10px] font-mono", len > limit ? "text-red-500 font-bold" : "text-slate-400")}>
      {len}/{limit}
    </span>
  );
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{title}</span>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <CardContent className="p-6 space-y-4">{children}</CardContent>}
    </Card>
  );
}

const DEFAULTS: Partial<Hotel> = {
  slug: "",
  name: "",
  category: "hotel",
  stars: 0,
  area: "",
  address: "",
  lat: 0,
  lng: 0,
  published: false,
  seoTitle: "",
  metaDescription: "",
  h1: "",
  intro: "",
  headlineOffer: "",
  guestDiscount: 0,
  discountCode: "",
  pickupNotes: "",
  responseTime: "",
  body: "",
  nearbyAttractions: [],
  whyRentFromUs: [],
  faqs: [],
  outreachStatus: "not_contacted",
  linkedUrl: "",
  outreachNotes: "",
};

export default function HotelEditor() {
  const { slug: existingSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!existingSlug);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [formData, setFormData] = useState<Partial<Hotel>>(DEFAULTS);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basics: true,
    seo: true,
    offer: false,
    content: false,
    faqs: false,
    outreach: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (!existingSlug) return;
    async function fetchHotel() {
      try {
        const snap = await getDoc(doc(db, "hotels", existingSlug!));
        if (snap.exists()) {
          setFormData({ ...DEFAULTS, ...(snap.data() as Hotel) });
        } else {
          toast.error("Hotel not found");
          navigate("/hotels");
        }
      } catch (error) {
        toast.error("Error loading hotel");
      } finally {
        setLoading(false);
      }
    }
    fetchHotel();
  }, [existingSlug, navigate]);

  const set = (field: keyof Hotel, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      ...(!existingSlug && !slugTouched ? { slug: slugify(name) } : {}),
    }));
  };

  // --- Repeater helpers ---
  const updateArrayItem = <T,>(field: keyof Hotel, idx: number, value: T) => {
    setFormData(prev => {
      const arr = [...((prev[field] as T[]) || [])];
      arr[idx] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addArrayItem = <T,>(field: keyof Hotel, item: T) =>
    setFormData(prev => ({ ...prev, [field]: [...((prev[field] as T[]) || []), item] }));

  const removeArrayItem = (field: keyof Hotel, idx: number) =>
    setFormData(prev => ({ ...prev, [field]: ((prev[field] as any[]) || []).filter((_, i) => i !== idx) }));

  const saveHotel = async () => {
    if (!formData.slug) return toast.error("Slug is required");
    if (!formData.name) return toast.error("Hotel name is required");
    setSaving(true);
    const isNew = !existingSlug;
    try {
      const data = {
        ...formData,
        stars: Number(formData.stars) || 0,
        guestDiscount: Number(formData.guestDiscount) || 0,
        lat: Number(formData.lat) || 0,
        lng: Number(formData.lng) || 0,
        updatedAt: serverTimestamp(),
        createdAt: isNew ? serverTimestamp() : formData.createdAt,
      };
      await setDoc(doc(db, "hotels", formData.slug!), data);
      if (formData.published) await triggerMarketingDeploy();
      toast.success(formData.published ? "Hotel published — deploy triggered" : "Hotel saved (not published)");
      if (isNew) navigate(`/hotels/${formData.slug}`);
    } catch (error) {
      console.error(error);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center font-mono animate-pulse">LOADING HOTEL DATA...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-40 bg-slate-50/80 backdrop-blur-md py-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/hotels")} className="hover:bg-white shadow-sm border border-transparent hover:border-slate-200 transition-all">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded">Hotels</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {existingSlug ? `Edit ${formData.name || existingSlug}` : "Add New Hotel"}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-tight">
              {existingSlug ? `/hotels/${existingSlug}` : "Creating new hotel page"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={formData.published || false} onCheckedChange={(val) => set("published", val)} />
            <span className={cn("text-[11px] font-bold uppercase tracking-widest", formData.published ? "text-emerald-600" : "text-slate-400")}>
              {formData.published ? "Published" : "Draft"}
            </span>
          </div>
          <Button onClick={saveHotel} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold text-[11px] uppercase tracking-widest px-4 h-9">
            {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
            Save Hotel
          </Button>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">

        {/* Basics */}
        <Section title="Hotel Basics" open={openSections.basics} onToggle={() => toggleSection("basics")}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hotel Name</Label>
              <Input className="text-sm font-medium" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Rabbit Resort Pattaya" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Slug (URL key)</Label>
              <Input
                className="text-xs font-semibold font-mono"
                value={formData.slug}
                onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }}
                placeholder="e.g. rabbit-resort-pattaya"
                disabled={!!existingSlug}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</Label>
              <Select value={formData.category} onValueChange={(val) => set("category", val)}>
                <SelectTrigger className="bg-white border-slate-200 font-semibold text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-xs font-semibold capitalize">{cat.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Stars</Label>
              <Input className="text-xs font-semibold" type="number" min={0} max={5} value={formData.stars} onChange={(e) => set("stars", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Area</Label>
              <Input className="text-xs font-semibold" value={formData.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. pratumnak" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Address</Label>
            <Input className="text-xs" value={formData.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Latitude</Label>
              <Input className="text-xs font-mono" type="number" step="any" value={formData.lat} onChange={(e) => set("lat", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Longitude</Label>
              <Input className="text-xs font-mono" type="number" step="any" value={formData.lng} onChange={(e) => set("lng", parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </Section>

        {/* SEO */}
        <Section title="SEO" open={openSections.seo} onToggle={() => toggleSection("seo")}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">SEO Title</Label>
              <CharCount value={formData.seoTitle || ""} limit={60} />
            </div>
            <Input className="text-xs" value={formData.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder="e.g. Car Rental at Rabbit Resort Pattaya | Free Delivery" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Meta Description</Label>
              <CharCount value={formData.metaDescription || ""} limit={160} />
            </div>
            <Textarea className="text-xs min-h-[60px] resize-none" value={formData.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} placeholder="Shown in search results" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">H1 Heading</Label>
            <Input className="text-sm font-medium" value={formData.h1} onChange={(e) => set("h1", e.target.value)} placeholder="e.g. Car Rental at Rabbit Resort — Delivered to Your Lobby" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Intro Paragraph</Label>
            <Textarea className="text-sm min-h-[80px] resize-y" value={formData.intro} onChange={(e) => set("intro", e.target.value)} placeholder="Short intro shown under the H1 (1-3 sentences)" />
          </div>
        </Section>

        {/* Offer */}
        <Section title="Offer & Delivery" open={openSections.offer} onToggle={() => toggleSection("offer")}>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Headline Offer</Label>
            <Input className="text-xs" value={formData.headlineOffer} onChange={(e) => set("headlineOffer", e.target.value)} placeholder="e.g. Free delivery to your lobby in 45 minutes" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Guest Discount (%)</Label>
              <Input className="text-xs font-semibold" type="number" min={0} max={100} value={formData.guestDiscount} onChange={(e) => set("guestDiscount", parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Discount Code</Label>
              <Input className="text-xs font-mono" value={formData.discountCode} onChange={(e) => set("discountCode", e.target.value)} placeholder="e.g. RABBIT10" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pickup Notes</Label>
            <Textarea className="text-xs min-h-[60px] resize-y" value={formData.pickupNotes} onChange={(e) => set("pickupNotes", e.target.value)} placeholder="Where and how guests receive the car at this hotel" />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Response Time</Label>
            <Input className="text-xs" value={formData.responseTime} onChange={(e) => set("responseTime", e.target.value)} placeholder="e.g. Delivery within 45 minutes of booking" />
          </div>
        </Section>

        {/* Content */}
        <Section title="Page Content" open={openSections.content} onToggle={() => toggleSection("content")}>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Body Content</Label>
            <RichTextEditor value={formData.body || ""} onChange={(val) => set("body", val)} />
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Why Rent From Us (bullet points)</Label>
            {(formData.whyRentFromUs || []).map((point, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input className="text-xs" value={point} onChange={(e) => updateArrayItem("whyRentFromUs", idx, e.target.value)} placeholder="e.g. Free delivery to your hotel lobby" />
                <button onClick={() => removeArrayItem("whyRentFromUs", idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addArrayItem("whyRentFromUs", "")} className="bg-white text-[10px] font-bold uppercase tracking-widest">
              <Plus className="mr-1.5 h-3 w-3" /> Add Point
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nearby Attractions</Label>
            {(formData.nearbyAttractions || []).map((att, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input className="text-xs flex-1" value={att.name} onChange={(e) => updateArrayItem("nearbyAttractions", idx, { ...att, name: e.target.value })} placeholder="Attraction name" />
                <Input className="text-xs w-28 font-mono" type="number" step="any" min={0} value={att.distanceKm} onChange={(e) => updateArrayItem("nearbyAttractions", idx, { ...att, distanceKm: parseFloat(e.target.value) || 0 })} placeholder="km" />
                <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">km</span>
                <button onClick={() => removeArrayItem("nearbyAttractions", idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addArrayItem("nearbyAttractions", { name: "", distanceKm: 0 })} className="bg-white text-[10px] font-bold uppercase tracking-widest">
              <Plus className="mr-1.5 h-3 w-3" /> Add Attraction
            </Button>
          </div>
        </Section>

        {/* FAQs */}
        <Section title="FAQs" open={openSections.faqs} onToggle={() => toggleSection("faqs")}>
          {(formData.faqs || []).map((faq, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-3">
                  <Input className="text-xs font-semibold bg-white" value={faq.question} onChange={(e) => updateArrayItem("faqs", idx, { ...faq, question: e.target.value })} placeholder="Question" />
                  <Textarea className="text-xs min-h-[60px] resize-y bg-white" value={faq.answer} onChange={(e) => updateArrayItem("faqs", idx, { ...faq, answer: e.target.value })} placeholder="Answer" />
                </div>
                <button onClick={() => removeArrayItem("faqs", idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addArrayItem("faqs", { question: "", answer: "" })} className="bg-white text-[10px] font-bold uppercase tracking-widest">
            <Plus className="mr-1.5 h-3 w-3" /> Add FAQ
          </Button>
        </Section>

        {/* Outreach */}
        <Section title="Outreach Tracking" open={openSections.outreach} onToggle={() => toggleSection("outreach")}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outreach Status</Label>
              <Select value={formData.outreachStatus} onValueChange={(val: any) => set("outreachStatus", val)}>
                <SelectTrigger className="bg-white border-slate-200 font-semibold text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTREACH_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-xs font-semibold">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Linked URL (their backlink)</Label>
              <Input className="text-xs font-mono" value={formData.linkedUrl} onChange={(e) => set("linkedUrl", e.target.value)} placeholder="https://hotel-website.com/getting-around" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Outreach Notes</Label>
            <Textarea className="text-xs min-h-[80px] resize-y" value={formData.outreachNotes} onChange={(e) => set("outreachNotes", e.target.value)} placeholder="Contact name, dates, responses..." />
          </div>
        </Section>

      </div>
    </div>
  );
}
