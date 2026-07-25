
CREATE OR REPLACE FUNCTION public.get_marketplace_services(_q text DEFAULT NULL::text, _category text DEFAULT NULL::text, _min_rating numeric DEFAULT NULL::numeric, _min_price numeric DEFAULT NULL::numeric, _max_price numeric DEFAULT NULL::numeric, _sort text DEFAULT 'newest'::text)
 RETURNS TABLE(id uuid, title text, description text, price numeric, category text, created_at timestamp with time zone, provider_id uuid, provider_name text, provider_avatar text, provider_city text, provider_rating numeric, provider_reviews_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT s.id, s.title, s.description, s.price,
           COALESCE(s.category, p.provider_category) AS category,
           s.created_at,
           p.id AS provider_id, p.name AS provider_name, p.avatar_url AS provider_avatar, p.city AS provider_city,
           p.provider_category AS p_category,
           COALESCE((SELECT round(avg(r.rating)::numeric,2) FROM public.reviews r WHERE r.provider_id = p.id), 0) AS provider_rating,
           COALESCE((SELECT count(*)::int FROM public.reviews r WHERE r.provider_id = p.id), 0) AS provider_reviews_count
    FROM public.services s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE p.kyc_status = 'valid'
      AND p.visibility_status = 'active'
      AND (p.visibility_until IS NULL OR p.visibility_until > now())
      AND NOT p.suspended
  )
  SELECT id, title, description, price, category, created_at, provider_id, provider_name, provider_avatar, provider_city, provider_rating, provider_reviews_count
  FROM base
  WHERE (_category IS NULL OR _category = '' OR p_category = _category OR category = _category)
    AND (_min_price IS NULL OR price >= _min_price)
    AND (_max_price IS NULL OR price <= _max_price)
    AND (_min_rating IS NULL OR provider_rating >= _min_rating)
    AND (
      _q IS NULL OR _q = '' OR
      title ILIKE '%' || _q || '%' OR
      coalesce(description,'') ILIKE '%' || _q || '%' OR
      provider_name ILIKE '%' || _q || '%'
    )
  ORDER BY
    CASE WHEN _sort = 'oldest' THEN created_at END ASC,
    CASE WHEN _sort = 'price_asc' THEN price END ASC NULLS LAST,
    CASE WHEN _sort = 'price_desc' THEN price END DESC NULLS LAST,
    CASE WHEN _sort = 'rating' THEN provider_rating END DESC NULLS LAST,
    CASE WHEN _sort IS NULL OR _sort NOT IN ('oldest','price_asc','price_desc','rating') THEN created_at END DESC;
$function$;
