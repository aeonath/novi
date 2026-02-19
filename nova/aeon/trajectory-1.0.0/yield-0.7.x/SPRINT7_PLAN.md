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




## Task 2



## Task 3