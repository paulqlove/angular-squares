import { test } from "node:test";
import assert from "node:assert/strict";
import { continueUrl, directLink, isValidEmail, renderEmail, withAccountHint } from "./signin-email";

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

test("marks the landing page with whether the address already has an account", () => {
  const landing = "https://quarterscore.com/auth/email-link";
  assert.equal(withAccountHint(landing, false), `${landing}?acct=0`);
  assert.equal(withAccountHint(landing, true), `${landing}?acct=1`);
  assert.equal(withAccountHint(`${landing}?x=1`, true), `${landing}?x=1&acct=1`);
});

test("the direct link keeps the account hint and still carries the sign-in parameters", () => {
  const generated = "https://squares-4e4f7.firebaseapp.com/__/auth/links?apiKey=KEY&oobCode=CODE&mode=signIn&lang=en&continueUrl=x";
  const url = new URL(directLink(generated, withAccountHint("https://quarterscore.com/auth/email-link", true)));
  assert.equal(url.origin + url.pathname, "https://quarterscore.com/auth/email-link");
  assert.equal(url.searchParams.get("acct"), "1");
  assert.equal(url.searchParams.get("oobCode"), "CODE");
  assert.equal(url.searchParams.get("apiKey"), "KEY");
  assert.equal(url.searchParams.get("mode"), "signIn");
  const fresh = new URL(directLink(generated, withAccountHint("https://quarterscore.com/auth/email-link", false)));
  assert.equal(fresh.searchParams.get("acct"), "0");
  assert.equal(fresh.searchParams.get("oobCode"), "CODE");
});
