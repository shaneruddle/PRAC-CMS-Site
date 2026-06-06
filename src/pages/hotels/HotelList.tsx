import React, { useEffect, useState } from "react";
import { collection, query, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Hotel as HotelIcon, Plus, Edit, Trash2, Loader2, Star, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Hotel, OUTREACH_STATUSES } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  not_contacted: "bg-slate-100 text-slate-500",
  contacted: "bg-amber-50 text-amber-600",
  replied: "bg-blue-50 text-blue-600",
  linked: "bg-emerald-50 text-emerald-600",
  declined: "bg-red-50 text-red-500",
};

export default function HotelList() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchHotels() {
      try {
        const q = query(collection(db, "hotels"), orderBy("name"));
        const snap = await getDocs(q).catch(e => handleFirestoreError(e, OperationType.LIST, "hotels"));
        setHotels(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Hotel[]);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load hotels");
      } finally {
        setLoading(false);
      }
    }
    fetchHotels();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this hotel page? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "hotels", id));
      setHotels(hotels.filter(h => h.id !== id));
      toast.success("Hotel deleted");
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  const stats = {
    total: hotels.length,
    published: hotels.filter(h => h.published).length,
    contacted: hotels.filter(h => h.outreachStatus && h.outreachStatus !== "not_contacted").length,
    linked: hotels.filter(h => h.outreachStatus === "linked").length,
  };

  const filtered = filter === "all"
    ? hotels
    : hotels.filter(h => (h.outreachStatus || "not_contacted") === filter);

  const statusLabel = (value: string) =>
    OUTREACH_STATUSES.find(s => s.value === value)?.label || value;

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded">Partnerships</span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hotel Pages</h1>
          </div>
          <p className="text-sm text-slate-500">Landing pages for hotel guests and link-building outreach partners.</p>
        </div>
        <Link to="/hotels/new" className={cn(buttonVariants({ variant: "default" }), "bg-blue-600 hover:bg-blue-700 shadow-sm")}>
          <Plus className="mr-2 h-4 w-4" /> New Hotel
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Hotels", value: stats.total, accent: "text-slate-900" },
          { label: "Published", value: stats.published, accent: "text-emerald-600" },
          { label: "Contacted", value: stats.contacted, accent: "text-amber-600" },
          { label: "Linked", value: stats.linked, accent: "text-blue-600" },
        ].map(s => (
          <Card key={s.label} className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className={cn("text-2xl font-bold mt-1", s.accent)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Outreach status filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors border",
            filter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
          )}
        >
          All
        </button>
        {OUTREACH_STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors border",
              filter === s.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Hotel list */}
      {filtered.length === 0 ? (
        <div className="py-12 px-4 rounded-xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 bg-slate-50/50 text-slate-300">
          <HotelIcon size={32} strokeWidth={1} />
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            {hotels.length === 0 ? "No hotels yet" : "No hotels match this filter"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filtered.map(hotel => (
            <div key={hotel.id} className="flex items-center justify-between p-5 group hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  hotel.published ? "bg-emerald-500" : "bg-slate-300"
                )}></div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {hotel.name || hotel.slug}
                    </span>
                    {hotel.stars > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-500 text-[10px] font-bold shrink-0">
                        <Star size={10} fill="currentColor" /> {hotel.stars}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{hotel.area || "no area"}</span>
                    <span className="text-[10px] text-slate-300 font-mono truncate">/hotels/{hotel.slug}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight",
                  STATUS_COLORS[hotel.outreachStatus || "not_contacted"]
                )}>
                  {statusLabel(hotel.outreachStatus || "not_contacted")}
                </span>
                {hotel.outreachStatus === "linked" && hotel.linkedUrl && (
                  <a
                    href={hotel.linkedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    title="View backlink"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/hotels/${hotel.slug}`)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(hotel.id!)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
