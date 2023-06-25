
[//]: # (You can look at rendered version of this document at https://github.com/klesun/midiana.lv/blob/master/entry/public_personal/artur_klesun_cv.md)

<table><tr>
	<td>Artur Klesun, a Backend Developer

<a href="https://github.com/klesun/trilemma.online">node.js</a> |
<a href="https://github.com/klesun/riddle-needle">C#</a> |
<a href="https://github.com/klesun/hardsub-ocr-by-font">Rust</a> |
<a href="https://github.com/klesun/deep-assoc-completion">Java</a> |
<a href="https://github.com/klesun/deep-js-completion">Scala</a> |
<a href="https://github.com/klesun/midiana.lv/tree/master/htbin">Python</a> |
<a href="https://github.com/klesun/green-envy-xmas-defense">Lua</a><br/>
(programming for life for 9+ years)

<a href="https://github.com/klesun?tab=repositories&q=&type=&language=&sort=stargazers">github.com/klesun</a><br/>
(~374 stars)

<a href="https://stackoverflow.com/users/2750743/artur-klesun">stackoverflow.com/users/2750743/klesun</a><br/>
(12,093 reputation)

<a href="https://klesun.net/entry/">klesun.net</a> | arturklesun@gmail.com<br/>
(Best quality in best time)
	</td>
	<td><img src="https://user-images.githubusercontent.com/5202330/152647058-0590a18a-ba7c-4c2b-8456-3e1b0649f600.png" align="right" height="300"/></td>
</tr></table>

 Work Experience
----------------

- 2021 - present<br><br/>
    Back to [Blockchain Cuties](http://blockchaincuties.com/) ^_^

- 2020 - 2021<br/><br/>
    Software Developer at [Parsiq](https://parsiq.net/) blockchain events monitoring system<br/>
        
	I was mostly involved in development of the ParsiQL language: helping in designing language syntax and semantics, implementing compiler, runtime engine, etc... I also wrote some code for UX for the in-browser IDE, like code completion.
	
- 2019 - 2020<br/><br/>
    Full Stack developer at [Blockchain Cuties](http://blockchaincuties.com/) gacha-like [dapp](https://en.wikipedia.org/wiki/Decentralized_application) web game.<br/>
	
	This was a short, but an enjoyable experience with really cool teammates and a lot of blockchain-related work. Long story short, the idea of the project was that content players create (through so-called [genome breeding](https://wiki.blockchaincuties.com/Attributes)) is stored on blockchain [smart contracts](https://en.wikipedia.org/wiki/Smart_contract) as [Non-Fungible Tokens](https://en.wikipedia.org/wiki/Non-fungible_token). The intent was to give player "true" ownership over the character: it could be transferred outside of the game - traded on independent resources like [OpenSea](https://opensea.io/).

	In this project I was primarily oriented towards writing the server code. I did various game mechanics like tournaments, game market, crafting. Did a lot of optimisation, test coverage and just improved the quality of the code left from previous maintaners. The greatest success was finding a query with sub-selects that constantly caused 100% db CPU load for months, before I fixed it, we had to restart the server every few days because game became unplayable.
	
	Among blockchain-related tasks I had, the one most worth mentioning is integrating our game with [Samsung Blockchain Keystore](https://developer.samsung.com/blockchain/keystore/understanding-keystore/keystore-introduction.html) Hardware Wallet in [this](https://galaxystore.samsung.com/detail/com.wecangames.blockchaincutiesuniverse) android apk for [Tron](https://en.wikipedia.org/wiki/TRON_(cryptocurrency)) blockchain. The task involved quite an amount of research, generating raw blockchain transaction, finding the right hashing algorithm, messing with protobuf - the documentation was scarce, but we made it.
	
	One unique thing I got at this job was the ability to talk directly to our users, via public chat - [t.me/blockchaincuties_en](https://t.me/blockchaincuties_en) listening to their feedback and bug reports and reacting right away. You may drop there and ask whether Klesun was a cool dude, I think many of the people there will say "yes" ;)

- 2014 - 2019 (5 years)<br/><br/>
    Backend Developer at [ASAP Tickets](https://www.asaptickets.com/) travel agency.<br/>
    [GDS](https://en.wikipedia.org/wiki/Global_distribution_system) integration department.
    
    I created and maintained a node.js project that connected to different distribution systems, like
    [Galileo (United Airlines)](https://en.wikipedia.org/wiki/Galileo_GDS), 
    [Sabre (American Airlines)](https://www.sabre.com/about/), 
    [Amadeus](http://www.amadeus.com/web/amadeus/ru_1A-corporate/Hotels/Our-portfolio/Connect/Distribute-&-sell-through-more-channels/Hotels_Product_AmadeusGDS/1319572127006-Solution_C-AMAD_ProductDetailPpal-1319578304458?industrySegment=1259068355773&level2=1319608960115&level3=1319610649867), 
    [Hertz](https://www.hertz.com/rentacar/reservation/), 
    [Delpaso](https://www.delpasocarhire.com/), 
    etc... usually via [SOAP XML](https://en.wikipedia.org/wiki/SOAP) protocol and did various fin tech automatizations through these systems.

    The aim of the project was to make life of travel agents easier.
    I gave them a single terminal GUI that provided access to all systems we supported 
    at once unifying them into single syntax. That involved airline terminal text parsing; arranging 
    hundreds cron jobs for parallel data processing with [Redis](https://redis.io/); implementing various interesting ideas our travel business guys 
    request... Most of the code was always covered with [mocha](https://github.com/mochajs/mocha) tests.
    My job also involved 
    developing frontend stuff occasionally.

    In years of co-operation with my colleagues I learned both good practices and how not to not repeat their mistakes.
    I write clean code, keeping files small, yet not too numerous, making commits atomic,
    delivering basic functionality quickly and extending it according to client wishes after they have something to click...<br/>
    <br/>
    If you track history of ITN, you could tell that the 2014 was the start a golden age for 
    this company. Before I started developing it, it was just a relatively small travel agency. 
    Now it shows on the first pages in google and has [mostly very positive ratings by customers](https://www.trustpilot.com/review/www.asaptickets.com).


 Skills
--------
Languages:
- English: technical fluent
- Russian: fluent
- ECMAScript: native
- Latvian: average

Programming:
- I don't consider that programmer is defined by a particular language, an experienced programmer can master any new language syntax and specifics within a week, but just for the sake of numbers:
  - Highly profficient (at least 70k lines of code each) in: [typescript](https://github.com/klesun/ts-browser)/[node.js](https://github.com/klesun/kunkka-tor.rent), [Java](https://github.com/klesun/deep-assoc-completion)
  - Actively worked (at least 10k lines of code each) with: [C#](https://github.com/klesun/iron-ladybug), [Scala](https://github.com/klesun/deep-js-completion), [Python](https://github.com/klesun/deep-dict-completion), [Lua](https://github.com/klesun/green-envy-xmas-defense), [Rust](https://github.com/klesun/hardsub-ocr-by-font), [PHP](https://asaptickets.com/)
(see "[Personal Projects](#user-content-personal-projects)" below)
- Worked a lot with different SQL databases, messaging queues (RabbitMQ, ActiveMQ) and Redis, had opportunities to experience firsthand the impact of my optimizations on the databases with billions of
records, some of my tweaks resulted in 100x reduction of database load from particular operations and reduced overall server load several times.
- Capable of setting up and maintaining a [Unix sever](https://klesun.net) on either node.js, Nginx or Apache, around 7 years of experience of devopsing personal projects. In later years migrated some of the projects to Google Cloud and AWS through Kubernetes.
- Academically familiar with: C, C++, Pascal
- I'm really good with recursive algorithms. I wrote [this](https://github.com/klesun/Progmeistars_tasks/tree/master/Sem5_PointersRecursions_Vlad/e11) in 2012 and the state of art [this](https://github.com/klesun/deep-assoc-completion/blob/master/src/org/klesun/deep_assoc_completion/resolvers/DirectTypeResolver.java) in 2018. And I only get better ever since.

I take big pride in the quality of the products I develop and I take as a must for a developer to fully comprehend the consequences of every line of code in their application.

I'm a fanatic about efficiency, strict typing and pure functional programming because that's obviously the clean and beautiful way to code.

 Public Projects I Authored
-------------------
<table>
  <tr>
    <td>
<h3><a href="https://plugins.jetbrains.com/plugin/9927-deep-assoc-completion">deep-assoc-completion</a></h3>
An <a href="https://www.jetbrains.com/idea/">Intellij IDEA</a> plugin that adds type inference based completion in PHP code.<br/>
<a href="https://plugins.jetbrains.com/plugin/9927-deep-assoc-completion">5000+</a> active users currently, 4.9 rating, 31 reviews.<br/>
Written in Java. <a href="https://github.com/klesun/deep-assoc-completion">Source Code</a><br/>

<img src="https://raw.githubusercontent.com/klesun/deep-assoc-completion/274b5054ab65ecd23d51d1ab405c646d2988c589/resources/META-INF/pluginIcon.svg"/>
</td>
    <td><img src="https://raw.githubusercontent.com/klesun/phpstorm-deep-keys/master/imgs/screenshot.png"/></td>
  </tr>
</table>

<table>
  <tr>
    <td>
<h3><a href="https://github.com/klesun/ts-browser">ts-browser</a></h3>
	    
<a href="https://www.typescriptlang.org/">Typescript</a> on-the-fly compilation runtime
<a href="https://github.com/klesun/ts-browser">Source Code</a>

<img src="https://raw.githubusercontent.com/klesun/ts-browser/master/docs/ts-browser.svg"/>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>
<h3><a href="https://github.com/klesun/trilem.me">trilem.me</a></h3>

A trigonal tile turn-based multiplayer game somewhat inspired by civ 5. Server on nodejs, with web sockets: nice and responsive.
<a href="https://github.com/klesun/trilem.me">Source Code</a>

<img src="https://raw.githubusercontent.com/klesun/trilem.me/master/favicon.ico"/>
    </td>
    <td><img src="https://user-images.githubusercontent.com/5202330/93859827-d37b0380-fcc6-11ea-8523-b00a4566f770.png"/></td>
  </tr>
</table>

<table>
  <tr>
    <td>
	    
### [vn-translation-tools](https://github.com/klesun/muramasa-vn-translation)
A set of text-analysis tools for semi-automatic translation of japanese [visual novels](https://www.youtube.com/watch?v=w0ddsF5r1TI&list=PLFvE9Kp-Kt12zJkrRm5vAEPXU-cpi9WHR) and [manga](https://mangatoto.com/user/870835/klesun) with tight use of machine learning for OCR and contextual MTL

Using these tools we translated:
- a full walkthrough of the [Soukou Akki Muramasa](https://github.com/klesun/muramasa-vn-translation) visual novel (70 hours read)
- a full walkthrough of the [Kusarihime](https://github.com/klesun/kusarihime-translation) visual novel (16 hours read)
- 15 out of 20 volumes of the [Honto ni Atta! Reibai Sensei](https://github.com/klesun/reibai-sensei-translation) 4-coma manga
    </td>
    <td><img src="https://github.com/klesun-productions/klesun-productions.github.io/assets/5202330/cee2cbf0-b593-4590-8d3c-718f4529b931"/></td>
  </tr>
</table>

<table>
  <tr>
    <td>

### [midiana](https://klesun.net/entry/midiana/)
A webapp to compose sheet music using either a [MIDI-keyboard](https://developer.mozilla.org/en-US/docs/Web/API/MIDIAccess) or your pc keyboard.

The sheet music you'll see in form of scores and notes is actually a MIDI file under the hood.

Can be exported, imported, edited and played back.
[Source Code](https://github.com/klesun-productions/klesun-productions.github.io/tree/master/entry/midiana)
    </td>
    <td><img src="https://github.com/klesun-productions/klesun-productions.github.io/assets/5202330/d23a70be-21e0-4fca-ab74-08579a359cc3" height="300"/></td>
  </tr>
</table>

<table>
  <tr>
    <td>

### [starve_game](https://klesun-productions.com/entry/starve_game/)
A word game where you have to come up with a word meaning a food starting with a specific letter. 
To generate food word database I processed all existing Wikipedia articles (dozens of GiB) with a lexical analysis algorithm I invented. 
The data processing part was written in python.
[Source Code](https://github.com/klesun/midiana.lv/blob/master/htbin/scr/wiki_dump/hell_wrapper.py)
    </td>
    <td>

![alt tag](https://cloud.githubusercontent.com/assets/5202330/26429290/babeb7f2-40ee-11e7-98e0-ab4b04306c41.png)
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>

### [iron-lady-bug](https://github.com/klesun/iron-ladybug)
An adventure/puzzle Unity game written in C#, additionally with multiplayer mode.
    </td>
    <td>

<img src="https://github.com/klesun/riddle-needle/blob/master/screenshots/village.png?raw=true" height="300"/>
    </td>
  </tr>
</table>

<table>
  <tr>
    <td>

### [kunkka-tor.rent](https://github.com/klesun/kunkka-tor.rent)

A web app that allows playing video/music from torrents directly in the browser, without downloading to PC
    </td>
    <td><img src="https://user-images.githubusercontent.com/5202330/92304972-87705500-ef8b-11ea-84c6-ad305c70b045.png"/></td>
  </tr>
</table>

<table>
  <tr>
    <td>

### [green-envy-xmas-defense](https://steamcommunity.com/sharedfiles/filedetails/?id=1170060197)
A custom game mod for Dota 2 that I wrote with my friend for a contest. Written in Lua.
[Source Code](https://github.com/klesun/green-envy-xmas-defense)
    </td>
    <td>

<img src="https://github.com/klesun-productions/klesun-productions.github.io/assets/5202330/e1400697-ad7e-434f-8104-af7d6333d261" height="300"/>
    </td>
  </tr>
</table>

 Education
-----------

- "[Progmeistars](http://progmeistars.lv/index.php?lang=ru&act=aboutseniors)" courses: 5 main semesters, 3 spec-courses: OOP (Delphi), C (low-level programming), Java
- A lot of programming related self-study.
- Riga secondary school No. 65, 12 years.

 Misc
------

Most of my skills are programming related. But I also have some valuable experience in Image/Video editing 
software like Adobe Photoshop, After Effects, Gimp. In my school years I was a lead of a school TV team 
and learned a lot of special effect tricks like chroma-keying, motion capture, etc...:
https://www.youtube.com/watch?v=xlgqaG2gFfs
