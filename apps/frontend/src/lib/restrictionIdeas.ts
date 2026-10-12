import type { Restriction } from '@/api/types'

/**
 * The built-in pool behind "Add ideas" on the create page. Organizers pick a random handful and
 * edit them freely. Titles stay short (100 characters at most) and unique; details go in the description.
 */
export const RESTRICTION_IDEAS: Restriction[] = [
  // Sets, art and flavour
  {
    title: 'Set loyalty',
    description: '30 cards (lands or spells) must come from a single set or block, judged by their original printing.',
  },
  { title: "Artist's showcase", description: '20 cards must be illustrated by the same artist.' },
  { title: 'Common thread', description: 'All the art in the deck shares a prominent color, theme or object.' },
  { title: 'Treehugger', description: 'Every card has a tree somewhere in its art, even in the background.' },
  { title: 'Take a seat', description: 'Every card shows someone sitting, or a chair, in its art.' },
  {
    title: 'Magic: The Normal',
    description: 'Everything in the art must be real. No fantasy creatures or magical objects, just the ordinary world.',
  },
  { title: 'Rated E for Everyone', description: 'Nothing violent, evil or mature, in the art or the card names.' },
  {
    title: 'God Almighty',
    description: 'Your commander is a god (or god-like), and every creature looks like it would worship them.',
  },
  {
    title: 'Book or movie',
    description: 'The deck is a tribute to a book or movie, like Dungeon Crawler Carl, Star Wars or Harry Potter.',
  },
  {
    title: "Hardly know 'er",
    description: 'Every card name includes a word ending in "er", so it works as a "hardly know \'er" joke.',
  },
  {
    title: 'Deck of playing cards',
    description:
      'Include 4 kings, 4 queens, 4 jacks and 2 jokers, by name, flavor text or art. Bonus points for a four-color deck with a king, queen and jack in each color.',
  },
  { title: 'Confetti', description: 'Fit in as many colors as possible. Sleeves can be any mix of colors.' },
  { title: 'Few words do trick', description: 'Keep the rules text on every card as short as you can.' },

  // Card types and deck shape
  { title: "Three's a crowd", description: "The deck uses only 3 card types. Lands, supertypes and subtypes don't count." },
  {
    title: 'Type limit',
    description: 'No more than 12 cards of any one card type (lands excluded). Cards with several types count toward each.',
  },
  { title: 'Majority rules', description: 'At least half the deck is one card type.' },
  { title: 'The curve is a line', description: 'Your mana curve is a straight line, rising from one, falling, or flat.' },
  {
    title: 'Mana diet',
    description:
      'The mana values of the whole deck add up to less than 150. No X spells. Cards with more than one mana cost (rooms, double-faced cards) count all of them.',
  },
  { title: "Noah's Ark", description: 'No more than 2 creatures share any one creature type.' },
  { title: "Noah's Ark, strict", description: 'Every creature type in the deck appears on exactly 2 cards.' },

  // Commanders
  { title: 'One-drop commander', description: 'Your commander costs 1 mana or less. Two legal commanders cost 0.' },
  {
    title: 'Off the beaten path',
    description: 'Your commander is not one of the most popular on EDHREC. Agree on a cutoff first, such as the top 100.',
  },
  { title: 'Custom commander', description: 'Design your own commander card. Keep it fair, and the funnier the better.' },
  {
    title: 'Swap commander',
    description:
      'Include two other legendary creatures in the 99 that can each take over the command zone and change the strategy completely.',
  },
  { title: 'No other legends', description: 'No legendary cards except your commander.' },

  // Rarity
  {
    title: 'Pauper EDH',
    description:
      'An uncommon creature as your commander and only commons in the 99. Bonus points if it is also regular Commander legal, or a legal commander in the deck can be swapped in.',
  },

  // Mechanics and strategy
  {
    title: 'Reminder card',
    description:
      'Build around something with a reminder card, like the Monarch, the Ring, the Initiative, emblems, or energy, poison or rad counters.',
  },
  { title: 'Lands matter', description: 'Build around lands, but no landfall.' },
  {
    title: "Secret Santa's gift bag",
    description: 'Run group hug, monarch, initiative or voting. Shower the table with gifts while quietly setting up your win.',
  },
  {
    title: 'Win without damage',
    description: 'Alternate win cards, poison, mill, or making opponents lose. Anything but damage.',
  },
  { title: 'Counter culture', description: 'Use at least 3 kinds of counters, but no +1/+1 counters.' },
  { title: 'Token collector', description: 'Make at least 10 different tokens, each represented by a physical object.' },
  { title: 'Gamba', description: 'The deck is built around gambling. Coin flips, dice and random effects.' },
  { title: 'No shuffling', description: 'Nothing in the deck shuffles your library, and green must be one of your colors.' },

  // Companions
  { title: 'Companion', description: 'Run a companion and follow its deckbuilding restriction.' },
  {
    title: 'Companion in spirit',
    description: "Follow a companion's deckbuilding restriction without running the companion.",
  },

  // Arts and crafts
  { title: 'Arts and crafts', description: "Hand-draw any card you don't own over a bulk card." },
  { title: 'Showpieces', description: 'Hand-draw over your 5 most expensive cards, so they get the most love.' },
]
