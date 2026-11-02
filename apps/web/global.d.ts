import type messages from "./messages/en-GB.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: "en-GB";
    Messages: typeof messages;
  }
}
