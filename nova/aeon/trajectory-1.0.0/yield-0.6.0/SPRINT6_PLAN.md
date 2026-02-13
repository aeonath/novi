# Sprint 6 Plan

**target version**: 0.6.0


## Task 1 - Rebrand nova as novi

The Nova IDE, this project, is being rebranded as the Novi Editor.  Anywhere we 
refer to Nova, use Novi instead.  Anywhere we refer to the Nova IDE, rebrand it as
the Novi Editor.  Do not change the ./nova directory name, that will remain nova.
Every source code file including unit tests must be checked for this change.  Only consider yourself with files in the src/ directory, package.json, and tsconfig.json. Update jest config if necessary.



## Task 2 - research vim plugin for vscode

Download the source for the vim plugin for vscode and research how difficult it would be
to implement vi mode in our monaco editor.  Keep in mind this would be able to be toggled on and off with a setting in the Novi Shell, which will house all of our settings from now on and will be the main control of the editor instead of menus.  Write your findings and implementation proposal to SPRINT6_TASK2_SUMMARY.md and do not modify the codebase at this time.

## Task 3 - implement your proposal from task2 using the monaco vim plugin you recommend.

You may use the vscode vim plugin as a reference for any features you need to implement
that the other plugin does not support.  Keep the implementation simple.  Control vim-mode and normal editing mode (what we currently have) with a toggle in the Novi shell.  In the Novi Shell, typing set vimode on will turn it on and set vimode off will turn it off.  You may need to implement things in the Novi Shell to get this working, default will be on.
Keep as many features from the original plugin as possible.  Take your time with this 
implementation, the core feature of this app is now vi mode editing.  make sure we 
have proper unit tests for this.  We will be migrating other settings to Novi Shell in the future but for now only this setting will be controlled here.

## Task 4 - Cleanup tasks

1. Remove the Novi Agile from the Application Menu in the Novi section. We don't need it

2. When you type set vimode on or off in the Novi Prompt, it gives the response next to the 
next novi> prompt displayed on the screen.  It should be on its own line

3. The Novi Prompt tag still says nova>, it should be novi>

4. Add a system like icon next to the novi> on the Novi Prompt Tab, like we have for
the terminal tab

5. We don't need open or save commands in the novi prompt any more, get rid of them

6. the help display for the set command is off by one space and not aligned with the rest of the commands in the Novi Prompt

7. Rename the Novi Prompt to the Novi Shell, both internally in the code and in the application menu.

8. The command pallate option in the Novi application menu section does not open 
the command pallate.  Do we still have it available in vi mode? if so then please fix the issue, if not see if you can gray out the option.

## Task 5 - Cleanup Tasks Part 2

1. The File->Close menu option on the application menu doesn't seem to do anything.

2. The monaco highlighting should enable syntax highlighting for the particular
language based on the file extension opened.  So if it is myfile.py it should highlight
in python.  The monaco editor has syntax highlighting built in.  Make this the default
for many common file types, such as .php, .c, .sh, etc

3. the ex box that comes up in vimode when you type : is white with black text, the 
color scheme of this box should match the rest of the editor

4. The file icon used in the file tree should be displayed in the tab next to the
open file, to keep it consistent with terminal and novi shell tabs

5. Update our version in package.json to 0.6.0-dev

6. The version displayed in the Novi Shell is incorrect

7. add a compat setting to the novi shell, this will be used in a subsequent task
to implement command mappings that are not standard to vi.  set the default to off.

example
novi> set compat on

note just issuing the set command with no arguments will return all current settings
(currently just two)

8. The dirty file dot on the tab does not display in vimode if the file has been 
modified.  make sure the dirty dot on the tab is displayed when the file is modified
and not displayed when the file is saved.

## Task 6 - Cleanup Tasks Part 3

1. 
