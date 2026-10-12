"""Secret santa assignment: who gifts whom, groups, and restriction options.

Assigning recipients is a perfect matching problem on a bipartite graph of
givers -> receivers, where an edge exists when that gift is allowed (not yourself,
not an excluded pair, not someone in your own group). We find a random perfect
matching with Kuhn's augmenting-path algorithm over shuffled adjacency lists.
"""

import random
from collections.abc import Callable, Sequence


class PairingError(ValueError):
    """Raised when the constraints leave no valid way to assign everyone."""


def valid_group_sizes(participant_count: int) -> list[int]:
    """Group sizes that split everyone evenly into at least two groups.

    A size of 1 is excluded (nobody to talk to), and anything above half the
    headcount would leave a single group with nobody outside it to gift.
    """
    return [size for size in range(2, participant_count // 2 + 1) if participant_count % size == 0]


def split_into_groups(ids: Sequence[str], size: int, rng: random.Random) -> dict[str, str]:
    """Randomly split participants into groups of exactly `size` people."""
    if size not in valid_group_sizes(len(ids)):
        raise PairingError(f"{len(ids)} participants can't be split evenly into groups of {size}.")
    shuffled = list(ids)
    rng.shuffle(shuffled)
    return {pid: f"Group {i // size + 1}" for i, pid in enumerate(shuffled)}


def assign_recipients(
    ids: Sequence[str],
    is_allowed: Callable[[str, str], bool],
    rng: random.Random,
    describe: Callable[[str], str] = str,
) -> dict[str, str]:
    """Return a giver -> recipient mapping where every participant gives and receives once.

    `describe` turns an id into a human-readable name for error messages.
    """
    if len(ids) < 2:
        raise PairingError("Secret santa needs at least 2 participants.")

    options: dict[str, list[str]] = {}
    for giver in ids:
        allowed = [r for r in ids if r != giver and is_allowed(giver, r)]
        if not allowed:
            raise PairingError(f"There is nobody {describe(giver)} is allowed to gift to.")
        rng.shuffle(allowed)
        options[giver] = allowed

    giver_of: dict[str, str] = {}

    def augment(giver: str, seen: set[str]) -> bool:
        for recipient in options[giver]:
            if recipient in seen:
                continue
            seen.add(recipient)
            current = giver_of.get(recipient)
            if current is None or augment(current, seen):
                giver_of[recipient] = giver
                return True
        return False

    givers = list(ids)
    rng.shuffle(givers)
    for giver in givers:
        if not augment(giver, set()):
            raise PairingError(
                "The exclusions and groups make it impossible to give everyone a recipient. "
                "Try removing some exclusions or using fewer groups."
            )

    return {giver: recipient for recipient, giver in giver_of.items()}


def assign_restriction_options(
    ids: Sequence[str], restrictions: Sequence[str], per_participant: int, rng: random.Random
) -> dict[str, list[str]]:
    """Give each participant `per_participant` distinct restrictions to pick from.

    Restrictions are dealt from a reshuffled deck so each one shows up a similar
    number of times across the event instead of clumping.
    """
    if not restrictions:
        return {pid: [] for pid in ids}
    k = min(per_participant, len(restrictions))
    deck: list[str] = []
    result: dict[str, list[str]] = {}
    for pid in ids:
        hand: list[str] = []
        while len(hand) < k:
            playable = [i for i, card in enumerate(deck) if card not in hand]
            if not playable:
                deck = list(restrictions)
                rng.shuffle(deck)
                continue
            hand.append(deck.pop(playable[-1]))
        result[pid] = hand
    return result
