import { describe, expect, it } from "vitest";
import {
  checkContent,
  checkDisplayName,
  cleanText,
  isDuplicate,
  isSuspended,
  linkify,
  overLimit,
  RATE_LIMITS,
  suggestDisplayName,
} from "./rules";

const zero = { threads: 0, replies: 0, votes: 0, reports: 0 };

describe("cleanText", () => {
  it("strips invisible and bidi characters and extra blank lines", () => {
    expect(cleanText("  hi​ there‮\r\n\n\n\nbye  ")).toBe("hi there\n\nbye");
  });
});

describe("checkContent", () => {
  it("accepts an ordinary question", () => {
    expect(
      checkContent({
        title: "Why is my puppy sick after eating?",
        body: "She is 8 months old and it happens after breakfast. See https://www.pdsa.org.uk/ for context.",
      }),
    ).toEqual([]);
  });

  it("blocks email addresses and phone numbers", () => {
    const r = checkContent({
      title: "Puppies need homes",
      body: "Message me on 07700 900123 or a@b.com",
    });
    expect(r.map((v) => v.message).join(" ")).toMatch(/email/);
    expect(r.map((v) => v.message).join(" ")).toMatch(/phone/);
  });

  it("does not mistake dates, weights or doses for phone numbers", () => {
    expect(
      checkContent({ body: "On 12/03/2026 he weighed 12.5 kg and had 250 mg twice a day." }),
    ).toEqual([]);
  });

  it("limits links, bans shorteners and links in titles", () => {
    const links = Array.from({ length: 4 }, (_, i) => `https://example.com/${i}`).join(" ");
    expect(checkContent({ body: links })[0]?.message).toMatch(/no more than 3 links/);
    expect(checkContent({ body: "see bit.ly/abc" })[0]?.message).toMatch(/shortener/);
    expect(checkContent({ title: "look www.example.com now", body: "hello there" })[0]?.field).toBe(
      "title",
    );
  });

  it("rejects shouting and repeated characters", () => {
    expect(
      checkContent({ title: "MY DOG WILL NOT STOP BARKING AT NIGHT", body: "help" })[0]?.field,
    ).toBe("title");
    expect(checkContent({ body: "help!!!!!!!!!!!!!!!!!!!!" })).toHaveLength(1);
  });
});

describe("duplicates", () => {
  it("ignores case, spacing and punctuation", () => {
    expect(isDuplicate("Hello,  WORLD!", ["hello world"])).toBe(true);
    expect(isDuplicate("Hello there", ["hello world"])).toBe(false);
  });
});

describe("rate limits", () => {
  it("allows under the limit and refuses at it", () => {
    expect(overLimit("thread", zero, zero)).toBeNull();
    expect(overLimit("thread", { ...zero, threads: RATE_LIMITS.threadsPerHour }, zero)).toMatch(
      /try again/,
    );
    expect(overLimit("report", zero, { ...zero, reports: RATE_LIMITS.reportsPerDay })).toMatch(
      /limit/,
    );
  });
});

describe("display names", () => {
  it("refuses official-looking names and contact details", () => {
    expect(checkDisplayName("PintoPets_Support")).toMatch(/official/);
    expect(checkDisplayName("Vet Sarah")).toMatch(/official/);
    expect(checkDisplayName("Sam 07700900123")).toMatch(/contact/);
    expect(checkDisplayName("Sarah's Spaniels")).toBeNull();
  });

  it("suggests a first name, never an email", () => {
    const id = "00000000-0000-4000-8000-00000000abcd";
    expect(suggestDisplayName("Priya Shah", id)).toMatch(/^Priya \d{4}$/);
    expect(suggestDisplayName("priya@example.com", id)).toMatch(/^Pet lover \d{4}$/);
  });
});

describe("suspension", () => {
  it("is active only until the date", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    expect(isSuspended("2026-11-08T00:00:00Z", now)).toBe(true);
    expect(isSuspended("2026-11-01T00:00:00Z", now)).toBe(false);
    expect(isSuspended(null, now)).toBe(false);
  });
});

describe("linkify", () => {
  it("links only http(s) URLs and keeps trailing punctuation outside", () => {
    expect(linkify("see https://pdsa.org.uk/help. thanks")).toEqual([
      { text: "see " },
      { text: "https://pdsa.org.uk/help", href: "https://pdsa.org.uk/help" },
      { text: ". thanks" },
    ]);
    expect(linkify("javascript:alert(1)")).toEqual([{ text: "javascript:alert(1)" }]);
    expect(linkify("www.rspca.org.uk")[0]?.href).toBe("https://www.rspca.org.uk/");
  });
});
