#!/usr/bin/env bash
#install if needed: sudo pip install robotframework robotframework-httplibrary                       
if [ ! -d node_modules ]; then
npm install
fi

cd tests
pybot -d log main_test.robot
#pybot -d log hello.robot
