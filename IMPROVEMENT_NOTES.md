Evently improvement notes

Frontend improvements
- Kept the event detail page visible during post-booking refreshes so the page does not jump to the top when mock payment succeeds.
- Home-page event searches now keep the current event cards visible while filters refresh, with a small status message instead of replacing the whole section.
- Replaced the home page's nested main landmark with a normal container, since the application shell already provides the main landmark.
- Added visible keyboard-focus styles, clearer disabled-button feedback, subtle hover feedback, and reduced-motion support.
- Kept the existing event listing, attendee/organizer/admin routes, seat selection, and mock payment workflow.

Validation
- Python source files were syntax-compiled successfully.
- Frontend production build could not be run because npm dependencies were not available in the offline environment.
- Please run the project locally and test login, event filtering, seat holds, payment, and organizer/admin pages before deployment.
