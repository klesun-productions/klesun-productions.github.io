# sadly currently making a project requires some manual operations

# download https://www.dropbox.com/sh/ppulixzaqoil4ff/AAAjkQYPmI-8yKvdgYOCjQjva?dl=0
# into .../midiana.lv/Dropbox/web

# download https://www.dropbox.com/sh/yuxehqxbnhos6sh/AADaiQWaHBNl19SYbvwwS7L0a?dl=0
# into .../midiana.lv/lib

# download http://midiana.lv/out/
# into .../midiana.lv/out
# TODO: make contents of /out/ generable with a script

# download http://midiana.lv/unversioned/
# into .../midiana.lv/unversioned
# TODO: move music to a separate repository and make it a submodule. also move rest files inside /Dropbox/web/

# compile all .ts files in .../midiana.lv/entry/**/** and .../midiana.lv/src/**/**
# TODO: add a script
# make sure you have npm version 4.2.0 or higher
#npm i
#node_modules/typescript/bin/tsc -p tsconfig.json
#node_modules/typescript/bin/tsc entry/compose/index.ts --target ES6 --lib es6 --skipLibCheck --module amd
node_modules/typescript/bin/tsc -w -pretty
# ../../b/dontDeleteMe/TypeScript-2.1-rc/bin/tsc src/utils/S.ts -pretty --target ES6 --lib es6 --skipLibCheck --module amd
