Here are my thoughts, and why I'm not happy with this feature.
1) it has introduced regression errors
2) it has introduced non-deterministic results (the first match wins ?!  not good enough in a public utility)
3) it already has similar-enough syntax available {start:'#period'}
4) I'm not convinced that this will be a high-hit feature, so am wary about the effort that will go into dev / test / maintaining it.

Because we've gone quite a ways down this path, I'd like to 'firm-up' the requirements (although I'm still not committed to delivering this feature).
Important to remember that we have a TermKey (like 'qtr'), a TermScope (like 'quarter'), and a RangeKey (like 'q1')
All lookups for a TermKey or TermScope will be performed against the current Tempo's Term definition, all lookups mapped to lowercase for matching.
Important to retain the assigned Range-list when using a TermKey or TermScope (for example, the existing list should already be keyed by 'sphere' for zodiac)

## .set()
1) {start: '#quarter'}  returns a Tempo at the beginning of the current quarter
2) {start: '#period' }  returns a Tempo based at the beginning of the current period (e.g. if 'morning' at 08:15, returns 08:00)
3) {start: '#zodiac' } returns a Tempo based at the beginning of the current zodiac sign
4) {start: '#season' } returns a Tempo based at the beginning of the current season
** the above is already established and working and remains the gold-standard
5) {start: '#quarter.q1' } names the Term and RangeKey that will be used to set the new Tempo
6) {start: '#period.afternoon' } names the Term and RangeKey that will be used to set the new Tempo
7) {start: '#zodiac.aries' } names the Term and RangeKey
8) {start: '#season.summer' } names the Term and RangeKey that will be used to set the new Tempo (within the fiscal year, so it might be greater or lesser than current season)
** allowable to use the TermKey ('#qtr.q3') or TermScope ('#quarter.q3') interchangeably in the above.
** allowable to use the string value from the above as a shorthand only to denote 'start' e.g.  .set('#zodiac.taurus')
** each of the above keys can be 'start' | 'mid' | 'end' to determine where the Tempo date lands

## .add()
1) {'#quarter':1} remains the gold-standard... returns a new Tempo at the beginning date of the next quarter
2) {'#period': 2} returns a new Tempo offsetting the current Period (e.g. morning) by two terms, so effectively two days later at 08:00
3) { '#zodiac': 3} returns a new Tempo at the beginning date of the next three zodiac signs, wrapping around the year boundary
4) { '#season': 2 } returns a new Tempo offsetting the current Season (e.g. Winter) by two terms, so effectively two years later
** the above is already established and working
5) { '#quarter.q1': 1 } returns a new Tempo at the beginning of the next quarter-one (today, or in the in the future)
6) { '#period.afternoon': 2 } returns a new Tempo at the beginning of the 'afternoon' on the clock two days from current Tempo
7) { '#zodiac.taurus': 3 } returns a new Tempo at the beginning of the 'Taurus' term three cycles from current Tempo
8) { '#season.autumn': 4 } returns a new Tempo at the beginning of the next 'Autumn' term
** allowable to use the TermKey ('#qtr.q3') or TermScope ('#quarter.q3') interchangeably in the above.
** if the offset values are negative, then new Tempos are returned prior to the current Tempo
** allowable to use the string key from the above as a shorthand only to denote '1' term e.g. .add('#zodiac.aries')