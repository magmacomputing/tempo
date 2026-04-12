import { Tempo } from '../../tempo.class.js';
import { TermsModule } from './term.index.js';

// Side-effect: Automatically register all standard terms
Tempo.extend(TermsModule);
