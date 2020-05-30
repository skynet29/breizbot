#!/bin/bash
ROOT=$PWD
export NODE_ENV=production
for i in `ls src/webapps`; do
echo $i
cd $ROOT/src/webapps/$i
gulp
done
