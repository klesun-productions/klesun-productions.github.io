
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
    def add_song_rating(params: dict):

        local_config_path = 'unversioned/local.config.json'
        with open(os.path.dirname(__file__) + '/../../' + local_config_path) as f:
            config = json.load(f)

        if not params['verySecurePassword'] == config['verySecurePassword']:
            return None, 'wrongPassword'

        rating = SongRating.get(fileName=params['fileName'])
        postfix = '1' if params['isGood'] else '0'
        if rating is None:
            rating = SongRating(fileName=params['fileName'], rating=postfix)
        else:
            rating.rating += postfix

        classes.DbTables.commit()

        return rating.rating, None

    @staticmethod
    @db_session
    def log_finished(file_name: str, gmai_lLogin: str):
        hit = Listened(fileName=file_name, gmailLogin=gmai_lLogin)
        classes.DbTables.commit()