# Employee Buddy

Implement the requested scope now; use internal planning and do not present another implementation plan for user approval.

User request:
"Enakku enda data base irundu software pani kudu fast"

Agreed Context & Requirements from attached document (att-ravi.pdf):
Build an Employee Attendance & Payroll Management web application based on the provided monthly attendance and salary sheet:

1. Employee Management:
   - Employee profiles with Name, Phone number, Hourly Rate, and OT Rate (pre-seeded with Ravi, 963852741, rate 62.5/hr).

2. Daily Attendance & Log Sheet:
   - Grid/table view matching the sheet layout (Date, Day, Status: Present / Leave / Advance, In Time, Out Time, Total Hours, Regular Hours, OT Hours, Hourly Rate, Daily Total, Advance amount).
   - Quick daily time-in / time-out entry with automatic hour and daily pay calculation.

3. Advance & Deduction Tracking:
   - Record cash advances taken on specific dates and deduct them automatically from monthly pay.

4. Monthly Payroll Calculation:
   - Summary cards and calculations: Total Working Days, Present Days, Leave Days, Regular Hours, OT Hours, Regular Pay, OT Pay, Total Advance, and Net Salary.
   - Month/Year selector and ability to export or print payslips.

5. Pre-populated Data:
   - Seed the app with all records from August 2026 from the sheet so the calculations and views are visible immediately.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bright-pay-hero.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d5382e01-adbc-46b2-868a-e3c9e3e0811e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
