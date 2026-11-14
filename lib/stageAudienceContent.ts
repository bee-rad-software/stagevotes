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
const originalTrivia = [
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
const expandedTrivia = [
  {
    "question": "Which former Beatle released “Imagine” in 1971?",
    "answer": "John Lennon",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Which band recorded “Stairway to Heaven”?",
    "answer": "Led Zeppelin",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Who recorded “Take Me Home, Country Roads”?",
    "answer": "John Denver",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Which singer made “Margaritaville” a signature hit?",
    "answer": "Jimmy Buffett",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Who sang “Flashdance… What a Feeling”?",
    "answer": "Irene Cara",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Which duo recorded “Sweet Dreams (Are Made of This)”?",
    "answer": "Eurythmics",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Which pop star released “Like a Virgin”?",
    "answer": "Madonna",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Who recorded the holiday hit “All I Want for Christmas Is You”?",
    "answer": "Mariah Carey",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Which artist released “Gasolina”?",
    "answer": "Daddy Yankee",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Which band released the album “Synchronicity”?",
    "answer": "The Police",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Which girl-name song was a 1962 hit for The Four Seasons?",
    "answer": "Sherry",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "In which decade did Bobbie Gentry release “Ode to Billie Joe”?",
    "answer": "The 1960s — 1967",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-music-from-madonna--mariah-carey--queen-latifah--daddy-yankee/s/5a91b115-3825-4a5f-a702-35940b4de958"
  },
  {
    "question": "Who released the album “Goodbye Yellow Brick Road”?",
    "answer": "Elton John",
    "source": "https://www.loc.gov/item/prn-25-024/national-recording-registry-inducts-sounds-of-elton-john-chicago-broadways-hamilton-mary-j-blige-amy-winehouse-minecraft-and-microsoft/2025-04-09/"
  },
  {
    "question": "Who sang “My Heart Will Go On” for the movie “Titanic”?",
    "answer": "Celine Dion",
    "source": "https://www.loc.gov/item/prn-25-024/national-recording-registry-inducts-sounds-of-elton-john-chicago-broadways-hamilton-mary-j-blige-amy-winehouse-minecraft-and-microsoft/2025-04-09/"
  },
  {
    "question": "Which country singer recorded “Kiss an Angel Good Mornin’”?",
    "answer": "Charley Pride",
    "source": "https://www.loc.gov/item/prn-25-024/national-recording-registry-inducts-sounds-of-elton-john-chicago-broadways-hamilton-mary-j-blige-amy-winehouse-minecraft-and-microsoft/2025-04-09/"
  },
  {
    "question": "Who had a breakthrough hit with “Before the Next Teardrop Falls”?",
    "answer": "Freddy Fender",
    "source": "https://www.loc.gov/item/prn-25-024/national-recording-registry-inducts-sounds-of-elton-john-chicago-broadways-hamilton-mary-j-blige-amy-winehouse-minecraft-and-microsoft/2025-04-09/"
  },
  {
    "question": "Which band recorded “Fly Like an Eagle”?",
    "answer": "Steve Miller Band",
    "source": "https://www.loc.gov/item/prn-25-024/national-recording-registry-inducts-sounds-of-elton-john-chicago-broadways-hamilton-mary-j-blige-amy-winehouse-minecraft-and-microsoft/2025-04-09/"
  },
  {
    "question": "Which Amy Winehouse album shares its title with a color?",
    "answer": "Back to Black",
    "source": "https://www.loc.gov/item/prn-25-024/national-recording-registry-inducts-sounds-of-elton-john-chicago-broadways-hamilton-mary-j-blige-amy-winehouse-minecraft-and-microsoft/2025-04-09/"
  },
  {
    "question": "Which R&B singer released the 1994 album “My Life”?",
    "answer": "Mary J. Blige",
    "source": "https://www.loc.gov/item/prn-25-024/national-recording-registry-inducts-sounds-of-elton-john-chicago-broadways-hamilton-mary-j-blige-amy-winehouse-minecraft-and-microsoft/2025-04-09/"
  },
  {
    "question": "Which singing cowboy and cowgirl recorded “Happy Trails”?",
    "answer": "Roy Rogers and Dale Evans",
    "source": "https://www.loc.gov/item/prn-25-024/national-recording-registry-inducts-sounds-of-elton-john-chicago-broadways-hamilton-mary-j-blige-amy-winehouse-minecraft-and-microsoft/2025-04-09/"
  },
  {
    "question": "Which Swedish group recorded “Dancing Queen”?",
    "answer": "ABBA",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-sounds-of-abba--blondie--the-cars--the-chicks--juan-gabriel/s/29ee4224-3060-4247-a7a4-7deea2c2f816"
  },
  {
    "question": "Which band released the album “Parallel Lines”?",
    "answer": "Blondie",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-sounds-of-abba--blondie--the-cars--the-chicks--juan-gabriel/s/29ee4224-3060-4247-a7a4-7deea2c2f816"
  },
  {
    "question": "Which punk-rock band released “Dookie”?",
    "answer": "Green Day",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-sounds-of-abba--blondie--the-cars--the-chicks--juan-gabriel/s/29ee4224-3060-4247-a7a4-7deea2c2f816"
  },
  {
    "question": "Which country trio recorded the album “Wide Open Spaces”?",
    "answer": "The Chicks, then known as the Dixie Chicks",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-sounds-of-abba--blondie--the-cars--the-chicks--juan-gabriel/s/29ee4224-3060-4247-a7a4-7deea2c2f816"
  },
  {
    "question": "Who sang the a cappella hit “Don’t Worry, Be Happy”?",
    "answer": "Bobby McFerrin",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-sounds-of-abba--blondie--the-cars--the-chicks--juan-gabriel/s/29ee4224-3060-4247-a7a4-7deea2c2f816"
  },
  {
    "question": "Who recorded “Ain’t No Sunshine”?",
    "answer": "Bill Withers",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-sounds-of-abba--blondie--the-cars--the-chicks--juan-gabriel/s/29ee4224-3060-4247-a7a4-7deea2c2f816"
  },
  {
    "question": "Which singer recorded “Chances Are”?",
    "answer": "Johnny Mathis",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-sounds-of-abba--blondie--the-cars--the-chicks--juan-gabriel/s/29ee4224-3060-4247-a7a4-7deea2c2f816"
  },
  {
    "question": "Who recorded “Tennessee Waltz” in 1950?",
    "answer": "Patti Page",
    "source": "https://newsroom.loc.gov/news/national-recording-registry-inducts-sounds-of-abba--blondie--the-cars--the-chicks--juan-gabriel/s/29ee4224-3060-4247-a7a4-7deea2c2f816"
  },
  {
    "question": "Which group recorded the party anthem “Celebration”?",
    "answer": "Kool & the Gang",
    "source": "https://www.loc.gov/item/prn-21-015/?loclr=twloc"
  },
  {
    "question": "Which Muppet sings “The Rainbow Connection”?",
    "answer": "Kermit the Frog",
    "source": "https://www.loc.gov/item/prn-21-015/?loclr=twloc"
  },
  {
    "question": "Which Jackson sibling released “Rhythm Nation 1814”?",
    "answer": "Janet Jackson",
    "source": "https://www.loc.gov/item/prn-21-015/?loclr=twloc"
  },
  {
    "question": "Which group recorded the 1974 version of “Lady Marmalade”?",
    "answer": "Labelle",
    "source": "https://www.loc.gov/item/prn-21-015/?loclr=twloc"
  },
  {
    "question": "Which rapper released the album “Illmatic”?",
    "answer": "Nas",
    "source": "https://www.loc.gov/item/prn-21-015/?loclr=twloc"
  },
  {
    "question": "Which singer-songwriter released “Late for the Sky”?",
    "answer": "Jackson Browne",
    "source": "https://www.loc.gov/item/prn-21-015/?loclr=twloc"
  },
  {
    "question": "Which reggae artist starred in and recorded music for “The Harder They Come”?",
    "answer": "Jimmy Cliff",
    "source": "https://www.loc.gov/item/prn-21-015/?loclr=twloc"
  },
  {
    "question": "Who recorded the 1968 hit “Wichita Lineman”?",
    "answer": "Glen Campbell",
    "source": "https://www.loc.gov/item/prn-20-023/national-recording-registry-class-produces-ultimate-stay-at-home-playlist/2020-03-25/"
  },
  {
    "question": "Who wrote “Wichita Lineman”?",
    "answer": "Jimmy Webb",
    "source": "https://www.loc.gov/item/prn-20-023/national-recording-registry-class-produces-ultimate-stay-at-home-playlist/2020-03-25/"
  },
  {
    "question": "Which group recorded “Y.M.C.A.”?",
    "answer": "Village People",
    "source": "https://www.loc.gov/item/prn-20-023/national-recording-registry-class-produces-ultimate-stay-at-home-playlist/2020-03-25/"
  },
  {
    "question": "Who released the album “Private Dancer”?",
    "answer": "Tina Turner",
    "source": "https://www.loc.gov/item/prn-20-023/national-recording-registry-class-produces-ultimate-stay-at-home-playlist/2020-03-25/"
  },
  {
    "question": "Which singer released the album “Dusty in Memphis”?",
    "answer": "Dusty Springfield",
    "source": "https://www.loc.gov/item/prn-20-023/national-recording-registry-class-produces-ultimate-stay-at-home-playlist/2020-03-25/"
  },
  {
    "question": "Which band recorded its breakthrough live album at Budokan?",
    "answer": "Cheap Trick",
    "source": "https://www.loc.gov/item/prn-20-023/national-recording-registry-class-produces-ultimate-stay-at-home-playlist/2020-03-25/"
  },
  {
    "question": "Which Tejano star released “Ven Conmigo”?",
    "answer": "Selena",
    "source": "https://www.loc.gov/item/prn-20-023/national-recording-registry-class-produces-ultimate-stay-at-home-playlist/2020-03-25/"
  },
  {
    "question": "Who recorded “Sweet Caroline”?",
    "answer": "Neil Diamond",
    "source": "https://www.loc.gov/item/prn-19-018/?app=true"
  },
  {
    "question": "Which group recorded “September”?",
    "answer": "Earth, Wind & Fire",
    "source": "https://www.loc.gov/item/prn-19-018/?app=true"
  },
  {
    "question": "Who recorded the 1958 rock-and-roll version of “La Bamba”?",
    "answer": "Ritchie Valens",
    "source": "https://www.loc.gov/item/prn-19-018/?app=true"
  },
  {
    "question": "Which duo recorded the 1967 hit “Soul Man”?",
    "answer": "Sam & Dave",
    "source": "https://www.loc.gov/item/prn-19-018/?app=true"
  },
  {
    "question": "Who released the debut solo album “She’s So Unusual”?",
    "answer": "Cyndi Lauper",
    "source": "https://www.loc.gov/item/prn-19-018/?app=true"
  },
  {
    "question": "Who created the soundtrack album “Superfly”?",
    "answer": "Curtis Mayfield",
    "source": "https://www.loc.gov/item/prn-19-018/?app=true"
  },
  {
    "question": "Which rapper released the 2001 album “The Blueprint”?",
    "answer": "Jay-Z",
    "source": "https://www.loc.gov/item/prn-19-018/?app=true"
  },
  {
    "question": "Who recorded “You Make Me Feel (Mighty Real)”?",
    "answer": "Sylvester",
    "source": "https://www.loc.gov/item/prn-19-018/?app=true"
  },
  {
    "question": "Which singer recorded “Piano Man”?",
    "answer": "Billy Joel",
    "source": "https://www.loc.gov/item/prn-16-056/"
  },
  {
    "question": "Who sang the disco anthem “I Will Survive”?",
    "answer": "Gloria Gaynor",
    "source": "https://www.loc.gov/item/prn-16-056/"
  },
  {
    "question": "Which Motown group recorded “Where Did Our Love Go”?",
    "answer": "The Supremes",
    "source": "https://www.loc.gov/item/prn-16-056/"
  },
  {
    "question": "Who recorded the country hit “Mama Tried”?",
    "answer": "Merle Haggard",
    "source": "https://www.loc.gov/item/prn-16-056/"
  },
  {
    "question": "Which metal band released the album “Master of Puppets”?",
    "answer": "Metallica",
    "source": "https://www.loc.gov/item/prn-16-056/"
  },
  {
    "question": "Which jazz saxophonist recorded “A Love Supreme”?",
    "answer": "John Coltrane",
    "source": "https://www.loc.gov/item/prn-16-056/"
  },
  {
    "question": "Which group released “Abraxas” in 1970?",
    "answer": "Santana",
    "source": "https://www.loc.gov/item/prn-16-056/"
  },
  {
    "question": "Who recorded the 1955 version of “Cry Me a River”?",
    "answer": "Julie London",
    "source": "https://www.loc.gov/item/prn-16-056/"
  },
  {
    "question": "Who sang “Over the Rainbow” in “The Wizard of Oz”?",
    "answer": "Judy Garland",
    "source": "https://www.loc.gov/item/prn-17-029/national-recording-registry-picks-are-over-the-rainbow/"
  },
  {
    "question": "Who recorded the original 1971 hit “American Pie”?",
    "answer": "Don McLean",
    "source": "https://www.loc.gov/item/prn-17-029/national-recording-registry-picks-are-over-the-rainbow/"
  },
  {
    "question": "Which group recorded “We Are Family”?",
    "answer": "Sister Sledge",
    "source": "https://www.loc.gov/item/prn-17-029/national-recording-registry-picks-are-over-the-rainbow/"
  },
  {
    "question": "Who recorded “In the Midnight Hour”?",
    "answer": "Wilson Pickett",
    "source": "https://www.loc.gov/item/prn-17-029/national-recording-registry-picks-are-over-the-rainbow/"
  },
  {
    "question": "Which artist created the Ziggy Stardust persona?",
    "answer": "David Bowie",
    "source": "https://www.loc.gov/item/prn-17-029/national-recording-registry-picks-are-over-the-rainbow/"
  },
  {
    "question": "Which band released the album “Remain in Light”?",
    "answer": "Talking Heads",
    "source": "https://www.loc.gov/item/prn-17-029/national-recording-registry-picks-are-over-the-rainbow/"
  },
  {
    "question": "Which country singer recorded “Gunfighter Ballads and Trail Songs”?",
    "answer": "Marty Robbins",
    "source": "https://www.loc.gov/item/prn-17-029/national-recording-registry-picks-are-over-the-rainbow/"
  },
  {
    "question": "Who recorded “Hound Dog” before Elvis Presley?",
    "answer": "Big Mama Thornton",
    "source": "https://www.loc.gov/item/prn-17-029/national-recording-registry-picks-are-over-the-rainbow/"
  },
  {
    "question": "Which band released “The Joshua Tree”?",
    "answer": "U2",
    "source": "https://www.loc.gov/item/prn-14-052/national-recording-registry-reaches-400/2014-04-02/"
  },
  {
    "question": "Which duo recorded “Cathy’s Clown”?",
    "answer": "The Everly Brothers",
    "source": "https://www.loc.gov/item/prn-14-052/national-recording-registry-reaches-400/2014-04-02/"
  },
  {
    "question": "Which singer recorded a celebrated 1994 cover of “Hallelujah”?",
    "answer": "Jeff Buckley",
    "source": "https://www.loc.gov/item/prn-14-052/national-recording-registry-reaches-400/2014-04-02/"
  },
  {
    "question": "Who recorded the “Theme from Shaft”?",
    "answer": "Isaac Hayes",
    "source": "https://www.loc.gov/item/prn-14-052/national-recording-registry-reaches-400/2014-04-02/"
  },
  {
    "question": "Who recorded the original 1961 hit “Stand by Me”?",
    "answer": "Ben E. King",
    "source": "https://www.loc.gov/item/prn-15-041/national-recording-registry-to-ac-cent-tchu-ate-the-positive/2015-03-25/"
  },
  {
    "question": "Which duo recorded “You’ve Lost That Lovin’ Feelin’”?",
    "answer": "The Righteous Brothers",
    "source": "https://www.loc.gov/item/prn-15-041/national-recording-registry-to-ac-cent-tchu-ate-the-positive/2015-03-25/"
  },
  {
    "question": "Who recorded the 1955 hit “Sixteen Tons”?",
    "answer": "Tennessee Ernie Ford",
    "source": "https://www.loc.gov/item/prn-15-041/national-recording-registry-to-ac-cent-tchu-ate-the-positive/2015-03-25/"
  },
  {
    "question": "Which band released the album “OK Computer”?",
    "answer": "Radiohead",
    "source": "https://www.loc.gov/item/prn-15-041/national-recording-registry-to-ac-cent-tchu-ate-the-positive/2015-03-25/"
  },
  {
    "question": "Which band recorded “Livin’ on a Prayer”?",
    "answer": "Bon Jovi",
    "source": "https://rockhall.com/inductees/bon-jovi/"
  },
  {
    "question": "Which Bon Jovi hit has a title about medicine?",
    "answer": "Bad Medicine",
    "source": "https://rockhall.com/inductees/bon-jovi/"
  },
  {
    "question": "Which band recorded “Don’t Stop Believin’”?",
    "answer": "Journey",
    "source": "https://rockhall.com/inductees/journey/"
  },
  {
    "question": "Who recorded “Billie Jean”?",
    "answer": "Michael Jackson",
    "source": "https://rockhall.com/inductees/michael-jackson/"
  },
  {
    "question": "In which decade was Michael Jackson’s album “Thriller” released?",
    "answer": "The 1980s — 1982",
    "source": "https://rockhall.com/inductees/michael-jackson/"
  },
  {
    "question": "Who recorded “Livin’ la Vida Loca”?",
    "answer": "Ricky Martin",
    "source": "https://www.loc.gov/item/prn-22-026/"
  },
  {
    "question": "Which Alicia Keys debut album names a musical key?",
    "answer": "Songs in A Minor",
    "source": "https://www.loc.gov/item/prn-22-026/"
  },
  {
    "question": "Who recorded the 1961 version of “The Christmas Song” added to the National Recording Registry?",
    "answer": "Nat King Cole",
    "source": "https://www.loc.gov/item/prn-22-026/"
  },
  {
    "question": "How many musicians make up a quartet?",
    "answer": "Four"
  },
  {
    "question": "What does a sharp sign do to a musical note?",
    "answer": "Raises it by a half step"
  },
  {
    "question": "What does a flat sign do to a musical note?",
    "answer": "Lowers it by a half step"
  },
  {
    "question": "How many lines are on a standard musical staff?",
    "answer": "Five"
  },
  {
    "question": "Which small, four-stringed instrument is strongly associated with Hawaiian music?",
    "answer": "The ukulele"
  },
  {
    "question": "What device helps a musician keep a steady beat while practicing?",
    "answer": "A metronome"
  }
];
export const musicTrivia = [...originalTrivia.flatMap((question, i) => [question, expandedTrivia[i]]), ...expandedTrivia.slice(originalTrivia.length)];
export function audienceSlots(hasNext: boolean, hasPhotos: boolean, hasHighlight: boolean, promotionCount: number) {
  return [...(hasNext ? ['next'] : []), ...(hasPhotos ? ['photo'] : []), 'trivia', ...(hasHighlight ? ['highlight'] : []), ...Array.from({length: promotionCount}, (_, i) => 'promo:' + i)];
}
