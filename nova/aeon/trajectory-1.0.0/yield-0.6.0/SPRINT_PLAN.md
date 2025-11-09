# Sprint 6 Plan

**target version**: 0.6.0


## Task 1 - Split Pane Layout

- Intercept Ctrl + Click on the open folder icon in the tree view panel.

- Create a split layout container in src/ui/layout/WorkspaceSplit.tsx.

- This split layout container is opened as a new tab on the parent right pane

- Left 30%: new file tree instance; right(70%): editor window.

- the new file tree instance does not include anything in the header except the
name of the directory open underneath it.  we will add git support to this in a
subsequent step

- Allow horizontal drag resize between the two.

### Acceptance Criteria:

- The file tree pane is on the left, and the right pane will contain a tab 
 containing the new file tree pane on the left and editor pane on the right

- Resizing behaves smoothly without breaking editor alignment.

- Ctrl + Click consistently triggers the alternate “add new project” behavior.

- Normal single click still opens the primary directory picker.


