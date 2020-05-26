#!/bin/bash

git fetch --all
git checkout --force "origin/master"
npm i
pm2 restart upsibot