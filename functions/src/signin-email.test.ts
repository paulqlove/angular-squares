import { test } from "node:test";
import assert from "node:assert/strict";
import { continueUrl, directLink, isValidEmail, renderEmail } from "./signin-email";

test("accepts real emails and rejects junk", () => {
  assert.equal(isValidEmail("fan@example.com"), true);
  assert.equal(isValidEmail("nope"), false);
  assert.equal(isValidEmail(42), false);
  assert.equal(isValidEmail("a@b.c".padStart(300, "x")), false);
});

test("lands on our page, never someone else's origin", () => {
  assert.equal(continueUrl("http://localhost:4200"), "http://localhost:4200/auth/email-link");
  assert.equal(continueUrl("https://evil.example"), "https://quarterscore.com/auth/email-link");
  assert.equal(continueUrl(undefined), "https://quarterscore.com/auth/email-link");
});

test("rewrites the Firebase link to go straight to our page", () => {
  const generated =
    "https://squares-4e4f7.firebaseapp.com/__/auth/action?apiKey=KEY&mode=signIn&oobCode=CODE&continueUrl=https%3A%2F%2Fquarterscore.com%2Fauth%2Femail-link&lang=en";
  const link = new URL(directLink(generated, "https://quarterscore.com/auth/email-link"));
  assert.equal(link.origin + link.pathname, "https://quarterscore.com/auth/email-link");
  assert.equal(link.searchParams.get("oobCode"), "CODE");
  assert.equal(link.searchParams.get("mode"), "signIn");
  assert.equal(link.searchParams.get("apiKey"), "KEY");
});

test("escapes the email address in the HTML", () => {
  const { html, subject } = renderEmail("https://quarterscore.com/auth/email-link?x=1&y=2", "<b>@x.com");
  assert.equal(subject, "Your QuarterScore sign-in link");
  assert.ok(html.includes("&lt;b&gt;@x.com"));
  assert.ok(html.includes("x=1&amp;y=2"));
});
