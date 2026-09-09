TRUNCATE TABLE
  public.accounts_payable, public.anamnesis, public.assessment_bioimpedance, public.assessment_measures,
  public.assessment_revisions, public.audit_logs, public.bank_import_batches, public.bank_transactions,
  public.cancellations, public.check_ins, public.class_assignments, public.class_bookings,
  public.class_slot_overrides, public.class_waitlist, public.client_achievements, public.client_contracts,
  public.club_members, public.club_redemptions, public.commission_entries, public.community_announcements,
  public.community_post_likes, public.community_posts, public.community_reports, public.connected_devices,
  public.contact_logs, public.crm_attendance_alerts, public.crm_indications, public.crm_task_checklist_items,
  public.crm_task_comments, public.crm_tasks, public.daily_checkin_skips, public.daily_checkins,
  public.enrollment_conversions, public.evo_cycles, public.evolution_photos, public.financial_adjustments,
  public.financial_closings, public.forecast_scenarios, public.forecast_snapshots, public.form_links,
  public.health_blood_pressure, public.health_metrics, public.health_weight_edits, public.health_weights,
  public.interacoes, public.leads, public.limitation_alerts, public.notifications, public.nps_responses,
  public.occurrences, public.operational_form_submissions, public.pain_reports, public.payroll_items,
  public.payroll_runs, public.physical_assessments, public.push_notifications, public.push_subscriptions,
  public.renewal_events, public.renewal_reminders, public.renewal_requests, public.sales,
  public.shift_closures, public.shift_handover_reads, public.shift_schedules, public.shift_swap_requests,
  public.staff_notifications, public.staff_schedules, public.student_preferences, public.time_entries,
  public.training_exercise_sets, public.training_plans, public.training_session_exercises,
  public.training_sessions, public.training_weeks, public.transactions, public.turnstile_access_events,
  public.weight_goals, public.workout_exercises, public.workout_log_sets, public.workout_logs,
  public.workout_sessions, public.workouts
RESTART IDENTITY CASCADE;

DELETE FROM public.clients WHERE id <> 213;