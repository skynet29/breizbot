#!/bin/bash
ROOT=$PWD
echo "install webapps.."
for i in `ls src/webapps`; do
echo $i
cd $ROOT/src/webapps/$i
if [ -e package.json ]
then
    npm install
fi
done
