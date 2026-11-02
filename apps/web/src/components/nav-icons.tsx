import {
  Bell,
  BookOpenCheck,
  ClipboardCheck,
  House,
  MessageCircleQuestion,
  PawPrint,
  ShieldCheck,
  ShieldHalf,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { NavKey } from "@/lib/navigation";

export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  home: House,
  pets: PawPrint,
  ask: MessageCircleQuestion,
  community: UsersRound,
  reminders: Bell,
  account: UserRound,
  reviewQueue: ClipboardCheck,
  knowledgeBase: BookOpenCheck,
  moderation: ShieldHalf,
  admin: ShieldCheck,
};
