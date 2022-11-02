echo "This is test script"
for i in `find . -type f \( -name "*.yaml" -o -name "*.yml" \)`
do
echo "#########"
#echo $i

####   checking file is valid yaml/kubernetes file or not ############
`yq .kind,.apiVersion $i  -e  >/dev/null 2>&1`

#echo $output
if [[ $? -eq 0 ]]; then
  echo "The file is valid yaml  $i"
    for y in team: environment: service: hello:
    do
      yq '.metadata' $i|awk '{print $1}'|grep -i  $y  >/dev/null 2>&1
      if [[ $? -ne 0 ]]; then
        echo "required tags/tags/annotations are missing from $i" >> actions-test.txt
        echo "required tags are missing from metadata/annotations"
       # echo "::workflow-command this is sample warning"
        break
      fi
      #echo "loop continues"
    done
  #yq '.metadata.annotations|keys' $i
fi
done
echo "hello-test" >> actions-test.txt
#cat actions-test.txt
echo "END OF LOOP"
