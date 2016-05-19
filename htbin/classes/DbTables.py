
from datetime import datetime
from pony.orm import Database, Required, Set, db_session
import os.path

# this module contains all Pony ORM models in the project

dirpath = os.path.dirname(os.path.realpath(__file__))

db = Database('sqlite', dirpath + '/../../user_data.db')


class Listened(db.Entity):
    fileName = Required(str)
    dt = Required(datetime, default=datetime.now)
    gmailLogin = Required(str, default='anonymous')


db.generate_mapping(create_tables=True)


def commit(): db.commit()