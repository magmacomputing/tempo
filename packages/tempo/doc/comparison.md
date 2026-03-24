# 🥊 Tempo vs. The Competition

If you are choosing a date library today, you are likely looking at **Day.js**, **Luxon**, or **date-fns**. While these are excellent tools, they were all built for the legacy `Date` era. 

**Tempo** is the first premium wrapper built specifically for the **Temporal API** (Stage 3), giving it unique advantages that legacy libraries simply cannot match.

---

## At a Glance

| Feature | Tempo 💎 | Day.js / Moment | Luxon | date-fns |
| :--- | :--- | :--- | :--- | :--- |
| **Foundation** | **Native Temporal** | Legacy `Date` | Legacy `Intl` + `Date` | Legacy `Date` |
| **Precision** | **Nanoseconds** | Milliseconds | Milliseconds | Milliseconds |
| **Parsing** | **Human-Centric** | Strict / Plugin | Strict | Modular / Strict |
| **Business Logic** | **Terms System** | Manual Math | Manual Math | Manual Math |
| **Time Zones** | **First-Class** | Plugin-based | Built-in | Separate Lib |
| **Future-Proof** | **100% (Native)** | Deprecated/Legacy | Legacy Bridge | Legacy Bridge |

---

## 💎 Why Tempo Wins

### 1. The "Terms" Engine (Business Intelligence)
Most libraries stop at "adding 2 days." Tempo introduces the **Terms** system, allowing you to encode domain-specific logic (Fiscal Quarters, Meteorological Seasons, Academic Terms, Zodiac Signs) directly into the tempo `term` object. 
> *Competition:* You have to write custom utility functions and import them everywhere.

### 2. Human-Centric Parsing
Day.js and Luxon are quite strict. If your string isn't in exactly the right format, they fail. Tempo’s **Snippet & Layout** engine is designed to be "forgiving" and human-centric, handling relative dates like "next Friday" or "Christmas" out of the box.
> *Competition:* Often requires an external library like `Chrono` or complex regex boilerplate.

### 3. Nanosecond Precision
Native `Date` (and thus Day.js/Luxon/date-fns) is limited to milliseconds. For high-frequency trading, scientific data, or distributed systems, this isn't enough. Tempo inherits **nanosecond precision** from the Temporal API.
> *Competition:* Capped at 1/1000th of a second.

### 4. Zero "Leaky Abstractions"
When you use a legacy library, you are often fighting the weirdness of the 1995 `Date` object (like months being 0-indexed). Tempo is built on `Temporal`, which was designed from the ground up to be mathematically sound and developer-friendly.

---

## Which should you choose?

- **Choose Day.js if:** You have a legacy codebase and need a tiny <2KB patch for simple tasks.
- **Choose Luxon if:** You need a mature, stable bridge while you wait for your environment to support Temporal.
- **Choose Tempo if:** You want to build on the **future of JavaScript**, you need **high precision**, or your app requires **complex business-date logic** that other libraries make difficult.

[**Ready to start? See the Quick Start Guide →**](../README.md#🛠️-quick-start)
