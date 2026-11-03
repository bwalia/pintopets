CREATE TYPE "public"."user_role" AS ENUM('owner', 'professional', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('image', 'video', 'document');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('pending', 'ready', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."neutered_status" AS ENUM('yes', 'no', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."pet_member_role" AS ENUM('owner', 'co_owner', 'carer');--> statement-breakpoint
CREATE TYPE "public"."pet_sex" AS ENUM('male', 'female', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."pet_status" AS ENUM('active', 'archived', 'deceased');--> statement-breakpoint
CREATE TYPE "public"."condition_status" AS ENUM('active', 'managed', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."diet_item_kind" AS ENUM('food', 'treat', 'supplement');--> statement-breakpoint
CREATE TYPE "public"."horse_care_kind" AS ENUM('farrier', 'dental', 'worm_egg_count');--> statement-breakpoint
CREATE TYPE "public"."parasite_kind" AS ENUM('flea', 'worm', 'tick', 'flea_and_tick', 'lungworm', 'mite', 'other');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('mild', 'moderate', 'severe');--> statement-breakpoint
CREATE TYPE "public"."symptom_source" AS ENUM('manual', 'ai_chat');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"kind" "media_kind" NOT NULL,
	"status" "media_status" DEFAULT 'ready' NOT NULL,
	"storage_key" text NOT NULL,
	"thumb_key" text,
	"mime_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"caption" text,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pet_breeds" (
	"pet_id" uuid NOT NULL,
	"breed_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "pet_breeds_pet_id_breed_id_pk" PRIMARY KEY("pet_id","breed_id")
);
--> statement-breakpoint
CREATE TABLE "pet_members" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "pet_member_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"species_id" uuid NOT NULL,
	"species_other" text,
	"sex" "pet_sex" DEFAULT 'unknown' NOT NULL,
	"neutered" "neutered_status" DEFAULT 'unknown' NOT NULL,
	"date_of_birth" date,
	"date_of_birth_is_estimate" boolean DEFAULT false NOT NULL,
	"colour_markings" text,
	"height_inches" smallint,
	"passport_number" text,
	"insurance_provider" text,
	"insurance_policy_ref" text,
	"vet_practice_name" text,
	"vet_practice_phone" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"notes" text,
	"status" "pet_status" DEFAULT 'active' NOT NULL,
	"deceased_on" date,
	"profile_media_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "allergies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"allergen" text NOT NULL,
	"reaction" text,
	"severity" "severity" DEFAULT 'mild' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conditions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"diagnosed_on" date,
	"status" "condition_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diet_changes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_on" date NOT NULL,
	"description" text NOT NULL,
	"reaction" text
);
--> statement-breakpoint
CREATE TABLE "diet_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" "diet_item_kind" NOT NULL,
	"brand" text,
	"product" text NOT NULL,
	"amount" text,
	"frequency" text,
	"started_on" date,
	"ended_on" date
);
--> statement-breakpoint
CREATE TABLE "horse_care_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" "horse_care_kind" NOT NULL,
	"done_on" date NOT NULL,
	"provider" text,
	"result" text,
	"next_due_on" date
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"dose_as_prescribed" text NOT NULL,
	"frequency" text NOT NULL,
	"start_on" date NOT NULL,
	"end_on" date,
	"prescribed_by" text,
	"reminders_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parasite_treatments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" "parasite_kind" NOT NULL,
	"product" text NOT NULL,
	"given_on" date NOT NULL,
	"next_due_on" date
);
--> statement-breakpoint
CREATE TABLE "symptom_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"symptom" text NOT NULL,
	"severity" "severity" DEFAULT 'mild' NOT NULL,
	"source" "symptom_source" DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaccinations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"vaccine" text NOT NULL,
	"given_on" date NOT NULL,
	"batch_number" text,
	"vet" text,
	"next_due_on" date
);
--> statement-breakpoint
CREATE TABLE "vet_visits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"visit_on" date NOT NULL,
	"practice" text,
	"vet_name" text,
	"reason" text NOT NULL,
	"outcome" text,
	"cost_pence" integer,
	"follow_up_on" date
);
--> statement-breakpoint
CREATE TABLE "water_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"noted_on" date NOT NULL,
	"observation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pet_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"measured_on" date NOT NULL,
	"weight_grams" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_breeds" ADD CONSTRAINT "pet_breeds_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_breeds" ADD CONSTRAINT "pet_breeds_breed_id_breeds_id_fk" FOREIGN KEY ("breed_id") REFERENCES "public"."breeds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_members" ADD CONSTRAINT "pet_members_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_members" ADD CONSTRAINT "pet_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_changes" ADD CONSTRAINT "diet_changes_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_changes" ADD CONSTRAINT "diet_changes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_items" ADD CONSTRAINT "diet_items_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_items" ADD CONSTRAINT "diet_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horse_care_entries" ADD CONSTRAINT "horse_care_entries_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horse_care_entries" ADD CONSTRAINT "horse_care_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parasite_treatments" ADD CONSTRAINT "parasite_treatments_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parasite_treatments" ADD CONSTRAINT "parasite_treatments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD CONSTRAINT "symptom_entries_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD CONSTRAINT "symptom_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_visits" ADD CONSTRAINT "vet_visits_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_visits" ADD CONSTRAINT "vet_visits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_notes" ADD CONSTRAINT "water_notes_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_notes" ADD CONSTRAINT "water_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "media_pet_idx" ON "media" USING btree ("pet_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pet_members_pet_user_uq" ON "pet_members" USING btree ("pet_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pet_members_one_owner_uq" ON "pet_members" USING btree ("pet_id") WHERE "pet_members"."role" = 'owner';--> statement-breakpoint
CREATE INDEX "pet_members_user_idx" ON "pet_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pets_species_idx" ON "pets" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "allergies_pet_idx" ON "allergies" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "conditions_pet_idx" ON "conditions" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "diet_changes_pet_idx" ON "diet_changes" USING btree ("pet_id","changed_on");--> statement-breakpoint
CREATE INDEX "diet_items_pet_idx" ON "diet_items" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "horse_care_entries_pet_idx" ON "horse_care_entries" USING btree ("pet_id","done_on");--> statement-breakpoint
CREATE INDEX "medications_pet_idx" ON "medications" USING btree ("pet_id","start_on");--> statement-breakpoint
CREATE INDEX "parasite_treatments_pet_idx" ON "parasite_treatments" USING btree ("pet_id","given_on");--> statement-breakpoint
CREATE INDEX "symptom_entries_pet_idx" ON "symptom_entries" USING btree ("pet_id","occurred_at");--> statement-breakpoint
CREATE INDEX "vaccinations_pet_idx" ON "vaccinations" USING btree ("pet_id","given_on");--> statement-breakpoint
CREATE INDEX "vet_visits_pet_idx" ON "vet_visits" USING btree ("pet_id","visit_on");--> statement-breakpoint
CREATE INDEX "water_notes_pet_idx" ON "water_notes" USING btree ("pet_id","noted_on");--> statement-breakpoint
CREATE INDEX "weight_entries_pet_idx" ON "weight_entries" USING btree ("pet_id","measured_on");