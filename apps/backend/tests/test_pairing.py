import random
from collections import Counter

import pytest

from ungiven_gifts_api.pairing import (
    PairingError,
    assign_recipients,
    assign_restriction_options,
    split_into_groups,
    valid_group_sizes,
)

IDS = [f"p{i}" for i in range(9)]


def _check_permutation(assignment: dict[str, str], ids: list[str]) -> None:
    assert sorted(assignment) == sorted(ids)
    assert sorted(assignment.values()) == sorted(ids)
    assert all(giver != recipient for giver, recipient in assignment.items())


@pytest.mark.parametrize("seed", range(50))
def test_everyone_gives_and_receives_once(seed: int) -> None:
    result = assign_recipients(IDS, lambda g, r: True, random.Random(seed))
    _check_permutation(result, IDS)


@pytest.mark.parametrize("seed", range(50))
def test_respects_exclusions_and_groups(seed: int) -> None:
    rng = random.Random(seed)
    groups = split_into_groups(IDS, 3, rng)  # 9 people -> 3 groups of 3
    forbidden = {frozenset(("p0", "p1")), frozenset(("p2", "p3"))}

    def allowed(g: str, r: str) -> bool:
        return frozenset((g, r)) not in forbidden and groups[g] != groups[r]

    result = assign_recipients(IDS, allowed, rng)
    _check_permutation(result, IDS)
    assert all(allowed(g, r) for g, r in result.items())


def test_draws_vary_between_runs() -> None:
    draws = {
        tuple(sorted(assign_recipients(IDS, lambda g, r: True, random.Random(s)).items()))
        for s in range(20)
    }
    assert len(draws) > 10


def test_impossible_constraints_raise() -> None:
    # p0 may only gift p1 and p2 may only gift p1: no perfect matching.
    def allowed(g: str, r: str) -> bool:
        return r == "p1" if g in ("p0", "p2") else True

    with pytest.raises(PairingError):
        assign_recipients(["p0", "p1", "p2"], allowed, random.Random(0))


def test_valid_group_sizes_only_split_evenly() -> None:
    assert valid_group_sizes(12) == [2, 3, 4, 6]
    assert valid_group_sizes(9) == [3]
    assert valid_group_sizes(7) == []  # prime: no even split
    assert valid_group_sizes(3) == []


def test_groups_are_exactly_the_chosen_size() -> None:
    sizes = Counter(split_into_groups([f"p{i}" for i in range(12)], 4, random.Random(1)).values())
    assert sorted(sizes.values()) == [4, 4, 4]


def test_uneven_group_size_rejected() -> None:
    with pytest.raises(PairingError):
        split_into_groups(IDS, 2, random.Random(0))  # 9 people don't split into pairs


def test_restriction_options_are_distinct_and_spread() -> None:
    restrictions = ["a", "b", "c", "d", "e"]
    options = assign_restriction_options(IDS, restrictions, 2, random.Random(3))
    assert all(len(set(hand)) == 2 for hand in options.values())
    counts = Counter(card for hand in options.values() for card in hand)
    assert max(counts.values()) - min(counts.values()) <= 2


def test_restriction_options_capped_by_available() -> None:
    options = assign_restriction_options(["x", "y"], ["only"], 2, random.Random(0))
    assert options == {"x": ["only"], "y": ["only"]}
