/**
 * fuzzySearchHelper.js
 *
 * Lightweight, zero-dependency fuzzy matching and recommendation engine.
 * Provides typo-tolerance (Levenshtein & Damerau transposition distance),
 * substring/prefix scoring, acronyms, and contextual matching (genres, synopsis, cast).
 */

/**
 * Calculates the Levenshtein distance with transposition (Damerau-Levenshtein).
 * Handles insertions, deletions, substitutions, and adjacent character swaps.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export const levenshteinDistance = (a = '', b = '') => {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  // 2D distance matrix
  const matrix = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0));

  for (let i = 0; i <= al; i++) matrix[i][0] = i;
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let min = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition check (e.g. 'aliern' <-> 'alien', 'teh' <-> 'the')
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        min = Math.min(min, matrix[i - 2][j - 2] + cost);
      }

      matrix[i][j] = min;
    }
  }

  return matrix[al][bl];
};

/**
 * Normalizes text by lowercasing, removing diacritics/accents,
 * replacing punctuation with spaces, and trimming whitespace.
 *
 * @param {string} text
 * @returns {string}
 */
export const normalizeText = (text = '') => {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')     // replace symbols/punctuation with spaces
    .replace(/\s+/g, ' ')             // collapse whitespace
    .trim();
};

/**
 * Tokenizes text into an array of clean words.
 *
 * @param {string} text
 * @returns {string[]}
 */
export const tokenize = (text = '') => {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm.split(' ').filter(Boolean);
};

/**
 * Calculates similarity ratio between two strings from 0.0 to 1.0.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export const calculateSimilarity = (a = '', b = '') => {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return 1.0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(na, nb);
  return Math.max(0, (maxLen - dist) / maxLen);
};

/**
 * Checks if characters of needle appear sequentially within haystack.
 *
 * @param {string} needle
 * @param {string} haystack
 * @returns {boolean}
 */
export const isSubsequence = (needle = '', haystack = '') => {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  let ni = 0;
  let hi = 0;
  while (ni < n.length && hi < h.length) {
    if (n[ni] === h[hi]) ni++;
    hi++;
  }
  return ni === n.length;
};

/**
 * Evaluates and scores how well a movie matches a given search query.
 * Considers title similarity, typo tolerance, prefix/token matches,
 * acronyms, genres, overview keywords, and cast names.
 *
 * @param {object} movie
 * @param {string} rawQuery
 * @returns {{ score: number, matchType: string, matchDetail: string }}
 */
export const scoreMovie = (movie = {}, rawQuery = '') => {
  const qNorm = normalizeText(rawQuery);
  if (!qNorm) {
    return { score: 1.0, matchType: 'none', matchDetail: '' };
  }

  const qTokens = tokenize(qNorm);
  const titleNorm = normalizeText(movie.movieName || movie.title || '');
  const titleTokens = tokenize(titleNorm);

  let bestScore = 0;
  let matchType = 'none';
  let matchDetail = '';

  // 1. Exact match on title
  if (titleNorm === qNorm) {
    return { score: 1.0, matchType: 'exact', matchDetail: 'Exact title match' };
  }

  // 2. Title starts with query (Prefix match)
  if (titleNorm.startsWith(qNorm)) {
    const score = 0.95;
    if (score > bestScore) {
      bestScore = score;
      matchType = 'prefix';
      matchDetail = 'Title begins with search';
    }
  }

  // 3. Substring match inside title
  if (titleNorm.includes(qNorm)) {
    const score = 0.88;
    if (score > bestScore) {
      bestScore = score;
      matchType = 'substring';
      matchDetail = 'Title contains search phrase';
    }
  }

  // 4. Acronym / Initialism match (e.g. 'dp' -> 'Deadpool', 'io2' -> 'Inside Out 2', 'bb' -> 'Bad Boys')
  if (titleTokens.length > 1 && qNorm.length >= 2 && qNorm.length <= titleTokens.length) {
    const acronym = titleTokens.map((t) => t[0]).join('');
    if (acronym.startsWith(qNorm) || acronym === qNorm) {
      const score = 0.84;
      if (score > bestScore) {
        bestScore = score;
        matchType = 'acronym';
        matchDetail = 'Title acronym match';
      }
    }
  }

  // 5. Token-level fuzzy and typo matching
  if (qTokens.length > 0 && titleTokens.length > 0) {
    let totalTokenScore = 0;

    for (const qTok of qTokens) {
      let maxTokScore = 0;

      for (const tTok of titleTokens) {
        if (qTok === tTok) {
          maxTokScore = Math.max(maxTokScore, 1.0);
          break;
        }

        // Token prefix match (e.g. 'dead' matches 'deadpool')
        if (tTok.startsWith(qTok)) {
          maxTokScore = Math.max(maxTokScore, 0.92);
          continue;
        }

        if (tTok.includes(qTok)) {
          maxTokScore = Math.max(maxTokScore, 0.82);
          continue;
        }

        // Levenshtein distance on individual words/tokens
        const dist = levenshteinDistance(qTok, tTok);
        const maxLen = Math.max(qTok.length, tTok.length);

        if (qTok.length >= 3 && dist <= 1) {
          // 1 typo for 3+ letter word (e.g. 'fightr' -> 'fighter', 'strt' -> 'street', 'deadpol' -> 'deadpool')
          const sim = (maxLen - dist) / maxLen;
          maxTokScore = Math.max(maxTokScore, Math.max(0.78, sim * 0.9));
        } else if (qTok.length >= 6 && dist <= 2) {
          // 2 typos for 6+ letter word (e.g. 'gladiatr' -> 'gladiator', 'opnheimer' -> 'oppenheimer')
          const sim = (maxLen - dist) / maxLen;
          maxTokScore = Math.max(maxTokScore, Math.max(0.72, sim * 0.88));
        }
      }

      totalTokenScore += maxTokScore;
    }

    const avgTokenScore = totalTokenScore / qTokens.length;
    // Boost if multiple tokens matched
    const tokenMultiplier = qTokens.length > 1 ? 0.95 : 0.90;
    const computedScore = avgTokenScore * tokenMultiplier;

    if (computedScore > bestScore && avgTokenScore >= 0.65) {
      bestScore = computedScore;
      matchType = 'fuzzy_title';
      matchDetail = `Fuzzy title match (${Math.round(computedScore * 100)}%)`;
    }
  }

  // 6. Whole title Levenshtein distance (e.g. 'insid out' -> 'inside out')
  const wholeSim = calculateSimilarity(qNorm, titleNorm);
  if (wholeSim >= 0.65) {
    const score = wholeSim * 0.92;
    if (score > bestScore) {
      bestScore = score;
      matchType = 'fuzzy_title';
      matchDetail = `Title similarity (${Math.round(score * 100)}%)`;
    }
  }

  // 7. Subsequence check (e.g. letters typed in order without spaces)
  const qCompact = qNorm.replace(/\s+/g, '');
  const tCompact = titleNorm.replace(/\s+/g, '');
  if (qCompact.length >= 3 && isSubsequence(qCompact, tCompact)) {
    const score = 0.76;
    if (score > bestScore) {
      bestScore = score;
      matchType = 'subsequence';
      matchDetail = 'Subsequence match';
    }
  }

  // 8. Contextual match: Genres
  const genres = Array.isArray(movie.genres) ? movie.genres : [];
  for (const g of genres) {
    const gNorm = normalizeText(String(g));
    if (!gNorm) continue;

    if (gNorm === qNorm || gNorm.startsWith(qNorm) || qNorm.startsWith(gNorm)) {
      const score = 0.75;
      if (score > bestScore) {
        bestScore = score;
        matchType = 'genre';
        matchDetail = `Genre: ${g}`;
      }
      break;
    }

    // Typo in genre name (e.g. 'acton' -> 'action', 'horor' -> 'horror')
    if (qNorm.length >= 4 && levenshteinDistance(qNorm, gNorm) <= 1) {
      const score = 0.70;
      if (score > bestScore) {
        bestScore = score;
        matchType = 'genre';
        matchDetail = `Genre: ${g}`;
      }
      break;
    }
  }

  // 9. Contextual match: Synopsis / Overview keywords
  const overviewNorm = normalizeText(movie.description || movie.overview || '');
  if (overviewNorm && qNorm.length >= 3) {
    if (overviewNorm.includes(qNorm)) {
      const score = 0.68;
      if (score > bestScore) {
        bestScore = score;
        matchType = 'overview';
        matchDetail = 'Matched in overview';
      }
    } else if (qTokens.length > 1) {
      // Check if majority of query words appear in overview
      const overviewTokens = tokenize(overviewNorm);
      const matches = qTokens.filter((qt) =>
        qt.length >= 3 && overviewTokens.some((ot) => ot === qt || ot.startsWith(qt))
      );
      if (matches.length >= Math.ceil(qTokens.length * 0.7)) {
        const score = 0.64;
        if (score > bestScore) {
          bestScore = score;
          matchType = 'overview';
          matchDetail = 'Matched plot keywords';
        }
      }
    }
  }

  // 10. Contextual match: Cast members
  const cast = Array.isArray(movie.cast) ? movie.cast : [];
  for (const actor of cast) {
    const actorName = typeof actor === 'string' ? actor : actor?.name;
    const actorNorm = normalizeText(actorName || '');
    if (!actorNorm) continue;

    if (actorNorm.includes(qNorm) || (qTokens.length > 0 && qTokens.every((qt) => actorNorm.includes(qt)))) {
      const score = 0.72;
      if (score > bestScore) {
        bestScore = score;
        matchType = 'cast';
        matchDetail = `Cast: ${actorName}`;
      }
      break;
    }
  }

  return {
    score: Number(bestScore.toFixed(3)),
    matchType,
    matchDetail
  };
};

/**
 * Searches and ranks movies using the fuzzy scoring algorithm.
 * Filters out items below the relevance threshold and sorts by score descending,
 * breaking ties using voteAverage / rating.
 *
 * @param {Array} movies
 * @param {string} query
 * @param {object} [options]
 * @param {number} [options.threshold=0.38]
 * @param {number} [options.limit=10]
 * @returns {Array} Array of movie objects augmented with score, matchType, and matchDetail
 */
export const fuzzySearchMovies = (movies = [], query = '', options = {}) => {
  if (!Array.isArray(movies) || movies.length === 0) return [];

  const trimmed = (query || '').trim();
  if (!trimmed) {
    return movies.map((m) => ({ ...m, score: 1.0, matchType: 'none', matchDetail: '' }));
  }

  const threshold = options.threshold ?? 0.38;
  const limit = options.limit ?? 10;

  const scoredList = [];

  for (const movie of movies) {
    if (!movie) continue;
    const { score, matchType, matchDetail } = scoreMovie(movie, trimmed);

    if (score >= threshold) {
      scoredList.push({
        ...movie,
        score,
        matchType,
        matchDetail
      });
    }
  }

  // Sort descending by score, tiebreak with voteAverage
  scoredList.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) > 0.04) {
      return diff;
    }
    const aRating = Number(a.voteAverage || a.vote_average || 0);
    const bRating = Number(b.voteAverage || b.vote_average || 0);
    return bRating - aRating;
  });

  return limit ? scoredList.slice(0, limit) : scoredList;
};
