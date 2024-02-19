<img src="./img/hourglass-svgrepo-com.svg" width="100px">
<h1><span style="font-size:100px;">Tempo</span></h1>
A Wrapper around the Javascript Temporal object

The new proposed Ecmascript Temporal object (currently at Stage 3 as-at July-2023)
will bring many benefits to Developers.

The trade-off for this is additional syntax to learn and multiple APIs.
In addition, parsing of strings (to Temporal objects) is very strict.

This library is intended to make the use of Temporal much easier
by instantiating a class that wraps an immutable Temporal.ZonedDateTime

*~~~
# syntax:
		new Tempo()						to instantiate a new Tempo object
		new Tempo('20-May')		flexible parsing in constructor
		new Tempo(20220301, {debug: true, catch: true})

		A Tempo will set its options from
		*> internal default settings
		*> optionally overridden by config-file settings (see :configuration)
		*> optionally overridden by invocation settings  (see :options)

*~~~
# options:
		Tempo() will take up-to two arguments

		The first is the 'date-time' to use when creating a Tempo.
		It can supplied as a string, number, Date, null, undefined, another Tempo, or a Temporal Date/Time object.
		Null and Undefined tell Tempo to use the current date-time

		The second argument is an object that further refines the new Tempo.
		timeZone: string													// overrides the TimeZone (default: 'Australia/Sydney')
		calendar: string													// overrides the Calendar to use (default: 'iso8601')
		locale: string														// overrides the Locale to use when parsing the first Tempo argument
																							// (default: 'en-AU').  When set to 'en-US' dates are parsed in m-d-y order
		debug: boolean														// allows a console.log to show how a Tempo was parsed (default: false)
		catch: boolean														// allows a Tempo to exit gracefully and the caller handles any errors (default: false)
		pivot: number															// the two-digit year number that determines which century to prepend (default: 75)
																							// for example, 50-May-01  will be interpreted as 1950-May-01 because it was less than 75 years from now
		season: [summer, autumn, winter, spring]	// an array of Temporal.MonthDay that determine when a season starts
		quarter: [Date, Date, Date, Date]					// an array of Temporal.MonthDay that determine when a financial quarter starts
		format: string[]													// an array of Temporal properties that can be used to parse the first argument
	

		As an overload, the object can be provided in the first argument.  
		If {value:'xxx'} is not supplied, then the current date-time is used.
*~~~
# properties
static:
	regex																				// an object that defines the inbuilt patterns that can be used to construct parsers (see configuration)
	durations																		// a getter to show the Tempo duration strings
	properties																	// a getter to show the Tempo accessors
	defaults																		// a getter to show the defaults that will be used (if not overridden)
	patterns																		// a getter to show the RegExp patterns that are used to parse a Tempo (see configuration)

instance:
	yy																					// 4-digit year
	mm																					// month: Jan=1, Dec=12
	dd																					// day of month
	dow																					// weekday: Mon=1, Sun=7
	ww																					// number of elapsed weeks in year
	qtr																					// quarter: Q1-Q4

	mmm																					// short month name
	mon																					// full month name
	ddd																					// short weekday name
	day																					// full weekday name

	hh																					// hours since midnight: 24-hour format
	mi																					// minutes since last hour
	ss																					// seconds since last minute

	ms																					// milliseconds since last second
	us																					// microseconds since last millisecond
	ns																					// nanoseconds since last microsecond
	ff																					// fractional seconds since last second
	tz																					// timezone
	ts																					// seconds (timeStamp) since Unix epoch
	age																					// nanoseconds (BigInt) since Unix epoch

	season																			// season: Summer/Autumn/Winter/Spring
	config																			// Instance configuration

# enums
	WEEKDAY																			// Mon/Tue/Wed/Thu/Fri/Sat/Sun
	WEEKDAYS																		// Monday/Tuesday/Wednesday/Thursday/Friday/Saturday/Sunday
	MONTH																				// Jan/Feb/Mar/Apr/May/Jun/Jul/Aug/Sep/Oct/Nov/Dec
	MONTHS																			// January/February/March/April/May/June/July/August/September/October/November/December
	DURATION																		// year/quarter/month/week/day/hour/minute/second
	DURATIONS																		// years/quarters/months/weeks/days/hours/minutes/seconds

	FORMAT																			// {string; inbuilt format-strings}
	TIME																				// {keyof DURATION: number of seconds per unit-of-time}
	TIMES																				// {keyof DURATIONS: number of milli-seconds per unit-of-time}
	SEASON																			// Summer/Autumn/Winter/Spring

# consts
	DATE {
		epoch: 0,
		maxDate: PlainDate('9999-12-31'),
		minDate: PlainDate('1000-01-01'),
		maxStamp: Instant('9999-12-31').epochSeconds,
		minStamp: Instant('1000-01-01').epochSeconds,
	}

	QUARTERS [																								// QUARTERS[quarter-number]
		,
		Tempo.MONTH.Jul,
		Tempo.MONTH.Oct,
		Tempo.MONTH.Jan,
		Tempo.MONTH.Apr,
	]

	SEASONS [																									// SEASONS[month-number]
		,
		Tempo.SEASON.Summer,
		Tempo.SEASON.Summer,
		Tempo.SEASON.Autumn,
		Tempo.SEASON.Autumn,
		Tempo.SEASON.Autumn,
		Tempo.SEASON.Winter,
		Tempo.SEASON.Winter,
		Tempo.SEASON.Winter,
		Tempo.SEASON.Spring,
		Tempo.SEASON.Spring,
		Tempo.SEASON.Spring,
		Tempo.SEASON.Summer,
	]
*~~~
# methods:
static:
  from()																										// a helper function to return a new Tempo

instance:																										// for the following assume 'const tempo = new Tempo()'
	diff(Tempo, unit:string, args:format)											// calculate the difference between two Tempo's
																														// e.g.   tempo.diff(new Tempo('01-Jan'), 'days')
	elapse(Tempo, args:format)																// format elapsed Diff-strings (useful for logging)
																														// e.g.		tempo.elapsed()   might return "0:12:54.554"
	format(args:format)																				// applies a format-string to a Tempo
																														// e.g.		tempo.format('HH:MI:SS seconds')

	add(offset: number, unit: string)													// returns a new Tempo offset by a value and component
																														// e.g.		tempo.add(1, 'days')
	startOf(unit: string)																			// returns a new Tempo offset to a position (start, middle, end) of a unit
	midOf(unit: string)																				// e.g.		tempo.startOf('hour')
	endOf(unit: string)																				// e.g.		tempo.endOf('month')

	toTemporal()																							// returns the underlying Temporal.ZonedDateTime
	toDate()																									// returns the Tempo as a Javascript Date
	toString()																								// returns the Temporal.ZonedDateTime.toString()
	toJSON()																									// returns the Temporal.ZonedDateTime.toJSON()
	isValid()																									// returns a boolean to indicate if the underlying Tempo was successfully parsed

*~~~
# patterns:

	One problem I am trying to solve (with this Wrapper) is to allow more flexible 'parsing'
	when interpreting date/time arguments.   This is because each browser vendor has implemented
	their own parsing mechanism, and I wanted to create something repeatable.

	Best to explain with an example...   Tempo has a <<TODO>>

*~~~
# configuration:
	You will need to install a polyfill until the Temporal standard reaches your Browser.
	I recommend the following:

	npm install @js-temporal/polyfill

	Tempo will check a set of sources, in order to determine what configuration to apply
	1> This Class has in-built defaults
	2> On first create, Tempo will look for a tempo.config.json in the same directory as this Class
	3> As a final override, Tempo will allow per-instance

<<TODO>>
