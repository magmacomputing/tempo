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

### Jump to Start/End of a Period
Use `.set()` with the `start` or `end` keywords.
```typescript
const monthStart = new Tempo().set({ start: 'month' });
const weekEnd = new Tempo().set({ end: 'week' });
const midnight = new Tempo().set({ hour: 0 });
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
