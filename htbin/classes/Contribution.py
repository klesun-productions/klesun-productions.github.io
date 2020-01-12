
# This class provides some functions to write to db input from users
from pony.orm import select, db_session
import classes
from classes.DbTables import Listened, SongRating, SongYoutubeLink, StarveGameScore
from collections import defaultdict


class Contribution(object):

    @staticmethod
    @db_session
    def add_song_rating(params: dict) -> str:

        rating = SongRating.get(fileName=params['fileName']) \
            or SongRating(fileName=params['fileName'])

        rating.rating += '+' if params['isGood'] else '-'

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
    def link_youtube_links(params: dict) -> int:
        link = None
        for link in params['links']:
            youtubeId, viewCount = link
            linkLink = SongYoutubeLink(
                fileName=params['fileName'],
                youtubeId=link['youtubeId'],
                viewCount=link['viewCount'],
                videoName=link['videoName']
            )
        classes.DbTables.commit()

        return linkLink.id

    @staticmethod
    @db_session
    def get_youtube_links(params: dict) -> defaultdict:
        result = defaultdict(list)
        for rec in select(rec for rec in SongYoutubeLink):
            result[rec.fileName].append({
                "youtubeId": rec.youtubeId,
                "viewCount": rec.viewCount,
            })

        # sorting by views and
        for song_name, links in result.items():
            result[song_name] = links

        return result

    @staticmethod
    @db_session
    def log_finished(file_name: str, gmai_lLogin: str):
        hit = Listened(fileName=file_name, gmailLogin=gmai_lLogin)
        classes.DbTables.commit()

    @staticmethod
    @db_session
    def submit_starve_game_score(params: dict):
        row = StarveGameScore(
            playerName=params['playerName'],
            score=len(params['guessedWords']),
            guessedWords=','.join(params['guessedWords'])
        )

        classes.DbTables.commit()

        return {'status': 'written', 'rowid': row.rowid}

    @staticmethod
    @db_session
    def get_starve_game_high_scores(params: dict) -> defaultdict:
        return list(rec.to_dict() for rec in select(rec for rec in StarveGameScore))