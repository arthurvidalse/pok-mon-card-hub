DROP POLICY IF EXISTS "Collection groups are public" ON public.collection_groups;
CREATE POLICY "Published collection groups are public"
ON public.collection_groups
FOR SELECT
TO anon, authenticated
USING (is_published = true OR public.is_admin());

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;