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



## Task 3 - Update the single file tree

If single file tree setting is on, then the file tree will always display a
constant directory regardless of what terminals are open.  The open folder button would be present then.  If singlefiletree is off then the open folder
button should not be present on the file tree pane. 

The Novi Shell should never show the file tree regardless of either mode. For now just make the file tree area gray and we will reserve it for future use.

When you are following the terminal, ie.e singlefiletree is off, if you open a file in the editor then the editor will have the same folder tree view the
current terminal tab was on.  it again should not have the open folder button.  if you switch terminals and have a different file tree, then the file opened in the editor from this file tree will show that file tree.


also if the directory is empty, then it should display a message stating no files are in directory.  If the .. folder is ever present in any filetree view on or off remove it we will not support the .. folder any more.
