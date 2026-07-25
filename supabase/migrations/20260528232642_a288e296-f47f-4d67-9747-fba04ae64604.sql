SET search_path = public, extensions;
DO $$
DECLARE
  seeds jsonb := '[
    {"name":"Moussa Fall","cat":"menuiserie","city":"Dakar, Yoff","bio":"Menuiserie bois et alu sur mesure."},
    {"name":"Aliou Kane","cat":"menuiserie","city":"Thiès","bio":"Cuisines, dressings et placards."},
    {"name":"Cheikh Sy","cat":"toiture","city":"Rufisque","bio":"Couverture, étanchéité et charpente."},
    {"name":"Pape Diouf","cat":"toiture","city":"Dakar","bio":"Réparation et isolation toiture."},
    {"name":"Khady Diop","cat":"carrelage","city":"Dakar, Sacré-Cœur","bio":"Pose carrelage sol, mur, faïence."},
    {"name":"Modou Ba","cat":"carrelage","city":"Mbour","bio":"Terrasses et salles de bain."},
    {"name":"Aicha Ndiaye","cat":"architecture","city":"Dakar, Almadies","bio":"Architecte DPLG, plans 3D et permis."},
    {"name":"Aminata Cisse","cat":"architecture","city":"Dakar, Plateau","bio":"Ingenieure structure et BIM."},
    {"name":"Ousmane Ba","cat":"renovation","city":"Rufisque","bio":"Renovation complete cle en main."},
    {"name":"Mariama Sy","cat":"renovation","city":"Dakar","bio":"Renovation appartements et bureaux."},
    {"name":"Babacar Ndour","cat":"climatisation","city":"Dakar","bio":"Installation et entretien clim split/multi."},
    {"name":"Seynabou Faye","cat":"climatisation","city":"Saly","bio":"Depannage frigorifique et maintenance."}
  ]'::jsonb;
  s jsonb;
  v_uid uuid;
  v_email text;
  v_slug text;
BEGIN
  FOR s IN SELECT * FROM jsonb_array_elements(seeds) LOOP
    v_slug := lower(regexp_replace(translate(s->>'name','àâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ ','aaaeeeeiioouuucAAAEEEEIIOOUUUC.'),'[^a-z0-9.]+','.','g'));
    v_email := v_slug || '.demo@warap.app';

    IF EXISTS (SELECT 1 FROM auth.users u WHERE u.email = v_email) THEN CONTINUE; END IF;

    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt('Demo!1234', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', s->>'name','role','provider','provider_category', s->>'cat'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email), 'email', v_uid::text, now(), now(), now());

    INSERT INTO public.profiles (id, name, email, full_name, provider_category, city, bio)
    VALUES (v_uid, s->>'name', v_email, s->>'name', s->>'cat', s->>'city', s->>'bio')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'provider') ON CONFLICT DO NOTHING;
    INSERT INTO public.wallets (user_id, balance_tokens) VALUES (v_uid, 50) ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.services (user_id, title, description, category, price)
    VALUES (v_uid, 'Prestation ' || (s->>'cat'), s->>'bio', s->>'cat', 25000 + floor(random()*50000)::int);
  END LOOP;
END $$;
