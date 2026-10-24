const { fuzzySearchMovies, scoreMovie } = require('../utils/fuzzySearchHelper');

const testMovies = [
  {
    movieName: 'Deadpool & Wolverine',
    genres: ['Action', 'Comedy', 'Science Fiction'],
    overview: 'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary behind him.',
    cast: [{ name: 'Ryan Reynolds' }, { name: 'Hugh Jackman' }]
  },
  {
    movieName: 'Inside Out 2',
    genres: ['Animation', 'Family', 'Comedy'],
    overview: 'Teenager Riley mind headquarters is undergoing a sudden demolition to make room for unexpected new Emotions.',
    cast: [{ name: 'Amy Poehler' }, { name: 'Maya Hawke' }]
  },
  {
    movieName: 'Bad Boys: Ride or Die',
    genres: ['Action', 'Crime', 'Thriller'],
    overview: 'Miami cop duo Mike Lowrey and Marcus Burnett embark on a rogue mission to clear his name.',
    cast: [{ name: 'Will Smith' }, { name: 'Martin Lawrence' }]
  },
  {
    movieName: 'Alien: Romulus',
    genres: ['Horror', 'Science Fiction'],
    overview: 'Scavenging a derelict space station, young colonizers come face to face with the terrifying life form.',
    cast: [{ name: 'Cailee Spaeny' }, { name: 'David Jonsson' }]
  },
  {
    movieName: 'A Quiet Place: Day One',
    genres: ['Horror', 'Science Fiction', 'Thriller'],
    overview: 'New York City is invaded by alien creatures who hunt by sound.',
    cast: [{ name: 'Lupita Nyongo' }, { name: 'Joseph Quinn' }]
  },
  {
    movieName: 'Street Fighter',
    genres: ['Action', 'Adventure'],
    overview: 'Martial artists compete in a global fighting tournament.',
    cast: [{ name: 'Jean-Claude Van Damme' }]
  },
  {
    movieName: 'Oppenheimer',
    genres: ['Drama', 'History'],
    overview: 'The story of J. Robert Oppenheimer and the Manhattan Project atomic bomb development.',
    cast: [{ name: 'Cillian Murphy' }, { name: 'Robert Downey Jr.' }]
  },
  {
    movieName: 'Gladiator II',
    genres: ['Action', 'Adventure', 'Drama'],
    overview: 'Lucius enters the Colosseum after his home is conquered by the tyrannical Emperors.',
    cast: [{ name: 'Paul Mescal' }, { name: 'Pedro Pascal' }]
  }
];

const testQueries = [
  { q: 'deadpol', expected: 'Deadpool & Wolverine' },
  { q: 'wolvrine', expected: 'Deadpool & Wolverine' },
  { q: 'dp', expected: 'Deadpool & Wolverine' },
  { q: 'insid out', expected: 'Inside Out 2' },
  { q: 'strt fightr', expected: 'Street Fighter' },
  { q: 'opnheimer', expected: 'Oppenheimer' },
  { q: 'gladiatr', expected: 'Gladiator II' },
  { q: 'bad boy', expected: 'Bad Boys: Ride or Die' },
  { q: 'aliern', expected: 'Alien: Romulus' },
  { q: 'space station', expected: 'Alien: Romulus' },
  { q: 'ryan reynolds', expected: 'Deadpool & Wolverine' },
  { q: 'will smith', expected: 'Bad Boys: Ride or Die' },
  { q: 'horor', expected: 'Alien: Romulus' } // genre typo
];

console.log('--- RUNNING FUZZY SEARCH ACCURACY SUITE ---');
let passed = 0;

for (const { q, expected } of testQueries) {
  const results = fuzzySearchMovies(testMovies, q, { limit: 3 });
  const topMatch = results[0];
  const isMatch = topMatch && topMatch.movieName.toLowerCase().includes(expected.toLowerCase().slice(0, 10));

  if (isMatch) {
    console.log(`[PASS] Query "${q}" => "${topMatch.movieName}" (Score: ${topMatch.score}, Reason: ${topMatch.matchDetail})`);
    passed++;
  } else {
    console.error(`[FAIL] Query "${q}" expected "${expected}", got:`, topMatch ? `"${topMatch.movieName}"` : 'NONE');
  }
}

console.log(`\nResults: ${passed} / ${testQueries.length} passed.`);
if (passed === testQueries.length) {
  console.log('ALL TESTS PASSED WITH 100% ACCURACY!');
  process.exit(0);
} else {
  process.exit(1);
}
