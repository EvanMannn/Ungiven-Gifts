/**
 * The built-in pool behind "Add ideas" on the create page. Organizers pick a random handful and
 * edit them freely. Keep each under 300 characters (the API's limit for a restriction).
 */
export const RESTRICTION_IDEAS = [
  // Sets, art and flavour
  'Set loyalty: 30 cards (lands or spells) must come from a single set or block, judged by their original printing.',
  "Artist's showcase: 20 cards must be illustrated by the same artist.",
  'Common thread: all the art in the deck shares a prominent color, theme or object.',
  'Treehugger: every card has a tree somewhere in its art, even in the background.',
  'Take a seat: every card shows someone sitting, or a chair, in its art.',
  'Magic: The Normal: everything in the art must be real. No fantasy creatures or magical objects, just the ordinary world.',
  'Rated E for Everyone: nothing violent, evil or mature, in the art or the card names.',
  'God Almighty: your commander is a god (or god-like), and every creature looks like it would worship them.',
  'Book or movie: the deck is a tribute to a book or movie, like Dungeon Crawler Carl, Star Wars or Harry Potter.',
  "Hardly know 'er: every card name includes a word ending in \"er\", so it works as a \"hardly know 'er\" joke.",
  'Deck of playing cards: include 4 kings, 4 queens, 4 jacks and 2 jokers, by name, flavor text or art. Bonus points for a four-color deck with a king, queen and jack in each color.',
  'Confetti: fit in as many colors as possible. Sleeves can be any mix of colors.',
  'Few words do trick: keep the rules text on every card as short as you can.',

  // Card types and deck shape
  "Three's a crowd: the deck uses only 3 card types. Lands, supertypes and subtypes don't count.",
  'Spread it out: no more than 12 cards of any one card type (lands excluded). Cards with several types count toward each.',
  'Majority rules: at least half the deck is one card type.',
  'The curve is a line: your mana curve is a straight line, rising from one, falling, or flat.',
  'Mana diet: the mana values of the whole deck add up to less than 150. No X spells. Cards with more than one mana cost (rooms, double-faced cards) count all of them.',
  "Noah's Ark: no more than 2 creatures share any one creature type.",
  "Noah's Ark, strict: every creature type in the deck appears on exactly 2 cards.",

  // Commanders
  'Cheap date: your commander costs 1 mana or less. Two legal commanders cost 0.',
  'Off the beaten path: your commander is not one of the most popular on EDHREC. Agree on a cutoff first, such as the top 100.',
  'Custom commander: design your own commander card. Keep it fair, and the funnier the better.',
  'Swap commander: include two other legendary creatures in the 99 that can each take over the command zone and change the strategy completely.',
  'No other legends: no legendary cards except your commander.',

  // Rarity
  'Pauper EDH: an uncommon creature as your commander and only commons in the 99. Bonus points if it is also regular Commander legal, or a legal commander in the deck can be swapped in.',

  // Mechanics and strategy
  'Reminder card: build around something with a reminder card, like the Monarch, the Ring, the Initiative, emblems, or energy, poison or rad counters.',
  'Lands matter, but no landfall.',
  "Secret Santa's gift bag: run group hug, monarch, initiative or voting. Shower the table with gifts while quietly setting up your win.",
  'Win without damage: alternate win cards, poison, mill, or making opponents lose. Anything but damage.',
  'Counter culture: use at least 3 kinds of counters, but no +1/+1 counters.',
  'Token collector: make at least 10 different tokens, each represented by a physical object.',
  'Gamba: the deck is built around gambling. Coin flips, dice and random effects.',
  'No shuffling: nothing in the deck shuffles your library, and green must be one of your colors.',

  // Companions
  'Companion: run a companion and follow its deckbuilding restriction.',
  "Companion in spirit: follow a companion's deckbuilding restriction without running the companion.",

  // Arts and crafts
  "Arts and crafts: hand-draw any card you don't own over a bulk card.",
  'Showpieces: hand-draw over your 5 most expensive cards, so they get the most love.',
]
