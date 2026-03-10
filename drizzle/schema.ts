import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  numeric,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['senior', 'caregiver']);

export const logTypeEnum = pgEnum('log_type', [
  'blood_pressure',
  'weight',
  'sleep_hours',
  'medication_taken',
  'mood_score',
  'pain_level',
  'hydration_glasses',
  'mobility_difficulty',
  'appetite_rating',
  'social_contact_count',
]);

export const sourceEnum = pgEnum('source', [
  'voice',
  'manual',
  'morning_checkin',
  'device',
]);

export const reminderTypeEnum = pgEnum('reminder_type', [
  'medication',
  'social',
  'appointment',
  'exercise',
  'hydration',
  'meal',
]);

export const alertTypeEnum = pgEnum('alert_type', [
  'conversation_length',
  'sentiment_drop',
  'missed_checkin',
  'vibe_urgent',
  'isolation',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  role: roleEnum('role').notNull(),
  fullName: text('full_name'),
  companionName: text('companion_name'),
  linkedSeniorId: uuid('linked_senior_id').references((): ReturnType<typeof uuid> => users.id),
  timezone: text('timezone').default('America/New_York'),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingStep: integer('onboarding_step').default(0),
  healthSignalPreferences: jsonb('health_signal_preferences'),
  alertPreferences: jsonb('alert_preferences'),
  seniorFirstName: text('senior_first_name'),
  seniorAge: integer('senior_age'),
  seniorRelationship: text('senior_relationship'),
  linkCode: text('link_code'),
  linkCodeExpiresAt: timestamp('link_code_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const healthLogs = pgTable('health_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  seniorId: uuid('senior_id')
    .references(() => users.id)
    .notNull(),
  logType: logTypeEnum('log_type').notNull(),
  valueEncrypted: text('value_encrypted').notNull(),
  recordedAt: timestamp('recorded_at').notNull(),
  source: sourceEnum('source').notNull(),
  notesEncrypted: text('notes_encrypted'),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  seniorId: uuid('senior_id')
    .references(() => users.id)
    .notNull(),
  transcript: text('transcript').notNull(),
  durationSeconds: integer('duration_seconds'),
  sentimentScore: numeric('sentiment_score', { precision: 3, scale: 2 }),
  sentimentFlags: jsonb('sentiment_flags'),
  wordCount: integer('word_count'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reminders = pgTable('reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  seniorId: uuid('senior_id')
    .references(() => users.id)
    .notNull(),
  reminderType: reminderTypeEnum('reminder_type').notNull(),
  title: text('title').notNull(),
  recurrence: jsonb('recurrence'),
  isActive: boolean('is_active').default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
});

export const familyMessages = pgTable('family_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromUserId: uuid('from_user_id')
    .references(() => users.id)
    .notNull(),
  toSeniorId: uuid('to_senior_id')
    .references(() => users.id)
    .notNull(),
  messageText: text('message_text').notNull(),
  audioUrl: text('audio_url'),
  playedAt: timestamp('played_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const memories = pgTable('memories', {
  id: uuid('id').defaultRandom().primaryKey(),
  seniorId: uuid('senior_id')
    .references(() => users.id)
    .notNull(),
  promptUsed: text('prompt_used'),
  transcript: text('transcript').notNull(),
  summary: text('summary'),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const anomalyAlerts = pgTable('anomaly_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  seniorId: uuid('senior_id')
    .references(() => users.id)
    .notNull(),
  alertType: alertTypeEnum('alert_type').notNull(),
  description: text('description'),
  baselineValue: numeric('baseline_value'),
  observedValue: numeric('observed_value'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
