
# New Feature: Favorite Folders
If this app's directory has favorite folders file, "favorite_folders.txt", read it, otherwise silently ignore.
Here the user can list some rows of favorite folders, e.g.
----
c:\users\chris\downloads
c:\mymovies
----
If this file exists and it has content that can be parsed, show a dropdown select under the row with "FFMPEG file path".
- Default is that none is selected. The select box shall then display placerhoder: "Choose a favorite folder".
If the user clicks "Pick a file", just use default path like before.
Otherwise if a valid entry is chosedn, "Pick a file" should go to selected favorite path when showing file picker.

When you implement this feature, please create this file with 1 entry...
c:\users\chris\downloads
... and put it in a folder so that we can test it while running in the sandbox.