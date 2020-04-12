import random as rand
import traci

def percentage(p=1):
  x = rand.random()
  return x <= p

def random():
  x = rand.random()
  return x <= 0.5