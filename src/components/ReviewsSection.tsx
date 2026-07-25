import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type Review = {
  id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author?: { name: string; avatar_url: string | null } | null;
};

function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? "fill-primary text-primary" : "text-muted-foreground/40"}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewsSection({ providerId }: { providerId: string }) {
  const { user, role } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rv } = await supabase
      .from("reviews")
      .select("id,client_id,rating,comment,created_at")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });
    const list = (rv ?? []) as Review[];
    const ids = Array.from(new Set(list.map((r) => r.client_id)));
    if (ids.length) {
      const { data: pf } = await supabase.from("public_profiles" as never).select("id,name,avatar_url").in("id", ids);
      const map = Object.fromEntries(((pf ?? []) as Array<{ id: string; name: string; avatar_url: string | null }>).map((p) => [p.id, { name: p.name, avatar_url: p.avatar_url }]));
      list.forEach((r) => { r.author = map[r.client_id] ?? null; });
    }
    setReviews(list);

    if (user && user.id !== providerId && role === "client") {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user.id)
        .eq("receiver_id", providerId);
      setCanReview((count ?? 0) > 0);
      const mine = list.find((r) => r.client_id === user.id) ?? null;
      setMyReview(mine);
      if (mine) { setRating(mine.rating); setComment(mine.comment ?? ""); }
    } else {
      setCanReview(false);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [providerId, user?.id, role]);

  const submit = async () => {
    if (!user) return;
    if (rating < 1 || rating > 5) return toast.error("Note invalide");
    setSaving(true);
    let error;
    if (myReview) {
      ({ error } = await supabase.from("reviews")
        .update({ rating, comment: comment.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", myReview.id));
    } else {
      ({ error } = await supabase.from("reviews")
        .insert({ client_id: user.id, provider_id: providerId, rating, comment: comment.trim() || null }));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(myReview ? "Avis mis à jour" : "Avis publié");
    load();
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Avis clients</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars value={Math.round(avg)} />
            <span className="font-semibold">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {user && role === "client" && user.id !== providerId && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          {canReview ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{myReview ? "Modifier votre avis" : "Noter ce prestataire"}</h3>
                <Stars value={rating} onChange={setRating} size={22} />
              </div>
              <Textarea
                className="mt-3"
                rows={3}
                placeholder="Partagez votre expérience (optionnel)…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={submit} disabled={saving}>{saving ? "Envoi…" : myReview ? "Mettre à jour" : "Publier"}</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vous devez d'abord contacter ce prestataire pour pouvoir laisser un avis.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucun avis pour le moment.
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {r.author?.avatar_url ? (
                    <img src={r.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold">
                      {r.author?.name?.[0] ?? "?"}
                    </span>
                  )}
                  <div>
                    <div className="text-sm font-semibold">{r.author?.name ?? "Client"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                  </div>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
