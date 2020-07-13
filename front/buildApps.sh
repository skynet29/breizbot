#!/bin/bash
ROOT=$PWD
export NODE_ENV=production
echo "Clear dist directory..."
rm -R ./dist
echo "build netos lib.."
gulp
echo "build webapps.."
for i in `ls src/webapps`; do
echo $i
cd $ROOT/src/webapps/$i
gulp
done
