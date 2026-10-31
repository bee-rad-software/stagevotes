const lines:Record<string,readonly string[]>={
 halloween:[
  'NOW HAUNTING THE STAGE',
  'A LITTLE BOO. A LOT OF YOU.',
  'TRICK OR TREAT… DROP THE BEAT!',
  'TIME TO RAISE SOME SPIRITS',
  'ALL FANGS POINT TO THE STAGE',
  'THE MIC IS UNDER YOUR SPELL',
  'SOMETHING WICKED GOOD IS NEXT',
  'GIVE THEM PUMPKIN TO TALK ABOUT',
 ],
 classic:[
  'YOUR MOMENT. YOUR MIC.',
  'MAKE SOME NOISE FOR…',
  'THE SPOTLIGHT IS YOURS',
  'LET’S HEAR WHAT YOU’VE GOT',
  'ONE MIC. ALL YOU.',
  'TURN IT UP. SING IT OUT.',
  'THE NEXT BIG MOMENT STARTS HERE',
  'GOOD COMPANY. GREAT CHORUS.',
 ],
 neon:[
  'YOUR TIME TO GLOW',
  'LIGHTS UP. MIC ON.',
  'BRING THE NEON ENERGY',
  'TURN THE NIGHT UP',
  'THE SPOTLIGHT FOUND YOU',
  'BIG LIGHTS. BIG CHORUS.',
 ],
 country:[
  'STEP ON UP, Y’ALL',
  'GIVE ’EM SOMETHING TO SING ABOUT',
  'YOUR TURN TO OWN THIS HONKY-TONK',
  'BOOTS READY. MIC STEADY.',
  'LET’S HEAR THAT COUNTRY SOUL',
  'A LITTLE TWANG. A BIG MOMENT.',
 ],
 holiday:[
  'LET YOUR VOICE SHINE',
  'SLEIGH THAT SONG',
  'MAKE SOME MERRY NOISE',
  'ALL WRAPPED UP IN THE MUSIC',
  'YOUR TURN TO SPARKLE',
  'BRING ON THE HOLIDAY CHEER',
 ],
};
export function stageEntranceLine(theme:string,turn:number):string {
 const choices=lines[theme]||lines.classic;
 return choices[((Math.floor(turn)%choices.length)+choices.length)%choices.length];
}
