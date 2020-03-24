import random as rand
import traci

def percentage(vid, p):
  x = rand.random()
  return x <= p

def random(vid):
  x = rand.random()
  return x <= 0.5