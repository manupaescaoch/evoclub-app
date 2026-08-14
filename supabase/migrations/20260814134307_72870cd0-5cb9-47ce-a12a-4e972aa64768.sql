select cron.schedule(
  'push-renewal-ruler-daily',
  '0 15 * * *',
  $$
  select net.http_post(
    url := 'https://tmjeemmczgexzaflzmhj.supabase.co/functions/v1/push-renewal-ruler',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtamVlbW1jemdleHphZmx6bWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTAxNTQsImV4cCI6MjA5MTg4NjE1NH0.iBwWTgmFC3r8YcKeEN7kUKjORU-iwfHhduGVDEKn6pY"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);