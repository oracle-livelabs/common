import glob
import sys
import re
import os

# Change to learning-library path
src=os.path.dirname(os.path.dirname(os.path.dirname(os.getcwd())))

all_manis = []
string_to_search=sys.argv[1]
home_dir = os.environ['HOME']
csv_file='md_list.csv'

csv_dir = os.path.join(home_dir,csv_file)

file_number=0

destination = open(csv_dir, 'w')
destination.write('number,markdown \n')
#Find all .md and store in list
for f in glob.glob(src + '/**/*.md', recursive=True):
    all_manis.append(f)

#Iterate through list and do for every .md
for mani in all_manis:
    #print('Working on ' + mani)
    aFile = mani

    source= open(aFile, 'r' )
    for line in source:
        if string_to_search in line:
            m = re.search('/(learning-library.*)', aFile)
            if m:
                path2manifest = m.group(1)
                file_number += 1
                print(aFile)
                destination.write(str(file_number) + ',' + path2manifest + '\n')
    source.close()
