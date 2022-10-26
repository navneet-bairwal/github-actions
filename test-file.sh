echo "This is test script"
for i in `ls -lR |egrep -i ".yaml|.yml"`
do
echo "This is list $i"
done
echo "END OF LOOP"
