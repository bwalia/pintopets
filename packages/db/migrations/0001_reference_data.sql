CREATE TYPE "public"."species_group" AS ENUM('dogs', 'cats', 'horses', 'rabbits', 'small_pets', 'birds', 'reptiles_amphibians', 'fish', 'farm', 'other');--> statement-breakpoint
CREATE TABLE "breeds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"species_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_mixed_or_unknown" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "microchip_manufacturer_codes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" integer NOT NULL,
	"manufacturer" text NOT NULL,
	"notes" text,
	"source" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "microchip_manufacturer_codes_code_range" CHECK ("microchip_manufacturer_codes"."code" between 900 and 998)
);
--> statement-breakpoint
CREATE TABLE "species" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"group" "species_group" NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"tracks_height_in_hands" boolean DEFAULT false NOT NULL,
	"requires_free_text" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "breeds" ADD CONSTRAINT "breeds_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "breeds_species_slug_uq" ON "breeds" USING btree ("species_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "microchip_manufacturer_codes_code_uq" ON "microchip_manufacturer_codes" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "species_slug_uq" ON "species" USING btree ("slug");