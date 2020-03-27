#!/bin/bash
ROOT=$PWD
echo "ROOT=$ROOT"
export NODE_ENV=production
gulp all
for i in `ls src/webapps`; do
echo $i
cd $ROOT/src/webapps/$i
gulp all
done
