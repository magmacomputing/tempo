You instantiate a Tempo in a number of ways.

1. via the Tempo constructor()
a. new Tempo()
b. new Tempo(dateTime)
c. new Tempo(dateTime, options)
d. new Tempo(options)

The {dateTime} argument is one of the following types:
- `string`: ISO strings, natural language relative strings, or custom patterns.
- `number`: Unix timestamps in milliseconds (default) or microseconds.
- `BigInt`: Unix timestamps in nanoseconds.
- `Date`: Standard JavaScript Date object.
- `Tempo`: Another Tempo instance (clones the instance).
- `Temporal.*`: Various Temporal objects (ZonedDateTime, PlainDate, etc.).
- `void` | `null`: Defaults to the current time ("now").

The {options} argument (in either the first or second parameter) is a JSON object that refines this instance.
(see 'Options')

---

Tempo will interpret the {dateTime} depending on its type:
- **string**: The parsing engine attempts to match the string against a known set of patterns (see [Parsing](file:///home/michael/Project/tempo/doc/tempo.layout.md)).
- **number**: Interpreted as a Unix timestamp. The precision (ms or us) is configurable via `Tempo.init()`.
- **Temporal objects**: Directly converted to a `Tempo` instance, preserving time zone and calendar if applicable.