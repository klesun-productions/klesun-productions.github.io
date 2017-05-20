/* collects anime summary - avg. score, avg. attitude, manliness, etc... */
CREATE TABLE trueAnimeList (
	malId INTEGER NOT NULL,
	avgAbsScore FLOAT,
	avgAttitude FLOAT,
	manliness FLOAT,
	feminity FLOAT,
	noScoreRate FLOAT,
	unanymity FLOAT
);

CREATE UNIQUE INDEX Q7Mk7fLLJwcyA2 ON trueAnimeList (malId);
CREATE INDEX RRFx3N4AAC3X5S ON trueAnimeList (manliness);
CREATE INDEX qSBLk6E2NhhnGi ON trueAnimeList (noScoreRate);
CREATE INDEX YyXUTHIZ5azlvN ON trueAnimeList (unanymity);
CREATE INDEX Ck5PveBg1IIEJi ON trueAnimeList (feminity);
CREATE INDEX Q7Mk7fLLJwcyA2njkn ON trueAnimeList (avgAttitude);

INSERT INTO trueAnimeList (
/*#1*/malId,
/*#2*/avgAbsScore,
/*#3*/avgAttitude, 
/*#4*/manliness,
/*#5*/feminity,
/*#6*/noScoreRate,
/*#7*/unanymity
)
SELECT 
/*#1*/ua.malId,
/*#2*/AVG(ua.score),
/*#3*/AVG(ua.score - uc.averageScore), 
/*#4*/COUNT(up.gender = 'Male'),
/*#5*/COUNT(up.gender = 'Female'),
/*#6*/COUNT(ua.score = 0),
/*#7*/-100

FROM mds.userAnime ua
JOIN mds.userCalc uc ON uc.login = ua.login
JOIN mds.userProfile up ON up.login = ua.login
GROUP BY ua.malId
;

/** following code migrates 123kk score records into a separate DB */

CREATE TABLE userAnimeScore (
  userId INTEGER,
  animeId INTEGER,
  score TINYINT,
  lastUpdatedDt INTEGER
);

CREATE UNIQUE INDEX Q7Mk7fLLJwcASyA2 ON userAnimeScore (userId,animeId);
CREATE INDEX Ck5PveBg1IIEJi ON userAnimeScore (lastUpdatedDt);

INSERT OR IGNORE INTO userAnimeScore
(userId, animeId, score, lastUpdatedDt)
SELECT 
userId, animeId, score, strftime('%s', lastUpdatedDt)
FROM mds.userAnimeScore
WHERE rowid < 200000000
;
