ALTER TABLE "lms_study_group_task" DROP CONSTRAINT "lms_study_group_task_plan_id_lms_study_group_plan_id_fk";
--> statement-breakpoint
DELETE FROM "lms_study_group_task" WHERE "plan_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "lms_study_group_task" ALTER COLUMN "plan_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lms_study_group" ADD COLUMN "channel_id" text;--> statement-breakpoint
ALTER TABLE "lms_study_group" ADD CONSTRAINT "lms_study_group_channel_id_lms_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."lms_channel"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lms_study_group_task" ADD CONSTRAINT "lms_study_group_task_plan_id_lms_study_group_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."lms_study_group_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lms_study_group_channel_id_index" ON "lms_study_group" USING btree ("channel_id");