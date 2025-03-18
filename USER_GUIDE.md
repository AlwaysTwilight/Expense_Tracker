# Personal Expense Tracker - User Guide

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [The Dashboard](#the-dashboard)
4. [Managing Expenses](#managing-expenses)
5. [Budget Management](#budget-management)
6. [Analysis and Reports](#analysis-and-reports)
7. [Settings and Customization](#settings-and-customization)
8. [Data Management](#data-management)
9. [Tips and Best Practices](#tips-and-best-practices)

## Introduction

Personal Expense Tracker is a web-based application designed to help you manage your finances, track expenses, set budgets, and analyze your spending habits. The application is entirely client-side, with all data stored in your browser's local storage for privacy.

## Getting Started

### First-Time Setup

1. **Open the application** by navigating to `index.html` in your web browser.

2. **Configure your default settings**:
   - Click on the "Settings" tab in the navigation bar
   - Set your preferred currency, date format, and theme
   - Configure default values for monthly budget, rent, SIP, and other recurring expenses
   - Save your settings

3. **Set your monthly budget**:
   - Navigate to the "Budget" page
   - Enter your initial cash and bank balances for the current month
   - Set a savings goal if desired
   - Update the budget

After completing these steps, your application is ready to use.

## The Dashboard

The Dashboard provides a quick overview of your financial status for the current month.

### Key Components

1. **Budget Status**: Shows your remaining budget, daily allowance, and budget usage percentage.

2. **Payment Methods Status**: Displays your current cash balance, bank (UPI) balance, and credit card availability.

3. **Recent Transactions**: Lists your 5 most recent expenses.

4. **Expense Charts**: Visual representation of your spending by category and daily expense trends.

### Savings Alerts

- If you've set a savings goal, an info alert will appear showing how much you're saving.
- If your expenses exceed your budget (excluding savings), a warning alert will appear indicating that you're now using your savings.

## Managing Expenses

### Adding Expenses

1. Navigate to the "Expenses" tab.

2. Choose the expense type:
   - **Food**: For food-related expenses (groceries, dining, etc.)
   - **Miscellaneous**: For various other expenses (entertainment, clothes, etc.)
   - **Bills**: For recurring bills and payments

3. For Food expenses:
   - Select the food source (Zomato, Swiggy, Local, etc.)
   - Enter the prices in the text area (one per line)
   - Add a description if needed
   - Click "Add Food Expense"

4. For Miscellaneous expenses:
   - Enter the amount
   - Select the expense tag or create a custom tag
   - Add description and notes
   - Click "Add Expense"
   - After adding multiple expenses, click "Save All Expenses"

5. For Bills:
   - If you've already paid a bill, toggle the "Already Paid" switch
   - Otherwise, enter the amount, select the payment method, and add the bill

### Viewing and Searching Expenses

- All expenses are listed in the "All Expenses" table at the bottom of the Expenses page
- Use the search box to filter expenses by any attribute (date, category, amount, etc.)

### Deleting Expenses

1. Locate the expense in the "All Expenses" table
2. Click the trash icon in the Actions column
3. Confirm deletion in the popup dialog

## Budget Management

The Budget page allows you to manage your monthly budgets and savings goals.

### Setting Your Monthly Budget

1. Select the month and year
2. Enter your initial cash and bank balances
   - The monthly budget will automatically calculate as Cash + Bank
3. Set a monthly savings goal (optional)
4. Configure credit card limit and previous month's balance if applicable
5. Click "Update Budget"

### Savings Goals

At the start of each month, you'll be prompted to set a savings goal:

1. Toggle the "Set savings goal" switch
2. Enter the amount you want to save this month
3. Click "Update Savings Goal"

This amount will be reserved from your total budget.

### Budget History

The Budget page also displays a history of your past budgets, showing:
- Total budget for each month
- Total expenses
- Actual savings
- Savings goal status (whether you met your goal)

## Analysis and Reports

The Analysis page provides detailed insights into your spending habits.

### Filtering Options

1. **Date Range**: Select from preset ranges or specify a custom date range
2. **Categories**: Filter by expense categories
3. **Payment Methods**: Filter by payment method
4. **Amount Range**: Filter by expense amount
5. **Description Search**: Search within expense descriptions

### Available Reports

1. **Summary Statistics**: Total expenses, average daily expense, highest expense, etc.
2. **Category Analysis**: Distribution of expenses across categories
3. **Subcategory Analysis**: Breakdown of top spending subcategories
4. **Trend Analysis**: Daily expense pattern over time
5. **Weekly Pattern**: Spending distribution by day of week
6. **Payment Method Analysis**: Breakdown of expenses by payment method
7. **Food Analysis**: Detailed food expense analysis (only visible if you have food expenses)

### Downloading Reports

Click the "Download CSV" or "Download PDF" button to export your analysis for record-keeping or further examination.

## Settings and Customization

### Default Values

Configure default values for:
- SIP amount
- Rent amount
- Credit card limit
- Preferred payment method
- Default cash and bank balances
- Default savings goal

### Display Settings

Customize:
- Theme (Light, Dark, or Blue)
- Currency symbol
- Date format
- Number of items to display per page

### Credit Card Settings

You can enable or disable credit card functionality based on your preferences.

## Data Management

### Exporting Data

1. Navigate to the Settings page
2. Click "Export Data" in the Data Management section
3. Save the JSON file to your device

### Importing Data

1. Navigate to the Settings page
2. Click "Choose File" and select your previously exported JSON file
3. Click "Import"

### Resetting Application

If you need to start fresh:
1. Navigate to the Settings page
2. Click "Reset Application"
3. Confirm by checking the confirmation box and clicking "Reset Application"

⚠️ **WARNING**: This will delete all your data permanently. Make sure to export your data first if you want to keep it.

## Tips and Best Practices

### Effective Budget Management

1. **Set realistic budgets**: Start with your actual spending patterns and gradually adjust as needed.

2. **Save first, spend later**: Set a savings goal at the beginning of the month and treat it as a non-negotiable expense.

3. **Use the daily allowance feature**: Check your daily allowance on the dashboard to pace your spending throughout the month.

### Expense Tracking Habits

1. **Track expenses immediately**: Add expenses as soon as they occur for greater accuracy.

2. **Categorize properly**: Use consistent categories to get meaningful analysis.

3. **Add descriptions**: Provide descriptive notes for unusual expenses to help with future reference.

### Data Management

1. **Export regularly**: Back up your data at least once a month.

2. **Check your data**: Review the Analysis page periodically to identify spending patterns and areas for improvement.


### Browser Compatibility

For the best experience, use the latest version of Chrome, Firefox, Safari, or Edge. The application may not function correctly on older browsers or browsers with restricted JavaScript or local storage functionality.

---
