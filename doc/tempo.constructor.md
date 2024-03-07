You instantiate a Tempo in a number of ways.

1. via the Tempo constructor()
a. new Tempo()
b. new Tempo(dateTime)
c. new Tempo(dateTime, options)
d. new Tempo(options)

The {dateTime} argument is one of the following types
  string | number | bigint | Date | Tempo | typeof Temporal | void | null

The {options} argument (in either the first or second parameter) is a JSON object that refines this instance.
(see 'Options')

~~~~~~~~~~~~~~~
Tempo will interpret the {dateTime} depending on the type
  string        - the Tempo parsing engine will attempt to match the string against a known set of patterns
                  (see 'Parsing')

  number        - 