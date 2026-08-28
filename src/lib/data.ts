import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Crop = {
  id: string;
  name: string;
  slug: string;
  category: string;
  unit: string;
  emoji: string;
  current_price: number;
  previous_price: number;
};

export type PricePoint = { recorded_on: string; price: number; crop_id: string };

export type Listing = {
  id: string;
  farmer_id: string;
  crop_id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  base_price: number;
  mode: string;
  ends_at: string | null;
  location: string | null;
  status: string;
  created_at: string;
};

export type Bid = {
  id: string;
  listing_id: string;
  bidder_id: string;
  amount: number;
  note: string | null;
  accepted: boolean;
  created_at: string;
};

export const cropsQuery = queryOptions({
  queryKey: ["crops"],
  queryFn: async (): Promise<Crop[]> => {
    const { data, error } = await supabase.from("crops").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Crop[];
  },
});

export const priceHistoryQuery = (days: number) =>
  queryOptions({
    queryKey: ["crop_prices", days],
    queryFn: async (): Promise<PricePoint[]> => {
      const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("crop_prices")
        .select("crop_id, price, recorded_on")
        .gte("recorded_on", from)
        .order("recorded_on");
      if (error) throw error;
      return (data ?? []) as PricePoint[];
    },
  });

export const listingsQuery = queryOptions({
  queryKey: ["listings"],
  queryFn: async (): Promise<Listing[]> => {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Listing[];
  },
});

export const bidsQuery = queryOptions({
  queryKey: ["bids"],
  queryFn: async (): Promise<Bid[]> => {
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .order("amount", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Bid[];
  },
});

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("id, full_name, role, location");
    if (error) throw error;
    return data ?? [];
  },
});

export const threadsQuery = queryOptions({
  queryKey: ["chat_threads"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("chat_threads")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});
