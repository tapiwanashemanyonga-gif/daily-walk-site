# Daily Walk analytics and email alerts

This adds a free, owner-controlled Google Apps Script endpoint. It stores anonymous event counts in a private Google Sheet and sends email alerts to **dailywalk.app1@gmail.com** for first app launches, early-access requests, and APK download-link clicks.

## What the figures mean
- **Website page views:** page loads reported to the endpoint.
- **Unique website sessions:** estimated unique browser sessions, not verified people.
- **Early-access requests:** clicks on the current early-access email link.
- **APK download-button clicks:** clicks on a future public APK link. A click is not proof that a file finished downloading.
- **First app launches:** unique app installations that have opened the app at least once. An installation that has never been opened cannot be detected this way.
- **App sessions:** app launches after the first launch.

The system does not collect names, visitor email addresses, IP addresses, prayer entries, Bible searches, sermon notes, or reading history.

## One-time Google setup
Use the Google account **dailywalk.app1@gmail.com**:
1. Open [Google Apps Script](https://script.google.com/) and create a new project named **Daily Walk Analytics**.
2. Replace the starter code in Code.gs with the complete contents of the analytics/Code.gs file in this repository.
3. Save the project.
4. Select setupDailyWalk in the function selector and click Run. Approve the Google Sheets and email permissions. This creates a private spreadsheet and dashboard in your Google Drive.
5. Open Deploy → New deployment and select Web app.
6. Set Execute as to Me and Who has access to Anyone. Deploy and approve the requested permissions.
7. Copy the web-app URL ending in /exec. Keep it available; it is needed to connect the website and Android app.
8. Open the private spreadsheet created by setupDailyWalk. The Dashboard tab contains totals; Events contains anonymous event records.

Do not publish the spreadsheet or share it publicly. Only the Apps Script web-app endpoint should be public so the website and app can submit events.

## Important privacy and security notes
- The endpoint is public by design. It accepts only a small allowlist of event names and anonymous random IDs; it does not accept arbitrary email recipients or message bodies.
- The endpoint is not an authentication system. Basic validation cannot completely prevent fabricated requests. Review unexpected activity and redeploy if abuse occurs.
- Google Apps Script and Gmail have usage quotas. This is designed for a small project and sends email only for meaningful events, not every page view.
- The Android app must respect the user's existing Anonymous usage insights privacy choice. App usage events must not be sent when that choice is disabled or has not been granted.
- Update the app's privacy notice before shipping telemetry in a public release.

## Connection status
This script and setup guide are the first step. Website and Android event reporting must be connected to the /exec URL after the owner deploys the script. No email alert is sent until the endpoint is deployed and the clients are configured.
