import random as rand
import traci


def percent(p=1):
    if p < 0 or p > 1:
        raise ValueError('"reroutingPercent" needs to be between 0 and 1 (inclusive)')
    x = rand.random()
    return x < p


def random():
    return percent(0.5)
