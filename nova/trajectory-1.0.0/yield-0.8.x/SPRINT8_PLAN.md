# Sprint 8 Plan

This sprint will be all about our settings page.  We need to make Nova
more configurable.


## Task 1 - Create the new settings tab

We need a new Settings Tab accessible from the application menu
Novi -> Settings as the first menu item.  The old settings modal we had
is no longer accessible from our current UI and should be removed.

The new settings tab should be blank and say settings coming.  In the file tree area when on the settings tab it should list our settings sections 
instead.  THe initial sections will be Terminal Editor and Novi.  When you 
click on the section it will load the settings for that section in the settings tab.  

The settings tab should be labeled Settings with a gear icon.


## Task 2 - building the Terminal Settings Tab (and .novirc)


The terminal settings needs to begin with the available terminals to 
use with the terminal tab.  The terminal settings should contain four
options as the intial settings.  The first option is to use cmd.exe, the second option is to use powershell.exe.  The third option is to use git bash, with a file dialog to select the location of bash.exe.


If a user selects a different shell than the current, it updates the terminal on the home tab but does not close any existing terminal tabs 
in other terminals.

We are currently using Git bash, so please remove any hardcoded path to this and make it the default path in the settings. something like c:\program files\git\bash.exe.  

Reconcilliate any settings in ~/.novirc.  The application should be able to
be configured form this file as well.  ~/.novirc settings will override any
settings saved for the users configuration.  The users current configuration does not save to this file.

This is two tasks in one, build the terminal settings first then reconcillate our novirc implementation.

## Task 3 - add ctrl+tab

Description:
Add CTRL+TAB keyboard shortcut to cycle through tabs

Edit
Additional Notes:
doesn't currently acknowledge this common shortcut.

## Task 4 - add msys2 option to the terminal settings

