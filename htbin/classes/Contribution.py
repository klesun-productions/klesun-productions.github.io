
# This class provides some functions to write to db input from users
import json
import os
import sys
from pony.orm import db_session
import classes
from classes.DbTables import Listened, SongRating


class Contribution(object):

    @staticmethod
    @db_session
    def add_song_rating(params: dict) -> str:

        rating = SongRating.get(fileName=params['fileName']) \
            or SongRating(fileName=params['fileName'])

        rating.rating += '1' if params['isGood'] else '0'

        classes.DbTables.commit()

        return rating.rating

    @staticmethod
    @db_session
    def undo_song_rating(params: dict) -> str:
        rating = SongRating.get(fileName=params['fileName']) \
            or SongRating(fileName=params['fileName'])
        rating.rating = rating.rating[:-1]
        classes.DbTables.commit()

        return rating.rating

    @staticmethod
    @db_session
    def log_finished(file_name: str, gmai_lLogin: str):
        hit = Listened(fileName=file_name, gmailLogin=gmai_lLogin)
        classes.DbTables.commit()