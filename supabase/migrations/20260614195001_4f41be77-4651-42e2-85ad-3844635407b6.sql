GRANT SELECT ON public.diplomas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diplomas TO authenticated;
GRANT ALL ON public.diplomas TO service_role;