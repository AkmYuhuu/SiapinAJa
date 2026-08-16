-- Isolate category-scoped duplicate tools without changing unrelated tools.
-- UMKM keeps the existing `invoice` and `receipt` rows.
-- Freelancer gets dedicated permission identities.

INSERT INTO public.tools (slug, name, category, status, description)
VALUES
  ('invoice-freelancer', 'Invoice', 'freelancer', 'active', 'Invoice jasa dengan milestone dan pembayaran bertahap.'),
  ('receipt-freelancer', 'Kwitansi', 'freelancer', 'active', 'Kwitansi jasa: DP, termin, pelunasan.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  description = EXCLUDED.description;

DELETE FROM public.package_tools pt
USING public.packages p, public.tools t
WHERE pt.package_id = p.id
  AND pt.tool_id = t.id
  AND p.slug = 'freelancer'
  AND t.slug IN ('invoice', 'receipt');

INSERT INTO public.package_tools (package_id, tool_id)
SELECT p.id, t.id
FROM public.packages p
JOIN public.tools t
  ON t.slug IN ('invoice-freelancer', 'receipt-freelancer')
WHERE p.slug = 'freelancer'
ON CONFLICT DO NOTHING;
