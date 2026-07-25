ALTER TABLE "lms_study_material" ADD COLUMN "description" varchar(5000);--> statement-breakpoint
ALTER TABLE "lms_study_material" ADD COLUMN "is_published" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "lms_study_material" ADD COLUMN "content_edited_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "lms_study_material_file" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"study_material_id" text NOT NULL,
	"file_id" text NOT NULL,
	"name" text,
	"order_index" integer DEFAULT 0
);
--> statement-breakpoint
INSERT INTO "lms_study_material_file" ("id", "created_at", "updated_at", "study_material_id", "file_id", "order_index")
SELECT "id" || '-file', "created_at", "updated_at", "id", "file_id", 0
FROM "lms_study_material"
WHERE "file_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "lms_study_material" DROP COLUMN "file_id";--> statement-breakpoint
ALTER TABLE "lms_study_material_file" ADD CONSTRAINT "lms_study_material_file_study_material_id_lms_study_material_id_fk" FOREIGN KEY ("study_material_id") REFERENCES "public"."lms_study_material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lms_study_material_chapter_id_index" ON "lms_study_material" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "lms_study_material_is_published_index" ON "lms_study_material" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "lms_study_material_file_study_material_id_index" ON "lms_study_material_file" USING btree ("study_material_id");--> statement-breakpoint
CREATE INDEX "lms_study_material_file_order_index_index" ON "lms_study_material_file" USING btree ("order_index");
