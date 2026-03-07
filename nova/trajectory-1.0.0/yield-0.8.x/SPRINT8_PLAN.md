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


## Task 2 - building the Terminal Settings Tab


The terminal settings needs to begin with the available terminals to 
use with the terminal tab.  The terminal settings should contain four
options as the intial settings.  The first option is to use cmd.exe, the second option is to use powershell.exe.  The third option is to use git bash, with a file dialog to select the location of bash.exe.