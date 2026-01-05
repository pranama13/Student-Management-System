// Levenshtein distance calculation for fuzzy matching
export const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len2][len1];
};

// Calculate similarity score (0-1)
export const similarity = (str1, str2) => {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
};

// Extract keywords from text
export const extractKeywords = (text) => {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'on', 'at',
    'for', 'with', 'by', 'from', 'as', 'about', 'into', 'through', 'during',
    'how', 'what', 'when', 'where', 'why', 'who', 'which', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
    'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
};

// Calculate keyword match score
export const keywordMatchScore = (text, keywords) => {
  if (!keywords || keywords.length === 0) return 0;
  
  const textWords = extractKeywords(text);
  const keywordSet = new Set(keywords.map(k => k.toLowerCase()));
  
  let matches = 0;
  textWords.forEach(word => {
    // Exact match
    if (keywordSet.has(word)) {
      matches += 2;
    } else {
      // Fuzzy match with keywords
      for (const keyword of keywordSet) {
        if (similarity(word, keyword) > 0.7) {
          matches += 1;
          break;
        }
      }
    }
  });

  return matches / (keywords.length * 2); // Normalize to 0-1
};


