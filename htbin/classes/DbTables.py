
from datetime import datetime
from pony.orm import Database, Required, Set, db_session, Optional
import os.path

# this module contains all Pony ORM models in the project

dirpath = os.path.dirname(__file__)

db = Database('sqlite', dirpath + '/../../unversioned/user_data.db')


class Listened(db.Entity):
    fileName = Required(str)
    dt = Required(datetime, default=datetime.now)
    gmailLogin = Required(str, default='anonymous')


class SongRating(db.Entity):
    fileName = Required(str)
    rating = Optional(str, default='')


db.generate_mapping(create_tables=True)


def commit(): db.commit()