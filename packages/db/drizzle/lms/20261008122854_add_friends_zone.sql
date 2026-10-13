CREATE TABLE "lms_friendship" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"clerk_user_id_low" text NOT NULL,
	"clerk_user_id_high" text NOT NULL,
	"requester_clerk_user_id" text NOT NULL,
	"addressee_clerk_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requester_shares_activity" boolean DEFAULT false NOT NULL,
	"addressee_shares_activity" boolean DEFAULT false NOT NULL,
	CONSTRAINT "friendship_distinct_users" CHECK ("lms_friendship"."clerk_user_id_low" <> "lms_friendship"."clerk_user_id_high")
);
--> statement-breakpoint
CREATE TABLE "lms_study_group" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"created_by_clerk_user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_study_group_member" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"group_id" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"invited_by_clerk_user_id" text
);
--> statement-breakpoint
CREATE TABLE "lms_study_group_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"group_id" text NOT NULL,
	"created_by_clerk_user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_study_group_session" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"group_id" text NOT NULL,
	"plan_id" text,
	"created_by_clerk_user_id" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	CONSTRAINT "study_group_session_ends_after_start" CHECK ("lms_study_group_session"."ends_at" > "lms_study_group_session"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "lms_study_group_session_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"session_id" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lms_study_group_task" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"group_id" text NOT NULL,
	"plan_id" text,
	"created_by_clerk_user_id" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"scope" text NOT NULL,
	"assignee_clerk_user_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	CONSTRAINT "study_group_task_assignee_matches_scope" CHECK ((
        ("lms_study_group_task"."scope" = 'common' and "lms_study_group_task"."assignee_clerk_user_id" is null)
        or ("lms_study_group_task"."scope" = 'individual' and "lms_study_group_task"."assignee_clerk_user_id" is not null)
      ))
);
--> statement-breakpoint
ALTER TABLE "lms_study_group_member" ADD CONSTRAINT "lms_study_group_member_group_id_lms_study_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."lms_study_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_study_group_plan" ADD CONSTRAINT "lms_study_group_plan_group_id_lms_study_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."lms_study_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_study_group_session" ADD CONSTRAINT "lms_study_group_session_group_id_lms_study_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."lms_study_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_study_group_session" ADD CONSTRAINT "lms_study_group_session_plan_id_lms_study_group_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."lms_study_group_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_study_group_session_participant" ADD CONSTRAINT "lms_study_group_session_participant_session_id_lms_study_group_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."lms_study_group_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_study_group_task" ADD CONSTRAINT "lms_study_group_task_group_id_lms_study_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."lms_study_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_study_group_task" ADD CONSTRAINT "lms_study_group_task_plan_id_lms_study_group_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."lms_study_group_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lms_friendship_clerk_user_id_low_clerk_user_id_high_index" ON "lms_friendship" USING btree ("clerk_user_id_low","clerk_user_id_high");--> statement-breakpoint
CREATE INDEX "lms_friendship_requester_clerk_user_id_index" ON "lms_friendship" USING btree ("requester_clerk_user_id");--> statement-breakpoint
CREATE INDEX "lms_friendship_addressee_clerk_user_id_index" ON "lms_friendship" USING btree ("addressee_clerk_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_study_group_member_group_id_clerk_user_id_index" ON "lms_study_group_member" USING btree ("group_id","clerk_user_id");--> statement-breakpoint
CREATE INDEX "lms_study_group_member_clerk_user_id_index" ON "lms_study_group_member" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "lms_study_group_plan_group_id_index" ON "lms_study_group_plan" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "lms_study_group_session_group_id_index" ON "lms_study_group_session" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "lms_study_group_session_starts_at_index" ON "lms_study_group_session" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_study_group_session_participant_session_id_clerk_user_id_index" ON "lms_study_group_session_participant" USING btree ("session_id","clerk_user_id");--> statement-breakpoint
CREATE INDEX "lms_study_group_task_group_id_index" ON "lms_study_group_task" USING btree ("group_id");