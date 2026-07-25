GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio TO authenticated;
GRANT SELECT ON public.portfolio TO anon;
GRANT ALL ON public.portfolio TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diplomas TO authenticated;
GRANT SELECT ON public.diplomas TO anon;
GRANT ALL ON public.diplomas TO service_role;