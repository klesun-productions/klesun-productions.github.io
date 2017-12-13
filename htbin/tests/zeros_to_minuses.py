
from pony.orm import db_session, select
import classes
from classes.DbTables import SongRating

# updates song rating records in db - replaces "1" with "+" and "0" with "-"
# it will be more logical, since what now zero represents is _negative_ rating, not it's absence
@db_session
def main():
    for rating in select(r for r in SongRating):
        rating.rating = rating.rating.replace('1', '+').replace('0', '-')

    classes.DbTables.commit()

main()