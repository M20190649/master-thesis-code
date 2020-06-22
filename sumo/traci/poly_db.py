import os, glob, re
import sqlite3

attributes = [
    {"name": "id", "type": "TEXT",},
    {"name": "zone", "type": "INTEGER"},
    {"name": "timestep", "type": "TEXT"},
    {"name": "type", "type": "TEXT"},
    {"name": "color", "type": "TEXT"},
    {"name": "layer", "type": "INTEGER"},
    {"name": "shape", "type": "TEXT"},
    {"name": "edges", "type": "TEXT"},
]

db = None


def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def find_db(directory):
    files = glob.iglob(directory + "**/**", recursive=True)
    db_path = next(
        (f for f in files if re.search(".*(sqlite|sqlite3|db|db3)$", f)), None
    )
    return db_path


def connect(path):
    global db
    db = sqlite3.connect(path, 30)
    db.row_factory = dict_factory


def close():
    db.close()


def execute(sql):
    cursor = db.execute(sql)
    db.commit()
    return cursor


def create_table():
    table_string = ", ".join(
        list(map(lambda attrib: f"{attrib['name']} {attrib['type']}", attributes))
    )
    execute(f"CREATE TABLE IF NOT EXISTS polygons ({table_string})")


def drop_table():
    execute("DROP TABLE IF EXISTS polygons")


def insert(polygon):
    values = [f"'{polygon[attrib['name']]}'" for attrib in attributes]
    execute(f"INSERT INTO polygons VALUES ({', '.join(values)})")


def get_all():
    cursor = execute(f"SELECT * FROM polygons")
    polygons = cursor.fetchall()
    return polygons


def get_all_from_timestep(timestep):
    cursor = execute(f"SELECT * FROM polygons WHERE timestep='{timestep}'")
    polygons = cursor.fetchall()
    return polygons

