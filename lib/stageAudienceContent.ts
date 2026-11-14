export type StagePhoto = { id: string; url: string; caption: string };
export function approvedStagePhotos(data: unknown): StagePhoto[] {
  const value = data as { enabled?: boolean; photos?: unknown[] } | null;
  if (!value?.enabled || !Array.isArray(value.photos)) return [];
  return value.photos.flatMap(item => {
    const row = item as Record<string, unknown> | null;
    if (!row || row.status !== 'approved' || typeof row.id !== 'string' || typeof row.url !== 'string') return [];
    try { if (new URL(row.url).protocol !== 'https:') return []; } catch { return []; }
    return [{ id: row.id, url: row.url, caption: typeof row.caption === 'string' ? row.caption.slice(0, 160) : '' }];
  });
}
// Editorial questions, not generated live. Sources retained for future review.
export const musicTrivia = [
  { question: 'Who was Queen’s lead singer on “Bohemian Rhapsody”?', answer: 'Freddie Mercury', source: 'https://rockhall.com/inductees/queen/' },
  { question: 'Who wrote “I Will Always Love You” before Whitney Houston recorded it?', answer: 'Dolly Parton', source: 'https://www.grammy.com/news/whitney-houston-i-will-always-love-you-grammys-win-1994-dolly-parton-video-rewind/' },
  { question: 'Which band recorded “We Will Rock You”?', answer: 'Queen', source: 'https://www.hollywoodrecords.com/press/queen/' },
  { question: 'Which instrument usually has 88 keys?', answer: 'A piano', source: 'https://www.yamaha.com/en/musical_instrument_guide/piano/trivia/trivia007.html' },
  { question: 'What do we call two people singing together?', answer: 'A duet' },
  { question: 'What does singing a cappella mean?', answer: 'Singing without instrumental accompaniment' },
  { question: 'How many strings does a standard guitar have?', answer: 'Six' },
  { question: 'What is the musical term for how fast a song is played?', answer: 'Tempo' },
  { question: 'Which Queen song shares its name with the 2018 film about the band?', answer: 'Bohemian Rhapsody', source: 'https://www.20thcenturystudios.com/movies/bohemian-rhapsody' },
  { question: 'What is the musical term for the highness or lowness of a note?', answer: 'Pitch' },
  { question: 'What do we call three people singing together?', answer: 'A trio' },
  { question: 'What does BPM stand for in music?', answer: 'Beats per minute' },
];
export function audienceSlots(hasNext: boolean, hasPhotos: boolean, hasHighlight: boolean, promotionCount: number) {
  return [...(hasNext ? ['next'] : []), ...(hasPhotos ? ['photo'] : []), 'trivia', ...(hasHighlight ? ['highlight'] : []), ...Array.from({length: promotionCount}, (_, i) => 'promo:' + i)];
}
