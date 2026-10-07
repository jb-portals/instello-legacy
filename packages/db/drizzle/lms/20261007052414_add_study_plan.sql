CREATE TABLE "lms_study_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"created_by_clerk_user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_study_plan_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"plan_id" text NOT NULL,
	"series_id" text,
	"rescheduled_from_id" text,
	"title" varchar(255) NOT NULL,
	"kind" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"reminder" text DEFAULT 'none' NOT NULL,
	"recurrence" text DEFAULT 'none' NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	CONSTRAINT "study_plan_activity_ends_after_start" CHECK ("lms_study_plan_activity"."ends_at" > "lms_study_plan_activity"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "lms_study_plan_activity" ADD CONSTRAINT "lms_study_plan_activity_plan_id_lms_study_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."lms_study_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_study_plan_activity" ADD CONSTRAINT "lms_study_plan_activity_rescheduled_from_id_lms_study_plan_activity_id_fk" FOREIGN KEY ("rescheduled_from_id") REFERENCES "public"."lms_study_plan_activity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lms_study_plan_created_by_clerk_user_id_index" ON "lms_study_plan" USING btree ("created_by_clerk_user_id");--> statement-breakpoint
CREATE INDEX "lms_study_plan_activity_plan_id_index" ON "lms_study_plan_activity" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "lms_study_plan_activity_series_id_index" ON "lms_study_plan_activity" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "lms_study_plan_activity_starts_at_index" ON "lms_study_plan_activity" USING btree ("starts_at");