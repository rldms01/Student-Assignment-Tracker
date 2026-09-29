# Assignment Tracker

A simple app for keeping track of which students have turned in each assignment.
You mark each student with one click: **Done**, **Late**, **Absent**, or blank (not marked yet).

- No account, no login, no internet needed.
- Everything is saved in your web browser, on your own computer. Student names are never sent anywhere.

---

## 1. Open the app on your computer

You don't need to install anything.

1. **Download it.** On this project's GitHub page, click the green **Code** button, then **Download ZIP**.
2. **Unzip it.** Find the ZIP file in your Downloads folder.
   - **Windows:** right-click it and choose **Extract All**.
   - **Mac:** double-click it.
   - **Chromebook:** double-click it in the Files app, then copy the folder inside to **My files**.
3. **Move the folder** somewhere you'll remember, like Documents.
4. **Double-click `index.html`.** The app opens in your web browser (Chrome, Edge, Firefox, or Safari all work).

**Tip:** bookmark the page (press **Ctrl+D**, or **⌘+D** on a Mac) so you can open it again with one click.

---

## 2. How to use it

There are just two tabs at the top: **Assignments** and **Students**.

### Students tab
- **Add a student:** type a name in the box and press **Enter** (or click **Add**). The box stays ready so you can type your whole class list quickly.
- **See a student's summary:** tap their name. You'll see every assignment with its date and status, plus a count like "12 done, 2 late, 1 absent, 3 not marked".
- **Rename or delete a student:** open their summary and use **Rename** or **Delete**. The app always asks before deleting.
- **Tip:** students are listed alphabetically by what you type. To sort by last name, type names as "Lopez, Maya".

### Assignments tab
- **Add an assignment:** click **+ New assignment**, type the name, check the date (it starts as today), and click **Save**.
- **Switch assignments:** use the dropdown, or the **‹ Older** and **Newer ›** buttons. The newest assignment always shows first.
- **Mark work:** click a student's button. Each click moves to the next status:

  | Click | Shows |
  |---|---|
  | (start) | blank: not marked yet |
  | 1 | ✓ **Done** (green) |
  | 2 | 🕒 **Late** (yellow) |
  | 3 | ⊖ **Absent** (blue) |
  | 4 | back to blank |

  Changes save automatically. There's no Save button to remember.
- **Edit or delete an assignment:** use the small **Edit** and **Delete** links under the assignment name.

---

## 3. The sample data (and how to clear it)

The first time you open the app, it includes **6 sample students and 4 sample assignments** so you can try things out.

**To remove them:** click **Remove sample data** in the box at the top of the page.
This removes only the sample students and assignments. Anything you added yourself stays.
The sample data won't come back.

(If you rename or edit a sample student or assignment, the app treats it as yours and won't remove it.)

**To start completely fresh later:** delete your students and assignments, or clear this site's data in your browser's settings.

---

## 4. Where your data is saved (please read)

Your data is saved **inside the web browser you're using, on this computer**. That keeps it private, but it also means:

- **It doesn't sync between devices.** Data entered on your laptop won't show up on your iPad.
- **Open the app the same way each time.** If you use a different browser or move the folder, the app may look empty. Your data isn't gone. Open it the way you did before.
- **Clearing your browser's history or "cookies and site data" erases it.**
- **School Chromebooks:** some are set up to erase everything when you sign out. To test yours: add a practice student, sign out, sign back in, and check whether the student is still there. If not, export a backup at the end of each day and import it when you start.

### Back up your data (do this every week or so)
Scroll to the bottom of the page and click **Export to CSV**. This downloads a file named like `assignment-tracker-backup-2026-09-29.csv`. Save it somewhere safe, like Google Drive.

### Restore from a backup, or move to another computer
Click **Import from CSV** and choose a backup file. **This replaces everything currently in the app**, so the app asks you first.

### Open your data in Google Sheets
In Google Drive, click **New → File upload**, pick the backup file, then open it with Google Sheets.
It looks like this, with one column per assignment:

```
Assignment,Book Report,Math Worksheet
Date,2026-09-26,2026-09-29
Maya Lopez,Done,Late
Jordan Kim,,Absent
```

You can even edit it in Sheets and bring it back. Keep the first two rows ("Assignment" and "Date"), use Done, Late, Absent, or leave the cell blank. Then choose **File → Download → Comma-separated values (.csv)** and import that file.

---

## 5. Putting it online for free (optional)

Putting the app online gives you a web link you can open from any device, including an **iPad**, which can't easily open a file from a folder.

**Privacy:** putting it online shares only the *app itself*, not your students.
Names and marks are still saved only inside the browser of whatever device you use.
Each device keeps its own separate data. To move data between devices, use **Export** on one and **Import** on the other.
(The same goes for data you entered in the double-clicked copy: export it, then import it into the online version.)

### Option A: GitHub Pages (uses this GitHub project)
1. Make sure the app files (`index.html`, `styles.css`, `app.js`) are on your project's **main** branch.
2. On your project's GitHub page, click **Settings**, then **Pages** in the left menu.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Choose branch **main** and folder **/ (root)**, then click **Save**.
5. Wait a minute or two and refresh the page. Your link appears at the top, something like
   `https://rldms01.github.io/Student-Assignment-Tracker/`.

Note: on a free GitHub account, Pages only works for **public** projects. That's fine here, because the project contains only the app and the made-up sample names. Your real students are never in it.

### Option B: Netlify Drop (drag and drop)
1. Go to **https://app.netlify.com/drop**.
2. Drag the unzipped app folder onto the page.
3. Netlify gives you a web link right away. Sign up for a free Netlify account when it asks, so the site is kept and doesn't expire.

**On an iPad:** open your link in Safari, tap the **Share** button, then **Add to Home Screen**. The app then opens from an icon like a regular app.

---

## What's in this folder

| File | What it does |
|---|---|
| `index.html` | The page itself. Double-click this to open the app. |
| `styles.css` | How it looks (colors, sizes, spacing). |
| `app.js` | How it works (marking, saving, export and import). |
| `README.md` | These instructions. |
