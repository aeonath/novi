# SPRINT 7


## Task 1

We have collisions in bash if the command novi exists in the path, update the command to be #novi instead of just novi, that way the shell will ignore it

leading space is ok as long as it just whitespace and nothing else, it has to be
    #novi 

something like ^\s*#novi

also #novi myfile.md should open the file

and the #novi -s options should still work etc

it is critical that commands like echo #novi do not evoke this editor, the command must
begin with #novi with optional leading whitespace to be recognized


**NOTE** WE WILL NOT BE IMPLENTING the #novi command, we will take a new approach later

## Task 2 - fundamental purpose of the application

Claude we are changing this app to be the Novi Terminal Environment.  As such, we need to make sure there is a main terminal tab that is always in the first position and always open.  We no longer need the home screen but you can keep it around in the code in case we ever need it.  The home button on the bottom will now take you to your HOME terminal.  The home terminal should have a home icon and no X button to close that tab, it must always be there
claude.  When you start up the file tree should be directory of the home terminal and if singlefiletree is off it will follow the terminal as normal.


When single terminal is on will be addressed in the next task



## Task 3
