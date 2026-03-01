import '#core/shared/temporal.polyfill.js';
import { Tempo } from '#core/shared/tempo.class.js';

// Define a dynamic event for testing binding
Tempo.init({
  event: {
    'my.birthday': function (this: Tempo) {
      return '2026-05-20';
    }
  }
});

console.log('--- Relative Dates ---');
console.log('Now:      ', new Tempo('now').format('wkdTime'));
console.log('Today:    ', new Tempo('today').format('date'));
console.log('Yesterday:', new Tempo('yesterday').format('date'));
console.log('Tomorrow: ', new Tempo('tomorrow').format('date'));

console.log('\n--- Relative Units ---');
console.log('2 days ago:   ', new Tempo('2 days ago').format('date'));
console.log('3 weeks hence:', new Tempo('3 weeks hence').format('date'));

console.log('\n--- Dynamic Event Function ---');
console.log('My Birthday:', new Tempo('my.birthday').format('display'));

console.log('\n--- Relative Period ---');
console.log('Morning:', new Tempo('morning').format('display'));
