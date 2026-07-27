CREATE POLICY "Public can view classes" ON public.classes FOR SELECT USING (true);
GRANT SELECT ON public.classes TO anon;
CREATE POLICY "Public can view class bookings" ON public.class_bookings FOR SELECT USING (true);
CREATE POLICY "Public can insert class bookings" ON public.class_bookings FOR INSERT WITH CHECK (true);
GRANT SELECT, INSERT ON public.class_bookings TO anon;