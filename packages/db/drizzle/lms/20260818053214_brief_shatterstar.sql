CREATE TABLE "lms_channel_test_attempt_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"attempt_id" text NOT NULL,
	"question_id" text NOT NULL,
	"option_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_channel_test_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"channel_test_id" text NOT NULL,
	"clerk_user_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"score" integer
);
--> statement-breakpoint
CREATE TABLE "lms_channel_test_options" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"label" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"channel_test_question_id" text NOT NULL,
	"order_idx" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_channel_test_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"channel_test_id" text,
	"title" text NOT NULL,
	"order_idx" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_channel_tests" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"channel_id" text,
	"title" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"created_by" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"type" text DEFAULT 'open' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"duration_minutes" integer
);
--> statement-breakpoint
ALTER TABLE "lms_channel_test_attempt_answers" ADD CONSTRAINT "lms_channel_test_attempt_answers_attempt_id_lms_channel_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."lms_channel_test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_channel_test_attempt_answers" ADD CONSTRAINT "lms_channel_test_attempt_answers_question_id_lms_channel_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."lms_channel_test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_channel_test_attempt_answers" ADD CONSTRAINT "lms_channel_test_attempt_answers_option_id_lms_channel_test_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."lms_channel_test_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_channel_test_attempts" ADD CONSTRAINT "lms_channel_test_attempts_channel_test_id_lms_channel_tests_id_fk" FOREIGN KEY ("channel_test_id") REFERENCES "public"."lms_channel_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_channel_test_options" ADD CONSTRAINT "lms_channel_test_options_channel_test_question_id_lms_channel_test_questions_id_fk" FOREIGN KEY ("channel_test_question_id") REFERENCES "public"."lms_channel_test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_channel_test_questions" ADD CONSTRAINT "lms_channel_test_questions_channel_test_id_lms_channel_tests_id_fk" FOREIGN KEY ("channel_test_id") REFERENCES "public"."lms_channel_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_channel_tests" ADD CONSTRAINT "lms_channel_tests_channel_id_lms_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."lms_channel"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lms_channel_test_attempt_answers_attempt_id_question_id_index" ON "lms_channel_test_attempt_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "lms_channel_test_attempt_answers_attempt_id_index" ON "lms_channel_test_attempt_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "lms_channel_test_attempt_answers_question_id_index" ON "lms_channel_test_attempt_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "lms_channel_test_attempts_channel_test_id_clerk_user_id_index" ON "lms_channel_test_attempts" USING btree ("channel_test_id","clerk_user_id");--> statement-breakpoint
CREATE INDEX "lms_channel_test_attempts_status_index" ON "lms_channel_test_attempts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lms_channel_test_attempts_clerk_user_id_index" ON "lms_channel_test_attempts" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "lms_channel_test_options_label_index" ON "lms_channel_test_options" USING btree ("label");--> statement-breakpoint
CREATE INDEX "lms_channel_test_options_is_correct_index" ON "lms_channel_test_options" USING btree ("is_correct");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_channel_test_options_channel_test_question_id_order_idx_index" ON "lms_channel_test_options" USING btree ("channel_test_question_id","order_idx");--> statement-breakpoint
CREATE INDEX "lms_channel_test_questions_title_index" ON "lms_channel_test_questions" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "lms_channel_test_questions_channel_test_id_order_idx_index" ON "lms_channel_test_questions" USING btree ("channel_test_id","order_idx");--> statement-breakpoint
CREATE INDEX "lms_channel_test_questions_channel_test_id_index" ON "lms_channel_test_questions" USING btree ("channel_test_id");--> statement-breakpoint
CREATE INDEX "lms_channel_tests_title_index" ON "lms_channel_tests" USING btree ("title");--> statement-breakpoint
CREATE INDEX "lms_channel_tests_channel_id_index" ON "lms_channel_tests" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "lms_channel_tests_is_published_index" ON "lms_channel_tests" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "lms_channel_tests_type_index" ON "lms_channel_tests" USING btree ("type");