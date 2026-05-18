-- Schul-Beispieldatenbank für SQL-Lernübungen
CREATE TABLE schueler (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  klasse TEXT NOT NULL
);

CREATE TABLE kurse (
  id INTEGER PRIMARY KEY,
  titel TEXT NOT NULL,
  fach TEXT NOT NULL
);

CREATE TABLE noten (
  id INTEGER PRIMARY KEY,
  schueler_id INTEGER NOT NULL,
  kurs_id INTEGER NOT NULL,
  note REAL NOT NULL,
  FOREIGN KEY (schueler_id) REFERENCES schueler(id),
  FOREIGN KEY (kurs_id) REFERENCES kurse(id)
);

INSERT INTO schueler (id, name, klasse) VALUES
  (1, 'Anna Müller', '10a'),
  (2, 'Ben Schmidt', '10a'),
  (3, 'Clara Weber', '10b');

INSERT INTO kurse (id, titel, fach) VALUES
  (1, 'Mathematik Grundlagen', 'Mathe'),
  (2, 'Deutsch Literatur', 'Deutsch'),
  (3, 'Informatik Einführung', 'Informatik');

INSERT INTO noten (id, schueler_id, kurs_id, note) VALUES
  (1, 1, 1, 2.0),
  (2, 1, 2, 1.7),
  (3, 2, 1, 2.3),
  (4, 2, 3, 1.0),
  (5, 3, 2, 2.7),
  (6, 3, 3, 1.3);
