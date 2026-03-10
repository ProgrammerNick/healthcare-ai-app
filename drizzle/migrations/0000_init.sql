CREATE TYPE "public"."alert_type" AS ENUM('conversation_length', 'sentiment_drop', 'missed_checkin', 'vibe_urgent', 'isolation');--> statement-breakpoint
CREATE TYPE "public"."log_type" AS ENUM('blood_pressure', 'weight', 'sleep_hours', 'medication_taken', 'mood_score', 'pain_level', 'hydration_glasses', 'mobility_difficulty', 'appetite_rating', 'social_contact_count');--> statement-breakpoint
CREATE TYPE "public"."reminder_type" AS ENUM('medication', 'social', 'appointment', 'exercise', 'hydration', 'meal');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('senior', 'caregiver');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('voice', 'manual', 'morning_checkin', 'device');--> statement-breakpoint
CREATE TABLE "anomaly_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"senior_id" uuid NOT NULL,
	"alert_type" "alert_type" NOT NULL,
	"description" text,
	"baseline_value" numeric,
	"observed_value" numeric,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"senior_id" uuid NOT NULL,
	"transcript" text NOT NULL,
	"duration_seconds" integer,
	"sentiment_score" numeric(3, 2),
	"sentiment_flags" jsonb,
	"word_count" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "family_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_senior_id" uuid NOT NULL,
	"message_text" text NOT NULL,
	"audio_url" text,
	"played_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"senior_id" uuid NOT NULL,
	"log_type" "log_type" NOT NULL,
	"value_encrypted" text NOT NULL,
	"recorded_at" timestamp NOT NULL,
	"source" "source" NOT NULL,
	"notes_encrypted" text
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"senior_id" uuid NOT NULL,
	"prompt_used" text,
	"transcript" text NOT NULL,
	"summary" text,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"senior_id" uuid NOT NULL,
	"reminder_type" "reminder_type" NOT NULL,
	"title" text NOT NULL,
	"recurrence" jsonb,
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"role" "role" NOT NULL,
	"full_name" text,
	"companion_name" text,
	"linked_senior_id" uuid,
	"timezone" text DEFAULT 'America/New_York',
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_step" integer DEFAULT 0,
	"health_signal_preferences" jsonb,
	"alert_preferences" jsonb,
	"senior_first_name" text,
	"senior_age" integer,
	"senior_relationship" text,
	"link_code" text,
	"link_code_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
ALTER TABLE "anomaly_alerts" ADD CONSTRAINT "anomaly_alerts_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_messages" ADD CONSTRAINT "family_messages_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_messages" ADD CONSTRAINT "family_messages_to_senior_id_users_id_fk" FOREIGN KEY ("to_senior_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_logs" ADD CONSTRAINT "health_logs_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_senior_id_users_id_fk" FOREIGN KEY ("senior_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_linked_senior_id_users_id_fk" FOREIGN KEY ("linked_senior_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;