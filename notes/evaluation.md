# Meeting 03.06.2020

## Grundlegende Forschungsfragen

* Was sind die Einnahmen pro Tag?

* Was sind die durchschnittlichen Kosten pro Fahrer pro Tag?

* Was sind die durchschnittlichen Kosten abhängig von der Distanz?

  * Kurze Fahrten sind wahrscheinlich teurer als lange Fahrten

  * Lang = von aussen nach innen?

* Was sind die Charakteristischen Eigenschaften vom Mobilitätsmodell?

  * In der Evaluation erwähnen als Vergleichswerte

  * Durchschnittliche Länge

  * Durchschnittliche Fahrdauer

  * Anzahl Fahrten insgesamt

  * Anzahl Fahrten pro Person

  * Typische Rush Hour Zeiten bzw. Wieviele Auto sind gerade unterwegs (Stundenintervall)

  * Bbox für Berlin = kleiner Fehler

  * Einfluss auf Anwendbarkeit für andere Städte

  * 10% sind repräsentativ für gesamte Bevölkerung (und dauert nicht so lang wie 100%)

  * Annahme: Mobilitätsmodell ist richtig

  * Annahme: Personen nehmen immer den zeitlich kürzesten Weg

* Welche Implikation haben die Umwege auf den Gesamtverkehr?

## Simulationsparameter

* Tag

  * **3-4 Tage von guter Luft bis schlechter Luft**

  * Jeweils ein Tag der repräsentativ für eine bestimmte generelle Luftsituation ist

  * Was ist schlecht? Was ist gut?

  * Wochentag (immer ein Montag) + Datum festhalten

* Zonen

  * **Einmal festlegen anhand von Richtlinien**

* Zone Update Intervall

  * **Einmal Festlegen und für die meisten Simulationen beibehalten**

  * Festmachen anhand Länge/Dauer der durchschnittliche Fahrt?

  * 60 Minuten ist eigentlich viel zu lang

  * Kurze Intervalle damit Daten immer aktuell sind

* Snapshot

  * **Eher nein**

  * Erhöht zwar "Abschätzbarkeit" des Preises für Fahrer, aber…

  * 1. Personen bzw. die App können eine Schätzung auch aus der Vergangenheit ableiten (An einem Montag im November gibts typischerweise diese und jene Verschmutzung/Zone und eine Fahrt wird wahrscheinlich X € Kosten)

  * 2. Die meisten Fahrer interessieren sich eh nicht exakt genau wie der Preis berechnet wird

  * Es wird immer für die aktuellste Luftverschmutzung bezahlt

* Statisch vs. Dynamisches Rerouting

  * **Einmalig festlegen ob statisch oder dynamisch oder hybrid!**

  * Argumentieren was am realistischsten ist

  * Eventuell Hybridansatz aus beidem

* Rerouting Percent

  * **Mehrere Prozentwerte ausprobieren und Einfluss auf den Traffic in Zahlen darstellen**

* Reroute on Zone Update

  * **Entweder immer an oder immer aus**

  * Vielleicht eine Simulation zum Vergleich ob es eine Auswirkung auf den Traffic hat

* Non-depart

  * **Immer aus (0 %)**

  * Eine Simulation zum Vergleich welchen Effekt das auf den Traffic hat

  * Wird eh nur besser und ein Wert ist schwer zu begründen

* 1 Simulation extrem dynamisch (z.B. Updateintervall auf 5 Minuten und 30 Zonen)

## Pricing

* Zone Price (Base price)

  * Zone 1 = 1 Geld

  * Zone 2 = 2 Geld

  * 3 Varianten:

    * Direkt Proportional zu den Grenzwerten

    * Überproportional zu Grenzwerten

    * Unterproportional zu Grenzwerten

  * Schaden am Körper ist aber wahrscheinlich nicht linear => Preis sollte auch nicht linear sein

  * Wir ändern nur die Relation der Preise von den Zonen

  * Muss einmal für jede Zone festgelegt werden, der Rest ändert sich

* Road Price (Change to base price)

* Wir sagen es gibt zwei unterschiedliche Straßentypen

  * 2 Varianten:

    * Kostet gleich viel

    * Kostet unterschiedlich

* Relation zwischen Main und Residential

* 3 Varianten

  * Residential kostet (Zone - 1)

  * Residential kostet X

  * Residential kostet (Zone + 1)

* Emissions Price (Change to base price)

  * Annahme: Direkt Proportional zum Verschmutzungsgrad

  * Doppelte Verschmutzung = doppelter Preis

## Evaluation

* Sensordichte beschreiben

* Sensornetzwerk beschreiben

* Mean additional distance IN RELATION to complete distance

* Mean distance comparison for ALL VEHICLES / REROUTED / NON-REROUTES

## Other

* Erklären wie das MATSim Berlin Demand Modell generiert wird (Related Work)

* Ist Demand Model für Wochentag oder Wochenende?

* Ist das Demand Modell wirklich gut?

  * Es imitiert vielleicht echten Traffic Count an bestimmten Straßen, aber sind die Länge der Fahrten und Start/Endpunkte wirklich realitätsgetreu?

  * Vielleicht sind es ja nur ganz viele kurze Fahrten die zwar den Traffic imitieren, aber eben nicht die tatsächliche Pendlerbewegung nachmachen.

* Erwähnen, dass es bereit mit grüner Plakette eine Einschränkung für sehr schlimme Fahrzeuge in der Innenstadt gibt
