
from datetime import datetime
from pony.orm import Database, Required, Set, db_session, Optional
import os.path

# this module contains all Pony ORM models in the project

dirpath = os.path.dirname(__file__)

root = dirpath + '/../../';
db = Database('sqlite', root + '/Dropbox/web/user_data.db')


class Listened(db.Entity):
    fileName = Required(str)
    dt = Required(datetime, default=datetime.now)
    gmailLogin = Required(str, default='anonymous')


class SongRating(db.Entity):
    fileName = Required(str)
    rating = Optional(str, default='')


class StarveGameScore(db.Entity):
    rowid = Optional(int)
    playerName = Required(str)
    score = Required(int)
    guessedWords = Optional(str)


class SongYoutubeLink(db.Entity):
    fileName = Required(str)
    youtubeId = Required(str, 11)
    viewCount = Required(int)


db.generate_mapping(create_tables=True)


def commit(): db.commit()