# Tempo Cookbook

A collection of recipes for solving common date and time challenges using Tempo.

## Table of Contents
1. [The Basics](#the-basics)
2. [Parsing Challenges](#parsing-challenges)
3. [Manipulation & Calculations](#manipulation--calculations)
4. [Timezones & Locales](#timezones--locales)
5. [Business Logic & Terms](#business-logic--terms)
6. [Interoperability](#interoperability)

---

## The Basics

### How do I get the current date and time?
By default, the constructor returns "now".
```typescript
const now = new Tempo();
console.log(now.toString());
```

### How do I format a date for my UI?
Use the placeholder syntax in the `.format()` method.
```typescript
const t = new Tempo('2024-12-25');
t.format('{dd} {mon} {yyyy}'); // "25 December 2024"
t.format('{hh}:{mi} {mer}');   // "12:00 am"
```

### How do I check if a date is valid?
```typescript
const t = new Tempo('invalid-date');
if (t.isValid()) {
  // ...
}
```

---

## Parsing Challenges

### Parsing "Ambiguous" Digits (US vs UK)
Tempo uses your timezone to decide if `04012026` is April 1st or January 4th.
```typescript
// US Context (en-US)
const us = new Tempo('04012026', { timeZone: 'America/New_York' }); 
console.log(us.format('{mon} {dd}')); // "April 1"

// UK/Elsewhere Context (en-GB)
const uk = new Tempo('04012026', { timeZone: 'Europe/London' });
console.log(uk.format('{mon} {dd}')); // "January 04"
```

### Handling Relative Strings
Tempo natively understands human-readable offsets.
```typescript
new Tempo('yesterday');
new Tempo('next Friday');
new Tempo('2 weeks ago');
new Tempo('tomorrow afternoon');
```

### Parsing Unix Timestamps
Tempo handles both milliseconds (Number) and nanoseconds (BigInt).
```typescript
new Tempo(1716163200000);         // Milliseconds
new Tempo(1716163200000000000n);  // Nanoseconds
```

---

## Manipulation & Calculations

### Add or Subtract Time
Tempo instances are immutable; `add()` returns a new instance.
```typescript
const deadline = new Tempo().add({ days: 7, hours: 2 });
const past = new Tempo().add({ months: -1 });
```

### How do I jump to Term boundaries?
Use the `#` prefix with `start` or `end` to jump to semantic boundaries like Quarters or Seasons.
```typescript
const qtrStart = new Tempo().set({ start: '#quarter' });
const sznEnd = new Tempo().set({ end: '#season' });
```

### How long until a deadline?
```typescript
const t = new Tempo();
const daysLeft = t.until('2025-01-01', 'days');
console.log(`${daysLeft} days remaining`);
```

---

## Timezones & Locales

### Convert Time to Another Zone
```typescript
const nyc = new Tempo('2024-05-20 10:00', { timeZone: 'America/New_York' });
const london = nyc.set({ timeZone: 'Europe/London' });

console.log(nyc.format('{hh}:{mi}'));    // "10:00"
console.log(london.format('{hh}:{mi}')); // "15:00"
```

### Get "Now" in UTC
```typescript
const utcNow = new Tempo({ timeZone: 'UTC' });
```

---

## Business Logic & Terms

### Is it the weekend?
```typescript
const t = new Tempo();
const isWeekend = t.dow >= 6; // Saturday = 6, Sunday = 7
```

### What Fiscal Quarter are we in?
Using the `qtr` Term plugin.
```typescript
const t = new Tempo();
console.log(`Current Quarter: ${t.term.qtr}`); // "Q1", "Q2", etc.
```

### Hemispheric Seasons
Tempo Terms are hemisphere-aware.
```typescript
const sydney = new Tempo('2024-07-01', { sphere: 'south' });
console.log(sydney.term.szn); // "Winter"

const london = new Tempo('2024-07-01', { sphere: 'north' });
console.log(london.term.szn); // "Summer"

// or even via the timeZone setting
console.log(new Tempo({ timeZone: 'America/New_York' }).term.szn); // "Summer"
console.log(new Tempo({ timeZone: 'Australia/Sydney' }).term.szn); // "Winter"
```

### Unified Term Math
Tempo allows you to shift dates by semantic "steps" while preserving your relative position within the term.
```typescript
const t1 = new Tempo('2024-05-15'); // Middle of Q2
const t2 = t1.add({ '#quarter': 1 }); // Middle of Q3: "2024-08-14" (approx)
```

### Semantic Formatting
Use specific term tokens like `{#quarter}` or `{#season}` to automatically embed a Term's label (or key) into a format string.
```typescript
const t = new Tempo();
console.log(t.format('We are currently in the {#quarter}')); // "We are currently in the First Quarter"
```

---

## 🕒 Reactive Streams & Tickers

### Subscription Billing (Recurring Payments)
Use a `seed` to anchor your subscription to a specific day, then use a month-based ticker.

```typescript
// Anchor to the 15th of the month
await using billing = Tempo.ticker({ 
  months: 1, 
  seed: '2024-01-15' 
}, (t) => processPayment(t));
```

### Fiscal Quarter Reporting
Drive internal reporting cycles precisely when a new quarter begins.

```typescript
// Shift automatically to the start of the current quarter
await using quarterly = Tempo.ticker({ '#quarter': 1 });

for await (const t of quarterly) {
  generateReport(t.term.quarter);
}
```

### Daily Shift Management
Automatically update a UI when a daily time period (e.g., 'morning' or 'afternoon') changes.

```typescript
using shiftTicker = Tempo.ticker({ '#period': 1 }, (t) => {
  document.body.className = `shift-${t.term.per}`;
});

using dailyTicker = Tempo.ticker({ '#period': 'morning' }, (t) => {
  document.body.className = `morning-has-broken`;
});
```

### Manual Sync (Action-Triggered)
Sometimes you want a ticker's logic but need to trigger it from an external event.

```typescript
const heartbeat = Tempo.ticker({ seconds: 5 });

// Manually trigger a pulse from a UI button or WebSocket
button.onclick = () => {
  const t = heartbeat.pulse();
  console.log(`Manual pulse triggered at: ${t}`);
};
```

---

## Interoperability

### Converting to / from Native `Date`
```typescript
const date = new Tempo().toDate();
const tempo = new Tempo(new Date());
```

### Converting to `Temporal` Objects
```typescript
const zdt = new Tempo().toDateTime();  // Temporal.ZonedDateTime
const instant = new Tempo().toInstant(); // Temporal.Instant
const pDate = new Tempo().toPlainDate(); // Temporal.PlainDate
```

### Sorting an array of Tempos
```typescript
const dates = [new Tempo('tomorrow'), new Tempo('yesterday'), new Tempo('today')];
dates.sort(Tempo.compare); // Sorts chronologically
```
